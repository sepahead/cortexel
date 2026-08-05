Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
const require_rolldown_runtime = require('../rolldown-runtime-C24Yb2bl.cjs');
const require_knowledgeGraphLimits = require('../knowledgeGraphLimits-BnjbjxkI.cjs');
const require_knowledgeGraphVisualEncoding_internal = require('../knowledgeGraphVisualEncoding.internal-COtu0qU6.cjs');
const require_knowledgeGraphFigure = require('../knowledgeGraphFigure-BsHVmAuv.cjs');
const require_KnowledgeGraphCorpusFrame_internal = require('../KnowledgeGraphCorpusFrame.internal-B_E_kBQQ.cjs');
let _cortexel_knowledge_graph_presentation_capability = require("#cortexel-knowledge-graph-presentation-capability");
let react = require("react");
let _react_three_fiber = require("@react-three/fiber");
let three = require("three");
three = require_rolldown_runtime.__toESM(three, 1);
let react_jsx_runtime = require("react/jsx-runtime");
let d3_force_3d = require("d3-force-3d");

//#region react/knowledgeGraphLayout.internal.ts
/**
* Read every renderer-relevant prop into detached plain records on each React
* render, then key memoized mutable state from those records. Public props are
* readonly, but this runtime snapshot also protects JavaScript callers that
* mutate the same object/array identities between renders.
*/
function snapshotGraphLayoutInputs(nodes, edges) {
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
		graphKey: require_knowledgeGraphFigure.graphSignature(nodeSnapshot, edgeSnapshot),
		layoutKey: require_knowledgeGraphFigure.graphLayoutSignature(nodeSnapshot, edgeSnapshot),
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
function planGraphLayoutCache(nodes, remembered, maxRememberedPositions) {
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
			plannedNodes[index] = {
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
			z: previous[2]
		};
	}
	const makeBuffer = () => {
		const cache = /* @__PURE__ */ new Map();
		for (const [id, previous] of remembered) cache.set(id, [
			previous[0],
			previous[1],
			previous[2]
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
//#region react/focusLabelResource.internal.ts
const FOCUS_LABEL_MAX_WORLD_WIDTH = 160;
const FOCUS_LABEL_WORLD_HEIGHT = 7;
const FOCUS_LABEL_NODE_GAP = 4;
/**
* Anchor the Sprite at the node and apply a camera-facing world-unit offset from
* the focused glyph's conservative radial extent. The algebra is exact in the
* sprite plane (and orthographic projection); perspective silhouette separation
* remains camera-dependent. Placement does not read a stale camera matrix.
*/
function knowledgeGraphFocusLabelSpriteCenterY(nodeRadius, nodeGlyph) {
	return -(require_knowledgeGraphVisualEncoding_internal.knowledgeGraphRenderedNodeRadialExtent(nodeRadius, nodeGlyph, true) + 4) / 7;
}
const FOCUS_LABEL_THEME = Object.freeze({
	dark: Object.freeze({
		background: "#030711",
		text: "#e2e8f0"
	}),
	light: Object.freeze({
		background: "#f8fafc",
		text: "#0f172a"
	})
});
/**
* Install one network-free label texture after React commit.
*
* The caller must invoke this from a layout/effect boundary. The returned
* cleanup is idempotent, disposes exactly the texture created by this setup,
* and cannot clear or hide a newer setup that has replaced its material map.
*/
function installFocusLabelResource({ sprite, material, label, color, themeMode, invalidate, createCanvas = () => typeof document === "undefined" ? null : document.createElement("canvas"), createTexture = (canvas) => new three.CanvasTexture(canvas) }) {
	sprite.visible = false;
	material.map = null;
	material.needsUpdate = true;
	if (!label) {
		invalidate();
		return;
	}
	const canvas = createCanvas();
	const context = canvas?.getContext("2d");
	if (!canvas || !context) {
		invalidate();
		return;
	}
	const fontSize = 42;
	context.font = `600 ${fontSize}px system-ui, sans-serif`;
	const measured = Math.ceil(context.measureText(label).width);
	canvas.width = Math.min(1024, Math.max(96, measured + 48));
	canvas.height = 70;
	context.font = `600 ${fontSize}px system-ui, sans-serif`;
	context.textAlign = "center";
	context.textBaseline = "middle";
	const theme = FOCUS_LABEL_THEME[themeMode];
	context.fillStyle = theme.background;
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = theme.text;
	context.fillStyle = color;
	context.fillText(label, canvas.width / 2, canvas.height / 2, canvas.width - 48);
	const texture = createTexture(canvas);
	try {
		texture.colorSpace = three.SRGBColorSpace;
		texture.minFilter = three.LinearFilter;
		texture.magFilter = three.LinearFilter;
		texture.generateMipmaps = false;
		material.map = texture;
		material.needsUpdate = true;
		sprite.scale.set(Math.min(160, canvas.width / canvas.height * 7), 7, 1);
		sprite.visible = true;
		invalidate();
	} catch (setupError) {
		if (material.map === texture) {
			material.map = null;
			material.needsUpdate = true;
			sprite.visible = false;
		}
		try {
			texture.dispose();
		} catch (disposeError) {
			throw new AggregateError([setupError, disposeError], "focus-label setup and rollback both failed");
		}
		throw setupError;
	}
	let cleaned = false;
	return () => {
		if (cleaned) return;
		cleaned = true;
		let shouldInvalidate = false;
		if (material.map === texture) {
			material.map = null;
			material.needsUpdate = true;
			sprite.visible = false;
			shouldInvalidate = true;
		}
		let disposeFailed = false;
		let disposeError;
		try {
			texture.dispose();
		} catch (error) {
			disposeFailed = true;
			disposeError = error;
		}
		let invalidateFailed = false;
		let invalidateError;
		if (shouldInvalidate) try {
			invalidate();
		} catch (error) {
			invalidateFailed = true;
			invalidateError = error;
		}
		if (disposeFailed && invalidateFailed) throw new AggregateError([disposeError, invalidateError], "focus-label disposal and invalidation both failed");
		if (disposeFailed) throw disposeError;
		if (invalidateFailed) throw invalidateError;
	};
}

//#endregion
//#region react/knowledgeGraphCamera.internal.ts
const KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN = 1.12;
const KNOWLEDGE_GRAPH_CAMERA_MIN_DISTANCE = 120;
const KNOWLEDGE_GRAPH_CAMERA_DEPTH_MARGIN = 1.25;
const KNOWLEDGE_GRAPH_PERSPECTIVE_MIN_NEAR = .001;
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
function planKnowledgeGraphPerspectiveCameraFitInto(contentRadius, currentCameraDistance, verticalFovDegrees, aspectRatio, target) {
	const paddedRadius = positiveFinite(contentRadius, 1) * KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN;
	const verticalFov = positiveFinite(verticalFovDegrees, 50);
	const aspect = positiveFinite(aspectRatio, 1);
	const verticalHalf = Math.min(89.5, Math.max(.5, verticalFov / 2)) * Math.PI / 180;
	const horizontalHalf = Math.atan(Math.tan(verticalHalf) * aspect);
	const fitDistance = paddedRadius / Math.sin(Math.max(1e-6, Math.min(verticalHalf, horizontalHalf)));
	target.distance = Math.max(120, fitDistance);
	target.orthographicZoom = void 0;
	return target;
}
function planKnowledgeGraphOrthographicCameraFitInto(contentRadius, currentCameraDistance, horizontalSpan, verticalSpan, currentCameraZoom, target) {
	const paddedRadius = positiveFinite(contentRadius, 1) * KNOWLEDGE_GRAPH_CAMERA_FIT_MARGIN;
	const horizontalHalf = positiveFinite(horizontalSpan, 2) / 2;
	const verticalHalf = positiveFinite(verticalSpan, 2) / 2;
	const fitZoom = Math.min(horizontalHalf, verticalHalf) / paddedRadius;
	const currentZoom = positiveFinite(currentCameraZoom, 1);
	target.distance = Math.max(120, paddedRadius * 2);
	target.orthographicZoom = positiveFinite(fitZoom, currentZoom);
	return target;
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
const GRAPH_DIRECTION_MARKER_PADDING = 2;
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
const _box = new three.Box3();
const _sphere = new three.Sphere();
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
/** Network-free focus label. Drei/Troika's default Text path fetches fonts and
*  unicode data from public CDNs; a CanvasTexture uses the host's system font
*  and keeps Cortexel's no-implicit-network guarantee intact. GPU resources are
*  created only after commit so an abandoned concurrent render cannot leak a
*  texture whose cleanup effect never existed. */
function FocusLabelSprite({ spriteRef, text, color, themeMode, invalidate }) {
	const label = require_knowledgeGraphLimits.safeDiagnosticText(text, 120);
	const materialRef = (0, react.useRef)(null);
	(0, react.useLayoutEffect)(() => {
		const sprite = spriteRef.current;
		const material = materialRef.current;
		if (!sprite || !material) return void 0;
		return installFocusLabelResource({
			sprite,
			material,
			label,
			color,
			themeMode,
			invalidate
		});
	}, [
		label,
		color,
		themeMode,
		invalidate
	]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("sprite", {
		ref: spriteRef,
		visible: false,
		frustumCulled: false,
		renderOrder: 1e3,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("spriteMaterial", {
			ref: materialRef,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			toneMapped: false
		})
	});
}
function knowledgeGraphNodeUsesFocusScale(nodeId, focus, focusSet) {
	return focus !== null && (nodeId === focus || focusSet?.has(nodeId) === true);
}
/** Populate the one shared quadratic path definition consumed by lines,
* arrowheads, and flow particles. Module-scope vectors avoid direct frame allocations. */
function setEdgeCurve(source, target, lane) {
	_a.set(source.x ?? 0, source.y ?? 0, source.z ?? 0);
	_b.set(target.x ?? 0, target.y ?? 0, target.z ?? 0);
	require_knowledgeGraphFigure.graphEdgeControlPointInto(_a, _b, lane, _curveControl);
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
/** Package-internal corpus renderer used only below the canonical caption. */
function KnowledgeGraphCorpus3DSceneInternal(props) {
	(0, _cortexel_knowledge_graph_presentation_capability.assertPreparedCorpusKnowledgeGraphPresentation)(props.presentation);
	if (props.view !== void 0) (0, _cortexel_knowledge_graph_presentation_capability.assertPreparedKnowledgeGraphView)(props.view, props.presentation);
	const nodes = props.view?.nodes ?? props.presentation.nodes;
	const edges = props.view?.edges ?? props.presentation.edges;
	require_knowledgeGraphFigure.assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
	return renderKnowledgeGraph3DScene(props);
}
function renderKnowledgeGraph3DScene(props) {
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
		nodes,
		edges
	}, graphIdentity);
}
function KnowledgeGraph3DSceneInstance({ graphIdentity, nodes, edges, selectedId, query, onSelect, hoverId, onHover, controlsRef, autoFrame = false, flyToSelection = false, labelColor, particleColor, themeMode = "dark", reducedMotion = false }) {
	const meshRef = (0, react.useRef)(null);
	const linesRef = (0, react.useRef)(null);
	const particlesRef = (0, react.useRef)(null);
	const arrowsRef = (0, react.useRef)(null);
	const sphereGlyphsRef = (0, react.useRef)(null);
	const boxGlyphsRef = (0, react.useRef)(null);
	const diamondGlyphsRef = (0, react.useRef)(null);
	const labelSpriteRef = (0, react.useRef)(null);
	const sceneGroupRef = (0, react.useRef)(null);
	const camera = (0, _react_three_fiber.useThree)(selectCamera);
	const gl = (0, _react_three_fiber.useThree)(selectRenderer);
	const invalidate = (0, _react_three_fiber.useThree)(selectInvalidate);
	const cameraProjectionKind = knowledgeGraphCameraProjectionKind(camera);
	const perspectiveCamera = camera;
	const orthographicCamera = camera;
	const resolvedLabelColor = labelColor ?? (themeMode === "light" ? "#0f172a" : "#e2e8f0");
	const resolvedParticleColor = particleColor ?? (themeMode === "light" ? "#0369a1" : "#8fd3ff");
	const resolvedGlyphColor = themeMode === "light" ? "#0f172a" : "#f8fafc";
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
	const layoutInput = (0, react.useMemo)(() => snapshotGraphLayoutInputs(nodes, edges), [nodes, edges]);
	const graphKey = layoutInput.graphKey;
	const layoutKey = layoutInput.layoutKey;
	const normalizedQuery = (0, react.useMemo)(() => require_knowledgeGraphFigure.normalizeGraphQuery(query), [query]);
	const queryMatchIds = (0, react.useMemo)(() => require_knowledgeGraphFigure.graphQueryMatchIds(nodes, normalizedQuery, edges), [
		nodes,
		normalizedQuery,
		edges
	]);
	const queryActive = normalizedQuery.length > 0;
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
	(0, react.useLayoutEffect)(() => {
		meshRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		sphereGlyphsRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		boxGlyphsRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		diamondGlyphsRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		arrowsRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		particlesRef.current?.instanceMatrix.setUsage(three.DynamicDrawUsage);
		const position = linesRef.current?.geometry.getAttribute("position");
		if (position instanceof three.BufferAttribute) position.setUsage(three.DynamicDrawUsage);
	}, [
		linePos,
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
		const plan = planGraphLayoutCache(layoutNodes, posMap.current, MAX_REMEMBERED_POSITIONS);
		const simNodes = plan.nodes;
		const runtimeLinks = simLinks.map(({ source, target }) => ({
			source,
			target
		}));
		const linkForce = (0, d3_force_3d.forceLink)(runtimeLinks).id((d) => d.id).distance(34).strength(.35);
		const sim = (0, d3_force_3d.forceSimulation)(simNodes, 3).force("charge", (0, d3_force_3d.forceManyBody)().strength(-140).distanceMax(600)).force("link", linkForce).force("center", (0, d3_force_3d.forceCenter)(0, 0, 0).strength(.04)).force("collide", (0, d3_force_3d.forceCollide)((d) => {
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
		const attr = (linesRef.current?.geometry)?.getAttribute("color");
		if (attr) attr.needsUpdate = true;
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
	(0, _react_three_fiber.useFrame)((_, delta) => {
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
				setEdgeCurve(s, t, lane);
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
			const posAttr = linesRef.current?.geometry.getAttribute("position");
			if (posAttr) posAttr.needsUpdate = true;
			const arrows = arrowsRef.current;
			if (arrows) {
				for (let i = 0; i < directedEdges.length; i++) {
					const lane = directedEdges[i];
					const edge = lane.edge;
					const source = simNodes[index.get(edge.source)];
					const targetIndex = index.get(edge.target);
					const target = simNodes[targetIndex];
					setEdgeCurve(source, target, lane);
					const targetExtent = require_knowledgeGraphVisualEncoding_internal.knowledgeGraphRenderedNodeRadialExtent(target.r, visualNodes[targetIndex].nodeGlyph, knowledgeGraphNodeUsesFocusScale(target.id, focus, focusSet));
					if (!require_knowledgeGraphFigure.graphEdgeTargetBoundaryInto(_a, _curveControl, _b, targetExtent, _curveNext, _direction)) {
						_dummy.position.copy(_b);
						_dummy.quaternion.identity();
						_dummy.scale.setScalar(0);
					} else {
						_dummy.position.copy(_curveNext).addScaledVector(_direction, -3 / 2);
						_dummy.quaternion.setFromUnitVectors(_up, _direction);
						_dummy.scale.set(1.25, 3, 1.25);
					}
					_dummy.updateMatrix();
					arrows.setMatrixAt(i, _dummy.matrix);
				}
				arrows.instanceMatrix.needsUpdate = true;
				arrows.boundingSphere = null;
			}
		}
		const pmesh = particlesRef.current;
		if (pmesh && particleCount > 0 && (positionsChanged || !reducedMotion)) {
			_dummy.quaternion.identity();
			if (!reducedMotion) flowPhaseRef.current = advanceKnowledgeGraphFlowPhase(flowPhaseRef.current, delta);
			const base = reducedMotion ? 0 : flowPhaseRef.current;
			let p = 0;
			for (let fe = 0; fe < flowEdges.length && p < particleCount; fe++) {
				const lane = flowEdges[fe];
				const e = lane.edge;
				const s = simNodes[index.get(e.source)];
				const t = simNodes[index.get(e.target)];
				setEdgeCurve(s, t, lane);
				const queryIncident = require_knowledgeGraphFigure.graphEdgeMatchesQuery(e.source, e.target, queryMatchIds, normalizedQuery);
				let size = 1.3;
				if (focus) {
					if (e.source !== focus && e.target !== focus) size = 0;
				} else if (!queryIncident) size = 0;
				const phase = fe * .618034;
				const edgeParticleCount = particleDistribution.basePerEdge + (fe < particleDistribution.extraEdgeCount ? 1 : 0);
				for (let q = 0; q < edgeParticleCount && p < particleCount; q++) {
					const frac = reducedMotion ? reducedMotionFlowParticleFraction(q, edgeParticleCount) : (base + phase + q / edgeParticleCount) % 1;
					require_knowledgeGraphFigure.graphEdgeCurvePointInto(_a, _curveControl, _b, frac, _dummy.position);
					_dummy.scale.setScalar(size);
					_dummy.updateMatrix();
					pmesh.setMatrixAt(p, _dummy.matrix);
					p++;
				}
			}
			pmesh.instanceMatrix.needsUpdate = true;
		}
		const label = labelSpriteRef.current;
		if (label) {
			const fi = focus != null ? index.get(focus) : void 0;
			if (fi != null) {
				const n = simNodes[fi];
				label.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
				label.center.set(.5, knowledgeGraphFocusLabelSpriteCenterY(n.r, visualNodes[fi].nodeGlyph));
				label.visible = true;
			} else label.visible = false;
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
				_box.makeEmpty();
				for (let nodeIndex = 0; nodeIndex < simNodes.length; nodeIndex++) {
					const n = simNodes[nodeIndex];
					const glyph = visualNodes[nodeIndex].nodeGlyph;
					const radius = require_knowledgeGraphVisualEncoding_internal.knowledgeGraphAutoFrameNodeRadialExtent(n.r, glyph, knowledgeGraphNodeUsesFocusScale(visualNodes[nodeIndex].id, focus, focusSet));
					_box.expandByPoint(_a.set((n.x ?? 0) - radius, (n.y ?? 0) - radius, (n.z ?? 0) - radius));
					_box.expandByPoint(_b.set((n.x ?? 0) + radius, (n.y ?? 0) + radius, (n.z ?? 0) + radius));
				}
				if (validEdges.length > 0) _box.expandByScalar(require_knowledgeGraphFigure.MAX_GRAPH_EDGE_LANE_OFFSET + GRAPH_DIRECTION_MARKER_PADDING);
				const sphere = _box.getBoundingSphere(_sphere);
				const currentDistance = controls ? camera.position.distanceTo(controls.target) : camera.position.distanceTo(sphere.center);
				if (controls && camera.position.distanceToSquared(controls.target) > 1e-12) _direction.copy(camera.position).sub(controls.target).normalize();
				else camera.getWorldDirection(_direction).multiplyScalar(-1);
				if (isKnowledgeGraphCameraVectorFinite(_direction.x, _direction.y, _direction.z)) {
					if (_direction.lengthSq() <= 1e-12) _direction.set(0, 0, 1);
					else _direction.normalize();
					const fit = cameraProjectionKind === "orthographic" ? planKnowledgeGraphOrthographicCameraFitInto(sphere.radius, currentDistance, horizontalSpan, verticalSpan, orthographicCamera.zoom, _cameraFitResult) : planKnowledgeGraphPerspectiveCameraFitInto(sphere.radius, currentDistance, perspectiveFov, perspectiveCamera.aspect, _cameraFitResult);
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
		if (sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA || !reducedMotion && particleCount > 0 || flyToIdRef.current !== null) invalidate();
		if (positionsChanged) {
			publishGraphLayoutCache(posMap, runtime, completedCacheBufferIndex);
			geometryDirtyRef.current = false;
			readyGraphKeyRef.current = graphKey;
			const group = sceneGroupRef.current;
			if (group) group.visible = true;
		}
	});
	const focusLabelId = hoverId ?? selectedId;
	const focusLabelIndex = focusLabelId != null && index.has(focusLabelId) ? index.get(focusLabelId) : void 0;
	const focusLabel = focusLabelIndex == null ? "" : visualNodes[focusLabelIndex]?.label ?? "";
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
					12,
					12
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("meshBasicMaterial", {
					color: "#ffffff",
					wireframe: true,
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
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("boxGeometry", { args: [
					require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
					require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
					require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
					1,
					1,
					1
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("meshBasicMaterial", {
					color: "#ffffff",
					wireframe: true,
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
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("octahedronGeometry", { args: [require_knowledgeGraphVisualEncoding_internal.KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.diamond_shell, 0] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("meshBasicMaterial", {
					color: "#ffffff",
					wireframe: true,
					toneMapped: false
				})]
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("lineSegments", {
				ref: linesRef,
				frustumCulled: false,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("bufferGeometry", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("bufferAttribute", {
					attach: "attributes-position",
					args: [linePos, 3]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("bufferAttribute", {
					attach: "attributes-color",
					args: [lineCol, 3]
				})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("lineBasicMaterial", {
					vertexColors: true,
					toneMapped: false,
					depthWrite: false,
					blending: three.NormalBlending
				})]
			}, `lines-${validEdges.length}`),
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
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FocusLabelSprite, {
				spriteRef: labelSpriteRef,
				text: focusLabel,
				color: resolvedLabelColor,
				themeMode,
				invalidate
			})
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
function KnowledgeGraphInteractiveRegion({ context, renderVisual, visualAvailable, visualRetryKey, controlsRef, autoFrame, flyToSelection, labelColor, particleColor, reducedMotion, query }) {
	const { presentation, view, hostPolicy, activeToken, selectedId, onSelect, hoverId, onHover } = context;
	if (onHover === void 0) throw new Error("interactive knowledge-graph hover controller invariant failed");
	const visualUnavailableStatus = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
		role: "status",
		children: "The host-owned interactive 3D view is unavailable. The paginated graph-record browser remains below; its controls expose every accepted record after hydration."
	});
	const { liveForceAvailability } = hostPolicy;
	const liveForceAvailable = liveForceAvailability.status === "available";
	const liveForceLimitStatus = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
		role: "status",
		children: [
			"The host-owned interactive 3D force view was not mounted: this active view has",
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
		themeMode: hostPolicy.themeMode,
		reducedMotion
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
* Canonical legacy 3D corpus-graph composition. It binds strict validation,
* mapping, caption, legend, interactive DOM controls, and a paginated record
* view to one detached presentation. Unit tests establish those narrow
* composition invariants only—not whole-figure WCAG, browser, WebGL, or
* assistive-technology conformance.
*/
function KnowledgeGraphAccessibleFigure(props) {
	const { renderVisual, selectedId, onSelect, hoverId, onHover, visualAvailable = true, visualRetryKey, viewPolicy, query = "", controlsRef, autoFrame = true, flyToSelection, labelColor, particleColor, reducedMotion, nodePageSize, recordNodePageSize, recordEdgePageSize, activePalette, className, label = "Interactive knowledge graph" } = props;
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
			reducedMotion,
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