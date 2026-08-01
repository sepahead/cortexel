import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { createElement, Profiler } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create } from 'react-test-renderer';
import * as THREE from 'three';
import { CORTEXEL_PALETTE } from '../core/colormaps';
import {
  assignGraphEdgeLanes,
  buildAdjacency,
  advanceGraphLayoutClock,
  advanceGraphLayoutClockInto,
  assertKnowledgeGraphLiveForceBudget,
  assertKnowledgeGraphPresentationBudget,
  assertRenderableGraphEdges,
  assertUniqueGraphNodeIds,
  CORPUS_GRAPH_RADIUS_MEANING,
  corpusGraphInstanceIdentity,
  corpusGraphRadiusMeaning,
  defaultNodeColors,
  filterGraphEdges,
  flowParticleCount,
  GRAPH_EDGE_CURVE_SEGMENTS,
  GRAPH_EDGE_LANE_SPACING,
  GRAPH_LAYOUT_TICK_SECONDS,
  graphEdgeControlPointInto,
  graphEdgeCurvePointInto,
  graphEdgeMatchesQuery,
  graphEdgeTargetBoundaryInto,
  graphCameraTargetDamping,
  graphQueryMatchIds,
  graphSignature,
  isKnowledgeGraphLiveForceWithinBudget,
  knowledgeGraphLiveForceAvailability,
  MAX_GRAPH_QUERY_LENGTH,
  MAX_GRAPH_EDGE_LANE_OFFSET,
  MAX_GRAPH_NODE_RADIUS,
  MAX_GRAPH_PARALLEL_EDGES,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES,
  MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES,
  normalizeGraphQuery,
  normalizeGraphNodeRadius,
  matchesGraphQuery,
  reducedMotionLayoutTickBudget,
  uniqueGraphTopologyLinks,
  mapCorpusKnowledgeGraph,
} from '../react/knowledgeGraph';
import {
  planGraphLayoutCache,
  publishGraphLayoutCache,
  snapshotGraphLayoutInputs,
} from '../react/knowledgeGraphLayout.internal';
import {
  FOCUS_LABEL_NODE_GAP,
  FOCUS_LABEL_WORLD_HEIGHT,
  installFocusLabelResource,
  knowledgeGraphFocusLabelCenterOffset,
  knowledgeGraphFocusLabelSpriteCenterY,
  knowledgeGraphFocusedNodeAndLabelRadius,
} from '../react/focusLabelResource.internal';
import {
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  prepareKnowledgeGraphPresentation,
  type KnowledgeGraph3DEdge,
} from '../react/KnowledgeGraph3DScene';
import {
  beginKnowledgeGraphRuntimeTransition,
  handleKnowledgeGraphNodeClick,
  handleKnowledgeGraphPointerOut,
  isIntentionalKnowledgeGraphClick,
  isKnowledgeGraphInstanceId,
  synchronizeKnowledgeGraphControlsListener,
  toggledKnowledgeGraphSelection,
} from '../react/knowledgeGraphInteraction.internal';
import {
  KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN,
  KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN,
  isKnowledgeGraphCameraVectorFinite,
  isKnowledgeGraphCameraParentChainIdentity,
  isKnowledgeGraphCameraSelfTransformCanonical,
  isKnowledgeGraphCenteredAutoFrameProjectionSupported,
  isKnowledgeGraphOrthographicProjectionReady,
  isKnowledgeGraphPerspectiveProjectionReady,
  knowledgeGraphCameraProjectionKind,
  planKnowledgeGraphCameraClipping,
  planKnowledgeGraphCameraClippingInto,
  planKnowledgeGraphCameraFit,
} from '../react/knowledgeGraphCamera.internal';
import {
  CORPUS_EDGE_STROKE_PATTERN_BY_KIND,
  CORPUS_NODE_GLYPH_BY_KIND,
  KNOWLEDGE_GRAPH_FOCUSED_NODE_SCALE,
  KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE,
  knowledgeGraphAutoFrameNodeRadialExtent,
  knowledgeGraphContrastSafeColor,
  knowledgeGraphEdgeStrokeSegmentVisible,
  knowledgeGraphNodeEmphasisDimAmount,
  knowledgeGraphRenderedNodeRadialExtent,
} from '../react/knowledgeGraphVisualEncoding.internal';
import { graphEdgeIdentityKey } from '../react/knowledgeGraphIdentity.internal';
import {
  advanceKnowledgeGraphFlowPhase,
  KNOWLEDGE_GRAPH_FLOW_CYCLES_PER_SECOND,
  MAX_KNOWLEDGE_GRAPH_FLOW_FRAME_DELTA_SECONDS,
  planFlowParticleDistribution,
  reducedMotionFlowParticleFraction,
} from '../react/knowledgeGraphParticles.internal';
import {
  KnowledgeGraph3DScene,
  KnowledgeGraphA11yList,
  KnowledgeGraphLegend,
  type KnowledgeGraph3DNode,
} from '../react/KnowledgeGraph3DScene';
import type { KnowledgeGraph3DParams } from '../core/skills/params';
import { KNOWLEDGE_GRAPH_LIMITS, PARAM_LIMITS } from '../core/skills/params';

// react/knowledgeGraph.ts is THREE-free/React-free (only `import type` from the
// scene), so its logic is unit-testable in Node. Direct-entrypoint rejection is
// server-rendered only through the pre-hook fail-closed path; no GPU is mounted.
const P = CORTEXEL_PALETTE;

type RawKnowledgeGraphProps = {
  readonly graphIdentity: string;
  readonly nodes: readonly KnowledgeGraph3DNode[];
  readonly edges: readonly KnowledgeGraph3DEdge[];
};

function withPreparedPresentation<T extends RawKnowledgeGraphProps>(
  props: T,
): Omit<T, keyof RawKnowledgeGraphProps> & {
  presentation: ReturnType<typeof prepareKnowledgeGraphPresentation>;
} {
  const { graphIdentity, nodes, edges, ...rest } = props;
  const presentation = prepareKnowledgeGraphPresentation({
    contract: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
    profile: 'generic_visual',
    graphIdentity,
    nodes,
    edges,
  });
  return { ...rest, presentation };
}

function prepareGenericGraph(
  nodes: readonly KnowledgeGraph3DNode[],
  edges: readonly KnowledgeGraph3DEdge[],
) {
  return prepareKnowledgeGraphPresentation({
    contract: KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
    profile: 'generic_visual',
    graphIdentity: 'cortexel:test:generic-graph',
    nodes,
    edges,
  });
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeFocusLabelCanvas() {
  let effectiveFillStyle = '';
  let fillRectStyle = '';
  let fillTextStyle = '';
  const context = {
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    get fillStyle() {
      return effectiveFillStyle;
    },
    set fillStyle(value: string) {
      // Model CanvasRenderingContext2D's invalid-assignment behavior for the
      // explicit hostile-color negative control below.
      if (value !== 'definitely-not-a-css-color') effectiveFillStyle = value;
    },
    measureText: () => ({ width: 120 }),
    fillRect: () => {
      fillRectStyle = effectiveFillStyle;
    },
    fillText: () => {
      fillTextStyle = effectiveFillStyle;
    },
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    getContext: (kind: string) => kind === '2d' ? context : null,
  } as unknown as HTMLCanvasElement;
  return {
    canvas,
    fillRectStyle: () => fillRectStyle,
    fillTextStyle: () => fillTextStyle,
  };
}

function makeFocusLabelTargets() {
  const material = new THREE.SpriteMaterial();
  const sprite = new THREE.Sprite(material);
  const texture = new THREE.Texture();
  const dispose = vi.spyOn(texture, 'dispose');
  return { material, sprite, texture, dispose };
}

function testRendererText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(testRendererText).join('');
  if (value === null || typeof value !== 'object') return '';
  return testRendererText((value as { children?: unknown }).children);
}

describe('graph helpers', () => {
  it('fits perspective and orthographic cameras without discarding orientation', () => {
    const radius = 64;
    const square = planKnowledgeGraphCameraFit({
      contentRadius: radius,
      currentDistance: 5,
      projection: { kind: 'perspective', verticalFovDegrees: 50, aspect: 1 },
    });
    const portrait = planKnowledgeGraphCameraFit({
      contentRadius: radius,
      currentDistance: 5,
      projection: { kind: 'perspective', verticalFovDegrees: 50, aspect: 0.4 },
    });
    expect(square.distance).toBeGreaterThan(120);
    expect(portrait.distance).toBeGreaterThan(square.distance);
    const horizontalHalf = Math.atan(Math.tan(25 * Math.PI / 180) * 0.4);
    expect(portrait.distance * Math.sin(horizontalHalf)).toBeGreaterThanOrEqual(
      radius * KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN,
    );
    const zoomedOut = planKnowledgeGraphCameraFit({
      contentRadius: radius,
      currentDistance: 10_000,
      projection: { kind: 'perspective', verticalFovDegrees: 50, aspect: 1 },
    });
    expect(zoomedOut.distance).toBeCloseTo(square.distance);

    const orthographic = planKnowledgeGraphCameraFit({
      contentRadius: 20,
      currentDistance: 40,
      projection: {
        kind: 'orthographic',
        horizontalSpan: 100,
        verticalSpan: 50,
        currentZoom: 2,
      },
    });
    expect(orthographic.distance).toBe(120);
    expect(orthographic.orthographicZoom).toBeCloseTo(
      25 / (20 * KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN),
    );
    const orthographicZoomedOut = planKnowledgeGraphCameraFit({
      contentRadius: 20,
      currentDistance: 10_000,
      projection: {
        kind: 'orthographic',
        horizontalSpan: 100,
        verticalSpan: 50,
        currentZoom: 0.01,
      },
    });
    expect(orthographicZoomedOut.distance).toBe(120);
    expect(orthographicZoomedOut.orthographicZoom).toBeCloseTo(
      orthographic.orthographicZoom!,
    );

    fc.assert(fc.property(
      fc.double({ min: 0.01, max: 100_000, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 1, max: 170, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0.05, max: 10, noNaN: true, noDefaultInfinity: true }),
      (contentRadius, verticalFovDegrees, aspect) => {
        const plan = planKnowledgeGraphCameraFit({
          contentRadius,
          currentDistance: 0,
          projection: { kind: 'perspective', verticalFovDegrees, aspect },
        });
        const verticalHalf = Math.min(89.5, Math.max(0.5, verticalFovDegrees / 2)) *
          Math.PI / 180;
        const horizontalHalf = Math.atan(Math.tan(verticalHalf) * aspect);
        return plan.distance * Math.sin(Math.min(verticalHalf, horizontalHalf)) >=
          contentRadius * KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN * (1 - 1e-12);
      },
    ));
  });

  it('keeps the fitted sphere inside finite camera clipping planes', () => {
    const reusable = { near: -1, far: -1 };
    expect(planKnowledgeGraphCameraClippingInto(
      'perspective',
      500,
      10,
      300,
      80,
      reusable,
    )).toBe(reusable);
    expect(reusable.near).toBeLessThan(500);
    expect(reusable.far).toBeGreaterThan(300);

    const perspective = planKnowledgeGraphCameraClipping({
      kind: 'perspective',
      currentNear: 500,
      currentFar: 10,
      distance: 300,
      contentRadius: 80,
    });
    expect(perspective.near).toBeLessThanOrEqual(
      300 - 80 * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN,
    );
    expect(perspective.near).toBeGreaterThan(0);
    expect(perspective.far).toBeGreaterThanOrEqual(
      300 + 80 * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN,
    );

    const orthographic = planKnowledgeGraphCameraClipping({
      kind: 'orthographic',
      currentNear: Number.NaN,
      currentFar: Number.NaN,
      distance: 120,
      contentRadius: 20,
    });
    expect(orthographic.near).toBe(0);
    expect(orthographic.far).toBe(145);

    fc.assert(fc.property(
      fc.constantFrom('perspective' as const, 'orthographic' as const),
      fc.double({ min: 1, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0.01, max: 100_000, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0.001, max: 2_000_000, noNaN: true, noDefaultInfinity: true }),
      (kind, distance, radius, currentNear, currentFar) => {
        const plan = planKnowledgeGraphCameraClipping({
          kind,
          currentNear,
          currentFar,
          distance,
          contentRadius: radius,
        });
        return Number.isFinite(plan.near) && Number.isFinite(plan.far) &&
          plan.near >= 0 && plan.far > plan.near &&
          plan.near <= Math.max(
            kind === 'perspective' ? 0.001 : 0,
            distance - radius * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN,
          ) &&
          plan.far >= distance + radius * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN;
      },
    ));
  });

  it('refuses to invent projection semantics for unsupported cameras', () => {
    expect(knowledgeGraphCameraProjectionKind({ isPerspectiveCamera: true })).toBe(
      'perspective',
    );
    expect(knowledgeGraphCameraProjectionKind({ isOrthographicCamera: true })).toBe(
      'orthographic',
    );
    expect(knowledgeGraphCameraProjectionKind({})).toBeNull();
    expect(knowledgeGraphCameraProjectionKind({
      isPerspectiveCamera: false,
      isOrthographicCamera: false,
    })).toBeNull();
    expect(knowledgeGraphCameraProjectionKind({
      isPerspectiveCamera: true,
      isOrthographicCamera: true,
    })).toBeNull();
    expect(isKnowledgeGraphPerspectiveProjectionReady(50, 1)).toBe(true);
    expect(isKnowledgeGraphPerspectiveProjectionReady(50, 0)).toBe(false);
    expect(isKnowledgeGraphPerspectiveProjectionReady(Number.NaN, 1)).toBe(false);
    expect(isKnowledgeGraphPerspectiveProjectionReady(180, 1)).toBe(false);
    expect(isKnowledgeGraphOrthographicProjectionReady(100, 50, 1)).toBe(true);
    expect(isKnowledgeGraphOrthographicProjectionReady(0, 50, 1)).toBe(false);
    expect(isKnowledgeGraphOrthographicProjectionReady(100, Number.NaN, 1)).toBe(
      false,
    );
    expect(isKnowledgeGraphOrthographicProjectionReady(100, 50, 0)).toBe(false);
    expect(isKnowledgeGraphCameraVectorFinite(0, 1, -2)).toBe(true);
    expect(isKnowledgeGraphCameraVectorFinite(Number.NaN, 1, 2)).toBe(false);
  });

  it('auto-frames only canonical centered cameras with identity parent transforms', () => {
    const perspective = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1_000);
    perspective.updateProjectionMatrix();
    const perspectiveAuthority = {
      kind: 'perspective' as const,
      isArrayCamera: false,
      viewEnabled: false,
      parentTransformIdentity: true,
      selfTransformCanonical: true,
      cameraMethodsCanonical: true,
      projectionMethodCanonical: true,
      effectiveFovMethodCanonical: true,
      webGlCoordinateSystem: true,
      fovDegrees: perspective.fov,
      aspect: perspective.aspect,
      zoom: perspective.zoom,
      near: perspective.near,
      far: perspective.far,
      filmOffset: perspective.filmOffset,
      projectionMatrixElements: perspective.projectionMatrix.elements,
    };
    expect(isKnowledgeGraphCenteredAutoFrameProjectionSupported(
      perspectiveAuthority,
    )).toBe(true);
    for (const mutation of [
      { isArrayCamera: true },
      { viewEnabled: true },
      { parentTransformIdentity: false },
      { selfTransformCanonical: false },
      { cameraMethodsCanonical: false },
      { projectionMethodCanonical: false },
      { effectiveFovMethodCanonical: false },
      { webGlCoordinateSystem: false },
      { filmOffset: 1 },
    ]) {
      expect(isKnowledgeGraphCenteredAutoFrameProjectionSupported({
        ...perspectiveAuthority,
        ...mutation,
      })).toBe(false);
    }
    const customPerspectiveMatrix = [...perspective.projectionMatrix.elements];
    customPerspectiveMatrix[8] = 0.25;
    expect(isKnowledgeGraphCenteredAutoFrameProjectionSupported({
      ...perspectiveAuthority,
      projectionMatrixElements: customPerspectiveMatrix,
    })).toBe(false);

    const orthographic = new THREE.OrthographicCamera(-2, 2, 1, -1, 0.1, 1_000);
    orthographic.updateProjectionMatrix();
    const orthographicAuthority = {
      kind: 'orthographic' as const,
      isArrayCamera: false,
      viewEnabled: false,
      parentTransformIdentity: true,
      selfTransformCanonical: true,
      cameraMethodsCanonical: true,
      projectionMethodCanonical: true,
      webGlCoordinateSystem: true,
      left: orthographic.left,
      right: orthographic.right,
      top: orthographic.top,
      bottom: orthographic.bottom,
      zoom: orthographic.zoom,
      near: orthographic.near,
      far: orthographic.far,
      projectionMatrixElements: orthographic.projectionMatrix.elements,
    };
    expect(isKnowledgeGraphCenteredAutoFrameProjectionSupported(
      orthographicAuthority,
    )).toBe(true);
    expect(isKnowledgeGraphCenteredAutoFrameProjectionSupported({
      ...orthographicAuthority,
      left: -1,
    })).toBe(false);
    expect(isKnowledgeGraphCenteredAutoFrameProjectionSupported({
      ...orthographicAuthority,
      left: 3,
    })).toBe(false);

    const identityParent = new THREE.Group();
    identityParent.updateMatrix();
    identityParent.updateMatrixWorld(true);
    expect(isKnowledgeGraphCameraParentChainIdentity(identityParent)).toBe(true);
    identityParent.position.x = 1;
    identityParent.updateMatrix();
    identityParent.updateMatrixWorld(true);
    expect(isKnowledgeGraphCameraParentChainIdentity(identityParent)).toBe(false);

    perspective.position.set(1, 2, 3);
    perspective.lookAt(0, 0, 0);
    perspective.updateMatrixWorld(true);
    const selfTransform = () =>
      isKnowledgeGraphCameraSelfTransformCanonical(perspective);
    expect(selfTransform()).toBe(true);
    perspective.scale.setScalar(2);
    perspective.updateMatrixWorld(true);
    expect(selfTransform()).toBe(false);
    perspective.scale.setScalar(1);
    perspective.updateMatrixWorld(true);
    perspective.matrixWorld.elements[12] += 1;
    expect(selfTransform()).toBe(false);

  });

  it('uses bounded non-color kind channels and keeps focused arrows outside targets', () => {
    expect(CORPUS_NODE_GLYPH_BY_KIND).toEqual({
      paper: 'sphere_outline',
      model: 'box_shell',
      family: 'diamond_shell',
    });
    expect(CORPUS_EDGE_STROKE_PATTERN_BY_KIND).toEqual({
      cites: 'solid',
      same_as: 'solid',
      variant_of: 'long_dash',
      instantiates: 'short_dash',
      belongs_to_family: 'dotted',
    });
    const masks = Object.fromEntries(
      Object.values(CORPUS_EDGE_STROKE_PATTERN_BY_KIND).map((pattern) => [
        pattern,
        Array.from({ length: GRAPH_EDGE_CURVE_SEGMENTS }, (_, chord) =>
          knowledgeGraphEdgeStrokeSegmentVisible(
            pattern,
            chord,
            GRAPH_EDGE_CURVE_SEGMENTS,
          )),
      ]),
    );
    expect(new Set(Object.values(masks).map((mask) => JSON.stringify(mask))).size).toBe(4);
    expect(masks.solid.every(Boolean)).toBe(true);
    expect(KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.sphere_outline).toBeGreaterThan(1);
    expect(
      KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.box_shell * Math.sqrt(2 / 3),
    ).toBeGreaterThan(1.05);
    expect(
      KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.diamond_shell / Math.sqrt(2),
    ).toBeGreaterThan(1.05);
    expect(() => knowledgeGraphEdgeStrokeSegmentVisible('solid', 12, 12)).toThrow(
      /segment index/u,
    );

    const radius = 12;
    const glyph = 'diamond_shell' as const;
    const radialExtent = knowledgeGraphRenderedNodeRadialExtent(
      radius,
      glyph,
      true,
    );
    expect(radialExtent).toBe(
      radius * KNOWLEDGE_GRAPH_FOCUSED_NODE_SCALE *
      KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.diamond_shell,
    );
    const labelCenter = knowledgeGraphFocusLabelCenterOffset(radius, glyph);
    expect(labelCenter).toBeGreaterThan(radialExtent);
    const spriteCenterY = knowledgeGraphFocusLabelSpriteCenterY(radius, glyph);
    expect(-spriteCenterY * FOCUS_LABEL_WORLD_HEIGHT).toBe(
      radialExtent + FOCUS_LABEL_NODE_GAP,
    );
    expect(knowledgeGraphFocusedNodeAndLabelRadius(radius, glyph)).toBeGreaterThan(
      labelCenter,
    );
    const sceneSource = readFileSync(
      new URL('../react/KnowledgeGraph3DScene.tsx', import.meta.url),
      'utf8',
    );
    expect(sceneSource).toContain(
      'KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.sphere_outline',
    );
    expect(sceneSource).toContain(
      'KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.diamond_shell',
    );
    expect(sceneSource).toContain('knowledgeGraphFocusLabelSpriteCenterY(');
    expect(sceneSource).not.toContain('camera.matrixWorld.elements');
    expect(sceneSource).toContain('depthTest={false}');
    expect(sceneSource).toContain('frustumCulled={false}');
    expect(sceneSource.match(/updateKnowledgeGraphGlyphColors\(/g)).toHaveLength(4);
    expect(sceneSource.match(/color="#ffffff"/g)).toHaveLength(3);
    expect(knowledgeGraphNodeEmphasisDimAmount(
      'neighbor',
      'focus',
      new Set(['neighbor']),
      false,
      new Set(),
    )).toBe(0);
    expect(knowledgeGraphNodeEmphasisDimAmount(
      'peripheral',
      'focus',
      new Set(['neighbor']),
      false,
      new Set(),
    )).toBe(0.8);
    expect(knowledgeGraphNodeEmphasisDimAmount(
      'nonmatch',
      null,
      null,
      true,
      new Set(['match']),
    )).toBe(0.82);
  });

  it('frames the whole graph from rendered geometry, not inactive label envelopes', () => {
    const nodeRadius = 4;
    const glyph = 'sphere_outline' as const;
    const renderedExtent = knowledgeGraphRenderedNodeRadialExtent(
      nodeRadius,
      glyph,
      false,
    );
    const focusedExtent = knowledgeGraphRenderedNodeRadialExtent(
      nodeRadius,
      glyph,
      true,
    );
    expect(knowledgeGraphAutoFrameNodeRadialExtent(
      nodeRadius,
      glyph,
      false,
    )).toBe(renderedExtent);
    expect(knowledgeGraphAutoFrameNodeRadialExtent(
      nodeRadius,
      glyph,
      true,
    )).toBe(focusedExtent);
    const hypotheticalLabelExtent = knowledgeGraphFocusedNodeAndLabelRadius(
      nodeRadius,
      glyph,
    );
    const projection = {
      kind: 'perspective' as const,
      verticalFovDegrees: 50,
      aspect: 1098 / 618,
    };
    // The scene accumulates an axis-aligned box and then fits its bounding
    // sphere. A one-node graph therefore makes the old hypothetical-label bug
    // directly measurable without depending on a browser, font, or GPU.
    const renderedFit = planKnowledgeGraphCameraFit({
      contentRadius: renderedExtent * Math.sqrt(3),
      currentDistance: 260,
      projection,
    });
    const hypotheticalLabelFit = planKnowledgeGraphCameraFit({
      contentRadius: hypotheticalLabelExtent * Math.sqrt(3),
      currentDistance: 260,
      projection,
    });
    expect(hypotheticalLabelExtent).toBeGreaterThan(renderedExtent * 10);
    expect(hypotheticalLabelFit.distance).toBeGreaterThan(renderedFit.distance * 3);
  });

  it('normalizes every undimmed opaque source mark to 3:1 against its background', () => {
    const contrast = (foreground: string, background: string): number => {
      const channels = (value: string) => [1, 3, 5].map((offset) =>
        Number.parseInt(value.slice(offset, offset + 2), 16) / 255).map((channel) =>
          channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4);
      const luminance = (value: string) => {
        const [red, green, blue] = channels(value);
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      };
      const first = luminance(foreground);
      const second = luminance(background);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    };
    for (const [source, themeMode, background] of [
      ['#faccfa', 'light', '#f8fafc'],
      ['#c09036', 'light', '#f8fafc'],
      ['#275a60', 'dark', '#030711'],
      ['#ffffff', 'dark', '#030711'],
    ] as const) {
      const rendered = knowledgeGraphContrastSafeColor(source, themeMode);
      expect(rendered).toMatch(/^#[0-9a-f]{6}$/u);
      expect(contrast(rendered, background)).toBeGreaterThanOrEqual(3);
    }
  });

  it('distinguishes pointer clicks from control drags and toggles selection', () => {
    expect(isIntentionalKnowledgeGraphClick(0)).toBe(true);
    expect(isIntentionalKnowledgeGraphClick(2)).toBe(true);
    expect(isIntentionalKnowledgeGraphClick(2.01)).toBe(false);
    expect(isIntentionalKnowledgeGraphClick(Number.NaN)).toBe(false);
    expect(isIntentionalKnowledgeGraphClick(-1)).toBe(false);
    expect(toggledKnowledgeGraphSelection(null, 'node:a')).toBe('node:a');
    expect(toggledKnowledgeGraphSelection('node:a', 'node:a')).toBeNull();
    expect(toggledKnowledgeGraphSelection('node:a', 'node:b')).toBe('node:b');

    const stopPropagation = vi.fn();
    const activate = vi.fn();
    handleKnowledgeGraphNodeClick(true, 0, 1, 9, stopPropagation, activate);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(activate).not.toHaveBeenCalled();
    handleKnowledgeGraphNodeClick(true, 0, 1, 1, stopPropagation, activate);
    expect(stopPropagation).toHaveBeenCalledTimes(2);
    expect(activate).toHaveBeenLastCalledWith(0);
    for (const [ready, instanceId] of [
      [false, 0],
      [true, -1],
      [true, 1],
      [true, undefined],
    ] as const) {
      handleKnowledgeGraphNodeClick(
        ready,
        instanceId,
        1,
        0,
        stopPropagation,
        activate,
      );
    }
    expect(stopPropagation).toHaveBeenCalledTimes(2);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('owns, invalidates, and disposes a focus-label texture exactly once', () => {
    const canvas = makeFocusLabelCanvas();
    const targets = makeFocusLabelTargets();
    const invalidate = vi.fn();
    const cleanup = installFocusLabelResource({
      sprite: targets.sprite,
      material: targets.material,
      label: 'Model A',
      color: '#ffffff',
      themeMode: 'dark',
      invalidate,
      createCanvas: () => canvas.canvas,
      createTexture: () => targets.texture,
    });

    expect(cleanup).toBeTypeOf('function');
    expect(targets.material.map).toBe(targets.texture);
    expect(targets.sprite.visible).toBe(true);
    expect(invalidate).toHaveBeenCalledTimes(1);
    cleanup!();
    expect(targets.material.map).toBeNull();
    expect(targets.sprite.visible).toBe(false);
    expect(targets.dispose).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(2);
    cleanup!();
    expect(targets.dispose).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(2);
    targets.material.dispose();
  });

  it('rolls back and disposes when focus-label setup invalidation throws', () => {
    const canvas = makeFocusLabelCanvas();
    const targets = makeFocusLabelTargets();
    const failure = new Error('host invalidation failed');

    expect(() => installFocusLabelResource({
      sprite: targets.sprite,
      material: targets.material,
      label: 'Model A',
      color: '#ffffff',
      themeMode: 'dark',
      invalidate: () => {
        throw failure;
      },
      createCanvas: () => canvas.canvas,
      createTexture: () => targets.texture,
    })).toThrow(failure);
    expect(targets.material.map).toBeNull();
    expect(targets.sprite.visible).toBe(false);
    expect(targets.dispose).toHaveBeenCalledTimes(1);
    targets.material.dispose();
  });

  it('disposes before propagating a cleanup invalidation failure', () => {
    const canvas = makeFocusLabelCanvas();
    const targets = makeFocusLabelTargets();
    const failure = new Error('cleanup invalidation failed');
    let invalidations = 0;
    const cleanup = installFocusLabelResource({
      sprite: targets.sprite,
      material: targets.material,
      label: 'Model A',
      color: '#ffffff',
      themeMode: 'dark',
      invalidate: () => {
        invalidations += 1;
        if (invalidations === 2) throw failure;
      },
      createCanvas: () => canvas.canvas,
      createTexture: () => targets.texture,
    });

    expect(() => cleanup!()).toThrow(failure);
    expect(targets.material.map).toBeNull();
    expect(targets.sprite.visible).toBe(false);
    expect(targets.dispose).toHaveBeenCalledTimes(1);
    expect(() => cleanup!()).not.toThrow();
    expect(targets.dispose).toHaveBeenCalledTimes(1);
    targets.material.dispose();
  });

  it('cannot let stale focus-label cleanup hide or detach a replacement', () => {
    const canvas = makeFocusLabelCanvas();
    const material = new THREE.SpriteMaterial();
    const sprite = new THREE.Sprite(material);
    const firstTexture = new THREE.Texture();
    const secondTexture = new THREE.Texture();
    const firstDispose = vi.spyOn(firstTexture, 'dispose');
    const secondDispose = vi.spyOn(secondTexture, 'dispose');
    const firstCleanup = installFocusLabelResource({
      sprite,
      material,
      label: 'First',
      color: '#ffffff',
      themeMode: 'dark',
      invalidate: () => {},
      createCanvas: () => canvas.canvas,
      createTexture: () => firstTexture,
    })!;
    const secondCleanup = installFocusLabelResource({
      sprite,
      material,
      label: 'Second',
      color: '#ffffff',
      themeMode: 'dark',
      invalidate: () => {},
      createCanvas: () => canvas.canvas,
      createTexture: () => secondTexture,
    })!;

    firstCleanup();
    expect(firstDispose).toHaveBeenCalledTimes(1);
    expect(material.map).toBe(secondTexture);
    expect(sprite.visible).toBe(true);
    secondCleanup();
    expect(secondDispose).toHaveBeenCalledTimes(1);
    expect(material.map).toBeNull();
    expect(sprite.visible).toBe(false);
    material.dispose();
  });

  it('uses readable theme pairs and survives a rejected caller text color', () => {
    for (const [themeMode, expectedBackground, expectedText] of [
      ['dark', '#030711', '#e2e8f0'],
      ['light', '#f8fafc', '#0f172a'],
    ] as const) {
      const canvas = makeFocusLabelCanvas();
      const targets = makeFocusLabelTargets();
      const cleanup = installFocusLabelResource({
        sprite: targets.sprite,
        material: targets.material,
        label: 'Model A',
        color: 'definitely-not-a-css-color',
        themeMode,
        invalidate: () => {},
        createCanvas: () => canvas.canvas,
        createTexture: () => targets.texture,
      });

      expect(canvas.fillRectStyle()).toBe(expectedBackground);
      expect(canvas.fillTextStyle()).toBe(expectedText);
      cleanup!();
      targets.material.dispose();
    }
  });

  it('deeply detaches every mutable knowledge-graph presentation container', () => {
    const attributes = { aliases: ['A', 'Alpha'] };
    const epistemic = {
      status: 'derived_advisory' as const,
      advisory_only: true as const,
      is_paper_local_evidence: false as const,
      calibrated_posterior: false as const,
    };
    const evidence = [{
      kind: 'external_source' as const,
      evidence_id: 'evidence:1',
      source_id: 'source:1',
      excerpt: 'original excerpt',
    }];
    const score = {
      kind: 'extraction_confidence' as const,
      value: 0.5,
      calibrated_posterior: false as const,
    };
    const nodes = [{
      id: 'a',
      label: 'Model A',
      kind: 'model',
      color: '#ffffff',
      radius: 4,
      attributes,
      epistemic,
      evidence,
      uncalibrated_score: score,
    }];
    const snapshot = prepareGenericGraph(nodes, []);

    attributes.aliases[0] = 'MUTATED';
    epistemic.status = 'derived_advisory';
    evidence[0].excerpt = 'mutated excerpt';
    score.value = 0.9;
    nodes[0].label = 'Mutated label';

    expect(snapshot.nodes[0].label).toBe('Model A');
    expect(snapshot.nodes[0].attributes).toEqual({ aliases: ['A', 'Alpha'] });
    expect(snapshot.nodes[0].attributes?.aliases).not.toBe(attributes.aliases);
    expect(snapshot.nodes[0].epistemic).not.toBe(epistemic);
    expect(snapshot.nodes[0].evidence).not.toBe(evidence);
    expect(snapshot.nodes[0].evidence?.[0]).not.toBe(evidence[0]);
    expect(snapshot.nodes[0].evidence?.[0]).toMatchObject({
      excerpt: 'original excerpt',
    });
    expect(snapshot.nodes[0].uncalibrated_score).not.toBe(score);
    expect(snapshot.nodes[0].uncalibrated_score?.value).toBe(0.5);
  });

  it('fails closed on oversized, sparse, or accessor-backed presentation metadata', () => {
    const node = (metadata: Partial<KnowledgeGraph3DNode>) => [{
      id: 'a',
      label: 'Model A',
      kind: 'model',
      color: '#ffffff',
      radius: 4,
      ...metadata,
    }];
    const tooManyAttributes = Object.fromEntries(
      Array.from(
        { length: KNOWLEDGE_GRAPH_LIMITS.maxAttributes + 1 },
        (_, index) => [`attribute:${index}`, index],
      ),
    );
    expect(() => prepareGenericGraph(
      node({ attributes: tooManyAttributes }),
      [],
    )).toThrow(/at most 24 keys/);
    expect(() => prepareGenericGraph(
      node({
        attributes: {
          values: new Array(KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems + 1).fill(0),
        },
      }),
      [],
    )).toThrow(/at most 16 items/);
    expect(() => prepareGenericGraph(
      node({
        evidence: new Array(KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement + 1).fill({
          kind: 'external_source',
          evidence_id: 'e',
          source_id: 's',
        }),
      }),
      [],
    )).toThrow(/at most 8 items/);

    const attributeGetter = vi.fn(() => 'forbidden');
    const accessorAttributes = Object.defineProperty({}, 'claim', {
      enumerable: true,
      get: attributeGetter,
    });
    expect(() => prepareGenericGraph(
      node({ attributes: accessorAttributes }),
      [],
    )).toThrow(/enumerable data property/);
    expect(attributeGetter).not.toHaveBeenCalled();
    expect(() => prepareGenericGraph(
      node({ attributes: { values: new Array(1) } }),
      [],
    )).toThrow(/dense and contain no extra properties/);

    const evidenceGetter = vi.fn(() => ({
      kind: 'external_source',
      evidence_id: 'e',
      source_id: 's',
    }));
    const accessorEvidence = Object.defineProperty([], '0', {
      enumerable: true,
      configurable: true,
      get: evidenceGetter,
    });
    Object.defineProperty(accessorEvidence, 'length', { value: 1 });
    expect(() => prepareGenericGraph(
      node({ evidence: accessorEvidence }),
      [],
    )).toThrow(/enumerable data elements/);
    expect(evidenceGetter).not.toHaveBeenCalled();
    expect(() => prepareGenericGraph(
      node({ evidence: new Array(1) }),
      [],
    )).toThrow(/dense and contain no extra properties/);
  });

  it('hides and gates stale graph geometry before a throwing host hover callback', () => {
    const ready = { current: 'old-key' as string | null };
    const dirty = { current: false };
    const group = { visible: true };
    const order: string[] = [];
    const failure = new Error('host hover callback failed');

    expect(() => beginKnowledgeGraphRuntimeTransition(
      ready,
      dirty,
      group,
      () => order.push(`invalidate:${String(group.visible)}`),
      () => {
        order.push(`hover:${String(group.visible)}`);
        throw failure;
      },
    )).toThrow(failure);
    expect(ready.current).toBeNull();
    expect(dirty.current).toBe(true);
    expect(group.visible).toBe(false);
    expect(order).toEqual(['invalidate:false', 'hover:false']);
  });

  it('attempts hover cleanup even when graph invalidation throws', () => {
    const ready = { current: 'old-key' as string | null };
    const dirty = { current: false };
    const group = { visible: true };
    const clearHover = vi.fn();
    const failure = new Error('host invalidation failed');

    expect(() => beginKnowledgeGraphRuntimeTransition(
      ready,
      dirty,
      group,
      () => {
        throw failure;
      },
      clearHover,
    )).toThrow(failure);
    expect(clearHover).toHaveBeenCalledTimes(1);
    expect(ready.current).toBeNull();
    expect(dirty.current).toBe(true);
    expect(group.visible).toBe(false);
  });

  it('clears pointer hover while dirty without swallowing another object event', () => {
    const stopPropagation = vi.fn();
    const clearHover = vi.fn();
    handleKnowledgeGraphPointerOut(false, stopPropagation, clearHover);
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(clearHover).toHaveBeenCalledTimes(1);

    handleKnowledgeGraphPointerOut(true, stopPropagation, clearHover);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(clearHover).toHaveBeenCalledTimes(2);
  });

  it('attaches controls listeners only when exact cleanup authority exists', () => {
    const authority = { current: null as null | {
      addEventListener?(type: 'start', listener: () => void): void;
      removeEventListener?(type: 'start', listener: () => void): void;
    } };
    const listener = vi.fn();
    const addOnly = { addEventListener: vi.fn() };
    synchronizeKnowledgeGraphControlsListener(authority, addOnly, listener);
    expect(addOnly.addEventListener).not.toHaveBeenCalled();
    expect(authority.current).toBeNull();

    const first = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const second = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    synchronizeKnowledgeGraphControlsListener(authority, first, listener);
    synchronizeKnowledgeGraphControlsListener(authority, first, listener);
    expect(first.addEventListener).toHaveBeenCalledTimes(1);
    expect(first.removeEventListener).not.toHaveBeenCalled();
    synchronizeKnowledgeGraphControlsListener(authority, second, listener);
    expect(first.removeEventListener).toHaveBeenCalledTimes(1);
    expect(second.addEventListener).toHaveBeenCalledTimes(1);
    synchronizeKnowledgeGraphControlsListener(authority, null, listener);
    expect(second.removeEventListener).toHaveBeenCalledTimes(1);
    expect(authority.current).toBeNull();

    // Strict-effect replay has one removal for every accepted attachment.
    synchronizeKnowledgeGraphControlsListener(authority, first, listener);
    synchronizeKnowledgeGraphControlsListener(authority, null, listener);
    synchronizeKnowledgeGraphControlsListener(authority, first, listener);
    synchronizeKnowledgeGraphControlsListener(authority, null, listener);
    expect(first.addEventListener).toHaveBeenCalledTimes(3);
    expect(first.removeEventListener).toHaveBeenCalledTimes(3);
  });

  it('retains or rolls back controls-listener authority when host methods throw', () => {
    const listener = vi.fn();
    const removalFailure = new Error('remove failed');
    const previous = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(() => {
        throw removalFailure;
      }),
    };
    const replacement = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const authority = { current: previous as typeof previous | typeof replacement | null };
    expect(() => synchronizeKnowledgeGraphControlsListener(
      authority,
      replacement,
      listener,
    )).toThrow(removalFailure);
    expect(authority.current).toBe(previous);
    expect(replacement.addEventListener).not.toHaveBeenCalled();

    const attached = new Set<() => void>();
    const addFailure = new Error('add failed after registration');
    const registerThenThrow = {
      addEventListener: vi.fn((_type: 'start', callback: () => void) => {
        attached.add(callback);
        throw addFailure;
      }),
      removeEventListener: vi.fn((_type: 'start', callback: () => void) => {
        attached.delete(callback);
      }),
    };
    const emptyAuthority = { current: null as typeof registerThenThrow | null };
    expect(() => synchronizeKnowledgeGraphControlsListener(
      emptyAuthority,
      registerThenThrow,
      listener,
    )).toThrow(addFailure);
    expect(registerThenThrow.removeEventListener).toHaveBeenCalledTimes(1);
    expect(attached.size).toBe(0);
    expect(emptyAuthority.current).toBeNull();

    const rollbackFailure = new Error('rollback failed');
    const dualFailure = {
      addEventListener: vi.fn(() => {
        throw addFailure;
      }),
      removeEventListener: vi.fn(() => {
        throw rollbackFailure;
      }),
    };
    const retainedAuthority = { current: null as typeof dualFailure | null };
    expect(() => synchronizeKnowledgeGraphControlsListener(
      retainedAuthority,
      dualFailure,
      listener,
    )).toThrow(AggregateError);
    expect(retainedAuthority.current).toBe(dualFailure);
  });

  it('filterGraphEdges drops dangling endpoints AND self-loops', () => {
    const ids = new Set(['a', 'b']);
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'ghost' }, // dangling
      { source: 'ghost', target: 'b' }, // dangling
      { source: 'a', target: 'a' }, // self-loop
    ];
    expect(filterGraphEdges(ids, edges)).toEqual([{ source: 'a', target: 'b' }]);
  });

  it('deduplicates id-less edges by their effective rendered direction', () => {
    const ids = new Set(['a', 'b']);
    expect(
      filterGraphEdges(ids, [
        { source: 'a', target: 'b', kind: 'same_as', directed: false },
        { source: 'b', target: 'a', kind: 'same_as', directed: false },
      ]),
    ).toHaveLength(1);
    expect(
      filterGraphEdges(ids, [
        { source: 'a', target: 'b', kind: 'same_as' },
        { source: 'b', target: 'a', kind: 'same_as' },
      ]),
    ).toHaveLength(2);
    expect(
      filterGraphEdges(ids, [
        { source: 'a', target: 'b', kind: 'related', directed: false },
        { source: 'b', target: 'a', kind: 'related', directed: false },
      ]),
    ).toHaveLength(1);
  });

  it('preserves identified parallel assertions while retaining legacy tuple dedupe', () => {
    const ids = new Set(['a', 'b']);
    const identified = filterGraphEdges(ids, [
      { id: 'claim-1', source: 'a', target: 'b', kind: 'variant_of' },
      { id: 'claim-2', source: 'a', target: 'b', kind: 'variant_of' },
    ]);
    expect(identified.map(({ id }) => id)).toEqual(['claim-1', 'claim-2']);
    expect(
      filterGraphEdges(ids, [
        { source: 'a', target: 'b', kind: 'variant_of' },
        { source: 'a', target: 'b', kind: 'variant_of' },
      ]),
    ).toHaveLength(1);
  });

  it('assigns centered deterministic lanes independent of edge input order', () => {
    const edges = [
      { id: 'same', source: 'a', target: 'b', kind: 'same_as' },
      { id: 'variant-forward', source: 'a', target: 'b', kind: 'variant_of' },
      { id: 'variant-reverse', source: 'b', target: 'a', kind: 'variant_of' },
    ];
    const offsets = (input: typeof edges) =>
      Object.fromEntries(assignGraphEdgeLanes(input).map(({ edge, laneOffset }) => [
        edge.id,
        laneOffset,
      ]));
    expect(offsets(edges)).toEqual(offsets([...edges].reverse()));
    expect(new Set(Object.values(offsets(edges)))).toEqual(new Set([-1, 0, 1]));
    expect(assignGraphEdgeLanes([edges[0]])[0].laneOffset).toBe(0);
  });

  it('routes every allowed parallel lane distinctly and fails closed above the cap', () => {
    const edges = Array.from({ length: MAX_GRAPH_PARALLEL_EDGES }, (_, index) => ({
      id: `claim-${index}`,
      source: 'a',
      target: 'b',
      kind: 'variant_of',
    }));
    const lanes = assignGraphEdgeLanes(edges);
    expect(new Set(lanes.map(({ laneOffset }) => laneOffset)).size).toBe(edges.length);
    expect(
      Math.max(...lanes.map(({ laneOffset }) => Math.abs(laneOffset))) *
        GRAPH_EDGE_LANE_SPACING,
    ).toBe(MAX_GRAPH_EDGE_LANE_OFFSET);
    expect(() => assignGraphEdgeLanes([
      ...edges,
      { id: 'one-too-many', source: 'a', target: 'b', kind: 'variant_of' },
    ])).toThrow(RangeError);
  });

  it('uses one layout spring per unordered pair regardless of assertion count', () => {
    const edges = [
      { source: 'b', target: 'a' },
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
      { source: 'c', target: 'a' },
    ];
    expect(uniqueGraphTopologyLinks(edges)).toEqual([
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
    ]);
    expect(uniqueGraphTopologyLinks([...edges].reverse())).toEqual(
      uniqueGraphTopologyLinks(edges),
    );
  });

  it('gives parallel and reverse-directed assertions one shared finite curve basis', () => {
    const source = { x: 0, y: 0, z: 0 };
    const target = { x: 10, y: 0, z: 0 };
    const [lower, upper] = assignGraphEdgeLanes([
      { id: 'lower', source: 'a', target: 'b' },
      { id: 'upper', source: 'b', target: 'a' },
    ]);
    const lowerControl = graphEdgeControlPointInto(
      source,
      target,
      lower,
      { x: 0, y: 0, z: 0 },
    );
    const upperControl = graphEdgeControlPointInto(
      target,
      source,
      upper,
      { x: 0, y: 0, z: 0 },
    );
    expect([lowerControl.x, lowerControl.y, lowerControl.z].every(Number.isFinite)).toBe(true);
    expect([upperControl.x, upperControl.y, upperControl.z].every(Number.isFinite)).toBe(true);
    expect(lowerControl).not.toEqual(upperControl);

    const midpoint = graphEdgeCurvePointInto(
      source,
      lowerControl,
      target,
      0.5,
      { x: 0, y: 0, z: 0 },
    );
    expect(midpoint).not.toEqual({ x: 5, y: 0, z: 0 });
    expect(graphEdgeCurvePointInto(
      source,
      lowerControl,
      target,
      0,
      { x: 0, y: 0, z: 0 },
    )).toEqual(source);
    expect(graphEdgeCurvePointInto(
      source,
      lowerControl,
      target,
      1,
      { x: 0, y: 0, z: 0 },
    )).toEqual(target);
  });

  it('places direction-marker tips on the routed target boundary', () => {
    const verify = (
      source: { x: number; y: number; z: number },
      target: { x: number; y: number; z: number },
      laneOffset: number,
      canonicalDirectionSign: 1 | -1,
      radius: number,
    ) => {
      const control = graphEdgeControlPointInto(
        source,
        target,
        { laneOffset, canonicalDirectionSign },
        { x: 0, y: 0, z: 0 },
      );
      const point = { x: 0, y: 0, z: 0 };
      const direction = { x: 0, y: 0, z: 0 };
      expect(graphEdgeTargetBoundaryInto(
        source,
        control,
        target,
        radius,
        point,
        direction,
      )).toBe(true);
      expect(Math.hypot(
        point.x - target.x,
        point.y - target.y,
        point.z - target.z,
      )).toBeCloseTo(radius, 4);
      expect(Math.hypot(direction.x, direction.y, direction.z)).toBeCloseTo(1, 12);
      const towardTarget = (target.x - point.x) * direction.x +
        (target.y - point.y) * direction.y +
        (target.z - point.z) * direction.z;
      expect(towardTarget).toBeGreaterThan(0);
    };
    verify({ x: 0, y: 0, z: 0 }, { x: 34, y: 0, z: 0 }, 4, 1, 10);
    verify({ x: 34, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 4, -1, 10);
    verify({ x: 0, y: 0, z: 0 }, { x: 80, y: 20, z: -10 }, -4, 1, 30);
    expect(graphEdgeTargetBoundaryInto(
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      100,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    )).toBe(false);
  });

  it('buildAdjacency never leaks a dangling (non-node) id into a neighbor set', () => {
    const ids = new Set(['a', 'b']);
    const adj = buildAdjacency(ids, [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'ghost' },
    ]);
    expect([...adj.get('a')!]).toEqual(['b']);
    expect([...adj.get('b')!]).toEqual(['a']);
    expect(adj.has('ghost')).toBe(false);
  });

  it('flowParticleCount caps and never goes negative', () => {
    expect(flowParticleCount(3, 4, 4000)).toBe(12);
    expect(flowParticleCount(5000, 4, 4000)).toBe(4000);
    expect(flowParticleCount(-1, 4, 4000)).toBe(0);
    expect(flowParticleCount(0, 4, 4000)).toBe(0);
  });

  it('keeps the animated flow phase finite, bounded, and resume-safe', () => {
    expect(advanceKnowledgeGraphFlowPhase(0.9, Number.NaN)).toBeCloseTo(0.9);
    expect(advanceKnowledgeGraphFlowPhase(Number.POSITIVE_INFINITY, 0)).toBe(0);
    expect(advanceKnowledgeGraphFlowPhase(-0.1, -1)).toBeCloseTo(0.9);
    const capped = advanceKnowledgeGraphFlowPhase(0, Number.MAX_VALUE);
    expect(capped).toBeCloseTo(
      MAX_KNOWLEDGE_GRAPH_FLOW_FRAME_DELTA_SECONDS *
        KNOWLEDGE_GRAPH_FLOW_CYCLES_PER_SECOND,
    );
    fc.assert(fc.property(
      fc.double({ noNaN: false, noDefaultInfinity: false }),
      fc.double({ noNaN: false, noDefaultInfinity: false }),
      (phase, delta) => {
        const next = advanceKnowledgeGraphFlowPhase(phase, delta);
        expect(Number.isFinite(next)).toBe(true);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(1);
      },
    ));
  });

  it('balances a capped flow-marker budget across every renderable relationship', () => {
    expect(planFlowParticleDistribution(0, 4, 4_000)).toEqual({
      total: 0,
      basePerEdge: 0,
      extraEdgeCount: 0,
    });
    expect(planFlowParticleDistribution(1_001, 4, 4_000)).toEqual({
      total: 4_000,
      basePerEdge: 3,
      extraEdgeCount: 997,
    });
    expect(planFlowParticleDistribution(4_000, 4, 4_000)).toEqual({
      total: 4_000,
      basePerEdge: 1,
      extraEdgeCount: 0,
    });
    expect(() => planFlowParticleDistribution(4_001, 4, 4_000)).toThrow(
      /at least one marker per edge/,
    );
  });

  it('keeps every reduced-motion marker at a finite strictly interior curve parameter', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 4_000 }),
      fc.integer({ min: 0, max: 4_000 }),
      (count, seed) => {
        const index = seed % count;
        const fraction = reducedMotionFlowParticleFraction(index, count);
        expect(Number.isFinite(fraction)).toBe(true);
        expect(fraction).toBeGreaterThan(0);
        expect(fraction).toBeLessThan(1);
      },
    ));
    for (let index = 0; index < 4_000; index++) {
      const fraction = reducedMotionFlowParticleFraction(index, 4_000);
      expect(fraction).toBeGreaterThan(0);
      expect(fraction).toBeLessThan(1);
      if (index > 0) {
        expect(fraction).toBeGreaterThan(
          reducedMotionFlowParticleFraction(index - 1, 4_000),
        );
      }
    }
    expect(() => reducedMotionFlowParticleFraction(0, 0)).toThrow(/positive finite/);
    expect(() => reducedMotionFlowParticleFraction(1, 1)).toThrow(/must belong/);
  });

  it('bounds and normalizes free-text graph queries', () => {
    expect(normalizeGraphQuery('  PAPER  ')).toBe('paper');
    expect(normalizeGraphQuery('X'.repeat(MAX_GRAPH_QUERY_LENGTH + 100))).toHaveLength(
      MAX_GRAPH_QUERY_LENGTH,
    );
    expect(normalizeGraphQuery('\u0130'.repeat(MAX_GRAPH_QUERY_LENGTH))).toHaveLength(
      MAX_GRAPH_QUERY_LENGTH,
    );
    const splitBoundary = `${'x'.repeat(MAX_GRAPH_QUERY_LENGTH - 1)}😀tail`;
    const bounded = normalizeGraphQuery(splitBoundary);
    expect(bounded).toHaveLength(MAX_GRAPH_QUERY_LENGTH - 1);
    expect(bounded).not.toMatch(/[\uD800-\uDFFF]$/u);
  });

  it('uses one query definition for id, label, and kind across visual and DOM surfaces', () => {
    const query = normalizeGraphQuery(' PAPER ');
    expect(matchesGraphQuery('node-1', 'Alpha', 'paper', query)).toBe(true);
    expect(matchesGraphQuery('node-1', 'Paper methods', 'model', query)).toBe(true);
    expect(matchesGraphQuery('paper-model-17', 'Alpha', 'model', query)).toBe(true);
    expect(matchesGraphQuery('node-1', 'Alpha', 'model', query)).toBe(false);

    // Preserve the original direct-consumer label/kind overload.
    expect(matchesGraphQuery('Paper methods', 'model', query)).toBe(true);
  });

  it('builds query-match ids and retains only incident edges for active queries', () => {
    const nodes = [
      { id: 'paper:brunel-2000', label: 'Balanced networks', kind: 'paper' },
      { id: 'model:iaf', label: 'Leaky integrate-and-fire', kind: 'model' },
      { id: 'family:hh', label: 'Hodgkin-Huxley', kind: 'family' },
    ];
    const query = normalizeGraphQuery('paper:brunel');
    const ids = graphQueryMatchIds(nodes, query);
    expect([...ids]).toEqual(['paper:brunel-2000']);
    expect(graphEdgeMatchesQuery('paper:brunel-2000', 'model:iaf', ids, query)).toBe(true);
    expect(graphEdgeMatchesQuery('model:iaf', 'family:hh', ids, query)).toBe(false);
    expect(graphEdgeMatchesQuery('model:iaf', 'family:hh', ids, '')).toBe(true);
  });

  it('matches evidence-shaped node and edge metadata and reveals incident nodes', () => {
    const nodes = [
      {
        id: 'model:a',
        label: 'Model A',
        kind: 'model',
        detail: 'Balanced asynchronous regime',
        attributes: { simulator: 'NEST', resolution_ms: 0.1 },
      },
      { id: 'model:b', label: 'Model B', kind: 'model' },
      { id: 'model:c', label: 'Model C', kind: 'model' },
    ];
    const edges = [{
      id: 'assertion:42',
      source: 'model:a',
      target: 'model:b',
      kind: 'variant_of',
      label: 'Structural match',
      evidence: [{
        kind: 'external_source' as const,
        evidence_id: 'source:e42',
        source_id: 'catalog:engram',
      }],
    }];
    expect([...graphQueryMatchIds(nodes, normalizeGraphQuery('asynchronous'), edges)])
      .toEqual(['model:a']);
    expect([...graphQueryMatchIds(nodes, normalizeGraphQuery('NEST'), edges)])
      .toEqual(['model:a']);
    expect([...graphQueryMatchIds(nodes, normalizeGraphQuery('Structural match'), edges)])
      .toEqual(['model:a', 'model:b']);
    expect([...graphQueryMatchIds(nodes, normalizeGraphQuery('source:e42'), edges)])
      .toEqual(['model:a', 'model:b']);
    expect([...graphQueryMatchIds(nodes, normalizeGraphQuery('assertion:42'), edges)])
      .toEqual(['model:a', 'model:b']);
  });

  it('fails closed on duplicate node ids through one shared assertion', () => {
    const duplicateNodes = [{ id: 'same' }, { id: 'same' }];
    expect(() => assertUniqueGraphNodeIds([{ id: 'a' }, { id: 'b' }])).not.toThrow();
    expect(() => assertUniqueGraphNodeIds(duplicateNodes)).toThrow(/duplicated at index 1/);

    const sceneNodes = duplicateNodes.map((node) => ({
      ...node,
      label: node.id,
      kind: 'paper',
      color: '#ffffff',
      radius: 4,
    }));
    const props = {
      graphIdentity: 'graph:test:snapshot:test',
      nodes: sceneNodes,
      edges: [],
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    // Both public React surfaces reject before ambiguous selection/edge binding.
    expect(() => withPreparedPresentation(props)).toThrow(
      /duplicated at index 1/,
    );
    expect(() => withPreparedPresentation(props)).toThrow(
      /duplicated at index 1/,
    );
  });

  it('rejects an absent or unbounded graph cache namespace before scene hooks run', () => {
    const props = {
      graphIdentity: '',
      nodes: [],
      edges: [],
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    expect(() => withPreparedPresentation(props)).toThrow(
      /non-empty display-safe string <= 1024/,
    );
    expect(() => withPreparedPresentation(props)).toThrow(
      /non-empty display-safe string <= 1024/,
    );
    expect(() => withPreparedPresentation({
      ...props,
      graphIdentity: 'g'.repeat(1_025),
    })).toThrow(/non-empty display-safe string <= 1024/);
    expect(() => withPreparedPresentation({
      ...props,
      graphIdentity: 'g'.repeat(1_025),
    })).toThrow(/non-empty display-safe string <= 1024/);
  });

  it('keys the scene-owned lifecycle boundary by the declared graph namespace', () => {
    const props = {
      graphIdentity: 'graph:one',
      nodes: [],
      edges: [],
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    const first = KnowledgeGraph3DScene(withPreparedPresentation(props));
    const same = KnowledgeGraph3DScene(withPreparedPresentation({ ...props }));
    const other = KnowledgeGraph3DScene(withPreparedPresentation({
      ...props,
      graphIdentity: 'graph:two',
    }));
    expect(first.key).toBe('graph:one');
    expect(same.key).toBe(first.key);
    expect(other.key).toBe('graph:two');
    expect(other.type).toBe(first.type);

    const a11yFirst = KnowledgeGraphA11yList(withPreparedPresentation({
      graphIdentity: 'graph:one',
      nodes: [],
      edges: [],
      selectedId: null,
      onSelect: () => {},
    }));
    const a11yOther = KnowledgeGraphA11yList(withPreparedPresentation({
      graphIdentity: 'graph:two',
      nodes: [],
      edges: [],
      selectedId: null,
      onSelect: () => {},
    }));
    expect(a11yFirst.key).toBe('graph:one');
    expect(a11yOther.key).toBe('graph:two');
  });

  it('retains accessible paging for same-key views and resets it for a new namespace', async () => {
    const nodes = Array.from({ length: 201 }, (_, index) => ({
      id: `node:${index}`,
      label: `Node ${index}`,
      kind: 'model',
      color: '#ffffff',
      radius: 4,
    }));
    const props = {
      graphIdentity: 'graph:one',
      nodes,
      edges: [],
      selectedId: null,
      onSelect: () => {},
    };
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation(props),
      ));
    });
    const next = () => renderer.root.findAllByType('button').find(
      (button) => button.children.join('') === 'Next nodes',
    )!;
    const nodePageText = () => renderer.root.findByProps({
      'aria-live': 'polite',
    }).children.join('');
    await act(async () => next().props.onClick());
    expect(nodePageText()).toContain('Node page 2 of 9');
    await act(async () => {
      renderer.update(createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation({ ...props }),
      ));
    });
    expect(nodePageText()).toContain('Node page 2 of 9');
    await act(async () => {
      renderer.update(createElement(KnowledgeGraphA11yList, withPreparedPresentation({
        ...props,
        graphIdentity: 'graph:two',
      })));
    });
    expect(nodePageText()).toContain('Node page 1 of 9');
  });

  it('fails closed on unrenderable direct edges before either React surface runs hooks', () => {
    const nodes = [
      { id: 'a', label: 'A', kind: 'model', color: '#fff', radius: 4 },
      { id: 'b', label: 'B', kind: 'model', color: '#fff', radius: 4 },
    ];
    expect(() => assertRenderableGraphEdges(nodes, [
      { id: 'claim-1', source: 'a', target: 'b', kind: 'variant_of' },
      { id: 'claim-2', source: 'a', target: 'b', kind: 'variant_of' },
    ])).not.toThrow();
    expect(() => assertRenderableGraphEdges(nodes, [
      { source: 'a', target: 'ghost', kind: 'variant_of' },
    ])).toThrow(/missing endpoint/);
    expect(() => assertRenderableGraphEdges(nodes, [
      { source: 'a', target: 'a', kind: 'variant_of' },
    ])).toThrow(/self-loop/);
    expect(() => assertRenderableGraphEdges(nodes, [
      { source: 'a', target: 'b', kind: 'same_as', directed: false },
      { source: 'b', target: 'a', kind: 'same_as', directed: false },
    ])).toThrow(/relationship is duplicated/);
    expect(() => assertRenderableGraphEdges(nodes, [
      { source: 'a', target: 'b', kind: 'same_as' },
      { source: 'b', target: 'a', kind: 'same_as' },
    ])).not.toThrow();
    expect(() => assertRenderableGraphEdges(nodes, [
      { source: 'a', target: 'b', kind: 'related', directed: false },
      { source: 'b', target: 'a', kind: 'related', directed: false },
    ])).toThrow(/relationship is duplicated/);
    expect(() => assertRenderableGraphEdges(nodes, [
      { id: 'claim', source: 'a', target: 'b', kind: 'same_as' },
      { id: 'claim', source: 'b', target: 'a', kind: 'same_as' },
    ])).toThrow(/id is duplicated/);
    expect(() => assertRenderableGraphEdges(nodes, [
      {
        source: 'a',
        target: 'b',
        kind: 'related',
        directed: false,
        particles: true,
      },
    ])).toThrow(/undirected but carries directional particles/);

    const invalidEdges = [
      { source: 'a', target: 'ghost', kind: 'variant_of', color: '#fff' },
    ];
    const props = {
      graphIdentity: 'graph:test:snapshot:test',
      nodes,
      edges: invalidEdges,
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    };
    expect(() => withPreparedPresentation(props)).toThrow(
      /missing endpoint/,
    );
    expect(() => withPreparedPresentation(props)).toThrow(
      /missing endpoint/,
    );
    const directionalMismatch = {
      ...props,
      edges: [{
        source: 'a',
        target: 'b',
        kind: 'related',
        color: '#fff',
        directed: false,
        particles: true,
      }],
    };
    expect(() =>
      withPreparedPresentation(directionalMismatch),
    ).toThrow(/undirected but carries directional particles/);
    expect(() =>
      withPreparedPresentation(directionalMismatch),
    ).toThrow(/undirected but carries directional particles/);
  });

  it('keeps a selected nonmatching node in the accessible query result', () => {
    const nodes = [
      { id: 'paper:a', label: 'Matching paper', kind: 'paper', color: '#fff', radius: 4 },
      { id: 'model:selected', label: 'Selected model', kind: 'model', color: '#fff', radius: 4 },
    ];
    const html = renderToStaticMarkup(createElement(
      KnowledgeGraphA11yList,
      withPreparedPresentation({
      graphIdentity: 'graph:test',
      nodes,
      edges: [],
      selectedId: 'model:selected',
      query: 'no node matches this',
      onSelect: () => {},
      }),
    ));
    expect(html).toContain('Selected model');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Matching paper');
    expect(html).toContain('all nodes remain available below');
    expect(html).not.toContain('No graph nodes match this view');
  });

  it('jumps to remote query matches and lets either surface clear selection', async () => {
    const onSelect = vi.fn();
    const nodes = Array.from({ length: 100 }, (_, index) => ({
      id: `node:${index}`,
      label: index === 77 || index === 99 ? `Needle ${index}` : `Node ${index}`,
      kind: 'model',
      color: '#fff',
      radius: 4,
    }));
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation({
          graphIdentity: 'graph:query-navigation',
          nodes,
          edges: [],
          selectedId: null,
          query: 'needle',
          nodePageSize: 10,
          onSelect,
        }),
      ));
    });
    const liveText = () => renderer.root.findAllByProps({
      'aria-live': 'polite',
    }).map((node) => node.children.join(''));
    expect(liveText()).toContain('Node page 8 of 10; 100 nodes');
    expect(liveText()).toContain('Query match 1 of 2: Needle 77. Node id node:77.');
    const nextMatch = renderer.root.findAllByType('button').find(
      (button) => button.children.join('') === 'Next query match',
    )!;
    await act(async () => nextMatch.props.onClick());
    expect(liveText()).toContain('Node page 10 of 10; 100 nodes');
    expect(liveText()).toContain('Query match 2 of 2: Needle 99. Node id node:99.');

    const lastNode = renderer.root.findAllByProps({
      className: 'cortexel-knowledge-graph-node',
    }).find((button) => button.children.join('') === 'Needle 99')!;
    await act(async () => lastNode.props.onClick());
    expect(onSelect).toHaveBeenLastCalledWith('node:99');
    await act(async () => {
      renderer.update(createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation({
          graphIdentity: 'graph:query-navigation',
          nodes,
          edges: [],
          selectedId: 'node:99',
          query: 'needle',
          nodePageSize: 10,
          onSelect,
        }),
      ));
    });
    const selected = renderer.root.findAllByProps({
      className: 'cortexel-knowledge-graph-node',
    }).find((button) => button.children.join('') === 'Needle 99')!;
    await act(async () => selected.props.onClick());
    expect(onSelect).toHaveBeenLastCalledWith(null);
    await act(async () => renderer.unmount());
  });

  it('binds query cursor, page, aria-current, and explicit keyboard focus atomically', async () => {
    const focus = vi.fn();
    const nodes = Array.from({ length: 12 }, (_, index) => ({
      id: `node:${index}`,
      label: index === 1 || index === 2
        ? `Needle ${index}`
        : index === 11
          ? 'Remote needle'
          : `Node ${index}`,
      kind: 'model',
      color: '#fff',
      radius: 4,
    }));
    const props = {
      graphIdentity: 'graph:query-focus',
      nodes,
      edges: [],
      selectedId: 'node:2',
      query: 'needle',
      nodePageSize: 10,
      onSelect: () => {},
    };
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        createElement(KnowledgeGraphA11yList, withPreparedPresentation(props)),
        {
          createNodeMock: (element) => element.type === 'button' ? { focus } : {},
        },
      );
    });
    const liveText = () => renderer.root.findAllByProps({
      'aria-live': 'polite',
    }).map((node) => node.children.join(''));
    const currentMatch = () => renderer.root.findAllByProps({
      className: 'cortexel-knowledge-graph-node',
    }).find((button) => button.props['aria-current'] === 'true');
    const navButton = (label: string) => renderer.root.findAllByType('button').find(
      (button) => button.children.join('') === label,
    )!;

    expect(liveText()).toContain('Query match 2 of 3: Needle 2. Node id node:2.');
    expect(liveText()).toContain('Node page 1 of 2; 12 nodes');
    expect(currentMatch()?.children.join('')).toBe('Needle 2');
    expect(focus).not.toHaveBeenCalled();

    await act(async () => navButton('Previous query match').props.onClick());
    expect(liveText()).toContain('Query match 1 of 3: Needle 1. Node id node:1.');
    expect(currentMatch()?.children.join('')).toBe('Needle 1');
    expect(focus).toHaveBeenCalledTimes(1);

    await act(async () => navButton('Next query match').props.onClick());
    await act(async () => navButton('Next query match').props.onClick());
    expect(liveText()).toContain(
      'Query match 3 of 3: Remote needle. Node id node:11.',
    );
    expect(liveText()).toContain('Node page 2 of 2; 12 nodes');
    expect(currentMatch()?.children.join('')).toBe('Remote needle');
    expect(focus).toHaveBeenCalledTimes(3);

    await act(async () => {
      renderer.update(createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation({ ...props, query: 'remote' }),
      ));
    });
    expect(liveText()).toContain(
      'Query match 1 of 1: Remote needle. Node id node:11.',
    );
    expect(currentMatch()?.children.join('')).toBe('Remote needle');
    // Query/data changes retarget semantics without stealing focus from the
    // control the user is currently operating.
    expect(focus).toHaveBeenCalledTimes(3);
    await act(async () => renderer.unmount());
  });

  it('does not announce an off-page query match after manual node paging', async () => {
    const nodes = Array.from({ length: 30 }, (_, index) => ({
      id: `node:${index}`,
      label: index === 1 || index === 25 ? `Needle ${index}` : `Node ${index}`,
      kind: 'model',
      color: '#fff',
      radius: 4,
    }));
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation({
          graphIdentity: 'graph:manual-query-page',
          nodes,
          edges: [],
          selectedId: null,
          query: 'needle',
          nodePageSize: 10,
          onSelect: () => {},
        }),
      ));
    });
    const liveText = () => renderer.root.findAllByProps({
      'aria-live': 'polite',
    }).map((node) => node.children.join(''));
    const currentMatch = () => renderer.root.findAllByProps({
      className: 'cortexel-knowledge-graph-node',
    }).find((button) => button.props['aria-current'] === 'true');
    const nextPage = () => renderer.root.findAllByType('button').find(
      (button) => button.children.join('') === 'Next nodes',
    )!;

    expect(currentMatch()?.children.join('')).toBe('Needle 1');
    await act(async () => nextPage().props.onClick());
    expect(liveText()).toContain(
      'Node page 2 has no current query match; use the query-match controls to navigate to one.',
    );
    expect(currentMatch()).toBeUndefined();

    await act(async () => nextPage().props.onClick());
    expect(liveText()).toContain('Query match 2 of 2: Needle 25. Node id node:25.');
    expect(currentMatch()?.children.join('')).toBe('Needle 25');
    await act(async () => renderer.unmount());
  });

  it('keeps a one-match query recoverable after manual paging moves it off-page', async () => {
    const focus = vi.fn();
    const nodes = Array.from({ length: 20 }, (_, index) => ({
      id: `node:${index}`,
      label: index === 1 ? 'Only needle' : `Node ${index}`,
      kind: 'model',
      color: '#fff',
      radius: 4,
    }));
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation({
          graphIdentity: 'graph:one-query-match',
          nodes,
          edges: [],
          selectedId: null,
          query: 'needle',
          nodePageSize: 10,
          onSelect: () => {},
        }),
      ), {
        createNodeMock: (element) => element.type === 'button' ? { focus } : {},
      });
    });
    const button = (label: string) => renderer.root.findAllByType('button').find(
      (candidate) => candidate.children.join('') === label,
    );
    await act(async () => button('Next nodes')!.props.onClick());
    expect(button('Previous query match')!.props.disabled).toBe(true);
    expect(button('Next query match')!.props.disabled).toBe(true);
    expect(button('Go to current query match')!.props.disabled).not.toBe(true);
    await act(async () => button('Go to current query match')!.props.onClick());
    expect(renderer.root.findAllByProps({
      className: 'cortexel-knowledge-graph-node',
    }).find((candidate) => candidate.props['aria-current'] === 'true')
      ?.children.join('')).toBe('Only needle');
    expect(focus).toHaveBeenCalledTimes(1);
    expect(button('Go to current query match')).toBeUndefined();
    await act(async () => renderer.unmount());
  });

  it('puts stable node ids in accessible descriptions when labels collide', () => {
    const html = renderToStaticMarkup(createElement(
      KnowledgeGraphA11yList,
      withPreparedPresentation({
      graphIdentity: 'graph:test',
      nodes: [
        { id: 'model:a', label: 'Same label', kind: 'model', color: '#fff', radius: 4 },
        { id: 'model:b', label: 'Same label', kind: 'model', color: '#fff', radius: 4 },
      ],
      edges: [],
      selectedId: null,
      onSelect: () => {},
      }),
    ));
    expect(html.match(/aria-describedby=/g)).toHaveLength(2);
    expect(html.match(/>Same label<\/button>/g)).toHaveLength(2);
    expect(html).toContain('model. Node id model:a.');
    expect(html).toContain('model. Node id model:b.');
  });

  it('puts the other endpoint id in relationship prose when labels collide', () => {
    const html = renderToStaticMarkup(createElement(
      KnowledgeGraphA11yList,
      withPreparedPresentation({
      graphIdentity: 'graph:test',
      nodes: [
        { id: 'hub', label: 'Hub', kind: 'model', color: '#fff', radius: 4 },
        { id: 'model:a', label: 'Same label', kind: 'model', color: '#fff', radius: 4 },
        { id: 'model:b', label: 'Same label', kind: 'model', color: '#fff', radius: 4 },
      ],
      edges: [
        { id: 'edge:a', source: 'hub', target: 'model:a', kind: 'variant_of', color: '#f08' },
        { id: 'edge:b', source: 'hub', target: 'model:b', kind: 'variant_of', color: '#f08' },
      ],
      selectedId: 'hub',
      onSelect: () => {},
      }),
    ));
    expect(html).toContain(
      'variant_of [edge:a]: points to Same label (node id model:a)',
    );
    expect(html).toContain(
      'variant_of [edge:b]: points to Same label (node id model:b)',
    );
  });

  it('keeps discarded layout plans deeply detached from persistent position authority', () => {
    const cached = Object.freeze([11, 12, 13] as const);
    const remembered = new Map<string, readonly [number, number, number]>([
      ['cached', cached],
      ['old:1', Object.freeze([1, 2, 3] as const)],
      ['old:2', Object.freeze([4, 5, 6] as const)],
      ['old:3', Object.freeze([7, 8, 9] as const)],
    ]);
    const before = [...remembered.entries()];
    const discarded = planGraphLayoutCache(
      [
        { id: 'cached', radius: 7 },
        { id: 'new', radius: Number.NaN },
      ],
      remembered,
      3,
    );

    expect(discarded.warmStart).toBe(true);
    expect(discarded.nodes[0]).toMatchObject({
      id: 'cached',
      r: 7,
      x: 11,
      y: 12,
      z: 13,
    });
    expect(discarded.nodes[1]).toEqual({
      id: 'new',
      r: normalizeGraphNodeRadius(Number.NaN),
    });
    expect(Object.hasOwn(discarded.nodes[1], 'x')).toBe(false);
    const firstBuffer = discarded.cacheBuffers[0];
    const secondBuffer = discarded.cacheBuffers[1];
    expect(firstBuffer.positionSlots[0]).toEqual(cached);
    expect(firstBuffer.positionSlots[0]).not.toBe(cached);
    expect(firstBuffer.positionSlots[0]).not.toBe(secondBuffer.positionSlots[0]);
    expect([...firstBuffer.cache.keys()]).toEqual(['old:3', 'cached', 'new']);
    expect([...secondBuffer.cache.keys()]).toEqual(['old:3', 'cached', 'new']);

    // Even hostile post-plan mutation cannot reach a remembered tuple. This is
    // the render-abort negative control: discarding the plan has no authority.
    discarded.nodes[0].x = 999;
    firstBuffer.positionSlots[0][0] = 999;
    firstBuffer.positionSlots[1][0] = 999;
    firstBuffer.cache.get('cached')![0] = 777;
    firstBuffer.cache.delete('old:3');
    expect([...remembered.entries()]).toEqual(before);
    expect(remembered.has('new')).toBe(false);
    expect(secondBuffer.cache.get('cached')).toEqual(cached);

    const retry = planGraphLayoutCache(
      [{ id: 'new', radius: 4 }],
      remembered,
      3,
    );
    const replay = planGraphLayoutCache(
      [{ id: 'new', radius: 4 }],
      remembered,
      3,
    );
    expect(retry.warmStart).toBe(false);
    expect(Object.hasOwn(retry.nodes[0], 'x')).toBe(false);
    expect(replay.nodes[0]).not.toBe(retry.nodes[0]);
    expect(replay.cacheBuffers[0].positionSlots[0])
      .not.toBe(retry.cacheBuffers[0].positionSlots[0]);

    const exactlyFull = new Map<string, readonly [number, number, number]>([
      ['inactive:1', [1, 1, 1]],
      ['inactive:2', [2, 2, 2]],
    ]);
    expect(planGraphLayoutCache(
      [{ id: 'new', radius: 4 }],
      exactlyFull,
      2,
    ).cacheBuffers[0].cache).toEqual(new Map([
      ['inactive:2', [2, 2, 2]],
      ['new', [0, 0, 0]],
    ]));
  });

  it('snapshots same-identity caller mutations before deriving the layout key', () => {
    const nodes = [{ id: 'a', radius: 4 }];
    const edges = [{
      id: 'edge:1',
      source: 'a',
      target: 'a',
      color: '#ffffff',
      kind: 'same_as',
      directed: false,
      particles: false,
    }];
    const first = snapshotGraphLayoutInputs(nodes, edges);
    nodes[0].id = 'b';
    nodes[0].radius = 8;
    edges[0].source = 'b';
    edges[0].target = 'b';
    edges[0].color = '#000000';
    const second = snapshotGraphLayoutInputs(nodes, edges);

    expect(second.graphKey).not.toBe(first.graphKey);
    expect(first.nodes).toEqual([{ id: 'a', radius: 4 }]);
    expect(first.edges[0]).toMatchObject({
      source: 'a',
      target: 'a',
      color: '#ffffff',
    });
    expect(second.nodes).toEqual([{ id: 'b', radius: 8 }]);
    expect(second.edges[0]).toMatchObject({
      source: 'b',
      target: 'b',
      color: '#000000',
    });
    expect(first.nodes[0]).not.toBe(second.nodes[0]);
    expect(first.edges[0]).not.toBe(second.edges[0]);
  });

  it('publishes a complete layout cache only after the frame transaction succeeds', () => {
    const original = new Map<string, [number, number, number]>([
      ['old', [1, 2, 3]],
    ]);
    const authority = { current: original };
    const plan = planGraphLayoutCache(
      [{ id: 'new', radius: 4 }],
      original,
      1,
    );
    const buffered = {
      cacheBuffers: plan.cacheBuffers,
      nextCacheBufferIndex: 0 as const,
    };
    const originalSlot = original.get('old');

    expect(() => {
      plan.cacheBuffers[0].positionSlots[0][0] = 42;
      throw new Error('simulated CPU matrix failure before publication');
    }).toThrow('simulated CPU matrix failure before publication');
    expect(authority.current).toBe(original);
    expect(authority.current).toEqual(new Map([['old', [1, 2, 3]]]));
    expect(authority.current.get('old')).toBe(originalSlot);
    expect(buffered.nextCacheBufferIndex).toBe(0);

    publishGraphLayoutCache(authority, buffered, 0);
    expect(authority.current).toBe(plan.cacheBuffers[0].cache);
    expect(authority.current).toEqual(new Map([['new', [42, 0, 0]]]));
    expect(buffered.nextCacheBufferIndex).toBe(1);

    // A later-frame failure mutates only the other, unpublished buffer. Neither
    // the published Map identity nor any tuple reachable from it can change.
    const firstPublished = authority.current;
    const firstPublishedSlot = authority.current.get('new');
    expect(() => {
      plan.cacheBuffers[1].positionSlots[0][0] = 84;
      throw new Error('simulated later CPU buffer failure before publication');
    }).toThrow('simulated later CPU buffer failure before publication');
    expect(authority.current).toBe(firstPublished);
    expect(authority.current.get('new')).toBe(firstPublishedSlot);
    expect(authority.current).toEqual(new Map([['new', [42, 0, 0]]]));

    publishGraphLayoutCache(authority, buffered, 1);
    expect(authority.current).toBe(plan.cacheBuffers[1].cache);
    expect(authority.current).toEqual(new Map([['new', [84, 0, 0]]]));
    expect(buffered.nextCacheBufferIndex).toBe(0);

    // A repeated or stale publication fails before replacing newer authority.
    const published = authority.current;
    expect(() => publishGraphLayoutCache(authority, buffered, 1))
      .toThrow('publication is out of sequence');
    expect(authority.current).toBe(published);
  });

  it('refuses an undersized cache or duplicate active ids before planning', () => {
    expect(() => planGraphLayoutCache(
      [{ id: 'a', radius: 4 }],
      new Map(),
      0,
    )).toThrow('at least as large as the active graph');
    expect(() => planGraphLayoutCache(
      [{ id: 'a', radius: 4 }, { id: 'a', radius: 4 }],
      new Map(),
      2,
    )).toThrow('node ids must be unique');
  });

  it('schedules at most one 60-Hz tick per frame without suspended-tab backlog', () => {
    const elapsedByRate: number[] = [];
    for (const refreshRate of [30, 60, 144]) {
      let elapsed = 0;
      let remainder = 0;
      let ticks = 0;
      while (ticks < 266) {
        const delta = 1 / refreshRate;
        const next = advanceGraphLayoutClock(remainder, delta);
        remainder = next.remainderSeconds;
        ticks += Math.min(next.ticks, 266 - ticks);
        elapsed += delta;
      }
      elapsedByRate.push(elapsed);
    }
    expect(elapsedByRate[0]).toBeCloseTo(266 / 30, 1);
    expect(elapsedByRate[1]).toBeCloseTo(266 / 60, 1);
    expect(elapsedByRate[2]).toBeCloseTo(266 / 60, 1);
    for (const delta of [
      Number.NaN,
      Number.NEGATIVE_INFINITY,
      -1,
      0,
      1 / 144,
      1 / 60,
      1 / 30,
      Number.MAX_VALUE,
    ]) {
      const next = advanceGraphLayoutClock(0, delta);
      expect(next.ticks).toBeGreaterThanOrEqual(0);
      expect(next.ticks).toBeLessThanOrEqual(1);
      expect(next.remainderSeconds).toBeGreaterThanOrEqual(0);
      expect(next.remainderSeconds).toBeLessThan(GRAPH_LAYOUT_TICK_SECONDS);
    }
    const resumed = advanceGraphLayoutClock(0, Number.MAX_VALUE);
    expect(resumed).toEqual({ ticks: 1, remainderSeconds: 0 });
    expect(advanceGraphLayoutClock(resumed.remainderSeconds, 0)).toEqual({
      ticks: 0,
      remainderSeconds: 0,
    });
  });

  it('mutates and reuses the supplied layout-clock result object', () => {
    const out = { ticks: -1, remainderSeconds: -1 };
    const first = advanceGraphLayoutClockInto(0, 1 / 30, out);
    expect(first).toBe(out);
    expect(first).toEqual(advanceGraphLayoutClock(0, 1 / 30));
    const second = advanceGraphLayoutClockInto(first.remainderSeconds, 1 / 144, out);
    expect(second).toBe(out);
  });

  it('avoids redundant static-particle uploads under reduced motion', () => {
    const source = readFileSync(
      new URL('../react/KnowledgeGraph3DScene.tsx', import.meta.url),
      'utf8',
    );
    expect(source).toContain('(positionsChanged || !reducedMotion)');
    expect(source).toContain('advanceGraphLayoutClockInto(');
    expect(source).toContain('_layoutClockResult');
    expect(source.match(/visibleLineSegmentCount \* 6/g)).toHaveLength(2);
    expect(source).toContain('if (chordVisible)');
    expect(source).not.toContain('const chordEnd =');
    expect(source.match(/setUsage\(THREE\.DynamicDrawUsage\)/g)).toHaveLength(7);
    expect(source).toContain('focus === null && !queryActive ? 0');
    // One definition plus the line, arrowhead, and particle call sites: all
    // three visual encodings must consume the same routed quadratic.
    expect(source.match(/setEdgeCurve\(/g)).toHaveLength(4);
    expect(source.match(/graphEdgeCurvePointInto\(/g)).toHaveLength(2);
    expect(source).toContain('uniqueGraphTopologyLinks(validEdges)');
    expect(GRAPH_EDGE_CURVE_SEGMENTS).toBe(12);
    // Lines, arrowheads, and flow particles must all consume the same pure edge
    // query predicate; otherwise a dimmed relationship can keep glowing/moving.
    expect(source.match(/graphEdgeMatchesQuery\(/g)).toHaveLength(3);
  });

  it('gives the relationship disclosure summary a touch-sized target', () => {
    const nodes = [
      { id: 'hub', label: 'Hub', kind: 'paper', color: '#fff', radius: 4 },
      ...Array.from({ length: 9 }, (_, index) => ({
        id: `paper:${index}`,
        label: `Paper ${index}`,
        kind: 'paper',
        color: '#fff',
        radius: 4,
      })),
    ];
    const edges = nodes.slice(1).map((node) => ({
      source: 'hub',
      target: node.id,
      kind: 'cites',
      color: '#fff',
      directed: true,
    }));
    const html = renderToStaticMarkup(createElement(
      KnowledgeGraphA11yList,
      withPreparedPresentation({
      graphIdentity: 'graph:test',
      nodes,
      edges,
      selectedId: 'hub',
      onSelect: () => {},
      }),
    ));
    expect(html).toContain('<summary style="min-height:44px">');
    expect(html).toContain('Browse all 9 relationships');
  });

  it('never exposes an out-of-range relationship page when a live view shrinks', async () => {
    const nodes = [
      { id: 'hub', label: 'Hub', kind: 'paper', color: '#fff', radius: 4 },
      ...Array.from({ length: 30 }, (_, index) => ({
        id: `paper:${index}`,
        label: `Paper ${index}`,
        kind: 'paper',
        color: '#fff',
        radius: 4,
      })),
    ];
    const edges = nodes.slice(1).map((node, index) => ({
      id: `citation:${index}`,
      source: 'hub',
      target: node.id,
      kind: 'cites',
      color: '#fff',
      directed: true,
    }));
    const props = {
      graphIdentity: 'graph:test',
      nodes,
      edges,
      selectedId: 'hub',
      onSelect: () => {},
    };
    let renderer!: ReturnType<typeof create>;
    let captureCommit = false;
    const committedTrees: string[] = [];
    const committedPageTexts: string[] = [];
    const pageText = () => renderer.root.findAllByProps({
      'aria-live': 'polite',
    }).map((node) => node.children.join('')).find((text) => text.startsWith('Page '))!;
    const tree = (nextEdges: typeof edges) => createElement(
      Profiler,
      {
        id: 'relationship-pager',
        onRender: () => {
          if (captureCommit && renderer) {
            committedTrees.push(JSON.stringify(renderer.toJSON()));
            committedPageTexts.push(pageText());
          }
        },
      },
      createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation({ ...props, edges: nextEdges }),
      ),
    );
    await act(async () => {
      renderer = create(tree(edges));
    });
    const next = renderer.root.findAllByType('button').find(
      (button) => button.children.join('') === 'Next relationships',
    )!;
    await act(async () => next.props.onClick());
    expect(pageText()).toBe('Page 2 of 4');
    await act(async () => {
      renderer.update(tree(edges.map((edge) => ({ ...edge }))));
    });
    expect(pageText()).toBe('Page 2 of 4');
    captureCommit = true;
    await act(async () => {
      renderer.update(tree(edges.slice(0, 2)));
    });
    captureCommit = false;
    expect(committedTrees.length).toBeGreaterThan(0);
    // Profiler fires after the commit but before passive effects. The first tree
    // therefore proves render-time clamping rather than the post-commit state clamp.
    expect(committedPageTexts[0]).toBe('Page 1 of 1');
    expect(committedTrees[0]).toContain('citation:0');
    expect(committedTrees[0]).toContain('citation:1');
    expect(pageText()).toBe('Page 1 of 1');
    expect(JSON.stringify(renderer.toJSON())).toContain('citation:0');
    expect(JSON.stringify(renderer.toJSON())).toContain('citation:1');
    await act(async () => {
      renderer.update(tree(edges));
    });
    expect(pageText()).toBe('Page 1 of 4');
    await act(async () => renderer.unmount());
  });

  it('refreshes accessible relationships and legend groups after same-array mutation', async () => {
    const nodes = [
      { id: 'a', label: 'Model A', kind: 'model', color: '#ffffff', radius: 4 },
      { id: 'b', label: 'Model B', kind: 'model', color: '#ffffff', radius: 4 },
      { id: 'c', label: 'Model C', kind: 'model', color: '#ffffff', radius: 4 },
    ];
    const edges = [{
      id: 'claim:1',
      source: 'a',
      target: 'b',
      kind: 'cites',
      color: '#00ffff',
      directed: true,
    }];
    const a11yProps = {
      graphIdentity: 'graph:mutable',
      nodes,
      edges,
      selectedId: 'a',
      onSelect: () => {},
    };
    let a11y!: ReturnType<typeof create>;
    let legend!: ReturnType<typeof create>;
    await act(async () => {
      a11y = create(createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation(a11yProps),
      ));
      legend = create(createElement(
        KnowledgeGraphLegend,
        withPreparedPresentation({ graphIdentity: 'graph:mutable', nodes, edges }),
      ));
    });
    expect(testRendererText(a11y.toJSON())).toContain('points to Model B');
    expect(testRendererText(legend.toJSON())).toContain('cites: 1 relationship; directed');

    // Reuse both arrays and records, as an untyped mutable host might.
    edges[0].target = 'c';
    edges[0].kind = 'variant_of';
    edges[0].directed = false;
    nodes[0].kind = 'family';
    nodes[0].color = '#ff00ff';
    await act(async () => {
      a11y.update(createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation(a11yProps),
      ));
      legend.update(createElement(
        KnowledgeGraphLegend,
        withPreparedPresentation({ graphIdentity: 'graph:mutable', nodes, edges }),
      ));
    });

    const accessibleText = testRendererText(a11y.toJSON());
    const legendText = testRendererText(legend.toJSON());
    expect(accessibleText).toContain('connected to Model C');
    expect(accessibleText).not.toContain('points to Model B');
    expect(legendText).toContain(
      'family: 1 node; source color #ff00ff; intended undimmed scene color #ff00ff; ' +
      'glyph outlined sphere',
    );
    expect(legendText).toContain('variant_of: 1 relationship; undirected');
    expect(legendText).not.toContain('cites: 1 relationship; directed');
    await act(async () => {
      a11y.unmount();
      legend.unmount();
    });
  });

  it('keeps expanded metadata bound to its exact assertion across edge reorder', async () => {
    const nodes = [
      { id: 'a', label: 'Model A', kind: 'model', color: '#fff', radius: 4 },
      { id: 'b', label: 'Model B', kind: 'model', color: '#fff', radius: 4 },
      { id: 'c', label: 'Model C', kind: 'model', color: '#fff', radius: 4 },
    ];
    const oldLegacyFallback = JSON.stringify(['a', 'c', 'variant_of', false]);
    const evidence = (id: string, excerpt: string) => [{
      kind: 'external_source' as const,
      evidence_id: `evidence:${id}`,
      source_id: `source:${id}`,
      excerpt,
    }];
    const identified = {
      id: oldLegacyFallback,
      source: 'a',
      target: 'b',
      kind: 'cites',
      label: 'Identified assertion',
      color: '#fff',
      directed: true,
      evidence: evidence('identified', 'IDENTIFIED FULL EXCERPT'),
    };
    const legacy = {
      source: 'a',
      target: 'c',
      kind: 'variant_of',
      label: 'Legacy assertion',
      color: '#fff',
      directed: false,
      evidence: evidence('legacy', 'LEGACY FULL EXCERPT'),
    };
    // This exact text collided under the old untagged React-key fallback.
    expect(identified.id).toBe(oldLegacyFallback);
    expect(graphEdgeIdentityKey(identified)).not.toBe(graphEdgeIdentityKey(legacy));
    expect(graphEdgeIdentityKey(legacy)).toBe(graphEdgeIdentityKey({
      ...legacy,
      source: legacy.target,
      target: legacy.source,
    }));

    const edges = [identified, legacy];
    const props = {
      graphIdentity: 'graph:assertion-key',
      nodes,
      edges,
      selectedId: 'a',
      onSelect: () => {},
    };
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation(props),
      ));
    });
    const findMetadata = (needle: string) => renderer.root
      .findAllByType('details')
      .find((details) => details.findAllByType('summary', { deep: false })[0]
        ?.children.join('').includes(needle));
    await act(async () => {
      findMetadata('Identified assertion')!.props.onToggle({
        currentTarget: { open: true },
      });
    });
    expect(testRendererText(findMetadata('Identified assertion')!.children))
      .toContain('IDENTIFIED FULL EXCERPT');
    expect(testRendererText(findMetadata('Legacy assertion relationship')!.children))
      .not.toContain('LEGACY FULL EXCERPT');

    edges.reverse();
    await act(async () => {
      renderer.update(createElement(
        KnowledgeGraphA11yList,
        withPreparedPresentation(props),
      ));
    });
    expect(testRendererText(findMetadata('Identified assertion')!.children))
      .toContain('IDENTIFIED FULL EXCERPT');
    expect(testRendererText(findMetadata('Legacy assertion relationship')!.children))
      .not.toContain('LEGACY FULL EXCERPT');
    await act(async () => renderer.unmount());
  });

  it('exposes every identified parallel assertion in accessible relationship detail', () => {
    const nodes = [
      { id: 'a', label: 'Model A', kind: 'model', color: '#fff', radius: 4 },
      { id: 'b', label: 'Model B', kind: 'model', color: '#fff', radius: 4 },
    ];
    const html = renderToStaticMarkup(createElement(
      KnowledgeGraphA11yList,
      withPreparedPresentation({
      graphIdentity: 'graph:test',
      nodes,
      edges: [
        {
          id: 'identity-claim',
          source: 'a',
          target: 'b',
          kind: 'same_as',
          color: '#f80',
          directed: false,
        },
        {
          id: 'variant-claim',
          source: 'a',
          target: 'b',
          kind: 'variant_of',
          color: '#f08',
          directed: true,
        },
      ],
      selectedId: 'a',
      onSelect: () => {},
      }),
    ));
    expect(html).toContain('same_as [identity-claim]: connected to Model B');
    expect(html).toContain('variant_of [variant-claim]: points to Model B');
  });

  it('exposes a bounded evidence, epistemic, attribute, and score summary', () => {
    const epistemic = {
      status: 'derived_advisory',
      advisory_only: true,
      is_paper_local_evidence: false,
      calibrated_posterior: false,
    } as const;
    const html = renderToStaticMarkup(createElement(
      KnowledgeGraphA11yList,
      withPreparedPresentation({
      graphIdentity: 'graph:test',
      nodes: [
        {
          id: 'a',
          label: 'Model A',
          kind: 'model',
          detail: 'Balanced asynchronous regime',
          attributes: { simulator: 'NEST' },
          epistemic,
          evidence: [{
            kind: 'external_source' as const,
            evidence_id: 'node-source',
            source_id: 'catalog:node',
          }],
          uncalibrated_score: {
            kind: 'retrieval_relevance' as const,
            value: 0.91,
            calibrated_posterior: false as const,
          },
          color: '#fff',
          radius: 4,
        },
        { id: 'b', label: 'Model B', kind: 'model', color: '#fff', radius: 4 },
      ],
      edges: [{
        id: 'claim-42',
        source: 'a',
        target: 'b',
        kind: 'variant_of',
        label: 'Structural match',
        attributes: { resolver: 'entity-linker' },
        epistemic,
        evidence: [{
          kind: 'external_source' as const,
          evidence_id: 'edge-source',
          source_id: 'catalog:edge',
        }],
        uncalibrated_score: {
          kind: 'structural_similarity' as const,
          value: 0.8,
          calibrated_posterior: false as const,
        },
        color: '#f08',
        directed: true,
      }],
      selectedId: 'a',
      onSelect: () => {},
      }),
    ));
    expect(html).toContain('Detail: Balanced asynchronous regime');
    expect(html).toContain(
      'Visual radius: 4; radius meaning: Caller-declared: visual size has no declared quantitative interpretation.',
    );
    expect(html).toContain('Attributes: simulator=NEST');
    expect(html).toContain('Epistemic: derived_advisory; advisory only; not paper-local evidence; uncalibrated');
    expect(html).toContain('Evidence (1): external_source node-source');
    expect(html).toContain('Uncalibrated score: retrieval_relevance 0.91');
    expect(html).toContain('Structural match (variant_of) [claim-42]: points to Model B');
    expect(html).toContain('Evidence (1): external_source edge-source');
    expect(html).toContain('Uncalibrated score: structural_similarity 0.8');
  });

  it('provides an on-demand path to the last node and edge metadata value', async () => {
    type EvidenceRef = NonNullable<KnowledgeGraph3DNode['evidence']>[number];
    const epistemic = {
      status: 'derived_advisory',
      advisory_only: true,
      is_paper_local_evidence: false,
      calibrated_posterior: false,
    } as const;
    const nodeAttributes = Object.fromEntries(
      Array.from({ length: 24 }, (_, index) => [
        `node_attribute_${index}`,
        index === 23 ? ['first scalar', 'last node attribute scalar'] : index,
      ]),
    );
    const edgeAttributes = Object.fromEntries(
      Array.from({ length: 24 }, (_, index) => [
        `edge_attribute_${index}`,
        index === 23 ? 'last edge attribute value' : index,
      ]),
    );
    const evidence = (prefix: string, lastExcerpt: string): EvidenceRef[] =>
      Array.from({ length: 8 }, (_, index): EvidenceRef => ({
        kind: 'external_source',
        evidence_id: `${prefix}-evidence-${index}`,
        source_id: `${prefix}-source-${index}`,
        excerpt: index === 7 ? lastExcerpt : `Excerpt ${index}`,
      }));
    const nodes = [
      {
        id: 'a',
        label: 'Model A',
        kind: 'model',
        attributes: nodeAttributes,
        epistemic,
        evidence: evidence('node', 'last node evidence excerpt'),
        color: '#fff',
        radius: 4,
      },
      { id: 'b', label: 'Model B', kind: 'model', color: '#fff', radius: 4 },
    ];
    const edges = [{
      id: 'claim-last',
      source: 'a',
      target: 'b',
      kind: 'variant_of',
      label: 'Variant assertion',
      attributes: edgeAttributes,
      epistemic,
      evidence: evidence('edge', 'last edge evidence excerpt'),
      color: '#f08',
      directed: true,
    }];
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(KnowledgeGraphA11yList, withPreparedPresentation({
        graphIdentity: 'graph:test',
        nodes,
        edges,
        selectedId: 'a',
        onSelect: () => {},
      })));
    });
    expect(JSON.stringify(renderer.toJSON())).not.toContain('last node attribute scalar');
    expect(JSON.stringify(renderer.toJSON())).not.toContain('last edge evidence excerpt');

    const disclosures = renderer.root.findAllByType('details');
    const findDisclosure = (text: string) => disclosures.find((details) => {
      const summary = details.findAllByType('summary', { deep: false })[0];
      return summary?.children.join('').includes(text);
    });
    const nodeDisclosure = findDisclosure('Browse full metadata for node Model A');
    const edgeDisclosure = findDisclosure(
      'Browse full metadata for relationship Variant assertion [claim-last]',
    );
    expect(nodeDisclosure).toBeDefined();
    expect(edgeDisclosure).toBeDefined();
    await act(async () => {
      nodeDisclosure!.props.onToggle({ currentTarget: { open: true } });
      edgeDisclosure!.props.onToggle({ currentTarget: { open: true } });
    });
    const expanded = JSON.stringify(renderer.toJSON());
    expect(expanded).toContain('Visual radius: ');
    expect(expanded).toContain(
      'Caller-declared: visual size has no declared quantitative interpretation',
    );
    expect(expanded).toContain('node_attribute_23');
    expect(expanded).toContain('last node attribute scalar');
    expect(expanded).toContain('last node evidence excerpt');
    expect(expanded).toContain('edge_attribute_23');
    expect(expanded).toContain('last edge attribute value');
    expect(expanded).toContain('last edge evidence excerpt');
    await act(async () => renderer.unmount());
  });

  it('renders a complete text-redundant legend for every present graph kind', () => {
    const nodes = [
      { id: 'p1', label: 'Paper 1', kind: 'paper', color: '#00ffff', radius: 4,
        nodeGlyph: 'sphere_outline' as const },
      { id: 'p2', label: 'Paper 2', kind: 'paper', color: '#00ffff', radius: 6,
        nodeGlyph: 'sphere_outline' as const },
      { id: 'm1', label: 'Model 1', kind: 'model', color: '#ffaa00', radius: 4,
        nodeGlyph: 'box_shell' as const },
      { id: 'm2', label: 'Model 2', kind: 'model', color: '#ffaa00', radius: 4,
        nodeGlyph: 'box_shell' as const },
      { id: 'f1', label: 'Family', kind: 'family', color: '#aa55ff', radius: 4,
        nodeGlyph: 'diamond_shell' as const },
    ];
    const edges = [
      { id: 'e1', source: 'p1', target: 'p2', kind: 'cites', color: '#11ff11',
        directed: true, particles: true, edgeStrokePattern: 'solid' as const },
      { id: 'e2', source: 'p1', target: 'm1', kind: 'instantiates', color: '#00aaaa',
        directed: true, edgeStrokePattern: 'short_dash' as const },
      { id: 'e3', source: 'm1', target: 'f1', kind: 'belongs_to_family', color: '#888888',
        directed: true, edgeStrokePattern: 'dotted' as const },
      { id: 'e4', source: 'm1', target: 'm2', kind: 'same_as', color: '#ff8800',
        directed: false, edgeStrokePattern: 'solid' as const },
      { id: 'e5', source: 'm2', target: 'm1', kind: 'variant_of', color: '#ff0088',
        directed: true, edgeStrokePattern: 'long_dash' as const },
    ];
    const html = renderToStaticMarkup(createElement(
      KnowledgeGraphLegend,
      withPreparedPresentation({
      graphIdentity: 'graph:legend',
      nodes,
      edges,
      }),
    ));
    expect(html).toContain(
      'paper: 2 nodes; source color #00ffff; intended undimmed scene color #00ffff; ' +
      'glyph outlined sphere',
    );
    expect(html).toContain(
      'visual radius 4–6; Caller-declared: visual size has no declared quantitative interpretation',
    );
    expect(html).toContain(
      'model: 2 nodes; source color #ffaa00; intended undimmed scene color #ffaa00; ' +
      'glyph sphere with box shell',
    );
    expect(html).toContain(
      'family: 1 node; source color #aa55ff; intended undimmed scene color #aa55ff; ' +
      'glyph sphere with diamond shell',
    );
    for (const kind of [
      'cites',
      'instantiates',
      'belongs_to_family',
      'same_as',
      'variant_of',
    ]) {
      expect(html).toContain(`${kind}: 1 relationship;`);
    }
    expect(html).toContain(
      'same_as: 1 relationship; undirected; source color #ff8800; ' +
      'intended undimmed scene color #ff8800; solid stroke',
    );
    expect(html).toContain(
      'cites: 1 relationship; directed; source color #11ff11; ' +
      'intended undimmed scene color #11ff11; solid stroke; flow markers',
    );
    expect(html).toContain('instantiates: 1 relationship; directed; source color ' +
      '#00aaaa; intended undimmed scene color #00aaaa; short-dash stroke');
    expect(html).toContain('belongs_to_family: 1 relationship; directed; source color ' +
      '#888888; intended undimmed scene color #888888; dotted stroke');
    expect(html).toContain('variant_of: 1 relationship; directed; source color ' +
      '#ff0088; intended undimmed scene color #ff0088; long-dash stroke');
    expect(html).toContain(
      'Layout positions and distances are schematic, not quantitative evidence.',
    );
  });

  it('keeps direct-scene radii in the finite renderer range', () => {
    expect(normalizeGraphNodeRadius(5)).toBe(5);
    expect(normalizeGraphNodeRadius(Number.MAX_VALUE)).toBe(4);
    expect(normalizeGraphNodeRadius(1_000)).toBe(4);
    expect(normalizeGraphNodeRadius(NaN)).toBe(4);
    expect(normalizeGraphNodeRadius(0)).toBe(4);
  });

  it('separates accepted presentation authority from live-force admission', () => {
    expect(MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES).toBe(PARAM_LIMITS.maxGraphNodes);
    expect(MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES).toBe(PARAM_LIMITS.maxGraphEdges);
    expect(MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES).toBe(250);
    expect(MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES).toBe(1_000);
    expect(MAX_GRAPH_PARALLEL_EDGES).toBe(
      KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair,
    );
    expect(() => assertKnowledgeGraphPresentationBudget(1_000, 4_000)).not.toThrow();
    expect(() => assertKnowledgeGraphPresentationBudget(1_001, 0)).toThrow(RangeError);
    expect(() => assertKnowledgeGraphPresentationBudget(0, 4_001)).toThrow(RangeError);
    expect(() => assertKnowledgeGraphLiveForceBudget(250, 1_000)).not.toThrow();
    expect(() => assertKnowledgeGraphLiveForceBudget(251, 0)).toThrow(RangeError);
    expect(() => assertKnowledgeGraphLiveForceBudget(0, 1_001)).toThrow(RangeError);
    expect(isKnowledgeGraphLiveForceWithinBudget(250, 1_000)).toBe(true);
    expect(isKnowledgeGraphLiveForceWithinBudget(251, 1_000)).toBe(false);
    const available = knowledgeGraphLiveForceAvailability(250, 1_000);
    const unavailable = knowledgeGraphLiveForceAvailability(251, 1_001);
    expect(available.status).toBe('available');
    expect(unavailable).toMatchObject({
      status: 'unavailable_resource_limit',
      exceeded: ['nodes', 'edges'],
    });
    expect(Object.isFrozen(unavailable)).toBe(true);
    expect(Object.isFrozen(unavailable.exceeded)).toBe(true);
    expect(reducedMotionLayoutTickBudget(0, 0)).toBe(0);
    expect(reducedMotionLayoutTickBudget(250, 1_000)).toBe(1);
  });

  it('rejects an over-limit prepared graph before constructing the scene instance', () => {
    const presentation = prepareGenericGraph(
      Array.from({ length: MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES + 1 }, (_, index) => ({
        id: `live:${index}`,
        label: `Live ${index}`,
        kind: 'model',
        color: '#ffffff',
        radius: 4,
      })),
      [],
    );
    expect(() => KnowledgeGraph3DScene({
      presentation,
      selectedId: null,
      query: '',
      onSelect: () => {},
      hoverId: null,
      onHover: () => {},
    })).toThrow(/live knowledge-graph force layout/u);
  });

  it('rejects oversized direct graphs before reading or snapshotting any record', () => {
    let recordReads = 0;
    const poisonousNode = Object.defineProperties({}, {
      id: { enumerable: true, get: () => { recordReads += 1; throw new Error('read id'); } },
      label: { enumerable: true, get: () => { recordReads += 1; throw new Error('read label'); } },
    }) as KnowledgeGraph3DNode;
    const nodes = new Array<KnowledgeGraph3DNode>(
      MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES + 1,
    ).fill(poisonousNode);
    expect(() => withPreparedPresentation({
      graphIdentity: 'graph:oversized',
      nodes,
      edges: [],
    })).toThrow(RangeError);
    expect(recordReads).toBe(0);
  });

  it('uses a frame-rate-independent fixed-target damping coefficient and snaps for reduced motion', () => {
    const oneFrame = graphCameraTargetDamping(1 / 30, false);
    const twoFrames = 1 - (1 - graphCameraTargetDamping(1 / 60, false)) ** 2;
    expect(oneFrame).toBeCloseTo(twoFrames, 14);
    expect(graphCameraTargetDamping(Number.MIN_VALUE, false)).toBeGreaterThan(0);
    expect(graphCameraTargetDamping(0, false)).toBe(0);
    expect(graphCameraTargetDamping(-1, false)).toBe(0);
    expect(graphCameraTargetDamping(Number.NaN, false)).toBe(0);
    expect(graphCameraTargetDamping(Number.POSITIVE_INFINITY, false)).toBe(0);
    expect(graphCameraTargetDamping(Number.NaN, true)).toBe(1);
  });

  it('admits only safe in-range instanced-mesh identifiers', () => {
    expect(isKnowledgeGraphInstanceId(0, 1)).toBe(true);
    expect(isKnowledgeGraphInstanceId(-1, 1)).toBe(false);
    expect(isKnowledgeGraphInstanceId(0.5, 1)).toBe(false);
    expect(isKnowledgeGraphInstanceId(Number.NaN, 1)).toBe(false);
    expect(isKnowledgeGraphInstanceId(1, 1)).toBe(false);
    expect(isKnowledgeGraphInstanceId(0, Number.NaN)).toBe(false);
  });
});

describe('graphSignature (content key that stops needless sim restarts)', () => {
  const graph = () => ({
    nodes: [
      { id: 'a', radius: 4 },
      { id: 'b', radius: 6 },
    ],
    edges: [{ source: 'a', target: 'b', color: '#fff', kind: 'cites', particles: true }],
  });

  it('is identity-insensitive: content-equal arrays produce the same key', () => {
    const g1 = graph();
    const g2 = graph(); // fresh object/array identities, same content
    expect(graphSignature(g1.nodes, g1.edges)).toBe(graphSignature(g2.nodes, g2.edges));
  });

  it('changes on structure, radius, glyph/stroke styling, and ORDER', () => {
    const base = graphSignature(graph().nodes, graph().edges);
    const radius = graph();
    radius.nodes[0].radius = 5;
    const edgeColor = graph();
    edgeColor.edges[0].color = '#000';
    const particles = graph();
    particles.edges[0].particles = false;
    const glyph = graph();
    glyph.nodes = glyph.nodes.map((node, index) => index === 0
      ? { ...node, nodeGlyph: 'box_shell' }
      : node);
    const stroke = graph();
    stroke.edges = stroke.edges.map((edge) => ({
      ...edge,
      edgeStrokePattern: 'dotted',
    }));
    const order = graph();
    order.nodes.reverse(); // node order IS instance order — must invalidate
    for (const g of [radius, edgeColor, particles, glyph, stroke, order]) {
      expect(graphSignature(g.nodes, g.edges)).not.toBe(base);
    }
  });

  it('distinguishes the default directed edge from an explicitly undirected edge', () => {
    expect(
      graphSignature([], [{ source: 'a', target: 'b' }]),
    ).not.toBe(
      graphSignature([], [{ source: 'a', target: 'b', directed: false }]),
    );
  });

  it('changes when a stable edge assertion id changes', () => {
    const edge = { id: 'claim-a', source: 'a', target: 'b', kind: 'variant_of' };
    expect(graphSignature([], [edge])).not.toBe(
      graphSignature([], [{ ...edge, id: 'claim-b' }]),
    );
  });

  it('distinguishes absent optional strings from explicit empty strings', () => {
    const base = { source: 'a', target: 'b' };
    for (const field of ['id', 'color', 'kind'] as const) {
      expect(graphSignature([], [base])).not.toBe(
        graphSignature([], [{ ...base, [field]: '' }]),
      );
    }
  });

  it('ignores node color/label — those restyle live without a layout restart', () => {
    const styled = (color: string, label: string) =>
      graph().nodes.map((n) => ({ ...n, color, label }));
    expect(graphSignature(styled('#fff', 'x'), graph().edges)).toBe(
      graphSignature(styled('#000', 'y'), graph().edges),
    );
  });

  it('is separator-safe: adjacent fields cannot collide', () => {
    expect(graphSignature([{ id: 'ab' }, { id: 'c' }], [])).not.toBe(
      graphSignature([{ id: 'a' }, { id: 'bc' }], []),
    );
  });

  it('cannot collide when caller strings contain the old control separators', () => {
    expect(graphSignature([{ id: 'a' }, { id: 'b' }], [])).not.toBe(
      graphSignature([{ id: 'a\u0001\u0001b' }], []),
    );
    expect(
      graphSignature([], [
        { source: 'a\u0001b', target: 'c', kind: 'cites' },
      ]),
    ).not.toBe(
      graphSignature([], [
        { source: 'a', target: 'b\u0001c', kind: 'cites' },
      ]),
    );
  });
});

describe('mapCorpusKnowledgeGraph (agent params → scene props)', () => {
  const epistemic = {
    status: 'derived_advisory',
    advisory_only: true,
    is_paper_local_evidence: false,
    calibrated_posterior: false,
  } as const;
  const node = (
    id: string,
    kind: KnowledgeGraph3DParams['nodes'][number]['kind'],
    label: string,
  ): KnowledgeGraph3DParams['nodes'][number] => ({
    id,
    kind,
    label,
    attributes: {},
    epistemic,
    evidence: [{
      kind: 'external_source',
      evidence_id: `evidence:${id}`,
      source_id: `source:${id}`,
    }],
  });
  const edge = (
    id: string,
    source: string,
    target: string,
    kind: KnowledgeGraph3DParams['edges'][number]['kind'],
  ): KnowledgeGraph3DParams['edges'][number] => ({
    id,
    source,
    target,
    kind,
    label: kind,
    attributes: {},
    epistemic,
    evidence: [{
      kind: 'graph_snapshot_record',
      evidence_id: `evidence:${id}`,
      record_id: id,
    }],
  });
  const params: KnowledgeGraph3DParams = {
    graph_id: 'graph:test',
    graph_source: 'test-corpus',
    graph_snapshot_id: 'snapshot:test',
    graph_scope: 'corpus_entity',
    generated_at: '2026-07-11T00:00:00Z',
    nodes: [
      {
        ...node('p1', 'paper', 'Brunel 2000'),
        detail: 'Balanced asynchronous regime',
        attributes: { simulator: 'NEST', resolution_ms: 0.1 },
        uncalibrated_score: {
          kind: 'extraction_confidence',
          value: 0.91,
          calibrated_posterior: false,
        },
      },
      node('p2', 'paper', 'Cited-by-all'),
      node('m1', 'model', 'iaf_psc_delta'),
      node('m2', 'model', 'iaf_psc_alpha'),
      node('f1', 'family', 'LIF family'),
    ],
    edges: [
      {
        ...edge('edge:cites', 'p1', 'p2', 'cites'),
        label: 'Cites source paper',
        attributes: { resolver: 'doi' },
        uncalibrated_score: {
          kind: 'citation_resolution_confidence',
          value: 0.88,
          calibrated_posterior: false,
        },
      },
      edge('edge:instantiates', 'p1', 'm1', 'instantiates'),
      edge('edge:family', 'm1', 'f1', 'belongs_to_family'),
      edge('edge:identity', 'm1', 'm2', 'same_as'),
    ],
  };

  it('derives a collision-free cache boundary from the complete graph context', () => {
    const context = {
      graph_id: params.graph_id,
      graph_source: params.graph_source,
      graph_snapshot_id: params.graph_snapshot_id,
      graph_scope: params.graph_scope,
      generated_at: params.generated_at,
    };
    const identity = corpusGraphInstanceIdentity(context);
    expect(identity).toBe(corpusGraphInstanceIdentity({ ...context }));
    for (const field of Object.keys(context) as Array<keyof typeof context>) {
      expect(corpusGraphInstanceIdentity({
        ...context,
        [field]: `${context[field]}:other`,
      })).not.toBe(identity);
    }
    expect(corpusGraphInstanceIdentity({
      ...context,
      graph_id: 'ab',
      graph_source: 'c',
    })).not.toBe(corpusGraphInstanceIdentity({
      ...context,
      graph_id: 'a',
      graph_source: 'bc',
    }));
  });

  it('colors nodes by kind and gives every node a positive finite radius', () => {
    const { nodes } = mapCorpusKnowledgeGraph(params, P);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const colors = defaultNodeColors(P);
    expect(byId.p1.color).toBe(colors.paper);
    expect(byId.m1.color).toBe(colors.model);
    expect(byId.f1.color).toBe(colors.family);
    expect(byId.p1.nodeGlyph).toBe('sphere_outline');
    expect(byId.m1.nodeGlyph).toBe('box_shell');
    expect(byId.f1.nodeGlyph).toBe('diamond_shell');
    for (const n of nodes) {
      expect(Number.isFinite(n.radius)).toBe(true);
      expect(n.radius).toBeGreaterThan(0);
      expect(n.radiusMeaning).toBe(CORPUS_GRAPH_RADIUS_MEANING);
    }
  });

  it('preserves every accepted assertion and refuses invalid ones instead of dropping them', () => {
    const { edges } = mapCorpusKnowledgeGraph(params, P);
    expect(edges).toHaveLength(4);
    expect(() => mapCorpusKnowledgeGraph({
      ...params,
      edges: [...params.edges, edge('edge:self', 'p2', 'p2', 'cites')],
    }, P)).toThrow(/self-loop/);
    expect(() => mapCorpusKnowledgeGraph({
      ...params,
      edges: [...params.edges, edge('edge:dangling', 'p1', 'ghost', 'cites')],
    }, P)).toThrow(/does not reference a node/);
    expect(() => mapCorpusKnowledgeGraph({
      ...params,
      edges: [...params.edges, edge('edge:cites', 'p1', 'm1', 'cites')],
    }, P)).toThrow(/duplicate edge id/);
  });

  it('only cites edges flow particles; same_as is undirected', () => {
    const { edges } = mapCorpusKnowledgeGraph(params, P);
    const cites = edges.find((e) => e.kind === 'cites')!;
    const sameAs = edges.find((e) => e.kind === 'same_as')!;
    expect(cites.particles).toBe(true);
    expect(cites.directed).toBe(true);
    expect(cites.edgeStrokePattern).toBe('solid');
    expect(sameAs.particles).toBe(false);
    expect(sameAs.directed).toBe(false);
    expect(sameAs.edgeStrokePattern).toBe('solid');
    expect(edges.find((edge) => edge.kind === 'instantiates')?.edgeStrokePattern)
      .toBe('short_dash');
    expect(edges.find((edge) => edge.kind === 'belongs_to_family')?.edgeStrokePattern)
      .toBe('dotted');
  });

  it('allows color overrides without delegating direction or flow semantics', () => {
    const { edges } = mapCorpusKnowledgeGraph(params, P, {
      edgeColors: { cites: '#123456', same_as: '#654321' },
    });
    const cites = edges.find((edge) => edge.kind === 'cites')!;
    const sameAs = edges.find((edge) => edge.kind === 'same_as')!;
    expect(cites).toMatchObject({
      color: '#123456',
      directed: true,
      particles: true,
    });
    expect(sameAs).toMatchObject({
      color: '#654321',
      directed: false,
      particles: false,
    });
  });

  it('strictly validates and canonicalizes mapper color overrides', () => {
    const mapped = mapCorpusKnowledgeGraph(params, P, {
      nodeColors: { paper: '#ABCDEF' },
      edgeColors: { cites: '#FEDCBA' },
    });
    expect(mapped.nodes.find((node) => node.kind === 'paper')?.color).toBe('#abcdef');
    expect(mapped.edges.find((edge) => edge.kind === 'cites')?.color).toBe('#fedcba');
    for (const overrides of [
      { nodeColors: { paper: '#fff' } },
      { edgeColors: { cites: 'red' } },
      { nodeColors: { unknown: '#123456' } },
      { unknownOption: true },
    ]) {
      expect(() => mapCorpusKnowledgeGraph(
        params,
        P,
        overrides as never,
      )).toThrow();
    }
  });

  it('preserves stable assertion ids through the agent-params mapper', () => {
    expect(mapCorpusKnowledgeGraph(params, P).edges.map(({ id }) => id)).toEqual([
      'edge:cites',
      'edge:instantiates',
      'edge:family',
      'edge:identity',
    ]);
  });

  it('preserves bounded evidence metadata through the agent-params mapper', () => {
    const mapped = mapCorpusKnowledgeGraph(params, P);
    expect(mapped.context).toEqual({
      graph_id: params.graph_id,
      graph_source: params.graph_source,
      graph_snapshot_id: params.graph_snapshot_id,
      graph_scope: params.graph_scope,
      generated_at: params.generated_at,
    });
    expect(mapped.graphIdentity).toBe(corpusGraphInstanceIdentity(mapped.context));
    expect(mapped.nodes[0]).toMatchObject({
      detail: 'Balanced asynchronous regime',
      attributes: { simulator: 'NEST', resolution_ms: 0.1 },
      epistemic,
      evidence: params.nodes[0].evidence,
      uncalibrated_score: params.nodes[0].uncalibrated_score,
    });
    expect(mapped.edges[0]).toMatchObject({
      id: 'edge:cites',
      label: 'Cites source paper',
      attributes: { resolver: 'doi' },
      epistemic,
      evidence: params.edges[0].evidence,
      uncalibrated_score: params.edges[0].uncalibrated_score,
    });
    expect([
      ...graphQueryMatchIds(
        mapped.nodes,
        normalizeGraphQuery('complete mapped snapshot'),
        mapped.edges,
      ),
    ]).toEqual(mapped.nodes.map(({ id }) => id));
  });

  it('scales radius with degree (a hub is larger than a leaf)', () => {
    const { nodes } = mapCorpusKnowledgeGraph(params, P);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    // p1 has complete-snapshot degree 2 (p2, m1); f1 has degree 1.
    expect(byId.p1.radius).toBeGreaterThan(byId.f1.radius);
  });

  it('binds radius prose to the exact bounded mapping options', () => {
    for (const options of [
      { degreeScale: 0 },
      { maxRadiusBump: 0 },
    ]) {
      const mapped = mapCorpusKnowledgeGraph(params, P, options);
      expect(new Set(mapped.nodes.map(({ radius }) => radius))).toEqual(new Set([4]));
      expect(new Set(mapped.nodes.map(({ radiusMeaning }) => radiusMeaning))).toEqual(
        new Set([corpusGraphRadiusMeaning(4, options.degreeScale ?? 1.4,
          options.maxRadiusBump ?? 8)]),
      );
      expect(mapped.nodes[0].radiusMeaning).toContain('relationship degree is not encoded');
    }

    const bounded = mapCorpusKnowledgeGraph(params, P, {
      baseRadius: 63,
      degreeScale: Number.MAX_VALUE,
      maxRadiusBump: 1,
    });
    expect(bounded.nodes.every(({ radius }) =>
      Number.isFinite(radius) && radius > 0 && radius <= MAX_GRAPH_NODE_RADIUS,
    )).toBe(true);
    expect(bounded.nodes[0].radiusMeaning).toBe(
      corpusGraphRadiusMeaning(63, Number.MAX_VALUE, 1),
    );
  });

  it('rejects mapper radius options that can exceed the renderer domain', () => {
    for (const options of [
      { baseRadius: Number.MAX_VALUE },
      { baseRadius: 60, maxRadiusBump: 8 },
      { maxRadiusBump: Number.MAX_VALUE },
      { baseRadius: Number.NaN },
      { degreeScale: Number.POSITIVE_INFINITY },
      { degreeScale: -0 },
      { maxRadiusBump: -1 },
    ]) {
      expect(() => mapCorpusKnowledgeGraph(params, P, options)).toThrow();
    }
  });

  it('handles a valid graph with no relationships', () => {
    const r = mapCorpusKnowledgeGraph({
      ...params,
      nodes: [node('isolated', 'model', 'Isolated model')],
      edges: [],
    }, P);
    expect(r.nodes).toHaveLength(1);
    expect(r.edges).toEqual([]);
  });
});
