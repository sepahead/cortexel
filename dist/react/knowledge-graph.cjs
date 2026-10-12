Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
const require_rolldown_runtime = require('../rolldown-runtime-C24Yb2bl.cjs');
const require_knowledgeGraphLimits = require('../knowledgeGraphLimits-BnjbjxkI.cjs');
const require_knowledgeGraphVisualEncoding_internal = require('../knowledgeGraphVisualEncoding.internal-CD-U4BOM.cjs');
const require_knowledgeGraphFigure = require('../knowledgeGraphFigure-BJ7Y_maa.cjs');
const require_KnowledgeGraphCorpusFrame_internal = require('../KnowledgeGraphCorpusFrame.internal-DFjBbocx.cjs');
let _cortexel_knowledge_graph_presentation_capability = require("#cortexel-knowledge-graph-presentation-capability");
let react = require("react");
let _react_three_fiber = require("@react-three/fiber");
let three = require("three");
three = require_rolldown_runtime.__toESM(three, 1);
let react_jsx_runtime = require("react/jsx-runtime");
let d3_force_3d = require("d3-force-3d");

//#region react/knowledgeGraphLayout.internal.ts
function assertGraphLayoutDimensions(dimensions) {
	if (dimensions !== 2 && dimensions !== 3) throw new RangeError("knowledge-graph layout dimensions must be 2 or 3");
}
/**
* Read every renderer-relevant prop into detached plain records on each React
* render, then key memoized mutable state from those records. Public props are
* readonly, but this runtime snapshot also protects JavaScript callers that
* mutate the same object/array identities between renders.
*/
function snapshotGraphLayoutInputs(nodes, edges, dimensions = 3) {
	assertGraphLayoutDimensions(dimensions);
	const nodeSnapshot = nodes.map(({ id, radius, nodeGlyph }) => ({
		id,
		radius,
		nodeGlyph
	}));
	const edgeSnapshot = edges.map(({ id, source, target, color, kind, directed, particles, edgeStrokePattern }) => ({
		id,
		source,
		target,
		color,
		kind,
		directed,
		particles,
		edgeStrokePattern
	}));
	return {
		dimensions,
		graphKey: `D${dimensions}|${require_knowledgeGraphFigure.graphSignature(nodeSnapshot, edgeSnapshot)}`,
		layoutKey: `D${dimensions}|${require_knowledgeGraphFigure.graphLayoutSignature(nodeSnapshot, edgeSnapshot)}`,
		nodes: nodeSnapshot,
		edges: edgeSnapshot
	};
}
/**
* Build a completely detached cache transaction. This module is deliberately
* absent from the package exports: mutable layout authority is an implementation
* detail, not a consumer API.
*
* Every retained tuple is copied. Current ids are moved to the end of the Map,
* making deterministic insertion order a bounded least-recently-active eviction
* order. A discarded effect can mutate any returned node, slot, or cache entry
* without reaching the currently published authority.
*/
function planGraphLayoutCache(nodes, remembered, maxRememberedPositions, dimensions = 3) {
	assertGraphLayoutDimensions(dimensions);
	if (!Number.isSafeInteger(maxRememberedPositions) || maxRememberedPositions < nodes.length) throw new RangeError("max remembered graph positions must be an integer at least as large as the active graph");
	const activeIds = /* @__PURE__ */ new Set();
	const plannedNodes = new Array(nodes.length);
	let warmStart = false;
	for (let index = 0; index < nodes.length; index++) {
		const input = nodes[index];
		if (activeIds.has(input.id)) throw new RangeError("graph layout node ids must be unique");
		activeIds.add(input.id);
		const r = require_knowledgeGraphFigure.normalizeGraphNodeRadius(input.radius);
		const previous = remembered.get(input.id);
		if (previous === void 0) {
			plannedNodes[index] = dimensions === 2 ? {
				id: input.id,
				r,
				z: 0
			} : {
				id: input.id,
				r
			};
			continue;
		}
		warmStart = true;
		plannedNodes[index] = {
			id: input.id,
			r,
			x: previous[0],
			y: previous[1],
			z: dimensions === 2 ? 0 : previous[2]
		};
	}
	const makeBuffer = () => {
		const cache = /* @__PURE__ */ new Map();
		for (const [id, previous] of remembered) cache.set(id, [
			previous[0],
			previous[1],
			dimensions === 2 ? 0 : previous[2]
		]);
		const positionSlots = new Array(nodes.length);
		for (let index = 0; index < nodes.length; index++) {
			const id = nodes[index].id;
			const previous = cache.get(id);
			const slot = previous ?? [
				0,
				0,
				0
			];
			if (previous !== void 0) cache.delete(id);
			cache.set(id, slot);
			positionSlots[index] = slot;
		}
		if (cache.size > maxRememberedPositions) for (const id of cache.keys()) {
			if (cache.size <= maxRememberedPositions) break;
			if (!activeIds.has(id)) cache.delete(id);
		}
		if (cache.size > maxRememberedPositions) throw new Error("active graph positions exceeded the validated cache authority");
		return {
			cache,
			positionSlots
		};
	};
	return {
		nodes: plannedNodes,
		cacheBuffers: [makeBuffer(), makeBuffer()],
		warmStart
	};
}
/**
* Publish one already-complete candidate. Call this only as the final authority
* operation of a successful frame. A throw before this call leaves both the
* published Map identity and every tuple reachable from it unchanged.
*/
function publishGraphLayoutCache(authority, buffered, completedBufferIndex) {
	if (completedBufferIndex !== buffered.nextCacheBufferIndex) throw new Error("graph layout cache publication is out of sequence");
	buffered.nextCacheBufferIndex = completedBufferIndex === 0 ? 1 : 0;
	authority.current = buffered.cacheBuffers[completedBufferIndex].cache;
}

//#endregion
//#region react/knowledgeGraphGeometryBounds.internal.ts
function createKnowledgeGraphGeometryBounds() {
	return {
		minX: Infinity,
		minY: Infinity,
		minZ: Infinity,
		maxX: -Infinity,
		maxY: -Infinity,
		maxZ: -Infinity
	};
}
function resetKnowledgeGraphGeometryBounds(bounds) {
	bounds.minX = bounds.minY = bounds.minZ = Infinity;
	bounds.maxX = bounds.maxY = bounds.maxZ = -Infinity;
}
function isKnowledgeGraphGeometryBoundsFinite(bounds) {
	return Number.isFinite(bounds.minX) && Number.isFinite(bounds.minY) && Number.isFinite(bounds.minZ) && Number.isFinite(bounds.maxX) && Number.isFinite(bounds.maxY) && Number.isFinite(bounds.maxZ) && bounds.minX <= bounds.maxX && bounds.minY <= bounds.maxY && bounds.minZ <= bounds.maxZ;
}
/** Reject an invalid point before changing any coordinate of the prior bounds. */
function includeKnowledgeGraphGeometryPointInto(bounds, x, y, z, radius = 0) {
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(radius) || radius < 0 || !Number.isFinite(x - radius) || !Number.isFinite(x + radius) || !Number.isFinite(y - radius) || !Number.isFinite(y + radius) || !Number.isFinite(z - radius) || !Number.isFinite(z + radius)) return false;
	bounds.minX = Math.min(bounds.minX, x - radius);
	bounds.minY = Math.min(bounds.minY, y - radius);
	bounds.minZ = Math.min(bounds.minZ, z - radius);
	bounds.maxX = Math.max(bounds.maxX, x + radius);
	bounds.maxY = Math.max(bounds.maxY, y + radius);
	bounds.maxZ = Math.max(bounds.maxZ, z + radius);
	return true;
}
function quadraticExtremum(a, control, b) {
	const scale = Math.max(Math.abs(a), Math.abs(control), Math.abs(b));
	if (scale === 0) return a;
	const first = a / scale;
	const middle = control / scale;
	const last = b / scale;
	const t = (first - middle) / (first - 2 * middle + last);
	if (!(t > 0 && t < 1)) return a;
	const s = 1 - t;
	const value = s * s * first + 2 * s * t * middle + t * t * last;
	return Math.max(Math.min(first, middle, last), Math.min(Math.max(first, middle, last), value)) * scale;
}
/**
* Bound the current quadratic lane, including its true extrema. A control point
* is not itself painted geometry. Bounding it, or reserving every possible lane,
* needlessly shrinks sparse graphs. Hidden dash chords stay within this envelope.
*/
function includeKnowledgeGraphQuadraticBoundsInto(bounds, a, control, b) {
	if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(a.z) || !Number.isFinite(control.x) || !Number.isFinite(control.y) || !Number.isFinite(control.z) || !Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.z)) return false;
	const x = quadraticExtremum(a.x, control.x, b.x);
	const y = quadraticExtremum(a.y, control.y, b.y);
	const z = quadraticExtremum(a.z, control.z, b.z);
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;
	bounds.minX = Math.min(bounds.minX, a.x, b.x, x);
	bounds.minY = Math.min(bounds.minY, a.y, b.y, y);
	bounds.minZ = Math.min(bounds.minZ, a.z, b.z, z);
	bounds.maxX = Math.max(bounds.maxX, a.x, b.x, x);
	bounds.maxY = Math.max(bounds.maxY, a.y, b.y, y);
	bounds.maxZ = Math.max(bounds.maxZ, a.z, b.z, z);
	return isKnowledgeGraphGeometryBoundsFinite(bounds);
}
function unit(value) {
	const norm = value.x * value.x + value.y * value.y + value.z * value.z;
	return Number.isFinite(norm) && Math.abs(norm - 1) < 1e-8;
}
function dot(a, b) {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}
/** Project all eight AABB corners into an explicitly checked orthonormal camera basis. */
function projectKnowledgeGraphGeometryBoundsInto(bounds, center, right, up, towardCamera, target) {
	if (!isKnowledgeGraphGeometryBoundsFinite(bounds) || !Number.isFinite(center.x) || !Number.isFinite(center.y) || !Number.isFinite(center.z) || !unit(right) || !unit(up) || !unit(towardCamera) || Math.abs(dot(right, up)) > 1e-8 || Math.abs(dot(right, towardCamera)) > 1e-8 || Math.abs(dot(up, towardCamera)) > 1e-8) return false;
	let minX = Infinity;
	let minY = Infinity;
	let minZ = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let maxZ = -Infinity;
	for (let corner = 0; corner < 8; corner++) {
		const x = (corner & 1 ? bounds.maxX : bounds.minX) - center.x;
		const y = (corner & 2 ? bounds.maxY : bounds.minY) - center.y;
		const z = (corner & 4 ? bounds.maxZ : bounds.minZ) - center.z;
		const projectedX = x * right.x + y * right.y + z * right.z;
		const projectedY = x * up.x + y * up.y + z * up.z;
		const projectedZ = x * towardCamera.x + y * towardCamera.y + z * towardCamera.z;
		if (!Number.isFinite(projectedX) || !Number.isFinite(projectedY) || !Number.isFinite(projectedZ)) return false;
		minX = Math.min(minX, projectedX);
		minY = Math.min(minY, projectedY);
		minZ = Math.min(minZ, projectedZ);
		maxX = Math.max(maxX, projectedX);
		maxY = Math.max(maxY, projectedY);
		maxZ = Math.max(maxZ, projectedZ);
	}
	target.minX = minX;
	target.minY = minY;
	target.minZ = minZ;
	target.maxX = maxX;
	target.maxY = maxY;
	target.maxZ = maxZ;
	return isKnowledgeGraphGeometryBoundsFinite(target);
}

//#endregion
//#region react/knowledgeGraphLabelLayout.internal.ts
const KNOWLEDGE_GRAPH_MAX_LABELS = 64;
const KNOWLEDGE_GRAPH_LABEL_HEIGHT_PX = 24;
const KNOWLEDGE_GRAPH_LABEL_GAP_PX = 5;
const KNOWLEDGE_GRAPH_LABEL_VIEWPORT_PADDING_PX = 8;
/** Only presentation priorities change. No node, assertion, or source record is removed. */
function planKnowledgeGraphLabelCandidates(nodes, selectedId, hoverId, queryMatches) {
	if (nodes.length > require_knowledgeGraphLimits.KNOWLEDGE_GRAPH_LIMITS.maxLiveForceNodes) throw new RangeError("label preparation requires an admitted live graph");
	const candidates = nodes.map((node, nodeIndex) => ({
		nodeIndex,
		id: node.id,
		label: node.label
	}));
	const priority = (id) => (id === selectedId ? 8 : 0) + (id === hoverId ? 4 : 0) + (queryMatches.has(id) ? 2 : 0);
	candidates.sort((a, b) => priority(b.id) - priority(a.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
	return candidates.slice(0, 64);
}
function createKnowledgeGraphLabelLayout(capacity) {
	if (!Number.isInteger(capacity) || capacity < 0 || capacity > 64) throw new RangeError("invalid bounded label capacity");
	return {
		x: new Float64Array(capacity),
		y: new Float64Array(capacity),
		visible: new Uint8Array(capacity),
		count: 0
	};
}
/**
* Each projected node has five scalar fields: x/y CSS pixels, conservative
* radius in CSS pixels, NDC depth, and world units per CSS pixel at that depth.
* Outputs reuse bounded scratch arrays. Labels never cover another node and
* never cross the viewport. A hidden label's complete text remains in the DOM.
*/
function layoutKnowledgeGraphLabelsInto(candidates, nodes, widths, viewportWidth, viewportHeight, target) {
	target.visible.fill(0);
	target.count = 0;
	if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0 || candidates.length > target.visible.length || candidates.length > widths.length || nodes.length % 5 !== 0 || candidates.length > 64 || nodes.length > require_knowledgeGraphLimits.KNOWLEDGE_GRAPH_LIMITS.maxLiveForceNodes * 5 || candidates.length > target.x.length || candidates.length > target.y.length || viewportHeight < 40) return 0;
	const height = 24;
	const padding = 8;
	const budget = Math.min(candidates.length, Math.max(4, Math.floor(viewportWidth * viewportHeight / 12e3)));
	for (let slot = 0; slot < candidates.length && target.count < budget; slot++) {
		const base = candidates[slot].nodeIndex * 5;
		const nodeX = nodes[base];
		const nodeY = nodes[base + 1];
		const radius = nodes[base + 2];
		const depth = nodes[base + 3];
		const pixelScale = nodes[base + 4];
		const width = widths[slot];
		if (!Number.isFinite(nodeX) || !Number.isFinite(nodeY) || !Number.isFinite(radius) || radius < 0 || !Number.isFinite(depth) || depth < -1 || depth > 1 || !Number.isFinite(pixelScale) || pixelScale <= 0 || !Number.isFinite(width) || width <= 0 || width > viewportWidth - 16 || nodeX < -radius || nodeX > viewportWidth + radius || nodeY < -radius || nodeY > viewportHeight + radius) continue;
		const gap = radius + 5;
		for (let placement = 0; placement < 8; placement++) {
			let x = nodeX;
			let y = nodeY;
			if (placement === 0 || placement === 4 || placement === 5) y -= gap + height / 2;
			if (placement === 1 || placement === 6 || placement === 7) y += gap + height / 2;
			if (placement === 2 || placement === 4 || placement === 6) x += gap + width / 2;
			if (placement === 3 || placement === 5 || placement === 7) x -= gap + width / 2;
			x = Math.max(padding + width / 2, Math.min(viewportWidth - padding - width / 2, x));
			y = Math.max(20, Math.min(viewportHeight - padding - height / 2, y));
			let collision = false;
			for (let other = 0; other < slot; other++) if (target.visible[other] && Math.abs(x - target.x[other]) < (width + widths[other]) / 2 + 3 && Math.abs(y - target.y[other]) < 27) {
				collision = true;
				break;
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

//#endregion
//#region react/knowledgeGraphLabelResource.internal.ts
const TILE_WIDTH = 384;
const TILE_HEIGHT = 64;
const MAX_COLUMNS = 8;
const FONT = "500 26px system-ui, sans-serif";
const PIXELS_PER_CSS_PIXEL = 2;
const MAX_TEXT_WIDTH = 328;
const TEXT_PADDING = 12;
const KNOWLEDGE_GRAPH_LABEL_VERTEX_SHADER = `
attribute vec4 labelUvRect;
varying vec2 vLabelUv;
void main() {
  vLabelUv = labelUvRect.xy + uv * labelUvRect.zw;
  vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec2 scale = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
  center.xy += position.xy * scale;
  gl_Position = projectionMatrix * center;
}`;
const KNOWLEDGE_GRAPH_LABEL_FRAGMENT_SHADER = `
uniform sampler2D labelMap;
varying vec2 vLabelUv;
void main() {
  gl_FragColor = texture2D(labelMap, vLabelUv);
  if (gl_FragColor.a < 0.01) discard;
  #include <colorspace_fragment>
}`;
function createKnowledgeGraphLabelResourceState(capacity) {
	if (!Number.isInteger(capacity) || capacity < 0 || capacity > 64) throw new RangeError("invalid bounded label resource capacity");
	return {
		widths: new Float32Array(capacity),
		uvRects: new Float32Array(capacity * 4),
		ready: false
	};
}
function fitLabel(context, value) {
	const text = require_knowledgeGraphLimits.safeDiagnosticText(value, 120);
	if (context.measureText(text).width <= MAX_TEXT_WIDTH) return text;
	const chunks = typeof Intl.Segmenter === "function" ? Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text), (part) => part.segment) : Array.from(text);
	while (chunks.length > 0 && context.measureText(chunks.join("") + "…").width > MAX_TEXT_WIDTH) chunks.pop();
	return chunks.join("") + "…";
}
/**
* Create one local atlas only after commit. At most 64 tiles occupy 3,072 ×
* 512 pixels (6 MiB of uncompressed RGBA). No network or font loader exists.
* The exact cleanup cannot clear a later replacement's sampler or ready state.
*/
function installKnowledgeGraphLabelResources({ labels, state, map, themeMode, color, invalidate, createCanvas = () => typeof document === "undefined" ? null : document.createElement("canvas"), createTexture = (canvas) => new three.CanvasTexture(canvas) }) {
	if (labels.length > 64 || labels.length !== state.widths.length || state.uvRects.length !== labels.length * 4) throw new RangeError("label atlas capacity mismatch");
	state.ready = false;
	state.widths.fill(0);
	if (labels.length === 0) {
		invalidate();
		return;
	}
	const canvas = createCanvas();
	const context = canvas?.getContext("2d");
	if (!canvas || !context) {
		invalidate();
		return;
	}
	const columns = Math.min(MAX_COLUMNS, labels.length);
	canvas.width = columns * TILE_WIDTH;
	canvas.height = Math.ceil(labels.length / columns) * TILE_HEIGHT;
	context.font = FONT;
	context.textAlign = "left";
	context.textBaseline = "middle";
	const background = themeMode === "light" ? "#f8fafc" : "#030711";
	const foreground = themeMode === "light" ? "#0f172a" : "#e2e8f0";
	for (let slot = 0; slot < labels.length; slot++) {
		const text = fitLabel(context, labels[slot]);
		const width = Math.max(32, Math.ceil(context.measureText(text).width) + 24);
		const x = slot % columns * TILE_WIDTH;
		const y = Math.floor(slot / columns) * TILE_HEIGHT;
		const height = 24 * PIXELS_PER_CSS_PIXEL;
		context.fillStyle = background;
		context.beginPath();
		if (typeof context.roundRect === "function") context.roundRect(x, y, width, height, 10);
		else context.rect(x, y, width, height);
		context.fill();
		context.fillStyle = foreground;
		context.fillStyle = color;
		context.fillText(text, x + TEXT_PADDING, y + height / 2);
		state.widths[slot] = width / PIXELS_PER_CSS_PIXEL;
		const uv = slot * 4;
		state.uvRects[uv] = x / canvas.width;
		state.uvRects[uv + 1] = 1 - (y + height) / canvas.height;
		state.uvRects[uv + 2] = width / canvas.width;
		state.uvRects[uv + 3] = height / canvas.height;
	}
	const texture = createTexture(canvas);
	try {
		texture.colorSpace = three.SRGBColorSpace;
		texture.minFilter = three.LinearFilter;
		texture.magFilter = three.LinearFilter;
		texture.generateMipmaps = false;
		map.value = texture;
		state.ready = true;
		invalidate();
	} catch (error) {
		if (map.value === texture) {
			map.value = null;
			state.ready = false;
		}
		try {
			texture.dispose();
		} catch (disposeError) {
			throw new AggregateError([error, disposeError], "label atlas setup and rollback failed");
		}
		throw error;
	}
	let cleaned = false;
	return () => {
		if (cleaned) return;
		cleaned = true;
		const ownsMap = map.value === texture;
		if (ownsMap) {
			map.value = null;
			state.ready = false;
		}
		let disposalError;
		let invalidateError;
		let disposalFailed = false;
		let invalidateFailed = false;
		try {
			texture.dispose();
		} catch (error) {
			disposalError = error;
			disposalFailed = true;
		}
		if (ownsMap) try {
			invalidate();
		} catch (error) {
			invalidateError = error;
			invalidateFailed = true;
		}
		if (disposalFailed && invalidateFailed) throw new AggregateError([disposalError, invalidateError], "label atlas cleanup failed");
		if (disposalFailed) throw disposalError;
		if (invalidateFailed) throw invalidateError;
	};
}

//#endregion
//#region react/knowledgeGraphCamera.internal.ts
const KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE = 120;
const KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN = 1.25;
const KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR = .001;
/** Small schematic graphs need not inherit the older sphere-fit 120-unit floor. */
const KNOWLEDGE_GRAPH_GEOMETRY_MIN_DISTANCE = 24;
const KNOWLEDGE_GRAPH_GEOMETRY_PIXEL_MARGIN = 32;
const IDENTITY_MATRIX_ELEMENTS = Object.freeze([
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	1,
	0,
	0,
	0,
	0,
	1
]);
function finiteEqual(observed, expected) {
	if (!Number.isFinite(observed) || !Number.isFinite(expected)) return false;
	const scale = Math.max(1, Math.abs(observed), Math.abs(expected));
	return Math.abs(observed - expected) <= Number.EPSILON * 64 * scale;
}
function isKnowledgeGraphIdentityMatrixElements(elements) {
	if (elements.length !== 16) return false;
	for (let index = 0; index < 16; index++) if (!finiteEqual(elements[index], IDENTITY_MATRIX_ELEMENTS[index])) return false;
	return true;
}
function areKnowledgeGraphMatrixElementsEqual(first, second) {
	if (first.length !== 16 || second.length !== 16) return false;
	for (let index = 0; index < 16; index++) if (!finiteEqual(first[index], second[index])) return false;
	return true;
}
/**
* Prove that a unit-scale camera's local/world matrices are the ordinary
* composition of its finite position and normalized quaternion. Identity
* ancestors then keep fitting and canonical camera methods in one world-space
* coordinate system. This check allocates nothing.
*/
function isKnowledgeGraphCameraSelfTransformCanonical(input) {
	const { position, quaternion, scale } = input;
	if (!input.matrixAutoUpdate || !isKnowledgeGraphCameraVectorFinite(position.x, position.y, position.z) || !isKnowledgeGraphCameraVectorFinite(scale.x, scale.y, scale.z) || scale.x !== 1 || scale.y !== 1 || scale.z !== 1 || !Number.isFinite(quaternion.x) || !Number.isFinite(quaternion.y) || !Number.isFinite(quaternion.z) || !Number.isFinite(quaternion.w) || input.matrix.elements.length !== 16 || input.matrixWorld.elements.length !== 16) return false;
	if (!finiteEqual(quaternion.x * quaternion.x + quaternion.y * quaternion.y + quaternion.z * quaternion.z + quaternion.w * quaternion.w, 1)) return false;
	const x2 = quaternion.x + quaternion.x;
	const y2 = quaternion.y + quaternion.y;
	const z2 = quaternion.z + quaternion.z;
	const xx = quaternion.x * x2;
	const xy = quaternion.x * y2;
	const xz = quaternion.x * z2;
	const yy = quaternion.y * y2;
	const yz = quaternion.y * z2;
	const zz = quaternion.z * z2;
	const wx = quaternion.w * x2;
	const wy = quaternion.w * y2;
	const wz = quaternion.w * z2;
	const matrix = input.matrix.elements;
	if (!(finiteEqual(matrix[0], 1 - (yy + zz)) && finiteEqual(matrix[1], xy + wz) && finiteEqual(matrix[2], xz - wy) && finiteEqual(matrix[3], 0) && finiteEqual(matrix[4], xy - wz) && finiteEqual(matrix[5], 1 - (xx + zz)) && finiteEqual(matrix[6], yz + wx) && finiteEqual(matrix[7], 0) && finiteEqual(matrix[8], xz + wy) && finiteEqual(matrix[9], yz - wx) && finiteEqual(matrix[10], 1 - (xx + yy)) && finiteEqual(matrix[11], 0) && finiteEqual(matrix[12], position.x) && finiteEqual(matrix[13], position.y) && finiteEqual(matrix[14], position.z) && finiteEqual(matrix[15], 1))) return false;
	return areKnowledgeGraphMatrixElementsEqual(matrix, input.matrixWorld.elements);
}
/** Reject any transformed camera ancestor; fitting is computed in graph world space. */
function isKnowledgeGraphCameraParentChainIdentity(parent) {
	let cursor = parent;
	let depth = 0;
	while (cursor !== null) {
		depth++;
		if (depth > 64) return false;
		if (cursor.position.x !== 0 || cursor.position.y !== 0 || cursor.position.z !== 0 || cursor.quaternion.x !== 0 || cursor.quaternion.y !== 0 || cursor.quaternion.z !== 0 || cursor.quaternion.w !== 1 || cursor.scale.x !== 1 || cursor.scale.y !== 1 || cursor.scale.z !== 1 || !isKnowledgeGraphIdentityMatrixElements(cursor.matrix.elements) || !isKnowledgeGraphIdentityMatrixElements(cursor.matrixWorld.elements)) return false;
		cursor = cursor.parent;
	}
	return true;
}
function canonicalPerspectiveProjection(input) {
	if (!Number.isFinite(input.fovDegrees) || input.fovDegrees <= 0 || input.fovDegrees >= 180 || !Number.isFinite(input.aspect) || input.aspect <= 0 || !Number.isFinite(input.zoom) || input.zoom <= 0 || !Number.isFinite(input.near) || input.near <= 0 || !Number.isFinite(input.far) || input.far <= input.near || !Number.isFinite(input.filmOffset) || input.filmOffset !== 0 || input.projectionMatrixElements.length !== 16) return false;
	const halfFov = input.fovDegrees * Math.PI / 360;
	const y = input.zoom / Math.tan(halfFov);
	const x = y / input.aspect;
	const c = -(input.far + input.near) / (input.far - input.near);
	const d = -2 * input.far * input.near / (input.far - input.near);
	const matrix = input.projectionMatrixElements;
	return finiteEqual(matrix[0], x) && finiteEqual(matrix[1], 0) && finiteEqual(matrix[2], 0) && finiteEqual(matrix[3], 0) && finiteEqual(matrix[4], 0) && finiteEqual(matrix[5], y) && finiteEqual(matrix[6], 0) && finiteEqual(matrix[7], 0) && finiteEqual(matrix[8], 0) && finiteEqual(matrix[9], 0) && finiteEqual(matrix[10], c) && finiteEqual(matrix[11], -1) && finiteEqual(matrix[12], 0) && finiteEqual(matrix[13], 0) && finiteEqual(matrix[14], d) && finiteEqual(matrix[15], 0);
}
function canonicalOrthographicProjection(input) {
	if (!Number.isFinite(input.left) || !Number.isFinite(input.right) || !Number.isFinite(input.top) || !Number.isFinite(input.bottom) || input.right <= input.left || input.top <= input.bottom || !finiteEqual(input.left, -input.right) || !finiteEqual(input.bottom, -input.top) || !Number.isFinite(input.zoom) || input.zoom <= 0 || !Number.isFinite(input.near) || input.near < 0 || !Number.isFinite(input.far) || input.far <= input.near || input.projectionMatrixElements.length !== 16) return false;
	const x = 2 * input.zoom / (input.right - input.left);
	const y = 2 * input.zoom / (input.top - input.bottom);
	const c = -2 / (input.far - input.near);
	const d = -(input.far + input.near) / (input.far - input.near);
	const matrix = input.projectionMatrixElements;
	return finiteEqual(matrix[0], x) && finiteEqual(matrix[1], 0) && finiteEqual(matrix[2], 0) && finiteEqual(matrix[3], 0) && finiteEqual(matrix[4], 0) && finiteEqual(matrix[5], y) && finiteEqual(matrix[6], 0) && finiteEqual(matrix[7], 0) && finiteEqual(matrix[8], 0) && finiteEqual(matrix[9], 0) && finiteEqual(matrix[10], c) && finiteEqual(matrix[11], 0) && finiteEqual(matrix[12], 0) && finiteEqual(matrix[13], 0) && finiteEqual(matrix[14], d) && finiteEqual(matrix[15], 1);
}
/** Accept only ordinary centered Three projections whose matrix matches fields. */
function isKnowledgeGraphCenteredAutoFrameProjectionSupported(input) {
	if (input.isArrayCamera || input.viewEnabled || !input.parentTransformIdentity || !input.selfTransformCanonical || !input.cameraMethodsCanonical || !input.projectionMethodCanonical || !input.webGlCoordinateSystem) return false;
	if (input.kind === "perspective") return input.effectiveFovMethodCanonical && canonicalPerspectiveProjection(input);
	return canonicalOrthographicProjection(input);
}
function isKnowledgeGraphPerspectiveProjectionReady(effectiveFovDegrees, aspect) {
	return Number.isFinite(effectiveFovDegrees) && effectiveFovDegrees > 0 && effectiveFovDegrees < 180 && Number.isFinite(aspect) && aspect > 0;
}
function isKnowledgeGraphOrthographicProjectionReady(horizontalSpan, verticalSpan, zoom) {
	return Number.isFinite(horizontalSpan) && horizontalSpan > 0 && Number.isFinite(verticalSpan) && verticalSpan > 0 && Number.isFinite(zoom) && zoom > 0;
}
function isKnowledgeGraphCameraVectorFinite(x, y, z) {
	return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
}
/** Accept only projections whose fit and clipping semantics Cortexel implements. */
function knowledgeGraphCameraProjectionKind(camera) {
	const perspective = camera.isPerspectiveCamera === true;
	const orthographic = camera.isOrthographicCamera === true;
	if (perspective === orthographic) return null;
	if (perspective) return "perspective";
	if (orthographic) return "orthographic";
	return null;
}
/** Allocation-free form for the R3F frame callback. */
function planKnowledgeGraphCameraClippingInto(kind, currentNearValue, currentFarValue, distanceValue, contentRadiusValue, target) {
	const radius = positiveFinite(contentRadiusValue, 1);
	const distance = positiveFinite(distanceValue, 120);
	const minimumNear = kind === "perspective" ? KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR : 0;
	const maximumNear = Math.max(minimumNear, distance - radius * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN);
	const fallbackNear = kind === "perspective" ? Math.min(.1, maximumNear) : 0;
	const near = Math.min(Number.isFinite(currentNearValue) && currentNearValue >= minimumNear ? currentNearValue : fallbackNear, maximumNear);
	const requiredFar = Math.max(near + KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR, distance + radius * KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN);
	const currentFar = Number.isFinite(currentFarValue) && currentFarValue > near ? currentFarValue : requiredFar;
	target.near = near;
	target.far = Math.max(currentFar, requiredFar);
	return target;
}
function positiveFinite(value, fallback) {
	return Number.isFinite(value) && value > 0 ? value : fallback;
}
function geometryViewportFraction(span, other) {
	return 1 - 2 * Math.min(32, Math.min(span, other) * .1) / span;
}
/**
* Fit the checked geometry in camera axes. Positive Z points toward the camera.
* The frontmost corner supplies a conservative depth term for both axes; this
* contains every point without the sphere's irrelevant depth-to-width penalty.
* Invalid observations leave the caller's pending fit and scratch result intact.
*/
function planKnowledgeGraphPerspectiveGeometryFitInto(bounds, verticalFovDegrees, aspect, viewportWidth, viewportHeight, target) {
	if (!isKnowledgeGraphGeometryBoundsFinite(bounds) || !isKnowledgeGraphPerspectiveProjectionReady(verticalFovDegrees, aspect) || !Number.isFinite(viewportWidth) || viewportWidth <= 0 || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return false;
	const verticalTan = Math.tan(verticalFovDegrees * Math.PI / 360);
	const horizontalTan = verticalTan * aspect;
	const x = Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX));
	const y = Math.max(Math.abs(bounds.minY), Math.abs(bounds.maxY));
	const depth = Math.max(0, bounds.maxZ);
	const distance = Math.max(24, depth + x / (horizontalTan * geometryViewportFraction(viewportWidth, viewportHeight)), depth + y / (verticalTan * geometryViewportFraction(viewportHeight, viewportWidth)));
	if (!Number.isFinite(distance) || distance <= depth) return false;
	target.distance = distance;
	target.orthographicZoom = void 0;
	return true;
}
function planKnowledgeGraphOrthographicGeometryFitInto(bounds, currentCameraDistance, horizontalSpan, verticalSpan, currentZoom, viewportWidth, viewportHeight, target) {
	if (!isKnowledgeGraphGeometryBoundsFinite(bounds) || !isKnowledgeGraphOrthographicProjectionReady(horizontalSpan, verticalSpan, currentZoom) || !Number.isFinite(currentCameraDistance) || currentCameraDistance < 0 || !Number.isFinite(viewportWidth) || viewportWidth <= 0 || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return false;
	const x = Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX));
	const y = Math.max(Math.abs(bounds.minY), Math.abs(bounds.maxY));
	const depth = Math.max(0, bounds.maxZ);
	if (x <= 0 || y <= 0) return false;
	const zoom = Math.min(horizontalSpan * geometryViewportFraction(viewportWidth, viewportHeight) / (2 * x), verticalSpan * geometryViewportFraction(viewportHeight, viewportWidth) / (2 * y));
	const distance = Math.max(24, depth + 1, currentCameraDistance);
	if (!Number.isFinite(zoom) || zoom <= 0 || !Number.isFinite(distance)) return false;
	target.distance = distance;
	target.orthographicZoom = zoom;
	return true;
}

//#endregion
//#region react/knowledgeGraphParticles.internal.ts
const KNOWLEDGE_GRAPH_FLOW_CYCLES_PER_SECOND = .28;
const MAX_KNOWLEDGE_GRAPH_FLOW_FRAME_DELTA_SECONDS = .1;
/**
* Keep the animated phase finite and bounded. Invalid/negative deltas pause;
* suspended-tab deltas are capped so resume cannot poison or jump the marker
* clock. The returned phase is always in [0, 1).
*/
function advanceKnowledgeGraphFlowPhase(currentPhase, deltaSeconds) {
	return ((Number.isFinite(currentPhase) ? (currentPhase % 1 + 1) % 1 : 0) + (Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? Math.min(deltaSeconds, MAX_KNOWLEDGE_GRAPH_FLOW_FRAME_DELTA_SECONDS) : 0) * KNOWLEDGE_GRAPH_FLOW_CYCLES_PER_SECOND) % 1;
}
/**
* A deterministic, strictly interior curve parameter for a stationary reduced-
* motion marker. This prevents a marker from being placed exactly at either
* endpoint; node-sphere occlusion can still depend on the host-owned layout.
*/
function reducedMotionFlowParticleFraction(particleIndex, particlesOnEdge) {
	if (!Number.isSafeInteger(particlesOnEdge) || particlesOnEdge < 1 || !Number.isSafeInteger(particleIndex) || particleIndex < 0 || particleIndex >= particlesOnEdge) throw new RangeError("reduced-motion particle index must belong to a positive finite allocation");
	return (particleIndex + 1) / (particlesOnEdge + 1);
}
/**
* Balance a capped particle budget across every declared flow edge. The cap must
* retain at least one marker per edge; otherwise the legend could claim a flow
* cue for relationships that receive no cue at all.
*/
function planFlowParticleDistribution(flowEdgeCount, requestedPerEdge, maxParticles) {
	const edges = Number.isFinite(flowEdgeCount) ? Math.max(0, Math.floor(flowEdgeCount)) : 0;
	const total = require_knowledgeGraphFigure.flowParticleCount(edges, requestedPerEdge, maxParticles);
	if (edges === 0) return {
		total: 0,
		basePerEdge: 0,
		extraEdgeCount: 0
	};
	if (total < edges) throw new RangeError("flow-particle cap must retain at least one marker per edge");
	const basePerEdge = Math.floor(total / edges);
	return {
		total,
		basePerEdge,
		extraEdgeCount: total - basePerEdge * edges
	};
}

//#endregion
//#region react/KnowledgeGraph3DScene.tsx
const PARTICLES_PER_EDGE = 4;
const GRAPH_LAYOUT_SETTLED_ALPHA = .008;
const MAX_PARTICLES = require_knowledgeGraphFigure.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES;
const FALLBACK_COLOR = "#64748b";
const MAX_REMEMBERED_POSITIONS = 5e3;
const _dummy = new three.Object3D();
const _color = new three.Color();
const _darkDimTarget = new three.Color("#030711");
const _lightDimTarget = new three.Color("#f8fafc");
const _a = new three.Vector3();
const _b = new three.Vector3();
const _curveControl = new three.Vector3();
const _curvePoint = new three.Vector3();
const _curveNext = new three.Vector3();
const _direction = new three.Vector3();
const _up = new three.Vector3(0, 1, 0);
const _sphere = new three.Sphere();
const _geometryBounds = createKnowledgeGraphGeometryBounds();
const _projectedGeometryBounds = createKnowledgeGraphGeometryBounds();
const _cameraRight = new three.Vector3();
const _cameraUp = new three.Vector3();
const _labelPoint = new three.Vector3();
const _labelViewPoint = new three.Vector3();
const _labelSceneScale = new three.Vector3();
const _labelCameraWorld = new three.Matrix4();
const _labelCameraInverse = new three.Matrix4();
const _labelProjectionInverse = new three.Matrix4();
const _layoutClockResult = {
	ticks: 0,
	remainderSeconds: 0
};
const _cameraFitResult = {
	distance: 0,
	orthographicZoom: void 0
};
const _cameraClippingResult = {
	near: 0,
	far: 0
};
const _perspectiveAutoFrameProjection = {
	kind: "perspective",
	isArrayCamera: false,
	viewEnabled: false,
	parentTransformIdentity: false,
	selfTransformCanonical: false,
	cameraMethodsCanonical: false,
	projectionMethodCanonical: false,
	effectiveFovMethodCanonical: false,
	webGlCoordinateSystem: false,
	fovDegrees: 0,
	aspect: 0,
	zoom: 0,
	near: 0,
	far: 0,
	filmOffset: 0,
	projectionMatrixElements: []
};
const _orthographicAutoFrameProjection = {
	kind: "orthographic",
	isArrayCamera: false,
	viewEnabled: false,
	parentTransformIdentity: false,
	selfTransformCanonical: false,
	cameraMethodsCanonical: false,
	projectionMethodCanonical: false,
	webGlCoordinateSystem: false,
	left: 0,
	right: 0,
	top: 0,
	bottom: 0,
	zoom: 0,
	near: 0,
	far: 0,
	projectionMatrixElements: []
};
const selectCamera = (state) => state.camera;
const selectRenderer = (state) => state.gl;
const selectInvalidate = (state) => state.invalidate;
const disableKnowledgeGraphGlyphRaycast = () => {};
/** Dev-only console warning (stripped by the consumer's production bundler). */
function devWarn(msg) {
	if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") return;
	if (typeof console !== "undefined" && console.warn) console.warn(`[cortexel] ${msg}`);
}
/** Dim a color toward the void background so unfocused elements stop blooming.
*  Returns the SHARED module scratch (consumers copy it out immediately, so no
*  allocation). An unparseable hex leaves the deterministic fallback rather than
*  the previous call's color, so a bad datum never bleeds a neighbor's colour. */
function dim(hex, amount, themeMode) {
	_color.set(FALLBACK_COLOR);
	_color.set(hex);
	return _color.lerp(themeMode === "light" ? _lightDimTarget : _darkDimTarget, amount);
}
function knowledgeGraphNodeUsesFocusScale(nodeId, focus, focusSet) {
	return focus !== null && (nodeId === focus || focusSet?.has(nodeId) === true);
}
/** Populate the one shared quadratic path definition consumed by lines,
* arrowheads, and flow particles. Module-scope vectors avoid direct frame allocations. */
function setEdgeCurve(source, target, lane, dimensions) {
	_a.set(source.x ?? 0, source.y ?? 0, source.z ?? 0);
	_b.set(target.x ?? 0, target.y ?? 0, target.z ?? 0);
	require_knowledgeGraphFigure.graphEdgeControlPointInto(_a, _b, lane, _curveControl, dimensions);
}
/** Allocation-free glyph upload shared by the three closed node-kind groups. */
function updateKnowledgeGraphGlyphMatrices(glyphMesh, nodeIndexes, simNodes, focus, focusSet) {
	if (glyphMesh === null) return;
	for (let glyphIndex = 0; glyphIndex < nodeIndexes.length; glyphIndex++) {
		const node = simNodes[nodeIndexes[glyphIndex]];
		const scale = require_knowledgeGraphVisualEncoding_internal.knowledgeGraphRenderedNodeScale(knowledgeGraphNodeUsesFocusScale(node.id, focus, focusSet));
		_dummy.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
		_dummy.quaternion.identity();
		_dummy.scale.setScalar(node.r * scale);
		_dummy.updateMatrix();
		glyphMesh.setMatrixAt(glyphIndex, _dummy.matrix);
	}
	glyphMesh.instanceMatrix.needsUpdate = true;
	glyphMesh.boundingSphere = null;
}
/** Keep the redundant kind shell in the same focus/query salience state as its node. */
function updateKnowledgeGraphGlyphColors(glyphMesh, nodeIndexes, visualNodes, glyphColor, focus, focusSet, queryActive, queryMatchIds, themeMode) {
	if (glyphMesh === null) return;
	for (let glyphIndex = 0; glyphIndex < nodeIndexes.length; glyphIndex++) {
		const node = visualNodes[nodeIndexes[glyphIndex]];
		const amount = require_knowledgeGraphVisualEncoding_internal.knowledgeGraphNodeEmphasisDimAmount(node.id, focus, focusSet, queryActive, queryMatchIds);
		glyphMesh.setColorAt(glyphIndex, dim(glyphColor, amount, themeMode));
	}
	if (glyphMesh.instanceColor) glyphMesh.instanceColor.needsUpdate = true;
}
function KnowledgeGraph3DScene(props) {
	(0, _cortexel_knowledge_graph_presentation_capability.assertPreparedGenericKnowledgeGraphPresentation)(props.presentation);
	if (props.view !== void 0) (0, _cortexel_knowledge_graph_presentation_capability.assertPreparedKnowledgeGraphView)(props.view, props.presentation);
	const nodes = props.view?.nodes ?? props.presentation.nodes;
	const edges = props.view?.edges ?? props.presentation.edges;
	require_knowledgeGraphFigure.assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
	return renderKnowledgeGraph3DScene(props);
}
function KnowledgeGraph2DScene(props) {
	(0, _cortexel_knowledge_graph_presentation_capability.assertPreparedGenericKnowledgeGraphPresentation)(props.presentation);
	if (props.view !== void 0) (0, _cortexel_knowledge_graph_presentation_capability.assertPreparedKnowledgeGraphView)(props.view, props.presentation);
	const nodes = props.view?.nodes ?? props.presentation.nodes;
	const edges = props.view?.edges ?? props.presentation.edges;
	require_knowledgeGraphFigure.assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
	return renderKnowledgeGraph3DScene(props, 2);
}
/** Package-internal corpus renderer used only below the canonical caption. */
function KnowledgeGraphCorpus3DSceneInternal(props) {
	(0, _cortexel_knowledge_graph_presentation_capability.assertPreparedCorpusKnowledgeGraphPresentation)(props.presentation);
	if (props.view !== void 0) (0, _cortexel_knowledge_graph_presentation_capability.assertPreparedKnowledgeGraphView)(props.view, props.presentation);
	const nodes = props.view?.nodes ?? props.presentation.nodes;
	const edges = props.view?.edges ?? props.presentation.edges;
	require_knowledgeGraphFigure.assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
	const dimensions = props.layoutDimensions ?? 3;
	assertGraphLayoutDimensions(dimensions);
	return renderKnowledgeGraph3DScene(props, dimensions);
}
function renderKnowledgeGraph3DScene(props, layoutDimensions = 3) {
	const { presentation, view, ...interactionProps } = props;
	(0, _cortexel_knowledge_graph_presentation_capability.assertPreparedKnowledgeGraphPresentation)(presentation);
	if (view !== void 0) (0, _cortexel_knowledge_graph_presentation_capability.assertPreparedKnowledgeGraphView)(view, presentation);
	const { graphIdentity } = presentation;
	const nodes = view?.nodes ?? presentation.nodes;
	const edges = view?.edges ?? presentation.edges;
	const selectedId = view !== void 0 && props.selectedId !== null && !(0, _cortexel_knowledge_graph_presentation_capability.knowledgeGraphViewContainsNode)(view, presentation, props.selectedId) ? null : props.selectedId;
	const hoverId = view !== void 0 && props.hoverId !== null && !(0, _cortexel_knowledge_graph_presentation_capability.knowledgeGraphViewContainsNode)(view, presentation, props.hoverId) ? null : props.hoverId;
	require_knowledgeGraphFigure.assertKnowledgeGraphIdentity(graphIdentity);
	require_KnowledgeGraphCorpusFrame_internal.assertKnowledgeGraphNodeReference(props.selectedId, "knowledge-graph selected id");
	require_KnowledgeGraphCorpusFrame_internal.assertKnowledgeGraphNodeReference(props.hoverId, "knowledge-graph hover id");
	require_KnowledgeGraphCorpusFrame_internal.assertKnowledgeGraphColor(props.labelColor, "knowledge-graph label color");
	require_KnowledgeGraphCorpusFrame_internal.assertKnowledgeGraphColor(props.particleColor, "knowledge-graph particle color");
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KnowledgeGraph3DSceneInstance, {
		...interactionProps,
		selectedId,
		hoverId,
		autoFrame: nodes.length > 0 ? props.autoFrame : false,
		graphIdentity,
		layoutDimensions,
		nodes,
		edges
	}, JSON.stringify([graphIdentity, layoutDimensions]));
}
function KnowledgeGraph3DSceneInstance({ graphIdentity, layoutDimensions, nodes, edges, selectedId, query, onSelect, hoverId, onHover, controlsRef, autoFrame = false, flyToSelection = false, labelColor, particleColor, flowMotion = "static", themeMode = "dark", reducedMotion = false }) {
	const meshRef = (0, react.useRef)(null);
	const linesRef = (0, react.useRef)(null);
	const particlesRef = (0, react.useRef)(null);
	const arrowsRef = (0, react.useRef)(null);
	const sphereGlyphsRef = (0, react.useRef)(null);
	const boxGlyphsRef = (0, react.useRef)(null);
	const diamondGlyphsRef = (0, react.useRef)(null);
	const labelsRef = (0, react.useRef)(null);
	const sceneGroupRef = (0, react.useRef)(null);
	const camera = (0, _react_three_fiber.useThree)(selectCamera);
	const gl = (0, _react_three_fiber.useThree)(selectRenderer);
	const invalidate = (0, _react_three_fiber.useThree)(selectInvalidate);
	const cameraProjectionKind = knowledgeGraphCameraProjectionKind(camera);
	const perspectiveCamera = camera;
	const orthographicCamera = camera;
	const resolvedLabelColor = labelColor ?? (themeMode === "light" ? "#0f172a" : "#e2e8f0");
	const resolvedParticleColor = particleColor ?? (themeMode === "light" ? "#0369a1" : "#8fd3ff");
	const flowAnimated = flowMotion === "animated" && !reducedMotion;
	const resolvedGlyphColor = themeMode === "light" ? "#0f172a" : "#f8fafc";
	const boxShellVertices = (0, react.useMemo)(() => require_knowledgeGraphVisualEncoding_internal.createKnowledgeGraphNodeShellVertices("box_shell"), []);
	const diamondShellVertices = (0, react.useMemo)(() => require_knowledgeGraphVisualEncoding_internal.createKnowledgeGraphNodeShellVertices("diamond_shell"), []);
	(0, react.useEffect)(() => {
		if (autoFrame && cameraProjectionKind === null) devWarn("knowledge-graph auto-frame supports only perspective and orthographic cameras");
	}, [autoFrame, cameraProjectionKind]);
	const [posMap] = (0, react.useState)(() => ({ current: /* @__PURE__ */ new Map() }));
	const readyGraphKeyRef = (0, react.useRef)(null);
	const autoFrameStageRef = (0, react.useRef)(0);
	const flyToIdRef = (0, react.useRef)(null);
	const onHoverRef = (0, react.useRef)(onHover);
	const hoverIdRef = (0, react.useRef)(hoverId);
	(0, react.useLayoutEffect)(() => {
		onHoverRef.current = onHover;
		hoverIdRef.current = hoverId;
	}, [onHover, hoverId]);
	(0, react.useEffect)(() => () => {
		if (hoverIdRef.current === null) return;
		hoverIdRef.current = null;
		onHoverRef.current(null);
	}, []);
	const attachedControlsRef = (0, react.useRef)(null);
	const [onUserGrab] = (0, react.useState)(() => () => {
		autoFrameStageRef.current = 2;
		flyToIdRef.current = null;
	});
	(0, react.useEffect)(() => () => {
		require_KnowledgeGraphCorpusFrame_internal.synchronizeKnowledgeGraphControlsListener(attachedControlsRef, null, onUserGrab);
	}, [onUserGrab]);
	const layoutInput = (0, react.useMemo)(() => snapshotGraphLayoutInputs(nodes, edges, layoutDimensions), [
		nodes,
		edges,
		layoutDimensions
	]);
	const graphKey = layoutInput.graphKey;
	const layoutKey = layoutInput.layoutKey;
	const normalizedQuery = (0, react.useMemo)(() => require_knowledgeGraphFigure.normalizeGraphQuery(query), [query]);
	const queryMatchIds = (0, react.useMemo)(() => require_knowledgeGraphFigure.graphQueryMatchIds(nodes, normalizedQuery, edges), [
		nodes,
		normalizedQuery,
		edges
	]);
	const queryActive = normalizedQuery.length > 0;
	const labelCandidates = (0, react.useMemo)(() => planKnowledgeGraphLabelCandidates(nodes, selectedId, hoverId, queryMatchIds), [
		nodes,
		selectedId,
		hoverId,
		queryMatchIds
	]);
	const labelResource = (0, react.useMemo)(() => createKnowledgeGraphLabelResourceState(labelCandidates.length), [labelCandidates.length]);
	const labelLayout = (0, react.useMemo)(() => createKnowledgeGraphLabelLayout(labelCandidates.length), [labelCandidates.length]);
	const projectedLabelNodes = (0, react.useMemo)(() => new Float64Array(nodes.length * 5), [nodes.length]);
	const labelUniforms = (0, react.useMemo)(() => ({ labelMap: { value: null } }), [labelResource]);
	(0, react.useLayoutEffect)(() => {
		const labels = labelsRef.current;
		const material = labels?.material;
		if (!labels || !(material instanceof three.ShaderMaterial)) return void 0;
		const map = material.uniforms.labelMap;
		if (!map) return void 0;
		const attribute = labels.geometry.getAttribute("labelUvRect");
		if (attribute instanceof three.InstancedBufferAttribute) attribute.needsUpdate = true;
		return installKnowledgeGraphLabelResources({
			labels: labelCandidates.map((node) => node.label),
			state: labelResource,
			map,
			themeMode,
			color: resolvedLabelColor,
			invalidate
		});
	}, [
		labelCandidates,
		labelResource,
		labelUniforms,
		themeMode,
		resolvedLabelColor,
		invalidate
	]);
	const visualNodes = (0, react.useMemo)(() => nodes.map(({ id, label, color, nodeGlyph }) => ({
		id,
		label,
		color: require_knowledgeGraphVisualEncoding_internal.knowledgeGraphContrastSafeColor(color, themeMode),
		nodeGlyph: nodeGlyph ?? "sphere_outline"
	})), [nodes, themeMode]);
	const glyphNodeIndexes = (0, react.useMemo)(() => ({
		sphere: visualNodes.flatMap((node, index) => node.nodeGlyph === "sphere_outline" ? [index] : []),
		box: visualNodes.flatMap((node, index) => node.nodeGlyph === "box_shell" ? [index] : []),
		diamond: visualNodes.flatMap((node, index) => node.nodeGlyph === "diamond_shell" ? [index] : [])
	}), [visualNodes]);
	const { layoutNodes, simLinks, index } = (0, react.useMemo)(() => {
		const index = /* @__PURE__ */ new Map();
		const layoutNodes = layoutInput.nodes.map((n, i) => {
			index.set(n.id, i);
			return {
				id: n.id,
				radius: n.radius,
				nodeGlyph: n.nodeGlyph
			};
		});
		const topologyEdges = require_knowledgeGraphFigure.filterGraphEdges(new Set(index.keys()), layoutInput.edges);
		return {
			layoutNodes,
			simLinks: require_knowledgeGraphFigure.uniqueGraphTopologyLinks(topologyEdges),
			index
		};
	}, [layoutKey]);
	const { validEdges, edgeLanes } = (0, react.useMemo)(() => {
		const validEdges = require_knowledgeGraphFigure.filterGraphEdges(new Set(index.keys()), layoutInput.edges);
		return {
			validEdges,
			edgeLanes: require_knowledgeGraphFigure.assignGraphEdgeLanes(validEdges)
		};
	}, [graphKey, index]);
	const neighbors = (0, react.useMemo)(() => require_knowledgeGraphFigure.buildAdjacency(new Set(index.keys()), validEdges), [index, validEdges]);
	(0, react.useEffect)(() => {
		if (hoverId == null || !index.has(hoverId)) return;
		const element = gl.domElement;
		const previous = element.style.cursor;
		element.style.cursor = "pointer";
		return () => {
			element.style.cursor = previous;
		};
	}, [
		gl,
		hoverId,
		index
	]);
	const flowEdges = (0, react.useMemo)(() => edgeLanes.filter(({ edge }) => edge.particles), [edgeLanes]);
	const directedEdges = (0, react.useMemo)(() => edgeLanes.filter(({ edge }) => edge.directed !== false), [edgeLanes]);
	const edgeDisplayColors = (0, react.useMemo)(() => validEdges.map((edge) => require_knowledgeGraphVisualEncoding_internal.knowledgeGraphContrastSafeColor(edge.color, themeMode)), [validEdges, themeMode]);
	const particleDistribution = (0, react.useMemo)(() => planFlowParticleDistribution(flowEdges.length, PARTICLES_PER_EDGE, MAX_PARTICLES), [flowEdges.length]);
	const particleCount = particleDistribution.total;
	(0, react.useEffect)(() => {
		if (flowEdges.length * PARTICLES_PER_EDGE > MAX_PARTICLES) devWarn(`KnowledgeGraph3DScene: ${flowEdges.length} flow edges exceed the ${MAX_PARTICLES}-particle cap at four markers each; marker density is reduced evenly and every flow edge retains at least one marker.`);
	}, [flowEdges.length]);
	const visibleLineSegmentCount = (0, react.useMemo)(() => validEdges.reduce((count, edge) => {
		let visible = 0;
		for (let chord = 0; chord < 12; chord++) if (require_knowledgeGraphVisualEncoding_internal.knowledgeGraphEdgeStrokeSegmentVisible(edge.edgeStrokePattern ?? "solid", chord, 12)) visible++;
		return count + visible;
	}, 0), [validEdges]);
	const linePos = (0, react.useMemo)(() => new Float32Array(visibleLineSegmentCount * 6), [visibleLineSegmentCount]);
	const lineCol = (0, react.useMemo)(() => new Float32Array(visibleLineSegmentCount * 6), [visibleLineSegmentCount]);
	const linePositionData = (0, react.useMemo)(() => new three.InstancedInterleavedBuffer(linePos, 6), [linePos]);
	const lineColorData = (0, react.useMemo)(() => new three.InstancedInterleavedBuffer(lineCol, 6), [lineCol]);
	const strokeQuad = (0, react.useMemo)(() => new Float32Array([
		0,
		-1,
		0,
		0,
		1,
		0,
		1,
		-1,
		0,
		1,
		1,
		0
	]), []);
	const strokeIndex = (0, react.useMemo)(() => new Uint16Array([
		0,
		1,
		2,
		2,
		1,
		3
	]), []);
	const strokeUniforms = (0, react.useMemo)(() => ({
		strokeViewport: { value: new three.Vector2(1, 1) },
		strokeWidth: { value: require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_EDGE_STROKE_WIDTH_PX },
		strokeNear: { value: .1 }
	}), []);
	(0, react.useLayoutEffect)(() => {
		meshRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		sphereGlyphsRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		boxGlyphsRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		diamondGlyphsRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		arrowsRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		particlesRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		linePositionData.setUsage(three.DynamicDrawUsage);
		labelsRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
	}, [
		linePos,
		linePositionData,
		labelCandidates.length,
		nodes.length,
		directedEdges.length,
		particleCount,
		glyphNodeIndexes.sphere.length,
		glyphNodeIndexes.box.length,
		glyphNodeIndexes.diamond.length
	]);
	const layoutRuntimeRef = (0, react.useRef)(null);
	const layoutTickAccumulatorRef = (0, react.useRef)(0);
	const geometryDirtyRef = (0, react.useRef)(true);
	const flowPhaseRef = (0, react.useRef)(0);
	(0, react.useEffect)(() => {
		const plan = planGraphLayoutCache(layoutNodes, posMap.current, MAX_REMEMBERED_POSITIONS, layoutDimensions);
		const simNodes = plan.nodes;
		const runtimeLinks = simLinks.map(({ source, target }) => ({
			source,
			target
		}));
		const linkForce = (0, d3_force_3d.forceLink)(runtimeLinks).id((d) => d.id).distance(34).strength(.35);
		const sim = (0, d3_force_3d.forceSimulation)(simNodes, layoutDimensions).force("charge", (0, d3_force_3d.forceManyBody)().strength(-140).distanceMax(600)).force("link", linkForce).force("center", (0, d3_force_3d.forceCenter)(0, 0, 0).strength(.04)).force("collide", (0, d3_force_3d.forceCollide)((d) => {
			const node = d;
			const layoutNode = layoutNodes[index.get(node.id)];
			return require_knowledgeGraphVisualEncoding_internal.knowledgeGraphRenderedNodeRadialExtent(node.r, layoutNode.nodeGlyph ?? "sphere_outline", true) + 3;
		}).iterations(2)).alpha(plan.warmStart ? .5 : 1).alphaDecay(.018).velocityDecay(.42).stop();
		if (reducedMotion) {
			const budget = require_knowledgeGraphFigure.reducedMotionLayoutTickBudget(simNodes.length, simLinks.length);
			for (let i = 0; i < budget && sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA; i++) sim.tick();
			sim.alpha(0);
		}
		const runtime = {
			layoutKey,
			reducedMotion,
			sim,
			nodes: simNodes,
			cacheBuffers: plan.cacheBuffers,
			nextCacheBufferIndex: 0
		};
		layoutRuntimeRef.current = runtime;
		layoutTickAccumulatorRef.current = 0;
		geometryDirtyRef.current = true;
		invalidate();
		return () => {
			sim.stop();
			if (layoutRuntimeRef.current === runtime) layoutRuntimeRef.current = null;
		};
	}, [
		layoutKey,
		layoutDimensions,
		layoutNodes,
		simLinks,
		index,
		reducedMotion,
		invalidate
	]);
	(0, react.useLayoutEffect)(() => {
		require_KnowledgeGraphCorpusFrame_internal.beginKnowledgeGraphRuntimeTransition(readyGraphKeyRef, geometryDirtyRef, sceneGroupRef.current, invalidate, () => {
			if (hoverIdRef.current === null) return;
			hoverIdRef.current = null;
			onHoverRef.current(null);
		});
	}, [
		graphKey,
		reducedMotion,
		invalidate
	]);
	(0, react.useLayoutEffect)(() => {
		geometryDirtyRef.current = true;
		invalidate();
	}, [flowAnimated, invalidate]);
	const applyEmphasis = (0, react.useCallback)(() => {
		const mesh = meshRef.current;
		const raw = hoverId ?? selectedId;
		const focus = raw != null && index.has(raw) ? raw : null;
		const focusSet = focus ? neighbors.get(focus) : null;
		if (mesh) {
			visualNodes.forEach((n, i) => {
				mesh.setColorAt(i, dim(n.color, require_knowledgeGraphVisualEncoding_internal.knowledgeGraphNodeEmphasisDimAmount(n.id, focus, focusSet, queryActive, queryMatchIds), themeMode));
			});
			if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		}
		updateKnowledgeGraphGlyphColors(sphereGlyphsRef.current, glyphNodeIndexes.sphere, visualNodes, resolvedGlyphColor, focus, focusSet, queryActive, queryMatchIds, themeMode);
		updateKnowledgeGraphGlyphColors(boxGlyphsRef.current, glyphNodeIndexes.box, visualNodes, resolvedGlyphColor, focus, focusSet, queryActive, queryMatchIds, themeMode);
		updateKnowledgeGraphGlyphColors(diamondGlyphsRef.current, glyphNodeIndexes.diamond, visualNodes, resolvedGlyphColor, focus, focusSet, queryActive, queryMatchIds, themeMode);
		let k = 0;
		for (let edgeIndex = 0; edgeIndex < validEdges.length; edgeIndex++) {
			const e = validEdges[edgeIndex];
			const incident = focus ? e.source === focus || e.target === focus : require_knowledgeGraphFigure.graphEdgeMatchesQuery(e.source, e.target, queryMatchIds, normalizedQuery);
			const c = dim(edgeDisplayColors[edgeIndex], focus === null && !queryActive ? 0 : incident ? 0 : .86, themeMode);
			for (let chord = 0; chord < 12; chord++) {
				if (!require_knowledgeGraphVisualEncoding_internal.knowledgeGraphEdgeStrokeSegmentVisible(e.edgeStrokePattern ?? "solid", chord, 12)) continue;
				lineCol[k] = c.r;
				lineCol[k + 1] = c.g;
				lineCol[k + 2] = c.b;
				lineCol[k + 3] = c.r;
				lineCol[k + 4] = c.g;
				lineCol[k + 5] = c.b;
				k += 6;
			}
		}
		const attr = (linesRef.current?.geometry)?.getAttribute("instanceStrokeColor");
		if (attr instanceof three.InterleavedBufferAttribute) attr.data.needsUpdate = true;
		const arrows = arrowsRef.current;
		if (arrows) {
			directedEdges.forEach(({ edge }, arrowIndex) => {
				const incident = focus ? edge.source === focus || edge.target === focus : require_knowledgeGraphFigure.graphEdgeMatchesQuery(edge.source, edge.target, queryMatchIds, normalizedQuery);
				arrows.setColorAt(arrowIndex, dim(edgeDisplayColors[directedEdges[arrowIndex].edgeIndex], focus === null && !queryActive ? 0 : incident ? 0 : .86, themeMode));
			});
			if (arrows.instanceColor) arrows.instanceColor.needsUpdate = true;
		}
	}, [
		visualNodes,
		glyphNodeIndexes,
		resolvedGlyphColor,
		validEdges,
		directedEdges,
		index,
		neighbors,
		hoverId,
		selectedId,
		queryActive,
		queryMatchIds,
		normalizedQuery,
		lineCol,
		edgeDisplayColors,
		themeMode
	]);
	(0, react.useLayoutEffect)(() => {
		applyEmphasis();
		geometryDirtyRef.current = true;
		invalidate();
	}, [applyEmphasis, invalidate]);
	(0, react.useEffect)(() => {
		flyToIdRef.current = flyToSelection && selectedId && index.has(selectedId) ? selectedId : null;
		if (flyToIdRef.current) {
			autoFrameStageRef.current = 2;
			invalidate();
		}
	}, [
		graphIdentity,
		selectedId,
		index,
		flyToSelection,
		invalidate
	]);
	(0, _react_three_fiber.useFrame)((state, delta) => {
		const runtime = layoutRuntimeRef.current;
		const mesh = meshRef.current;
		const controls = controlsRef?.current ?? null;
		require_KnowledgeGraphCorpusFrame_internal.synchronizeKnowledgeGraphControlsListener(attachedControlsRef, controls, onUserGrab);
		if (!runtime || runtime.layoutKey !== layoutKey || runtime.reducedMotion !== reducedMotion || !mesh) return;
		const sim = runtime.sim;
		const simNodes = runtime.nodes;
		let positionsChanged = geometryDirtyRef.current;
		if (sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA) {
			const advanced = require_knowledgeGraphFigure.advanceGraphLayoutClockInto(layoutTickAccumulatorRef.current, delta, _layoutClockResult);
			layoutTickAccumulatorRef.current = advanced.remainderSeconds;
			for (let tick = 0; tick < advanced.ticks && sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA; tick++) {
				sim.tick();
				positionsChanged = true;
			}
		} else layoutTickAccumulatorRef.current = 0;
		const raw = hoverId ?? selectedId;
		const focus = raw != null && index.has(raw) ? raw : null;
		const focusSet = focus ? neighbors.get(focus) : null;
		const completedCacheBufferIndex = runtime.nextCacheBufferIndex;
		if (positionsChanged) {
			geometryDirtyRef.current = true;
			const sceneGroup = sceneGroupRef.current;
			if (sceneGroup) sceneGroup.visible = false;
			const positionSlots = runtime.cacheBuffers[completedCacheBufferIndex].positionSlots;
			_dummy.quaternion.identity();
			for (let i = 0; i < simNodes.length; i++) {
				const n = simNodes[i];
				const x = n.x ?? 0;
				const y = n.y ?? 0;
				const z = n.z ?? 0;
				const remembered = positionSlots[i];
				remembered[0] = x;
				remembered[1] = y;
				remembered[2] = z;
				_dummy.position.set(x, y, z);
				const pop = require_knowledgeGraphVisualEncoding_internal.knowledgeGraphRenderedNodeScale(knowledgeGraphNodeUsesFocusScale(n.id, focus, focusSet));
				_dummy.scale.setScalar(n.r * pop);
				_dummy.updateMatrix();
				mesh.setMatrixAt(i, _dummy.matrix);
			}
			mesh.instanceMatrix.needsUpdate = true;
			mesh.boundingSphere = null;
			updateKnowledgeGraphGlyphMatrices(sphereGlyphsRef.current, glyphNodeIndexes.sphere, simNodes, focus, focusSet);
			updateKnowledgeGraphGlyphMatrices(boxGlyphsRef.current, glyphNodeIndexes.box, simNodes, focus, focusSet);
			updateKnowledgeGraphGlyphMatrices(diamondGlyphsRef.current, glyphNodeIndexes.diamond, simNodes, focus, focusSet);
			let k = 0;
			for (let edgeIndex = 0; edgeIndex < edgeLanes.length; edgeIndex++) {
				const lane = edgeLanes[edgeIndex];
				const e = lane.edge;
				const s = simNodes[index.get(e.source)];
				const t = simNodes[index.get(e.target)];
				setEdgeCurve(s, t, lane, layoutDimensions);
				_curvePoint.copy(_a);
				for (let chord = 0; chord < 12; chord++) {
					require_knowledgeGraphFigure.graphEdgeCurvePointInto(_a, _curveControl, _b, (chord + 1) / 12, _curveNext);
					if (require_knowledgeGraphVisualEncoding_internal.knowledgeGraphEdgeStrokeSegmentVisible(e.edgeStrokePattern ?? "solid", chord, 12)) {
						linePos[k] = _curvePoint.x;
						linePos[k + 1] = _curvePoint.y;
						linePos[k + 2] = _curvePoint.z;
						linePos[k + 3] = _curveNext.x;
						linePos[k + 4] = _curveNext.y;
						linePos[k + 5] = _curveNext.z;
						k += 6;
					}
					_curvePoint.copy(_curveNext);
				}
			}
			const posAttr = linesRef.current?.geometry.getAttribute("instanceStart");
			if (posAttr instanceof three.InterleavedBufferAttribute) posAttr.data.needsUpdate = true;
			const arrows = arrowsRef.current;
			if (arrows) {
				for (let i = 0; i < directedEdges.length; i++) {
					const lane = directedEdges[i];
					const edge = lane.edge;
					const source = simNodes[index.get(edge.source)];
					const targetIndex = index.get(edge.target);
					const target = simNodes[targetIndex];
					setEdgeCurve(source, target, lane, layoutDimensions);
					const targetExtent = require_knowledgeGraphVisualEncoding_internal.knowledgeGraphRenderedNodeRadialExtent(target.r, visualNodes[targetIndex].nodeGlyph, knowledgeGraphNodeUsesFocusScale(target.id, focus, focusSet));
					if (!require_knowledgeGraphFigure.graphEdgeTargetBoundaryInto(_a, _curveControl, _b, targetExtent, _curveNext, _direction)) {
						_dummy.position.copy(_b);
						_dummy.quaternion.identity();
						_dummy.scale.setScalar(0);
					} else {
						_dummy.position.copy(_curveNext).addScaledVector(_direction, -require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH / 2);
						_dummy.quaternion.setFromUnitVectors(_up, _direction);
						_dummy.scale.set(require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_DIRECTION_MARKER_RADIUS, require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH, require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_DIRECTION_MARKER_RADIUS);
					}
					_dummy.updateMatrix();
					arrows.setMatrixAt(i, _dummy.matrix);
				}
				arrows.instanceMatrix.needsUpdate = true;
				arrows.boundingSphere = null;
			}
		}
		const pmesh = particlesRef.current;
		if (pmesh && particleCount > 0 && (positionsChanged || flowAnimated)) {
			_dummy.quaternion.identity();
			if (flowAnimated) flowPhaseRef.current = advanceKnowledgeGraphFlowPhase(flowPhaseRef.current, delta);
			const base = flowAnimated ? flowPhaseRef.current : 0;
			let p = 0;
			for (let fe = 0; fe < flowEdges.length && p < particleCount; fe++) {
				const lane = flowEdges[fe];
				const e = lane.edge;
				const s = simNodes[index.get(e.source)];
				const t = simNodes[index.get(e.target)];
				setEdgeCurve(s, t, lane, layoutDimensions);
				const queryIncident = require_knowledgeGraphFigure.graphEdgeMatchesQuery(e.source, e.target, queryMatchIds, normalizedQuery);
				let size = 1.3;
				if (focus) {
					if (e.source !== focus && e.target !== focus) size = 0;
				} else if (!queryIncident) size = 0;
				const phase = fe * .618034;
				const edgeParticleCount = particleDistribution.basePerEdge + (fe < particleDistribution.extraEdgeCount ? 1 : 0);
				for (let q = 0; q < edgeParticleCount && p < particleCount; q++) {
					const frac = flowAnimated ? (base + phase + q / edgeParticleCount) % 1 : reducedMotionFlowParticleFraction(q, edgeParticleCount);
					require_knowledgeGraphFigure.graphEdgeCurvePointInto(_a, _curveControl, _b, frac, _dummy.position);
					_dummy.scale.setScalar(size);
					_dummy.updateMatrix();
					pmesh.setMatrixAt(p, _dummy.matrix);
					p++;
				}
			}
			pmesh.instanceMatrix.needsUpdate = true;
		}
		const layoutSettled = sim.alpha() <= GRAPH_LAYOUT_SETTLED_ALPHA;
		if (autoFrame && autoFrameStageRef.current < 2 && (autoFrameStageRef.current === 0 || layoutSettled) && simNodes.length > 0 && cameraProjectionKind !== null) {
			const cameraParentIdentity = isKnowledgeGraphCameraParentChainIdentity(camera.parent);
			const cameraSelfTransformCanonical = isKnowledgeGraphCameraSelfTransformCanonical(camera);
			const cameraMethodsCanonical = camera.getWorldDirection === three.Camera.prototype.getWorldDirection && camera.lookAt === three.Object3D.prototype.lookAt && camera.updateMatrixWorld === three.Camera.prototype.updateMatrixWorld && camera.updateWorldMatrix === three.Camera.prototype.updateWorldMatrix;
			let centeredProjectionSupported = false;
			if (cameraProjectionKind === "perspective") {
				_perspectiveAutoFrameProjection.isArrayCamera = camera.isArrayCamera === true;
				_perspectiveAutoFrameProjection.viewEnabled = perspectiveCamera.view?.enabled === true;
				_perspectiveAutoFrameProjection.parentTransformIdentity = cameraParentIdentity;
				_perspectiveAutoFrameProjection.selfTransformCanonical = cameraSelfTransformCanonical;
				_perspectiveAutoFrameProjection.cameraMethodsCanonical = cameraMethodsCanonical;
				_perspectiveAutoFrameProjection.projectionMethodCanonical = camera.updateProjectionMatrix === three.PerspectiveCamera.prototype.updateProjectionMatrix;
				_perspectiveAutoFrameProjection.effectiveFovMethodCanonical = perspectiveCamera.getEffectiveFOV === three.PerspectiveCamera.prototype.getEffectiveFOV;
				_perspectiveAutoFrameProjection.webGlCoordinateSystem = camera.coordinateSystem === three.WebGLCoordinateSystem;
				_perspectiveAutoFrameProjection.fovDegrees = perspectiveCamera.fov;
				_perspectiveAutoFrameProjection.aspect = perspectiveCamera.aspect;
				_perspectiveAutoFrameProjection.zoom = perspectiveCamera.zoom;
				_perspectiveAutoFrameProjection.near = perspectiveCamera.near;
				_perspectiveAutoFrameProjection.far = perspectiveCamera.far;
				_perspectiveAutoFrameProjection.filmOffset = perspectiveCamera.filmOffset;
				_perspectiveAutoFrameProjection.projectionMatrixElements = perspectiveCamera.projectionMatrix.elements;
				centeredProjectionSupported = isKnowledgeGraphCenteredAutoFrameProjectionSupported(_perspectiveAutoFrameProjection);
			} else {
				_orthographicAutoFrameProjection.isArrayCamera = camera.isArrayCamera === true;
				_orthographicAutoFrameProjection.viewEnabled = orthographicCamera.view?.enabled === true;
				_orthographicAutoFrameProjection.parentTransformIdentity = cameraParentIdentity;
				_orthographicAutoFrameProjection.selfTransformCanonical = cameraSelfTransformCanonical;
				_orthographicAutoFrameProjection.cameraMethodsCanonical = cameraMethodsCanonical;
				_orthographicAutoFrameProjection.projectionMethodCanonical = camera.updateProjectionMatrix === three.OrthographicCamera.prototype.updateProjectionMatrix;
				_orthographicAutoFrameProjection.webGlCoordinateSystem = camera.coordinateSystem === three.WebGLCoordinateSystem;
				_orthographicAutoFrameProjection.left = orthographicCamera.left;
				_orthographicAutoFrameProjection.right = orthographicCamera.right;
				_orthographicAutoFrameProjection.top = orthographicCamera.top;
				_orthographicAutoFrameProjection.bottom = orthographicCamera.bottom;
				_orthographicAutoFrameProjection.zoom = orthographicCamera.zoom;
				_orthographicAutoFrameProjection.near = orthographicCamera.near;
				_orthographicAutoFrameProjection.far = orthographicCamera.far;
				_orthographicAutoFrameProjection.projectionMatrixElements = orthographicCamera.projectionMatrix.elements;
				centeredProjectionSupported = isKnowledgeGraphCenteredAutoFrameProjectionSupported(_orthographicAutoFrameProjection);
			}
			const perspectiveFov = centeredProjectionSupported && cameraProjectionKind === "perspective" ? perspectiveCamera.getEffectiveFOV() : 0;
			const horizontalSpan = cameraProjectionKind === "orthographic" ? Math.abs(orthographicCamera.right - orthographicCamera.left) : 0;
			const verticalSpan = cameraProjectionKind === "orthographic" ? Math.abs(orthographicCamera.top - orthographicCamera.bottom) : 0;
			const projectionReady = centeredProjectionSupported && (cameraProjectionKind === "perspective" ? isKnowledgeGraphPerspectiveProjectionReady(perspectiveFov, perspectiveCamera.aspect) : isKnowledgeGraphOrthographicProjectionReady(horizontalSpan, verticalSpan, orthographicCamera.zoom));
			const cameraPositionReady = isKnowledgeGraphCameraVectorFinite(camera.position.x, camera.position.y, camera.position.z);
			const controlsTargetReady = controls === null || isKnowledgeGraphCameraVectorFinite(controls.target.x, controls.target.y, controls.target.z);
			if (projectionReady && cameraPositionReady && controlsTargetReady) {
				resetKnowledgeGraphGeometryBounds(_geometryBounds);
				let geometryFinite = true;
				for (let nodeIndex = 0; nodeIndex < simNodes.length; nodeIndex++) {
					const node = simNodes[nodeIndex];
					const extent = require_knowledgeGraphVisualEncoding_internal.knowledgeGraphAutoFrameNodeRadialExtent(node.r, visualNodes[nodeIndex].nodeGlyph, knowledgeGraphNodeUsesFocusScale(node.id, focus, focusSet));
					if (!includeKnowledgeGraphGeometryPointInto(_geometryBounds, node.x ?? 0, node.y ?? 0, node.z ?? 0, extent)) geometryFinite = false;
				}
				for (let edgeIndex = 0; edgeIndex < edgeLanes.length; edgeIndex++) {
					const lane = edgeLanes[edgeIndex];
					setEdgeCurve(simNodes[index.get(lane.edge.source)], simNodes[index.get(lane.edge.target)], lane, layoutDimensions);
					if (!includeKnowledgeGraphQuadraticBoundsInto(_geometryBounds, _a, _curveControl, _b)) geometryFinite = false;
				}
				for (let edgeIndex = 0; edgeIndex < directedEdges.length; edgeIndex++) {
					const lane = directedEdges[edgeIndex];
					const source = simNodes[index.get(lane.edge.source)];
					const targetIndex = index.get(lane.edge.target);
					const target = simNodes[targetIndex];
					setEdgeCurve(source, target, lane, layoutDimensions);
					const targetExtent = require_knowledgeGraphVisualEncoding_internal.knowledgeGraphRenderedNodeRadialExtent(target.r, visualNodes[targetIndex].nodeGlyph, knowledgeGraphNodeUsesFocusScale(target.id, focus, focusSet));
					if (require_knowledgeGraphFigure.graphEdgeTargetBoundaryInto(_a, _curveControl, _b, targetExtent, _curveNext, _direction)) {
						_curveNext.addScaledVector(_direction, -require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH / 2);
						if (!includeKnowledgeGraphGeometryPointInto(_geometryBounds, _curveNext.x, _curveNext.y, _curveNext.z, Math.hypot(4.5 / 2, 1.5))) geometryFinite = false;
					}
				}
				const sphere = _sphere;
				sphere.center.set(_geometryBounds.minX / 2 + _geometryBounds.maxX / 2, _geometryBounds.minY / 2 + _geometryBounds.maxY / 2, _geometryBounds.minZ / 2 + _geometryBounds.maxZ / 2);
				sphere.radius = Math.hypot(_geometryBounds.maxX / 2 - _geometryBounds.minX / 2, _geometryBounds.maxY / 2 - _geometryBounds.minY / 2, _geometryBounds.maxZ / 2 - _geometryBounds.minZ / 2);
				const currentDistance = layoutDimensions === 2 && autoFrameStageRef.current === 0 ? 0 : controls ? camera.position.distanceTo(controls.target) : camera.position.distanceTo(sphere.center);
				if (layoutDimensions === 2) _direction.set(0, 0, 1);
				else if (controls && camera.position.distanceToSquared(controls.target) > 1e-12) _direction.copy(camera.position).sub(controls.target).normalize();
				else camera.getWorldDirection(_direction).multiplyScalar(-1);
				if (isKnowledgeGraphCameraVectorFinite(_direction.x, _direction.y, _direction.z) && geometryFinite) {
					if (_direction.lengthSq() <= 1e-12) _direction.set(0, 0, 1);
					else _direction.normalize();
					_cameraRight.crossVectors(camera.up, _direction).normalize();
					_cameraUp.crossVectors(_direction, _cameraRight).normalize();
					if (projectKnowledgeGraphGeometryBoundsInto(_geometryBounds, sphere.center, _cameraRight, _cameraUp, _direction, _projectedGeometryBounds) && (cameraProjectionKind === "orthographic" ? planKnowledgeGraphOrthographicGeometryFitInto(_projectedGeometryBounds, currentDistance, horizontalSpan, verticalSpan, orthographicCamera.zoom, state.size.width, state.size.height, _cameraFitResult) : planKnowledgeGraphPerspectiveGeometryFitInto(_projectedGeometryBounds, perspectiveFov, perspectiveCamera.aspect, state.size.width, state.size.height, _cameraFitResult))) {
						const fit = _cameraFitResult;
						camera.position.copy(sphere.center).addScaledVector(_direction, fit.distance);
						if (cameraProjectionKind === "orthographic" && fit.orthographicZoom !== void 0) orthographicCamera.zoom = fit.orthographicZoom;
						const projected = camera;
						const clipping = planKnowledgeGraphCameraClippingInto(cameraProjectionKind, projected.near, projected.far, fit.distance, sphere.radius, _cameraClippingResult);
						projected.near = clipping.near;
						projected.far = clipping.far;
						projected.updateProjectionMatrix();
						if (controls) {
							controls.target.copy(sphere.center);
							controls.update();
						} else {
							camera.lookAt(sphere.center);
							camera.updateMatrixWorld();
						}
						autoFrameStageRef.current = layoutSettled ? 2 : 1;
					}
				}
			}
		}
		if (flyToIdRef.current) {
			const fi = index.get(flyToIdRef.current);
			if (fi == null) flyToIdRef.current = null;
			else if (controls) {
				const n = simNodes[fi];
				_a.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
				controls.target.lerp(_a, require_knowledgeGraphFigure.graphCameraTargetDamping(delta, reducedMotion));
				controls.update();
				if (controls.target.distanceTo(_a) < .5) flyToIdRef.current = null;
			} else flyToIdRef.current = null;
		}
		const strokes = linesRef.current;
		if (strokes) {
			const viewportUsable = require_knowledgeGraphVisualEncoding_internal.isKnowledgeGraphStrokeViewportUsable(state.size.width, state.size.height, camera.near);
			strokes.visible = viewportUsable;
			if (viewportUsable) {
				strokes.material.uniforms.strokeViewport.value.set(state.size.width, state.size.height);
				strokes.material.uniforms.strokeNear.value = camera.near;
			}
		}
		const labels = labelsRef.current;
		if (labels && labelResource.ready && cameraProjectionKind !== null && Number.isFinite(camera.projectionMatrix.elements[5]) && camera.projectionMatrix.elements[5] !== 0) {
			if (camera.matrixAutoUpdate) _labelCameraWorld.compose(camera.position, camera.quaternion, camera.scale);
			else _labelCameraWorld.copy(camera.matrix);
			if (camera.parent) _labelCameraWorld.premultiply(camera.parent.matrixWorld);
			_labelCameraInverse.copy(_labelCameraWorld).invert();
			_labelProjectionInverse.copy(camera.projectionMatrix).invert();
			const sceneGroup = sceneGroupRef.current;
			if (sceneGroup) sceneGroup.getWorldScale(_labelSceneScale);
			else _labelSceneScale.set(1, 1, 1);
			const sceneScale = Math.max(Math.abs(_labelSceneScale.x), Math.abs(_labelSceneScale.y), Math.abs(_labelSceneScale.z));
			const pixelFactor = 2 / (Math.abs(camera.projectionMatrix.elements[5]) * state.size.height);
			for (let nodeIndex = 0; nodeIndex < simNodes.length; nodeIndex++) {
				const node = simNodes[nodeIndex];
				_labelPoint.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
				if (sceneGroup) sceneGroup.localToWorld(_labelPoint);
				_labelViewPoint.copy(_labelPoint).applyMatrix4(_labelCameraInverse);
				const depth = -_labelViewPoint.z;
				const pixelScale = cameraProjectionKind === "perspective" ? depth * pixelFactor : pixelFactor;
				const radius = sceneScale * require_knowledgeGraphVisualEncoding_internal.knowledgeGraphAutoFrameNodeRadialExtent(node.r, visualNodes[nodeIndex].nodeGlyph, knowledgeGraphNodeUsesFocusScale(node.id, focus, focusSet));
				_labelPoint.copy(_labelViewPoint).applyMatrix4(camera.projectionMatrix);
				const slot = nodeIndex * 5;
				projectedLabelNodes[slot] = (_labelPoint.x + 1) * state.size.width / 2;
				projectedLabelNodes[slot + 1] = (1 - _labelPoint.y) * state.size.height / 2;
				projectedLabelNodes[slot + 2] = radius / (pixelScale * (cameraProjectionKind === "perspective" ? Math.max(.05, 1 - radius / depth) : 1));
				projectedLabelNodes[slot + 3] = _labelPoint.z;
				projectedLabelNodes[slot + 4] = pixelScale;
			}
			layoutKnowledgeGraphLabelsInto(labelCandidates, projectedLabelNodes, labelResource.widths, state.size.width, state.size.height, labelLayout);
			_dummy.quaternion.identity();
			for (let slot = 0; slot < labelCandidates.length; slot++) {
				if (labelLayout.visible[slot]) {
					const base = labelCandidates[slot].nodeIndex * 5;
					_labelPoint.set(labelLayout.x[slot] * 2 / state.size.width - 1, 1 - labelLayout.y[slot] * 2 / state.size.height, projectedLabelNodes[base + 3]).applyMatrix4(_labelProjectionInverse).applyMatrix4(_labelCameraWorld);
					if (sceneGroup) sceneGroup.worldToLocal(_labelPoint);
					_dummy.position.copy(_labelPoint);
					const units = projectedLabelNodes[base + 4];
					_dummy.scale.set(labelResource.widths[slot] * units, 24 * units, 1);
				} else {
					_dummy.position.set(0, 0, 0);
					_dummy.scale.set(0, 0, 0);
				}
				_dummy.updateMatrix();
				labels.setMatrixAt(slot, _dummy.matrix);
			}
			labels.instanceMatrix.needsUpdate = true;
			labels.boundingSphere = null;
			labels.visible = true;
		} else if (labels) labels.visible = false;
		if (sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA || flowAnimated && particleCount > 0 || flyToIdRef.current !== null) invalidate();
		if (positionsChanged) {
			publishGraphLayoutCache(posMap, runtime, completedCacheBufferIndex);
			geometryDirtyRef.current = false;
			readyGraphKeyRef.current = graphKey;
			const group = sceneGroupRef.current;
			if (group) group.visible = true;
		}
	});
	const handleMove = (0, react.useCallback)((e) => {
		const runtime = layoutRuntimeRef.current;
		if (readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.layoutKey !== layoutKey || runtime.reducedMotion !== reducedMotion) return;
		if (!require_KnowledgeGraphCorpusFrame_internal.isKnowledgeGraphInstanceId(e.instanceId, visualNodes.length)) return;
		e.stopPropagation();
		const id = visualNodes[e.instanceId].id;
		if (id !== hoverIdRef.current) {
			hoverIdRef.current = id;
			onHoverRef.current(id);
		}
	}, [
		graphKey,
		layoutKey,
		reducedMotion,
		visualNodes
	]);
	const handleOut = (0, react.useCallback)((e) => {
		const runtime = layoutRuntimeRef.current;
		const ready = !(readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.layoutKey !== layoutKey || runtime.reducedMotion !== reducedMotion);
		require_KnowledgeGraphCorpusFrame_internal.handleKnowledgeGraphPointerOut(ready, () => e.stopPropagation(), () => {
			if (hoverIdRef.current === null) return;
			hoverIdRef.current = null;
			onHoverRef.current(null);
		});
	}, [
		graphKey,
		layoutKey,
		reducedMotion
	]);
	const handleClick = (0, react.useCallback)((e) => {
		const runtime = layoutRuntimeRef.current;
		const ready = !(readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.layoutKey !== layoutKey || runtime.reducedMotion !== reducedMotion);
		require_KnowledgeGraphCorpusFrame_internal.handleKnowledgeGraphNodeClick(ready, e.instanceId, visualNodes.length, e.delta, () => e.stopPropagation(), (instanceId) => {
			const id = visualNodes[instanceId].id;
			onSelect(require_KnowledgeGraphCorpusFrame_internal.toggledKnowledgeGraphSelection(selectedId, id));
		});
	}, [
		graphKey,
		layoutKey,
		reducedMotion,
		visualNodes,
		onSelect,
		selectedId
	]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("group", {
		ref: sceneGroupRef,
		visible: false,
		children: [
			nodes.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("instancedMesh", {
				ref: meshRef,
				args: [
					void 0,
					void 0,
					nodes.length
				],
				frustumCulled: false,
				onPointerMove: handleMove,
				onPointerOut: handleOut,
				onClick: handleClick,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("sphereGeometry", { args: [
					1,
					20,
					20
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("meshBasicMaterial", { toneMapped: false })]
			}, `nodes-${nodes.length}`) : null,
			glyphNodeIndexes.sphere.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("instancedMesh", {
				name: "cortexel-kg-contours",
				ref: sphereGlyphsRef,
				args: [
					void 0,
					void 0,
					glyphNodeIndexes.sphere.length
				],
				frustumCulled: false,
				raycast: disableKnowledgeGraphGlyphRaycast,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("sphereGeometry", { args: [
					require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.sphere_outline,
					32,
					20
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("meshBasicMaterial", {
					color: "#ffffff",
					side: three.BackSide,
					toneMapped: false
				})]
			}) : null,
			glyphNodeIndexes.box.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("instancedMesh", {
				ref: boxGlyphsRef,
				args: [
					void 0,
					void 0,
					glyphNodeIndexes.box.length
				],
				frustumCulled: false,
				raycast: disableKnowledgeGraphGlyphRaycast,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("bufferGeometry", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("bufferAttribute", {
					attach: "attributes-position",
					args: [boxShellVertices, 3]
				}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("meshBasicMaterial", {
					color: "#ffffff",
					side: three.DoubleSide,
					toneMapped: false
				})]
			}) : null,
			glyphNodeIndexes.diamond.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("instancedMesh", {
				ref: diamondGlyphsRef,
				args: [
					void 0,
					void 0,
					glyphNodeIndexes.diamond.length
				],
				frustumCulled: false,
				raycast: disableKnowledgeGraphGlyphRaycast,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("bufferGeometry", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("bufferAttribute", {
					attach: "attributes-position",
					args: [diamondShellVertices, 3]
				}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("meshBasicMaterial", {
					color: "#ffffff",
					side: three.DoubleSide,
					toneMapped: false
				})]
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("mesh", {
				name: "cortexel-kg-strokes",
				ref: linesRef,
				frustumCulled: false,
				raycast: disableKnowledgeGraphGlyphRaycast,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("instancedBufferGeometry", {
					instanceCount: visibleLineSegmentCount,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("bufferAttribute", {
							attach: "attributes-position",
							args: [strokeQuad, 3]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("bufferAttribute", {
							attach: "index",
							args: [strokeIndex, 1]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("interleavedBufferAttribute", {
							attach: "attributes-instanceStart",
							args: [
								linePositionData,
								3,
								0
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("interleavedBufferAttribute", {
							attach: "attributes-instanceEnd",
							args: [
								linePositionData,
								3,
								3
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("interleavedBufferAttribute", {
							attach: "attributes-instanceStrokeColor",
							args: [
								lineColorData,
								3,
								0
							]
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("shaderMaterial", {
					uniforms: strokeUniforms,
					vertexShader: require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_EDGE_STROKE_VERTEX_SHADER,
					fragmentShader: require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_EDGE_STROKE_FRAGMENT_SHADER,
					toneMapped: false,
					depthWrite: false,
					blending: three.NormalBlending,
					side: three.DoubleSide
				})]
			}, `lines-${visibleLineSegmentCount}`),
			directedEdges.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("instancedMesh", {
				ref: arrowsRef,
				args: [
					void 0,
					void 0,
					directedEdges.length
				],
				frustumCulled: false,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("coneGeometry", { args: [
					1,
					1,
					8
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("meshBasicMaterial", { toneMapped: false })]
			}, `arrows-${directedEdges.length}`) : null,
			particleCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("instancedMesh", {
				ref: particlesRef,
				args: [
					void 0,
					void 0,
					particleCount
				],
				frustumCulled: false,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("sphereGeometry", { args: [
					.6,
					6,
					6
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("meshBasicMaterial", {
					color: resolvedParticleColor,
					toneMapped: false,
					transparent: true,
					opacity: .9,
					depthWrite: false,
					blending: themeMode === "light" ? three.NormalBlending : three.AdditiveBlending
				})]
			}, `p-${particleCount}`) : null,
			labelCandidates.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("instancedMesh", {
				name: "cortexel-kg-labels",
				ref: labelsRef,
				args: [
					void 0,
					void 0,
					labelCandidates.length
				],
				frustumCulled: false,
				visible: false,
				renderOrder: 1e3,
				raycast: disableKnowledgeGraphGlyphRaycast,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("planeGeometry", {
					args: [1, 1],
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("instancedBufferAttribute", {
						attach: "attributes-labelUvRect",
						args: [labelResource.uvRects, 4]
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("shaderMaterial", {
					uniforms: labelUniforms,
					vertexShader: KNOWLEDGE_GRAPH_LABEL_VERTEX_SHADER,
					fragmentShader: KNOWLEDGE_GRAPH_LABEL_FRAGMENT_SHADER,
					transparent: true,
					depthTest: false,
					depthWrite: false,
					toneMapped: false
				})]
			}, `labels-${labelCandidates.length}`) : null
		]
	}, `graph-${layoutKey}`) });
}

//#endregion
//#region react/KnowledgeGraphAccessibleFigure.tsx
var KnowledgeGraphVisualBoundary = class extends react.Component {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(_error, _info) {}
	componentDidUpdate(previous) {
		if ((previous.resetToken !== this.props.resetToken || !Object.is(previous.retryToken, this.props.retryToken)) && this.state.failed) this.setState({ failed: false });
	}
	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
};
function KnowledgeGraphVisualMount({ renderVisual, scene, context }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: renderVisual(scene, context) });
}
function KnowledgeGraphInteractiveRegion({ context, renderVisual, visualAvailable, visualRetryKey, controlsRef, autoFrame, flyToSelection, labelColor, particleColor, flowMotion, reducedMotion, query, layoutDimensions }) {
	const { presentation, view, hostPolicy, activeToken, selectedId, onSelect, hoverId, onHover } = context;
	if (onHover === void 0) throw new Error("interactive knowledge-graph hover controller invariant failed");
	const visualUnavailableStatus = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
		role: "status",
		children: [`The host-owned interactive ${layoutDimensions}D view is unavailable.`, " The paginated graph-record browser remains below; its controls expose every accepted record after hydration."]
	});
	const { liveForceAvailability } = hostPolicy;
	const liveForceAvailable = liveForceAvailability.status === "available";
	const liveForceLimitStatus = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
		role: "status",
		children: [
			`The host-owned interactive ${layoutDimensions}D force view was not mounted:`,
			" this active view has",
			" ",
			liveForceAvailability.nodeCount,
			" nodes and ",
			liveForceAvailability.edgeCount,
			" ",
			"relationships; the reviewed main-thread ceiling is",
			" ",
			liveForceAvailability.maxNodes,
			" nodes and ",
			liveForceAvailability.maxEdges,
			" ",
			"relationships. If an available exact kind filter reduces this source below the ceiling, that filtered view can mount the visual; some single-kind sources have no nonempty eligible view. The bound caption, legend, interactive DOM controls, and paginated source-record browser remain below; after hydration the browser controls expose every accepted source record."
		]
	});
	const scene = liveForceAvailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KnowledgeGraphCorpus3DSceneInternal, {
		presentation,
		view,
		selectedId,
		query,
		onSelect,
		hoverId,
		onHover,
		controlsRef,
		autoFrame,
		flyToSelection,
		labelColor,
		particleColor,
		flowMotion,
		themeMode: hostPolicy.themeMode,
		reducedMotion,
		layoutDimensions
	}) : null;
	return visualAvailable && liveForceAvailable && scene !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KnowledgeGraphVisualBoundary, {
		resetToken: activeToken,
		retryToken: visualRetryKey,
		fallback: visualUnavailableStatus,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KnowledgeGraphVisualMount, {
			renderVisual,
			scene,
			context: hostPolicy
		})
	}) : liveForceAvailable ? visualUnavailableStatus : liveForceLimitStatus;
}
/**
* Canonical legacy corpus-graph composition for planar or spatial display. It binds strict validation,
* mapping, caption, legend, interactive DOM controls, and a paginated record
* view to one detached presentation. Unit tests establish those narrow
* composition invariants only—not whole-figure WCAG, browser, WebGL, or
* assistive-technology conformance.
*/
function KnowledgeGraphAccessibleFigure(props) {
	const { renderVisual, selectedId, onSelect, hoverId, onHover, visualAvailable = true, visualRetryKey, viewPolicy, query = "", controlsRef, autoFrame = true, flyToSelection, labelColor, particleColor, flowMotion, reducedMotion, layoutDimensions = 3, nodePageSize, recordNodePageSize, recordEdgePageSize, activePalette, className, label = "Interactive knowledge graph" } = props;
	assertGraphLayoutDimensions(layoutDimensions);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_KnowledgeGraphCorpusFrame_internal.KnowledgeGraphCorpusFrameInternal, {
		sourceInput: props,
		selectionController: {
			value: selectedId,
			onChange: onSelect
		},
		hoverController: {
			value: hoverId,
			onChange: onHover
		},
		viewPolicy,
		query,
		nodePageSize,
		recordNodePageSize,
		recordEdgePageSize,
		activePalette,
		className,
		label,
		renderPrimaryRegion: (context) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KnowledgeGraphInteractiveRegion, {
			context,
			renderVisual,
			visualAvailable,
			visualRetryKey,
			controlsRef,
			autoFrame,
			flyToSelection,
			labelColor,
			particleColor,
			flowMotion,
			reducedMotion,
			layoutDimensions,
			query
		})
	});
}

//#endregion
exports.CORPUS_GRAPH_RADIUS_MEANING = require_knowledgeGraphFigure.CORPUS_GRAPH_RADIUS_MEANING;
exports.DEFAULT_A11Y_NODE_PAGE_SIZE = require_KnowledgeGraphCorpusFrame_internal.DEFAULT_A11Y_NODE_PAGE_SIZE;
exports.DEFAULT_GRAPH_NODE_RADIUS = require_knowledgeGraphFigure.DEFAULT_GRAPH_NODE_RADIUS;
exports.GRAPH_EDGE_CURVE_SEGMENTS = require_knowledgeGraphFigure.GRAPH_EDGE_CURVE_SEGMENTS;
exports.GRAPH_EDGE_LANE_SPACING = require_knowledgeGraphFigure.GRAPH_EDGE_LANE_SPACING;
exports.GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS = require_knowledgeGraphFigure.GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS;
exports.GRAPH_LAYOUT_TICK_SECONDS = require_knowledgeGraphFigure.GRAPH_LAYOUT_TICK_SECONDS;
Object.defineProperty(exports, 'KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1;
  }
});
exports.KnowledgeGraph2DScene = KnowledgeGraph2DScene;
exports.KnowledgeGraph3DScene = KnowledgeGraph3DScene;
exports.KnowledgeGraphA11yList = require_KnowledgeGraphCorpusFrame_internal.KnowledgeGraphA11yList;
exports.KnowledgeGraphAccessibleFigure = KnowledgeGraphAccessibleFigure;
exports.KnowledgeGraphLegend = require_KnowledgeGraphCorpusFrame_internal.KnowledgeGraphLegend;
Object.defineProperty(exports, 'KnowledgeGraphPresentationJsonError', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.KnowledgeGraphPresentationJsonError;
  }
});
exports.KnowledgeGraphStaticRecordView = require_KnowledgeGraphCorpusFrame_internal.KnowledgeGraphStaticRecordView;
exports.MAX_A11Y_NODE_PAGE_SIZE = require_KnowledgeGraphCorpusFrame_internal.MAX_A11Y_NODE_PAGE_SIZE;
exports.MAX_GRAPH_EDGE_LANE_OFFSET = require_knowledgeGraphFigure.MAX_GRAPH_EDGE_LANE_OFFSET;
exports.MAX_GRAPH_LAYOUT_TICKS_PER_FRAME = require_knowledgeGraphFigure.MAX_GRAPH_LAYOUT_TICKS_PER_FRAME;
exports.MAX_GRAPH_NODE_RADIUS = require_knowledgeGraphFigure.MAX_GRAPH_NODE_RADIUS;
exports.MAX_GRAPH_PARALLEL_EDGES = require_knowledgeGraphFigure.MAX_GRAPH_PARALLEL_EDGES;
exports.MAX_GRAPH_QUERY_LENGTH = require_knowledgeGraphFigure.MAX_GRAPH_QUERY_LENGTH;
exports.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES = require_knowledgeGraphFigure.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES;
exports.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES = require_knowledgeGraphFigure.MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES;
exports.MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES = require_knowledgeGraphFigure.MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES;
exports.MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES = require_knowledgeGraphFigure.MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES;
Object.defineProperty(exports, 'PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1;
  }
});
Object.defineProperty(exports, 'PREPARED_KNOWLEDGE_GRAPH_VIEW_V1', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.PREPARED_KNOWLEDGE_GRAPH_VIEW_V1;
  }
});
exports.advanceGraphLayoutClock = require_knowledgeGraphFigure.advanceGraphLayoutClock;
exports.advanceGraphLayoutClockInto = require_knowledgeGraphFigure.advanceGraphLayoutClockInto;
exports.assertKnowledgeGraphIdentity = require_knowledgeGraphFigure.assertKnowledgeGraphIdentity;
exports.assertKnowledgeGraphLiveForceBudget = require_knowledgeGraphFigure.assertKnowledgeGraphLiveForceBudget;
exports.assertKnowledgeGraphPresentationBudget = require_knowledgeGraphFigure.assertKnowledgeGraphPresentationBudget;
Object.defineProperty(exports, 'assertPreparedGenericKnowledgeGraphPresentation', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.assertPreparedGenericKnowledgeGraphPresentation;
  }
});
Object.defineProperty(exports, 'assertPreparedKnowledgeGraphPresentation', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.assertPreparedKnowledgeGraphPresentation;
  }
});
Object.defineProperty(exports, 'assertPreparedKnowledgeGraphView', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.assertPreparedKnowledgeGraphView;
  }
});
exports.assertRenderableGraphEdges = require_knowledgeGraphFigure.assertRenderableGraphEdges;
exports.assertUniqueGraphNodeIds = require_knowledgeGraphFigure.assertUniqueGraphNodeIds;
exports.assignGraphEdgeLanes = require_knowledgeGraphFigure.assignGraphEdgeLanes;
exports.buildAdjacency = require_knowledgeGraphFigure.buildAdjacency;
exports.corpusGraphInstanceIdentity = require_knowledgeGraphFigure.corpusGraphInstanceIdentity;
exports.corpusGraphRadiusMeaning = require_knowledgeGraphFigure.corpusGraphRadiusMeaning;
exports.defaultEdgeStyles = require_knowledgeGraphFigure.defaultEdgeStyles;
exports.defaultNodeColors = require_knowledgeGraphFigure.defaultNodeColors;
exports.filterGraphEdges = require_knowledgeGraphFigure.filterGraphEdges;
exports.flowParticleCount = require_knowledgeGraphFigure.flowParticleCount;
exports.graphCameraTargetDamping = require_knowledgeGraphFigure.graphCameraTargetDamping;
exports.graphEdgeControlPointInto = require_knowledgeGraphFigure.graphEdgeControlPointInto;
exports.graphEdgeCurvePointInto = require_knowledgeGraphFigure.graphEdgeCurvePointInto;
exports.graphEdgeMatchesQuery = require_knowledgeGraphFigure.graphEdgeMatchesQuery;
exports.graphEdgeTargetBoundaryInto = require_knowledgeGraphFigure.graphEdgeTargetBoundaryInto;
exports.graphQueryMatchIds = require_knowledgeGraphFigure.graphQueryMatchIds;
exports.graphSignature = require_knowledgeGraphFigure.graphSignature;
exports.isKnowledgeGraphLiveForceWithinBudget = require_knowledgeGraphFigure.isKnowledgeGraphLiveForceWithinBudget;
Object.defineProperty(exports, 'isPreparedKnowledgeGraphPresentation', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.isPreparedKnowledgeGraphPresentation;
  }
});
Object.defineProperty(exports, 'isPreparedKnowledgeGraphView', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.isPreparedKnowledgeGraphView;
  }
});
exports.knowledgeGraphLiveForceAvailability = require_knowledgeGraphFigure.knowledgeGraphLiveForceAvailability;
Object.defineProperty(exports, 'knowledgeGraphPresentationContainsNode', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.knowledgeGraphPresentationContainsNode;
  }
});
Object.defineProperty(exports, 'knowledgeGraphViewContainsNode', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.knowledgeGraphViewContainsNode;
  }
});
exports.matchesGraphQuery = require_knowledgeGraphFigure.matchesGraphQuery;
exports.normalizeGraphNodeRadius = require_knowledgeGraphFigure.normalizeGraphNodeRadius;
exports.normalizeGraphQuery = require_knowledgeGraphFigure.normalizeGraphQuery;
Object.defineProperty(exports, 'parseKnowledgeGraphPresentationJson', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.parseKnowledgeGraphPresentationJson;
  }
});
exports.prepareCorpusKnowledgeGraphFigure = require_knowledgeGraphFigure.prepareCorpusKnowledgeGraphFigure;
exports.prepareCorpusKnowledgeGraphFigureJson = require_knowledgeGraphFigure.prepareCorpusKnowledgeGraphFigureJson;
Object.defineProperty(exports, 'prepareKnowledgeGraphPresentation', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.prepareKnowledgeGraphPresentation;
  }
});
Object.defineProperty(exports, 'prepareKnowledgeGraphView', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.prepareKnowledgeGraphView;
  }
});
exports.reducedMotionLayoutTickBudget = require_knowledgeGraphFigure.reducedMotionLayoutTickBudget;
Object.defineProperty(exports, 'serializePreparedKnowledgeGraphPresentation', {
  enumerable: true,
  get: function () {
    return _cortexel_knowledge_graph_presentation_capability.serializePreparedKnowledgeGraphPresentation;
  }
});
exports.uniqueGraphTopologyLinks = require_knowledgeGraphFigure.uniqueGraphTopologyLinks;
//# sourceMappingURL=knowledge-graph.cjs.map