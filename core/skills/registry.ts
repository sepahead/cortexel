// NEST_SKILL_REGISTRY — the canonical skill axis. Each agent-invocable skill
// declares the NEST device family it consumes, the Cortexel scene it renders to
// (or null when no honest render target exists yet), the params it requires, the
// structured provenance keys its honesty contract demands, renderer routes, and
// a worked example. This is the single source of truth the backend Pydantic
// registry and the frontend mirror DERIVE from (via dist/skills.manifest.json).
//
// Honesty over coverage: spatial_2d, correlogram, stimulus_response,
// compartmental_dynamics and animation_replay have NO faithful Cortexel scene,
// so scene=null and routeToScene refuses them ("no_cortexel_scene") rather than
// mis-routing to an approximately-similar scene. astrocyte_dynamics renders
// through the generic analog-trace scene but is flagged weak (derived, not 1:1).

import { z } from 'zod';
import type { SceneName } from '../designLaws';
import {
  isSkillId,
  type NestSkillId,
  type NestDeviceFamily,
  type RendererRoute,
} from './skillIds';
import type {
  ProvenanceKey,
  ProvenanceParamConstraint,
} from './provenanceKeys';
import {
  AnimationReplayParamsSchema,
  AstrocyteParamsSchema,
  CompartmentalParamsSchema,
  CorrelogramParamsSchema,
  KnowledgeGraph3DParamsSchema,
  NetworkParamsSchema,
  PhasePlaneParamsSchema,
  PlasticityParamsSchema,
  RateResponseParamsSchema,
  Spatial2DParamsSchema,
  Spatial3DParamsSchema,
  SpikeRasterParamsSchema,
  StimulusResponseParamsSchema,
  VoltageTraceParamsSchema,
} from './params';
import { getExamplePayload, getHostRendererExamplePayload } from './examples';

export const CORTEXEL_SKILL_VERSION = '1.2.0';

export const STRICT_INVOCATION_POLICY = Object.freeze({
  version: '1',
  externalSelection: 'validateSkillInvocation(id,payload): explicit id selects; payload.skill is optional but must match when present' as const,
  selfDescribingSelection: 'validateSpec(payload): payload.skill is required and selects the contract' as const,
  hostSelection: 'host envelopes require payload.skill; explicit id and payload.skill must match' as const,
  unknownSkillIds: 'reject' as const,
  cortexelEnvelope: 'allowed iff contract.scene is non-null; payload.scene must equal contract.scene' as const,
  hostEnvelope: 'allowed iff contract.scene is null; scene is forbidden' as const,
  rendererRoute: 'when selected, must occur in contract.rendererRoutes' as const,
  params: 'validate paramsJsonSchema then every paramConstraint' as const,
  provenance: 'apply strictProvenancePolicy and every provenanceParamConstraint' as const,
});

export interface SkillExample {
  nestExample: string;
  sourceUrl: string;
  dataShape: string;
  output: string;
  note: string;
}

/** Cross-field rules JSON Schema cannot express (such as two arrays having the
 *  same length). Non-TypeScript hosts apply these after paramsJsonSchema. */
export interface ParamValidationConstraint {
  kind:
    | 'equal_length'
    | 'each_length_matches'
    | 'monotonic_non_decreasing'
    | 'non_negative'
    | 'property_count'
    | 'unique_field'
    | 'unique_tuple'
    | 'references_exist'
    | 'no_self_loops'
    | 'same_keys'
    | 'cartesian_product_length'
    | 'permutation_of_keys'
    | 'endpoint_kinds'
    | 'mapped_value'
    | 'conditional_numeric_domain'
    | 'acyclic';
  paths: readonly string[];
  field?: string;
  min?: number;
  max?: number;
  symmetricKinds?: readonly string[];
  allowedEndpointKinds?: Readonly<Record<string, readonly [string, string]>>;
  allowedValues?: Readonly<Record<string, string>>;
  numericDomains?: Readonly<Record<
    string,
    Readonly<{ min: number; max?: number; integer?: boolean }>
  >>;
  description: string;
}

export interface SkillContract {
  id: NestSkillId;
  version: string;
  title: string;
  description: string;
  deviceFamily: NestDeviceFamily;
  /** Cortexel scene this skill renders to, or null when none is honest yet. */
  scene: SceneName | null;
  /** When true, the render carries a mandatory derived-view disclosure. NOTE:
   *  `weak` does NOT always mean "approximate reuse of another scene" — see
   *  `weakDisclosure`. Some skills are weak because the DATA semantics are
   *  advisory (e.g. corpus identity edges), not because the scene is borrowed. */
  weak?: boolean;
  /** The exact honesty sentence shown when `weak` is true. Declared per-skill
   *  because the REASON differs: astrocyte reuses the analog-trace scene (Ca/IP3
   *  ≠ voltage), while the knowledge graph renders in its OWN native scene but its
   *  identity edges are advisory. A single hard-coded "reuses the scene" template
   *  would state a falsehood for the latter. When omitted (but weak), a generic
   *  scene-reuse sentence is used. */
  weakDisclosure?: string;
  /** Top-level param keys an invocation must supply (subset of paramsSchema). */
  requiredInputKeys: readonly string[];
  /** Per-skill zod schema for `params` (including scene-less host routes). */
  paramsSchema?: z.ZodType;
  /** Portable cross-field rules that complement paramsJsonSchema. */
  paramConstraints?: readonly ParamValidationConstraint[];
  /** Provenance keys the agent must declare for this skill to render. */
  requiredProvenanceKeys: readonly ProvenanceKey[];
  /** Deterministic params↔provenance consistency checks. */
  provenanceParamConstraints?: readonly ProvenanceParamConstraint[];
  rendererRoutes: readonly RendererRoute[];
  examples: readonly SkillExample[];
}

/** Versioned evaluator contract for ParamValidationConstraint paths. This is a
 *  deliberately tiny JSONPath subset so non-TS hosts do not have to guess how
 *  `[*]`, `*`, or `?` are interpreted. */
export const PARAM_CONSTRAINT_LANGUAGE = Object.freeze({
  version: '2',
  pathSyntax: 'dot-separated object keys',
  arrayWildcard: '[*]',
  objectValueWildcard: '*',
  optionalSuffix: '?',
  evaluationOrder: Object.freeze([
    'normalize fields carrying x-cortexel-normalize',
    'validate paramsJsonSchema',
    'evaluate paramConstraints in listed order',
  ]),
  kinds: Object.freeze([
    'equal_length',
    'each_length_matches',
    'monotonic_non_decreasing',
    'non_negative',
    'property_count',
    'unique_field',
    'unique_tuple',
    'references_exist',
    'no_self_loops',
    'same_keys',
    'cartesian_product_length',
    'permutation_of_keys',
    'endpoint_kinds',
    'mapped_value',
    'conditional_numeric_domain',
    'acyclic',
  ] as const),
  semantics: Object.freeze({
    equal_length: Object.freeze({
      pathRoles: 'all paths resolve to arrays',
      rule: 'all present arrays have identical length',
      optionalAbsent: 'skip a path ending in ?',
    }),
    each_length_matches: Object.freeze({
      pathRoles: 'first path resolves zero or more arrays; last path is the reference array',
      rule: 'every first-path array length equals the reference-array length',
    }),
    monotonic_non_decreasing: Object.freeze({
      pathRoles: 'each path resolves an ordered numeric sequence',
      rule: 'for every adjacent pair previous <= next',
    }),
    non_negative: Object.freeze({
      pathRoles: 'each path resolves numeric values',
      rule: 'every resolved number is >= 0',
    }),
    property_count: Object.freeze({
      pathRoles: 'each path resolves objects',
      rule: 'own enumerable property count is within optional min/max inclusive',
    }),
    unique_field: Object.freeze({
      pathRoles: 'the first path resolves an array of objects; field names the key',
      rule: 'field values are unique under JSON scalar equality',
    }),
    unique_tuple: Object.freeze({
      pathRoles: 'paths resolve equal-length scalar sequences zipped by index',
      rule: 'zipped JSON tuples are unique; when the final kind value is in symmetricKinds, canonicalize the first two tuple values lexicographically',
    }),
    references_exist: Object.freeze({
      pathRoles: 'all paths except the last resolve references; the last resolves the allowed-id set',
      rule: 'every non-null reference occurs in the allowed-id set',
    }),
    no_self_loops: Object.freeze({
      pathRoles: 'first and second paths resolve equal-length source and target sequences',
      rule: 'source[index] !== target[index] for every index',
    }),
    same_keys: Object.freeze({
      pathRoles: 'paths resolve objects',
      rule: 'all objects have exactly the same own enumerable string-key set',
    }),
    cartesian_product_length: Object.freeze({
      pathRoles: 'first path resolves axis arrays; second path resolves output arrays',
      rule: 'every output-array length equals the product of all axis-array lengths',
    }),
    permutation_of_keys: Object.freeze({
      pathRoles: 'first path resolves a scalar sequence; second path resolves an object',
      rule: 'the sequence contains every object key exactly once',
    }),
    endpoint_kinds: Object.freeze({
      pathRoles: 'first path resolves edges with source/target/kind; second resolves nodes with id/kind',
      rule: 'each edge endpoint node kind equals allowedEndpointKinds[edge.kind]',
    }),
    mapped_value: Object.freeze({
      pathRoles: 'first path resolves a discriminator scalar; second path resolves its dependent scalar',
      rule: 'the second value equals allowedValues[first value]',
    }),
    conditional_numeric_domain: Object.freeze({
      pathRoles: 'first path resolves a discriminator scalar; second path resolves numeric values',
      rule: 'every numeric value satisfies numericDomains[discriminator] inclusive min/max and optional integer requirement',
    }),
    acyclic: Object.freeze({
      pathRoles: 'first path resolves node ids; second resolves each node parent id or null',
      rule: 'following parent links from any id never revisits an id',
    }),
  }),
});

export const NEST_SKILL_REGISTRY: Record<NestSkillId, SkillContract> = {
  'nest.voltage_trace': {
    id: 'nest.voltage_trace',
    version: '1.2.0',
    title: 'NEST voltage trace renderer',
    description:
      'Render labeled multimeter/voltmeter series for one recorded variable and unit.',
    deviceFamily: 'multimeter',
    scene: 'voltage-trace',
    requiredInputKeys: ['times_ms', 'series', 'series_labels', 'units'],
    paramsSchema: VoltageTraceParamsSchema,
    requiredProvenanceKeys: [
      'device_id',
      'recorded_variable',
      'units',
      'sampling_interval',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'units',
        paramKey: 'units',
        description: 'Declared units must match the rendered trace-axis units.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [
      {
        nestExample: 'One neuron example / multimeter recording',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/one_neuron.html',
        dataShape: 'times_ms + same-unit series split and labeled by sender',
        output: 'Selectable trace, spike markers, JSON + SVG export',
        note: 'Use one invocation per variable/unit; never mix mV, pA and nS on one axis.',
      },
    ],
  },
  'nest.spike_raster': {
    id: 'nest.spike_raster',
    version: '1.2.0',
    title: 'NEST spike raster renderer',
    description:
      'Render spike_recorder events as rasters, spike trains and population plots.',
    deviceFamily: 'spike_recorder',
    scene: 'spike-raster',
    requiredInputKeys: ['times_ms', 'senders'],
    paramsSchema: SpikeRasterParamsSchema,
    requiredProvenanceKeys: [
      'recorder_id',
      'sender_ids',
      'population_labels',
      'time_units',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_literal',
        provenanceKey: 'time_units',
        value: 'ms',
        description: 'The times_ms axis is expressed in milliseconds.',
      },
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Random balanced Brunel network',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/brunel_alpha_nest.html',
        dataShape: 'spike_recorder events: times_ms, senders, population labels',
        output: 'Sender-time raster, population rate strip, selectable windows',
        note: 'Use exact spike times first; aggregate only when too dense to read.',
      },
    ],
  },
  'nest.rate_response': {
    id: 'nest.rate_response',
    version: '1.2.0',
    title: 'NEST rate / IF response renderer',
    description:
      'Render firing-rate / IF curves and population rates derived from spike counts.',
    deviceFamily: 'spike_recorder',
    scene: 'fi-curve',
    requiredInputKeys: ['stimulus_amplitudes', 'rates_hz', 'stimulus_units'],
    paramsSchema: RateResponseParamsSchema,
    requiredProvenanceKeys: ['stim_units', 'bin_ms', 'rate_normalization'],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'stim_units',
        paramKey: 'stimulus_units',
        description: 'Declared stimulus units must match params.stimulus_units.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib', 'd3'],
    examples: [
      {
        nestExample: 'IF curve example',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/if_curve.html',
        dataShape: 'stimulus amplitudes, rates_hz, spike counts',
        output: 'IF curve, population-rate trace, decision crossing markers',
        note: 'Always show bin width / counting window so rates stay auditable.',
      },
    ],
  },
  'nest.connectivity_matrix': {
    id: 'nest.connectivity_matrix',
    version: '1.2.0',
    title: 'NEST connectivity matrix renderer',
    description:
      'Render SynapseCollection connectivity, weights and population blocks.',
    deviceFamily: 'get_connections',
    scene: 'network-topology',
    // Connectivity evidence contains endpoints/weights, not measured spatial
    // coordinates. Any node placement in the topology scene is schematic.
    weak: true,
    weakDisclosure:
      'Schematic topology layout — node positions and distances are derived for readability; only the declared edges and weights are evidence.',
    requiredInputKeys: ['sources', 'targets'],
    paramsSchema: NetworkParamsSchema,
    requiredProvenanceKeys: [
      'source_ids',
      'target_ids',
      'synapse_model',
      'weight_units',
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Plot weight matrices example / SynapseCollection',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/plot_weight_matrices.html',
        dataShape: 'sources, targets, weights, delays, source/target populations',
        output: 'Topology node-edge view, selected block stats, weight histogram',
        note: 'Keep absent connections distinct from zero-weight connections; topology positions/distances are schematic.',
      },
    ],
  },
  'nest.spatial_2d': {
    id: 'nest.spatial_2d',
    version: '1.2.0',
    title: 'NEST 2D spatial renderer',
    description: 'Render 2D layer positions, masks, kernels and sampled projections.',
    deviceFamily: 'get_position',
    scene: null, // no honest 2D-spatial scene yet (would violate sphere/voxel law)
    requiredInputKeys: ['positions', 'coordinate_units'],
    paramsSchema: Spatial2DParamsSchema,
    requiredProvenanceKeys: ['extent', 'spatial_units', 'mask', 'kernel'],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'spatial_units',
        paramKey: 'coordinate_units',
        description: 'Declared spatial units must match the coordinate axis units.',
      },
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Circular mask, Gaussian kernel, grid/free spatial examples',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/connex.html',
        dataShape: 'node x/y positions, masks, kernels, sampled edges',
        output: 'No Cortexel scene yet — route to a 2D d3 map on the host.',
        note: 'scene:null — render via host d3, not a Cortexel 3D scene.',
      },
    ],
  },
  'nest.spatial_3d': {
    id: 'nest.spatial_3d',
    version: '1.2.0',
    title: 'NEST 3D spatial renderer',
    description: 'Render 3D population/node positions for spatial inspection.',
    deviceFamily: 'get_position',
    scene: 'network-topology',
    requiredInputKeys: ['objects', 'coordinate_units'],
    paramsSchema: Spatial3DParamsSchema,
    requiredProvenanceKeys: ['extent', 'spatial_units', 'projection_sample_policy'],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'spatial_units',
        paramKey: 'coordinate_units',
        description: 'Declared spatial units must match the coordinate axis units.',
      },
    ],
    rendererRoutes: [
      'media.webgl_scene',
      'media.react_fiber_scene',
      'three',
      'fiber',
    ],
    examples: [
      {
        nestExample: '3D spatial network with exponential/Gaussian probabilities',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/test_3d.html',
        dataShape: 'node x/y/z positions, extent, sampled edges',
        output: 'Selectable 3D scene plus SVG projection fallback',
        note: 'Use 3D as inspection aid; do not imply biological geometry.',
      },
    ],
  },
  'nest.plasticity_dynamics': {
    id: 'nest.plasticity_dynamics',
    version: '1.2.0',
    title: 'NEST plasticity dynamics renderer',
    description: 'Render STDP windows, weight adaptation and short-term dynamics.',
    deviceFamily: 'weight_recorder',
    scene: 'stdp',
    requiredInputKeys: ['times_ms', 'weights', 'weight_units'],
    paramsSchema: PlasticityParamsSchema,
    requiredProvenanceKeys: ['synapse_model', 'weight_units'],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'weight_units',
        paramKey: 'weight_units',
        description: 'Declared weight units must match the rendered weight axis.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib'],
    examples: [
      {
        nestExample: 'Urbanczik-Senn / Clopath / Tsodyks short-term plasticity',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/urbanczik_synapse_example.html',
        dataShape: 'weights, u/x resources, pre/post spikes, delta_t, delta_weight',
        output: 'Weight trace, STDP window, spike protocol rugs',
        note: 'Preserve pre/post sign convention; label all plasticity parameters.',
      },
    ],
  },
  'nest.phase_plane': {
    id: 'nest.phase_plane',
    version: '1.2.0',
    title: 'NEST phase-plane renderer',
    description: 'Render phase planes, vector fields, nullclines and trajectories.',
    deviceFamily: 'computed',
    scene: 'phase-plane',
    requiredInputKeys: [
      'grid',
      'derivatives',
      'axis_units',
      'derivative_units',
      'axis_order',
      'flattening',
    ],
    paramsSchema: PhasePlaneParamsSchema,
    requiredProvenanceKeys: [
      'state_variables',
      'derivation_method',
      'model_context',
      'fixed_parameters',
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Numerical phase-plane analysis of the Hodgkin-Huxley neuron',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/hh_phaseplane.html',
        dataShape: 'state variable grid, derivatives, nullcline points, trajectory',
        output: 'Vector field, nullclines, trajectory, equilibrium annotations',
        note: 'Distinguish clamped state variables from simulated dynamic ones.',
      },
    ],
  },
  'nest.correlogram': {
    id: 'nest.correlogram',
    version: '1.2.0',
    title: 'NEST correlogram / synchrony renderer',
    description: 'Render auto/cross-correlation functions for spike trains.',
    deviceFamily: 'spike_recorder',
    scene: null, // ISI-histogram scene exists but the math differs — no honest reuse
    requiredInputKeys: [
      'lags_ms',
      'correlation',
      'normalization',
      'correlation_units',
    ],
    paramsSchema: CorrelogramParamsSchema,
    requiredProvenanceKeys: [
      'bin_ms',
      'pair_labels',
      'correlation_normalization',
      'correlation_units',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'correlation_normalization',
        paramKey: 'normalization',
        description: 'Declared normalization must match the correlogram value semantics.',
      },
      {
        kind: 'equals_param',
        provenanceKey: 'correlation_units',
        paramKey: 'correlation_units',
        description: 'Declared value units must match the correlogram y axis.',
      },
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Auto- and crosscorrelation functions for spike trains',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/cross_check_mip_corrdet.html',
        dataShape: 'lags_ms, correlation values, pair labels, bin width',
        output: 'No Cortexel scene (distinct from ISI) — route to host d3.',
        note: 'scene:null — correlogram math differs from the ISI histogram scene.',
      },
    ],
  },
  'nest.stimulus_response': {
    id: 'nest.stimulus_response',
    version: '1.2.0',
    title: 'NEST stimulus-response protocol renderer',
    description:
      'Render aligned stimulus waveforms, responses, spikes and protocol epochs.',
    deviceFamily: 'multimeter',
    scene: null, // composite multi-panel protocol; no single Cortexel scene
    requiredInputKeys: ['times_ms', 'stimulus', 'response'],
    paramsSchema: StimulusResponseParamsSchema,
    requiredProvenanceKeys: ['stim_units', 'units', 'time_units'],
    provenanceParamConstraints: [
      {
        kind: 'equals_literal',
        provenanceKey: 'time_units',
        value: 'ms',
        description: 'The times_ms axis is expressed in milliseconds.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib'],
    examples: [
      {
        nestExample: 'Sinusoidal generator / pulse packet / repeated stimulation',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/pulsepacket.html',
        dataShape: 'stimulus waveform, analog response, spike events, epochs',
        output: 'Composite protocol panels — host-composed, no single scene.',
        note: 'scene:null — multi-panel protocol composed by the host.',
      },
    ],
  },
  'nest.astrocyte_dynamics': {
    id: 'nest.astrocyte_dynamics',
    version: '1.2.0',
    title: 'NEST astrocyte Ca²⁺/IP₃ dynamics renderer',
    description: 'Render tripartite-synapse calcium/IP3 state-variable traces.',
    deviceFamily: 'multimeter',
    scene: 'voltage-trace',
    weak: true, // analog-trace reuse: Ca/IP3 are not membrane voltage
    weakDisclosure:
      "Derived view — Ca²⁺/IP₃ shown through the analog-trace scene; these are glial signals, not membrane voltage.",
    requiredInputKeys: ['times_ms', 'ca_trace', 'units'],
    paramsSchema: AstrocyteParamsSchema,
    requiredProvenanceKeys: [
      'recorded_variable',
      'units',
      'time_units',
      'sampling_interval',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_param',
        provenanceKey: 'units',
        paramKey: 'units',
        description: 'Declared units must match the rendered glial trace units.',
      },
      {
        kind: 'equals_literal',
        provenanceKey: 'time_units',
        value: 'ms',
        description: 'The times_ms axis is expressed in milliseconds.',
      },
    ],
    rendererRoutes: ['media.trace_figure', 'matplotlib'],
    examples: [
      {
        nestExample: 'Single astrocyte / tripartite interaction examples',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/astrocytes/astrocyte_single.html',
        dataShape: 'Ca/IP3/state variables, linked neuron events',
        output: 'Calcium/IP3 traces via the analog-trace scene (flagged derived)',
        note: 'weak:true — keep glial and neuronal units explicitly separate.',
      },
    ],
  },
  'nest.compartmental_dynamics': {
    id: 'nest.compartmental_dynamics',
    version: '1.2.0',
    title: 'NEST compartmental morphology + dynamics renderer',
    description:
      'Render multi-compartment morphologies, receptor ports and soma/dendrite traces.',
    deviceFamily: 'multimeter',
    scene: null, // morphology geometry has no honest Cortexel scene (no invented geometry)
    requiredInputKeys: ['times_ms', 'compartments'],
    paramsSchema: CompartmentalParamsSchema,
    requiredProvenanceKeys: [
      'morphology_disclaimer',
      'recorded_variable',
      'units',
      'time_units',
      'sampling_interval',
    ],
    provenanceParamConstraints: [
      {
        kind: 'equals_literal',
        provenanceKey: 'time_units',
        value: 'ms',
        description: 'The times_ms axis is expressed in milliseconds.',
      },
    ],
    rendererRoutes: ['media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Receptors/current and two-compartment neuron examples',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/compartmental_model/receptors_and_current.html',
        dataShape: 'compartments, receptor ports, soma/dendrite traces',
        output: 'No Cortexel scene — host d3 morphology tree with linked traces.',
        note: 'scene:null — do not invent morphology geometry from labels.',
      },
    ],
  },
  'nest.animation_replay': {
    id: 'nest.animation_replay',
    version: '1.2.0',
    title: 'NEST state replay / animation storyboard renderer',
    description: 'Render time-evolution storyboards and inspectable state replays.',
    deviceFamily: 'computed',
    scene: null, // offline manim storyboard, not a live r3f scene — do not mis-route
    requiredInputKeys: ['frames'],
    paramsSchema: AnimationReplayParamsSchema,
    requiredProvenanceKeys: ['frame_rate'],
    rendererRoutes: ['media.manim_storyboard', 'manim'],
    examples: [
      {
        nestExample: 'Sudoku progress GIF / Pong replay',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/sudoku/plot_progress.html',
        dataShape: 'frames, entities, metrics, frame rate, annotations',
        output: 'Manim storyboard / source — no live Cortexel scene.',
        note: 'scene:null — offline storyboard, not a real-time render target.',
      },
    ],
  },
  'corpus.knowledge_graph': {
    id: 'corpus.knowledge_graph',
    version: '1.2.0',
    title: 'Corpus knowledge-graph 3D renderer',
    description:
      'Render a cross-paper corpus knowledge graph in 3D: paper/model/family nodes with citation, instantiation and family edges, plus advisory model-identity (same_as/variant_of) edges.',
    deviceFamily: 'corpus',
    scene: 'knowledge-graph-3d',
    // weak: identity edges are advisory structural similarity, NOT certified
    // sameness, and force-layout geometry is algorithmic rather than evidence.
    // This is NOT scene reuse — knowledge-graph-3d is the native scene — so the
    // disclosure is about DATA semantics, not fidelity of the renderer.
    weak: true,
    weakDisclosure:
      'Advisory graph — same_as/variant_of edges are structural similarity, not certified sameness; force-layout positions and distances are schematic, not quantitative evidence.',
    requiredInputKeys: ['nodes', 'edges'],
    paramsSchema: KnowledgeGraph3DParamsSchema,
    requiredProvenanceKeys: [
      'graph_source',
      'node_kinds',
      'edge_kinds',
      'identity_advisory',
    ],
    rendererRoutes: ['media.model_graph', 'fiber'],
    examples: [
      {
        nestExample: 'Cross-paper corpus knowledge graph (papers + models + families)',
        sourceUrl:
          'https://github.com/sepahead/Paper2Brain#knowledge-graph',
        dataShape: 'nodes (paper/model/family), edges (cites/same_as/variant_of/instantiates/belongs_to_family)',
        output: '3D force-directed graph with citation-flow particles and focus labels',
        note: 'weak:true — model-identity edges are advisory and force-layout geometry is non-evidentiary.',
      },
    ],
  },
};

export const PARAM_VALIDATION_CONSTRAINTS: Readonly<
  Partial<Record<NestSkillId, readonly ParamValidationConstraint[]>>
> = {
  'nest.voltage_trace': [
    {
      kind: 'equal_length',
      paths: ['series', 'series_labels'],
      description: 'Every trace series must have one non-empty label.',
    },
    {
      kind: 'each_length_matches',
      paths: ['series[*]', 'times_ms'],
      description: 'Every trace series must contain one value per times_ms sample.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['times_ms'],
      description: 'Trace timestamps must be monotonically non-decreasing.',
    },
  ],
  'nest.spike_raster': [
    {
      kind: 'equal_length',
      paths: ['times_ms', 'senders'],
      description: 'Every spike timestamp must have one sender id.',
    },
  ],
  'nest.rate_response': [
    {
      kind: 'equal_length',
      paths: ['stimulus_amplitudes', 'rates_hz'],
      description: 'Every stimulus amplitude must have one firing-rate value.',
    },
    {
      kind: 'non_negative',
      paths: ['rates_hz[*]'],
      description: 'Firing rates cannot be negative.',
    },
  ],
  'nest.connectivity_matrix': [
    {
      kind: 'equal_length',
      paths: ['sources', 'targets', 'weights?'],
      description: 'Connection endpoints and optional weights are parallel arrays.',
    },
  ],
  'nest.plasticity_dynamics': [
    {
      kind: 'equal_length',
      paths: ['times_ms', 'weights'],
      description: 'Every plasticity timestamp must have one weight value.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['times_ms'],
      description: 'Plasticity timestamps must be monotonically non-decreasing.',
    },
  ],
  'nest.phase_plane': [
    {
      kind: 'property_count',
      paths: ['grid'],
      min: 2,
      max: 2,
      description: 'A phase plane has exactly two state-variable axes.',
    },
    {
      kind: 'same_keys',
      paths: ['grid', 'derivatives'],
      description: 'Derivative fields must use the same state-variable names as the grid.',
    },
    {
      kind: 'same_keys',
      paths: ['grid', 'axis_units'],
      description: 'Every phase-plane axis must declare its coordinate units.',
    },
    {
      kind: 'same_keys',
      paths: ['grid', 'derivative_units'],
      description: 'Every phase-plane derivative field must declare its units.',
    },
    {
      kind: 'cartesian_product_length',
      paths: ['grid.*', 'derivatives.*'],
      description: 'Each derivative field has one value per Cartesian grid point.',
    },
    {
      kind: 'permutation_of_keys',
      paths: ['axis_order', 'grid'],
      description: 'axis_order must contain every grid key exactly once, in flattening order.',
    },
  ],
  'nest.correlogram': [
    {
      kind: 'equal_length',
      paths: ['lags_ms', 'correlation'],
      description: 'Every lag must have one correlation value.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['lags_ms'],
      description: 'Correlogram lags must be monotonically non-decreasing.',
    },
    {
      kind: 'mapped_value',
      paths: ['normalization', 'correlation_units'],
      allowedValues: {
        pearson_coefficient: '1',
        raw_pair_count: 'count',
        count_per_bin: 'count/bin',
        rate_hz: 'Hz',
      },
      description: 'Each correlogram normalization has one unambiguous y-axis unit.',
    },
    {
      kind: 'conditional_numeric_domain',
      paths: ['normalization', 'correlation[*]'],
      numericDomains: {
        pearson_coefficient: { min: -1, max: 1 },
        raw_pair_count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        count_per_bin: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        rate_hz: { min: 0 },
      },
      description: 'Correlogram values must obey the numeric domain implied by their normalization.',
    },
  ],
  'nest.stimulus_response': [
    {
      kind: 'equal_length',
      paths: ['times_ms', 'stimulus', 'response'],
      description: 'Time, stimulus, and response samples must align one-to-one.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['times_ms'],
      description: 'Stimulus-response timestamps must be monotonically non-decreasing.',
    },
  ],
  'nest.astrocyte_dynamics': [
    {
      kind: 'equal_length',
      paths: ['times_ms', 'ca_trace'],
      description: 'Every glial sample must have one timestamp.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['times_ms'],
      description: 'Glial timestamps must be monotonically non-decreasing.',
    },
    {
      kind: 'non_negative',
      paths: ['ca_trace[*]'],
      description: 'The declared Ca²⁺ concentration trace cannot be negative.',
    },
  ],
  'nest.compartmental_dynamics': [
    {
      kind: 'each_length_matches',
      paths: ['compartments[*].values', 'times_ms'],
      description: 'Every compartment trace has one value per timestamp.',
    },
    {
      kind: 'unique_field',
      paths: ['compartments'],
      field: 'id',
      description: 'Compartment ids must be unique.',
    },
    {
      kind: 'references_exist',
      paths: ['compartments[*].parent_id', 'compartments[*].id'],
      description: 'Every non-null parent id must reference a declared compartment.',
    },
    {
      kind: 'acyclic',
      paths: ['compartments[*].id', 'compartments[*].parent_id'],
      description: 'The compartment parent graph must be acyclic.',
    },
    {
      kind: 'monotonic_non_decreasing',
      paths: ['times_ms'],
      description: 'Compartment timestamps must be monotonically non-decreasing.',
    },
  ],
  'nest.animation_replay': [
    {
      kind: 'monotonic_non_decreasing',
      paths: ['frames[*].time_ms'],
      description: 'Replay frame timestamps must be monotonically non-decreasing.',
    },
    {
      kind: 'property_count',
      paths: ['frames[*].state'],
      min: 1,
      description: 'Every replay frame state must contain at least one field.',
    },
  ],
  'corpus.knowledge_graph': [
    {
      kind: 'unique_field',
      paths: ['nodes'],
      field: 'id',
      description: 'Node ids must be unique.',
    },
    {
      kind: 'unique_tuple',
      paths: ['edges[*].source', 'edges[*].target', 'edges[*].kind'],
      symmetricKinds: ['same_as'],
      description: 'Duplicate source/target/kind relationships are not allowed.',
    },
    {
      kind: 'references_exist',
      paths: ['edges[*].source', 'edges[*].target', 'nodes[*].id'],
      description: 'Every edge endpoint must reference a declared node id.',
    },
    {
      kind: 'no_self_loops',
      paths: ['edges[*].source', 'edges[*].target'],
      description: 'Self-loop edges are not renderable by this scene.',
    },
    {
      kind: 'endpoint_kinds',
      paths: ['edges', 'nodes'],
      allowedEndpointKinds: {
        cites: ['paper', 'paper'],
        same_as: ['model', 'model'],
        variant_of: ['model', 'model'],
        instantiates: ['paper', 'model'],
        belongs_to_family: ['model', 'family'],
      },
      description: 'Each semantic edge kind has a fixed source-kind and target-kind contract.',
    },
  ],
};

Object.setPrototypeOf(PARAM_VALIDATION_CONSTRAINTS, null);
for (const constraints of Object.values(PARAM_VALIDATION_CONSTRAINTS)) {
  constraints?.forEach((constraint) => {
    Object.freeze(constraint.paths);
    if (constraint.symmetricKinds) Object.freeze(constraint.symmetricKinds);
    if (constraint.allowedEndpointKinds) {
      Object.values(constraint.allowedEndpointKinds).forEach(Object.freeze);
      Object.freeze(constraint.allowedEndpointKinds);
    }
    if (constraint.allowedValues) Object.freeze(constraint.allowedValues);
    if (constraint.numericDomains) {
      Object.values(constraint.numericDomains).forEach(Object.freeze);
      Object.freeze(constraint.numericDomains);
    }
    Object.freeze(constraint);
  });
  if (constraints) Object.freeze(constraints);
}
Object.freeze(PARAM_VALIDATION_CONSTRAINTS);

for (const contract of Object.values(NEST_SKILL_REGISTRY)) {
  contract.paramConstraints = PARAM_VALIDATION_CONSTRAINTS[contract.id];
}

/** Neutral alias for the skill registry (the axis is not NEST-only — see
 *  corpus.knowledge_graph). Prefer this in new code. */
export const SKILL_REGISTRY = NEST_SKILL_REGISTRY;

// This registry is a security boundary, not a customization surface. Freeze
// every contract/array and remove Object.prototype from the index so ids such as
// "__proto__" or "constructor" can never resolve to inherited objects.
Object.setPrototypeOf(NEST_SKILL_REGISTRY, null);
for (const contract of Object.values(NEST_SKILL_REGISTRY)) {
  Object.freeze(contract.requiredInputKeys);
  Object.freeze(contract.requiredProvenanceKeys);
  contract.provenanceParamConstraints?.forEach(Object.freeze);
  if (contract.provenanceParamConstraints) {
    Object.freeze(contract.provenanceParamConstraints);
  }
  Object.freeze(contract.rendererRoutes);
  if (contract.paramConstraints) Object.freeze(contract.paramConstraints);
  contract.examples.forEach(Object.freeze);
  Object.freeze(contract.examples);
  Object.freeze(contract);
}
Object.freeze(NEST_SKILL_REGISTRY);

export function listSkills(): SkillContract[] {
  return Object.values(NEST_SKILL_REGISTRY);
}

export function getSkill(id: unknown): SkillContract | undefined {
  return isSkillId(id) ? NEST_SKILL_REGISTRY[id] : undefined;
}

// Self-describing descriptor an agent fetches to learn how to invoke a skill
// WITHOUT reading TS source: scene, required params/provenance, renderer routes,
// whether the scene reuse is approximate (weak), and a copyable example payload.
export interface SkillDescriptor {
  id: NestSkillId;
  title: string;
  description: string;
  deviceFamily: NestDeviceFamily;
  scene: SceneName | null;
  renderable: boolean;
  weak: boolean;
  weakDisclosure?: string;
  requiredInputKeys: string[];
  requiredProvenanceKeys: ProvenanceKey[];
  provenanceParamConstraints: ProvenanceParamConstraint[];
  /** Machine-readable JSON Schema for `params` (JSON Schema draft 2020-12),
   *  derived from the skill's zod schema. Agents and non-TS hosts can validate
   *  params locally and generate conformant payloads without reading TS or
   *  reverse-engineering types from the example. Scene-less skills publish a
   *  schema too because their host-renderer payload still needs validation. */
  paramsJsonSchema?: Record<string, unknown>;
  /** Portable rules for cross-field invariants JSON Schema cannot express. */
  paramConstraints: ParamValidationConstraint[];
  rendererRoutes: RendererRoute[];
  examplePayload?:
    | import('../vizSpec').VizSpec
    | import('./hostInvocation').HostRendererInvocation;
  examples: SkillExample[];
}

/** JSON Schema for a skill's params, or undefined when it has no param schema. */
function annotatePortableStringRules(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(annotatePortableStringRules);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const schema = value as Record<string, unknown>;
  if (schema.type === 'string' && typeof schema.maxLength === 'number') {
    schema['x-cortexel-max-utf16-code-units'] = schema.maxLength;
  }
  if (Array.isArray(schema.prefixItems) && schema.items === undefined) {
    // Zod v4 currently emits tuple prefixItems without closing the tuple under
    // draft 2020-12. Without these keywords [] and extra elements validate.
    schema.minItems = schema.prefixItems.length;
    schema.maxItems = schema.prefixItems.length;
    schema.items = false;
  }
  if (
    schema.type === 'string' &&
    typeof schema.minLength === 'number' &&
    schema.minLength >= 1 &&
    schema.pattern === undefined
  ) {
    // Zod's JSON-Schema emitter cannot represent `.trim()`. Every minLength
    // string in the params schemas is trim-normalized; this pattern preserves
    // validation parity even before a host implements the vendor normalization.
    schema.pattern = '\\S';
    schema['x-cortexel-normalize'] = 'trim';
  }
  Object.values(schema).forEach(annotatePortableStringRules);
}

export function toPortableJsonSchema(schemaSource: z.ZodType): Record<string, unknown> {
  // Emit the accepted INPUT contract. Zod output schemas mark defaulted fields
  // required, which would make non-TS validators reject payloads TS accepts.
  const schema = z.toJSONSchema(schemaSource, { io: 'input' }) as Record<string, unknown>;
  annotatePortableStringRules(schema);
  return schema;
}

export function skillParamsJsonSchema(
  c: SkillContract,
): Record<string, unknown> | undefined {
  return c.paramsSchema ? toPortableJsonSchema(c.paramsSchema) : undefined;
}

export function describeSkill(id: unknown): SkillDescriptor | undefined {
  const c = getSkill(id);
  if (!c) return undefined;
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    deviceFamily: c.deviceFamily,
    scene: c.scene,
    renderable: c.scene !== null,
    weak: c.weak ?? false,
    weakDisclosure: c.weakDisclosure,
    requiredInputKeys: [...c.requiredInputKeys],
    requiredProvenanceKeys: [...c.requiredProvenanceKeys],
    provenanceParamConstraints: (c.provenanceParamConstraints ?? []).map(
      (constraint) => ({ ...constraint }),
    ),
    paramsJsonSchema: skillParamsJsonSchema(c),
    paramConstraints: (c.paramConstraints ?? []).map((constraint) => ({
      ...constraint,
      paths: [...constraint.paths],
      ...(constraint.symmetricKinds
        ? { symmetricKinds: [...constraint.symmetricKinds] }
        : {}),
      ...(constraint.allowedEndpointKinds
        ? {
            allowedEndpointKinds: Object.fromEntries(
              Object.entries(constraint.allowedEndpointKinds).map(([kind, pair]) => [
                kind,
                [...pair],
              ]),
            ) as Record<string, [string, string]>,
          }
        : {}),
    })),
    rendererRoutes: [...c.rendererRoutes],
    examplePayload:
      getExamplePayload(c.id) ?? getHostRendererExamplePayload(c.id),
    examples: c.examples.map((e) => ({ ...e })),
  };
}

export function describeSkills(): SkillDescriptor[] {
  return listSkills()
    .map((c) => describeSkill(c.id))
    .filter((d): d is SkillDescriptor => d !== undefined);
}
