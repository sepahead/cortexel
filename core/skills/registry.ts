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

import type { z } from 'zod';
import type { SceneName } from '../designLaws';
import type { PiNestSkillId, NestDeviceFamily, RendererRoute } from './skillIds';
import type { ProvenanceKey } from './provenanceKeys';
import {
  AstrocyteParamsSchema,
  NetworkParamsSchema,
  PhasePlaneParamsSchema,
  PlasticityParamsSchema,
  RateResponseParamsSchema,
  Spatial3DParamsSchema,
  SpikeRasterParamsSchema,
  VoltageTraceParamsSchema,
} from './params';
import { getExamplePayload } from './examples';

export const CORTEXEL_SKILL_VERSION = '1.0.0';

export interface SkillExample {
  nestExample: string;
  sourceUrl: string;
  dataShape: string;
  output: string;
  note: string;
}

export interface SkillContract {
  id: PiNestSkillId;
  version: string;
  title: string;
  description: string;
  deviceFamily: NestDeviceFamily;
  /** Cortexel scene this skill renders to, or null when none is honest yet. */
  scene: SceneName | null;
  /** When true, the scene is a derived/approximate target, not a clean 1:1. */
  weak?: boolean;
  /** Top-level param keys an invocation must supply (subset of paramsSchema). */
  requiredInputKeys: string[];
  /** Per-skill zod schema for `params` (undefined when scene is null). */
  paramsSchema?: z.ZodType;
  /** Provenance keys the agent must declare for this skill to render. */
  requiredProvenanceKeys: ProvenanceKey[];
  rendererRoutes: RendererRoute[];
  examples: SkillExample[];
}

export const NEST_SKILL_REGISTRY: Record<PiNestSkillId, SkillContract> = {
  'pi.nest.voltage_trace': {
    id: 'pi.nest.voltage_trace',
    version: '1.0.0',
    title: 'NEST voltage trace renderer',
    description:
      'Render multimeter/voltmeter analog traces (V_m, currents, conductances).',
    deviceFamily: 'multimeter',
    scene: 'voltage-trace',
    requiredInputKeys: ['times_ms', 'series', 'units'],
    paramsSchema: VoltageTraceParamsSchema,
    requiredProvenanceKeys: [
      'device_id',
      'recorded_variable',
      'units',
      'sampling_interval',
    ],
    rendererRoutes: ['pi.media.trace_figure', 'matplotlib', 'd3'],
    examples: [
      {
        nestExample: 'One neuron example / multimeter recording',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/one_neuron.html',
        dataShape: 'times_ms + V_m/current/conductance series split by sender',
        output: 'Selectable trace, spike markers, JSON + SVG export',
        note: 'Mirrors NEST voltage_trace while keeping data provenance inspectable.',
      },
    ],
  },
  'pi.nest.spike_raster': {
    id: 'pi.nest.spike_raster',
    version: '1.0.0',
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
    rendererRoutes: ['pi.media.model_graph', 'd3'],
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
  'pi.nest.rate_response': {
    id: 'pi.nest.rate_response',
    version: '1.0.0',
    title: 'NEST rate / IF response renderer',
    description:
      'Render firing-rate / IF curves and population rates derived from spike counts.',
    deviceFamily: 'spike_recorder',
    scene: 'fi-curve',
    requiredInputKeys: ['stimulus_amplitudes', 'rates_hz', 'units'],
    paramsSchema: RateResponseParamsSchema,
    requiredProvenanceKeys: ['stim_units', 'bin_ms', 'rate_normalization'],
    rendererRoutes: ['pi.media.trace_figure', 'matplotlib', 'd3'],
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
  'pi.nest.connectivity_matrix': {
    id: 'pi.nest.connectivity_matrix',
    version: '1.0.0',
    title: 'NEST connectivity matrix renderer',
    description:
      'Render SynapseCollection connectivity, weights and population blocks.',
    deviceFamily: 'get_connections',
    scene: 'network-topology',
    requiredInputKeys: ['sources', 'targets'],
    paramsSchema: NetworkParamsSchema,
    requiredProvenanceKeys: [
      'source_ids',
      'target_ids',
      'synapse_model',
      'weight_units',
    ],
    rendererRoutes: ['pi.media.model_graph', 'd3'],
    examples: [
      {
        nestExample: 'Plot weight matrices example / SynapseCollection',
        sourceUrl:
          'https://nest-simulator.readthedocs.io/en/latest/auto_examples/plot_weight_matrices.html',
        dataShape: 'sources, targets, weights, delays, source/target populations',
        output: 'Topology node-edge view, selected block stats, weight histogram',
        note: 'Keep absent connections distinct from zero-weight connections.',
      },
    ],
  },
  'pi.nest.spatial_2d': {
    id: 'pi.nest.spatial_2d',
    version: '1.0.0',
    title: 'NEST 2D spatial renderer',
    description: 'Render 2D layer positions, masks, kernels and sampled projections.',
    deviceFamily: 'get_position',
    scene: null, // no honest 2D-spatial scene yet (would violate sphere/voxel law)
    requiredInputKeys: ['positions'],
    requiredProvenanceKeys: ['extent', 'mask', 'kernel'],
    rendererRoutes: ['pi.media.model_graph', 'd3'],
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
  'pi.nest.spatial_3d': {
    id: 'pi.nest.spatial_3d',
    version: '1.0.0',
    title: 'NEST 3D spatial renderer',
    description: 'Render 3D population/node positions for spatial inspection.',
    deviceFamily: 'get_position',
    scene: 'network-topology',
    requiredInputKeys: ['objects'],
    paramsSchema: Spatial3DParamsSchema,
    requiredProvenanceKeys: ['extent', 'projection_sample_policy'],
    rendererRoutes: [
      'pi.media.webgl_scene',
      'pi.media.react_fiber_scene',
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
  'pi.nest.plasticity_dynamics': {
    id: 'pi.nest.plasticity_dynamics',
    version: '1.0.0',
    title: 'NEST plasticity dynamics renderer',
    description: 'Render STDP windows, weight adaptation and short-term dynamics.',
    deviceFamily: 'weight_recorder',
    scene: 'stdp',
    requiredInputKeys: ['times_ms', 'weights', 'weight_units'],
    paramsSchema: PlasticityParamsSchema,
    requiredProvenanceKeys: ['synapse_model', 'weight_units'],
    rendererRoutes: ['pi.media.trace_figure', 'matplotlib'],
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
  'pi.nest.phase_plane': {
    id: 'pi.nest.phase_plane',
    version: '1.0.0',
    title: 'NEST phase-plane renderer',
    description: 'Render phase planes, vector fields, nullclines and trajectories.',
    deviceFamily: 'computed',
    scene: 'phase-plane',
    requiredInputKeys: ['grid'],
    paramsSchema: PhasePlaneParamsSchema,
    requiredProvenanceKeys: ['state_variables'],
    rendererRoutes: ['pi.media.model_graph', 'd3'],
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
  'pi.nest.correlogram': {
    id: 'pi.nest.correlogram',
    version: '1.0.0',
    title: 'NEST correlogram / synchrony renderer',
    description: 'Render auto/cross-correlation functions for spike trains.',
    deviceFamily: 'spike_recorder',
    scene: null, // ISI-histogram scene exists but the math differs — no honest reuse
    requiredInputKeys: ['lags_ms', 'correlation'],
    requiredProvenanceKeys: ['bin_ms', 'pair_labels'],
    rendererRoutes: ['pi.media.model_graph', 'd3'],
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
  'pi.nest.stimulus_response': {
    id: 'pi.nest.stimulus_response',
    version: '1.0.0',
    title: 'NEST stimulus-response protocol renderer',
    description:
      'Render aligned stimulus waveforms, responses, spikes and protocol epochs.',
    deviceFamily: 'multimeter',
    scene: null, // composite multi-panel protocol; no single Cortexel scene
    requiredInputKeys: ['stimulus', 'response'],
    requiredProvenanceKeys: ['stim_units', 'units'],
    rendererRoutes: ['pi.media.trace_figure', 'matplotlib'],
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
  'pi.nest.astrocyte_dynamics': {
    id: 'pi.nest.astrocyte_dynamics',
    version: '1.0.0',
    title: 'NEST astrocyte Ca²⁺/IP₃ dynamics renderer',
    description: 'Render tripartite-synapse calcium/IP3 state-variable traces.',
    deviceFamily: 'multimeter',
    scene: 'voltage-trace',
    weak: true, // analog-trace reuse: Ca/IP3 are not membrane voltage
    requiredInputKeys: ['ca_trace', 'units'],
    paramsSchema: AstrocyteParamsSchema,
    requiredProvenanceKeys: ['recorded_variable', 'units'],
    rendererRoutes: ['pi.media.trace_figure', 'matplotlib'],
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
  'pi.nest.compartmental_dynamics': {
    id: 'pi.nest.compartmental_dynamics',
    version: '1.0.0',
    title: 'NEST compartmental morphology + dynamics renderer',
    description:
      'Render multi-compartment morphologies, receptor ports and soma/dendrite traces.',
    deviceFamily: 'multimeter',
    scene: null, // morphology geometry has no honest Cortexel scene (no invented geometry)
    requiredInputKeys: ['compartments'],
    requiredProvenanceKeys: ['morphology_disclaimer', 'recorded_variable'],
    rendererRoutes: ['pi.media.model_graph', 'd3'],
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
  'pi.nest.animation_replay': {
    id: 'pi.nest.animation_replay',
    version: '1.0.0',
    title: 'NEST state replay / animation storyboard renderer',
    description: 'Render time-evolution storyboards and inspectable state replays.',
    deviceFamily: 'computed',
    scene: null, // offline manim storyboard, not a live r3f scene — do not mis-route
    requiredInputKeys: ['frames'],
    requiredProvenanceKeys: ['frame_rate'],
    rendererRoutes: ['pi.media.manim_storyboard', 'manim'],
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
};

export function listSkills(): SkillContract[] {
  return Object.values(NEST_SKILL_REGISTRY);
}

export function getSkill(id: string): SkillContract | undefined {
  return (NEST_SKILL_REGISTRY as Record<string, SkillContract>)[id];
}

// Self-describing descriptor an agent fetches to learn how to invoke a skill
// WITHOUT reading TS source: scene, required params/provenance, renderer routes,
// whether the scene reuse is approximate (weak), and a copyable example payload.
export interface SkillDescriptor {
  id: PiNestSkillId;
  title: string;
  description: string;
  deviceFamily: NestDeviceFamily;
  scene: SceneName | null;
  renderable: boolean;
  weak: boolean;
  requiredInputKeys: string[];
  requiredProvenanceKeys: ProvenanceKey[];
  rendererRoutes: RendererRoute[];
  examplePayload?: import('../vizSpec').VizSpec;
  examples: SkillExample[];
}

export function describeSkill(id: string): SkillDescriptor | undefined {
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
    requiredInputKeys: [...c.requiredInputKeys],
    requiredProvenanceKeys: [...c.requiredProvenanceKeys],
    rendererRoutes: [...c.rendererRoutes],
    examplePayload: getExamplePayload(c.id),
    examples: c.examples.map((e) => ({ ...e })),
  };
}

export function describeSkills(): SkillDescriptor[] {
  return listSkills()
    .map((c) => describeSkill(c.id))
    .filter((d): d is SkillDescriptor => d !== undefined);
}
