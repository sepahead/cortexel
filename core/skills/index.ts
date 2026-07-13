// Cortexel skill axis — the agent-facing API surface. Zero-dep beyond zod, so
// this is safe to import in a backend/Node context (it underpins the generated
// dist/skills.manifest.json the Python backend parity-checks against).
export * from './skillIds';
export * from './provenanceKeys';
export * from './params';
export * from './corpusKnowledgeGraph';
export * from './registry';
export * from './examples';
export * from './router';
export * from './validateSkillInvocation';
export * from './hostInvocation';
export * from './authoring';
export * from './verify';

// NEST device boundaries and deterministic analysis transforms are also
// available from the core entrypoint. Keep this compatibility re-export while
// `core/nest/index.ts` remains the source-level NEST module boundary.
export * from '../nest';
