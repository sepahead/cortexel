import { t as KnowledgeGraphCorpusFrameInternal } from "../KnowledgeGraphCorpusFrame.internal-GDMeS6bL.js";
import { jsx } from "react/jsx-runtime";

//#region react/KnowledgeGraphDomFigure.tsx
function renderDomOnlyStatus() {
	return /* @__PURE__ */ jsx("p", {
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
	return /* @__PURE__ */ jsx(KnowledgeGraphCorpusFrameInternal, {
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
export { KnowledgeGraphDomFigure };
//# sourceMappingURL=knowledge-graph-dom.js.map