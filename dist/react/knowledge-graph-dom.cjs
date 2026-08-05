Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
const require_KnowledgeGraphCorpusFrame_internal = require('../KnowledgeGraphCorpusFrame.internal-B_E_kBQQ.cjs');
let react_jsx_runtime = require("react/jsx-runtime");

//#region react/KnowledgeGraphDomFigure.tsx
function renderDomOnlyStatus() {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
		role: "status",
		children: "DOM-only knowledge graph inspection: this entry mounts no Canvas, WebGL, or force layout. Its paginated controls expose every accepted source record after hydration. Without client-side JavaScript, only the bounded initial node and relationship pages are present."
	});
}
/**
* Low-friction, React-only corpus graph inspection. The strict legacy VizSpec gate
* derives the visible caption and the private presentation capability; callers
* cannot replace either or inject a renderer. Selection is owned by this component
* and resets when the exact source/view capability changes.
*
* This experimental DOM composition is not a FigureRequest artifact, evidence
* authenticator, deterministic HTML receipt, or WCAG/assistive-technology claim.
*/
function KnowledgeGraphDomFigure(props) {
	const { viewPolicy, query, nodePageSize, recordNodePageSize, recordEdgePageSize, activePalette, className } = props;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_KnowledgeGraphCorpusFrame_internal.KnowledgeGraphCorpusFrameInternal, {
		sourceInput: props,
		viewPolicy,
		query,
		nodePageSize,
		recordNodePageSize,
		recordEdgePageSize,
		activePalette,
		className,
		label: "Knowledge graph records",
		renderPrimaryRegion: renderDomOnlyStatus
	});
}

//#endregion
exports.KnowledgeGraphDomFigure = KnowledgeGraphDomFigure;
//# sourceMappingURL=knowledge-graph-dom.cjs.map