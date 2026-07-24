import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { canonicalDigest } from '../src/core/canonicalize';
import {
  provenanceParamConstraintError,
  type ProvenanceParamConstraint,
} from '../core/skills/provenanceKeys';

const regularAxisConstraint: ProvenanceParamConstraint = {
  kind: 'matches_regular_time_axis',
  provenanceKey: 'sampling_interval',
  paramPath: 'times_ms',
  absoluteTolerance: 0,
  relativeTolerance: 1e-12,
  roundoffUlps: 4,
  maxRoundoffFraction: 1e-7,
  description: 'property-test sampling interval',
};

describe('portable provenance closure properties', () => {
  it('accepts bounded regular binary64 axes and rejects a material interior perturbation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 3, max: 32 }),
        (startInteger, intervalMicros, length) => {
          const start = startInteger / 1000;
          const interval = intervalMicros / 1000;
          const times = Array.from(
            { length },
            (_, index) => start + index * interval,
          );
          expect(
            provenanceParamConstraintError(
              regularAxisConstraint,
              { times_ms: times },
              { sampling_interval: interval },
            ),
          ).toBeNull();

          const perturbed = [...times];
          const middle = Math.floor(length / 2);
          perturbed[middle] += interval * 0.01;
          expect(
            provenanceParamConstraintError(
              regularAxisConstraint,
              { times_ms: perturbed },
              { sampling_interval: interval },
            ),
          ).not.toBeNull();
        },
      ),
      { numRuns: 500 },
    );
  });

  it('never treats duplicates, reversals, or a one-point axis as sampling evidence', () => {
    for (const times of [[0], [0, 0], [1, 0], [0, 1, 1]]) {
      expect(
        provenanceParamConstraintError(
          regularAxisConstraint,
          { times_ms: times },
          { sampling_interval: 1 },
        ),
      ).not.toBeNull();
    }
  });

  it('binds only the exact terminal variable grammar', () => {
    const constraint: ProvenanceParamConstraint = {
      kind: 'each_label_matches_variable',
      provenanceKey: 'recorded_variable',
      paramPath: 'series_labels',
      separator: ' · ',
      description: 'property-test label binding',
    };
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z0-9](?:[A-Za-z0-9 _-]{0,30}[A-Za-z0-9])?$/),
        (identity) => {
          expect(
            provenanceParamConstraintError(
              constraint,
              { series_labels: [`${identity} · V_m`] },
              { recorded_variable: 'V_m' },
            ),
          ).toBeNull();
          for (const label of [
            `${identity} - V_m`,
            `${identity} · v_m`,
            `${identity} · V_m · extra`,
          ]) {
            expect(
              provenanceParamConstraintError(
                constraint,
                { series_labels: [label] },
                { recorded_variable: 'V_m' },
              ),
            ).not.toBeNull();
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it('equates ordered arrays only through exact canonical JSON or its JCS digest', () => {
    const constraint: ProvenanceParamConstraint = {
      kind: 'matches_canonical_json_param',
      provenanceKey: 'source_ids',
      paramPath: 'source_ids',
      allowDigest: true,
      description: 'property-test ordered axis',
    };
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
          { minLength: 1, maxLength: 64 },
        ),
        (ids) => {
          const canonical = JSON.stringify(ids);
          expect(
            provenanceParamConstraintError(
              constraint,
              { source_ids: ids },
              { source_ids: canonical },
            ),
          ).toBeNull();
          expect(
            provenanceParamConstraintError(
              constraint,
              { source_ids: ids },
              { source_ids: canonicalDigest(ids) },
            ),
          ).toBeNull();
          const reversed = [...ids].reverse();
          if (ids.length > 1 && JSON.stringify(reversed) !== canonical) {
            expect(
              provenanceParamConstraintError(
                constraint,
                { source_ids: ids },
                { source_ids: JSON.stringify(reversed) },
              ),
            ).not.toBeNull();
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it('uses opaque digest counts only for disclosed cardinality checks', () => {
    const constraint: ProvenanceParamConstraint = {
      kind: 'canonical_json_array_length_matches_param',
      provenanceKey: 'target_ids',
      paramPath: 'node_count',
      idDomain: 'nonnegative_safe_integer',
      relation: 'equals',
      allowOpaqueDigestCount: true,
      establishesBinding: false,
      description: 'property-test universe count',
    };
    const digest = `sha256:${'a'.repeat(64)}`;
    expect(
      provenanceParamConstraintError(
        constraint,
        { node_count: 3 },
        { target_ids: `${digest};count:3` },
      ),
    ).toBeNull();
    expect(
      provenanceParamConstraintError(
        constraint,
        { node_count: 3 },
        { target_ids: `${digest};count:2` },
      ),
    ).not.toBeNull();
  });

  it('requires a nonempty declared endpoint universe exactly when checked evidence is positive', () => {
    const constraint: ProvenanceParamConstraint = {
      kind: 'canonical_json_array_length_matches_param',
      provenanceKey: 'source_ids',
      paramPath: 'connection_count',
      idDomain: 'nonnegative_safe_integer',
      relation: 'nonempty_if_positive',
      allowOpaqueDigestCount: true,
      establishesBinding: false,
      description: 'property-test endpoint-universe lower bound',
    };
    const digest = `sha256:${'c'.repeat(64)}`;
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.uniqueArray(fc.integer({ min: 0, max: 1_000_000 }), {
          maxLength: 32,
        }),
        (connectionCount, ids) => {
          const expectedToPass = connectionCount === 0 || ids.length > 0;
          expect(
            provenanceParamConstraintError(
              constraint,
              { connection_count: connectionCount },
              { source_ids: JSON.stringify(ids) },
            ) === null,
          ).toBe(expectedToPass);
          expect(
            provenanceParamConstraintError(
              constraint,
              { connection_count: connectionCount },
              { source_ids: `${digest};count:${ids.length}` },
            ) === null,
          ).toBe(expectedToPass);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('rejects opaque membership counts below observed cardinality and malformed id universes', () => {
    const constraint: ProvenanceParamConstraint = {
      kind: 'matches_projected_id_collection',
      provenanceKey: 'sender_ids',
      paramPath: 'senders',
      idDomain: 'nonnegative_safe_integer',
      comparison: 'set',
      relation: 'contains',
      allowDigest: false,
      allowOpaqueDigestCount: true,
      establishesBinding: false,
      description: 'property-test disclosed sender universe',
    };
    const digest = `sha256:${'b'.repeat(64)}`;
    expect(
      provenanceParamConstraintError(
        constraint,
        { senders: [1, 2, 1] },
        { sender_ids: `${digest};count:2` },
      ),
    ).toBeNull();
    for (const sender_ids of [
      `${digest};count:0`,
      '[1,1]',
      '[true,false]',
      '[null,1]',
      '["   ",1]',
    ]) {
      expect(
        provenanceParamConstraintError(
          constraint,
          { senders: [1, 2, 1] },
          { sender_ids },
        ),
        sender_ids,
      ).not.toBeNull();
    }
  });

  it('requires a global sender universe to cover summed disjoint population denominators', () => {
    const constraint: ProvenanceParamConstraint = {
      kind: 'canonical_json_array_length_at_least_projected_sum',
      provenanceKey: 'sender_ids',
      paramPath: 'series',
      field: 'recorded_sender_count',
      idDomain: 'nonnegative_safe_integer',
      allowOpaqueDigestCount: true,
      establishesBinding: false,
      description: 'property-test disjoint population denominator',
    };
    const params = {
      series: [
        { recorded_sender_count: 2 },
        { recorded_sender_count: 3 },
      ],
    };
    expect(
      provenanceParamConstraintError(
        constraint,
        params,
        { sender_ids: '[1,2,3,4,5]' },
      ),
    ).toBeNull();
    expect(
      provenanceParamConstraintError(
        constraint,
        params,
        { sender_ids: '[1,2,3]' },
      ),
    ).not.toBeNull();
  });
});
