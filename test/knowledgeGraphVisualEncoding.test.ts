import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  CORPUS_NODE_GLYPH_BY_KIND,
  createKnowledgeGraphNodeShellVertices,
  isKnowledgeGraphStrokeViewportUsable,
  KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH,
  KNOWLEDGE_GRAPH_DIRECTION_MARKER_RADIUS,
  KNOWLEDGE_GRAPH_EDGE_STROKE_WIDTH_PX,
  knowledgeGraphRenderedNodeRadialExtent,
} from '../react/knowledgeGraphVisualEncoding.internal';
import { KNOWLEDGE_GRAPH_GEOMETRY_PIXEL_MARGIN } from '../react/knowledgeGraphCamera.internal';

describe('bounded graph contour and stroke presentation', () => {
  it('accepts finite viewport inputs and rejects unusable projection inputs', () => {
    for (const [width, height, near] of [
      [390, 650, 0.1],
      [1440, 650, 0],
      [1, 1, 1],
    ]) {
      expect(isKnowledgeGraphStrokeViewportUsable(width, height, near)).toBe(true);
    }
    for (const [width, height, near] of [
      [0, 650, 0.1],
      [-1, 650, 0.1],
      [390, 0, 0.1],
      [390, 650, -0.1],
      [Infinity, 650, 0.1],
      [390, NaN, 0.1],
      [390, 650, Infinity],
    ]) {
      expect(isKnowledgeGraphStrokeViewportUsable(width, height, near)).toBe(false);
    }
    expect(KNOWLEDGE_GRAPH_EDGE_STROKE_WIDTH_PX).toBeGreaterThan(1);
    expect(KNOWLEDGE_GRAPH_EDGE_STROKE_WIDTH_PX).toBeLessThanOrEqual(2);
    expect(KNOWLEDGE_GRAPH_GEOMETRY_PIXEL_MARGIN).toBeGreaterThan(
      KNOWLEDGE_GRAPH_EDGE_STROKE_WIDTH_PX / 2,
    );
  });

  it('contains actual focused and ordinary glyph vertices across every kind', () => {
    const geometries = {
      paper: new THREE.SphereGeometry(1.08, 32, 20),
      model: new THREE.BoxGeometry(
        (2 * 1.3) / Math.sqrt(3),
        (2 * 1.3) / Math.sqrt(3),
        (2 * 1.3) / Math.sqrt(3),
      ),
      family: new THREE.OctahedronGeometry(1.5, 0),
    };
    try {
      for (const kind of ['paper', 'model', 'family'] as const) {
        const position = geometries[kind].getAttribute('position');
        for (const focused of [false, true]) {
          const radius = 3;
          const bound = knowledgeGraphRenderedNodeRadialExtent(
            radius,
            CORPUS_NODE_GLYPH_BY_KIND[kind],
            focused,
          );
          const scale = radius * (focused ? 1.28 : 1);
          for (let index = 0; index < position.count; index++) {
            const extent =
              Math.hypot(position.getX(index), position.getY(index), position.getZ(index)) * scale;
            expect(extent).toBeLessThanOrEqual(bound * (1 + 1e-6));
          }
        }
      }
      expect(() => knowledgeGraphRenderedNodeRadialExtent(0, 'sphere_outline', false)).toThrow();
      expect(() => knowledgeGraphRenderedNodeRadialExtent(Infinity, 'box_shell', true)).toThrow();
    } finally {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
    }
  });

  it('contains the current cone without replacing its directional target boundary', () => {
    const geometry = new THREE.ConeGeometry(1, 1, 8);
    const positions = geometry.getAttribute('position');
    const bound = Math.hypot(
      KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH / 2,
      KNOWLEDGE_GRAPH_DIRECTION_MARKER_RADIUS,
    );
    try {
      for (let index = 0; index < positions.count; index++) {
        const radius = Math.hypot(
          positions.getX(index) * KNOWLEDGE_GRAPH_DIRECTION_MARKER_RADIUS,
          positions.getY(index) * KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH,
          positions.getZ(index) * KNOWLEDGE_GRAPH_DIRECTION_MARKER_RADIUS,
        );
        expect(radius).toBeLessThanOrEqual(bound * (1 + 1e-6));
      }
      const tip = new THREE.Vector3(0, KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH / 2, 0);
      tip.y -= KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH / 2;
      expect(tip.length()).toBe(0);
    } finally {
      geometry.dispose();
    }
  });

  it('generates twelve complete frame bars inside each shell bound', () => {
    for (const glyph of ['box_shell', 'diamond_shell'] as const) {
      const vertices = createKnowledgeGraphNodeShellVertices(glyph);
      const radial = glyph === 'box_shell' ? 1.3 : 1.5;
      expect(vertices.length).toBe(12 * 12 * 3 * 3);
      for (let offset = 0; offset < vertices.length; offset += 3) {
        expect(
          Math.hypot(vertices[offset], vertices[offset + 1], vertices[offset + 2]),
        ).toBeLessThanOrEqual(radial * (1 + 1e-6));
      }
      // Every triangle has area. No masked or degenerate geometry enters a shell.
      for (let offset = 0; offset < vertices.length; offset += 9) {
        const first = new THREE.Vector3().fromArray(vertices, offset);
        const second = new THREE.Vector3().fromArray(vertices, offset + 3);
        const third = new THREE.Vector3().fromArray(vertices, offset + 6);
        const triangle = new THREE.Triangle(first, second, third);
        expect(triangle.getArea()).toBeGreaterThan(1e-6);
        const closest = triangle.closestPointToPoint(new THREE.Vector3(), new THREE.Vector3());
        expect(closest.length()).toBeGreaterThan(1);
      }
    }
    expect(() => createKnowledgeGraphNodeShellVertices('sphere_outline' as 'box_shell')).toThrow();
  });
});
