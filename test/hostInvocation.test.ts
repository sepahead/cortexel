import { describe, expect, it } from 'vitest';
import {
  buildHostRendererInvocation,
  describeSkills,
  formatInvocationErrors,
  HOST_RENDERER_EXAMPLE_PAYLOADS,
  validateHostRendererInvocation,
  validateHostRendererSpec,
} from '../core';

describe('scene-less skills keep the full honesty contract', () => {
  it('ships a living, strictly valid host invocation for every scene-less skill', () => {
    for (const descriptor of describeSkills().filter((skill) => !skill.renderable)) {
      const example = HOST_RENDERER_EXAMPLE_PAYLOADS[descriptor.id];
      expect(example, descriptor.id).toBeDefined();
      expect(descriptor.examplePayload, descriptor.id).toBeDefined();
      const result = validateHostRendererInvocation(descriptor.id, example);
      expect(result.ok, descriptor.id).toBe(true);
      if (result.ok) {
        expect(result.caption).toMatch(/Schematic/);
        expect(result.rendererRoutes.length).toBeGreaterThan(0);
      }
    }
  });

  it('authors, serializes, and re-validates a host-renderer envelope in one loop', () => {
    const result = buildHostRendererInvocation({
      skill: 'nest.correlogram',
      params: {
        lags_ms: [-1, 0, 1],
        correlation: [0.1, 1, 0.1],
        normalization: 'pearson_coefficient',
        correlation_units: '1',
      },
      source: 'nest_simulation:run-7',
      declaredInputs: {
        bin_ms: 1,
        pair_labels: 'E×E',
        correlation_normalization: 'pearson_coefficient',
        correlation_units: '1',
      },
      rendererRoute: 'd3',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.skill).toBe('nest.correlogram');
    expect(result.rendererRoutes).toContain('d3');
    expect(validateHostRendererSpec(JSON.parse(JSON.stringify(result.spec))).ok).toBe(true);
  });

  it('rejects missing provenance and returns a copyable host example', () => {
    const result = validateHostRendererInvocation('nest.correlogram', {
      skill: 'nest.correlogram',
      params: {
        lags_ms: [-1, 0, 1],
        correlation: [0.1, 1, 0.1],
        normalization: 'pearson_coefficient',
        correlation_units: '1',
      },
      provenance: { source: 'run:7' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => error.code === 'missing_provenance')).toBe(true);
    expect(formatInvocationErrors(result.errors)).toContain('rendererRoute');
  });

  it('rejects a route outside the selected skill contract', () => {
    const example = structuredClone(HOST_RENDERER_EXAMPLE_PAYLOADS['nest.correlogram']!);
    example.rendererRoute = 'fiber';
    const result = validateHostRendererInvocation('nest.correlogram', example);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === 'invalid_renderer_route')).toBe(true);
    }
  });

  it('rejects calibrated posteriors and the wrong renderer boundary', () => {
    const example = structuredClone(HOST_RENDERER_EXAMPLE_PAYLOADS['nest.correlogram']!);
    (
      example.provenance as unknown as { calibrated_posterior: boolean }
    ).calibrated_posterior = true;
    const posterior = validateHostRendererInvocation('nest.correlogram', example);
    expect(posterior.ok).toBe(false);
    if (!posterior.ok) {
      expect(posterior.errors[0].code).toBe('calibrated_posterior_unsupported');
    }

    const wrongBoundary = validateHostRendererInvocation(
      'nest.spike_raster',
      example,
    );
    expect(wrongBoundary.ok).toBe(false);
    if (!wrongBoundary.ok) {
      expect(wrongBoundary.errors[0].code).toBe('cortexel_scene_available');
    }
  });

  it('normalizes a stored skill consistently and rejects a supplied blank route', () => {
    const example = structuredClone(HOST_RENDERER_EXAMPLE_PAYLOADS['nest.correlogram']!);
    example.skill = '  nest.correlogram  ';
    expect(validateHostRendererSpec(example).ok).toBe(true);
    expect(
      buildHostRendererInvocation({
        skill: 'nest.correlogram',
        params: {
          lags_ms: [0],
          correlation: [1],
          normalization: 'pearson_coefficient',
          correlation_units: '1',
        },
        source: 'x',
        declaredInputs: {
          bin_ms: 1,
          pair_labels: 'E×E',
          correlation_normalization: 'pearson_coefficient',
          correlation_units: '1',
        },
        rendererRoute: '',
      } as never).ok,
    ).toBe(false);
  });

  it('rejects unknown and invalid extra provenance keys on the host path', () => {
    for (const [key, value] of [
      ['certified_measured', true],
      ['sampling_interval', -1],
    ] as const) {
      const example = structuredClone(
        HOST_RENDERER_EXAMPLE_PAYLOADS['nest.correlogram']!,
      );
      example.provenance.declared_inputs![key] = value;
      expect(validateHostRendererInvocation('nest.correlogram', example).ok).toBe(false);
    }
  });
});
