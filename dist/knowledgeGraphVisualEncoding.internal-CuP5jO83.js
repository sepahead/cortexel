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
const KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH = 4.5;
const KNOWLEDGE_GRAPH_DIRECTION_MARKER_RADIUS = 1.5;
const KNOWLEDGE_GRAPH_EDGE_STROKE_WIDTH_PX = 1.5;
function isKnowledgeGraphStrokeViewportUsable(width, height, near) {
	return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 && Number.isFinite(near) && near >= 0;
}
/** One instanced quad for each already-visible routed chord. Clip in view space
* before dividing by w, so an endpoint behind the eye cannot invert the strip. */
const KNOWLEDGE_GRAPH_EDGE_STROKE_VERTEX_SHADER = `
attribute vec3 instanceStart;
attribute vec3 instanceEnd;
attribute vec3 instanceStrokeColor;
uniform vec2 strokeViewport;
uniform float strokeWidth;
uniform float strokeNear;
varying vec3 vStrokeColor;
void main() {
  vec4 start = modelViewMatrix * vec4(instanceStart, 1.0);
  vec4 end = modelViewMatrix * vec4(instanceEnd, 1.0);
  float plane = -strokeNear;
  if (start.z > plane && end.z > plane) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vStrokeColor = instanceStrokeColor;
    return;
  }
  if (start.z > plane) start = mix(start, end, (plane - start.z) / (end.z - start.z));
  if (end.z > plane) end = mix(end, start, (plane - end.z) / (start.z - end.z));
  vec4 a = projectionMatrix * start;
  vec4 b = projectionMatrix * end;
  vec2 delta = (b.xy / b.w - a.xy / a.w) * strokeViewport * 0.5;
  float magnitude = length(delta);
  vec2 normal = magnitude > 0.000001 ? vec2(-delta.y, delta.x) / magnitude : vec2(0.0);
  vec4 clip = mix(a, b, position.x);
  clip.xy += normal * position.y * strokeWidth / strokeViewport * clip.w;
  gl_Position = clip;
  vStrokeColor = instanceStrokeColor;
}`;
const KNOWLEDGE_GRAPH_EDGE_STROKE_FRAGMENT_SHADER = `
varying vec3 vStrokeColor;
void main() {
  gl_FragColor = vec4(vStrokeColor, 1.0);
  #include <colorspace_fragment>
}`;
const KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE = Object.freeze({
	sphere_outline: 1.08,
	box_shell: 1.3,
	diamond_shell: 1.5
});
const KNOWLEDGE_GRAPH_BOX_SHELL_SIDE = 2 * KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.box_shell / Math.sqrt(3);
/** Twelve solid frame bars, rather than the triangulated faces of a wireframe.
* The fixed 0.04-unit thickness stays inside the existing radial extent. This
* is a bounded CPU template, created outside the frame loop and reused by every
* admitted node of that kind. It is not a quantitative data channel. */
function createKnowledgeGraphNodeShellVertices(glyph) {
	const thickness = .04;
	const vertices = [];
	if (glyph === "box_shell") {
		const half = KNOWLEDGE_GRAPH_BOX_SHELL_SIDE / 2 - thickness / 2;
		for (let index = 0; index < 8; index++) vertices.push([
			index & 1 ? half : -half,
			index & 2 ? half : -half,
			index & 4 ? half : -half
		]);
	} else if (glyph === "diamond_shell") {
		const radius = KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.diamond_shell - thickness;
		vertices.push([
			radius,
			0,
			0
		], [
			-radius,
			0,
			0
		], [
			0,
			radius,
			0
		], [
			0,
			-radius,
			0
		], [
			0,
			0,
			radius
		], [
			0,
			0,
			-radius
		]);
	} else throw new RangeError("unsupported knowledge-graph shell");
	const triangles = [
		0,
		2,
		1,
		1,
		2,
		3,
		4,
		5,
		6,
		5,
		7,
		6,
		0,
		1,
		4,
		1,
		5,
		4,
		2,
		6,
		3,
		3,
		6,
		7,
		0,
		4,
		2,
		2,
		4,
		6,
		1,
		3,
		5,
		3,
		7,
		5
	];
	const result = new Float32Array(12 * triangles.length * 3);
	let output = 0;
	for (let first = 0; first < vertices.length; first++) for (let second = first + 1; second < vertices.length; second++) {
		const a = vertices[first];
		const b = vertices[second];
		const differing = Number(a[0] !== b[0]) + Number(a[1] !== b[1]) + Number(a[2] !== b[2]);
		if (glyph === "box_shell" ? differing !== 1 : a[0] * b[0] + a[1] * b[1] + a[2] * b[2] !== 0) continue;
		let dx = b[0] - a[0];
		let dy = b[1] - a[1];
		let dz = b[2] - a[2];
		const length = Math.hypot(dx, dy, dz);
		dx /= length;
		dy /= length;
		dz /= length;
		let ux = Math.abs(dz) < .9 ? dy : -dz;
		let uy = Math.abs(dz) < .9 ? -dx : 0;
		let uz = Math.abs(dz) < .9 ? 0 : dx;
		const uLength = Math.hypot(ux, uy, uz);
		ux /= uLength;
		uy /= uLength;
		uz /= uLength;
		const vx = dy * uz - dz * uy;
		const vy = dz * ux - dx * uz;
		const vz = dx * uy - dy * ux;
		for (let triangle = 0; triangle < triangles.length; triangle++) {
			const corner = triangles[triangle];
			const endpoint = corner & 4 ? b : a;
			const u = (corner & 1 ? 1 : -1) * thickness / 2;
			const v = (corner & 2 ? 1 : -1) * thickness / 2;
			result[output++] = endpoint[0] + ux * u + vx * v;
			result[output++] = endpoint[1] + uy * u + vy * v;
			result[output++] = endpoint[2] + uz * u + vz * v;
		}
	}
	if (output !== result.length) throw new Error("knowledge-graph shell topology mismatch");
	return result;
}
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
export { canonicalGraphNodePair as C, deriveKnowledgeGraphContextIdentity as S, knowledgeGraphEdgeStrokeSegmentVisible as _, KNOWLEDGE_GRAPH_DIRECTION_MARKER_RADIUS as a, knowledgeGraphRenderedNodeRadialExtent as b, KNOWLEDGE_GRAPH_EDGE_STROKE_WIDTH_PX as c, isKnowledgeGraphEdgeStrokePattern as d, isKnowledgeGraphNodeGlyph as f, knowledgeGraphEdgeStrokeDescription as g, knowledgeGraphContrastSafeColor as h, KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH as i, KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE as l, knowledgeGraphAutoFrameNodeRadialExtent as m, CORPUS_NODE_GLYPH_BY_KIND as n, KNOWLEDGE_GRAPH_EDGE_STROKE_FRAGMENT_SHADER as o, isKnowledgeGraphStrokeViewportUsable as p, KNOWLEDGE_GRAPH_BACKGROUND_COLORS as r, KNOWLEDGE_GRAPH_EDGE_STROKE_VERTEX_SHADER as s, CORPUS_EDGE_STROKE_PATTERN_BY_KIND as t, createKnowledgeGraphNodeShellVertices as u, knowledgeGraphNodeEmphasisDimAmount as v, graphEdgeIdentityKey as w, knowledgeGraphRenderedNodeScale as x, knowledgeGraphNodeGlyphDescription as y };
//# sourceMappingURL=knowledgeGraphVisualEncoding.internal-CuP5jO83.js.map