import { i as SAFE_DISPLAY_STRING_PATTERN, l as safeDiagnosticText, n as KNOWLEDGE_GRAPH_LIMITS, u as safeErrorMessage } from "../knowledgeGraphLimits-ClAubHp3.js";
import { a as KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE, c as knowledgeGraphAutoFrameNodeRadialExtent, d as knowledgeGraphEdgeStrokeSegmentVisible, f as knowledgeGraphNodeEmphasisDimAmount, h as knowledgeGraphRenderedNodeScale, i as KNOWLEDGE_GRAPH_BOX_SHELL_SIDE, l as knowledgeGraphContrastSafeColor, m as knowledgeGraphRenderedNodeRadialExtent, p as knowledgeGraphNodeGlyphDescription, u as knowledgeGraphEdgeStrokeDescription, v as graphEdgeIdentityKey } from "../knowledgeGraphVisualEncoding.internal-Bk0I-Mgt.js";
import { A as defaultNodeColors, B as graphSignature, C as assertRenderableGraphEdges, D as corpusGraphInstanceIdentity, E as buildAdjacency, F as graphEdgeCurvePointInto, G as normalizeGraphQuery, H as knowledgeGraphLiveForceAvailability, I as graphEdgeMatchesQuery, K as reducedMotionLayoutTickBudget, L as graphEdgeTargetBoundaryInto, M as flowParticleCount, N as graphCameraTargetDamping, O as corpusGraphRadiusMeaning, P as graphEdgeControlPointInto, R as graphLayoutSignature, S as assertKnowledgeGraphPresentationBudget, T as assignGraphEdgeLanes, U as matchesGraphQuery, V as isKnowledgeGraphLiveForceWithinBudget, W as normalizeGraphNodeRadius, _ as MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES, a as GRAPH_EDGE_CURVE_SEGMENTS, b as assertKnowledgeGraphIdentity, c as GRAPH_LAYOUT_TICK_SECONDS, d as MAX_GRAPH_NODE_RADIUS, f as MAX_GRAPH_PARALLEL_EDGES, g as MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES, h as MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES, i as DEFAULT_GRAPH_NODE_RADIUS, j as filterGraphEdges, k as defaultEdgeStyles, l as MAX_GRAPH_EDGE_LANE_OFFSET, m as MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES, n as prepareCorpusKnowledgeGraphFigureJson, o as GRAPH_EDGE_LANE_SPACING, p as MAX_GRAPH_QUERY_LENGTH, q as uniqueGraphTopologyLinks, r as CORPUS_GRAPH_RADIUS_MEANING, s as GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS, t as prepareCorpusKnowledgeGraphFigure, u as MAX_GRAPH_LAYOUT_TICKS_PER_FRAME, v as advanceGraphLayoutClock, w as assertUniqueGraphNodeIds, x as assertKnowledgeGraphLiveForceBudget, y as advanceGraphLayoutClockInto, z as graphQueryMatchIds } from "../knowledgeGraphFigure-cIAZkXSH.js";
import { KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1, KnowledgeGraphPresentationJsonError, PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1, PREPARED_KNOWLEDGE_GRAPH_VIEW_V1, assertPreparedCorpusKnowledgeGraphPresentation, assertPreparedGenericKnowledgeGraphPresentation, assertPreparedGenericKnowledgeGraphPresentation as assertPreparedGenericKnowledgeGraphPresentation$1, assertPreparedKnowledgeGraphPresentation, assertPreparedKnowledgeGraphPresentation as assertPreparedKnowledgeGraphPresentation$1, assertPreparedKnowledgeGraphPresentation as assertPreparedKnowledgeGraphPresentation$2, assertPreparedKnowledgeGraphView, assertPreparedKnowledgeGraphView as assertPreparedKnowledgeGraphView$1, assertPreparedKnowledgeGraphView as assertPreparedKnowledgeGraphView$2, isPreparedKnowledgeGraphPresentation, isPreparedKnowledgeGraphView, knowledgeGraphPresentationContainsNode, knowledgeGraphPresentationContainsNode as knowledgeGraphPresentationContainsNode$1, knowledgeGraphViewContainsNode, knowledgeGraphViewContainsNode as knowledgeGraphViewContainsNode$1, knowledgeGraphViewContainsNode as knowledgeGraphViewContainsNode$2, parseKnowledgeGraphPresentationJson, prepareKnowledgeGraphPresentation, prepareKnowledgeGraphView, prepareKnowledgeGraphView as prepareKnowledgeGraphView$1, serializePreparedKnowledgeGraphPresentation } from "#cortexel-knowledge-graph-presentation-capability";
import { Component, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force-3d";

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
		graphKey: graphSignature(nodeSnapshot, edgeSnapshot),
		layoutKey: graphLayoutSignature(nodeSnapshot, edgeSnapshot),
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
		const r = normalizeGraphNodeRadius(input.radius);
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
	return -(knowledgeGraphRenderedNodeRadialExtent(nodeRadius, nodeGlyph, true) + 4) / 7;
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
function installFocusLabelResource({ sprite, material, label, color, themeMode, invalidate, createCanvas = () => typeof document === "undefined" ? null : document.createElement("canvas"), createTexture = (canvas) => new THREE.CanvasTexture(canvas) }) {
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
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
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
//#region react/knowledgeGraphPresentationProps.internal.ts
function hasWellFormedUtf16(value) {
	for (let index = 0; index < value.length; index++) {
		const unit = value.charCodeAt(index);
		if (unit >= 55296 && unit <= 56319) {
			if (index + 1 >= value.length) return false;
			const next = value.charCodeAt(index + 1);
			if (next < 56320 || next > 57343) return false;
			index += 1;
		} else if (unit >= 56320 && unit <= 57343) return false;
	}
	return true;
}
function assertKnowledgeGraphNodeReference(value, label) {
	if (value === null) return;
	if (typeof value !== "string" || value.length < 1 || value.length > KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength || !hasWellFormedUtf16(value) || !SAFE_DISPLAY_STRING_PATTERN.test(value)) throw new TypeError(`${label} must be a non-empty well-formed display-safe string <= ${KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength} characters or null`);
}
function assertKnowledgeGraphColor(value, label) {
	if (value === void 0) return;
	if (typeof value !== "string" || value.length < 1 || value.length > KNOWLEDGE_GRAPH_LIMITS.maxColorLength || !hasWellFormedUtf16(value) || !SAFE_DISPLAY_STRING_PATTERN.test(value)) throw new TypeError(`${label} must be a non-empty well-formed display-safe string <= ${KNOWLEDGE_GRAPH_LIMITS.maxColorLength} characters`);
}

//#endregion
//#region react/knowledgeGraphInteraction.internal.ts
const KNOWLEDGE_GRAPH_CLICK_MAX_DELTA = 2;
function isKnowledgeGraphInstanceId(instanceId, instanceCount) {
	return instanceId !== void 0 && instanceId !== null && Number.isSafeInteger(instanceId) && instanceId >= 0 && Number.isSafeInteger(instanceCount) && instanceCount >= 0 && instanceId < instanceCount;
}
/** R3F click events retain pointer travel; a controls drag is not selection. */
function isIntentionalKnowledgeGraphClick(delta) {
	return Number.isFinite(delta) && delta >= 0 && delta <= 2;
}
/**
* Consume every ready, in-range node hit before interpreting pointer travel.
* A controls drag that ends over a node is not a selection, but it must not
* bubble into a host/background click handler and become a different action.
*/
function handleKnowledgeGraphNodeClick(ready, instanceId, instanceCount, delta, stopPropagation, activate) {
	if (!ready || !isKnowledgeGraphInstanceId(instanceId, instanceCount)) return;
	stopPropagation();
	if (isIntentionalKnowledgeGraphClick(delta)) activate(instanceId);
}
/** One selection rule shared by the mesh and its operable DOM companion. */
function toggledKnowledgeGraphSelection(selectedId, activatedId) {
	return selectedId === activatedId ? null : activatedId;
}
function hasCompleteStartEventSurface(value) {
	return value !== null && typeof value.addEventListener === "function" && typeof value.removeEventListener === "function";
}
/** Attach only to a complete add/remove pair, so every accepted registration has
* an exact swap/unmount cleanup path. The authority records only attached hosts. */
function synchronizeKnowledgeGraphControlsListener(authority, candidate, listener) {
	const previous = authority.current;
	const attachableCandidate = hasCompleteStartEventSurface(candidate) ? candidate : null;
	if (previous === attachableCandidate) return;
	if (hasCompleteStartEventSurface(previous)) previous.removeEventListener("start", listener);
	authority.current = null;
	if (attachableCandidate) {
		try {
			attachableCandidate.addEventListener("start", listener);
		} catch (addError) {
			authority.current = attachableCandidate;
			try {
				attachableCandidate.removeEventListener("start", listener);
			} catch (rollbackError) {
				throw new AggregateError([addError, rollbackError], "controls-listener attachment and rollback both failed");
			}
			authority.current = null;
			throw addError;
		}
		authority.current = attachableCandidate;
	}
}
/**
* Enter a new graph-runtime transaction before invoking any host callback.
* A throwing host hover handler cannot leave prior geometry marked visible or
* interactive under current props.
*/
function beginKnowledgeGraphRuntimeTransition(readyGraphKey, geometryDirty, group, invalidate, clearHover) {
	readyGraphKey.current = null;
	geometryDirty.current = true;
	if (group) group.visible = false;
	let invalidateFailed = false;
	let invalidateError;
	try {
		invalidate();
	} catch (error) {
		invalidateFailed = true;
		invalidateError = error;
	}
	let hoverFailed = false;
	let hoverError;
	try {
		clearHover();
	} catch (error) {
		hoverFailed = true;
		hoverError = error;
	}
	if (invalidateFailed && hoverFailed) throw new AggregateError([invalidateError, hoverError], "graph invalidation and hover cleanup both failed");
	if (invalidateFailed) throw invalidateError;
	if (hoverFailed) throw hoverError;
}
/** Invisible/unready meshes must not swallow another object's event, but a real
* pointer-out must still clear graph-owned hover instead of becoming stuck. */
function handleKnowledgeGraphPointerOut(ready, stopPropagation, clearHover) {
	if (ready) stopPropagation();
	clearHover();
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
	const total = flowParticleCount(edges, requestedPerEdge, maxParticles);
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
//#region react/knowledgeGraphA11yNavigation.internal.ts
/**
* Choose one internally consistent cursor/page pair. Selection may establish
* the initial query target, but explicit next/previous navigation owns later
* transitions until the bound query/data/selection context changes.
*/
function planKnowledgeGraphA11yNavigation(queryActive, queryMatchIndexes, selectedIndex, pageSize, pageCount) {
	const boundedPageCount = Math.max(1, pageCount);
	if (queryActive && queryMatchIndexes.length > 0) {
		const selectedCursor = selectedIndex < 0 ? -1 : queryMatchIndexes.indexOf(selectedIndex);
		const matchCursor = selectedCursor < 0 ? 0 : selectedCursor;
		const rowIndex = queryMatchIndexes[matchCursor] ?? 0;
		return Object.freeze({
			matchCursor,
			nodePage: Math.min(boundedPageCount - 1, Math.max(0, Math.floor(rowIndex / pageSize)))
		});
	}
	return Object.freeze({
		matchCursor: 0,
		nodePage: selectedIndex < 0 ? 0 : Math.min(boundedPageCount - 1, Math.max(0, Math.floor(selectedIndex / pageSize)))
	});
}
/** Bind navigation state to every datum that can change target identity. */
function knowledgeGraphA11yNavigationContextKey(normalizedQuery, pageSize, selectedId, orderedNodeIds, orderedMatchIds) {
	return JSON.stringify([
		normalizedQuery,
		pageSize,
		selectedId,
		orderedNodeIds,
		orderedMatchIds
	]);
}

//#endregion
//#region react/KnowledgeGraphA11yList.tsx
const INLINE_RELATION_LIMIT = 8;
const RELATION_PAGE_SIZE = 8;
const INLINE_ATTRIBUTE_LIMIT = 3;
const INLINE_ATTRIBUTE_ARRAY_LIMIT = 3;
const INLINE_EVIDENCE_LIMIT = 2;
const DEFAULT_A11Y_NODE_PAGE_SIZE = 25;
const MAX_A11Y_NODE_PAGE_SIZE = 100;
const CALLER_DEFINED_RADIUS_MEANING = "visual size has no declared quantitative interpretation";
function radiusMeaningText(value, corpusVisualMapping) {
	const meaning = safeDiagnosticText(value.radiusMeaning ?? CALLER_DEFINED_RADIUS_MEANING, 400);
	return corpusVisualMapping ? meaning : `Caller-declared: ${meaning}`;
}
function attributeValueText(value) {
	if (Array.isArray(value)) {
		const shown = value.slice(0, INLINE_ATTRIBUTE_ARRAY_LIMIT).map((item) => safeDiagnosticText(String(item), 80));
		const omitted = value.length - shown.length;
		return `[${shown.join(", ")}${omitted > 0 ? `, ${omitted} more` : ""}]`;
	}
	return safeDiagnosticText(String(value), 120);
}
function evidenceRefText(item) {
	const prefix = `${safeDiagnosticText(item.kind, 80)} ` + safeDiagnosticText(item.evidence_id, 384);
	switch (item.kind) {
		case "graph_snapshot_record": return `${prefix}; record ${safeDiagnosticText(item.record_id, 320)}` + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
		case "graph_node": return `${prefix}; node ${safeDiagnosticText(item.node_id, 120)}` + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
		case "citation": return `${prefix}; paper ${safeDiagnosticText(item.paper_id, 160)}; citation ${safeDiagnosticText(item.citation_id, 160)}` + (item.page === void 0 ? "" : `; page ${item.page}`) + (item.doi ? `; DOI ${safeDiagnosticText(item.doi, 240)}` : "") + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
		case "external_source": return `${prefix}; source ${safeDiagnosticText(item.source_id, 240)}` + (item.locator ? `; ${safeDiagnosticText(item.locator, 240)}` : "");
	}
}
function fullEvidenceRefText(item) {
	const summary = evidenceRefText(item);
	return "excerpt" in item && item.excerpt ? `${summary}; excerpt ${safeDiagnosticText(item.excerpt, 1e3)}` : summary;
}
function fullAttributeValueText(value) {
	return Array.isArray(value) ? value.map((item) => safeDiagnosticText(String(item), 500)).join(", ") : safeDiagnosticText(String(value), 500);
}
function hasMetadata(value) {
	return value.radius !== void 0 || value.detail !== void 0 || value.attributes !== void 0 && Object.keys(value.attributes).length > 0 || value.epistemic !== void 0 || value.evidence !== void 0 && value.evidence.length > 0 || value.uncalibrated_score !== void 0;
}
function FullMetadata({ value, label, corpusVisualMapping }) {
	return /* @__PURE__ */ jsxs("div", {
		"aria-label": safeDiagnosticText(label, 400),
		children: [
			value.radius !== void 0 && /* @__PURE__ */ jsxs("p", { children: [
				"Visual radius: ",
				normalizeGraphNodeRadius(value.radius),
				". Radius meaning:",
				" ",
				radiusMeaningText(value, corpusVisualMapping)
			] }),
			value.detail && /* @__PURE__ */ jsxs("p", { children: ["Detail: ", safeDiagnosticText(value.detail, 1e3)] }),
			value.attributes && Object.keys(value.attributes).length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", { children: "All attributes" }), /* @__PURE__ */ jsx("dl", { children: Object.entries(value.attributes).map(([key, item]) => /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: safeDiagnosticText(key, 80) }), /* @__PURE__ */ jsx("dd", { children: fullAttributeValueText(item) })] }, key)) })] }),
			value.epistemic && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", { children: "Full epistemic status" }), /* @__PURE__ */ jsxs("dl", { children: [
				/* @__PURE__ */ jsx("dt", { children: "Status" }),
				/* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(value.epistemic.status, 80) }),
				/* @__PURE__ */ jsx("dt", { children: "Advisory only" }),
				/* @__PURE__ */ jsx("dd", { children: String(value.epistemic.advisory_only) }),
				/* @__PURE__ */ jsx("dt", { children: "Paper-local evidence" }),
				/* @__PURE__ */ jsx("dd", { children: String(value.epistemic.is_paper_local_evidence) }),
				/* @__PURE__ */ jsx("dt", { children: "Calibrated posterior" }),
				/* @__PURE__ */ jsx("dd", { children: String(value.epistemic.calibrated_posterior) })
			] })] }),
			value.evidence && value.evidence.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("p", { children: [
				"All evidence references (",
				value.evidence.length,
				")"
			] }), /* @__PURE__ */ jsx("ol", { children: value.evidence.map((item) => /* @__PURE__ */ jsx("li", { children: fullEvidenceRefText(item) }, item.evidence_id)) })] }),
			value.uncalibrated_score && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", { children: "Full uncalibrated score" }), /* @__PURE__ */ jsxs("dl", { children: [
				/* @__PURE__ */ jsx("dt", { children: "Kind" }),
				/* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(value.uncalibrated_score.kind, 80) }),
				/* @__PURE__ */ jsx("dt", { children: "Value" }),
				/* @__PURE__ */ jsx("dd", { children: value.uncalibrated_score.value }),
				/* @__PURE__ */ jsx("dt", { children: "Calibrated posterior" }),
				/* @__PURE__ */ jsx("dd", { children: String(value.uncalibrated_score.calibrated_posterior) })
			] })] })
		]
	});
}
function MetadataDisclosure({ value, label, corpusVisualMapping = false }) {
	const [expanded, setExpanded] = useState(false);
	if (!hasMetadata(value)) return null;
	return /* @__PURE__ */ jsxs("details", {
		onToggle: (event) => setExpanded(event.currentTarget.open),
		children: [/* @__PURE__ */ jsxs("summary", {
			style: { minHeight: 44 },
			children: ["Browse full metadata for ", safeDiagnosticText(label, 400)]
		}), expanded && /* @__PURE__ */ jsx(FullMetadata, {
			value,
			label: `Full metadata for ${label}`,
			corpusVisualMapping
		})]
	});
}
function metadataSummary(value, corpusVisualMapping = false) {
	const parts = [];
	if (value.radius !== void 0) parts.push(`Visual radius: ${normalizeGraphNodeRadius(value.radius)}; radius meaning: ${radiusMeaningText(value, corpusVisualMapping)}`);
	if (value.detail) parts.push(`Detail: ${safeDiagnosticText(value.detail, 300)}`);
	if (value.attributes) {
		const entries = Object.entries(value.attributes);
		const shown = entries.slice(0, INLINE_ATTRIBUTE_LIMIT).map(([key, item]) => `${safeDiagnosticText(key, 80)}=${attributeValueText(item)}`);
		if (shown.length > 0) {
			const omitted = entries.length - shown.length;
			parts.push(`Attributes: ${shown.join(", ")}${omitted > 0 ? `; ${omitted} more` : ""}`);
		}
	}
	if (value.epistemic) parts.push(`Epistemic: ${safeDiagnosticText(value.epistemic.status, 80)}; advisory only; not paper-local evidence; uncalibrated`);
	if (value.evidence) {
		const shown = value.evidence.slice(0, INLINE_EVIDENCE_LIMIT).map(evidenceRefText);
		const omitted = value.evidence.length - shown.length;
		parts.push(`Evidence (${value.evidence.length}): ${shown.join(", ")}` + (omitted > 0 ? `; ${omitted} more` : ""));
	}
	if (value.uncalibrated_score) parts.push(`Uncalibrated score: ${safeDiagnosticText(value.uncalibrated_score.kind, 80)} ${value.uncalibrated_score.value}`);
	return parts.join(". ");
}
function relationshipText(nodeId, edge, byId) {
	const source = byId.get(edge.source);
	const target = byId.get(edge.target);
	const other = source.id === nodeId ? target : source;
	const direction = edge.directed === false ? "connected to" : source.id === nodeId ? "points to" : "from";
	const assertion = edge.id === void 0 ? "" : ` [${safeDiagnosticText(edge.id, 320)}]`;
	const kind = safeDiagnosticText(edge.kind, 80);
	const label = edge.label && edge.label !== edge.kind ? `${safeDiagnosticText(edge.label, 160)} (${kind})` : kind;
	const metadata = metadataSummary(edge);
	return `${label}${assertion}: ${direction} ${safeDiagnosticText(other.label, 240)} (node id ${safeDiagnosticText(other.id, 120)})` + (metadata ? `. ${metadata}` : "");
}
function KnowledgeGraphA11yList(props) {
	assertPreparedGenericKnowledgeGraphPresentation$1(props.presentation);
	return renderKnowledgeGraphA11yList(props);
}
/** Package-internal corpus companion used only in the caption-bound composition. */
function KnowledgeGraphCorpusA11yListInternal(props) {
	assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
	return renderKnowledgeGraphA11yList(props);
}
function renderKnowledgeGraphA11yList(props) {
	const { presentation, view, ...interactionProps } = props;
	assertPreparedKnowledgeGraphPresentation$1(presentation);
	if (view !== void 0) assertPreparedKnowledgeGraphView$1(view, presentation);
	assertKnowledgeGraphNodeReference(props.selectedId, "knowledge-graph selected id");
	const selectedId = view !== void 0 && props.selectedId !== null && !knowledgeGraphViewContainsNode$1(view, presentation, props.selectedId) ? null : props.selectedId;
	return /* @__PURE__ */ jsx(KnowledgeGraphA11yListInstance, {
		...interactionProps,
		selectedId,
		nodes: view?.nodes ?? presentation.nodes,
		edges: view?.edges ?? presentation.edges,
		corpusVisualMapping: presentation.profile === "corpus_entity",
		view
	}, presentation.graphIdentity);
}
function KnowledgeGraphA11yListInstance({ nodes, edges, corpusVisualMapping, selectedId, onSelect, query = "", className, label = "Knowledge graph nodes", nodePageSize = 25, view }) {
	const instanceId = useId().replace(/:/g, "");
	const safePageSize = Number.isSafeInteger(nodePageSize) ? Math.min(100, Math.max(1, nodePageSize)) : 25;
	const { byId, validEdges, relations } = useMemo(() => {
		const byId = new Map(nodes.map((node) => [node.id, node]));
		const validEdges = filterGraphEdges(new Set(byId.keys()), edges);
		const relations = /* @__PURE__ */ new Map();
		for (const node of nodes) relations.set(node.id, []);
		for (let index = 0; index < validEdges.length; index++) {
			const edge = validEdges[index];
			const source = byId.get(edge.source);
			const target = byId.get(edge.target);
			if (!source || !target || source.id === target.id) continue;
			relations.get(source.id)?.push(index);
			relations.get(target.id)?.push(index);
		}
		return {
			byId,
			validEdges,
			relations
		};
	}, [nodes, edges]);
	const normalizedQuery = useMemo(() => normalizeGraphQuery(query), [query]);
	const matchingNodeIds = useMemo(() => graphQueryMatchIds(nodes, normalizedQuery, validEdges), [
		nodes,
		normalizedQuery,
		validEdges
	]);
	const rows = useMemo(() => nodes.map((node) => ({
		node,
		relationIndexes: relations.get(node.id) ?? [],
		queryMatch: normalizedQuery.length === 0 || matchingNodeIds.has(node.id)
	})), [
		nodes,
		relations,
		normalizedQuery,
		matchingNodeIds
	]);
	const queryMatchIndexes = useMemo(() => rows.flatMap(({ queryMatch }, index) => queryMatch ? [index] : []), [rows]);
	const queryMatchCount = queryMatchIndexes.length;
	const nodePageCount = Math.max(1, Math.ceil(rows.length / safePageSize));
	const selectedIndex = rows.findIndex(({ node }) => node.id === selectedId);
	const queryNavigationKey = useMemo(() => knowledgeGraphA11yNavigationContextKey(normalizedQuery, safePageSize, selectedId, rows.map(({ node }) => node.id), queryMatchIndexes.map((index) => rows[index]?.node.id ?? "")), [
		normalizedQuery,
		safePageSize,
		selectedId,
		rows,
		queryMatchIndexes
	]);
	const plannedNavigation = useMemo(() => ({
		contextKey: queryNavigationKey,
		...planKnowledgeGraphA11yNavigation(normalizedQuery.length > 0, queryMatchIndexes, selectedIndex, safePageSize, nodePageCount)
	}), [
		queryNavigationKey,
		normalizedQuery,
		queryMatchIndexes,
		selectedIndex,
		safePageSize,
		nodePageCount
	]);
	const [navigation, setNavigation] = useState(plannedNavigation);
	const activeNavigation = navigation.contextKey === queryNavigationKey ? navigation : plannedNavigation;
	const [queryFocusRequestId, setQueryFocusRequestId] = useState(null);
	const queryMatchTargetRef = useRef(null);
	useEffect(() => {
		setNavigation((current) => current.contextKey === queryNavigationKey ? current : plannedNavigation);
		setQueryFocusRequestId(null);
	}, [queryNavigationKey, plannedNavigation]);
	const currentNodePage = Math.min(activeNavigation.nodePage, nodePageCount - 1);
	const visibleRows = rows.slice(currentNodePage * safePageSize, (currentNodePage + 1) * safePageSize);
	const currentQueryMatchCursor = Math.min(activeNavigation.matchCursor, Math.max(0, queryMatchCount - 1));
	const currentQueryMatchRowIndex = queryMatchIndexes[currentQueryMatchCursor];
	const navigatedQueryMatchNode = currentQueryMatchRowIndex === void 0 ? void 0 : rows[currentQueryMatchRowIndex]?.node;
	const currentPageStart = currentNodePage * safePageSize;
	const currentPageStop = currentPageStart + safePageSize;
	const currentQueryMatchNode = currentQueryMatchRowIndex !== void 0 && currentQueryMatchRowIndex >= currentPageStart && currentQueryMatchRowIndex < currentPageStop ? navigatedQueryMatchNode : void 0;
	useEffect(() => {
		if (queryFocusRequestId === null || currentQueryMatchNode?.id !== queryFocusRequestId || queryMatchTargetRef.current === null) return;
		queryMatchTargetRef.current.focus();
		setQueryFocusRequestId(null);
	}, [
		queryFocusRequestId,
		currentQueryMatchNode,
		currentNodePage
	]);
	const showQueryMatch = (cursor) => {
		const bounded = Math.max(0, Math.min(queryMatchCount - 1, cursor));
		const rowIndex = queryMatchIndexes[bounded];
		if (rowIndex === void 0) return;
		const targetId = rows[rowIndex]?.node.id;
		if (targetId === void 0) return;
		setNavigation({
			contextKey: queryNavigationKey,
			matchCursor: bounded,
			nodePage: Math.floor(rowIndex / safePageSize)
		});
		setQueryFocusRequestId(targetId);
	};
	const showNodePage = (page) => {
		const nodePage = Math.max(0, Math.min(nodePageCount - 1, page));
		const pageStart = nodePage * safePageSize;
		const pageStop = pageStart + safePageSize;
		const firstMatchOnPage = queryMatchIndexes.findIndex((rowIndex) => rowIndex >= pageStart && rowIndex < pageStop);
		setNavigation({
			...activeNavigation,
			contextKey: queryNavigationKey,
			matchCursor: firstMatchOnPage < 0 ? activeNavigation.matchCursor : firstMatchOnPage,
			nodePage
		});
	};
	return /* @__PURE__ */ jsxs("section", {
		className,
		"aria-label": safeDiagnosticText(label, 240),
		children: [
			view !== void 0 && /* @__PURE__ */ jsxs("p", {
				role: "note",
				children: [
					"Filtered view: showing ",
					view.counts.visibleNodes,
					" of ",
					view.counts.sourceNodes,
					" ",
					"nodes and ",
					view.counts.visibleEdges,
					" of ",
					view.counts.sourceEdges,
					" ",
					"relationships. Relationships excluded by kind: ",
					" ",
					view.counts.edgeKindFilteredEdges,
					". Relationships excluded because a filtered endpoint is absent:",
					" ",
					view.counts.endpointPrunedEdges,
					"."
				]
			}),
			normalizedQuery.length > 0 && /* @__PURE__ */ jsxs("p", {
				role: "status",
				children: [
					"Query emphasizes ",
					queryMatchCount,
					" of ",
					rows.length,
					" nodes; all nodes remain available below."
				]
			}),
			normalizedQuery.length > 0 && queryMatchCount > 0 && /* @__PURE__ */ jsxs("nav", {
				"aria-label": "Knowledge graph query matches",
				children: [
					/* @__PURE__ */ jsx("p", {
						"aria-live": "polite",
						children: currentQueryMatchNode === void 0 ? `Node page ${currentNodePage + 1} has no current query match; use the query-match controls to navigate to one.` : `Query match ${currentQueryMatchCursor + 1} of ${queryMatchCount}: ${safeDiagnosticText(currentQueryMatchNode.label, 120)}. Node id ${safeDiagnosticText(currentQueryMatchNode.id, 120)}.`
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						disabled: currentQueryMatchCursor === 0,
						onClick: () => showQueryMatch(currentQueryMatchCursor - 1),
						style: {
							minWidth: 44,
							minHeight: 44
						},
						children: "Previous query match"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						disabled: currentQueryMatchCursor + 1 >= queryMatchCount,
						onClick: () => showQueryMatch(currentQueryMatchCursor + 1),
						style: {
							minWidth: 44,
							minHeight: 44
						},
						children: "Next query match"
					}),
					currentQueryMatchNode === void 0 && /* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => showQueryMatch(currentQueryMatchCursor),
						style: {
							minWidth: 44,
							minHeight: 44
						},
						children: "Go to current query match"
					})
				]
			}),
			rows.length === 0 ? /* @__PURE__ */ jsx("p", {
				role: "status",
				children: view === void 0 ? "This graph contains no nodes." : `This filtered view contains no nodes; the full source contains ${view.counts.sourceNodes}.`
			}) : /* @__PURE__ */ jsx("ul", { children: visibleRows.map(({ node, relationIndexes, queryMatch }, rowOffset) => {
				const rowIndex = currentNodePage * safePageSize + rowOffset;
				const detailsId = `cortexel-kg-${instanceId}-${rowIndex}-details`;
				const preview = relationIndexes.slice(0, INLINE_RELATION_LIMIT).map((index) => relationshipText(node.id, validEdges[index], byId));
				const omitted = relationIndexes.length - preview.length;
				const nodeMetadata = metadataSummary(node, corpusVisualMapping);
				return /* @__PURE__ */ jsxs("li", { children: [
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "cortexel-knowledge-graph-node",
						"aria-pressed": selectedId === node.id,
						"aria-current": currentQueryMatchNode?.id === node.id ? "true" : void 0,
						"aria-describedby": detailsId,
						ref: currentQueryMatchNode?.id === node.id ? queryMatchTargetRef : void 0,
						onClick: () => onSelect(toggledKnowledgeGraphSelection(selectedId, node.id)),
						style: {
							minWidth: 44,
							minHeight: 44
						},
						children: safeDiagnosticText(node.label, 240)
					}),
					/* @__PURE__ */ jsxs("span", {
						id: detailsId,
						children: [
							safeDiagnosticText(node.kind, 80),
							". Node id",
							" ",
							safeDiagnosticText(node.id, 120),
							".",
							" ",
							normalizedQuery.length > 0 ? queryMatch ? currentQueryMatchNode?.id === node.id ? "Current navigated query match; visually emphasized. " : "Query match; visually emphasized. " : "Not a query match; visually de-emphasized but still present. " : "",
							nodeMetadata ? `${nodeMetadata}. ` : "",
							preview.length > 0 ? `${preview.join("; ")}${omitted > 0 ? `; ${omitted} more relationships` : ""}` : "No relationships in this active view."
						]
					}),
					selectedId === node.id && /* @__PURE__ */ jsx(MetadataDisclosure, {
						value: node,
						label: `node ${node.label}`,
						corpusVisualMapping
					}),
					selectedId === node.id && relationIndexes.length > 0 && /* @__PURE__ */ jsx(RelationshipPager, {
						nodeId: node.id,
						relationIndexes,
						edges: validEdges,
						byId
					})
				] }, node.id);
			}) }),
			rows.length > safePageSize && /* @__PURE__ */ jsxs("nav", {
				"aria-label": "Knowledge graph node pages",
				children: [
					/* @__PURE__ */ jsxs("p", {
						"aria-live": "polite",
						children: [
							"Node page ",
							currentNodePage + 1,
							" of ",
							nodePageCount,
							"; ",
							rows.length,
							" nodes"
						]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						disabled: currentNodePage === 0,
						onClick: () => showNodePage(currentNodePage - 1),
						style: {
							minWidth: 44,
							minHeight: 44
						},
						children: "Previous nodes"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						disabled: currentNodePage + 1 >= nodePageCount,
						onClick: () => showNodePage(currentNodePage + 1),
						style: {
							minWidth: 44,
							minHeight: 44
						},
						children: "Next nodes"
					})
				]
			})
		]
	});
}
function compareLegendEntries(a, b) {
	if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
	return a.color === b.color ? 0 : a.color < b.color ? -1 : 1;
}
/** Canvas-external decoding companion for interactive views and DOM-inclusive
* still captures. Text redundantly carries kind, color, direction, and count. */
function KnowledgeGraphLegend(props) {
	assertPreparedGenericKnowledgeGraphPresentation$1(props.presentation);
	return renderKnowledgeGraphLegend(props);
}
/** Package-internal corpus legend used only in the caption-bound composition. */
function KnowledgeGraphCorpusLegendInternal(props) {
	assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
	return renderKnowledgeGraphLegend(props);
}
function renderKnowledgeGraphLegend({ presentation, view, className, label = "Knowledge graph legend", themeMode = "dark" }) {
	assertPreparedKnowledgeGraphPresentation$1(presentation);
	if (view !== void 0) assertPreparedKnowledgeGraphView$1(view, presentation);
	const nodes = view?.nodes ?? presentation.nodes;
	const edges = view?.edges ?? presentation.edges;
	const { context } = presentation;
	const { nodeEntries, edgeEntries } = useMemo(() => {
		const nodeEntries = [];
		const edgeEntries = [];
		const nodeGroups = /* @__PURE__ */ new Map();
		for (let index = 0; index < nodes.length; index++) {
			const node = nodes[index];
			const radius = normalizeGraphNodeRadius(node.radius);
			const radiusMeaning = radiusMeaningText(node, presentation.profile === "corpus_entity");
			const nodeGlyph = node.nodeGlyph ?? "sphere_outline";
			const key = JSON.stringify([
				node.kind,
				node.color,
				radiusMeaning,
				nodeGlyph
			]);
			const entry = nodeGroups.get(key);
			if (entry) {
				entry.count += 1;
				entry.minRadius = Math.min(entry.minRadius, radius);
				entry.maxRadius = Math.max(entry.maxRadius, radius);
			} else nodeGroups.set(key, {
				kind: node.kind,
				color: node.color,
				count: 1,
				minRadius: radius,
				maxRadius: radius,
				radiusMeaning,
				nodeGlyph
			});
		}
		const edgeGroups = /* @__PURE__ */ new Map();
		const validEdges = filterGraphEdges(new Set(nodes.map(({ id }) => id)), edges);
		for (let index = 0; index < validEdges.length; index++) {
			const edge = validEdges[index];
			const directed = edge.directed !== false;
			const particles = edge.particles === true;
			const edgeStrokePattern = edge.edgeStrokePattern ?? "solid";
			const key = JSON.stringify([
				edge.kind,
				edge.color,
				directed,
				particles,
				edgeStrokePattern
			]);
			const entry = edgeGroups.get(key);
			if (entry) entry.count += 1;
			else edgeGroups.set(key, {
				kind: edge.kind,
				color: edge.color,
				directed,
				particles,
				edgeStrokePattern,
				count: 1
			});
		}
		nodeEntries.push(...[...nodeGroups.values()].sort((a, b) => compareLegendEntries(a, b) || (a.radiusMeaning === b.radiusMeaning ? 0 : a.radiusMeaning < b.radiusMeaning ? -1 : 1)));
		edgeEntries.push(...[...edgeGroups.values()].sort((a, b) => compareLegendEntries(a, b) || Number(a.directed) - Number(b.directed) || Number(a.particles) - Number(b.particles)));
		return {
			nodeEntries,
			edgeEntries
		};
	}, [
		nodes,
		edges,
		presentation.profile
	]);
	const swatchStyle = (color) => ({
		display: "inline-block",
		width: 16,
		height: 16,
		marginRight: 8,
		border: "1px solid currentColor",
		backgroundColor: color
	});
	return /* @__PURE__ */ jsxs("aside", {
		className,
		"aria-label": safeDiagnosticText(label, 240),
		children: [
			view !== void 0 && /* @__PURE__ */ jsxs("p", {
				role: "note",
				children: [
					"Filtered view: showing ",
					view.counts.visibleNodes,
					" of ",
					view.counts.sourceNodes,
					" ",
					"nodes and ",
					view.counts.visibleEdges,
					" of ",
					view.counts.sourceEdges,
					" ",
					"relationships."
				]
			}),
			context && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", { children: "Graph context" }), /* @__PURE__ */ jsxs("dl", { children: [
				/* @__PURE__ */ jsx("dt", { children: "Graph id" }),
				/* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_id, 160) }),
				/* @__PURE__ */ jsx("dt", { children: "Graph source" }),
				/* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_source, 200) }),
				/* @__PURE__ */ jsx("dt", { children: "Caller-declared snapshot namespace" }),
				/* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_snapshot_id, 200) }),
				/* @__PURE__ */ jsx("dt", { children: "Graph scope" }),
				/* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.graph_scope, 80) }),
				/* @__PURE__ */ jsx("dt", { children: "Generated at" }),
				/* @__PURE__ */ jsx("dd", { children: safeDiagnosticText(context.generated_at, 80) })
			] })] }),
			/* @__PURE__ */ jsx("p", { children: "Node kinds" }),
			nodeEntries.length === 0 ? /* @__PURE__ */ jsx("p", { children: "No nodes in this active view." }) : /* @__PURE__ */ jsx("ul", { children: nodeEntries.map((entry) => {
				const renderedColor = knowledgeGraphContrastSafeColor(entry.color, themeMode);
				return /* @__PURE__ */ jsxs("li", { children: [
					/* @__PURE__ */ jsx("span", {
						"aria-hidden": "true",
						style: swatchStyle(renderedColor)
					}),
					safeDiagnosticText(entry.kind, 80),
					": ",
					entry.count,
					" ",
					entry.count === 1 ? "node" : "nodes",
					"; source color",
					" ",
					safeDiagnosticText(entry.color, 80),
					"; intended undimmed scene color",
					" ",
					safeDiagnosticText(renderedColor, 80),
					"; glyph",
					" ",
					knowledgeGraphNodeGlyphDescription(entry.nodeGlyph),
					"; visual radius",
					" ",
					entry.minRadius === entry.maxRadius ? entry.minRadius : `${entry.minRadius}–${entry.maxRadius}`,
					";",
					" ",
					entry.radiusMeaning
				] }, JSON.stringify([
					entry.kind,
					entry.color,
					entry.radiusMeaning,
					entry.nodeGlyph
				]));
			}) }),
			/* @__PURE__ */ jsx("p", { children: "Relationship kinds" }),
			edgeEntries.length === 0 ? /* @__PURE__ */ jsx("p", { children: "No relationships in this active view." }) : /* @__PURE__ */ jsx("ul", { children: edgeEntries.map((entry) => /* @__PURE__ */ jsxs("li", { children: [
				/* @__PURE__ */ jsx("span", {
					"aria-hidden": "true",
					style: swatchStyle(knowledgeGraphContrastSafeColor(entry.color, themeMode))
				}),
				safeDiagnosticText(entry.kind, 80),
				": ",
				entry.count,
				" ",
				entry.count === 1 ? "relationship" : "relationships",
				";",
				" ",
				entry.directed ? "directed" : "undirected",
				"; source color",
				" ",
				safeDiagnosticText(entry.color, 80),
				"; intended undimmed scene color",
				" ",
				safeDiagnosticText(knowledgeGraphContrastSafeColor(entry.color, themeMode), 80),
				"; ",
				knowledgeGraphEdgeStrokeDescription(entry.edgeStrokePattern),
				entry.particles ? "; flow markers" : ""
			] }, JSON.stringify([
				entry.kind,
				entry.color,
				entry.directed,
				entry.particles,
				entry.edgeStrokePattern
			]))) }),
			/* @__PURE__ */ jsxs("p", {
				role: "note",
				children: [
					"The listed scene colors are the intended undimmed baseline. Glyph shells use",
					" ",
					themeMode === "light" ? "#0f172a" : "#f8fafc",
					" before dimming. Focus and query interactions dim peripheral node fills, glyph shells, relationships, arrows, and flow markers without changing their kind glyph, stroke pattern, direction, or DOM record. Layout positions and distances are schematic, not quantitative evidence."
				]
			})
		]
	});
}
function RelationshipPager({ nodeId, relationIndexes, edges, byId }) {
	const [page, setPage] = useState(0);
	const pageCount = Math.max(1, Math.ceil(relationIndexes.length / RELATION_PAGE_SIZE));
	const currentPage = Math.min(page, pageCount - 1);
	useEffect(() => setPage(0), [nodeId]);
	useEffect(() => setPage((current) => Math.min(current, pageCount - 1)), [pageCount]);
	const start = currentPage * RELATION_PAGE_SIZE;
	return /* @__PURE__ */ jsxs("details", { children: [
		/* @__PURE__ */ jsxs("summary", {
			style: { minHeight: 44 },
			children: [
				"Browse all ",
				relationIndexes.length,
				" relationships"
			]
		}),
		/* @__PURE__ */ jsx("ul", { children: relationIndexes.slice(start, start + RELATION_PAGE_SIZE).map((edgeIndex) => {
			const edge = edges[edgeIndex];
			const humanLabel = edge.label ?? edge.kind;
			const edgeLabel = edge.id === void 0 ? `${humanLabel} relationship` : `${humanLabel} [${edge.id}]`;
			const relationshipKey = graphEdgeIdentityKey(edge);
			return /* @__PURE__ */ jsxs("li", { children: [relationshipText(nodeId, edge, byId), /* @__PURE__ */ jsx(MetadataDisclosure, {
				value: edge,
				label: `relationship ${edgeLabel}`
			})] }, JSON.stringify([nodeId, relationshipKey]));
		}) }),
		/* @__PURE__ */ jsxs("p", {
			"aria-live": "polite",
			children: [
				"Page ",
				currentPage + 1,
				" of ",
				pageCount
			]
		}),
		/* @__PURE__ */ jsx("button", {
			type: "button",
			disabled: currentPage === 0,
			onClick: () => setPage((current) => Math.max(0, current - 1)),
			style: {
				minWidth: 44,
				minHeight: 44
			},
			children: "Previous relationships"
		}),
		/* @__PURE__ */ jsx("button", {
			type: "button",
			disabled: currentPage + 1 >= pageCount,
			onClick: () => setPage((current) => Math.min(pageCount - 1, current + 1)),
			style: {
				minWidth: 44,
				minHeight: 44
			},
			children: "Next relationships"
		})
	] });
}

//#endregion
//#region react/KnowledgeGraphStaticRecordView.tsx
const DEFAULT_STATIC_PAGE_SIZE = 10;
const MAX_STATIC_PAGE_SIZE = 25;
const STATIC_RECORD_INSTANCE_KEYS = /* @__PURE__ */ new WeakMap();
let nextStaticRecordInstanceKey = 0n;
function staticRecordInstanceKey(presentation) {
	const existing = STATIC_RECORD_INSTANCE_KEYS.get(presentation);
	if (existing !== void 0) return existing;
	const created = `cortexel-kg-record-${nextStaticRecordInstanceKey}`;
	nextStaticRecordInstanceKey += 1n;
	STATIC_RECORD_INSTANCE_KEYS.set(presentation, created);
	return created;
}
function boundedPageSize(value) {
	return Number.isSafeInteger(value) ? Math.max(1, Math.min(MAX_STATIC_PAGE_SIZE, value)) : DEFAULT_STATIC_PAGE_SIZE;
}
function codeUnitCompare(left, right) {
	return left === right ? 0 : left < right ? -1 : 1;
}
function compareOptionalString(left, right) {
	if (left === right) return 0;
	if (left === void 0) return -1;
	if (right === void 0) return 1;
	return codeUnitCompare(left, right);
}
function compareEvidence(left, right) {
	const common = codeUnitCompare(left.kind, right.kind) || codeUnitCompare(left.evidence_id, right.evidence_id);
	if (common !== 0 || left.kind !== right.kind) return common;
	switch (left.kind) {
		case "graph_snapshot_record": {
			const matching = right;
			return codeUnitCompare(left.record_id, matching.record_id) || compareOptionalString(left.locator, matching.locator);
		}
		case "graph_node": {
			const matching = right;
			return codeUnitCompare(left.node_id, matching.node_id) || compareOptionalString(left.locator, matching.locator) || compareOptionalString(left.excerpt, matching.excerpt);
		}
		case "citation": {
			const matching = right;
			return codeUnitCompare(left.paper_id, matching.paper_id) || codeUnitCompare(left.citation_id, matching.citation_id) || (left.page ?? -1) - (matching.page ?? -1) || compareOptionalString(left.locator, matching.locator) || compareOptionalString(left.excerpt, matching.excerpt) || compareOptionalString(left.doi, matching.doi);
		}
		case "external_source": {
			const matching = right;
			return codeUnitCompare(left.source_id, matching.source_id) || compareOptionalString(left.locator, matching.locator) || compareOptionalString(left.excerpt, matching.excerpt);
		}
	}
}
function EvidenceReference({ reference }) {
	return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("dl", { children: [
		/* @__PURE__ */ jsx("dt", { children: "Kind" }),
		/* @__PURE__ */ jsx("dd", { children: reference.kind }),
		/* @__PURE__ */ jsx("dt", { children: "Evidence id" }),
		/* @__PURE__ */ jsx("dd", { children: reference.evidence_id }),
		reference.kind === "graph_snapshot_record" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("dt", { children: "Record id" }), /* @__PURE__ */ jsx("dd", { children: reference.record_id })] }),
		reference.kind === "graph_node" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("dt", { children: "Referenced node id" }), /* @__PURE__ */ jsx("dd", { children: reference.node_id })] }),
		reference.kind === "citation" && /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx("dt", { children: "Paper id" }),
			/* @__PURE__ */ jsx("dd", { children: reference.paper_id }),
			/* @__PURE__ */ jsx("dt", { children: "Citation id" }),
			/* @__PURE__ */ jsx("dd", { children: reference.citation_id }),
			reference.page !== void 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("dt", { children: "Page" }), /* @__PURE__ */ jsx("dd", { children: reference.page })] }),
			reference.doi !== void 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("dt", { children: "DOI" }), /* @__PURE__ */ jsx("dd", { children: reference.doi })] })
		] }),
		reference.kind === "external_source" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("dt", { children: "Source id" }), /* @__PURE__ */ jsx("dd", { children: reference.source_id })] }),
		reference.locator !== void 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("dt", { children: "Locator" }), /* @__PURE__ */ jsx("dd", { children: reference.locator })] }),
		"excerpt" in reference && reference.excerpt !== void 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("dt", { children: "Excerpt" }), /* @__PURE__ */ jsx("dd", { children: reference.excerpt })] })
	] }) });
}
function scalarText(value) {
	if (value === null) return "null";
	if (typeof value === "string") return value;
	return String(value);
}
function attributeValue(value) {
	if (Array.isArray(value)) return /* @__PURE__ */ jsx("ol", { children: value.map((item, index) => /* @__PURE__ */ jsx("li", { children: scalarText(item) }, index)) });
	return scalarText(value);
}
function CompleteMetadata({ value }) {
	const attributeEntries = Object.entries(value.attributes ?? {}).sort(([left], [right]) => codeUnitCompare(left, right));
	const evidence = [...value.evidence ?? []].sort(compareEvidence);
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		value.detail !== void 0 && /* @__PURE__ */ jsxs("p", { children: ["Detail: ", value.detail] }),
		attributeEntries.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", { children: "Attributes" }), /* @__PURE__ */ jsx("dl", { children: attributeEntries.map(([key, item]) => /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: key }), /* @__PURE__ */ jsx("dd", { children: attributeValue(item) })] }, key)) })] }),
		value.epistemic !== void 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", { children: "Epistemic record" }), /* @__PURE__ */ jsxs("dl", { children: [
			/* @__PURE__ */ jsx("dt", { children: "Status" }),
			/* @__PURE__ */ jsx("dd", { children: value.epistemic.status }),
			/* @__PURE__ */ jsx("dt", { children: "Advisory only" }),
			/* @__PURE__ */ jsx("dd", { children: String(value.epistemic.advisory_only) }),
			/* @__PURE__ */ jsx("dt", { children: "Paper-local evidence" }),
			/* @__PURE__ */ jsx("dd", { children: String(value.epistemic.is_paper_local_evidence) }),
			/* @__PURE__ */ jsx("dt", { children: "Calibrated posterior" }),
			/* @__PURE__ */ jsx("dd", { children: String(value.epistemic.calibrated_posterior) })
		] })] }),
		value.uncalibrated_score !== void 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", { children: "Uncalibrated score" }), /* @__PURE__ */ jsxs("dl", { children: [
			/* @__PURE__ */ jsx("dt", { children: "Meaning" }),
			/* @__PURE__ */ jsx("dd", { children: value.uncalibrated_score.kind }),
			/* @__PURE__ */ jsx("dt", { children: "Value" }),
			/* @__PURE__ */ jsx("dd", { children: value.uncalibrated_score.value }),
			/* @__PURE__ */ jsx("dt", { children: "Calibrated posterior" }),
			/* @__PURE__ */ jsx("dd", { children: String(value.uncalibrated_score.calibrated_posterior) })
		] })] }),
		evidence.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("p", { children: [
			"Evidence references (",
			evidence.length,
			")"
		] }), /* @__PURE__ */ jsx("ol", { children: evidence.map((reference) => /* @__PURE__ */ jsx(EvidenceReference, { reference }, reference.evidence_id)) })] })
	] });
}
function compareNodes(left, right) {
	return codeUnitCompare(left.id, right.id) || codeUnitCompare(left.kind, right.kind) || codeUnitCompare(left.label, right.label);
}
function compareEdges(left, right) {
	if (left.id !== void 0 || right.id !== void 0) {
		const byId = compareOptionalString(left.id, right.id);
		if (byId !== 0) return byId;
	}
	return codeUnitCompare(left.source, right.source) || codeUnitCompare(left.target, right.target) || codeUnitCompare(left.kind, right.kind) || Number(left.directed !== false) - Number(right.directed !== false) || compareOptionalString(left.label, right.label);
}
/**
* Deterministic paginated DOM browser for every record in a prepared graph.
* Ordering uses exact ECMAScript UTF-16 code-unit comparison and never depends
* on force-layout geometry, locale data, pointer state, or animation. One page
* is mounted at a time so the DOM remains bounded at the maximum graph size.
*/
function KnowledgeGraphStaticRecordView(props) {
	assertPreparedGenericKnowledgeGraphPresentation$1(props.presentation);
	return renderKnowledgeGraphStaticRecordView(props);
}
/** Package-internal corpus records used only in the caption-bound composition. */
function KnowledgeGraphCorpusStaticRecordViewInternal(props) {
	assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
	return renderKnowledgeGraphStaticRecordView(props);
}
function renderKnowledgeGraphStaticRecordView(props) {
	assertPreparedKnowledgeGraphPresentation$1(props.presentation);
	if (props.view !== void 0) assertPreparedKnowledgeGraphView$1(props.view, props.presentation);
	return /* @__PURE__ */ jsx(KnowledgeGraphStaticRecordViewInstance, { ...props }, staticRecordInstanceKey(props.presentation));
}
function KnowledgeGraphStaticRecordViewInstance({ presentation, view, className, label = "Deterministic paginated knowledge graph record view", nodePageSize, edgePageSize }) {
	const nodes = useMemo(() => [...presentation.nodes].sort(compareNodes), [presentation.nodes]);
	const edges = useMemo(() => [...presentation.edges].sort(compareEdges), [presentation.edges]);
	const safeNodePageSize = boundedPageSize(nodePageSize);
	const safeEdgePageSize = boundedPageSize(edgePageSize);
	const [nodePage, setNodePage] = useState(0);
	const [edgePage, setEdgePage] = useState(0);
	const nodePageCount = Math.max(1, Math.ceil(nodes.length / safeNodePageSize));
	const edgePageCount = Math.max(1, Math.ceil(edges.length / safeEdgePageSize));
	const currentNodePage = Math.min(nodePage, nodePageCount - 1);
	const currentEdgePage = Math.min(edgePage, edgePageCount - 1);
	useEffect(() => {
		setNodePage((page) => Math.min(page, nodePageCount - 1));
	}, [nodePageCount]);
	useEffect(() => {
		setEdgePage((page) => Math.min(page, edgePageCount - 1));
	}, [edgePageCount]);
	const visibleNodes = nodes.slice(currentNodePage * safeNodePageSize, (currentNodePage + 1) * safeNodePageSize);
	const visibleEdges = edges.slice(currentEdgePage * safeEdgePageSize, (currentEdgePage + 1) * safeEdgePageSize);
	return /* @__PURE__ */ jsxs("section", {
		className,
		"aria-label": safeDiagnosticText(label, 240),
		children: [
			view !== void 0 && /* @__PURE__ */ jsxs("div", {
				role: "note",
				children: [/* @__PURE__ */ jsxs("p", { children: [
					"Filtered interactive view: showing ",
					view.counts.visibleNodes,
					" of",
					" ",
					view.counts.sourceNodes,
					" nodes and ",
					view.counts.visibleEdges,
					" of",
					" ",
					view.counts.sourceEdges,
					" relationships. The paginated records below remain the full source presentation."
				] }), /* @__PURE__ */ jsxs("dl", { children: [
					/* @__PURE__ */ jsx("dt", { children: "Requested node kinds" }),
					/* @__PURE__ */ jsx("dd", { children: view.policy.nodeKinds === "all" ? "all" : view.policy.nodeKinds.length === 0 ? "none" : view.policy.nodeKinds.join(", ") }),
					/* @__PURE__ */ jsx("dt", { children: "Requested relationship kinds" }),
					/* @__PURE__ */ jsx("dd", { children: view.policy.edgeKinds === "all" ? "all" : view.policy.edgeKinds.length === 0 ? "none" : view.policy.edgeKinds.join(", ") }),
					/* @__PURE__ */ jsx("dt", { children: "Endpoint-pruned relationships" }),
					/* @__PURE__ */ jsx("dd", { children: view.counts.endpointPrunedEdges }),
					/* @__PURE__ */ jsx("dt", { children: "Kind-filtered relationships" }),
					/* @__PURE__ */ jsx("dd", { children: view.counts.edgeKindFilteredEdges })
				] })]
			}),
			/* @__PURE__ */ jsx("h3", { children: "Presentation metadata" }),
			/* @__PURE__ */ jsxs("dl", { children: [
				/* @__PURE__ */ jsx("dt", { children: "Prepared contract" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.contract }),
				/* @__PURE__ */ jsx("dt", { children: "Profile" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.profile }),
				/* @__PURE__ */ jsx("dt", { children: "Graph lifecycle identity" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.graphIdentity }),
				/* @__PURE__ */ jsx("dt", { children: "Input boundary" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.inputAssurance.boundary }),
				/* @__PURE__ */ jsx("dt", { children: "Duplicate-member assurance" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.inputAssurance.duplicateMembers }),
				/* @__PURE__ */ jsx("dt", { children: "Proxy-trap assurance" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.inputAssurance.proxyTrapFreedom }),
				/* @__PURE__ */ jsx("dt", { children: "Visual mapping authority" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.mappingAuthority.kind }),
				presentation.mappingAuthority.kind === "corpus_visual_mapping" && /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx("dt", { children: "Presentation invariants" }),
					/* @__PURE__ */ jsx("dd", { children: presentation.mappingAuthority.presentationInvariants }),
					/* @__PURE__ */ jsx("dt", { children: "Derivation authentication" }),
					/* @__PURE__ */ jsx("dd", { children: presentation.mappingAuthority.derivationAuthentication })
				] }),
				/* @__PURE__ */ jsx("dt", { children: "Scientific authority" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.mappingAuthority.scientificAuthority }),
				/* @__PURE__ */ jsx("dt", { children: "Retained input occurrences" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.budget.retainedOccurrences }),
				/* @__PURE__ */ jsx("dt", { children: "Accepted source string code units" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.budget.sourceStringCodeUnits }),
				/* @__PURE__ */ jsx("dt", { children: "Inspection work" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.budget.inspectionWork })
			] }),
			presentation.context !== void 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", { children: "Caller-declared graph context" }), /* @__PURE__ */ jsxs("dl", { children: [
				/* @__PURE__ */ jsx("dt", { children: "Graph id" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.context.graph_id }),
				/* @__PURE__ */ jsx("dt", { children: "Graph source" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.context.graph_source }),
				/* @__PURE__ */ jsx("dt", { children: "Caller-declared snapshot namespace" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.context.graph_snapshot_id }),
				/* @__PURE__ */ jsx("dt", { children: "Graph scope" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.context.graph_scope }),
				/* @__PURE__ */ jsx("dt", { children: "Generated at" }),
				/* @__PURE__ */ jsx("dd", { children: presentation.context.generated_at })
			] })] }),
			/* @__PURE__ */ jsx("p", {
				role: "note",
				children: "This view preserves caller-supplied reference identifiers but does not resolve, authenticate, or establish custody for them. It contains no force-layout coordinates; visual positions and distances are not evidence."
			}),
			/* @__PURE__ */ jsxs("h3", { children: [
				"Nodes (",
				nodes.length,
				")"
			] }),
			nodes.length === 0 && /* @__PURE__ */ jsx("p", { children: "This source presentation contains no nodes." }),
			/* @__PURE__ */ jsx("ol", { children: visibleNodes.map((node) => /* @__PURE__ */ jsxs("li", { children: [
				/* @__PURE__ */ jsx("h4", { children: node.label }),
				/* @__PURE__ */ jsxs("dl", { children: [
					/* @__PURE__ */ jsx("dt", { children: "Node id" }),
					/* @__PURE__ */ jsx("dd", { children: node.id }),
					/* @__PURE__ */ jsx("dt", { children: "Kind" }),
					/* @__PURE__ */ jsx("dd", { children: node.kind }),
					/* @__PURE__ */ jsx("dt", { children: "Visual color" }),
					/* @__PURE__ */ jsx("dd", { children: node.color }),
					/* @__PURE__ */ jsx("dt", { children: "Visual glyph" }),
					/* @__PURE__ */ jsx("dd", { children: node.nodeGlyph ?? "sphere_outline" }),
					/* @__PURE__ */ jsx("dt", { children: "Visual radius" }),
					/* @__PURE__ */ jsx("dd", { children: node.radius }),
					/* @__PURE__ */ jsx("dt", { children: "Radius meaning" }),
					/* @__PURE__ */ jsx("dd", { children: presentation.profile === "corpus_entity" ? node.radiusMeaning : `Caller-declared: ${node.radiusMeaning ?? "visual size has no declared quantitative interpretation."}` })
				] }),
				/* @__PURE__ */ jsx(CompleteMetadata, { value: node })
			] }, node.id)) }),
			nodes.length > safeNodePageSize && /* @__PURE__ */ jsxs("nav", {
				"aria-label": "Static record node pages",
				children: [
					/* @__PURE__ */ jsxs("p", {
						"aria-live": "polite",
						children: [
							"Node page ",
							currentNodePage + 1,
							" of ",
							nodePageCount
						]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						style: {
							minHeight: 44,
							minWidth: 44
						},
						disabled: currentNodePage === 0,
						onClick: () => setNodePage(Math.max(0, currentNodePage - 1)),
						children: "Previous node records"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						style: {
							minHeight: 44,
							minWidth: 44
						},
						disabled: currentNodePage + 1 >= nodePageCount,
						onClick: () => setNodePage(Math.min(nodePageCount - 1, currentNodePage + 1)),
						children: "Next node records"
					})
				]
			}),
			/* @__PURE__ */ jsxs("h3", { children: [
				"Relationships (",
				edges.length,
				")"
			] }),
			edges.length === 0 && /* @__PURE__ */ jsx("p", { children: "This source presentation contains no relationships." }),
			/* @__PURE__ */ jsx("ol", { children: visibleEdges.map((edge) => /* @__PURE__ */ jsxs("li", { children: [
				/* @__PURE__ */ jsx("h4", { children: edge.label ?? edge.kind }),
				/* @__PURE__ */ jsxs("dl", { children: [
					edge.id !== void 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("dt", { children: "Assertion id" }), /* @__PURE__ */ jsx("dd", { children: edge.id })] }),
					/* @__PURE__ */ jsx("dt", { children: "Source node id" }),
					/* @__PURE__ */ jsx("dd", { children: edge.source }),
					/* @__PURE__ */ jsx("dt", { children: "Target node id" }),
					/* @__PURE__ */ jsx("dd", { children: edge.target }),
					/* @__PURE__ */ jsx("dt", { children: "Kind" }),
					/* @__PURE__ */ jsx("dd", { children: edge.kind }),
					/* @__PURE__ */ jsx("dt", { children: "Direction" }),
					/* @__PURE__ */ jsx("dd", { children: edge.directed === false ? "undirected" : "source to target" }),
					/* @__PURE__ */ jsx("dt", { children: "Visual color" }),
					/* @__PURE__ */ jsx("dd", { children: edge.color }),
					/* @__PURE__ */ jsx("dt", { children: "Visual stroke pattern" }),
					/* @__PURE__ */ jsx("dd", { children: edge.edgeStrokePattern ?? "solid" }),
					/* @__PURE__ */ jsx("dt", { children: "Flow-marker encoding enabled" }),
					/* @__PURE__ */ jsx("dd", { children: String(edge.particles === true) })
				] }),
				/* @__PURE__ */ jsx(CompleteMetadata, { value: edge })
			] }, graphEdgeIdentityKey(edge))) }),
			edges.length > safeEdgePageSize && /* @__PURE__ */ jsxs("nav", {
				"aria-label": "Static record relationship pages",
				children: [
					/* @__PURE__ */ jsxs("p", {
						"aria-live": "polite",
						children: [
							"Relationship page ",
							currentEdgePage + 1,
							" of ",
							edgePageCount
						]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						style: {
							minHeight: 44,
							minWidth: 44
						},
						disabled: currentEdgePage === 0,
						onClick: () => setEdgePage(Math.max(0, currentEdgePage - 1)),
						children: "Previous relationship records"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						style: {
							minHeight: 44,
							minWidth: 44
						},
						disabled: currentEdgePage + 1 >= edgePageCount,
						onClick: () => setEdgePage(Math.min(edgePageCount - 1, currentEdgePage + 1)),
						children: "Next relationship records"
					})
				]
			})
		]
	});
}

//#endregion
//#region react/KnowledgeGraphAccessibleFigure.tsx
var KnowledgeGraphVisualBoundary = class extends Component {
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
	return /* @__PURE__ */ jsx(Fragment, { children: renderVisual(scene, context) });
}
function inputBoundaryFailure(message) {
	return Object.freeze({
		ok: false,
		errors: Object.freeze([Object.freeze({
			code: "input_boundary_rejected",
			path: "spec/specJson",
			message
		})])
	});
}
/**
* Canonical legacy corpus-graph composition. It binds strict validation,
* mapping, caption, legend, interactive DOM controls, and a paginated record
* view to one detached presentation. Unit tests establish those narrow
* composition invariants only—not whole-figure WCAG, browser, WebGL, or
* assistive-technology conformance.
*/
function KnowledgeGraphAccessibleFigure(props) {
	const { renderVisual, selectedId, onSelect, hoverId, onHover, visualAvailable = true, visualRetryKey, viewPolicy, query = "", controlsRef, autoFrame = true, flyToSelection, labelColor, particleColor, reducedMotion, nodePageSize, recordNodePageSize, recordEdgePageSize, activePalette, className, label = "Interactive knowledge graph" } = props;
	const hasSpec = Object.hasOwn(props, "spec");
	const hasSpecJson = Object.hasOwn(props, "specJson");
	const spec = hasSpec ? props.spec : void 0;
	const specJson = hasSpecJson ? props.specJson : void 0;
	const preparedSource = useMemo(() => {
		if (hasSpec === hasSpecJson) return inputBoundaryFailure("provide exactly one own input property: spec or specJson");
		if (hasSpecJson) {
			if (typeof specJson !== "string") return inputBoundaryFailure("specJson must be a string");
			return prepareCorpusKnowledgeGraphFigureJson(specJson, { activePalette });
		}
		return prepareCorpusKnowledgeGraphFigure(spec, { activePalette });
	}, [
		hasSpec,
		hasSpecJson,
		spec,
		specJson,
		activePalette
	]);
	const preparedView = useMemo(() => {
		if (!preparedSource.ok || viewPolicy === void 0) return {
			ok: true,
			view: void 0
		};
		try {
			return {
				ok: true,
				view: prepareKnowledgeGraphView$1(preparedSource.presentation, viewPolicy)
			};
		} catch (error) {
			return {
				ok: false,
				message: `knowledge-graph view preparation failed: ${safeErrorMessage(error)}`
			};
		}
	}, [preparedSource, viewPolicy]);
	const hostPolicy = useMemo(() => {
		if (!preparedSource.ok || !preparedView.ok) return void 0;
		const activeNodes = preparedView.view?.nodes ?? preparedSource.presentation.nodes;
		const activeEdges = preparedView.view?.edges ?? preparedSource.presentation.edges;
		return Object.freeze({
			...preparedSource.hostPolicy,
			view: preparedView.view,
			liveForceAvailability: knowledgeGraphLiveForceAvailability(activeNodes.length, activeEdges.length)
		});
	}, [preparedSource, preparedView]);
	const captionId = `cortexel-kg-caption-${useId().replace(/:/gu, "")}`;
	const selectionInvalidation = useRef(null);
	const hoverInvalidation = useRef(null);
	const activeToken = preparedSource.ok && preparedView.ok ? preparedView.view ?? preparedSource.presentation : void 0;
	const selectedIsInvalid = preparedSource.ok && preparedView.ok && selectedId !== null && !(preparedView.view === void 0 ? knowledgeGraphPresentationContainsNode$1(preparedSource.presentation, selectedId) : knowledgeGraphViewContainsNode$1(preparedView.view, preparedSource.presentation, selectedId));
	const hoverIsInvalid = preparedSource.ok && preparedView.ok && hoverId !== null && !(preparedView.view === void 0 ? knowledgeGraphPresentationContainsNode$1(preparedSource.presentation, hoverId) : knowledgeGraphViewContainsNode$1(preparedView.view, preparedSource.presentation, hoverId));
	useEffect(() => {
		if (!selectedIsInvalid || activeToken === void 0 || selectedId === null) {
			selectionInvalidation.current = null;
			return;
		}
		const previous = selectionInvalidation.current;
		if (previous?.token === activeToken && previous.id === selectedId) return;
		selectionInvalidation.current = {
			token: activeToken,
			id: selectedId
		};
		onSelect(null);
	}, [
		activeToken,
		onSelect,
		selectedId,
		selectedIsInvalid
	]);
	useEffect(() => {
		if (!hoverIsInvalid || activeToken === void 0 || hoverId === null) {
			hoverInvalidation.current = null;
			return;
		}
		const previous = hoverInvalidation.current;
		if (previous?.token === activeToken && previous.id === hoverId) return;
		hoverInvalidation.current = {
			token: activeToken,
			id: hoverId
		};
		onHover(null);
	}, [
		activeToken,
		hoverId,
		hoverIsInvalid,
		onHover
	]);
	if (!preparedSource.ok) return /* @__PURE__ */ jsxs("section", {
		role: "alert",
		"aria-label": "Invalid knowledge graph figure",
		children: [/* @__PURE__ */ jsx("h3", { children: "Knowledge graph figure rejected" }), /* @__PURE__ */ jsx("ul", { children: preparedSource.errors.map((error, index) => /* @__PURE__ */ jsx("li", { children: safeDiagnosticText(`${error.path}: ${error.message}`, 840) }, index)) })]
	});
	if (!preparedView.ok) return /* @__PURE__ */ jsxs("figure", {
		className,
		"aria-label": safeDiagnosticText(label, 240),
		"aria-describedby": captionId,
		children: [
			/* @__PURE__ */ jsx("figcaption", {
				id: captionId,
				children: /* @__PURE__ */ jsx("bdi", {
					dir: "auto",
					style: { unicodeBidi: "isolate" },
					children: preparedSource.caption
				})
			}),
			/* @__PURE__ */ jsxs("section", {
				role: "alert",
				"aria-label": "Invalid knowledge graph view policy",
				children: [/* @__PURE__ */ jsx("h3", { children: "Knowledge graph view rejected" }), /* @__PURE__ */ jsx("p", { children: safeDiagnosticText(`viewPolicy: ${preparedView.message}`, 840) })]
			}),
			/* @__PURE__ */ jsx(KnowledgeGraphCorpusStaticRecordViewInternal, {
				presentation: preparedSource.presentation,
				nodePageSize: recordNodePageSize,
				edgePageSize: recordEdgePageSize
			})
		]
	});
	if (hostPolicy === void 0) throw new Error("knowledge-graph host policy invariant failed");
	const { caption, presentation } = preparedSource;
	const { view } = preparedView;
	const visualUnavailableStatus = /* @__PURE__ */ jsx("p", {
		role: "status",
		children: "The host-owned interactive 3D view is unavailable. The paginated graph-record browser remains below; its controls expose every accepted record after hydration."
	});
	const { liveForceAvailability } = hostPolicy;
	const liveForceAvailable = liveForceAvailability.status === "available";
	const liveForceLimitStatus = /* @__PURE__ */ jsxs("p", {
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
	const scene = liveForceAvailable ? /* @__PURE__ */ jsx(KnowledgeGraphCorpus3DSceneInternal, {
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
	return /* @__PURE__ */ jsxs("figure", {
		className,
		"aria-label": safeDiagnosticText(label, 240),
		"aria-describedby": captionId,
		children: [
			/* @__PURE__ */ jsx("figcaption", {
				id: captionId,
				children: /* @__PURE__ */ jsx("bdi", {
					dir: "auto",
					style: { unicodeBidi: "isolate" },
					children: caption
				})
			}),
			view !== void 0 && /* @__PURE__ */ jsxs("p", {
				role: "note",
				children: [
					"Filtered view: showing ",
					view.counts.visibleNodes,
					" of ",
					view.counts.sourceNodes,
					" ",
					"nodes and ",
					view.counts.visibleEdges,
					" of ",
					view.counts.sourceEdges,
					" ",
					"relationships. Relationships excluded by kind: ",
					" ",
					view.counts.edgeKindFilteredEdges,
					"; excluded because an endpoint is hidden:",
					" ",
					view.counts.endpointPrunedEdges,
					". The caption and record browser remain bound to the full source."
				]
			}),
			visualAvailable && liveForceAvailable && scene !== null ? /* @__PURE__ */ jsx(KnowledgeGraphVisualBoundary, {
				resetToken: view ?? presentation,
				retryToken: visualRetryKey,
				fallback: visualUnavailableStatus,
				children: /* @__PURE__ */ jsx(KnowledgeGraphVisualMount, {
					renderVisual,
					scene,
					context: hostPolicy
				})
			}) : liveForceAvailable ? visualUnavailableStatus : liveForceLimitStatus,
			/* @__PURE__ */ jsx(KnowledgeGraphCorpusLegendInternal, {
				presentation,
				view,
				themeMode: hostPolicy.themeMode
			}),
			/* @__PURE__ */ jsx(KnowledgeGraphCorpusA11yListInternal, {
				presentation,
				view,
				selectedId,
				onSelect,
				query,
				nodePageSize
			}),
			/* @__PURE__ */ jsx(KnowledgeGraphCorpusStaticRecordViewInternal, {
				presentation,
				view,
				nodePageSize: recordNodePageSize,
				edgePageSize: recordEdgePageSize
			})
		]
	});
}

//#endregion
//#region react/KnowledgeGraph3DScene.tsx
const PARTICLES_PER_EDGE = 4;
const GRAPH_DIRECTION_MARKER_PADDING = 2;
const GRAPH_LAYOUT_SETTLED_ALPHA = .008;
const MAX_PARTICLES = MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES;
const FALLBACK_COLOR = "#64748b";
const MAX_REMEMBERED_POSITIONS = 5e3;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _darkDimTarget = new THREE.Color("#030711");
const _lightDimTarget = new THREE.Color("#f8fafc");
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _curveControl = new THREE.Vector3();
const _curvePoint = new THREE.Vector3();
const _curveNext = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _box = new THREE.Box3();
const _sphere = new THREE.Sphere();
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
	const label = safeDiagnosticText(text, 120);
	const materialRef = useRef(null);
	useLayoutEffect(() => {
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
	return /* @__PURE__ */ jsx("sprite", {
		ref: spriteRef,
		visible: false,
		frustumCulled: false,
		renderOrder: 1e3,
		children: /* @__PURE__ */ jsx("spriteMaterial", {
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
	graphEdgeControlPointInto(_a, _b, lane, _curveControl);
}
/** Allocation-free glyph upload shared by the three closed node-kind groups. */
function updateKnowledgeGraphGlyphMatrices(glyphMesh, nodeIndexes, simNodes, focus, focusSet) {
	if (glyphMesh === null) return;
	for (let glyphIndex = 0; glyphIndex < nodeIndexes.length; glyphIndex++) {
		const node = simNodes[nodeIndexes[glyphIndex]];
		const scale = knowledgeGraphRenderedNodeScale(knowledgeGraphNodeUsesFocusScale(node.id, focus, focusSet));
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
		const amount = knowledgeGraphNodeEmphasisDimAmount(node.id, focus, focusSet, queryActive, queryMatchIds);
		glyphMesh.setColorAt(glyphIndex, dim(glyphColor, amount, themeMode));
	}
	if (glyphMesh.instanceColor) glyphMesh.instanceColor.needsUpdate = true;
}
function KnowledgeGraph3DScene(props) {
	assertPreparedGenericKnowledgeGraphPresentation$1(props.presentation);
	if (props.view !== void 0) assertPreparedKnowledgeGraphView$2(props.view, props.presentation);
	const nodes = props.view?.nodes ?? props.presentation.nodes;
	const edges = props.view?.edges ?? props.presentation.edges;
	assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
	return renderKnowledgeGraph3DScene(props);
}
/** Package-internal corpus renderer used only below the canonical caption. */
function KnowledgeGraphCorpus3DSceneInternal(props) {
	assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
	if (props.view !== void 0) assertPreparedKnowledgeGraphView$2(props.view, props.presentation);
	const nodes = props.view?.nodes ?? props.presentation.nodes;
	const edges = props.view?.edges ?? props.presentation.edges;
	assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
	return renderKnowledgeGraph3DScene(props);
}
function renderKnowledgeGraph3DScene(props) {
	const { presentation, view, ...interactionProps } = props;
	assertPreparedKnowledgeGraphPresentation$2(presentation);
	if (view !== void 0) assertPreparedKnowledgeGraphView$2(view, presentation);
	const { graphIdentity } = presentation;
	const nodes = view?.nodes ?? presentation.nodes;
	const edges = view?.edges ?? presentation.edges;
	const selectedId = view !== void 0 && props.selectedId !== null && !knowledgeGraphViewContainsNode$2(view, presentation, props.selectedId) ? null : props.selectedId;
	const hoverId = view !== void 0 && props.hoverId !== null && !knowledgeGraphViewContainsNode$2(view, presentation, props.hoverId) ? null : props.hoverId;
	assertKnowledgeGraphIdentity(graphIdentity);
	assertKnowledgeGraphNodeReference(props.selectedId, "knowledge-graph selected id");
	assertKnowledgeGraphNodeReference(props.hoverId, "knowledge-graph hover id");
	assertKnowledgeGraphColor(props.labelColor, "knowledge-graph label color");
	assertKnowledgeGraphColor(props.particleColor, "knowledge-graph particle color");
	return /* @__PURE__ */ jsx(KnowledgeGraph3DSceneInstance, {
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
	const meshRef = useRef(null);
	const linesRef = useRef(null);
	const particlesRef = useRef(null);
	const arrowsRef = useRef(null);
	const sphereGlyphsRef = useRef(null);
	const boxGlyphsRef = useRef(null);
	const diamondGlyphsRef = useRef(null);
	const labelSpriteRef = useRef(null);
	const sceneGroupRef = useRef(null);
	const camera = useThree(selectCamera);
	const gl = useThree(selectRenderer);
	const invalidate = useThree(selectInvalidate);
	const cameraProjectionKind = knowledgeGraphCameraProjectionKind(camera);
	const perspectiveCamera = camera;
	const orthographicCamera = camera;
	const resolvedLabelColor = labelColor ?? (themeMode === "light" ? "#0f172a" : "#e2e8f0");
	const resolvedParticleColor = particleColor ?? (themeMode === "light" ? "#0369a1" : "#8fd3ff");
	const resolvedGlyphColor = themeMode === "light" ? "#0f172a" : "#f8fafc";
	useEffect(() => {
		if (autoFrame && cameraProjectionKind === null) devWarn("knowledge-graph auto-frame supports only perspective and orthographic cameras");
	}, [autoFrame, cameraProjectionKind]);
	const [posMap] = useState(() => ({ current: /* @__PURE__ */ new Map() }));
	const readyGraphKeyRef = useRef(null);
	const autoFrameStageRef = useRef(0);
	const flyToIdRef = useRef(null);
	const onHoverRef = useRef(onHover);
	const hoverIdRef = useRef(hoverId);
	useLayoutEffect(() => {
		onHoverRef.current = onHover;
		hoverIdRef.current = hoverId;
	}, [onHover, hoverId]);
	useEffect(() => () => {
		if (hoverIdRef.current === null) return;
		hoverIdRef.current = null;
		onHoverRef.current(null);
	}, []);
	const attachedControlsRef = useRef(null);
	const [onUserGrab] = useState(() => () => {
		autoFrameStageRef.current = 2;
		flyToIdRef.current = null;
	});
	useEffect(() => () => {
		synchronizeKnowledgeGraphControlsListener(attachedControlsRef, null, onUserGrab);
	}, [onUserGrab]);
	const layoutInput = useMemo(() => snapshotGraphLayoutInputs(nodes, edges), [nodes, edges]);
	const graphKey = layoutInput.graphKey;
	const layoutKey = layoutInput.layoutKey;
	const normalizedQuery = useMemo(() => normalizeGraphQuery(query), [query]);
	const queryMatchIds = useMemo(() => graphQueryMatchIds(nodes, normalizedQuery, edges), [
		nodes,
		normalizedQuery,
		edges
	]);
	const queryActive = normalizedQuery.length > 0;
	const visualNodes = useMemo(() => nodes.map(({ id, label, color, nodeGlyph }) => ({
		id,
		label,
		color: knowledgeGraphContrastSafeColor(color, themeMode),
		nodeGlyph: nodeGlyph ?? "sphere_outline"
	})), [nodes, themeMode]);
	const glyphNodeIndexes = useMemo(() => ({
		sphere: visualNodes.flatMap((node, index) => node.nodeGlyph === "sphere_outline" ? [index] : []),
		box: visualNodes.flatMap((node, index) => node.nodeGlyph === "box_shell" ? [index] : []),
		diamond: visualNodes.flatMap((node, index) => node.nodeGlyph === "diamond_shell" ? [index] : [])
	}), [visualNodes]);
	const { layoutNodes, simLinks, index } = useMemo(() => {
		const index = /* @__PURE__ */ new Map();
		const layoutNodes = layoutInput.nodes.map((n, i) => {
			index.set(n.id, i);
			return {
				id: n.id,
				radius: n.radius,
				nodeGlyph: n.nodeGlyph
			};
		});
		const topologyEdges = filterGraphEdges(new Set(index.keys()), layoutInput.edges);
		return {
			layoutNodes,
			simLinks: uniqueGraphTopologyLinks(topologyEdges),
			index
		};
	}, [layoutKey]);
	const { validEdges, edgeLanes } = useMemo(() => {
		const validEdges = filterGraphEdges(new Set(index.keys()), layoutInput.edges);
		return {
			validEdges,
			edgeLanes: assignGraphEdgeLanes(validEdges)
		};
	}, [graphKey, index]);
	const neighbors = useMemo(() => buildAdjacency(new Set(index.keys()), validEdges), [index, validEdges]);
	useEffect(() => {
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
	const flowEdges = useMemo(() => edgeLanes.filter(({ edge }) => edge.particles), [edgeLanes]);
	const directedEdges = useMemo(() => edgeLanes.filter(({ edge }) => edge.directed !== false), [edgeLanes]);
	const edgeDisplayColors = useMemo(() => validEdges.map((edge) => knowledgeGraphContrastSafeColor(edge.color, themeMode)), [validEdges, themeMode]);
	const particleDistribution = useMemo(() => planFlowParticleDistribution(flowEdges.length, PARTICLES_PER_EDGE, MAX_PARTICLES), [flowEdges.length]);
	const particleCount = particleDistribution.total;
	useEffect(() => {
		if (flowEdges.length * PARTICLES_PER_EDGE > MAX_PARTICLES) devWarn(`KnowledgeGraph3DScene: ${flowEdges.length} flow edges exceed the ${MAX_PARTICLES}-particle cap at four markers each; marker density is reduced evenly and every flow edge retains at least one marker.`);
	}, [flowEdges.length]);
	const visibleLineSegmentCount = useMemo(() => validEdges.reduce((count, edge) => {
		let visible = 0;
		for (let chord = 0; chord < 12; chord++) if (knowledgeGraphEdgeStrokeSegmentVisible(edge.edgeStrokePattern ?? "solid", chord, 12)) visible++;
		return count + visible;
	}, 0), [validEdges]);
	const linePos = useMemo(() => new Float32Array(visibleLineSegmentCount * 6), [visibleLineSegmentCount]);
	const lineCol = useMemo(() => new Float32Array(visibleLineSegmentCount * 6), [visibleLineSegmentCount]);
	useLayoutEffect(() => {
		meshRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		sphereGlyphsRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		boxGlyphsRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		diamondGlyphsRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		arrowsRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		particlesRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		const position = linesRef.current?.geometry.getAttribute("position");
		if (position instanceof THREE.BufferAttribute) position.setUsage(THREE.DynamicDrawUsage);
	}, [
		linePos,
		nodes.length,
		directedEdges.length,
		particleCount,
		glyphNodeIndexes.sphere.length,
		glyphNodeIndexes.box.length,
		glyphNodeIndexes.diamond.length
	]);
	const layoutRuntimeRef = useRef(null);
	const layoutTickAccumulatorRef = useRef(0);
	const geometryDirtyRef = useRef(true);
	const flowPhaseRef = useRef(0);
	useEffect(() => {
		const plan = planGraphLayoutCache(layoutNodes, posMap.current, MAX_REMEMBERED_POSITIONS);
		const simNodes = plan.nodes;
		const runtimeLinks = simLinks.map(({ source, target }) => ({
			source,
			target
		}));
		const linkForce = forceLink(runtimeLinks).id((d) => d.id).distance(34).strength(.35);
		const sim = forceSimulation(simNodes, 3).force("charge", forceManyBody().strength(-140).distanceMax(600)).force("link", linkForce).force("center", forceCenter(0, 0, 0).strength(.04)).force("collide", forceCollide((d) => {
			const node = d;
			const layoutNode = layoutNodes[index.get(node.id)];
			return knowledgeGraphRenderedNodeRadialExtent(node.r, layoutNode.nodeGlyph ?? "sphere_outline", true) + 3;
		}).iterations(2)).alpha(plan.warmStart ? .5 : 1).alphaDecay(.018).velocityDecay(.42).stop();
		if (reducedMotion) {
			const budget = reducedMotionLayoutTickBudget(simNodes.length, simLinks.length);
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
	useLayoutEffect(() => {
		beginKnowledgeGraphRuntimeTransition(readyGraphKeyRef, geometryDirtyRef, sceneGroupRef.current, invalidate, () => {
			if (hoverIdRef.current === null) return;
			hoverIdRef.current = null;
			onHoverRef.current(null);
		});
	}, [
		graphKey,
		reducedMotion,
		invalidate
	]);
	const applyEmphasis = useCallback(() => {
		const mesh = meshRef.current;
		const raw = hoverId ?? selectedId;
		const focus = raw != null && index.has(raw) ? raw : null;
		const focusSet = focus ? neighbors.get(focus) : null;
		if (mesh) {
			visualNodes.forEach((n, i) => {
				mesh.setColorAt(i, dim(n.color, knowledgeGraphNodeEmphasisDimAmount(n.id, focus, focusSet, queryActive, queryMatchIds), themeMode));
			});
			if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		}
		updateKnowledgeGraphGlyphColors(sphereGlyphsRef.current, glyphNodeIndexes.sphere, visualNodes, resolvedGlyphColor, focus, focusSet, queryActive, queryMatchIds, themeMode);
		updateKnowledgeGraphGlyphColors(boxGlyphsRef.current, glyphNodeIndexes.box, visualNodes, resolvedGlyphColor, focus, focusSet, queryActive, queryMatchIds, themeMode);
		updateKnowledgeGraphGlyphColors(diamondGlyphsRef.current, glyphNodeIndexes.diamond, visualNodes, resolvedGlyphColor, focus, focusSet, queryActive, queryMatchIds, themeMode);
		let k = 0;
		for (let edgeIndex = 0; edgeIndex < validEdges.length; edgeIndex++) {
			const e = validEdges[edgeIndex];
			const incident = focus ? e.source === focus || e.target === focus : graphEdgeMatchesQuery(e.source, e.target, queryMatchIds, normalizedQuery);
			const c = dim(edgeDisplayColors[edgeIndex], focus === null && !queryActive ? 0 : incident ? 0 : .86, themeMode);
			for (let chord = 0; chord < 12; chord++) {
				if (!knowledgeGraphEdgeStrokeSegmentVisible(e.edgeStrokePattern ?? "solid", chord, 12)) continue;
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
				const incident = focus ? edge.source === focus || edge.target === focus : graphEdgeMatchesQuery(edge.source, edge.target, queryMatchIds, normalizedQuery);
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
	useLayoutEffect(() => {
		applyEmphasis();
		geometryDirtyRef.current = true;
		invalidate();
	}, [applyEmphasis, invalidate]);
	useEffect(() => {
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
	useFrame((_, delta) => {
		const runtime = layoutRuntimeRef.current;
		const mesh = meshRef.current;
		const controls = controlsRef?.current ?? null;
		synchronizeKnowledgeGraphControlsListener(attachedControlsRef, controls, onUserGrab);
		if (!runtime || runtime.layoutKey !== layoutKey || runtime.reducedMotion !== reducedMotion || !mesh) return;
		const sim = runtime.sim;
		const simNodes = runtime.nodes;
		let positionsChanged = geometryDirtyRef.current;
		if (sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA) {
			const advanced = advanceGraphLayoutClockInto(layoutTickAccumulatorRef.current, delta, _layoutClockResult);
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
				const pop = knowledgeGraphRenderedNodeScale(knowledgeGraphNodeUsesFocusScale(n.id, focus, focusSet));
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
					graphEdgeCurvePointInto(_a, _curveControl, _b, (chord + 1) / 12, _curveNext);
					if (knowledgeGraphEdgeStrokeSegmentVisible(e.edgeStrokePattern ?? "solid", chord, 12)) {
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
					const targetExtent = knowledgeGraphRenderedNodeRadialExtent(target.r, visualNodes[targetIndex].nodeGlyph, knowledgeGraphNodeUsesFocusScale(target.id, focus, focusSet));
					if (!graphEdgeTargetBoundaryInto(_a, _curveControl, _b, targetExtent, _curveNext, _direction)) {
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
				const queryIncident = graphEdgeMatchesQuery(e.source, e.target, queryMatchIds, normalizedQuery);
				let size = 1.3;
				if (focus) {
					if (e.source !== focus && e.target !== focus) size = 0;
				} else if (!queryIncident) size = 0;
				const phase = fe * .618034;
				const edgeParticleCount = particleDistribution.basePerEdge + (fe < particleDistribution.extraEdgeCount ? 1 : 0);
				for (let q = 0; q < edgeParticleCount && p < particleCount; q++) {
					const frac = reducedMotion ? reducedMotionFlowParticleFraction(q, edgeParticleCount) : (base + phase + q / edgeParticleCount) % 1;
					graphEdgeCurvePointInto(_a, _curveControl, _b, frac, _dummy.position);
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
			const cameraMethodsCanonical = camera.getWorldDirection === THREE.Camera.prototype.getWorldDirection && camera.lookAt === THREE.Object3D.prototype.lookAt && camera.updateMatrixWorld === THREE.Camera.prototype.updateMatrixWorld && camera.updateWorldMatrix === THREE.Camera.prototype.updateWorldMatrix;
			let centeredProjectionSupported = false;
			if (cameraProjectionKind === "perspective") {
				_perspectiveAutoFrameProjection.isArrayCamera = camera.isArrayCamera === true;
				_perspectiveAutoFrameProjection.viewEnabled = perspectiveCamera.view?.enabled === true;
				_perspectiveAutoFrameProjection.parentTransformIdentity = cameraParentIdentity;
				_perspectiveAutoFrameProjection.selfTransformCanonical = cameraSelfTransformCanonical;
				_perspectiveAutoFrameProjection.cameraMethodsCanonical = cameraMethodsCanonical;
				_perspectiveAutoFrameProjection.projectionMethodCanonical = camera.updateProjectionMatrix === THREE.PerspectiveCamera.prototype.updateProjectionMatrix;
				_perspectiveAutoFrameProjection.effectiveFovMethodCanonical = perspectiveCamera.getEffectiveFOV === THREE.PerspectiveCamera.prototype.getEffectiveFOV;
				_perspectiveAutoFrameProjection.webGlCoordinateSystem = camera.coordinateSystem === THREE.WebGLCoordinateSystem;
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
				_orthographicAutoFrameProjection.projectionMethodCanonical = camera.updateProjectionMatrix === THREE.OrthographicCamera.prototype.updateProjectionMatrix;
				_orthographicAutoFrameProjection.webGlCoordinateSystem = camera.coordinateSystem === THREE.WebGLCoordinateSystem;
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
					const radius = knowledgeGraphAutoFrameNodeRadialExtent(n.r, glyph, knowledgeGraphNodeUsesFocusScale(visualNodes[nodeIndex].id, focus, focusSet));
					_box.expandByPoint(_a.set((n.x ?? 0) - radius, (n.y ?? 0) - radius, (n.z ?? 0) - radius));
					_box.expandByPoint(_b.set((n.x ?? 0) + radius, (n.y ?? 0) + radius, (n.z ?? 0) + radius));
				}
				if (validEdges.length > 0) _box.expandByScalar(MAX_GRAPH_EDGE_LANE_OFFSET + GRAPH_DIRECTION_MARKER_PADDING);
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
				controls.target.lerp(_a, graphCameraTargetDamping(delta, reducedMotion));
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
	const handleMove = useCallback((e) => {
		const runtime = layoutRuntimeRef.current;
		if (readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.layoutKey !== layoutKey || runtime.reducedMotion !== reducedMotion) return;
		if (!isKnowledgeGraphInstanceId(e.instanceId, visualNodes.length)) return;
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
	const handleOut = useCallback((e) => {
		const runtime = layoutRuntimeRef.current;
		const ready = !(readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.layoutKey !== layoutKey || runtime.reducedMotion !== reducedMotion);
		handleKnowledgeGraphPointerOut(ready, () => e.stopPropagation(), () => {
			if (hoverIdRef.current === null) return;
			hoverIdRef.current = null;
			onHoverRef.current(null);
		});
	}, [
		graphKey,
		layoutKey,
		reducedMotion
	]);
	const handleClick = useCallback((e) => {
		const runtime = layoutRuntimeRef.current;
		const ready = !(readyGraphKeyRef.current !== graphKey || geometryDirtyRef.current || runtime?.layoutKey !== layoutKey || runtime.reducedMotion !== reducedMotion);
		handleKnowledgeGraphNodeClick(ready, e.instanceId, visualNodes.length, e.delta, () => e.stopPropagation(), (instanceId) => {
			const id = visualNodes[instanceId].id;
			onSelect(toggledKnowledgeGraphSelection(selectedId, id));
		});
	}, [
		graphKey,
		layoutKey,
		reducedMotion,
		visualNodes,
		onSelect,
		selectedId
	]);
	return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("group", {
		ref: sceneGroupRef,
		visible: false,
		children: [
			nodes.length > 0 ? /* @__PURE__ */ jsxs("instancedMesh", {
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
				children: [/* @__PURE__ */ jsx("sphereGeometry", { args: [
					1,
					20,
					20
				] }), /* @__PURE__ */ jsx("meshBasicMaterial", { toneMapped: false })]
			}, `nodes-${nodes.length}`) : null,
			glyphNodeIndexes.sphere.length > 0 ? /* @__PURE__ */ jsxs("instancedMesh", {
				ref: sphereGlyphsRef,
				args: [
					void 0,
					void 0,
					glyphNodeIndexes.sphere.length
				],
				frustumCulled: false,
				raycast: disableKnowledgeGraphGlyphRaycast,
				children: [/* @__PURE__ */ jsx("sphereGeometry", { args: [
					KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.sphere_outline,
					12,
					12
				] }), /* @__PURE__ */ jsx("meshBasicMaterial", {
					color: "#ffffff",
					wireframe: true,
					toneMapped: false
				})]
			}) : null,
			glyphNodeIndexes.box.length > 0 ? /* @__PURE__ */ jsxs("instancedMesh", {
				ref: boxGlyphsRef,
				args: [
					void 0,
					void 0,
					glyphNodeIndexes.box.length
				],
				frustumCulled: false,
				raycast: disableKnowledgeGraphGlyphRaycast,
				children: [/* @__PURE__ */ jsx("boxGeometry", { args: [
					KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
					KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
					KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
					1,
					1,
					1
				] }), /* @__PURE__ */ jsx("meshBasicMaterial", {
					color: "#ffffff",
					wireframe: true,
					toneMapped: false
				})]
			}) : null,
			glyphNodeIndexes.diamond.length > 0 ? /* @__PURE__ */ jsxs("instancedMesh", {
				ref: diamondGlyphsRef,
				args: [
					void 0,
					void 0,
					glyphNodeIndexes.diamond.length
				],
				frustumCulled: false,
				raycast: disableKnowledgeGraphGlyphRaycast,
				children: [/* @__PURE__ */ jsx("octahedronGeometry", { args: [KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.diamond_shell, 0] }), /* @__PURE__ */ jsx("meshBasicMaterial", {
					color: "#ffffff",
					wireframe: true,
					toneMapped: false
				})]
			}) : null,
			/* @__PURE__ */ jsxs("lineSegments", {
				ref: linesRef,
				frustumCulled: false,
				children: [/* @__PURE__ */ jsxs("bufferGeometry", { children: [/* @__PURE__ */ jsx("bufferAttribute", {
					attach: "attributes-position",
					args: [linePos, 3]
				}), /* @__PURE__ */ jsx("bufferAttribute", {
					attach: "attributes-color",
					args: [lineCol, 3]
				})] }), /* @__PURE__ */ jsx("lineBasicMaterial", {
					vertexColors: true,
					toneMapped: false,
					depthWrite: false,
					blending: THREE.NormalBlending
				})]
			}, `lines-${validEdges.length}`),
			directedEdges.length > 0 ? /* @__PURE__ */ jsxs("instancedMesh", {
				ref: arrowsRef,
				args: [
					void 0,
					void 0,
					directedEdges.length
				],
				frustumCulled: false,
				children: [/* @__PURE__ */ jsx("coneGeometry", { args: [
					1,
					1,
					8
				] }), /* @__PURE__ */ jsx("meshBasicMaterial", { toneMapped: false })]
			}, `arrows-${directedEdges.length}`) : null,
			particleCount > 0 ? /* @__PURE__ */ jsxs("instancedMesh", {
				ref: particlesRef,
				args: [
					void 0,
					void 0,
					particleCount
				],
				frustumCulled: false,
				children: [/* @__PURE__ */ jsx("sphereGeometry", { args: [
					.6,
					6,
					6
				] }), /* @__PURE__ */ jsx("meshBasicMaterial", {
					color: resolvedParticleColor,
					toneMapped: false,
					transparent: true,
					opacity: .9,
					depthWrite: false,
					blending: themeMode === "light" ? THREE.NormalBlending : THREE.AdditiveBlending
				})]
			}, `p-${particleCount}`) : null,
			/* @__PURE__ */ jsx(FocusLabelSprite, {
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
export { CORPUS_GRAPH_RADIUS_MEANING, DEFAULT_A11Y_NODE_PAGE_SIZE, DEFAULT_GRAPH_NODE_RADIUS, GRAPH_EDGE_CURVE_SEGMENTS, GRAPH_EDGE_LANE_SPACING, GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS, GRAPH_LAYOUT_TICK_SECONDS, KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1, KnowledgeGraph3DScene, KnowledgeGraphA11yList, KnowledgeGraphAccessibleFigure, KnowledgeGraphLegend, KnowledgeGraphPresentationJsonError, KnowledgeGraphStaticRecordView, MAX_A11Y_NODE_PAGE_SIZE, MAX_GRAPH_EDGE_LANE_OFFSET, MAX_GRAPH_LAYOUT_TICKS_PER_FRAME, MAX_GRAPH_NODE_RADIUS, MAX_GRAPH_PARALLEL_EDGES, MAX_GRAPH_QUERY_LENGTH, MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES, MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES, MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES, MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES, PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1, PREPARED_KNOWLEDGE_GRAPH_VIEW_V1, advanceGraphLayoutClock, advanceGraphLayoutClockInto, assertKnowledgeGraphIdentity, assertKnowledgeGraphLiveForceBudget, assertKnowledgeGraphPresentationBudget, assertPreparedGenericKnowledgeGraphPresentation, assertPreparedKnowledgeGraphPresentation, assertPreparedKnowledgeGraphView, assertRenderableGraphEdges, assertUniqueGraphNodeIds, assignGraphEdgeLanes, buildAdjacency, corpusGraphInstanceIdentity, corpusGraphRadiusMeaning, defaultEdgeStyles, defaultNodeColors, filterGraphEdges, flowParticleCount, graphCameraTargetDamping, graphEdgeControlPointInto, graphEdgeCurvePointInto, graphEdgeMatchesQuery, graphEdgeTargetBoundaryInto, graphQueryMatchIds, graphSignature, isKnowledgeGraphLiveForceWithinBudget, isPreparedKnowledgeGraphPresentation, isPreparedKnowledgeGraphView, knowledgeGraphLiveForceAvailability, knowledgeGraphPresentationContainsNode, knowledgeGraphViewContainsNode, matchesGraphQuery, normalizeGraphNodeRadius, normalizeGraphQuery, parseKnowledgeGraphPresentationJson, prepareCorpusKnowledgeGraphFigure, prepareCorpusKnowledgeGraphFigureJson, prepareKnowledgeGraphPresentation, prepareKnowledgeGraphView, reducedMotionLayoutTickBudget, serializePreparedKnowledgeGraphPresentation, uniqueGraphTopologyLinks };
//# sourceMappingURL=knowledge-graph.js.map