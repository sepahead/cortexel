import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { proveAuthoredObjectClosure } from '../scripts/lib/schema-object-closure.js';
import { validateStructure } from '../src/core/structural-validator.js';

const ROOT = path.resolve(import.meta.dirname, '..');

function spikeExample(kind: string): Record<string, any> {
  const source = JSON.parse(readFileSync(
    path.join(ROOT, 'contract/skills/neuro.spike_raster.v1.json'),
    'utf8',
  )) as { examples: { valid: Record<string, any>[] } };
  const request = source.examples.valid.find(
    (candidate) => candidate.data?.window?.kind === kind,
  );
  if (!request) throw new Error(`missing spike-raster example for ${kind}`);
  return structuredClone(request);
}

const CLOSED_OBJECT = {
  type: 'object',
  properties: { kind: { type: 'string' } },
  additionalProperties: false,
} as const;

describe('conditional object-schema closure proof', () => {
  it('proves an exhaustive nested discriminator only when every outcome closes', () => {
    const closedRef = 'https://example.invalid/common#/$defs/closedWindow';
    const dispatch = {
      allOf: [{
        if: { type: 'object', required: ['kind'] },
        then: {
          if: { properties: { kind: { const: 'finite' } }, required: ['kind'] },
          then: CLOSED_OBJECT,
          else: {
            if: { properties: { kind: { const: 'capture' } }, required: ['kind'] },
            then: CLOSED_OBJECT,
            else: CLOSED_OBJECT,
          },
        },
        else: { $ref: closedRef },
      }],
    };

    const proof = proveAuthoredObjectClosure(
      dispatch,
      '/window',
      (reference) => reference === closedRef ? CLOSED_OBJECT : undefined,
    );
    expect(proof.closed).toBe(true);
    expect(proof.openPaths).toEqual([]);
    expect(proof.leaves.map(({ path }) => path)).toEqual([
      '/window/allOf/0/then/then',
      '/window/allOf/0/then/else/then',
      '/window/allOf/0/then/else/else',
      '/window/allOf/0/else/$ref',
    ]);
  });

  it('fails closed at the exact uncovered outcome and does not mistake a refinement for closure', () => {
    const openUnknownKind = {
      if: { type: 'object', required: ['kind'] },
      then: CLOSED_OBJECT,
      else: { type: 'object', properties: { kind: { type: 'string' } } },
    };
    expect(proveAuthoredObjectClosure(openUnknownKind, '/window')).toMatchObject({
      closed: false,
      openPaths: ['/window/else'],
    });

    const closedRef = 'https://example.invalid/common#/$defs/closedWindow';
    const closedBaseWithOpenRefinement = {
      allOf: [
        { $ref: closedRef },
        {
          if: { properties: { mode: { const: 'sampled' } } },
          then: { required: ['sampleCount'] },
          else: { not: { required: ['sampleCount'] } },
        },
      ],
    };
    expect(proveAuthoredObjectClosure(
      closedBaseWithOpenRefinement,
      '',
      (reference) => reference === closedRef ? CLOSED_OBJECT : undefined,
    ).closed).toBe(true);

    const unresolvedRef = { allOf: [{ $ref: closedRef }] };
    expect(proveAuthoredObjectClosure(unresolvedRef)).toMatchObject({
      closed: false,
      openPaths: ['/allOf/0/$ref'],
    });
    expect(proveAuthoredObjectClosure(
      unresolvedRef,
      '',
      () => ({ type: 'object', properties: { value: { type: 'number' } } }),
    )).toMatchObject({
      closed: false,
      openPaths: ['/allOf/0/$ref'],
    });

    // An allOf used to narrow a scalar is outside the object-closure obligation:
    // its primitive-only enum makes admitting an object impossible even when the
    // sibling registry ref is intentionally unavailable to this unit proof.
    expect(proveAuthoredObjectClosure({
      allOf: [
        { $ref: 'https://example.invalid/generated#/$defs/quantityKind' },
        { enum: ['probability', 'probability_density'] },
      ],
    }).closed).toBe(true);
  });
});

describe('spike-raster conditional structural diagnostics', () => {
  it('reports one exact-path leaf diagnostic for an oversized tic denominator', () => {
    for (const kind of [
      'nest_recording_device_origin_relative',
      'nest_recording_device_positive_infinity_capture_bounded',
    ]) {
      const request = spikeExample(kind);
      request.data.window.captureAuthority.runtimeStatus.ticsPerMs = '12345678901234567';

      const result = validateStructure(request, 'neuro.spike_raster');
      expect(result.ok, kind).toBe(false);
      expect(result.errors.map(({ code, stage, instancePath }) => ({
        code,
        stage,
        instancePath,
      })), kind).toEqual([{
        code: 'SCHEMA_VALIDATION_FAILED',
        stage: 'structural',
        instancePath: '/data/window/captureAuthority/runtimeStatus/ticsPerMs',
      }]);
    }
  });

  it('retains closed-object typo rejection on every source-specific leaf', () => {
    for (const kind of [
      'nest_recording_device_origin_relative',
      'nest_recording_device_positive_infinity_capture_bounded',
    ]) {
      const request = spikeExample(kind);
      request.data.window.captureAuthority.runtimeStatus.ticsPerMillisecond = '1000';

      const result = validateStructure(request, 'neuro.spike_raster');
      expect(result.ok, kind).toBe(false);
      expect(result.errors.map(({ code, instancePath }) => ({ code, instancePath })), kind)
        .toEqual([{
          code: 'SCHEMA_UNKNOWN_PROPERTY',
          instancePath:
            '/data/window/captureAuthority/runtimeStatus/ticsPerMillisecond',
        }]);
    }
  });
});
