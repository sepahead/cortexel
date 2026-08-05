import "./knowledgeGraphFigure-C-g1-MfO.cjs";
import { ReactNode } from "react";
import { KnowledgeGraphViewPolicyV1, PreparedKnowledgeGraphViewV1 } from "#cortexel-knowledge-graph-presentation-capability";
//#region react/KnowledgeGraphCorpusFrame.internal.d.ts
type KnowledgeGraphViewPolicyV1$1 = KnowledgeGraphViewPolicyV1;
type KnowledgeGraphCorpusFigureInputInternal = {
  /** Materialized VizSpec; duplicate JSON members are no longer observable. */
  readonly spec: unknown;
  readonly specJson?: never;
} | {
  /** Raw VizSpec JSON; duplicate members are rejected before materialization. */
  readonly spec?: never;
  readonly specJson: string;
};
//#endregion
export { KnowledgeGraphViewPolicyV1$1 as n, KnowledgeGraphCorpusFigureInputInternal as t };
