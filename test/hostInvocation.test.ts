import { describe, expect, it } from 'vitest';
import {
  buildHostRendererInvocation,
  CORTEXEL_SPEC_VERSION,
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
        expect(result.caption).toMatch(/Caller-declared provenance/);
        expect(result.rendererRoutes.length).toBeGreaterThan(0);
      }
    }
  });

  it('authors, serializes, and re-validates a host-renderer envelope in one loop', () => {
    const result = buildHostRendererInvocation({
      skill: 'nest.spatial_2d',
      params: {
        positions: [[0, 0], [1, 1]],
        coordinate_units: 'mm',
      },
      source: 'nest_simulation:run-7',
      declaredInputs: {
        extent: '[1,1]',
        spatial_units: 'mm',
        mask: 'none',
        kernel: 'none',
      },
      rendererRoute: 'd3',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.skill).toBe('nest.spatial_2d');
    expect(result.rendererRoutes).toContain('d3');
    expect(validateHostRendererSpec(JSON.parse(JSON.stringify(result.spec))).ok).toBe(true);
  });

  it('rejects missing provenance and returns a copyable host example', () => {
    const result = validateHostRendererInvocation('nest.spatial_2d', {
      skill: 'nest.spatial_2d',
      params: {
        positions: [[0, 0], [1, 1]],
        coordinate_units: 'mm',
      },
      provenance: { source: 'run:7' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => error.code === 'missing_provenance')).toBe(true);
    expect(formatInvocationErrors(result.errors)).toContain('rendererRoute');
  });

  it('rejects a route outside the selected skill contract', () => {
    const example = structuredClone(HOST_RENDERER_EXAMPLE_PAYLOADS['nest.spatial_2d']!);
    example.rendererRoute = 'fiber';
    const result = validateHostRendererInvocation('nest.spatial_2d', example);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === 'invalid_renderer_route')).toBe(true);
    }
  });

  it('rejects calibrated posteriors and the wrong renderer boundary', () => {
    const example = structuredClone(HOST_RENDERER_EXAMPLE_PAYLOADS['nest.spatial_2d']!);
    (
      example.provenance as unknown as { calibrated_posterior: boolean }
    ).calibrated_posterior = true;
    const posterior = validateHostRendererInvocation('nest.spatial_2d', example);
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
    const example = structuredClone(HOST_RENDERER_EXAMPLE_PAYLOADS['nest.spatial_2d']!);
    example.skill = '  nest.spatial_2d  ';
    expect(validateHostRendererSpec(example).ok).toBe(true);
    expect(
      buildHostRendererInvocation({
        skill: 'nest.spatial_2d',
        params: {
          positions: [[0, 0]],
          coordinate_units: 'mm',
        },
        source: 'x',
        declaredInputs: {
          extent: '[1,1]',
          spatial_units: 'mm',
          mask: 'none',
          kernel: 'none',
        },
        rendererRoute: '',
      } as never).ok,
    ).toBe(false);
  });

  it('rejects unknown and invalid extra provenance keys on the host path', () => {
    for (const [key, value] of [
      ['certified_measured', true],
      ['sampling_interval', -1],
      ['synapse_model', 'static_synapse'],
    ] as const) {
      const example = structuredClone(
        HOST_RENDERER_EXAMPLE_PAYLOADS['nest.spatial_2d']!,
      );
      example.provenance.declared_inputs![key] = value;
      expect(validateHostRendererInvocation('nest.spatial_2d', example).ok).toBe(false);
    }
  });

  it('requires a canonical positive two-axis extent for the legacy 2D host envelope', () => {
    for (const extent of [
      'abc',
      '[]',
      '[1]',
      '[1,2,3]',
      '[1, 2]',
      '[1,0]',
      '[1,-1]',
      '[1,null]',
      '["1",2]',
    ]) {
      const example = structuredClone(
        HOST_RENDERER_EXAMPLE_PAYLOADS['nest.spatial_2d']!,
      );
      example.provenance.declared_inputs!.extent = extent;
      expect(
        validateHostRendererInvocation('nest.spatial_2d', example).ok,
        extent,
      ).toBe(false);
    }

    const valid = structuredClone(
      HOST_RENDERER_EXAMPLE_PAYLOADS['nest.spatial_2d']!,
    );
    valid.provenance.declared_inputs!.extent = '[0.5,2]';
    expect(validateHostRendererInvocation('nest.spatial_2d', valid).ok).toBe(
      true,
    );
  });

  it('refuses stamped 1.3.0 host envelopes instead of reinterpreting them', () => {
    expect(CORTEXEL_SPEC_VERSION).toBe('1.4.0');
    const example = structuredClone(
      HOST_RENDERER_EXAMPLE_PAYLOADS['nest.spatial_2d']!,
    );
    example.specVersion = '1.3.0' as typeof example.specVersion;
    const result = validateHostRendererInvocation('nest.spatial_2d', example);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe('unsupported_spec_version');
      expect(result.errors[0].hint).toContain('buildHostRendererInvocation');
      expect(result.errors[0].hint).toContain(
        'do not edit or remove an existing version stamp',
      );
      const repair = formatInvocationErrors(result.errors);
      expect(repair).not.toMatch(/omit specVersion|delete.*specVersion/iu);
    }
  });

  it('rejects the promoted correlogram at the host-only boundary', () => {
    const result = validateHostRendererInvocation(
      'nest.correlogram',
      { skill: 'nest.correlogram' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].code).toBe('cortexel_scene_available');
  });

  it('rejects compartment sampling claims that the checked time axis cannot substantiate', () => {
    for (const mutate of [
      (example: NonNullable<(typeof HOST_RENDERER_EXAMPLE_PAYLOADS)['nest.compartmental_dynamics']>) => {
        example.provenance.declared_inputs!.sampling_interval = 0.001;
      },
      (example: NonNullable<(typeof HOST_RENDERER_EXAMPLE_PAYLOADS)['nest.compartmental_dynamics']>) => {
        example.params.times_ms = [0, 0, 1];
      },
      (example: NonNullable<(typeof HOST_RENDERER_EXAMPLE_PAYLOADS)['nest.compartmental_dynamics']>) => {
        example.params.times_ms = [0];
        (
          example.params.compartments as Array<{ values: number[] }>
        )[0].values = [-65];
      },
    ]) {
      const example = structuredClone(
        HOST_RENDERER_EXAMPLE_PAYLOADS['nest.compartmental_dynamics']!,
      );
      mutate(example);
      expect(
        validateHostRendererInvocation('nest.compartmental_dynamics', example).ok,
      ).toBe(false);
    }
  });
});
