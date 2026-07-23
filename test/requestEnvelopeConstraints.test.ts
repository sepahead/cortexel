import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (relative: string): any => JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, '..', relative), 'utf8'),
);

describe('root request envelope constraints', () => {
  it('keeps the optional cross-envelope fragment closed in the contract-source meta-schema', () => {
    const meta = read('contract/meta/contract-source.schema.json');
    const requestSchemaMeta = meta.properties.requestSchema;
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(requestSchemaMeta);
    const base = { data: { type: 'object' }, parameters: { type: 'object' } };

    expect(validate(base)).toBe(true);
    expect(validate({
      ...base,
      envelopeConstraints: { if: { required: ['data'] }, then: { required: ['parameters'] } },
    })).toBe(true);
    for (const mutation of [
      { ...base, envelopeConstraints: null },
      { ...base, envelopeConstraints: [] },
      { ...base, envelopeConstraints: {} },
      { ...base, envelopeConstraints: 'if data then parameters' },
      { ...base, envelopeConstraint: { if: {}, then: {} } },
    ]) {
      expect(validate(mutation), JSON.stringify(mutation)).toBe(false);
    }
  });

  it('composes the source fragment verbatim into the generated closed request root', () => {
    const source = read('contract/skills/neuro.psth.v1.json');
    const generated = read('contract/schemas/skills/neuro.psth.request.v1.schema.json');
    expect(generated.allOf).toEqual([source.requestSchema.envelopeConstraints]);
    expect(generated.additionalProperties).toBe(false);
    expect(generated.properties.data).toEqual(source.requestSchema.data);
    expect(generated.properties.parameters).toEqual(source.requestSchema.parameters);
  });

  it('rejects every analog layout-only parameter outside the compiler branch that consumes it', () => {
    const source = read('contract/skills/neuro.analog_trace.v1.json');
    const ajv = new Ajv2020({
      allErrors: true,
      strict: true,
      // Cortexel's generator audits these two cases with its more precise `not`
      // exemption; the runtime validator uses the same settings.
      strictRequired: false,
      strictTypes: false,
    });
    ajv.addSchema(read('contract/schemas/common.v1.schema.json'));
    ajv.addSchema(read('contract/schemas/generated/registry-enums.v1.schema.json'));
    const validate = ajv.compile(source.requestSchema.parameters);

    for (const parameters of [
      { layout: 'shared_axis', valueUnit: 'mV' },
      { layout: 'small_multiples', groupBy: 'series', sharedTimeAxis: true },
      { layout: 'shared_axis', duplicateTimePolicy: 'reject' },
      {
        layout: 'shared_axis',
        duplicateTimePolicy: 'aggregate',
        aggregateMethod: 'median',
      },
    ]) {
      expect(validate(parameters), JSON.stringify(validate.errors)).toBe(true);
    }

    const isolatedInvalidVectors = [
      {
        name: 'shared_axis cannot silently ignore groupBy',
        parameters: { layout: 'shared_axis', groupBy: 'series' },
      },
      {
        name: 'shared_axis cannot silently ignore sharedTimeAxis',
        parameters: { layout: 'shared_axis', sharedTimeAxis: false },
      },
      {
        name: 'small_multiples cannot silently ignore valueUnit',
        parameters: { layout: 'small_multiples', valueUnit: 'mV' },
      },
      {
        name: 'aggregate policy requires its named aggregateMethod before render',
        parameters: { layout: 'shared_axis', duplicateTimePolicy: 'aggregate' },
      },
      {
        name: 'reject policy cannot silently ignore aggregateMethod',
        parameters: {
          layout: 'shared_axis',
          duplicateTimePolicy: 'reject',
          aggregateMethod: 'mean',
        },
      },
      {
        name: 'an omitted duplicate policy cannot silently ignore aggregateMethod',
        parameters: { layout: 'shared_axis', aggregateMethod: 'mean' },
      },
    ];
    for (const vector of isolatedInvalidVectors) {
      expect(validate(vector.parameters), vector.name).toBe(false);
    }
  });
});
