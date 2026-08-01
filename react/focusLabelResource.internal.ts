import * as THREE from 'three';
import {
  knowledgeGraphRenderedNodeRadialExtent,
} from './knowledgeGraphVisualEncoding.internal';
import type { KnowledgeGraphNodeGlyph } from './knowledgeGraphPresentation.types';

export const FOCUS_LABEL_MAX_WORLD_WIDTH = 160;
export const FOCUS_LABEL_WORLD_HEIGHT = 7;
export const FOCUS_LABEL_NODE_GAP = 4;

/** Center the billboard with an exact edge gap above the complete node glyph. */
export function knowledgeGraphFocusLabelCenterOffset(
  nodeRadius: number,
  nodeGlyph: KnowledgeGraphNodeGlyph,
): number {
  return knowledgeGraphRenderedNodeRadialExtent(nodeRadius, nodeGlyph, true) +
    FOCUS_LABEL_NODE_GAP + FOCUS_LABEL_WORLD_HEIGHT / 2;
}

/**
 * Anchor the Sprite at the node and apply a camera-facing world-unit offset from
 * the focused glyph's conservative radial extent. The algebra is exact in the
 * sprite plane (and orthographic projection); perspective silhouette separation
 * remains camera-dependent. Placement does not read a stale camera matrix.
 */
export function knowledgeGraphFocusLabelSpriteCenterY(
  nodeRadius: number,
  nodeGlyph: KnowledgeGraphNodeGlyph,
): number {
  return -(
    knowledgeGraphRenderedNodeRadialExtent(nodeRadius, nodeGlyph, true) +
    FOCUS_LABEL_NODE_GAP
  ) / FOCUS_LABEL_WORLD_HEIGHT;
}

/** Orientation-independent sphere enclosing the focused glyph and label. */
export function knowledgeGraphFocusedNodeAndLabelRadius(
  nodeRadius: number,
  nodeGlyph: KnowledgeGraphNodeGlyph,
): number {
  return knowledgeGraphFocusLabelCenterOffset(nodeRadius, nodeGlyph) +
    Math.hypot(
      FOCUS_LABEL_MAX_WORLD_WIDTH / 2,
      FOCUS_LABEL_WORLD_HEIGHT / 2,
    );
}

const FOCUS_LABEL_THEME = Object.freeze({
  dark: Object.freeze({
    background: '#030711',
    text: '#e2e8f0',
  }),
  light: Object.freeze({
    background: '#f8fafc',
    text: '#0f172a',
  }),
});

export interface FocusLabelResourceOptions {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  label: string;
  color: string;
  themeMode: 'dark' | 'light';
  invalidate: () => void;
  /** Test seam; production deliberately uses a local DOM canvas. */
  createCanvas?: () => HTMLCanvasElement | null;
  /** Test seam; production creates one owned CanvasTexture. */
  createTexture?: (canvas: HTMLCanvasElement) => THREE.Texture;
}

/**
 * Install one network-free label texture after React commit.
 *
 * The caller must invoke this from a layout/effect boundary. The returned
 * cleanup is idempotent, disposes exactly the texture created by this setup,
 * and cannot clear or hide a newer setup that has replaced its material map.
 */
export function installFocusLabelResource({
  sprite,
  material,
  label,
  color,
  themeMode,
  invalidate,
  createCanvas = () => (
    typeof document === 'undefined' ? null : document.createElement('canvas')
  ),
  createTexture = (canvas) => new THREE.CanvasTexture(canvas),
}: FocusLabelResourceOptions): (() => void) | undefined {
  sprite.visible = false;
  material.map = null;
  material.needsUpdate = true;
  if (!label) {
    invalidate();
    return undefined;
  }

  const canvas = createCanvas();
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    invalidate();
    return undefined;
  }

  const fontSize = 42;
  const paddingX = 24;
  const paddingY = 14;
  context.font = `600 ${fontSize}px system-ui, sans-serif`;
  const measured = Math.ceil(context.measureText(label).width);
  canvas.width = Math.min(1024, Math.max(96, measured + paddingX * 2));
  canvas.height = fontSize + paddingY * 2;

  context.font = `600 ${fontSize}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const theme = FOCUS_LABEL_THEME[themeMode];
  // Seed both assignments with a theme-owned readable pair. Canvas silently
  // ignores invalid CSS colour assignments, so neither an invalid override nor
  // a browser parser difference can inherit a prior draw's foreground/background.
  context.fillStyle = theme.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  // Canvas ignores an invalid fillStyle assignment. Seed a readable fallback
  // first so an untyped caller cannot leave text matching the background.
  context.fillStyle = theme.text;
  context.fillStyle = color;
  context.fillText(label, canvas.width / 2, canvas.height / 2, canvas.width - paddingX * 2);

  const texture = createTexture(canvas);
  try {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    material.map = texture;
    material.needsUpdate = true;
    sprite.scale.set(
      Math.min(
        FOCUS_LABEL_MAX_WORLD_WIDTH,
        (canvas.width / canvas.height) * FOCUS_LABEL_WORLD_HEIGHT,
      ),
      FOCUS_LABEL_WORLD_HEIGHT,
      1,
    );
    sprite.visible = true;
    invalidate();
  } catch (setupError) {
    // React has not received a cleanup yet. Roll back and dispose here so even
    // a throwing host invalidator cannot leak or leave the texture attached.
    if (material.map === texture) {
      material.map = null;
      material.needsUpdate = true;
      sprite.visible = false;
    }
    try {
      texture.dispose();
    } catch (disposeError) {
      throw new AggregateError(
        [setupError, disposeError],
        'focus-label setup and rollback both failed',
      );
    }
    throw setupError;
  }

  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    let shouldInvalidate = false;
    if (material.map === texture) {
      material.map = null;
      material.needsUpdate = true;
      sprite.visible = false;
      shouldInvalidate = true;
    }
    let disposeFailed = false;
    let disposeError: unknown;
    try {
      texture.dispose();
    } catch (error) {
      disposeFailed = true;
      disposeError = error;
    }
    let invalidateFailed = false;
    let invalidateError: unknown;
    if (shouldInvalidate) {
      try {
        invalidate();
      } catch (error) {
        invalidateFailed = true;
        invalidateError = error;
      }
    }
    if (disposeFailed && invalidateFailed) {
      throw new AggregateError(
        [disposeError, invalidateError],
        'focus-label disposal and invalidation both failed',
      );
    }
    if (disposeFailed) throw disposeError;
    if (invalidateFailed) throw invalidateError;
  };
}
