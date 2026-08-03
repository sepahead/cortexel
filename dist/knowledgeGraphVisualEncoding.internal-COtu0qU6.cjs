//#region react/knowledgeGraphIdentity.internal.ts
function canonicalGraphNodePair(source, target) {
	return source <= target ? [source, target] : [target, source];
}
/** Exact private identity domain shared by validation, routing, and DOM keys. */
function graphEdgeIdentityKey(edge) {
	if (typeof edge.id === "string") return JSON.stringify(["id", edge.id]);
	const kind = typeof edge.kind === "string" ? edge.kind : "";
	if (edge.directed === false) {
		const [source, target] = canonicalGraphNodePair(edge.source, edge.target);
		return JSON.stringify([
			"legacy-undirected",
			source,
			target,
			kind
		]);
	}
	return JSON.stringify([
		"legacy-directed",
		edge.source,
		edge.target,
		kind
	]);
}

//#endregion
//#region react/knowledgeGraphContextIdentity.internal.ts
/** Collision-free encoding of the complete caller-declared corpus context. */
function deriveKnowledgeGraphContextIdentity(context) {
	const field = (value) => `${value.length}:${value}`;
	return `cortexel-corpus-graph-instance.v1:${field(context.graph_id)}${field(context.graph_source)}${field(context.graph_snapshot_id)}${field(context.graph_scope)}${field(context.generated_at)}`;
}

//#endregion
//#region react/knowledgeGraphVisualEncoding.internal.ts
const KNOWLEDGE_GRAPH_NODE_GLYPHS = Object.freeze([
	"sphere_outline",
	"box_shell",
	"diamond_shell"
]);
const KNOWLEDGE_GRAPH_EDGE_STROKE_PATTERNS = Object.freeze([
	"solid",
	"long_dash",
	"short_dash",
	"dotted"
]);
const CORPUS_NODE_GLYPH_BY_KIND = Object.freeze({
	paper: "sphere_outline",
	model: "box_shell",
	family: "diamond_shell"
});
const CORPUS_EDGE_STROKE_PATTERN_BY_KIND = Object.freeze({
	cites: "solid",
	same_as: "solid",
	variant_of: "long_dash",
	instantiates: "short_dash",
	belongs_to_family: "dotted"
});
const KNOWLEDGE_GRAPH_BACKGROUND_COLORS = Object.freeze({
	dark: "#030711",
	light: "#f8fafc"
});
const KNOWLEDGE_GRAPH_MIN_MARK_CONTRAST = 3;
const KNOWLEDGE_GRAPH_FOCUSED_NODE_SCALE = 1.28;
const KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE = Object.freeze({
	sphere_outline: 1.08,
	box_shell: 1.3,
	diamond_shell: 1.5
});
const KNOWLEDGE_GRAPH_BOX_SHELL_SIDE = 2 * KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.box_shell / Math.sqrt(3);
const NODE_GLYPH_SET = new Set(KNOWLEDGE_GRAPH_NODE_GLYPHS);
const EDGE_STROKE_PATTERN_SET = new Set(KNOWLEDGE_GRAPH_EDGE_STROKE_PATTERNS);
const HEX_COLOR = /^#[0-9a-f]{6}$/u;
function isKnowledgeGraphNodeGlyph(value) {
	return typeof value === "string" && NODE_GLYPH_SET.has(value);
}
function isKnowledgeGraphEdgeStrokePattern(value) {
	return typeof value === "string" && EDGE_STROKE_PATTERN_SET.has(value);
}
function knowledgeGraphNodeGlyphDescription(glyph) {
	switch (glyph) {
		case "sphere_outline": return "outlined sphere";
		case "box_shell": return "sphere with box shell";
		case "diamond_shell": return "sphere with diamond shell";
	}
}
function knowledgeGraphEdgeStrokeDescription(pattern) {
	switch (pattern) {
		case "solid": return "solid stroke";
		case "long_dash": return "long-dash stroke";
		case "short_dash": return "short-dash stroke";
		case "dotted": return "dotted stroke";
	}
}
/** Fixed 12-chord masks: render buffers omit every hidden chord entirely. */
function knowledgeGraphEdgeStrokeSegmentVisible(pattern, chordIndex, chordCount) {
	if (!Number.isSafeInteger(chordIndex) || !Number.isSafeInteger(chordCount) || chordCount < 1 || chordIndex < 0 || chordIndex >= chordCount) throw new RangeError("knowledge-graph stroke segment index is invalid");
	switch (pattern) {
		case "solid": return true;
		case "long_dash": return chordIndex % 4 !== 3;
		case "short_dash": return chordIndex % 2 === 0;
		case "dotted": return chordIndex % 3 === 0;
	}
}
function linearChannel(channel) {
	const value = channel / 255;
	return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
}
function luminance(red, green, blue) {
	return .2126 * linearChannel(red) + .7152 * linearChannel(green) + .0722 * linearChannel(blue);
}
function contrastRatio(first, second) {
	const a = luminance(...first);
	const b = luminance(...second);
	const lighter = Math.max(a, b);
	const darker = Math.min(a, b);
	return (lighter + .05) / (darker + .05);
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
/**
* Preserve the source hue as far as possible while moving monotonically toward
* black on a light canvas or white on a dark canvas until a non-text 3:1 mark
* contrast is reached. Source colors remain separately disclosed in the legend.
*/
function knowledgeGraphContrastSafeColor(sourceColor, themeMode) {
	const source = parseHexColor(sourceColor);
	const background = parseHexColor(KNOWLEDGE_GRAPH_BACKGROUND_COLORS[themeMode]);
	if (source === null || background === null) return themeMode === "light" ? "#0f172a" : "#f8fafc";
	if (contrastRatio(source, background) >= 3) return sourceColor;
	const endpoint = themeMode === "light" ? 0 : 255;
	for (let step = 1; step <= 255; step++) {
		const amount = step / 255;
		const candidate = source.map((channel) => Math.round(channel + (endpoint - channel) * amount));
		if (contrastRatio(candidate, background) >= 3) return encodeHexColor(candidate);
	}
	return endpoint === 0 ? "#000000" : "#ffffff";
}
function knowledgeGraphRenderedNodeScale(emphasized) {
	return emphasized ? KNOWLEDGE_GRAPH_FOCUSED_NODE_SCALE : 1;
}
/** One salience policy shared by the opaque fill and redundant glyph shell. */
function knowledgeGraphNodeEmphasisDimAmount(nodeId, focus, focusSet, queryActive, queryMatchIds) {
	if (focus !== null) return nodeId === focus || focusSet?.has(nodeId) === true ? 0 : .8;
	return queryActive && !queryMatchIds.has(nodeId) ? .82 : 0;
}
function knowledgeGraphRenderedNodeRadialExtent(radius, glyph, emphasized) {
	if (!Number.isFinite(radius) || radius <= 0) throw new RangeError("knowledge-graph node radius must be positive and finite");
	return radius * knowledgeGraphRenderedNodeScale(emphasized) * KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE[glyph];
}
/**
* Node contribution to a one-shot whole-graph fit. It is deliberately identical
* to geometry rendered on that frame: an active focus scale is real geometry,
* while a possible future focus label is not.
*/
function knowledgeGraphAutoFrameNodeRadialExtent(radius, glyph, focused) {
	return knowledgeGraphRenderedNodeRadialExtent(radius, glyph, focused);
}

//#endregion
Object.defineProperty(exports, 'CORPUS_EDGE_STROKE_PATTERN_BY_KIND', {
  enumerable: true,
  get: function () {
    return CORPUS_EDGE_STROKE_PATTERN_BY_KIND;
  }
});
Object.defineProperty(exports, 'CORPUS_NODE_GLYPH_BY_KIND', {
  enumerable: true,
  get: function () {
    return CORPUS_NODE_GLYPH_BY_KIND;
  }
});
Object.defineProperty(exports, 'KNOWLEDGE_GRAPH_BACKGROUND_COLORS', {
  enumerable: true,
  get: function () {
    return KNOWLEDGE_GRAPH_BACKGROUND_COLORS;
  }
});
Object.defineProperty(exports, 'KNOWLEDGE_GRAPH_BOX_SHELL_SIDE', {
  enumerable: true,
  get: function () {
    return KNOWLEDGE_GRAPH_BOX_SHELL_SIDE;
  }
});
Object.defineProperty(exports, 'KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE', {
  enumerable: true,
  get: function () {
    return KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE;
  }
});
Object.defineProperty(exports, 'canonicalGraphNodePair', {
  enumerable: true,
  get: function () {
    return canonicalGraphNodePair;
  }
});
Object.defineProperty(exports, 'deriveKnowledgeGraphContextIdentity', {
  enumerable: true,
  get: function () {
    return deriveKnowledgeGraphContextIdentity;
  }
});
Object.defineProperty(exports, 'graphEdgeIdentityKey', {
  enumerable: true,
  get: function () {
    return graphEdgeIdentityKey;
  }
});
Object.defineProperty(exports, 'isKnowledgeGraphEdgeStrokePattern', {
  enumerable: true,
  get: function () {
    return isKnowledgeGraphEdgeStrokePattern;
  }
});
Object.defineProperty(exports, 'isKnowledgeGraphNodeGlyph', {
  enumerable: true,
  get: function () {
    return isKnowledgeGraphNodeGlyph;
  }
});
Object.defineProperty(exports, 'knowledgeGraphAutoFrameNodeRadialExtent', {
  enumerable: true,
  get: function () {
    return knowledgeGraphAutoFrameNodeRadialExtent;
  }
});
Object.defineProperty(exports, 'knowledgeGraphContrastSafeColor', {
  enumerable: true,
  get: function () {
    return knowledgeGraphContrastSafeColor;
  }
});
Object.defineProperty(exports, 'knowledgeGraphEdgeStrokeDescription', {
  enumerable: true,
  get: function () {
    return knowledgeGraphEdgeStrokeDescription;
  }
});
Object.defineProperty(exports, 'knowledgeGraphEdgeStrokeSegmentVisible', {
  enumerable: true,
  get: function () {
    return knowledgeGraphEdgeStrokeSegmentVisible;
  }
});
Object.defineProperty(exports, 'knowledgeGraphNodeEmphasisDimAmount', {
  enumerable: true,
  get: function () {
    return knowledgeGraphNodeEmphasisDimAmount;
  }
});
Object.defineProperty(exports, 'knowledgeGraphNodeGlyphDescription', {
  enumerable: true,
  get: function () {
    return knowledgeGraphNodeGlyphDescription;
  }
});
Object.defineProperty(exports, 'knowledgeGraphRenderedNodeRadialExtent', {
  enumerable: true,
  get: function () {
    return knowledgeGraphRenderedNodeRadialExtent;
  }
});
Object.defineProperty(exports, 'knowledgeGraphRenderedNodeScale', {
  enumerable: true,
  get: function () {
    return knowledgeGraphRenderedNodeScale;
  }
});
//# sourceMappingURL=knowledgeGraphVisualEncoding.internal-COtu0qU6.cjs.map