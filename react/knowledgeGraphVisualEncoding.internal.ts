import type {
  KnowledgeGraphEdgeKind,
  KnowledgeGraphEdgeStrokePattern,
  KnowledgeGraphNodeGlyph,
  KnowledgeGraphNodeKind,
} from './knowledgeGraphPresentation.types';

export const KNOWLEDGE_GRAPH_NODE_GLYPHS = Object.freeze([
  'sphere_outline',
  'box_shell',
  'diamond_shell',
] as const satisfies readonly KnowledgeGraphNodeGlyph[]);

export const KNOWLEDGE_GRAPH_EDGE_STROKE_PATTERNS = Object.freeze([
  'solid',
  'long_dash',
  'short_dash',
  'dotted',
] as const satisfies readonly KnowledgeGraphEdgeStrokePattern[]);

export const CORPUS_NODE_GLYPH_BY_KIND = Object.freeze({
  paper: 'sphere_outline',
  model: 'box_shell',
  family: 'diamond_shell',
} as const satisfies Record<KnowledgeGraphNodeKind, KnowledgeGraphNodeGlyph>);

export const CORPUS_EDGE_STROKE_PATTERN_BY_KIND = Object.freeze({
  cites: 'solid',
  same_as: 'solid',
  variant_of: 'long_dash',
  instantiates: 'short_dash',
  belongs_to_family: 'dotted',
} as const satisfies Record<KnowledgeGraphEdgeKind, KnowledgeGraphEdgeStrokePattern>);

export const KNOWLEDGE_GRAPH_BACKGROUND_COLORS = Object.freeze({
  dark: '#030711',
  light: '#f8fafc',
} as const);

export const KNOWLEDGE_GRAPH_MIN_MARK_CONTRAST = 3;
export const KNOWLEDGE_GRAPH_FOCUSED_NODE_SCALE = 1.28;
export const KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH = 4.5;
export const KNOWLEDGE_GRAPH_DIRECTION_MARKER_RADIUS = 1.5;
// CSS pixels, independent of device pixel ratio. The scene owns the exact
// viewport uniform; this width does not change assertion geometry or routing.
export const KNOWLEDGE_GRAPH_EDGE_STROKE_WIDTH_PX = 1.5;

export function isKnowledgeGraphStrokeViewportUsable(
  width: number,
  height: number,
  near: number,
): boolean {
  return (
    Number.isFinite(width) &&
    width > 0 &&
    Number.isFinite(height) &&
    height > 0 &&
    Number.isFinite(near) &&
    near >= 0
  );
}

/** One instanced quad for each already-visible routed chord. Clip in view space
 * before dividing by w, so an endpoint behind the eye cannot invert the strip. */
export const KNOWLEDGE_GRAPH_EDGE_STROKE_VERTEX_SHADER = `
attribute vec3 instanceStart;
attribute vec3 instanceEnd;
attribute vec3 instanceStrokeColor;
uniform vec2 strokeViewport;
uniform float strokeWidth;
uniform float strokeNear;
varying vec3 vStrokeColor;
void main() {
  vec4 start = modelViewMatrix * vec4(instanceStart, 1.0);
  vec4 end = modelViewMatrix * vec4(instanceEnd, 1.0);
  float plane = -strokeNear;
  if (start.z > plane && end.z > plane) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vStrokeColor = instanceStrokeColor;
    return;
  }
  if (start.z > plane) start = mix(start, end, (plane - start.z) / (end.z - start.z));
  if (end.z > plane) end = mix(end, start, (plane - end.z) / (start.z - end.z));
  vec4 a = projectionMatrix * start;
  vec4 b = projectionMatrix * end;
  vec2 delta = (b.xy / b.w - a.xy / a.w) * strokeViewport * 0.5;
  float magnitude = length(delta);
  vec2 normal = magnitude > 0.000001 ? vec2(-delta.y, delta.x) / magnitude : vec2(0.0);
  vec4 clip = mix(a, b, position.x);
  clip.xy += normal * position.y * strokeWidth / strokeViewport * clip.w;
  gl_Position = clip;
  vStrokeColor = instanceStrokeColor;
}`;
export const KNOWLEDGE_GRAPH_EDGE_STROKE_FRAGMENT_SHADER = `
varying vec3 vStrokeColor;
void main() {
  gl_FragColor = vec4(vStrokeColor, 1.0);
  #include <colorspace_fragment>
}`;
export const KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE = Object.freeze({
  sphere_outline: 1.08,
  // The bounded frame bars stay outside the opaque unit sphere.
  box_shell: 1.3,
  // The bounded octahedron frame stays outside the opaque unit sphere.
  diamond_shell: 1.5,
} as const satisfies Record<KnowledgeGraphNodeGlyph, number>);
export const KNOWLEDGE_GRAPH_BOX_SHELL_SIDE =
  (2 * KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.box_shell) / Math.sqrt(3);

/** Twelve solid frame bars, rather than the triangulated faces of a wireframe.
 * The fixed 0.04-unit thickness stays inside the existing radial extent. This
 * is a bounded CPU template, created outside the frame loop and reused by every
 * admitted node of that kind. It is not a quantitative data channel. */
export function createKnowledgeGraphNodeShellVertices(
  glyph: 'box_shell' | 'diamond_shell',
): Float32Array {
  const thickness = 0.04;
  const vertices: number[][] = [];
  if (glyph === 'box_shell') {
    const half = KNOWLEDGE_GRAPH_BOX_SHELL_SIDE / 2 - thickness / 2;
    for (let index = 0; index < 8; index++) {
      vertices.push([index & 1 ? half : -half, index & 2 ? half : -half, index & 4 ? half : -half]);
    }
  } else if (glyph === 'diamond_shell') {
    const radius = KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.diamond_shell - thickness;
    vertices.push(
      [radius, 0, 0],
      [-radius, 0, 0],
      [0, radius, 0],
      [0, -radius, 0],
      [0, 0, radius],
      [0, 0, -radius],
    );
  } else {
    throw new RangeError('unsupported knowledge-graph shell');
  }
  const triangles = [
    0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 0, 4, 2, 2, 4, 6, 1, 3,
    5, 3, 7, 5,
  ];
  const result = new Float32Array(12 * triangles.length * 3);
  let output = 0;
  for (let first = 0; first < vertices.length; first++) {
    for (let second = first + 1; second < vertices.length; second++) {
      const a = vertices[first];
      const b = vertices[second];
      const differing = Number(a[0] !== b[0]) + Number(a[1] !== b[1]) + Number(a[2] !== b[2]);
      if (glyph === 'box_shell' ? differing !== 1 : a[0] * b[0] + a[1] * b[1] + a[2] * b[2] !== 0)
        continue;
      let dx = b[0] - a[0];
      let dy = b[1] - a[1];
      let dz = b[2] - a[2];
      const length = Math.hypot(dx, dy, dz);
      dx /= length;
      dy /= length;
      dz /= length;
      let ux = Math.abs(dz) < 0.9 ? dy : -dz;
      let uy = Math.abs(dz) < 0.9 ? -dx : 0;
      let uz = Math.abs(dz) < 0.9 ? 0 : dx;
      const uLength = Math.hypot(ux, uy, uz);
      ux /= uLength;
      uy /= uLength;
      uz /= uLength;
      const vx = dy * uz - dz * uy;
      const vy = dz * ux - dx * uz;
      const vz = dx * uy - dy * ux;
      for (let triangle = 0; triangle < triangles.length; triangle++) {
        const corner = triangles[triangle];
        const endpoint = corner & 4 ? b : a;
        const u = ((corner & 1 ? 1 : -1) * thickness) / 2;
        const v = ((corner & 2 ? 1 : -1) * thickness) / 2;
        result[output++] = endpoint[0] + ux * u + vx * v;
        result[output++] = endpoint[1] + uy * u + vy * v;
        result[output++] = endpoint[2] + uz * u + vz * v;
      }
    }
  }
  if (output !== result.length) throw new Error('knowledge-graph shell topology mismatch');
  return result;
}

const NODE_GLYPH_SET = new Set<string>(KNOWLEDGE_GRAPH_NODE_GLYPHS);
const EDGE_STROKE_PATTERN_SET = new Set<string>(KNOWLEDGE_GRAPH_EDGE_STROKE_PATTERNS);
const HEX_COLOR = /^#[0-9a-f]{6}$/u;

export function isKnowledgeGraphNodeGlyph(value: unknown): value is KnowledgeGraphNodeGlyph {
  return typeof value === 'string' && NODE_GLYPH_SET.has(value);
}

export function isKnowledgeGraphEdgeStrokePattern(
  value: unknown,
): value is KnowledgeGraphEdgeStrokePattern {
  return typeof value === 'string' && EDGE_STROKE_PATTERN_SET.has(value);
}

export function knowledgeGraphNodeGlyphDescription(glyph: KnowledgeGraphNodeGlyph): string {
  switch (glyph) {
    case 'sphere_outline':
      return 'outlined sphere';
    case 'box_shell':
      return 'sphere with box shell';
    case 'diamond_shell':
      return 'sphere with diamond shell';
  }
}

export function knowledgeGraphEdgeStrokeDescription(
  pattern: KnowledgeGraphEdgeStrokePattern,
): string {
  switch (pattern) {
    case 'solid':
      return 'solid stroke';
    case 'long_dash':
      return 'long-dash stroke';
    case 'short_dash':
      return 'short-dash stroke';
    case 'dotted':
      return 'dotted stroke';
  }
}

/** Fixed 12-chord masks: render buffers omit every hidden chord entirely. */
export function knowledgeGraphEdgeStrokeSegmentVisible(
  pattern: KnowledgeGraphEdgeStrokePattern,
  chordIndex: number,
  chordCount: number,
): boolean {
  if (
    !Number.isSafeInteger(chordIndex) ||
    !Number.isSafeInteger(chordCount) ||
    chordCount < 1 ||
    chordIndex < 0 ||
    chordIndex >= chordCount
  ) {
    throw new RangeError('knowledge-graph stroke segment index is invalid');
  }
  switch (pattern) {
    case 'solid':
      return true;
    case 'long_dash':
      return chordIndex % 4 !== 3;
    case 'short_dash':
      return chordIndex % 2 === 0;
    case 'dotted':
      return chordIndex % 3 === 0;
  }
}

function linearChannel(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(red: number, green: number, blue: number): number {
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);
}

function contrastRatio(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number {
  const a = luminance(...first);
  const b = luminance(...second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseHexColor(value: string): [number, number, number] | null {
  if (!HEX_COLOR.test(value)) return null;
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function encodeHexColor(channels: readonly number[]): string {
  return `#${channels
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Preserve the source hue as far as possible while moving monotonically toward
 * black on a light canvas or white on a dark canvas until a non-text 3:1 mark
 * contrast is reached. Source colors remain separately disclosed in the legend.
 */
export function knowledgeGraphContrastSafeColor(
  sourceColor: string,
  themeMode: 'dark' | 'light',
): string {
  const source = parseHexColor(sourceColor);
  const background = parseHexColor(KNOWLEDGE_GRAPH_BACKGROUND_COLORS[themeMode]);
  if (source === null || background === null) {
    return themeMode === 'light' ? '#0f172a' : '#f8fafc';
  }
  if (contrastRatio(source, background) >= KNOWLEDGE_GRAPH_MIN_MARK_CONTRAST) {
    return sourceColor;
  }
  const endpoint = themeMode === 'light' ? 0 : 255;
  for (let step = 1; step <= 255; step++) {
    const amount = step / 255;
    const candidate = source.map((channel) =>
      Math.round(channel + (endpoint - channel) * amount),
    ) as [number, number, number];
    if (contrastRatio(candidate, background) >= KNOWLEDGE_GRAPH_MIN_MARK_CONTRAST) {
      return encodeHexColor(candidate);
    }
  }
  return endpoint === 0 ? '#000000' : '#ffffff';
}

export function knowledgeGraphRenderedNodeScale(emphasized: boolean): number {
  return emphasized ? KNOWLEDGE_GRAPH_FOCUSED_NODE_SCALE : 1;
}

/** One salience policy shared by the opaque fill and redundant glyph shell. */
export function knowledgeGraphNodeEmphasisDimAmount(
  nodeId: string,
  focus: string | null,
  focusSet: ReadonlySet<string> | null | undefined,
  queryActive: boolean,
  queryMatchIds: ReadonlySet<string>,
): number {
  if (focus !== null) {
    return nodeId === focus || focusSet?.has(nodeId) === true ? 0 : 0.8;
  }
  return queryActive && !queryMatchIds.has(nodeId) ? 0.82 : 0;
}

export function knowledgeGraphRenderedNodeRadialExtent(
  radius: number,
  glyph: KnowledgeGraphNodeGlyph,
  emphasized: boolean,
): number {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError('knowledge-graph node radius must be positive and finite');
  }
  return (
    radius *
    knowledgeGraphRenderedNodeScale(emphasized) *
    KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE[glyph]
  );
}

/**
 * Node contribution to a one-shot whole-graph fit. It is deliberately identical
 * to geometry rendered on that frame: an active focus scale is real geometry,
 * while a possible future focus label is not.
 */
export function knowledgeGraphAutoFrameNodeRadialExtent(
  radius: number,
  glyph: KnowledgeGraphNodeGlyph,
  focused: boolean,
): number {
  return knowledgeGraphRenderedNodeRadialExtent(radius, glyph, focused);
}
