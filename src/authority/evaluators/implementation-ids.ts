/**
 * Import-free inventory of the closed OutputAuthority evaluator implementation set.
 *
 * This is deliberately human-authored implementation metadata, not generated
 * contract data. The zero-state generator checks it bidirectionally against every
 * stable skill declaration, while the runtime registry checks it against the actual
 * evaluator objects before exposing a resolver. Divergence therefore fails closed on
 * both sides of the build/runtime boundary.
 *
 * Keep this module a leaf: no imports (including type-only imports), dynamic loading,
 * environment reads, clocks, or generated data.
 */

export const OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1 = Object.freeze([
  'network.adjacency_matrix.output_authority.v2',
  'network.connection_graph.output_authority.v2',
  'network.degree_distribution.output_authority.v2',
  'network.delay_distribution.output_authority.v2',
  'network.delay_matrix.output_authority.v2',
  'network.spatial_map_2d.output_authority.v2',
  'network.synaptic_weight_trace.output_authority.v2',
  'network.weight_distribution.output_authority.v2',
  'network.weight_matrix.output_authority.v2',
  'neuro.analog_trace.output_authority.v2',
  'neuro.compartment_trace.output_authority.v2',
  'neuro.correlogram.output_authority.v2',
  'neuro.isi_distribution.output_authority.v2',
  'neuro.multisignal_trace.output_authority.v2',
  'neuro.phase_plane.output_authority.v2',
  'neuro.population_rate.output_authority.v2',
  'neuro.psth.output_authority.v2',
  'neuro.response_curve.output_authority.v2',
  'neuro.spike_raster.output_authority.v2',
] as const);

export type OutputAuthorityImplementationIdV1 =
  (typeof OUTPUT_AUTHORITY_IMPLEMENTATION_IDS_V1)[number];

const IMPLEMENTATION_ID = /^[a-z][a-z0-9_.-]*$/u;
const DANGEROUS_MAP_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Pure form check shared by the clean generator and focused fault-injection tests. */
export function outputAuthorityImplementationInventoryProblemsV1(
  ids: readonly unknown[],
): readonly string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  let previous: string | null = null;

  ids.forEach((candidate, index) => {
    if (typeof candidate !== 'string' || candidate.length === 0) {
      problems.push(`implementation id at index ${index} is not a non-empty string`);
      return;
    }
    if (!IMPLEMENTATION_ID.test(candidate) || DANGEROUS_MAP_KEYS.has(candidate)) {
      problems.push(`implementation id ${JSON.stringify(candidate)} is not a safe closed identifier`);
    }
    if (seen.has(candidate)) {
      problems.push(`duplicate implementation id ${JSON.stringify(candidate)}`);
    }
    if (previous !== null && !(previous < candidate)) {
      problems.push(
        `implementation ids are not strictly ascending at ${JSON.stringify(previous)} and ${JSON.stringify(candidate)}`,
      );
    }
    seen.add(candidate);
    previous = candidate;
  });

  return Object.freeze(problems);
}
