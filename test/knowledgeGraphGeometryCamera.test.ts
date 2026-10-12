import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  planKnowledgeGraphOrthographicGeometryFitInto,
  planKnowledgeGraphPerspectiveGeometryFitInto,
} from '../react/knowledgeGraphCamera.internal';

describe('geometry-aware graph camera fit', () => {
  it('contains every corner across narrow and wide perspective viewports', () => {
    const bounds = { minX: -60, minY: -24, minZ: -16, maxX: 60, maxY: 24, maxZ: 16 };
    for (const aspect of [0.33, 1, 2.8, 4]) {
      const fit = { distance: 0, orthographicZoom: undefined as number | undefined };
      expect(
        planKnowledgeGraphPerspectiveGeometryFitInto(bounds, 50, aspect, 520 * aspect, 520, fit),
      ).toBe(true);
      const camera = new THREE.PerspectiveCamera(50, aspect, 0.01, 4000);
      camera.position.z = fit.distance;
      camera.updateMatrixWorld();
      for (const x of [-60, 60])
        for (const y of [-24, 24])
          for (const z of [-16, 16]) {
            const p = new THREE.Vector3(x, y, z).project(camera);
            expect(Math.abs(p.x)).toBeLessThan(1);
            expect(Math.abs(p.y)).toBeLessThan(1);
            expect(p.z).toBeGreaterThan(-1);
            expect(p.z).toBeLessThan(1);
          }
    }
  });
  it('fits a small glyph visibly and leaves results untouched on an invalid projection', () => {
    const bounds = { minX: -4, minY: -4, minZ: -4, maxX: 4, maxY: 4, maxZ: 4 };
    const fit = { distance: 0, orthographicZoom: undefined as number | undefined };
    expect(planKnowledgeGraphPerspectiveGeometryFitInto(bounds, 50, 2.8, 1440, 520, fit)).toBe(
      true,
    );
    expect(fit.distance).toBeLessThan(120);
    const before = { ...fit };
    expect(planKnowledgeGraphPerspectiveGeometryFitInto(bounds, NaN, 2.8, 1440, 520, fit)).toBe(
      false,
    );
    expect(planKnowledgeGraphPerspectiveGeometryFitInto(bounds, 50, 2.8, 0, 520, fit)).toBe(false);
    expect(fit).toEqual(before);
  });
  it('contains the orthographic corners using zoom, and rejects zero viewport geometry', () => {
    const bounds = { minX: -80, minY: -20, minZ: -5, maxX: 80, maxY: 20, maxZ: 5 };
    const fit = { distance: 100, orthographicZoom: undefined as number | undefined };
    expect(
      planKnowledgeGraphOrthographicGeometryFitInto(bounds, 100, 160, 80, 1, 800, 400, fit),
    ).toBe(true);
    const camera = new THREE.OrthographicCamera(-80, 80, 40, -40, 0.01, 4000);
    camera.zoom = fit.orthographicZoom!;
    camera.position.z = fit.distance;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (const x of [-80, 80])
      for (const y of [-20, 20]) {
        const p = new THREE.Vector3(x, y, 5).project(camera);
        expect(Math.abs(p.x)).toBeLessThan(1);
        expect(Math.abs(p.y)).toBeLessThan(1);
      }
    const before = { ...fit };
    expect(
      planKnowledgeGraphOrthographicGeometryFitInto(bounds, 100, 160, 80, 1, 800, 0, fit),
    ).toBe(false);
    expect(fit).toEqual(before);
  });
});
