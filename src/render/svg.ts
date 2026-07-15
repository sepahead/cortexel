/**
 * The normative SVG serializer.
 *
 * The output of this function is the normative figure. Its bytes are hashed and
 * cross-checked, so the serializer is written to be deterministic to the byte and safe
 * against a hostile label.
 *
 * Two properties matter most:
 *
 *   Determinism. No clock, no random id, no locale. Element ids derive from the artifact
 *   digest and a local counter, never from React's useId or a UUID. Attribute order is
 *   fixed. Coordinates use the fixed formatter. There is no generator timestamp — one
 *   would make two identical figures hash two ways.
 *
 *   Safety. This is a purpose-built writer over a CLOSED vocabulary, not string
 *   interpolation scattered across figure code. XML text and attribute values are
 *   escaped independently. There is no path by which a caller-supplied title, unit, or
 *   note can introduce a `<script>`, an `on*` handler, a `<foreignObject>`, or an
 *   external URL — because those are simply not elements this writer can emit. A hostile
 *   label becomes escaped text, nothing more.
 */

import type {
  RenderPlanV1,
  Panel,
  Mark,
  Axis,
  TextMark,
} from './model/renderPlan.js';
import { formatCoordinate } from './format.js';
import { THEMES } from '../generated/catalog.js';

/** Escape text content: the five XML text-significant characters. */
function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape an attribute value: text-significant characters plus both quote styles. */
function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A minimal, deterministic XML writer over a fixed element/attribute set.
 *
 * The `attrs` array preserves insertion order, and every emitter below writes attributes
 * in a fixed order — so the serialized bytes are stable rather than dependent on object
 * key iteration.
 */
class SvgWriter {
  private out: string[] = [];
  private indentLevel = 0;

  private indent(): string {
    return '  '.repeat(this.indentLevel);
  }

  open(tag: string, attrs: readonly [string, string | number][] = []): this {
    const rendered = attrs
      .map(([key, value]) => `${key}="${escapeAttribute(String(value))}"`)
      .join(' ');
    this.out.push(`${this.indent()}<${tag}${rendered ? ` ${rendered}` : ''}>`);
    this.indentLevel++;
    return this;
  }

  leaf(tag: string, attrs: readonly [string, string | number][] = []): this {
    const rendered = attrs
      .map(([key, value]) => `${key}="${escapeAttribute(String(value))}"`)
      .join(' ');
    this.out.push(`${this.indent()}<${tag}${rendered ? ` ${rendered}` : ''}/>`);
    return this;
  }

  text(tag: string, content: string, attrs: readonly [string, string | number][] = []): this {
    const rendered = attrs
      .map(([key, value]) => `${key}="${escapeAttribute(String(value))}"`)
      .join(' ');
    this.out.push(
      `${this.indent()}<${tag}${rendered ? ` ${rendered}` : ''}>${escapeText(content)}</${tag}>`,
    );
    return this;
  }

  close(tag: string): this {
    this.indentLevel--;
    this.out.push(`${this.indent()}</${tag}>`);
    return this;
  }

  raw(line: string): this {
    this.out.push(`${this.indent()}${line}`);
    return this;
  }

  toString(): string {
    // A trailing newline, fixed, so the byte sequence is complete and stable.
    return `${this.out.join('\n')}\n`;
  }
}

function theme(themeId: string): Record<string, string> {
  return (THEMES as Record<string, Record<string, string>>)[themeId] ?? THEMES.light;
}

function pointsToPath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const commands = points.map(
    (point, index) =>
      `${index === 0 ? 'M' : 'L'}${formatCoordinate(point.x)},${formatCoordinate(point.y)}`,
  );
  return commands.join(' ');
}

const MARKER_PATHS: Record<string, (x: number, y: number, r: number) => string> = {
  circle: (x, y, r) => `M${formatCoordinate(x - r)},${formatCoordinate(y)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`,
  square: (x, y, r) => `M${formatCoordinate(x - r)},${formatCoordinate(y - r)}h${2 * r}v${2 * r}h${-2 * r}z`,
  triangle: (x, y, r) => `M${formatCoordinate(x)},${formatCoordinate(y - r)}L${formatCoordinate(x + r)},${formatCoordinate(y + r)}L${formatCoordinate(x - r)},${formatCoordinate(y + r)}z`,
  diamond: (x, y, r) => `M${formatCoordinate(x)},${formatCoordinate(y - r)}L${formatCoordinate(x + r)},${formatCoordinate(y)}L${formatCoordinate(x)},${formatCoordinate(y + r)}L${formatCoordinate(x - r)},${formatCoordinate(y)}z`,
};

function emitMark(writer: SvgWriter, mark: Mark, colors: Record<string, string>): void {
  switch (mark.type) {
    case 'line': {
      const d = mark.subpaths
        .filter((subpath) => subpath.length > 0)
        .map((subpath) => pointsToPath(subpath))
        .join(' ');
      if (d.length === 0) return;
      const attrs: [string, string | number][] = [
        ['d', d],
        ['fill', 'none'],
        ['stroke', mark.stroke],
        ['stroke-width', mark.strokeWidth],
      ];
      if (mark.dash && mark.dash !== 'none') attrs.push(['stroke-dasharray', mark.dash]);
      writer.leaf('path', attrs);
      break;
    }
    case 'path': {
      const d = mark.subpaths
        .filter((subpath) => subpath.length > 0)
        .map((subpath) => pointsToPath(subpath))
        .join(' ');
      if (d.length === 0) return;
      writer.leaf('path', [
        ['d', d],
        ['fill', 'none'],
        ['stroke', mark.stroke],
        ['stroke-width', mark.strokeWidth],
      ]);
      break;
    }
    case 'point': {
      const build = MARKER_PATHS[mark.shape] ?? MARKER_PATHS.circle;
      for (const point of mark.points) {
        writer.leaf('path', [
          ['d', build(point.x, point.y, mark.radius)],
          ['fill', mark.fill],
        ]);
      }
      break;
    }
    case 'rect': {
      for (const rect of mark.rects) {
        const attrs: [string, string | number][] = [
          ['x', formatCoordinate(rect.x)],
          ['y', formatCoordinate(rect.y)],
          ['width', formatCoordinate(Math.max(0, rect.width))],
          ['height', formatCoordinate(Math.max(0, rect.height))],
          ['fill', rect.fill],
        ];
        if (mark.stroke) attrs.push(['stroke', mark.stroke]);
        writer.leaf('rect', attrs);
      }
      break;
    }
    case 'rule': {
      for (const line of mark.lines) {
        const attrs: [string, string | number][] =
          mark.orientation === 'vertical'
            ? [
                ['x1', formatCoordinate(line.position)],
                ['y1', formatCoordinate(line.from)],
                ['x2', formatCoordinate(line.position)],
                ['y2', formatCoordinate(line.to)],
              ]
            : [
                ['x1', formatCoordinate(line.from)],
                ['y1', formatCoordinate(line.position)],
                ['x2', formatCoordinate(line.to)],
                ['y2', formatCoordinate(line.position)],
              ];
        attrs.push(['stroke', mark.stroke], ['stroke-width', mark.strokeWidth]);
        if (mark.dash && mark.dash !== 'none') attrs.push(['stroke-dasharray', mark.dash]);
        writer.leaf('line', attrs);
      }
      break;
    }
    case 'area': {
      for (const subpath of mark.subpaths) {
        if (subpath.length === 0) continue;
        const top = subpath.map((p) => ({ x: p.x, y: p.y1 }));
        const bottom = subpath.map((p) => ({ x: p.x, y: p.y0 })).reverse();
        const d = `${pointsToPath(top)} ${pointsToPath(bottom).replace(/^M/, 'L')} Z`;
        writer.leaf('path', [
          ['d', d],
          ['fill', mark.fill],
          ['fill-opacity', mark.opacity],
          ['stroke', 'none'],
        ]);
      }
      break;
    }
    case 'text':
      emitText(writer, mark);
      break;
    case 'group':
      writer.open('g', [['data-id', mark.id]]);
      for (const child of mark.marks) emitMark(writer, child, colors);
      writer.close('g');
      break;
  }
}

function emitText(writer: SvgWriter, mark: TextMark): void {
  const attrs: [string, string | number][] = [
    ['x', formatCoordinate(mark.x)],
    ['y', formatCoordinate(mark.y)],
    ['text-anchor', mark.anchor],
    ['font-size', mark.fontSize],
    ['fill', mark.fill],
    ['font-family', 'sans-serif'],
  ];
  // Decorative text is hidden from assistive technology; the accessible summary and table
  // carry the exact values instead.
  if (mark.decorative) attrs.push(['aria-hidden', 'true']);
  writer.text('text', mark.text, attrs);
}

function emitAxis(writer: SvgWriter, axis: Axis, panel: Panel, colors: Record<string, string>): void {
  writer.open('g', [['data-axis', axis.orientation], ['aria-hidden', 'true']]);

  const isBottom = axis.orientation === 'bottom';
  const isLeft = axis.orientation === 'left';

  for (const tick of axis.ticks) {
    if (isBottom) {
      writer.leaf('line', [
        ['x1', formatCoordinate(tick.position)],
        ['y1', formatCoordinate(panel.y + panel.height)],
        ['x2', formatCoordinate(tick.position)],
        ['y2', formatCoordinate(panel.y + panel.height + 5)],
        ['stroke', colors.axis],
        ['stroke-width', 1],
      ]);
      emitText(writer, {
        type: 'text',
        x: tick.position,
        y: panel.y + panel.height + 18,
        text: tick.label,
        anchor: 'middle',
        fontSize: 11,
        fill: colors.mutedText,
        decorative: true,
      });
    } else if (isLeft) {
      writer.leaf('line', [
        ['x1', formatCoordinate(panel.x - 5)],
        ['y1', formatCoordinate(tick.position)],
        ['x2', formatCoordinate(panel.x)],
        ['y2', formatCoordinate(tick.position)],
        ['stroke', colors.axis],
        ['stroke-width', 1],
      ]);
      emitText(writer, {
        type: 'text',
        x: panel.x - 8,
        y: tick.position + 4,
        text: tick.label,
        anchor: 'end',
        fontSize: 11,
        fill: colors.mutedText,
        decorative: true,
      });
    }
  }

  emitText(writer, {
    type: 'text',
    x: isBottom ? panel.x + panel.width / 2 : panel.x - 44,
    y: isBottom ? panel.y + panel.height + 38 : panel.y + panel.height / 2,
    text: axis.label,
    anchor: 'middle',
    fontSize: 12,
    fill: colors.text,
    decorative: true,
  });

  writer.close('g');
}

export interface SvgReport {
  readonly svg: string;
  readonly digest: string;
  readonly markCount: number;
  readonly textCount: number;
  readonly width: number;
  readonly height: number;
}

function countMarks(marks: readonly Mark[]): { marks: number; texts: number } {
  let markCount = 0;
  let textCount = 0;
  const walk = (list: readonly Mark[]): void => {
    for (const mark of list) {
      if (mark.type === 'group') {
        walk(mark.marks);
      } else {
        markCount++;
        if (mark.type === 'text') textCount++;
      }
    }
  };
  walk(marks);
  return { marks: markCount, texts: textCount };
}

/**
 * Render a plan to normative SVG. Pure: no clock, no environment, no filesystem, no
 * network, no random state.
 */
export function renderSvg(
  plan: RenderPlanV1,
  digestOf: (text: string) => string,
): SvgReport {
  const colors = theme(plan.themeId);
  const writer = new SvgWriter();

  writer.open('svg', [
    ['xmlns', 'http://www.w3.org/2000/svg'],
    ['viewBox', `0 0 ${plan.width} ${plan.height}`],
    ['width', plan.width],
    ['height', plan.height],
    ['role', 'img'],
    ['aria-labelledby', `${plan.figureId}-title ${plan.figureId}-desc`],
  ]);

  // Figure-level accessible name and description, referenced by aria-labelledby.
  writer.text('title', plan.title, [['id', `${plan.figureId}-title`]]);
  writer.text('desc', plan.accessibility.summary, [['id', `${plan.figureId}-desc`]]);

  // A compact, non-sensitive metadata block. Public identities only — no raw source
  // data, no local path, no token, no prompt.
  writer.open('metadata');
  writer.text('cortexel:contract', 'cortexel-figure-artifact/1.0');
  writer.text('cortexel:skill', plan.skillId);
  writer.text('cortexel:artifactDigest', plan.sourceArtifactDigest);
  writer.close('metadata');

  writer.leaf('rect', [
    ['x', 0],
    ['y', 0],
    ['width', plan.width],
    ['height', plan.height],
    ['fill', colors.background],
  ]);

  emitText(writer, {
    type: 'text',
    x: 24,
    y: 28,
    text: plan.title,
    anchor: 'start',
    fontSize: 16,
    fill: colors.text,
    decorative: true, // the <title> element already names the figure for AT
  });

  if (plan.subtitle) {
    emitText(writer, {
      type: 'text',
      x: 24,
      y: 46,
      text: plan.subtitle,
      anchor: 'start',
      fontSize: 12,
      fill: colors.mutedText,
      decorative: true,
    });
  }

  let allMarks: Mark[] = [];
  for (const panel of plan.panels) {
    writer.open('g', [['data-panel', panel.id]]);

    if (panel.noData) {
      emitText(writer, {
        type: 'text',
        x: panel.x + panel.width / 2,
        y: panel.y + panel.height / 2,
        text: `No data: ${panel.noData.reason}`,
        anchor: 'middle',
        fontSize: 13,
        fill: colors.mutedText,
        decorative: true,
      });
    } else {
      for (const axis of panel.axes) emitAxis(writer, axis, panel, colors);
      for (const mark of panel.marks) {
        emitMark(writer, mark, colors);
        allMarks.push(mark);
      }
    }

    writer.close('g');
  }

  // Disclosures in normal flow at the foot of the figure, where they cannot be covered by
  // data. The same text is in the artifact and the accessible description.
  let disclosureY = plan.height - plan.disclosures.length * 14 - 6;
  writer.open('g', [['data-disclosures', 'true']]);
  for (const disclosure of plan.disclosures) {
    emitText(writer, {
      type: 'text',
      x: 24,
      y: disclosureY,
      text: disclosure.text,
      anchor: 'start',
      fontSize: 10,
      fill: disclosure.severity === 'critical' ? colors.error : colors.mutedText,
      decorative: true,
    });
    disclosureY += 14;
  }
  writer.close('g');

  writer.close('svg');

  const svg = writer.toString();
  const counts = countMarks(allMarks);

  return {
    svg,
    digest: digestOf(svg),
    markCount: counts.marks,
    textCount: counts.texts,
    width: plan.width,
    height: plan.height,
  };
}
