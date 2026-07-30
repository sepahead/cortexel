import { flowParticleCount } from './knowledgeGraph';

export interface FlowParticleDistribution {
  total: number;
  basePerEdge: number;
  extraEdgeCount: number;
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
