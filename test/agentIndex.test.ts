import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// agent-index.json restates CLAUDE.md's commands, generated artifacts, and delivery
// rules for tools. These guards keep it from rotting silently; they cannot show that
// a command is the right one, which review decides.
const ROOT = path.resolve(import.meta.dirname, '..');
const SCHEMA = 'sepahead.agent-index.v1';
const COSTS = new Set(['fast', 'medium', 'full']);
const SCRIPT_SUFFIXES = ['.py', '.sh', '.mjs', '.js', '.ts', '.rb', '.pl'];
const MACHINE_PATH = /(\/Users\/|\/home\/|\/private\/|\/tmp\/|[A-Za-z]:\\\\)/u;

interface Gate {
  id: string;
  when: string;
  command: string;
  cost: string;
}

interface PathItem {
  path: string;
  regenerate?: string;
  reason?: string;
}

interface AgentIndex {
  schema: string;
  repository: string;
  summary: string;
  entry_documents: { path: string; role: string }[];
  delivery: {
    default_branch: string;
    merge: string;
    signing: string;
    attribution: string;
    owner_only: string[];
  };
  gates: Gate[];
  generated: PathItem[];
  frozen: PathItem[];
  shared?: PathItem[];
  ecosystem: { repository: string; relation: string }[];
}

const raw = readFileSync(path.join(ROOT, 'agent-index.json'), 'utf8');
const index = JSON.parse(raw) as AgentIndex;

const withoutSlash = (pattern: string): string => pattern.replace(/\/$/u, '');

// A path counts when it exists in the working tree or Git tracks a matching file.
const present = (pattern: string): boolean =>
  existsSync(path.join(ROOT, withoutSlash(pattern))) ||
  execFileSync('git', ['ls-files', '-z', '--', withoutSlash(pattern)], { cwd: ROOT }).length > 0;

const commandScripts = (command: string): string[] =>
  command
    .split(/&&|\|\||;|\|/u)
    .flatMap((part) => part.trim().split(/\s+/u))
    .filter((token) => token !== '' && !token.startsWith('-'))
    .filter((token) => !(token.split('/')[0] ?? '').includes('='))
    .filter((token) => SCRIPT_SUFFIXES.some((suffix) => token.endsWith(suffix)))
    .filter((token) => !/^https?:/u.test(token))
    .map((token) => token.replace(/^\.\//u, ''));

describe('agent index', () => {
  it('uses the shared schema with every required field', () => {
    expect(index.schema).toBe(SCHEMA);
    expect(typeof index.repository).toBe('string');
    expect(typeof index.summary).toBe('string');
    for (const key of ['entry_documents', 'gates', 'generated', 'frozen', 'ecosystem'] as const) {
      expect(Array.isArray(index[key]), key).toBe(true);
    }
    for (const key of ['default_branch', 'merge', 'signing', 'attribution'] as const) {
      expect(typeof index.delivery[key], key).toBe('string');
    }
    expect(Array.isArray(index.delivery.owner_only)).toBe(true);
  });

  it('contains no machine-specific path', () => {
    expect(raw).not.toMatch(MACHINE_PATH);
  });

  it('names only present documents and artifacts', () => {
    const paths = [
      ...index.entry_documents.map((document) => document.path),
      ...index.generated.map((item) => item.path),
      ...index.frozen.map((item) => item.path),
      ...(index.shared ?? []).map((item) => item.path),
    ];
    expect(paths.filter((candidate) => !present(candidate))).toEqual([]);
  });

  it('keeps unique gates with known costs and present scripts', () => {
    const ids = index.gates.map((gate) => gate.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const gate of index.gates) {
      expect(COSTS.has(gate.cost), gate.id).toBe(true);
      expect(commandScripts(gate.command).filter((script) => !present(script)), gate.id).toEqual([]);
    }
    for (const item of index.generated) {
      expect(
        commandScripts(item.regenerate ?? '').filter((script) => !present(script)),
        item.path,
      ).toEqual([]);
    }
  });

  it('names a package script for every bun run gate', () => {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    for (const gate of index.gates) {
      const match = /^bun run ([\w:.-]+)/u.exec(gate.command);
      if (match !== null) expect(manifest.scripts[match[1] ?? ''], gate.id).toBeDefined();
    }
  });
});
