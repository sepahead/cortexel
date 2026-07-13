import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildManifest,
  serializeManifest,
  type SkillManifestEntry,
  type SkillsManifest,
} from '../scripts/emit-manifest';
import {
  describeSkill,
  getSkill,
  type ParamValidationConstraint,
} from '../core/skills/registry';
import { NEST_SKILL_IDS } from '../core/skills/skillIds';
import { ROUTING_DISCRIMINATORS } from '../core/skills/router';
import { SCENE_NAMES } from '../core/designLaws';
import Ajv2020 from 'ajv/dist/2020.js';

function portableAjv() {
  const ajv = new Ajv2020({ allErrors: true, useDefaults: true, strict: true });
  ajv.addKeyword({
    keyword: 'x-cortexel-normalize',
    schemaType: 'string',
    validate: () => true,
  });
  ajv.addKeyword({
    keyword: 'x-cortexel-max-utf16-code-units',
    type: 'string',
    schemaType: 'number',
    validate: (limit: number, value: string) => value.length <= limit,
  });
  return ajv;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function resolvePath(root: unknown, rawPath: string): unknown[] {
  const path = rawPath.endsWith('?') ? rawPath.slice(0, -1) : rawPath;
  let values: unknown[] = [root];
  for (const segment of path.split('.')) {
    const next: unknown[] = [];
    for (const value of values) {
      if (segment === '*') {
        const object = asRecord(value);
        if (object) next.push(...Object.values(object));
      } else if (segment.endsWith('[*]')) {
        const object = asRecord(value);
        const collection = object?.[segment.slice(0, -3)];
        if (Array.isArray(collection)) next.push(...collection);
      } else {
        const object = asRecord(value);
        if (object && Object.hasOwn(object, segment)) next.push(object[segment]);
      }
    }
    values = next;
  }
  return values;
}

function sequence(root: unknown, path: string): unknown[] {
  const values = resolvePath(root, path);
  return values.length === 1 && Array.isArray(values[0])
    ? values[0]
    : values;
}

function portableApproximatelyEqual(
  actual: number,
  expected: number,
  absoluteTolerance: number,
  relativeTolerance: number,
): boolean {
  return Number.isFinite(actual) && Number.isFinite(expected) &&
    Math.abs(actual - expected) <=
      absoluteTolerance + relativeTolerance * Math.max(Math.abs(actual), Math.abs(expected));
}

function portableEdgeIdInteger(value: string): number | undefined {
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && String(parsed) === value
    ? parsed
    : undefined;
}

function portableConstraintPass(
  constraint: ParamValidationConstraint,
  params: Record<string, unknown>,
): boolean {
  const sequences = constraint.paths.map((path) => sequence(params, path));
  switch (constraint.kind) {
    case 'equal_length': {
      const present = constraint.paths
        .map((path, index) => ({ path, values: resolvePath(params, path), sequence: sequences[index] }))
        .filter(({ path, values }) => !path.endsWith('?') || values.length > 0)
        .map(({ sequence: values }) => values.length);
      return present.every((length) => length === present[0]);
    }
    case 'each_length_matches': {
      const arrays = resolvePath(params, constraint.paths[0]).filter(Array.isArray) as unknown[][];
      const reference = sequence(params, constraint.paths[constraint.paths.length - 1]);
      return arrays.every((array) => array.length === reference.length);
    }
    case 'monotonic_non_decreasing':
      return sequences.every((values) => values.every(
        (value, index) => index === 0 || (values[index - 1] as number) <= (value as number),
      ));
    case 'non_negative':
      return sequences.every((values) => values.every((value) => (value as number) >= 0));
    case 'property_count':
      return resolvePath(params, constraint.paths[0]).every((value) => {
        const count = Object.keys(asRecord(value) ?? {}).length;
        return (constraint.min === undefined || count >= constraint.min) &&
          (constraint.max === undefined || count <= constraint.max);
      });
    case 'unique_field': {
      const collection = sequence(params, constraint.paths[0]);
      const values = collection.map((value) => asRecord(value)?.[constraint.field!]);
      return new Set(values.map((value) => JSON.stringify(value))).size === values.length;
    }
    case 'unique_tuple': {
      const seen = new Set<string>();
      for (let index = 0; index < (sequences[0]?.length ?? 0); index++) {
        const tuple = sequences.map((values) => values[index]);
        if (
          constraint.symmetricKinds?.includes(String(tuple[tuple.length - 1])) &&
          String(tuple[0]) > String(tuple[1])
        ) {
          [tuple[0], tuple[1]] = [tuple[1], tuple[0]];
        }
        const key = JSON.stringify(tuple);
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    }
    case 'references_exist': {
      const allowed = new Set(sequences[sequences.length - 1]);
      return sequences.slice(0, -1).every((values) =>
        values.every((value) => value === null || allowed.has(value)));
    }
    case 'no_self_loops':
      return sequences[0].every((value, index) => value !== sequences[1][index]);
    case 'same_keys': {
      const keySets = constraint.paths.map((path) =>
        Object.keys(asRecord(resolvePath(params, path)[0]) ?? {}).sort().join('\0'));
      return keySets.every((keys) => keys === keySets[0]);
    }
    case 'cartesian_product_length': {
      const axes = resolvePath(params, constraint.paths[0]).filter(Array.isArray) as unknown[][];
      const expected = axes.reduce((product, axis) => product * axis.length, 1);
      return resolvePath(params, constraint.paths[1]).every(
        (value) => Array.isArray(value) && value.length === expected,
      );
    }
    case 'permutation_of_keys': {
      const ordered = sequence(params, constraint.paths[0]).map(String).sort();
      const keys = Object.keys(asRecord(resolvePath(params, constraint.paths[1])[0]) ?? {}).sort();
      return JSON.stringify(ordered) === JSON.stringify(keys);
    }
    case 'endpoint_kinds': {
      const edges = sequence(params, constraint.paths[0]);
      const nodes = sequence(params, constraint.paths[1]);
      const kinds = new Map(nodes.map((node) => {
        const item = asRecord(node)!;
        return [item.id, item.kind];
      }));
      return edges.every((edge) => {
        const item = asRecord(edge)!;
        const expected = constraint.allowedEndpointKinds?.[String(item.kind)];
        return !!expected && kinds.get(item.source) === expected[0] && kinds.get(item.target) === expected[1];
      });
    }
    case 'mapped_value':
      return constraint.allowedValues?.[String(sequences[0][0])] === sequences[1][0];
    case 'conditional_numeric_domain': {
      const domain = constraint.numericDomains?.[String(sequences[0][0])];
      return !!domain && sequences[1].every((value) =>
        typeof value === 'number' &&
        value >= domain.min &&
        (domain.max === undefined || value <= domain.max) &&
        (!domain.integer || Number.isSafeInteger(value)));
    }
    case 'uniform_histogram_bins': {
      const centers = sequences[0];
      const width = sequences[1][0];
      const absoluteTolerance = constraint.absoluteTolerance;
      const relativeTolerance = constraint.relativeTolerance;
      if (
        typeof width !== 'number' || !Number.isFinite(width) || width <= 0 ||
        typeof absoluteTolerance !== 'number' || absoluteTolerance < 0 ||
        typeof relativeTolerance !== 'number' || relativeTolerance < 0 ||
        !centers.every((center) => typeof center === 'number' && Number.isFinite(center))
      ) return false;
      if (constraint.nonNegativeLowerEdge && centers.length > 0) {
        const first = centers[0] as number;
        const halfWidth = width / 2;
        const tolerance = absoluteTolerance +
          relativeTolerance * Math.max(Math.abs(first), Math.abs(halfWidth));
        const lowerEdge = first - halfWidth;
        if (!Number.isFinite(lowerEdge) || lowerEdge < -tolerance) return false;
      }
      for (let index = 1; index < centers.length; index++) {
        const previous = centers[index - 1] as number;
        const current = centers[index] as number;
        if (!(current > previous)) return false;
        if (!portableApproximatelyEqual(
          current - previous,
          width,
          absoluteTolerance,
          relativeTolerance,
        )) return false;
      }
      return true;
    }
    case 'normalized_histogram_mass': {
      const mode = String(sequences[0][0]);
      const rule = constraint.normalizationRules?.[mode];
      if (!rule) return true;
      const width = sequences[2][0];
      const absoluteTolerance = constraint.absoluteTolerance;
      const relativeTolerance = constraint.relativeTolerance;
      if (
        typeof width !== 'number' || !Number.isFinite(width) || width <= 0 ||
        typeof absoluteTolerance !== 'number' || absoluteTolerance < 0 ||
        typeof relativeTolerance !== 'number' || relativeTolerance < 0
      ) return false;
      let mass = 0;
      for (const value of sequences[1]) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false;
        mass += value;
      }
      if (rule.measure === 'density_integral') mass *= width;
      return portableApproximatelyEqual(
        mass,
        rule.target,
        absoluteTolerance,
        relativeTolerance,
      );
    }
    case 'psth_derived_counts': {
      const mode = String(sequences[0][0]);
      const values = sequences[1];
      const trialCount = sequences[2][0];
      const binWidthMs = sequences[3][0];
      const aggregation = sequences[4][0];
      const absoluteTolerance = constraint.absoluteTolerance;
      if (
        aggregation !== 'selected_senders_per_trial' ||
        typeof trialCount !== 'number' ||
        !Number.isSafeInteger(trialCount) ||
        trialCount <= 0 ||
        typeof binWidthMs !== 'number' ||
        !Number.isFinite(binWidthMs) ||
        binWidthMs <= 0 ||
        typeof absoluteTolerance !== 'number' ||
        !Number.isFinite(absoluteTolerance) ||
        absoluteTolerance < 0
      ) return false;
      for (const value of values) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false;
        let rawCount: number;
        switch (mode) {
          case 'count':
            if (!Number.isSafeInteger(value)) return false;
            rawCount = value;
            break;
          case 'count_per_trial':
            rawCount = value * trialCount;
            break;
          case 'rate_hz':
            rawCount = value * trialCount;
            rawCount *= binWidthMs;
            rawCount /= 1000;
            break;
          default:
            return false;
        }
        const rounded = Math.round(rawCount);
        if (
          !Number.isFinite(rawCount) ||
          !Number.isSafeInteger(rounded) ||
          Math.abs(rawCount - rounded) > absoluteTolerance
        ) return false;
      }
      return true;
    }
    case 'max_parallel_edges': {
      if (constraint.max === undefined) return false;
      const counts = new Map<string, number>();
      for (const edge of sequence(params, constraint.paths[0])) {
        const item = asRecord(edge);
        if (!item || typeof item.source !== 'string' || typeof item.target !== 'string') {
          return false;
        }
        const source = item.source > item.target ? item.target : item.source;
        const target = item.source > item.target ? item.source : item.target;
        const key = JSON.stringify([source, target]);
        const count = (counts.get(key) ?? 0) + 1;
        if (count > constraint.max) return false;
        counts.set(key, count);
      }
      return true;
    }
    case 'each_unique_field': {
      if (!constraint.field) return false;
      return resolvePath(params, constraint.paths[0]).every((value) => {
        if (!Array.isArray(value)) return false;
        const keys = value.map((item) => asRecord(item)?.[constraint.field!]);
        return new Set(keys.map((key) => JSON.stringify(key))).size === keys.length;
      });
    }
    case 'each_contains_field_value': {
      if (!constraint.field || !constraint.allowedFieldValues) return false;
      return resolvePath(params, constraint.paths[0]).every((value) =>
        Array.isArray(value) && value.some((item) => {
          const fieldValue = asRecord(item)?.[constraint.field!];
          return typeof fieldValue === 'string' &&
            constraint.allowedFieldValues!.includes(fieldValue);
        }));
    }
    case 'node_score_kind':
    case 'edge_score_kind': {
      return sequence(params, constraint.paths[0]).every((edge) => {
        const item = asRecord(edge);
        if (!item) return false;
        const score = asRecord(item.uncalibrated_score);
        if (!score) return item.uncalibrated_score === undefined;
        const allowed = constraint.allowedScoreKinds?.[String(item.kind)];
        return !!allowed && allowed.includes(String(score.kind));
      });
    }
    case 'ordered_interval': {
      const start = sequences[0][0];
      const stop = sequences[1][0];
      return typeof start === 'number' && Number.isFinite(start) &&
        typeof stop === 'number' && Number.isFinite(stop) && stop > start;
    }
    case 'uniform_bin_window': {
      const centers = sequences[0];
      const width = sequences[1][0];
      const start = sequences[2][0];
      const stop = sequences[3][0];
      const absoluteTolerance = constraint.absoluteTolerance;
      const relativeTolerance = constraint.relativeTolerance;
      const roundoffUlps = constraint.roundoffUlps;
      const maxRoundoffFraction = constraint.maxRoundoffFraction;
      if (
        centers.length === 0 ||
        typeof width !== 'number' || !Number.isFinite(width) || width <= 0 ||
        typeof start !== 'number' || !Number.isFinite(start) ||
        typeof stop !== 'number' || !Number.isFinite(stop) || !(stop > start) ||
        typeof absoluteTolerance !== 'number' || absoluteTolerance < 0 ||
        typeof relativeTolerance !== 'number' || relativeTolerance < 0 ||
        typeof roundoffUlps !== 'number' || !Number.isFinite(roundoffUlps) ||
        roundoffUlps < 0 ||
        typeof maxRoundoffFraction !== 'number' ||
        !Number.isFinite(maxRoundoffFraction) || maxRoundoffFraction < 0 ||
        !centers.every((center) => typeof center === 'number' && Number.isFinite(center))
      ) return false;
      for (let index = 1; index < centers.length; index++) {
        const previous = centers[index - 1] as number;
        const current = centers[index] as number;
        if (!(current > previous) || !portableApproximatelyEqual(
          current - previous,
          width,
          absoluteTolerance,
          relativeTolerance,
        )) return false;
      }
      const halfWidth = width / 2;
      const edgeMatches = (center: number, edge: number, expected: number) => {
        const difference = Math.abs(edge - expected);
        if (difference === 0) return true;
        const arithmeticTolerance = roundoffUlps * Number.EPSILON * Math.max(
            Math.abs(center), Math.abs(halfWidth), Math.abs(edge), Math.abs(expected),
          );
        if (arithmeticTolerance > maxRoundoffFraction * Math.abs(width)) return false;
        const tolerance = absoluteTolerance + relativeTolerance * Math.abs(width) +
          arithmeticTolerance;
        return Number.isFinite(edge) && difference <= tolerance;
      };
      const firstCenter = centers[0] as number;
      const lastCenter = centers[centers.length - 1] as number;
      return edgeMatches(firstCenter, firstCenter - halfWidth, start) &&
        edgeMatches(lastCenter, lastCenter + halfWidth, stop);
    }
    case 'population_rate_derived_values': {
      const series = sequences[0];
      const binCount = sequences[1].length;
      const width = sequences[2][0];
      const normalization = sequences[3][0];
      const aggregation = sequences[4][0];
      const binning = sequences[5][0];
      const absoluteTolerance = constraint.absoluteTolerance;
      const relativeTolerance = constraint.relativeTolerance;
      if (
        typeof width !== 'number' || !Number.isFinite(width) || width <= 0 ||
        normalization !== 'mean_per_recorded_sender_hz' ||
        aggregation !== 'selected_senders' ||
        binning !== 'left_closed_right_open' ||
        typeof absoluteTolerance !== 'number' || absoluteTolerance < 0 ||
        typeof relativeTolerance !== 'number' || relativeTolerance < 0
      ) return false;
      const ids = new Set<string>();
      for (const raw of series) {
        const item = asRecord(raw);
        const id = item?.id;
        const senderCount = item?.recorded_sender_count;
        const counts = item?.spike_counts;
        const rates = item?.rates_hz;
        if (
          typeof id !== 'string' || ids.has(id) ||
          typeof senderCount !== 'number' || !Number.isSafeInteger(senderCount) || senderCount <= 0 ||
          !Array.isArray(counts) || counts.length !== binCount ||
          !Array.isArray(rates) || rates.length !== binCount
        ) return false;
        ids.add(id);
        for (let index = 0; index < binCount; index++) {
          const count = counts[index];
          const rate = rates[index];
          if (
            typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 ||
            typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0
          ) return false;
          let expected = count * 1000;
          const denominator = senderCount * width;
          expected /= denominator;
          if (!Number.isFinite(denominator) || !portableApproximatelyEqual(
            rate,
            expected,
            absoluteTolerance,
            relativeTolerance,
          )) return false;
        }
      }
      return true;
    }
    case 'symmetric_lag_axis': {
      const lags = sequences[0];
      const width = sequences[1][0];
      const tauMax = sequences[2][0];
      const absoluteTolerance = constraint.absoluteTolerance;
      const relativeTolerance = constraint.relativeTolerance;
      if (
        lags.length === 0 || lags.length % 2 === 0 ||
        typeof width !== 'number' || !Number.isFinite(width) || width <= 0 ||
        typeof tauMax !== 'number' || !Number.isFinite(tauMax) || tauMax <= 0 ||
        typeof absoluteTolerance !== 'number' || absoluteTolerance < 0 ||
        typeof relativeTolerance !== 'number' || relativeTolerance < 0 ||
        !lags.every((lag) => typeof lag === 'number' && Number.isFinite(lag))
      ) return false;
      for (let index = 1; index < lags.length; index++) {
        const previous = lags[index - 1] as number;
        const current = lags[index] as number;
        if (!(current > previous) || !portableApproximatelyEqual(
          current - previous,
          width,
          absoluteTolerance,
          relativeTolerance,
        )) return false;
      }
      const last = lags.length - 1;
      if (!portableApproximatelyEqual(lags[0] as number, -tauMax, absoluteTolerance, relativeTolerance) ||
          !portableApproximatelyEqual(lags[last] as number, tauMax, absoluteTolerance, relativeTolerance) ||
          !portableApproximatelyEqual(lags[Math.floor(lags.length / 2)] as number, 0, absoluteTolerance, relativeTolerance)) {
        return false;
      }
      for (let index = 0; index < Math.floor(lags.length / 2); index++) {
        if (!portableApproximatelyEqual(
          lags[index] as number,
          -(lags[last - index] as number),
          absoluteTolerance,
          relativeTolerance,
        )) return false;
      }
      return true;
    }
    case 'connection_graph_snapshot': {
      const nodes = sequences[0];
      const edges = sequences[1];
      const samplePolicy = sequences[2][0];
      const sourceCount = sequences[3][0];
      const weightUnits = sequences[4][0];
      const delayUnits = sequences[5][0];
      const edgeIdentity = sequences[6][0];
      if (typeof sourceCount !== 'number' || !Number.isSafeInteger(sourceCount) || sourceCount < 0) return false;
      const nodeIds = new Set<unknown>();
      for (const raw of nodes) {
        const node = asRecord(raw);
        if (!node || nodeIds.has(node.id)) return false;
        nodeIds.add(node.id);
      }
      const edgeIds = new Set<unknown>();
      let weights = 0;
      let delays = 0;
      let models = 0;
      for (const raw of edges) {
        const edge = asRecord(raw);
        if (!edge || edgeIds.has(edge.id) || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return false;
        if (typeof edge.id !== 'string') return false;
        const idParts = edge.id.split(':');
        if (edgeIdentity === 'canonical_sorted_ordinal') {
          const ordinal = idParts.length === 2 && idParts[0] === 'connection'
            ? portableEdgeIdInteger(idParts[1])
            : undefined;
          if (ordinal === undefined || ordinal >= sourceCount) return false;
        } else if (edgeIdentity === 'nest_connection_identifier') {
          const components = idParts.length === 6 && idParts[0] === 'connection'
            ? idParts.slice(1).map(portableEdgeIdInteger)
            : [];
          if (components.length !== 5 || components.some((value) => value === undefined) ||
              components[0] !== edge.source || components[1] !== edge.target) return false;
        } else {
          return false;
        }
        edgeIds.add(edge.id);
        if (Object.hasOwn(edge, 'weight')) weights += 1;
        if (Object.hasOwn(edge, 'delay_ms')) delays += 1;
        if (Object.hasOwn(edge, 'synapse_model')) models += 1;
      }
      if (![weights, delays, models].every((count) => count === 0 || count === edges.length)) return false;
      if ((weights > 0) !== (typeof weightUnits === 'string')) return false;
      if ((delays > 0) !== (delayUnits === 'ms')) return false;
      return samplePolicy === 'complete'
        ? sourceCount === edges.length
        : samplePolicy === 'deterministic_even_stride' && edges.length > 0 && sourceCount > edges.length;
    }
    case 'legacy_connection_channels': {
      const hasWeights = resolvePath(params, constraint.paths[0]).length > 0;
      const hasWeightUnits = resolvePath(params, constraint.paths[1]).length > 0;
      const hasDelays = resolvePath(params, constraint.paths[2]).length > 0;
      const hasDelayUnits = resolvePath(params, constraint.paths[3]).length > 0;
      if (hasWeights !== hasWeightUnits || hasDelays !== hasDelayUnits) return false;
      return !hasDelays || sequences[2].every(
        (delay) => typeof delay === 'number' && Number.isFinite(delay) && delay > 0,
      );
    }
    case 'matrix_connection_counts': {
      const sourceIds = sequences[0];
      const targetIds = sequences[1];
      const cells = sequences[2];
      const total = sequences[3][0];
      const aggregation = sequences[4][0];
      if (
        new Set(sourceIds).size !== sourceIds.length ||
        new Set(targetIds).size !== targetIds.length ||
        typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0
      ) return false;
      const sources = new Set(sourceIds);
      const targets = new Set(targetIds);
      const pairs = new Set<string>();
      let sum = 0;
      for (const raw of cells) {
        const cell = asRecord(raw);
        const count = cell?.connection_count;
        if (!cell || !sources.has(cell.source_id) || !targets.has(cell.target_id) ||
            typeof count !== 'number' || !Number.isSafeInteger(count) || count <= 0 ||
            (aggregation === 'single_connection' && count !== 1)) return false;
        const pair = JSON.stringify([cell.source_id, cell.target_id]);
        if (pairs.has(pair)) return false;
        pairs.add(pair);
        sum += count;
        if (!Number.isSafeInteger(sum)) return false;
      }
      return sum === total;
    }
    case 'degree_distribution_consistency': {
      const degrees = sequences[0];
      const counts = sequences[1];
      const values = sequences[2];
      const nodeCount = sequences[3][0];
      const connectionCount = sequences[4][0];
      const normalization = sequences[6][0];
      const valueUnits = sequences[7][0];
      const edgeCounting = sequences[8][0];
      const zeroPolicy = sequences[9][0];
      const absoluteTolerance = constraint.absoluteTolerance ?? 0;
      const relativeTolerance = constraint.relativeTolerance ?? 0;
      if (
        degrees.length === 0 || counts.length !== degrees.length || values.length !== degrees.length ||
        typeof nodeCount !== 'number' || !Number.isSafeInteger(nodeCount) || nodeCount <= 0 ||
        typeof connectionCount !== 'number' || !Number.isSafeInteger(connectionCount) || connectionCount < 0 ||
        edgeCounting !== 'each_synapse_collection_entry' || zeroPolicy !== 'include_declared_universe' ||
        valueUnits !== (normalization === 'count' ? 'count' : 'probability')
      ) return false;
      let nodes = 0;
      let connections = 0;
      let displayedMass = 0;
      for (let index = 0; index < degrees.length; index++) {
        const count = counts[index];
        const value = values[index];
        if (degrees[index] !== index || typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 ||
            typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false;
        nodes += count;
        connections += index * count;
        const expected = normalization === 'count' ? count : count / nodeCount;
        if (normalization === 'count') {
          if (!Number.isSafeInteger(value) || value !== expected) return false;
        } else if (!portableApproximatelyEqual(
          value, expected, absoluteTolerance, relativeTolerance,
        )) return false;
        displayedMass += value;
      }
      return Number.isSafeInteger(nodes) && Number.isSafeInteger(connections) &&
        nodes === nodeCount && connections === connectionCount &&
        (normalization !== 'probability' || portableApproximatelyEqual(
          displayedMass, 1, absoluteTolerance, relativeTolerance,
        ));
    }
    case 'delay_distribution_consistency': {
      const centers = sequences[0];
      const counts = sequences[1];
      const values = sequences[2];
      const width = sequences[3][0];
      const connectionCount = sequences[4][0];
      const normalization = sequences[5][0];
      const valueUnits = sequences[6][0];
      const delayUnits = sequences[7][0];
      const aggregation = sequences[8][0];
      const binning = sequences[9][0];
      const absoluteTolerance = constraint.absoluteTolerance ?? 0;
      const relativeTolerance = constraint.relativeTolerance ?? 0;
      if (
        centers.length === 0 || counts.length !== centers.length || values.length !== centers.length ||
        typeof width !== 'number' || !Number.isFinite(width) || width <= 0 ||
        typeof connectionCount !== 'number' || !Number.isSafeInteger(connectionCount) || connectionCount < 0 ||
        delayUnits !== 'ms' || aggregation !== 'each_connection' || binning !== 'left_closed_right_open'
      ) return false;
      const expectedUnits = normalization === 'count' ? 'count' : normalization === 'probability' ? 'probability' : '1/ms';
      if (valueUnits !== expectedUnits || (connectionCount === 0 && normalization !== 'count')) return false;
      const densityDenominator = connectionCount * width;
      if (normalization === 'probability_density' &&
          (!Number.isFinite(densityDenominator) || densityDenominator <= 0)) return false;
      let total = 0;
      let displayedMass = 0;
      for (let index = 0; index < counts.length; index++) {
        const count = counts[index];
        const displayed = values[index];
        if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 ||
            typeof displayed !== 'number' || !Number.isFinite(displayed) || displayed < 0) return false;
        total += count;
        const expected = normalization === 'count'
          ? count
          : normalization === 'probability'
            ? count / connectionCount
            : count / densityDenominator;
        if (normalization === 'count') {
          if (!Number.isSafeInteger(displayed) || displayed !== expected) return false;
        } else if (!Object.is(displayed, expected)) return false;
        displayedMass += displayed;
      }
      if (!Number.isSafeInteger(total) || total !== connectionCount) return false;
      if (normalization === 'probability') {
        return portableApproximatelyEqual(
          displayedMass, 1, absoluteTolerance, relativeTolerance,
        );
      }
      if (normalization === 'probability_density') {
        return portableApproximatelyEqual(
          displayedMass * width, 1, absoluteTolerance, relativeTolerance,
        );
      }
      return true;
    }
    case 'spatial_extent_bounds': {
      const nodes = sequences[0];
      const extent = sequences[1];
      const center = sequences[2];
      const absoluteTolerance = constraint.absoluteTolerance ?? 0;
      const relativeTolerance = constraint.relativeTolerance ?? 0;
      const roundoffUlps = constraint.roundoffUlps ?? 0;
      const maxRoundoffFraction = constraint.maxRoundoffFraction ?? 0;
      if (extent.length !== 2 || center.length !== 2) return false;
      const halfWidth = (extent[0] as number) / 2;
      const halfHeight = (extent[1] as number) / 2;
      const minX = (center[0] as number) - halfWidth;
      const maxX = (center[0] as number) + halfWidth;
      const minY = (center[1] as number) - halfHeight;
      const maxY = (center[1] as number) + halfHeight;
      if (!(minX < maxX) || !(minY < maxY)) return false;
      if (!Number.isFinite(maxRoundoffFraction) || maxRoundoffFraction < 0) return false;
      const axisTolerance = (
        axisCenter: number,
        halfExtent: number,
        minimum: number,
        maximum: number,
      ) => {
        const arithmeticTolerance = roundoffUlps * Number.EPSILON * Math.max(
          Math.abs(axisCenter), Math.abs(halfExtent), Math.abs(minimum), Math.abs(maximum),
        );
        const boundedArithmeticTolerance = arithmeticTolerance <=
          maxRoundoffFraction * Math.abs(halfExtent)
          ? arithmeticTolerance
          : 0;
        return absoluteTolerance + relativeTolerance * Math.abs(halfExtent) +
          boundedArithmeticTolerance;
      };
      const xTolerance = axisTolerance(
        center[0] as number, halfWidth, minX, maxX,
      );
      const yTolerance = axisTolerance(
        center[1] as number, halfHeight, minY, maxY,
      );
      const ids = new Set<unknown>();
      for (const raw of nodes) {
        const node = asRecord(raw);
        if (!node || ids.has(node.id) || typeof node.x !== 'number' || typeof node.y !== 'number') return false;
        ids.add(node.id);
        if (node.x < minX - xTolerance || node.x > maxX + xTolerance ||
            node.y < minY - yTolerance || node.y > maxY + yTolerance) return false;
      }
      return true;
    }
    case 'scope_compatibility': {
      const scope = asRecord(sequences[0][0]);
      const direction = sequences[1]?.[0];
      if (!scope || typeof scope.kind !== 'string') return false;
      if (scope.kind === 'single_process_complete') return true;
      if (scope.kind === 'mpi_all_ranks_merged') {
        return typeof scope.world_size === 'number' && Number.isSafeInteger(scope.world_size) && scope.world_size > 0;
      }
      if (scope.kind === 'mpi_target_rank_local' || scope.kind === 'mpi_rank_local') {
        return direction !== 'out' &&
          typeof scope.rank === 'number' && Number.isSafeInteger(scope.rank) &&
          scope.rank >= 0 && !Object.is(scope.rank, -0) &&
          typeof scope.world_size === 'number' && Number.isSafeInteger(scope.world_size) &&
          scope.world_size > 0 && scope.rank < scope.world_size;
      }
      return false;
    }
    case 'acyclic': {
      const ids = sequences[0];
      const parents = sequences[1];
      const parentById = new Map(ids.map((id, index) => [id, parents[index]]));
      return ids.every((id) => {
        const seen = new Set<unknown>();
        let cursor: unknown = id;
        while (cursor !== null && parentById.has(cursor)) {
          if (seen.has(cursor)) return false;
          seen.add(cursor);
          cursor = parentById.get(cursor);
        }
        return true;
      });
    }
  }
}

function portableInvocationPolicyPass(
  manifest: SkillsManifest,
  skill: SkillManifestEntry,
  payload: Record<string, unknown>,
): boolean {
  if (payload.skill !== skill.id) return false;
  if (skill.scene === null) {
    if (Object.hasOwn(payload, 'scene')) return false;
    if (payload.rendererRoute !== undefined && !skill.rendererRoutes.includes(String(payload.rendererRoute))) {
      return false;
    }
  } else if (payload.scene !== skill.scene || Object.hasOwn(payload, 'rendererRoute')) {
    return false;
  }
  const provenance = asRecord(payload.provenance);
  for (const [flag, expected] of Object.entries(skill.requiredProvenanceFlags)) {
    if (provenance?.[flag] !== expected) return false;
  }
  const declared = asRecord(provenance?.declared_inputs) ?? {};
  if (Object.keys(declared).some((key) => !manifest.provenanceKeys.includes(key))) return false;
  if (skill.requiredProvenanceKeys.some((key) => !Object.hasOwn(declared, key))) return false;
  for (const [key, value] of Object.entries(declared)) {
    const constraint = manifest.provenanceValueConstraints[
      key as keyof typeof manifest.provenanceValueConstraints
    ];
    if (!constraint) return false;
    switch (constraint.kind) {
      case 'positive_finite_number':
        if (!(typeof value === 'number' && Number.isFinite(value) && value > 0)) return false;
        break;
      case 'nonnegative_finite_number':
        if (!(typeof value === 'number' && Number.isFinite(value) && value >= 0 && !Object.is(value, -0))) return false;
        break;
      case 'literal_true':
        if (value !== true) return false;
        break;
      case 'nonnegative_safe_integer_or_nonblank_string':
        if (!(
          (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0)) ||
          (typeof value === 'string' && value.trim().length > 0)
        )) return false;
        break;
      case 'string':
        if (typeof value !== 'string') return false;
        break;
      case 'nonblank_string':
        if (!(typeof value === 'string' && value.trim().length > 0)) return false;
        break;
    }
  }
  for (const constraint of skill.provenanceParamConstraints) {
    const actual = declared[constraint.provenanceKey];
    const expected = constraint.kind === 'equals_literal'
      ? constraint.value
      : constraint.kind === 'equals_param_path'
        ? resolvePath(asRecord(payload.params), constraint.paramPath)[0]
        : asRecord(payload.params)?.[constraint.paramKey];
    if (!Object.is(actual, expected)) return false;
  }
  return true;
}

const here = dirname(fileURLToPath(import.meta.url));
const distManifest = join(here, '..', 'dist', 'skills.manifest.json');

describe('skills manifest', () => {
  it('covers every skill id', () => {
    const m = buildManifest();
    expect(m.skillAxisVersion).toBe('1.6.0');
    expect(m.specVersion).toBe('1.3.0');
    expect(m.skills).toHaveLength(26);
    expect(m.skills.map((s) => s.id).sort()).toEqual([...NEST_SKILL_IDS].sort());
  });

  it('publishes isolated lifecycle, routing, and raw-transform discovery metadata', () => {
    const manifest = buildManifest();
    expect(manifest.routingDiscriminators).toEqual(ROUTING_DISCRIMINATORS);
    expect(Object.values(manifest.routingDiscriminators.get_connections)).not.toContain(
      'nest.connectivity_matrix',
    );
    expect(Object.values(manifest.routingDiscriminators.get_position)).not.toContain(
      'nest.spatial_2d',
    );

    const byId = Object.fromEntries(manifest.skills.map((skill) => [skill.id, skill]));
    expect(byId['nest.connectivity_matrix']).toMatchObject({
      deprecation: { replacement: 'nest.connection_graph' },
      routerEligibility: { bareFamilyCandidate: false },
    });
    expect(byId['nest.spatial_2d']).toMatchObject({
      deprecation: { replacement: 'nest.spatial_map_2d' },
      routerEligibility: { bareFamilyCandidate: false },
    });
    const transformed = manifest.skills.filter((skill) => skill.transform);
    expect(transformed).toHaveLength(8);
    for (const skill of transformed) {
      expect(skill.transform!.outputSkill).toBe(skill.id);
      expect(skill.transform!.rawFields.length).toBeGreaterThan(0);
      expect(skill.transform!.requiredOptions.length).toBeGreaterThan(0);
    }

    transformed[0].transform!.rawFields.push('mutated');
    manifest.routingDiscriminators.get_connections.connection_graph = 'mutated';
    const fresh = buildManifest();
    expect(
      fresh.skills.find((skill) => skill.id === transformed[0].id)!.transform!.rawFields,
    ).not.toContain('mutated');
    expect(fresh.routingDiscriminators.get_connections.connection_graph).toBe(
      'nest.connection_graph',
    );
  });

  it('every non-null scene is a real SceneName', () => {
    for (const s of buildManifest().skills) {
      if (s.scene !== null) expect(SCENE_NAMES).toContain(s.scene as never);
    }
  });

  it('publishes a param schema for every skill, including host-rendered skills', () => {
    for (const skill of buildManifest().skills) {
      expect(skill.paramsJsonSchema, skill.id).toBeDefined();
      expect(
        (skill.paramsJsonSchema?.required as string[] | undefined)?.sort(),
        skill.id,
      ).toEqual([...skill.requiredInputKeys].sort());
      expect(skill.paramsJsonSchema?.additionalProperties, skill.id).toBe(false);
    }
  });

  it('publishes portable constraints for cross-field refinements', () => {
    const byId = Object.fromEntries(buildManifest().skills.map((skill) => [skill.id, skill]));
    expect(byId['nest.spike_raster'].paramConstraints).toContainEqual(
      expect.objectContaining({ kind: 'equal_length' }),
    );
    for (const id of [
      'nest.isi_distribution',
      'nest.psth',
      'nest.weight_histogram',
    ]) {
      expect(byId[id].paramConstraints.map((constraint) => constraint.kind)).toEqual(
        expect.arrayContaining([
          'equal_length',
          'monotonic_non_decreasing',
          'non_negative',
          'mapped_value',
          'conditional_numeric_domain',
          'uniform_histogram_bins',
        ]),
      );
    }
    for (const id of ['nest.isi_distribution', 'nest.weight_histogram']) {
      expect(byId[id].paramConstraints).toContainEqual(
        expect.objectContaining({ kind: 'normalized_histogram_mass' }),
      );
    }
    expect(byId['nest.psth'].paramConstraints).not.toContainEqual(
      expect.objectContaining({ kind: 'normalized_histogram_mass' }),
    );
    expect(byId['nest.psth'].paramConstraints).toContainEqual(
      expect.objectContaining({
        kind: 'psth_derived_counts',
        absoluteTolerance: 1e-6,
      }),
    );
    expect(byId['nest.population_rate'].paramConstraints.map((c) => c.kind)).toEqual(
      expect.arrayContaining([
        'each_length_matches',
        'unique_field',
        'ordered_interval',
        'uniform_bin_window',
        'population_rate_derived_values',
      ]),
    );
    expect(byId['nest.correlogram'].paramConstraints.map((c) => c.kind)).toEqual(
      expect.arrayContaining([
        'equal_length',
        'ordered_interval',
        'symmetric_lag_axis',
        'conditional_numeric_domain',
      ]),
    );
    expect(byId['nest.phase_plane'].paramConstraints).toContainEqual(
      expect.objectContaining({ kind: 'property_count', min: 2, max: 2 }),
    );
    expect(byId['corpus.knowledge_graph'].paramConstraints.map((c) => c.kind)).toEqual(
      expect.arrayContaining([
        'unique_field',
        'max_parallel_edges',
        'each_unique_field',
        'each_contains_field_value',
        'node_score_kind',
        'edge_score_kind',
        'references_exist',
        'no_self_loops',
      ]),
    );
    expect(byId['corpus.knowledge_graph'].paramConstraints).not.toContainEqual(
      expect.objectContaining({ kind: 'unique_tuple' }),
    );
  });

  it('freezes registry histogram rules and deep-clones them for discovery and manifests', () => {
    const registryConstraint = getSkill('nest.isi_distribution')!.paramConstraints!.find(
      (constraint) => constraint.kind === 'normalized_histogram_mass',
    )!;
    const registryRules = registryConstraint.normalizationRules!;
    expect(Object.isFrozen(registryRules)).toBe(true);
    expect(Object.isFrozen(registryRules.probability)).toBe(true);

    const discoveredConstraint = describeSkill('nest.isi_distribution')!.paramConstraints.find(
      (constraint) => constraint.kind === 'normalized_histogram_mass',
    )!;
    const manifestConstraint = buildManifest().skills
      .find((skill) => skill.id === 'nest.isi_distribution')!
      .paramConstraints.find((constraint) => constraint.kind === 'normalized_histogram_mass')!;
    expect(discoveredConstraint.normalizationRules).not.toBe(registryRules);
    expect(discoveredConstraint.normalizationRules?.probability).not.toBe(
      registryRules.probability,
    );
    expect(manifestConstraint.normalizationRules).not.toBe(registryRules);
    expect(manifestConstraint.normalizationRules?.probability).not.toBe(
      registryRules.probability,
    );
  });

  it('freezes and deep-clones spike-analysis domains and nested provenance bindings', () => {
    const correlogram = getSkill('nest.correlogram')!;
    const registryConstraint = correlogram.paramConstraints!.find(
      (constraint) => constraint.kind === 'conditional_numeric_domain',
    )!;
    const registryDomains = registryConstraint.numericDomains!;
    expect(Object.isFrozen(registryDomains)).toBe(true);
    expect(Object.isFrozen(registryDomains.raw_pair_count)).toBe(true);
    expect(Object.isFrozen(correlogram.provenanceParamConstraints)).toBe(true);
    expect(correlogram.provenanceParamConstraints!.some(
      (constraint) => constraint.kind === 'equals_param_path' &&
        constraint.paramPath === 'statistic.kind',
    )).toBe(true);
    for (const constraint of correlogram.provenanceParamConstraints!) {
      if (constraint.kind === 'equals_param_path') {
        expect(constraint.paramPath).toMatch(/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/);
        expect(constraint.paramPath.split('.')).not.toEqual(
          expect.arrayContaining(['__proto__', 'prototype', 'constructor']),
        );
      }
    }

    const discoveredConstraint = describeSkill('nest.correlogram')!.paramConstraints.find(
      (constraint) => constraint.kind === 'conditional_numeric_domain',
    )!;
    const manifestConstraint = buildManifest().skills
      .find((skill) => skill.id === 'nest.correlogram')!
      .paramConstraints.find((constraint) => constraint.kind === 'conditional_numeric_domain')!;
    expect(discoveredConstraint.numericDomains).not.toBe(registryDomains);
    expect(discoveredConstraint.numericDomains?.raw_pair_count).not.toBe(
      registryDomains.raw_pair_count,
    );
    expect(manifestConstraint.numericDomains).not.toBe(registryDomains);
    expect(manifestConstraint.numericDomains?.raw_pair_count).not.toBe(
      registryDomains.raw_pair_count,
    );

    const population = getSkill('nest.population_rate')!;
    expect(Object.isFrozen(population.paramConstraints)).toBe(true);
    expect(population.paramConstraints!.every(Object.isFrozen)).toBe(true);
  });

  it('freezes and deep-clones the knowledge-graph score-kind policy', () => {
    for (const [kind, sample] of [
      ['node_score_kind', 'paper'],
      ['edge_score_kind', 'cites'],
    ] as const) {
      const registryConstraint = getSkill('corpus.knowledge_graph')!.paramConstraints!.find(
        (constraint) => constraint.kind === kind,
      )!;
      const registryRules = registryConstraint.allowedScoreKinds!;
      expect(Object.isFrozen(registryRules)).toBe(true);
      expect(Object.isFrozen(registryRules[sample])).toBe(true);

      const discoveredConstraint = describeSkill('corpus.knowledge_graph')!.paramConstraints.find(
        (constraint) => constraint.kind === kind,
      )!;
      const manifestConstraint = buildManifest().skills
        .find((skill) => skill.id === 'corpus.knowledge_graph')!
        .paramConstraints.find((constraint) => constraint.kind === kind)!;
      expect(discoveredConstraint.allowedScoreKinds).not.toBe(registryRules);
      expect(discoveredConstraint.allowedScoreKinds?.[sample]).not.toBe(registryRules[sample]);
      expect(manifestConstraint.allowedScoreKinds).not.toBe(registryRules);
      expect(manifestConstraint.allowedScoreKinds?.[sample]).not.toBe(registryRules[sample]);
    }
  });

  it('freezes and deep-clones graph evidence anchors and required provenance flags', () => {
    const contract = getSkill('corpus.knowledge_graph')!;
    const registryConstraint = contract.paramConstraints!.find(
      (constraint) => constraint.kind === 'each_contains_field_value',
    )!;
    const registryAnchors = registryConstraint.allowedFieldValues!;
    expect(Object.isFrozen(registryAnchors)).toBe(true);
    expect(Object.isFrozen(contract.requiredProvenanceFlags)).toBe(true);

    const discovered = describeSkill('corpus.knowledge_graph')!;
    const discoveredAnchors = discovered.paramConstraints.find(
      (constraint) => constraint.kind === 'each_contains_field_value',
    )!.allowedFieldValues!;
    const manifest = buildManifest().skills.find(
      (skill) => skill.id === 'corpus.knowledge_graph',
    )!;
    const manifestAnchors = manifest.paramConstraints.find(
      (constraint) => constraint.kind === 'each_contains_field_value',
    )!.allowedFieldValues!;
    expect(discoveredAnchors).not.toBe(registryAnchors);
    expect(manifestAnchors).not.toBe(registryAnchors);
    expect(discovered.requiredProvenanceFlags).not.toBe(contract.requiredProvenanceFlags);
    expect(manifest.requiredProvenanceFlags).not.toBe(contract.requiredProvenanceFlags);
    expect(manifest.requiredProvenanceFlags).toEqual({
      advisory_only: true,
      is_paper_local_evidence: false,
    });
  });

  it('publishes the portable envelope, provenance, normalization, and constraint policies', () => {
    const manifest = buildManifest();
    expect(manifest.jsonLimits.maxDepth).toBeGreaterThan(0);
    expect(manifest.jsonExactnessPolicy.rejectAccessors).toBe(true);
    expect(manifest.jsonExactnessPolicy.duplicateObjectMemberNames).toBe(
      'reject before materialization',
    );
    expect(manifest.provenanceValueConstraints.sampling_interval).toEqual({
      kind: 'positive_finite_number',
    });
    expect(manifest.provenanceKeys).not.toContain('node_kinds');
    expect(manifest.provenanceKeys).not.toContain('edge_kinds');
    expect(Object.hasOwn(manifest.provenanceValueConstraints, 'node_kinds')).toBe(false);
    expect(Object.hasOwn(manifest.provenanceValueConstraints, 'edge_kinds')).toBe(false);
    expect(manifest.honestyPolicy.callerCaption).toBe('append_only_unverified');
    expect(manifest.honestyPolicy.callerCaptionLabel).toBe('Caller note (unverified):');
    expect(manifest.honestyPolicy.bidiIsolationRequired).toBe(true);
    expect(manifest.honestyPolicy.templates.synthetic).toMatch(/^Schematic/);
    expect(manifest.manifestVersion).toBe('8');
    expect(manifest.paramConstraintLanguage.version).toBe('8');
    expect(manifest.provenanceParamConstraintLanguage.version).toBe('2');
    expect(manifest.paramConstraintLanguage.semantics.references_exist).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.uniform_histogram_bins).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.normalized_histogram_mass).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.psth_derived_counts).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.max_parallel_edges).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.each_unique_field).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.each_contains_field_value).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.node_score_kind).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.edge_score_kind).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.ordered_interval).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.uniform_bin_window).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.population_rate_derived_values).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.symmetric_lag_axis).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.legacy_connection_channels).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.connection_graph_snapshot).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.matrix_connection_counts).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.degree_distribution_consistency).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.delay_distribution_consistency).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.spatial_extent_bounds).toBeDefined();
    expect(manifest.paramConstraintLanguage.semantics.scope_compatibility).toBeDefined();
    expect(manifest.provenanceParamConstraintLanguage.semantics.equals_param_path).toContain('dot-separated');
    expect(manifest.envelopeNormalizationPolicy.missingHonestyFlagsMustUseConservativeDefaults).toBe(true);
    expect(manifest.strictProvenancePolicy.unknownDeclaredInputKeys).toBe('reject');
    expect(manifest.strictInvocationPolicy.version).toBe('2');
    expect(manifest.strictInvocationPolicy.rendererRoute).toContain('contract.rendererRoutes');
    expect(manifest.strictInvocationPolicy.provenance).toContain('requiredProvenanceFlags');
    expect(manifest.numericModelPolicy.representation).toBe('IEEE-754 binary64');
    expect(manifest.stringNormalizationPolicy.lengthModel).toContain('UTF-16');
    expect(manifest.stringNormalizationPolicy.trimCodePointsHex).toContain('FEFF');
    expect(manifest.stringNormalizationPolicy.trimCodePointsHex).not.toContain('0085');
    const displayPattern = new RegExp(
      manifest.stringNormalizationPolicy.displayStringPattern,
      'u',
    );
    expect(displayPattern.test('paper label')).toBe(true);
    expect(displayPattern.test('paper\u202elabel')).toBe(false);
    expect(manifest.stringNormalizationPolicy.displayStringControls).toContain('bidi');
    expect(manifest.jsonBudgetSemantics.scope).toContain('complete invocation');
    expect(manifest.paletteRegistryPolicy.runtimeExtensionsAllowed).toBe(true);
    expect(manifest.vizSpecJsonSchema).toBeDefined();
    expect(manifest.hostRendererInvocationJsonSchema).toBeDefined();

    const voltage = manifest.skills.find((skill) => skill.id === 'nest.voltage_trace')!;
    const units = (
      voltage.paramsJsonSchema?.properties as Record<string, Record<string, unknown>>
    ).units;
    expect(new RegExp(units.pattern as string, 'u').test('mV')).toBe(true);
    expect(new RegExp(units.pattern as string, 'u').test('mV\u202e')).toBe(false);
    expect(units['x-cortexel-normalize']).toBe('trim');
    expect(manifest.vizSpecJsonSchema.required).toEqual(['scene', 'provenance']);
    const vizParams = (
      manifest.vizSpecJsonSchema.properties as Record<string, Record<string, unknown>>
    ).params;
    expect(vizParams.type).toBe('object');
    const declared = (((
      manifest.vizSpecJsonSchema.properties as Record<string, Record<string, unknown>>
    ).provenance.properties as Record<string, Record<string, unknown>>).declared_inputs);
    expect(declared.type).toBe('object');
    expect(declared.propertyNames).toBeDefined();
    expect(declared.additionalProperties).toBeDefined();
  });

  it('passes every worked envelope and params schema through independent draft-2020-12 validation', () => {
    const manifest = buildManifest();
    const ajv = portableAjv();
    const validateViz = ajv.compile(structuredClone(manifest.vizSpecJsonSchema));
    const validateHost = ajv.compile(
      structuredClone(manifest.hostRendererInvocationJsonSchema),
    );
    for (const skill of manifest.skills) {
      const payload = structuredClone(skill.examplePayload) as Record<string, unknown>;
      const validateParams = ajv.compile(structuredClone(skill.paramsJsonSchema!));
      expect(validateParams(payload.params), `${skill.id}: ${ajv.errorsText(validateParams.errors)}`).toBe(true);
      const validateEnvelope = skill.scene === null ? validateHost : validateViz;
      expect(validateEnvelope(payload), `${skill.id}: ${ajv.errorsText(validateEnvelope.errors)}`).toBe(true);
    }
  });

  it('independently rejects the portable tuple/envelope shapes Zod rejects', () => {
    const manifest = buildManifest();
    const ajv = portableAjv();
    const spatial = manifest.skills.find((skill) => skill.id === 'nest.spatial_2d')!;
    const validateSpatial = ajv.compile(structuredClone(spatial.paramsJsonSchema!));
    expect(validateSpatial({ positions: [[0]] })).toBe(false);
    expect(validateSpatial({ positions: [[0, 1, 2]] })).toBe(false);

    const validateViz = ajv.compile(structuredClone(manifest.vizSpecJsonSchema));
    expect(validateViz({
      scene: 'spike-raster',
      params: 42,
      provenance: { source: 'x' },
    })).toBe(false);
    expect(validateViz({
      scene: 'spike-raster',
      params: {},
      provenance: { source: '😀'.repeat(150) },
    })).toBe(false);
    expect(validateViz({
      scene: 'spike-raster',
      params: {},
      provenance: {
        source: 'x',
        declared_inputs: { population_labels: 'E\u202espoof' },
      },
    })).toBe(false);

    const graph = manifest.skills.find((skill) => skill.id === 'corpus.knowledge_graph')!;
    const validateGraph = ajv.compile(structuredClone(graph.paramsJsonSchema!));
    const graphParams = structuredClone(
      (graph.examplePayload as { params: Record<string, unknown> }).params,
    );
    (graphParams.nodes as Array<Record<string, unknown>>)[0].label = 'Paper\u202espoof';
    expect(validateGraph(graphParams)).toBe(false);

    const nakedConfidence = structuredClone(
      (graph.examplePayload as { params: Record<string, unknown> }).params,
    );
    (nakedConfidence.edges as Array<Record<string, unknown>>)[0].confidence = 0.9;
    expect(validateGraph(nakedConfidence)).toBe(false);

    const calibratedScore = structuredClone(
      (graph.examplePayload as { params: Record<string, unknown> }).params,
    );
    (calibratedScore.edges as Array<Record<string, unknown>>)[1].uncalibrated_score = {
      kind: 'structural_similarity',
      value: 0.72,
      calibrated_posterior: true,
    };
    expect(validateGraph(calibratedScore)).toBe(false);

    const missingEvidence = structuredClone(
      (graph.examplePayload as { params: Record<string, unknown> }).params,
    );
    (missingEvidence.edges as Array<Record<string, unknown>>)[0].evidence = [];
    expect(validateGraph(missingEvidence)).toBe(false);

    const invalidGeneratedAt = structuredClone(
      (graph.examplePayload as { params: Record<string, unknown> }).params,
    );
    invalidGeneratedAt.generated_at = '2026-07-11T12:00:00';
    expect(validateGraph(invalidGeneratedAt)).toBe(false);

    const psth = manifest.skills.find((skill) => skill.id === 'nest.psth')!;
    const validatePsth = ajv.compile(structuredClone(psth.paramsJsonSchema!));
    expect(validatePsth({
      bin_centers_ms: [0],
      values: [1],
      bin_width_ms: 0,
      normalization: 'count',
      value_units: 'count',
      trial_count: 1,
      alignment_event: 'onset',
      aggregation: 'selected_senders_per_trial',
    })).toBe(false);
    expect(validatePsth({
      bin_centers_ms: [0],
      values: [1],
      bin_width_ms: 1,
      normalization: 'count',
      value_units: 'count',
      trial_count: 0,
      alignment_event: 'onset',
      aggregation: 'selected_senders_per_trial',
    })).toBe(false);

    const weights = manifest.skills.find((skill) => skill.id === 'nest.weight_histogram')!;
    const validateWeights = ajv.compile(structuredClone(weights.paramsJsonSchema!));
    expect(validateWeights({
      bin_centers: [0],
      values: [1],
      bin_width: Number.MAX_VALUE,
      weight_units: 'pA',
      normalization: 'count',
      value_units: 'count',
      snapshot_time_ms: 0,
    })).toBe(false);

    const defaulted: Record<string, unknown> = {
      scene: 'spike-raster',
      provenance: { source: 'x' },
    };
    expect(validateViz(defaulted)).toBe(true);
    expect(defaulted).toMatchObject({
      params: {},
      mode: 'interactive',
      themeMode: 'dark',
      provenance: {
        calibrated_posterior: false,
        advisory_only: true,
        is_paper_local_evidence: false,
        synthetic: false,
      },
    });
  });

  it('executes every portable constraint kind and strict invocation correlation policy', () => {
    const manifest = buildManifest();
    for (const skill of manifest.skills) {
      const payload = structuredClone(skill.examplePayload) as Record<string, unknown>;
      const params = asRecord(payload.params)!;
      expect(portableInvocationPolicyPass(manifest, skill, payload), skill.id).toBe(true);
      for (const constraint of skill.paramConstraints) {
        expect(
          portableConstraintPass(constraint, params),
          `${skill.id}:${constraint.kind}`,
        ).toBe(true);
      }
    }

    const rejectConstraint = (
      skillId: string,
      kind: ParamValidationConstraint['kind'],
      mutate: (params: Record<string, unknown>) => void,
      firstPath?: string,
    ) => {
      const skill = manifest.skills.find((entry) => entry.id === skillId)!;
      const constraint = skill.paramConstraints.find(
        (entry) => entry.kind === kind &&
          (firstPath === undefined || entry.paths[0] === firstPath),
      )!;
      const params = structuredClone(
        (skill.examplePayload as { params: Record<string, unknown> }).params,
      );
      mutate(params);
      expect(portableConstraintPass(constraint, params), `${skillId}:${kind}`).toBe(false);
    };

    rejectConstraint('nest.spike_raster', 'equal_length', (params) => {
      params.senders = [];
    });
    rejectConstraint('nest.isi_distribution', 'equal_length', (params) => {
      params.values = [1];
    });
    rejectConstraint('nest.isi_distribution', 'monotonic_non_decreasing', (params) => {
      params.bin_centers_ms = [2, 1, 0];
    });
    rejectConstraint('nest.isi_distribution', 'non_negative', (params) => {
      params.bin_centers_ms = [-1, 0, 1];
    });
    rejectConstraint('nest.isi_distribution', 'mapped_value', (params) => {
      params.value_units = 'probability';
    });
    rejectConstraint('nest.isi_distribution', 'conditional_numeric_domain', (params) => {
      params.values = [0.5, 1, 2];
    });
    rejectConstraint('nest.isi_distribution', 'uniform_histogram_bins', (params) => {
      params.bin_centers_ms = [0.5, 0.5, 1.5];
    });
    rejectConstraint('nest.isi_distribution', 'uniform_histogram_bins', (params) => {
      params.bin_centers_ms = [0.5, 1.5, 3.5];
    });
    rejectConstraint('nest.isi_distribution', 'uniform_histogram_bins', (params) => {
      params.bin_width_ms = 0.5;
    });
    rejectConstraint('nest.isi_distribution', 'uniform_histogram_bins', (params) => {
      params.bin_centers_ms = [0.25, 1.25, 2.25];
    });
    rejectConstraint('nest.isi_distribution', 'uniform_histogram_bins', (params) => {
      params.bin_centers_ms = [5e-13, 1.0005e-9];
      params.bin_width_ms = 1e-12;
    });
    rejectConstraint('nest.isi_distribution', 'conditional_numeric_domain', (params) => {
      params.normalization = 'probability';
      params.value_units = 'probability';
      params.values = [1.1, 0, 0];
    });
    rejectConstraint('nest.isi_distribution', 'normalized_histogram_mass', (params) => {
      params.normalization = 'probability';
      params.value_units = 'probability';
      params.values = [0.2, 0.2, 0.2];
    });
    rejectConstraint('nest.isi_distribution', 'normalized_histogram_mass', (params) => {
      params.normalization = 'probability_density';
      params.value_units = '1/ms';
      params.values = [0.2, 0.2, 0.2];
    });
    rejectConstraint('nest.psth', 'conditional_numeric_domain', (params) => {
      params.normalization = 'count';
      params.value_units = 'count';
      params.values = [0.5, 1, 2];
    });
    rejectConstraint('nest.psth', 'uniform_histogram_bins', (params) => {
      params.bin_centers_ms = [-5, -5, 0];
    });
    rejectConstraint('nest.psth', 'uniform_histogram_bins', (params) => {
      params.bin_centers_ms = [-5, 0, 10];
    });
    rejectConstraint('nest.psth', 'uniform_histogram_bins', (params) => {
      params.bin_width_ms = 2;
    });
    rejectConstraint('nest.psth', 'uniform_histogram_bins', (params) => {
      params.bin_centers_ms = [0, 1e-9];
      params.bin_width_ms = 1e-12;
    });
    rejectConstraint('nest.psth', 'psth_derived_counts', (params) => {
      params.normalization = 'count_per_trial';
      params.value_units = 'count/trial';
      params.trial_count = 3;
      params.values = [0.1, 2 / 3, 1];
    });
    rejectConstraint('nest.psth', 'psth_derived_counts', (params) => {
      params.normalization = 'rate_hz';
      params.value_units = 'Hz';
      params.bin_width_ms = 5;
      params.trial_count = 10;
      params.values = [1, 40, 60];
    });
    rejectConstraint('nest.psth', 'psth_derived_counts', (params) => {
      params.normalization = 'count';
      params.value_units = 'count';
      params.values = [0.5, 1, 2];
    });
    rejectConstraint('nest.psth', 'psth_derived_counts', (params) => {
      params.aggregation = 'mean_per_sender';
    });
    rejectConstraint('nest.weight_histogram', 'mapped_value', (params) => {
      params.value_units = 'probability';
    });
    rejectConstraint('nest.weight_histogram', 'conditional_numeric_domain', (params) => {
      params.values = [0.5, 1, 2, 3, 4];
    });
    rejectConstraint('nest.weight_histogram', 'uniform_histogram_bins', (params) => {
      params.bin_centers = [-2, -1, -1, 0, 1];
    });
    rejectConstraint('nest.weight_histogram', 'uniform_histogram_bins', (params) => {
      params.bin_centers = [-2, -1, 0, 2, 3];
    });
    rejectConstraint('nest.weight_histogram', 'uniform_histogram_bins', (params) => {
      params.bin_width = 0.5;
    });
    rejectConstraint('nest.weight_histogram', 'uniform_histogram_bins', (params) => {
      params.bin_centers = [0, 1e-9];
      params.bin_width = 1e-12;
    });
    rejectConstraint('nest.weight_histogram', 'conditional_numeric_domain', (params) => {
      params.normalization = 'probability';
      params.value_units = 'probability';
      params.values = [1.1, 0, 0, 0, 0];
    });
    rejectConstraint('nest.weight_histogram', 'normalized_histogram_mass', (params) => {
      params.normalization = 'probability';
      params.value_units = 'probability';
      params.values = [0.1, 0.1, 0.1, 0.1, 0.1];
    });
    rejectConstraint('nest.voltage_trace', 'each_length_matches', (params) => {
      params.series = [[-65]];
    });
    rejectConstraint('nest.population_rate', 'each_length_matches', (params) => {
      (params.series as Array<Record<string, unknown>>)[0].spike_counts = [1];
    }, 'series[*].spike_counts');
    rejectConstraint('nest.population_rate', 'unique_field', (params) => {
      const series = params.series as Array<Record<string, unknown>>;
      series.push(structuredClone(series[0]));
    });
    rejectConstraint('nest.population_rate', 'ordered_interval', (params) => {
      params.window_stop_ms = params.window_start_ms;
    });
    rejectConstraint('nest.population_rate', 'uniform_bin_window', (params) => {
      params.window_stop_ms = 14;
    });
    rejectConstraint('nest.population_rate', 'population_rate_derived_values', (params) => {
      (params.series as Array<Record<string, unknown>>)[0].rates_hz = [101, 400, 200];
    });
    rejectConstraint('nest.correlogram', 'equal_length', (params) => {
      params.values = [1];
    });
    rejectConstraint('nest.correlogram', 'symmetric_lag_axis', (params) => {
      params.lags_ms = [-2, -1, 0, 1, 1.5];
    });
    rejectConstraint('nest.correlogram', 'ordered_interval', (params) => {
      params.counting_stop_ms = params.counting_start_ms;
    });
    rejectConstraint('nest.correlogram', 'conditional_numeric_domain', (params) => {
      params.values = [Number.MAX_SAFE_INTEGER + 1, 4, 10, 4, 1];
    });
    rejectConstraint('nest.rate_response', 'non_negative', (params) => {
      params.rates_hz = [-1, 0, 1];
    });
    rejectConstraint('nest.connectivity_matrix', 'legacy_connection_channels', (params) => {
      delete params.weight_units;
    });
    rejectConstraint('nest.connectivity_matrix', 'legacy_connection_channels', (params) => {
      params.delays = [1, 0];
      params.delay_units = 'ms';
    });
    rejectConstraint('nest.connection_graph', 'connection_graph_snapshot', (params) => {
      (params.edges as Array<Record<string, unknown>>)[0].source = 999;
    });
    rejectConstraint('nest.connection_graph', 'connection_graph_snapshot', (params) => {
      delete (params.edges as Array<Record<string, unknown>>)[0].weight;
    });
    rejectConstraint('nest.connection_graph', 'connection_graph_snapshot', (params) => {
      params.source_connection_count = 3;
    });
    rejectConstraint('nest.connection_graph', 'connection_graph_snapshot', (params) => {
      (params.edges as Array<Record<string, unknown>>)[0].id = 'not-a-canonical-id';
    });
    rejectConstraint('nest.connection_graph', 'connection_graph_snapshot', (params) => {
      (params.edges as Array<Record<string, unknown>>)[0].id = 'connection:2';
    });
    rejectConstraint('nest.connection_graph', 'connection_graph_snapshot', (params) => {
      params.edge_identity = 'nest_connection_identifier';
      const edges = params.edges as Array<Record<string, unknown>>;
      edges[0].id = 'connection:9:2:0:1:0';
      edges[1].id = 'connection:1:2:0:2:0';
    });
    rejectConstraint('nest.adjacency_matrix', 'matrix_connection_counts', (params) => {
      const cells = params.cells as Array<Record<string, unknown>>;
      cells.push(structuredClone(cells[0]));
      params.connection_count = 4;
    });
    rejectConstraint('nest.adjacency_matrix', 'matrix_connection_counts', (params) => {
      (params.cells as Array<Record<string, unknown>>)[0].target_id = 999;
    });
    rejectConstraint('nest.adjacency_matrix', 'matrix_connection_counts', (params) => {
      (params.cells as Array<Record<string, unknown>>)[0].connection_count = 0;
      params.connection_count = 0;
    });
    rejectConstraint('nest.adjacency_matrix', 'matrix_connection_counts', (params) => {
      params.connection_count = 3;
    });
    rejectConstraint('nest.weight_matrix', 'matrix_connection_counts', (params) => {
      params.aggregation = 'single_connection';
    });
    rejectConstraint('nest.delay_matrix', 'matrix_connection_counts', (params) => {
      params.aggregation = 'single_connection';
    });
    rejectConstraint('nest.in_degree_distribution', 'degree_distribution_consistency', (params) => {
      params.degrees = [0, 2, 3];
    });
    rejectConstraint('nest.in_degree_distribution', 'degree_distribution_consistency', (params) => {
      params.values = [1, 0, 0];
    });
    rejectConstraint('nest.in_degree_distribution', 'degree_distribution_consistency', (params) => {
      params.normalization = 'probability';
      params.value_units = 'probability';
      params.values = [0.5, -1e-12, 0.5];
    });
    rejectConstraint('nest.in_degree_distribution', 'degree_distribution_consistency', (params) => {
      params.normalization = 'probability';
      params.value_units = 'probability';
      params.values = [0.5 + 1e-12, 1e-12, 0.5 + 1e-12];
    });
    rejectConstraint('nest.delay_distribution', 'uniform_bin_window', (params) => {
      params.window_stop_ms = 4;
    });
    rejectConstraint('nest.delay_distribution', 'uniform_bin_window', (params) => {
      const start = 1e9;
      params.bin_centers_ms = [start + 0.6, start + 1.6, start + 2.6];
      params.bin_width_ms = 1;
      params.window_start_ms = start;
      params.window_stop_ms = start + 3;
    });
    rejectConstraint('nest.delay_distribution', 'uniform_bin_window', (params) => {
      const start = 1e15;
      params.bin_centers_ms = [start + 0.75, start + 1.75, start + 2.75];
      params.bin_width_ms = 1;
      params.window_start_ms = start;
      params.window_stop_ms = start + 3;
    });
    rejectConstraint('nest.delay_distribution', 'delay_distribution_consistency', (params) => {
      params.values = [0, 0, 1];
    });
    rejectConstraint('nest.delay_distribution', 'delay_distribution_consistency', (params) => {
      params.normalization = 'probability';
      params.value_units = 'probability';
      params.values = [-1e-6, 0.5, 0.5];
    });
    rejectConstraint('nest.delay_distribution', 'delay_distribution_consistency', (params) => {
      params.normalization = 'probability';
      params.value_units = 'probability';
      params.values = [1e-6, 0.500001, 0.500001];
    });
    rejectConstraint('nest.delay_distribution', 'delay_distribution_consistency', (params) => {
      params.normalization = 'probability';
      params.value_units = 'probability';
      params.values = [0, 0.5000005, 0.4999995];
    });
    rejectConstraint('nest.delay_distribution', 'delay_distribution_consistency', (params) => {
      params.bin_centers_ms = [Number.MAX_VALUE / 2];
      params.delay_counts = [2];
      params.values = [0];
      params.bin_width_ms = Number.MAX_VALUE;
      params.connection_count = 2;
      params.normalization = 'probability_density';
      params.value_units = '1/ms';
    });
    rejectConstraint('nest.delay_distribution', 'delay_distribution_consistency', (params) => {
      params.delay_counts = [0, 0, 0];
      params.values = [0, 0, 0];
      params.connection_count = 0;
      params.normalization = 'probability';
      params.value_units = 'probability';
    });
    rejectConstraint('nest.spatial_map_2d', 'spatial_extent_bounds', (params) => {
      params.extent = [1e-12, 1e-12];
      params.center = [0, 0];
      const nodes = params.nodes as Array<Record<string, unknown>>;
      nodes[0].x = 0;
      nodes[0].y = 0;
      nodes[1].x = 6e-13;
      nodes[1].y = 0;
    });
    rejectConstraint('nest.spatial_map_2d', 'spatial_extent_bounds', (params) => {
      params.extent = [1e-3, 1e-3];
      params.center = [1e9, 1e9];
      const nodes = params.nodes as Array<Record<string, unknown>>;
      nodes[0].x = 1e9;
      nodes[0].y = 1e9;
      nodes[1].x = 1e9 + 0.1;
      nodes[1].y = 1e9;
    });
    rejectConstraint('nest.spatial_map_2d', 'spatial_extent_bounds', (params) => {
      params.extent = [1e-12, 1e-12];
      params.center = [1e9, 1e9];
      const nodes = params.nodes as Array<Record<string, unknown>>;
      for (const node of nodes) {
        node.x = 1e9;
        node.y = 1e9;
      }
    });
    rejectConstraint('nest.spatial_map_2d', 'spatial_extent_bounds', (params) => {
      params.extent = [1, 1];
      params.center = [1e15, 1e15];
      const nodes = params.nodes as Array<Record<string, unknown>>;
      nodes[0].x = 1e15;
      nodes[0].y = 1e15;
      nodes[1].x = 1e15 + 0.75;
      nodes[1].y = 1e15;
    });
    rejectConstraint('nest.spatial_map_2d', 'spatial_extent_bounds', (params) => {
      const nodes = params.nodes as Array<Record<string, unknown>>;
      nodes[1].id = nodes[0].id;
    });
    rejectConstraint('nest.adjacency_matrix', 'scope_compatibility', (params) => {
      params.snapshot_scope = { kind: 'mpi_target_rank_local', rank: 2, world_size: 2 };
    });
    rejectConstraint('nest.adjacency_matrix', 'scope_compatibility', (params) => {
      params.snapshot_scope = { kind: 'mpi_target_rank_local', rank: -0, world_size: 2 };
    });
    rejectConstraint('nest.out_degree_distribution', 'scope_compatibility', (params) => {
      params.snapshot_scope = { kind: 'mpi_target_rank_local', rank: 0, world_size: 2 };
    });
    rejectConstraint('nest.phase_plane', 'property_count', (params) => {
      delete (params.grid as Record<string, unknown>).w;
    });
    rejectConstraint('corpus.knowledge_graph', 'unique_field', (params) => {
      const nodes = params.nodes as Array<Record<string, unknown>>;
      nodes[1].id = nodes[0].id;
    }, 'nodes');
    rejectConstraint('corpus.knowledge_graph', 'unique_field', (params) => {
      const edges = params.edges as Array<Record<string, unknown>>;
      edges[1].id = edges[0].id;
    }, 'edges');
    rejectConstraint('corpus.knowledge_graph', 'max_parallel_edges', (params) => {
      const template = structuredClone(
        (params.edges as Array<Record<string, unknown>>)[1],
      );
      params.edges = Array.from({ length: 10 }, (_, index) => ({
        ...structuredClone(template),
        id: `parallel-${index}`,
        evidence: [{
          kind: 'graph_snapshot_record',
          evidence_id: `parallel-evidence-${index}`,
          record_id: `parallel-${index}`,
        }],
      }));
    });
    rejectConstraint('corpus.knowledge_graph', 'property_count', (params) => {
      const node = (params.nodes as Array<Record<string, unknown>>)[0];
      node.attributes = Object.fromEntries(
        Array.from({ length: 25 }, (_, index) => [`field_${index}`, index]),
      );
    }, 'nodes[*].attributes');
    rejectConstraint('corpus.knowledge_graph', 'each_unique_field', (params) => {
      const node = (params.nodes as Array<Record<string, unknown>>)[0];
      const evidence = node.evidence as Array<Record<string, unknown>>;
      evidence.push(structuredClone(evidence[0]));
    }, 'nodes[*].evidence');
    rejectConstraint('corpus.knowledge_graph', 'each_unique_field', (params) => {
      const edge = (params.edges as Array<Record<string, unknown>>)[0];
      const evidence = edge.evidence as Array<Record<string, unknown>>;
      evidence.push(structuredClone(evidence[0]));
    }, 'edges[*].evidence');
    rejectConstraint('corpus.knowledge_graph', 'each_contains_field_value', (params) => {
      const node = (params.nodes as Array<Record<string, unknown>>)[0];
      node.evidence = [{
        kind: 'graph_node',
        evidence_id: 'internal-node-link',
        node_id: node.id,
      }];
    }, 'nodes[*].evidence');
    rejectConstraint('corpus.knowledge_graph', 'each_contains_field_value', (params) => {
      const edge = (params.edges as Array<Record<string, unknown>>)[0];
      edge.evidence = [{
        kind: 'graph_node',
        evidence_id: 'internal-edge-link',
        node_id: edge.source,
      }];
    }, 'edges[*].evidence');
    rejectConstraint('corpus.knowledge_graph', 'references_exist', (params) => {
      (params.edges as Array<Record<string, unknown>>)[0].source = 'missing';
    }, 'edges[*].source');
    rejectConstraint('corpus.knowledge_graph', 'references_exist', (params) => {
      const node = (params.nodes as Array<Record<string, unknown>>)[0];
      node.evidence = [{
        kind: 'graph_node',
        evidence_id: 'missing-node-evidence',
        node_id: 'missing',
      }];
    }, 'nodes[*].evidence[*].node_id?');
    rejectConstraint('corpus.knowledge_graph', 'no_self_loops', (params) => {
      const edge = (params.edges as Array<Record<string, unknown>>)[0];
      edge.target = edge.source;
    });
    rejectConstraint('corpus.knowledge_graph', 'edge_score_kind', (params) => {
      const variant = (params.edges as Array<Record<string, unknown>>)[1];
      variant.uncalibrated_score = {
        kind: 'citation_resolution_confidence',
        value: 0.8,
        calibrated_posterior: false,
      };
    });
    rejectConstraint('corpus.knowledge_graph', 'node_score_kind', (params) => {
      const node = (params.nodes as Array<Record<string, unknown>>)[0];
      node.uncalibrated_score = {
        kind: 'retrieval_relevance',
        value: 0.8,
        calibrated_posterior: false,
      };
    });
    rejectConstraint('nest.phase_plane', 'same_keys', (params) => {
      delete (params.derivatives as Record<string, unknown>).w;
    });
    rejectConstraint('nest.phase_plane', 'cartesian_product_length', (params) => {
      (params.derivatives as Record<string, unknown>).v = [1];
    });
    rejectConstraint('nest.phase_plane', 'permutation_of_keys', (params) => {
      params.axis_order = ['v', 'v'];
    });
    rejectConstraint('corpus.knowledge_graph', 'endpoint_kinds', (params) => {
      (params.edges as Array<Record<string, unknown>>)[0] = {
        source: 'm1', target: 'f1', kind: 'cites',
      };
    });
    rejectConstraint('nest.compartmental_dynamics', 'acyclic', (params) => {
      params.compartments = [
        { id: 'a', parent_id: 'b', values: [1, 1, 1] },
        { id: 'b', parent_id: 'a', values: [1, 1, 1] },
      ];
    });

    const spike = manifest.skills.find((skill) => skill.id === 'nest.spike_raster')!;
    const wrongScene = structuredClone(spike.examplePayload) as Record<string, unknown>;
    wrongScene.scene = 'voltage-trace';
    expect(portableInvocationPolicyPass(manifest, spike, wrongScene)).toBe(false);
    const unknownClaim = structuredClone(spike.examplePayload) as Record<string, unknown>;
    (asRecord(asRecord(unknownClaim.provenance)?.declared_inputs)!).certified = true;
    expect(portableInvocationPolicyPass(manifest, spike, unknownClaim)).toBe(false);

    const graph = manifest.skills.find((skill) => skill.id === 'corpus.knowledge_graph')!;
    for (const [flag, value] of [
      ['advisory_only', false],
      ['is_paper_local_evidence', true],
    ] as const) {
      const contradicted = structuredClone(graph.examplePayload) as Record<string, unknown>;
      asRecord(contradicted.provenance)![flag] = value;
      expect(portableInvocationPolicyPass(manifest, graph, contradicted), flag).toBe(false);
    }

    const correlogram = manifest.skills.find((skill) => skill.id === 'nest.correlogram')!;
    for (const [key, value] of [
      ['reference_population', 'different reference'],
      ['target_population', 'different target'],
      ['correlation_normalization', 'pearson_coefficient'],
      ['correlation_units', 'Hz'],
    ] as const) {
      const contradicted = structuredClone(correlogram.examplePayload) as Record<string, unknown>;
      asRecord(asRecord(contradicted.provenance)?.declared_inputs)![key] = value;
      expect(portableInvocationPolicyPass(manifest, correlogram, contradicted), key).toBe(false);
    }

    const host = manifest.skills.find((skill) => skill.id === 'nest.spatial_2d')!;
    const wrongRoute = structuredClone(host.examplePayload) as Record<string, unknown>;
    wrongRoute.rendererRoute = 'fiber';
    expect(portableInvocationPolicyPass(manifest, host, wrongRoute)).toBe(false);
  });

  it('publishes a complete, self-describing example envelope for every skill', () => {
    for (const skill of buildManifest().skills) {
      expect(skill.examplePayload, skill.id).toMatchObject({ skill: skill.id });
      expect((skill.examplePayload as { params?: unknown }).params).toBeDefined();
      expect((skill.examplePayload as { provenance?: unknown }).provenance).toBeDefined();
    }
  });

  it('committed dist/skills.manifest.json is byte-identical to a fresh emit', () => {
    // Guard against a forgotten rebuild. Skipped pre-build (dist absent).
    if (!existsSync(distManifest)) return;
    const committed = readFileSync(distManifest, 'utf8');
    expect(committed).toBe(serializeManifest());
  });
});
