// Headless scene verification — the cheap "valid but empty" check (Vega-Lite's
// scene-graph emptiness trick, adapted to SceneData). A spec can validate yet
// carry no renderable data (zero spikes, empty node list); an agent can call
// this on the adapted SceneData to catch a technically-valid-but-blank render
// WITHOUT rendering pixels, and either fix the data or disclose the blank.

import type { SceneData } from '../designLaws';

export interface EmptySceneResult {
  empty: boolean;
  /** Which channels carried data (for an actionable message). */
  populated: string[];
  reason?: string;
}

function len(a: ArrayLike<unknown> | undefined): number {
  return a ? a.length : 0;
}

/** Detect whether adapted SceneData has any renderable content. */
export function detectEmptyScene(data: SceneData): EmptySceneResult {
  const populated: string[] = [];
  if (len(data.spikeTimes) > 0) populated.push('spikeTimes');
  if (len(data.voltageTraces) > 0) populated.push('voltageTraces');
  if (len(data.weightSeries) > 0) populated.push('weightSeries');
  if (len(data.analogTraces?.values) > 0) populated.push('analogTraces');
  if (len(data.networkNodes) > 0) populated.push('networkNodes');
  if (len(data.vectorField) > 0) populated.push('vectorField');

  const empty = populated.length === 0;
  return {
    empty,
    populated,
    reason: empty
      ? 'SceneData has no renderable content — all channels are empty; the render would be blank'
      : undefined,
  };
}
