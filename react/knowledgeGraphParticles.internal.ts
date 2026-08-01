import { flowParticleCount } from './knowledgeGraph';

export const KNOWLEDGE_GRAPH_FLOW_CYCLES_PER_SECOND = 0.28;
export const MAX_KNOWLEDGE_GRAPH_FLOW_FRAME_DELTA_SECONDS = 0.1;

/**
 * Keep the animated phase finite and bounded. Invalid/negative deltas pause;
 * suspended-tab deltas are capped so resume cannot poison or jump the marker
 * clock. The returned phase is always in [0, 1).
 */
export function advanceKnowledgeGraphFlowPhase(
  currentPhase: number,
  deltaSeconds: number,
): number {
  const normalized = Number.isFinite(currentPhase)
    ? ((currentPhase % 1) + 1) % 1
    : 0;
  const delta = Number.isFinite(deltaSeconds) && deltaSeconds > 0
    ? Math.min(deltaSeconds, MAX_KNOWLEDGE_GRAPH_FLOW_FRAME_DELTA_SECONDS)
    : 0;
  return (normalized + delta * KNOWLEDGE_GRAPH_FLOW_CYCLES_PER_SECOND) % 1;
}

export interface FlowParticleDistribution {
  total: number;
  basePerEdge: number;
  extraEdgeCount: number;
}

/**
 * A deterministic, strictly interior curve parameter for a stationary reduced-
 * motion marker. This prevents a marker from being placed exactly at either
 * endpoint; node-sphere occlusion can still depend on the host-owned layout.
 */
export function reducedMotionFlowParticleFraction(
  particleIndex: number,
  particlesOnEdge: number,
): number {
  if (
    !Number.isSafeInteger(particlesOnEdge) ||
    particlesOnEdge < 1 ||
    !Number.isSafeInteger(particleIndex) ||
    particleIndex < 0 ||
    particleIndex >= particlesOnEdge
  ) {
    throw new RangeError(
      'reduced-motion particle index must belong to a positive finite allocation',
    );
  }
  return (particleIndex + 1) / (particlesOnEdge + 1);
}

/**
 * Balance a capped particle budget across every declared flow edge. The cap must
 * retain at least one marker per edge; otherwise the legend could claim a flow
 * cue for relationships that receive no cue at all.
 */
export function planFlowParticleDistribution(
  flowEdgeCount: number,
  requestedPerEdge: number,
  maxParticles: number,
): FlowParticleDistribution {
  const edges = Number.isFinite(flowEdgeCount)
    ? Math.max(0, Math.floor(flowEdgeCount))
    : 0;
  const total = flowParticleCount(edges, requestedPerEdge, maxParticles);
  if (edges === 0) return { total: 0, basePerEdge: 0, extraEdgeCount: 0 };
  if (total < edges) {
    throw new RangeError('flow-particle cap must retain at least one marker per edge');
  }
  const basePerEdge = Math.floor(total / edges);
  return {
    total,
    basePerEdge,
    extraEdgeCount: total - basePerEdge * edges,
  };
}
