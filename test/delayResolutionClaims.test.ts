import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateRequestValue } from '../src/core/request.js';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

interface Quantity {
  unit: string;
  value: number;
}

interface DelayExample {
  data: {
    connections?: {
      delays?: {
        unit: string;
        values: number[];
      };
      synapseModels?: string[];
    };
    simulationResolution?: Quantity;
    sourceResolution?: Quantity;
  };
  source?: {
    system?: string;
  };
}

interface DelayContract {
  id: string;
  revision: number;
  adapters: Array<{
    notes: string;
    status: string;
    system: string;
  }>;
  examples: {
    valid: DelayExample[];
  };
  outputAuthority: {
    evaluator: {
      id: string;
    };
  };
  renderer: {
    id: string;
    revision: number;
  };
}

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTRACT_PATHS = [
  'contract/skills/network.delay_distribution.v1.json',
  'contract/skills/network.delay_matrix.v1.json',
] as const;

const contracts = CONTRACT_PATHS.map((relativePath) => {
  const source = readFileSync(path.join(ROOT, relativePath), 'utf8');
  return {
    contract: JSON.parse(source) as DelayContract,
    relativePath,
    source,
  };
});

const collectStrings = (
  value: JsonValue,
  currentPath = '$',
): Array<{ path: string; value: string }> => {
  if (typeof value === 'string') return [{ path: currentPath, value }];
  if (value === null || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectStrings(entry, `${currentPath}[${index}]`));
  }
  return Object.entries(value).flatMap(([key, entry]) =>
    collectStrings(entry, `${currentPath}.${key}`));
};

const forbiddenUniversalClaims = [
  /\bNEST rounds every delay\b/i,
  /\bevery delay must lie on\b/i,
  /\bSimulator delays are quantized\b/i,
  /\bDelays come back in milliseconds and are multiples\b/i,
  /\ba delay is a positive multiple of (?:the )?resolution\b/i,
  /\bpopulation is therefore supported on a lattice\b/i,
  /\ball (?:NEST )?delays? (?:are|must be) (?:positive )?integer multiples? of\b/i,
  /\beach delay (?:is|must be) an? (?:positive )?integer multiple of\b/i,
  /\bdelays? (?:always|universally) (?:lie|lies) on (?:the )?(?:resolution )?(?:grid|lattice)\b/i,
] as const;

const inSeconds = (quantity: Quantity): number => {
  const factor = {
    s: 1,
    ms: 1e-3,
    us: 1e-6,
    'µs': 1e-6,
  }[quantity.unit];
  if (factor === undefined) throw new Error(`Unhandled time unit in fixture: ${quantity.unit}`);
  return quantity.value * factor;
};

const findContinuousOffGridExample = (contract: DelayContract): DelayExample | undefined =>
  contract.examples.valid.find((request) => {
    if (request.source?.system !== 'NEST') return false;
    const connections = request.data.connections;
    const resolution = request.data.sourceResolution ?? request.data.simulationResolution;
    if (!connections?.delays || !resolution) return false;
    if (!connections.synapseModels?.includes('cont_delay_synapse')) return false;

    const resolutionSeconds = inSeconds(resolution);
    return connections.delays.values.some((value) => {
      const delaySeconds = inSeconds({ unit: connections.delays!.unit, value });
      const ticks = delaySeconds / resolutionSeconds;
      return Math.abs(ticks - Math.round(ticks)) > 1e-9;
    });
  });

describe('model-conditioned NEST delay-resolution claims', () => {
  it('publishes the scientific erratum as skill revision 5 without relabelling the renderer', () => {
    for (const { contract, relativePath } of contracts) {
      expect(contract.revision, relativePath).toBe(5);
      expect(contract.renderer.revision, relativePath).toBe(4);
      expect(contract.outputAuthority.evaluator.id, relativePath)
        .toBe(`${contract.id}.output_authority.v5`);
    }
  });

  it('contains no universal delay-lattice claim in either V1 contract', () => {
    const violations: string[] = [];
    for (const { relativePath, source } of contracts) {
      const strings = collectStrings(JSON.parse(source) as JsonValue);
      for (const leaf of strings) {
        for (const pattern of forbiddenUniversalClaims) {
          if (pattern.test(leaf.value)) {
            violations.push(`${relativePath}:${leaf.path}: ${pattern.source}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('retains the cited NEST 3.9/3.10 model- and assignment-conditioned semantics', () => {
    for (const { relativePath, source } of contracts) {
      expect(source, `${relativePath} scopes the upstream behavior`)
        .toContain('NEST 3.9/3.10');
      expect(source, `${relativePath} names the continuous-delay model`)
        .toContain('cont_delay_synapse');
      expect(source, `${relativePath} distinguishes ordinary assignment`)
        .toContain('normal Connect');
      expect(source, `${relativePath} records the copied-model default path`)
        .toContain('CopyModel');
      expect(source, `${relativePath} records the global model-default path`)
        .toContain('SetDefaults');
      expect(source, `${relativePath} records the modern post-creation path`)
        .toContain('SynapseCollection.set');
      expect(source, `${relativePath} records the legacy post-creation name`)
        .toContain('SetStatus');
      expect(source, `${relativePath} retains the minimum-delay condition`)
        .toMatch(/at least (?:one|the) simulation resolution/i);
    }
  });

  it('labels NEST entries as unimplemented mapping recipes', () => {
    const nestAdapters = contracts.flatMap(({ relativePath, contract }) =>
      contract.adapters
        .filter((adapter) => adapter.system.startsWith('nest.'))
        .map((adapter) => ({ ...adapter, relativePath })));

    expect(nestAdapters).toHaveLength(3);
    for (const adapter of nestAdapters) {
      expect(adapter.status, `${adapter.relativePath}:${adapter.system}`).toBe('planned');
      expect(adapter.notes).toMatch(/mapping recipe only/i);
      expect(adapter.notes).toMatch(
        /does not currently ship an executable V1 NEST connection adapter/i,
      );
    }
  });

  it('keeps living off-grid cont_delay_synapse examples valid and unsnapped', () => {
    for (const { relativePath, contract } of contracts) {
      const request = findContinuousOffGridExample(contract);
      expect(request, `${relativePath} needs a living off-grid NEST example`).toBeDefined();
      if (!request) continue;

      const connections = request.data.connections!;
      const resolution = request.data.sourceResolution ?? request.data.simulationResolution;
      const resolutionSeconds = inSeconds(resolution!);
      const delaysSeconds = connections.delays!.values.map((value) =>
        inSeconds({ unit: connections.delays!.unit, value }));

      expect(delaysSeconds.every((value) => value >= resolutionSeconds)).toBe(true);
      expect(delaysSeconds.some((value) => {
        const ticks = value / resolutionSeconds;
        return Math.abs(ticks - Math.round(ticks)) > 1e-9;
      })).toBe(true);

      const outcome = validateRequestValue(structuredClone(request));
      const diagnostics = outcome.ok
        ? ''
        : outcome.errors.map((error) =>
          `${error.code} ${error.instancePath || '(root)'}: ${error.message}`).join('\n');
      expect(outcome.ok, `${relativePath} rejected a valid off-grid delay:\n${diagnostics}`)
        .toBe(true);
    }
  });
});
