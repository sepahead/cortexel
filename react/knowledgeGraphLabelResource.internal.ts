import * as THREE from 'three';
import { safeDiagnosticText } from '../core/safeRuntime';
import {
  KNOWLEDGE_GRAPH_LABEL_HEIGHT_PX,
  KNOWLEDGE_GRAPH_MAX_LABELS,
} from './knowledgeGraphLabelLayout.internal';

const TILE_WIDTH = 384;
const TILE_HEIGHT = 64;
const MAX_COLUMNS = 8;
const FONT = '500 26px system-ui, sans-serif';
const PIXELS_PER_CSS_PIXEL = 2;
const MAX_TEXT_WIDTH = 328;
const TEXT_PADDING = 12;

export const KNOWLEDGE_GRAPH_LABEL_VERTEX_SHADER = `
attribute vec4 labelUvRect;
varying vec2 vLabelUv;
void main() {
  vLabelUv = labelUvRect.xy + uv * labelUvRect.zw;
  vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec2 scale = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
  center.xy += position.xy * scale;
  gl_Position = projectionMatrix * center;
}`;
export const KNOWLEDGE_GRAPH_LABEL_FRAGMENT_SHADER = `
uniform sampler2D labelMap;
varying vec2 vLabelUv;
void main() {
  gl_FragColor = texture2D(labelMap, vLabelUv);
  if (gl_FragColor.a < 0.01) discard;
  #include <colorspace_fragment>
}`;

export interface KnowledgeGraphLabelResourceState {
  readonly widths: Float32Array;
  readonly uvRects: Float32Array;
  ready: boolean;
}

export function createKnowledgeGraphLabelResourceState(
  capacity: number,
): KnowledgeGraphLabelResourceState {
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > KNOWLEDGE_GRAPH_MAX_LABELS) {
    throw new RangeError('invalid bounded label resource capacity');
  }
  return {
    widths: new Float32Array(capacity),
    uvRects: new Float32Array(capacity * 4),
    ready: false,
  };
}

export interface KnowledgeGraphLabelResourceOptions {
  readonly labels: readonly string[];
  readonly state: KnowledgeGraphLabelResourceState;
  readonly map: { value: THREE.Texture | null };
  readonly themeMode: 'dark' | 'light';
  readonly color: string;
  readonly invalidate: () => void;
  readonly createCanvas?: () => HTMLCanvasElement | null;
  readonly createTexture?: (canvas: HTMLCanvasElement) => THREE.Texture;
}

function fitLabel(context: CanvasRenderingContext2D, value: string): string {
  const text = safeDiagnosticText(value, 120);
  if (context.measureText(text).width <= MAX_TEXT_WIDTH) return text;
  // Shortening is presentation only. Segment whole graphemes when the host
  // supplies the standard segmenter; complete source text stays in the DOM.
  const chunks =
    typeof Intl.Segmenter === 'function'
      ? Array.from(
          new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text),
          (part) => part.segment,
        )
      : Array.from(text);
  while (chunks.length > 0 && context.measureText(chunks.join('') + '…').width > MAX_TEXT_WIDTH)
    chunks.pop();
  return chunks.join('') + '…';
}

/**
 * Create one local atlas only after commit. At most 64 tiles occupy 3,072 ×
 * 512 pixels (6 MiB of uncompressed RGBA). No network or font loader exists.
 * The exact cleanup cannot clear a later replacement's sampler or ready state.
 */
export function installKnowledgeGraphLabelResources({
  labels,
  state,
  map,
  themeMode,
  color,
  invalidate,
  createCanvas = () => (typeof document === 'undefined' ? null : document.createElement('canvas')),
  createTexture = (canvas) => new THREE.CanvasTexture(canvas),
}: KnowledgeGraphLabelResourceOptions): (() => void) | undefined {
  if (
    labels.length > KNOWLEDGE_GRAPH_MAX_LABELS ||
    labels.length !== state.widths.length ||
    state.uvRects.length !== labels.length * 4
  )
    throw new RangeError('label atlas capacity mismatch');
  state.ready = false;
  state.widths.fill(0);
  if (labels.length === 0) {
    invalidate();
    return undefined;
  }
  const canvas = createCanvas();
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    invalidate();
    return undefined;
  }
  const columns = Math.min(MAX_COLUMNS, labels.length);
  canvas.width = columns * TILE_WIDTH;
  canvas.height = Math.ceil(labels.length / columns) * TILE_HEIGHT;
  context.font = FONT;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  const background = themeMode === 'light' ? '#f8fafc' : '#030711';
  const foreground = themeMode === 'light' ? '#0f172a' : '#e2e8f0';
  for (let slot = 0; slot < labels.length; slot++) {
    const text = fitLabel(context, labels[slot]);
    const width = Math.max(32, Math.ceil(context.measureText(text).width) + TEXT_PADDING * 2);
    const x = (slot % columns) * TILE_WIDTH;
    const y = Math.floor(slot / columns) * TILE_HEIGHT;
    const height = KNOWLEDGE_GRAPH_LABEL_HEIGHT_PX * PIXELS_PER_CSS_PIXEL;
    context.fillStyle = background;
    context.beginPath();
    if (typeof context.roundRect === 'function') context.roundRect(x, y, width, height, 10);
    else context.rect(x, y, width, height);
    context.fill();
    context.fillStyle = foreground;
    context.fillStyle = color;
    context.fillText(text, x + TEXT_PADDING, y + height / 2);
    state.widths[slot] = width / PIXELS_PER_CSS_PIXEL;
    const uv = slot * 4;
    state.uvRects[uv] = x / canvas.width;
    state.uvRects[uv + 1] = 1 - (y + height) / canvas.height;
    state.uvRects[uv + 2] = width / canvas.width;
    state.uvRects[uv + 3] = height / canvas.height;
  }
  const texture = createTexture(canvas);
  try {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    map.value = texture;
    state.ready = true;
    invalidate();
  } catch (error) {
    if (map.value === texture) {
      map.value = null;
      state.ready = false;
    }
    try {
      texture.dispose();
    } catch (disposeError) {
      throw new AggregateError([error, disposeError], 'label atlas setup and rollback failed');
    }
    throw error;
  }
  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    const ownsMap = map.value === texture;
    if (ownsMap) {
      map.value = null;
      state.ready = false;
    }
    let disposalError: unknown;
    let invalidateError: unknown;
    let disposalFailed = false;
    let invalidateFailed = false;
    try {
      texture.dispose();
    } catch (error) {
      disposalError = error;
      disposalFailed = true;
    }
    if (ownsMap)
      try {
        invalidate();
      } catch (error) {
        invalidateError = error;
        invalidateFailed = true;
      }
    if (disposalFailed && invalidateFailed) {
      throw new AggregateError([disposalError, invalidateError], 'label atlas cleanup failed');
    }
    if (disposalFailed) throw disposalError;
    if (invalidateFailed) throw invalidateError;
  };
}
