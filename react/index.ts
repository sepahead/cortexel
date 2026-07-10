// Cortexel react — r3f/three-dependent rendering layer.
// Requires the `react`, `react-dom`, `three` and `@react-three/fiber` peers.
//
// NOTE: KnowledgeGraph3DScene is intentionally NOT re-exported here. It is the
// only scene that needs the `d3-force-3d` peer, so it lives at its own subpath
// (`cortexel/react/knowledge-graph`). That keeps THIS entry d3-free, so the
// "optional d3-force-3d peer" is honest — a consumer who never renders a
// knowledge graph never has to install it.
export * from './usePopulationExpand';
export * from './ExpandablePopulation';
export * from './ExpandableNeurons';
export * from './SelectionA11yControls';
export * from './neuronShaders';
export * from './VizSpecRenderer';
