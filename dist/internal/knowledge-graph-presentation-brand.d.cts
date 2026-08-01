/** One package-private nominal type identity shared by ESM and CommonJS declarations. */
declare const PREPARED_KNOWLEDGE_GRAPH_NOMINAL_IDENTITY: unique symbol;
declare const PREPARED_KNOWLEDGE_GRAPH_VIEW_NOMINAL_IDENTITY: unique symbol;
interface PreparedKnowledgeGraphNominalBrand {
    readonly [PREPARED_KNOWLEDGE_GRAPH_NOMINAL_IDENTITY]: true;
}
interface PreparedKnowledgeGraphViewNominalBrand {
    readonly [PREPARED_KNOWLEDGE_GRAPH_VIEW_NOMINAL_IDENTITY]: true;
}

export type { PreparedKnowledgeGraphNominalBrand, PreparedKnowledgeGraphViewNominalBrand };
