// react/knowledgeGraphIdentity.internal.ts
function canonicalGraphNodePair(source, target) {
  return source <= target ? [source, target] : [target, source];
}
function graphEdgeIdentityKey(edge) {
  if (typeof edge.id === "string") return JSON.stringify(["id", edge.id]);
  const kind = typeof edge.kind === "string" ? edge.kind : "";
  if (edge.directed === false) {
    const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
    return JSON.stringify(["legacy-undirected", source, target, kind]);
  }
  return JSON.stringify(["legacy-directed", edge.source, edge.target, kind]);
}

// react/knowledgeGraphContextIdentity.internal.ts
function deriveKnowledgeGraphContextIdentity(context) {
  const field = (value) => `${value.length}:${value}`;
  return `cortexel-corpus-graph-instance.v1:${field(context.graph_id)}${field(
    context.graph_source
  )}${field(context.graph_snapshot_id)}${field(context.graph_scope)}${field(
    context.generated_at
  )}`;
}

// react/knowledgeGraphVisualEncoding.internal.ts
var KNOWLEDGE_GRAPH_NODE_GLYPHS = Object.freeze([
  "sphere_outline",
  "box_shell",
  "diamond_shell"
]);
var KNOWLEDGE_GRAPH_EDGE_STROKE_PATTERNS = Object.freeze([
  "solid",
  "long_dash",
  "short_dash",
  "dotted"
]);
var CORPUS_NODE_GLYPH_BY_KIND = Object.freeze({
  paper: "sphere_outline",
  model: "box_shell",
  family: "diamond_shell"
});
var CORPUS_EDGE_STROKE_PATTERN_BY_KIND = Object.freeze({
  cites: "solid",
  same_as: "solid",
  variant_of: "long_dash",
  instantiates: "short_dash",
  belongs_to_family: "dotted"
});
var KNOWLEDGE_GRAPH_BACKGROUND_COLORS = Object.freeze({
  dark: "#030711",
  light: "#f8fafc"
});
var KNOWLEDGE_GRAPH_MIN_MARK_CONTRAST = 3;
var KNOWLEDGE_GRAPH_FOCUSED_NODE_SCALE = 1.28;
var KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH = 3;
var KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE = Object.freeze({
  sphere_outline: 1.08,
  // Every cube-edge midpoint remains outside the opaque unit sphere:
  // 1.30 * sqrt(2/3) > 1.06.
  box_shell: 1.3,
  // Every octahedron-edge midpoint remains outside the opaque unit sphere:
  // 1.50 / sqrt(2) > 1.06.
  diamond_shell: 1.5
});
var KNOWLEDGE_GRAPH_BOX_SHELL_SIDE = 2 * KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.box_shell / Math.sqrt(3);
var NODE_GLYPH_SET = new Set(KNOWLEDGE_GRAPH_NODE_GLYPHS);
var EDGE_STROKE_PATTERN_SET = new Set(
  KNOWLEDGE_GRAPH_EDGE_STROKE_PATTERNS
);
var HEX_COLOR = /^#[0-9a-f]{6}$/u;
function isKnowledgeGraphNodeGlyph(value) {
  return typeof value === "string" && NODE_GLYPH_SET.has(value);
}
function isKnowledgeGraphEdgeStrokePattern(value) {
  return typeof value === "string" && EDGE_STROKE_PATTERN_SET.has(value);
}
function knowledgeGraphNodeGlyphDescription(glyph) {
  switch (glyph) {
    case "sphere_outline":
      return "outlined sphere";
    case "box_shell":
      return "sphere with box shell";
    case "diamond_shell":
      return "sphere with diamond shell";
  }
}
function knowledgeGraphEdgeStrokeDescription(pattern) {
  switch (pattern) {
    case "solid":
      return "solid stroke";
    case "long_dash":
      return "long-dash stroke";
    case "short_dash":
      return "short-dash stroke";
    case "dotted":
      return "dotted stroke";
  }
}
function knowledgeGraphEdgeStrokeSegmentVisible(pattern, chordIndex, chordCount) {
  if (!Number.isSafeInteger(chordIndex) || !Number.isSafeInteger(chordCount) || chordCount < 1 || chordIndex < 0 || chordIndex >= chordCount) {
    throw new RangeError("knowledge-graph stroke segment index is invalid");
  }
  switch (pattern) {
    case "solid":
      return true;
    case "long_dash":
      return chordIndex % 4 !== 3;
    case "short_dash":
      return chordIndex % 2 === 0;
    case "dotted":
      return chordIndex % 3 === 0;
  }
}
function linearChannel(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function luminance(red, green, blue) {
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);
}
function contrastRatio(first, second) {
  const a = luminance(...first);
  const b = luminance(...second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
function parseHexColor(value) {
  if (!HEX_COLOR.test(value)) return null;
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16)
  ];
}
function encodeHexColor(channels) {
  return `#${channels.map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0")).join("")}`;
}
function knowledgeGraphContrastSafeColor(sourceColor, themeMode) {
  const source = parseHexColor(sourceColor);
  const background = parseHexColor(KNOWLEDGE_GRAPH_BACKGROUND_COLORS[themeMode]);
  if (source === null || background === null) {
    return themeMode === "light" ? "#0f172a" : "#f8fafc";
  }
  if (contrastRatio(source, background) >= KNOWLEDGE_GRAPH_MIN_MARK_CONTRAST) {
    return sourceColor;
  }
  const endpoint = themeMode === "light" ? 0 : 255;
  for (let step = 1; step <= 255; step++) {
    const amount = step / 255;
    const candidate = source.map((channel) => Math.round(
      channel + (endpoint - channel) * amount
    ));
    if (contrastRatio(candidate, background) >= KNOWLEDGE_GRAPH_MIN_MARK_CONTRAST) {
      return encodeHexColor(candidate);
    }
  }
  return endpoint === 0 ? "#000000" : "#ffffff";
}
function knowledgeGraphRenderedNodeScale(emphasized) {
  return emphasized ? KNOWLEDGE_GRAPH_FOCUSED_NODE_SCALE : 1;
}
function knowledgeGraphNodeEmphasisDimAmount(nodeId, focus, focusSet, queryActive, queryMatchIds) {
  if (focus !== null) {
    return nodeId === focus || focusSet?.has(nodeId) === true ? 0 : 0.8;
  }
  return queryActive && !queryMatchIds.has(nodeId) ? 0.82 : 0;
}
function knowledgeGraphRenderedNodeRadialExtent(radius, glyph, emphasized) {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError("knowledge-graph node radius must be positive and finite");
  }
  return radius * knowledgeGraphRenderedNodeScale(emphasized) * KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE[glyph];
}
function knowledgeGraphAutoFrameNodeRadialExtent(radius, glyph, focused) {
  return knowledgeGraphRenderedNodeRadialExtent(radius, glyph, focused);
}

export {
  canonicalGraphNodePair,
  graphEdgeIdentityKey,
  deriveKnowledgeGraphContextIdentity,
  CORPUS_NODE_GLYPH_BY_KIND,
  CORPUS_EDGE_STROKE_PATTERN_BY_KIND,
  KNOWLEDGE_GRAPH_BACKGROUND_COLORS,
  KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH,
  KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE,
  KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
  isKnowledgeGraphNodeGlyph,
  isKnowledgeGraphEdgeStrokePattern,
  knowledgeGraphNodeGlyphDescription,
  knowledgeGraphEdgeStrokeDescription,
  knowledgeGraphEdgeStrokeSegmentVisible,
  knowledgeGraphContrastSafeColor,
  knowledgeGraphRenderedNodeScale,
  knowledgeGraphNodeEmphasisDimAmount,
  knowledgeGraphRenderedNodeRadialExtent,
  knowledgeGraphAutoFrameNodeRadialExtent
};
//# sourceMappingURL=chunk-VINPKPR3.js.map