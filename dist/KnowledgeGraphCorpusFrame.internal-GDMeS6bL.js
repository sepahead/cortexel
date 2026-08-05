import { d as safeErrorMessage, i as SAFE_DISPLAY_STRING_PATTERN, n as KNOWLEDGE_GRAPH_LIMITS, u as safeDiagnosticText } from "./knowledgeGraphLimits-Du09-etI.js";
import { l as knowledgeGraphContrastSafeColor, p as knowledgeGraphNodeGlyphDescription, u as knowledgeGraphEdgeStrokeDescription, v as graphEdgeIdentityKey } from "./knowledgeGraphVisualEncoding.internal-Bk0I-Mgt.js";
import { G as normalizeGraphQuery, H as knowledgeGraphLiveForceAvailability, W as normalizeGraphNodeRadius, j as filterGraphEdges, n as prepareCorpusKnowledgeGraphFigureJson, t as prepareCorpusKnowledgeGraphFigure, z as graphQueryMatchIds } from "./knowledgeGraphFigure-DBGBc6D1.js";
import { assertPreparedCorpusKnowledgeGraphPresentation, assertPreparedGenericKnowledgeGraphPresentation, assertPreparedKnowledgeGraphPresentation, assertPreparedKnowledgeGraphView, knowledgeGraphPresentationContainsNode, knowledgeGraphViewContainsNode, prepareKnowledgeGraphView } from "#cortexel-knowledge-graph-presentation-capability";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

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
const A11Y_INSTANCE_KEYS = /* @__PURE__ */ new WeakMap();
let nextA11yInstanceKey = 0n;
function a11yInstanceKey(token) {
	const existing = A11Y_INSTANCE_KEYS.get(token);
	if (existing !== void 0) return existing;
	const created = `cortexel-kg-a11y-${nextA11yInstanceKey}`;
	nextA11yInstanceKey += 1n;
	A11Y_INSTANCE_KEYS.set(token, created);
	return created;
}
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
	assertPreparedGenericKnowledgeGraphPresentation(props.presentation);
	return renderKnowledgeGraphA11yList(props);
}
/** Package-internal corpus companion used only in caption-bound compositions. */
function KnowledgeGraphCorpusA11yListInternal(props) {
	assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
	return renderKnowledgeGraphA11yList(props);
}
function renderKnowledgeGraphA11yList(props) {
	const { presentation, view, ...interactionProps } = props;
	assertPreparedKnowledgeGraphPresentation(presentation);
	if (view !== void 0) assertPreparedKnowledgeGraphView(view, presentation);
	assertKnowledgeGraphNodeReference(props.selectedId, "knowledge-graph selected id");
	const selectedId = view !== void 0 && props.selectedId !== null && !knowledgeGraphViewContainsNode(view, presentation, props.selectedId) ? null : props.selectedId;
	return /* @__PURE__ */ jsx(KnowledgeGraphA11yListInstance, {
		...interactionProps,
		selectedId,
		nodes: view?.nodes ?? presentation.nodes,
		edges: view?.edges ?? presentation.edges,
		corpusVisualMapping: presentation.profile === "corpus_entity",
		view
	}, a11yInstanceKey(view ?? presentation));
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
					"Query matches ",
					queryMatchCount,
					" of ",
					rows.length,
					" nodes; every node in the active view remains available below as context."
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
							normalizedQuery.length > 0 ? queryMatch ? currentQueryMatchNode?.id === node.id ? "Current navigated query match. " : "Query match. " : "Not a query match; retained as active-view context. " : "",
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
	assertPreparedGenericKnowledgeGraphPresentation(props.presentation);
	return renderKnowledgeGraphLegend(props);
}
/** Package-internal corpus legend used only in caption-bound compositions. */
function KnowledgeGraphCorpusLegendInternal(props) {
	assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
	return renderKnowledgeGraphLegend(props);
}
function renderKnowledgeGraphLegend({ presentation, view, className, label = "Knowledge graph legend", themeMode = "dark" }) {
	assertPreparedKnowledgeGraphPresentation(presentation);
	if (view !== void 0) assertPreparedKnowledgeGraphView(view, presentation);
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
					"; intended undimmed optional 3D scene color",
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
				"; intended undimmed optional 3D scene color",
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
					"In the optional 3D scene, the listed colors are the intended undimmed baseline and glyph shells use ",
					themeMode === "light" ? "#0f172a" : "#f8fafc",
					" before dimming. That scene's focus and query interactions dim peripheral node fills, glyph shells, relationships, arrows, and flow markers without changing their kind glyph, stroke pattern, direction, or DOM record. Layout positions and distances are schematic, not quantitative evidence. This legend does not imply that a 3D scene is mounted."
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
function staticRecordInstanceKey(token) {
	const existing = STATIC_RECORD_INSTANCE_KEYS.get(token);
	if (existing !== void 0) return existing;
	const created = `cortexel-kg-record-${nextStaticRecordInstanceKey}`;
	nextStaticRecordInstanceKey += 1n;
	STATIC_RECORD_INSTANCE_KEYS.set(token, created);
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
	assertPreparedGenericKnowledgeGraphPresentation(props.presentation);
	return renderKnowledgeGraphStaticRecordView(props);
}
/** Package-internal corpus records used only in caption-bound compositions. */
function KnowledgeGraphCorpusStaticRecordViewInternal(props) {
	assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
	return renderKnowledgeGraphStaticRecordView(props);
}
function renderKnowledgeGraphStaticRecordView(props) {
	assertPreparedKnowledgeGraphPresentation(props.presentation);
	if (props.view !== void 0) assertPreparedKnowledgeGraphView(props.view, props.presentation);
	return /* @__PURE__ */ jsx(KnowledgeGraphStaticRecordViewInstance, { ...props }, staticRecordInstanceKey(props.view ?? props.presentation));
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
					"Filtered active view: showing ",
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
//#region react/KnowledgeGraphCorpusFrame.internal.tsx
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
function containsNode(presentation, view, id) {
	return view === void 0 ? knowledgeGraphPresentationContainsNode(presentation, id) : knowledgeGraphViewContainsNode(view, presentation, id);
}
/**
* Package-private, React-only corpus frame shared by the DOM and 3D wrappers.
* It owns the strict input/caption/presentation chain and exposes no public
* presentation or rendering slot. Its dependency closure must remain free of
* Three, R3F, d3, ReactDOM, Node, browser, network, and filesystem modules.
*/
function KnowledgeGraphCorpusFrameInternal({ sourceInput, selectionController, hoverController, renderPrimaryRegion, viewPolicy, query = "", nodePageSize, recordNodePageSize, recordEdgePageSize, activePalette, className, label }) {
	const hasSpec = Object.hasOwn(sourceInput, "spec");
	const hasSpecJson = Object.hasOwn(sourceInput, "specJson");
	const spec = hasSpec ? sourceInput.spec : void 0;
	const specJson = hasSpecJson ? sourceInput.specJson : void 0;
	const preparedSource = useMemo(() => {
		if (hasSpec === hasSpecJson) return inputBoundaryFailure("provide exactly one own input property: spec or specJson");
		if (hasSpecJson) {
			if (typeof specJson !== "string") return inputBoundaryFailure("specJson must be a string");
			return prepareCorpusKnowledgeGraphFigureJson(specJson, { activePalette });
		}
		return prepareCorpusKnowledgeGraphFigure(spec, { activePalette });
	}, [
		activePalette,
		hasSpec,
		hasSpecJson,
		spec,
		specJson
	]);
	const preparedView = useMemo(() => {
		if (!preparedSource.ok || viewPolicy === void 0) return {
			ok: true,
			view: void 0
		};
		try {
			return {
				ok: true,
				view: prepareKnowledgeGraphView(preparedSource.presentation, viewPolicy)
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
	const activeToken = preparedSource.ok && preparedView.ok ? preparedView.view ?? preparedSource.presentation : void 0;
	const [internalSelectedId, setInternalSelectedId] = useState(null);
	const internalSelectionToken = useRef(void 0);
	const internallyControlled = selectionController === void 0;
	const internalTokenChanged = internallyControlled && internalSelectionToken.current !== void 0 && internalSelectionToken.current !== activeToken;
	const selectedId = internallyControlled ? internalTokenChanged ? null : internalSelectedId : selectionController.value;
	const onSelect = internallyControlled ? setInternalSelectedId : selectionController.onChange;
	useEffect(() => {
		if (!internallyControlled) {
			internalSelectionToken.current = void 0;
			return;
		}
		if (activeToken === void 0) {
			internalSelectionToken.current = void 0;
			setInternalSelectedId(null);
			return;
		}
		if (internalSelectionToken.current !== activeToken) {
			internalSelectionToken.current = activeToken;
			setInternalSelectedId(null);
		}
	}, [activeToken, internallyControlled]);
	const effectiveSelectedId = preparedSource.ok && preparedView.ok && selectedId !== null && !containsNode(preparedSource.presentation, preparedView.view, selectedId) ? null : selectedId;
	const externalSelectionInvalid = !internallyControlled && effectiveSelectedId !== selectedId;
	const selectionInvalidation = useRef(null);
	useEffect(() => {
		if (!externalSelectionInvalid || activeToken === void 0 || selectedId === null) {
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
		externalSelectionInvalid,
		onSelect,
		selectedId
	]);
	const hoverId = hoverController?.value ?? null;
	const effectiveHoverId = preparedSource.ok && preparedView.ok && hoverId !== null && !containsNode(preparedSource.presentation, preparedView.view, hoverId) ? null : hoverId;
	const hoverInvalid = effectiveHoverId !== hoverId;
	const hoverInvalidation = useRef(null);
	useEffect(() => {
		if (!hoverInvalid || activeToken === void 0 || hoverId === null || hoverController === void 0) {
			hoverInvalidation.current = null;
			return;
		}
		const previous = hoverInvalidation.current;
		if (previous?.token === activeToken && previous.id === hoverId) return;
		hoverInvalidation.current = {
			token: activeToken,
			id: hoverId
		};
		hoverController.onChange(null);
	}, [
		activeToken,
		hoverController,
		hoverId,
		hoverInvalid
	]);
	const captionId = `cortexel-kg-caption-${useId().replace(/:/gu, "")}`;
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
	if (hostPolicy === void 0 || activeToken === void 0) throw new Error("knowledge-graph frame invariant failed");
	const { caption, presentation } = preparedSource;
	const { view } = preparedView;
	const primaryRegion = renderPrimaryRegion?.({
		presentation,
		view,
		hostPolicy,
		activeToken,
		selectedId: effectiveSelectedId,
		onSelect,
		hoverId: effectiveHoverId,
		onHover: hoverController?.onChange
	});
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
					" of",
					" ",
					view.counts.sourceNodes,
					" nodes and ",
					view.counts.visibleEdges,
					" of",
					" ",
					view.counts.sourceEdges,
					" relationships. Relationships excluded by kind:",
					" ",
					view.counts.edgeKindFilteredEdges,
					"; excluded because an endpoint is hidden:",
					" ",
					view.counts.endpointPrunedEdges,
					". The caption and record browser remain bound to the full source."
				]
			}),
			primaryRegion,
			/* @__PURE__ */ jsx(KnowledgeGraphCorpusLegendInternal, {
				presentation,
				view,
				themeMode: hostPolicy.themeMode
			}),
			/* @__PURE__ */ jsx(KnowledgeGraphCorpusA11yListInternal, {
				presentation,
				view,
				selectedId: effectiveSelectedId,
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
export { KnowledgeGraphLegend as a, handleKnowledgeGraphNodeClick as c, synchronizeKnowledgeGraphControlsListener as d, toggledKnowledgeGraphSelection as f, KnowledgeGraphA11yList as i, handleKnowledgeGraphPointerOut as l, assertKnowledgeGraphNodeReference as m, KnowledgeGraphStaticRecordView as n, MAX_A11Y_NODE_PAGE_SIZE as o, assertKnowledgeGraphColor as p, DEFAULT_A11Y_NODE_PAGE_SIZE as r, beginKnowledgeGraphRuntimeTransition as s, KnowledgeGraphCorpusFrameInternal as t, isKnowledgeGraphInstanceId as u };
//# sourceMappingURL=KnowledgeGraphCorpusFrame.internal-GDMeS6bL.js.map