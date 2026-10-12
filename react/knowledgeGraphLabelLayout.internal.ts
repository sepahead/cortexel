import { KNOWLEDGE_GRAPH_LIMITS } from '../core/skills/knowledgeGraphLimits';

export const KNOWLEDGE_GRAPH_MAX_LABELS = 64;
export const KNOWLEDGE_GRAPH_LABEL_HEIGHT_PX = 24;
export const KNOWLEDGE_GRAPH_LABEL_GAP_PX = 5;
export const KNOWLEDGE_GRAPH_LABEL_VIEWPORT_PADDING_PX = 8;

export interface KnowledgeGraphLabelCandidate {
  readonly nodeIndex: number;
  readonly id: string;
  readonly label: string;
}

/** Only presentation priorities change. No node, assertion, or source record is removed. */
export function planKnowledgeGraphLabelCandidates(
  nodes: readonly { readonly id: string; readonly label: string }[],
  selectedId: string | null,
  hoverId: string | null,
  queryMatches: ReadonlySet<string>,
): readonly KnowledgeGraphLabelCandidate[] {
  if (nodes.length > KNOWLEDGE_GRAPH_LIMITS.maxLiveForceNodes) {
    throw new RangeError('label preparation requires an admitted live graph');
  }
  const candidates = nodes.map((node, nodeIndex) => ({
    nodeIndex,
    id: node.id,
    label: node.label,
  }));
  const priority = (id: string) =>
    (id === selectedId ? 8 : 0) + (id === hoverId ? 4 : 0) + (queryMatches.has(id) ? 2 : 0);
  candidates.sort(
    (a, b) => priority(b.id) - priority(a.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return candidates.slice(0, KNOWLEDGE_GRAPH_MAX_LABELS);
}

export interface KnowledgeGraphLabelLayout {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly visible: Uint8Array;
  count: number;
}

export function createKnowledgeGraphLabelLayout(capacity: number): KnowledgeGraphLabelLayout {
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > KNOWLEDGE_GRAPH_MAX_LABELS) {
    throw new RangeError('invalid bounded label capacity');
  }
  return {
    x: new Float64Array(capacity),
    y: new Float64Array(capacity),
    visible: new Uint8Array(capacity),
    count: 0,
  };
}

/**
 * Each projected node has five scalar fields: x/y CSS pixels, conservative
 * radius in CSS pixels, NDC depth, and world units per CSS pixel at that depth.
 * Outputs reuse bounded scratch arrays. Labels never cover another node and
 * never cross the viewport. A hidden label's complete text remains in the DOM.
 */
export function layoutKnowledgeGraphLabelsInto(
  candidates: readonly KnowledgeGraphLabelCandidate[],
  nodes: Float64Array,
  widths: Float32Array,
  viewportWidth: number,
  viewportHeight: number,
  target: KnowledgeGraphLabelLayout,
): number {
  target.visible.fill(0);
  target.count = 0;
  if (
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    candidates.length > target.visible.length ||
    candidates.length > widths.length ||
    nodes.length % 5 !== 0 ||
    candidates.length > KNOWLEDGE_GRAPH_MAX_LABELS ||
    nodes.length > KNOWLEDGE_GRAPH_LIMITS.maxLiveForceNodes * 5 ||
    candidates.length > target.x.length ||
    candidates.length > target.y.length ||
    viewportHeight < KNOWLEDGE_GRAPH_LABEL_HEIGHT_PX + 2 * KNOWLEDGE_GRAPH_LABEL_VIEWPORT_PADDING_PX
  )
    return 0;
  const height = KNOWLEDGE_GRAPH_LABEL_HEIGHT_PX;
  const padding = KNOWLEDGE_GRAPH_LABEL_VIEWPORT_PADDING_PX;
  const budget = Math.min(
    candidates.length,
    Math.max(4, Math.floor((viewportWidth * viewportHeight) / 12000)),
  );
  for (let slot = 0; slot < candidates.length && target.count < budget; slot++) {
    const base = candidates[slot].nodeIndex * 5;
    const nodeX = nodes[base];
    const nodeY = nodes[base + 1];
    const radius = nodes[base + 2];
    const depth = nodes[base + 3];
    const pixelScale = nodes[base + 4];
    const width = widths[slot];
    if (
      !Number.isFinite(nodeX) ||
      !Number.isFinite(nodeY) ||
      !Number.isFinite(radius) ||
      radius < 0 ||
      !Number.isFinite(depth) ||
      depth < -1 ||
      depth > 1 ||
      !Number.isFinite(pixelScale) ||
      pixelScale <= 0 ||
      !Number.isFinite(width) ||
      width <= 0 ||
      width > viewportWidth - 2 * padding ||
      nodeX < -radius ||
      nodeX > viewportWidth + radius ||
      nodeY < -radius ||
      nodeY > viewportHeight + radius
    )
      continue;
    const gap = radius + KNOWLEDGE_GRAPH_LABEL_GAP_PX;
    for (let placement = 0; placement < 8; placement++) {
      let x = nodeX;
      let y = nodeY;
      if (placement === 0 || placement === 4 || placement === 5) y -= gap + height / 2;
      if (placement === 1 || placement === 6 || placement === 7) y += gap + height / 2;
      if (placement === 2 || placement === 4 || placement === 6) x += gap + width / 2;
      if (placement === 3 || placement === 5 || placement === 7) x -= gap + width / 2;
      x = Math.max(padding + width / 2, Math.min(viewportWidth - padding - width / 2, x));
      y = Math.max(padding + height / 2, Math.min(viewportHeight - padding - height / 2, y));
      let collision = false;
      for (let other = 0; other < slot; other++) {
        if (
          target.visible[other] &&
          Math.abs(x - target.x[other]) < (width + widths[other]) / 2 + 3 &&
          Math.abs(y - target.y[other]) < height + 3
        ) {
          collision = true;
          break;
        }
      }
      for (let n = 0; !collision && n < nodes.length; n += 5) {
        if (nodes[n + 3] < -1 || nodes[n + 3] > 1 || nodes[n + 4] <= 0) continue;
        const dx = Math.max(0, Math.abs(nodes[n] - x) - width / 2);
        const dy = Math.max(0, Math.abs(nodes[n + 1] - y) - height / 2);
        const r = nodes[n + 2] + 2;
        if (dx * dx + dy * dy < r * r) collision = true;
      }
      if (!collision) {
        target.x[slot] = x;
        target.y[slot] = y;
        target.visible[slot] = 1;
        target.count++;
        break;
      }
    }
  }
  return target.count;
}
