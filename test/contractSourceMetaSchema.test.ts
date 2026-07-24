import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const skillDirectory = path.join(root, 'contract/skills');

describe('normative skill-source meta-schema boundary', () => {
  it('validates every skill source against the schema that claims to govern it', () => {
    const schema = JSON.parse(readFileSync(
      path.join(root, 'contract/meta/contract-source.schema.json'),
      'utf8',
    ));
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
    const failures: string[] = [];

    for (const name of readdirSync(skillDirectory).filter((file) => file.endsWith('.json')).sort()) {
      const source = JSON.parse(readFileSync(path.join(skillDirectory, name), 'utf8'));
      if (validate(source)) continue;
      for (const error of validate.errors ?? []) {
        failures.push(
          `${name}${error.instancePath || '/'} ${error.message ?? 'validation failed'}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it('retains finite prose ceilings above the reviewed living-source maxima', () => {
    const schema = JSON.parse(readFileSync(
      path.join(root, 'contract/meta/contract-source.schema.json'),
      'utf8',
    ));
    const properties = schema.properties;

    expect(properties.purpose.properties.cannotEstablish.items.maxLength).toBe(600);
    expect(properties.science.properties.normalization.items.maxLength).toBe(700);
    expect(properties.science.properties.derivation.items.maxLength).toBe(1600);
    expect(properties.science.properties.scopeRules.items.maxLength).toBe(1200);
    expect(properties.accessibility.properties.summaryTemplate.maxLength).toBe(1000);
    expect(properties.changePolicy.items.maxLength).toBe(400);
    expect(properties.knownLimitations.items.maxLength).toBe(1000);
  });
});
