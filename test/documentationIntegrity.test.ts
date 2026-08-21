import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

function trackedMarkdownFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z', '--', '*.md', '*.markdown'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .sort();
}

interface MarkdownDocument {
  readonly source: string;
  readonly headings: ReadonlySet<string>;
  readonly hierarchyProblems: readonly string[];
  readonly links: readonly { line: number; target: string }[];
}

function githubSlug(heading: string): string {
  return heading
    .replace(/<[^>]*>/gu, '')
    .replace(/!?(?:\[([^\]]*)\])\([^)]*\)/gu, '$1')
    .replace(/[`*_~]/gu, '')
    .toLocaleLowerCase('en-US')
    .trim()
    .replace(/[^\p{Letter}\p{Number}\p{Mark}\p{Connector_Punctuation}\-\s]/gu, '')
    .replace(/\s+/gu, '-');
}

function inspectMarkdown(file: string): MarkdownDocument {
  const source = readFileSync(path.join(ROOT, file), 'utf8');
  const headings = new Set<string>();
  const duplicateSlugs = new Map<string, number>();
  const hierarchyProblems: string[] = [];
  const links: Array<{ line: number; target: string }> = [];
  let fence: '`' | '~' | null = null;
  let previousHeading = 0;

  source.split('\n').forEach((line, lineIndex) => {
    const fenceMatch = /^\s*(`{3,}|~{3,})/u.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1]![0] as '`' | '~';
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      return;
    }
    if (fence !== null) return;

    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      if (previousHeading !== 0 && level > previousHeading + 1) {
        hierarchyProblems.push(
          `${file}:${lineIndex + 1} jumps from H${previousHeading} to H${level}`,
        );
      }
      previousHeading = level;
      const baseSlug = githubSlug(heading[2]!);
      const duplicateIndex = duplicateSlugs.get(baseSlug) ?? 0;
      duplicateSlugs.set(baseSlug, duplicateIndex + 1);
      headings.add(duplicateIndex === 0 ? baseSlug : `${baseSlug}-${duplicateIndex}`);
    }

    const inline = /!?\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/gu;
    for (const match of line.matchAll(inline)) {
      links.push({ line: lineIndex + 1, target: match[1]!.replace(/^<|>$/gu, '') });
    }
    const reference = /^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)/u.exec(line);
    if (reference) {
      links.push({ line: lineIndex + 1, target: reference[1]!.replace(/^<|>$/gu, '') });
    }
    const htmlResource = /\b(?:src|srcset)="([^"]+)"/gu;
    for (const match of line.matchAll(htmlResource)) {
      links.push({ line: lineIndex + 1, target: match[1]! });
    }
  });

  for (const explicit of source.matchAll(/\b(?:id|name)="([^"]+)"/gu)) {
    headings.add(explicit[1]!);
  }
  return { source, headings, hierarchyProblems, links };
}

function isExternal(target: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(target) || target.startsWith('/');
}

describe('repository documentation integrity', () => {
  it('keeps every tracked Markdown document well-formed and internally linked', () => {
    const files = trackedMarkdownFiles();
    const documents = new Map(files.map((file) => [file, inspectMarkdown(file)]));
    const problems: string[] = [];

    for (const [file, document] of documents) {
      if (!document.source.endsWith('\n')) problems.push(`${file}: missing final newline`);
      document.source.split('\n').forEach((line, index) => {
        if (/[ \t]+$/u.test(line)) problems.push(`${file}:${index + 1}: trailing whitespace`);
      });
      problems.push(...document.hierarchyProblems);

      for (const { line, target } of document.links) {
        if (target === '' || isExternal(target)) continue;
        const [rawPath, rawFragment] = target.split('#', 2);
        let decodedPath: string;
        let decodedFragment: string | undefined;
        try {
          decodedPath = decodeURIComponent(rawPath ?? '');
          decodedFragment = rawFragment === undefined ? undefined : decodeURIComponent(rawFragment);
        } catch {
          problems.push(`${file}:${line}: malformed percent-encoding in ${target}`);
          continue;
        }
        const resolved = path.resolve(ROOT, path.dirname(file), decodedPath.split('?')[0]!);
        if (!existsSync(resolved)) {
          problems.push(`${file}:${line}: missing relative target ${target}`);
          continue;
        }
        if (decodedFragment === undefined || !statSync(resolved).isFile()) continue;
        const relativeTarget = path.relative(ROOT, resolved).split(path.sep).join('/');
        const targetDocument = documents.get(relativeTarget);
        if (targetDocument && !targetDocument.headings.has(decodedFragment)) {
          problems.push(`${file}:${line}: missing heading fragment ${target}`);
        }
      }
    }

    expect(problems, problems.join('\n')).toEqual([]);
  });
});
