// Cortexel skill axis — the agent-facing API surface. Zero-dep beyond zod, so
// this is safe to import in a backend/Node context (it underpins the generated
// dist/skills.manifest.json the Python backend parity-checks against).
export * from './skillIds';
export * from './provenanceKeys';
export * from './params';
export * from './registry';
export * from './router';
export * from './validateSkillInvocation';

// NEST device-dict shapes + host-agnostic adapters (dict → SceneData).
export * from '../nest/shapes';
export * from '../nest/adapters';
