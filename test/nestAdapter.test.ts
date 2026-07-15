/**
 * The NEST recorder adapter must produce a request the real pipeline accepts, and must
 * refuse hostile or under-specified input — because adapter output is not exempt from the
 * validation gate.
 */

import { describe, expect, it } from 'vitest';

import { nestSpikeRecorderToRaster } from '../src/adapters/nest/index.js';
import { validateRequestValue } from '../src/core/request.js';
import { buildFigure } from '../src/render/index.js';

const validExport = {
  events: {
    senders: [1, 2, 1, 3, 1],
    times: [1.0, 1.0, 2.5, 7.25, 9.5],
  },
};
const options = {
  recordedSenderIds: [1, 2, 3, 4],
  window: { start: 0, stop: 10, unit: 'ms' as const },
  nestVersion: '3.10.0',
  runId: 'run-a',
};

describe('NEST spike-recorder adapter', () => {
  it('produces a request that passes the full validation pipeline', () => {
    const result = nestSpikeRecorderToRaster(validExport, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const validated = validateRequestValue(result.request);
    if (!validated.ok) {
      throw new Error(
        `adapter output was rejected:\n${validated.errors.map((e) => `  ${e.code} ${e.instancePath}: ${e.message}`).join('\n')}`,
      );
    }
    expect(validated.request.skillId).toBe('neuro.spike_raster');
  });

  it('produces a request that renders end to end', () => {
    const result = nestSpikeRecorderToRaster(validExport, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const figure = buildFigure(result.request);
    expect(figure.ok).toBe(true);
    if (figure.ok) expect(figure.svg).toContain('<svg');
  });

  it('normalizes numeric sender ids to canonical strings', () => {
    const result = nestSpikeRecorderToRaster(validExport, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const senders = (result.request.data as { eventSenderIds: string[] }).eventSenderIds;
    expect(senders).toEqual(['1', '2', '1', '3', '1']);
  });

  it('records the NEST source without inventing specificity', () => {
    const result = nestSpikeRecorderToRaster(validExport, options);
    if (!result.ok) return;
    expect(result.request.source).toMatchObject({ kind: 'simulation', system: 'NEST', systemVersion: '3.10.0' });
  });

  it('requires the recorded sender universe rather than inferring it', () => {
    const result = nestSpikeRecorderToRaster(validExport, { ...options, recordedSenderIds: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.code)).toContain('ADAPTER_MAPPING_REQUIRED');
  });

  it('rejects mismatched senders/times length', () => {
    const bad = { events: { senders: [1, 2], times: [1.0] } };
    const result = nestSpikeRecorderToRaster(bad, options);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.code)).toContain('ADAPTER_NEST_UNSUPPORTED_SHAPE');
  });

  it('rejects accessor-bearing input before reading any field', () => {
    let invoked = false;
    const hostile = {
      get events() {
        invoked = true;
        return { senders: [1], times: [1] };
      },
    };
    const result = nestSpikeRecorderToRaster(hostile, options);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.code)).toContain('ADAPTER_ACCESSOR_INPUT_REJECTED');
    expect(invoked).toBe(false);
  });
});
