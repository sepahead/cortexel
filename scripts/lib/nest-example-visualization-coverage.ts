/**
 * Reviewed, source-only visualization classification for the pinned NEST 3.10
 * PyNEST example corpus. This module never imports or executes upstream code.
 */

import Ajv2020 from 'ajv/dist/2020.js';

import { canonicalize } from '../../src/core/canonicalize.js';
import { sha256Digest } from '../../src/core/sha256.js';
import {
  PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
  validateNestExampleSourceInventory,
  type NestExampleSourceInventory,
  type NestExampleSourcePath,
} from './nest-example-source-inventory.js';
import {
  PINNED_NEST_DOCUMENTATION_SOURCE_INVENTORY_DIGEST,
  validateNestDocumentationSourceInventory,
  type NestDocumentationSourceInventory,
} from './nest-documentation-source-inventory.js';

type JsonRecord = Record<string, any>;

export const NEST_EXAMPLE_VISUALIZATION_COVERAGE_IDENTITY =
  'cortexel-nest-example-visualization-coverage.semantic.rfc8785-sha256.v2' as const;
export const PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_DIGEST =
  'sha256:de833e119cadc2ed5032b4c798be1486c7ac2bd3e3125925c056036af890749c' as const;
const DIGEST_DOMAIN = `${NEST_EXAMPLE_VISUALIZATION_COVERAGE_IDENTITY}\0`;

export const SEMANTIC_DEMAND_IDS = Object.freeze([
  'analog_trace',
  'animation_sequence',
  'categorical_state_grid',
  'compartment_trace',
  'connection_graph',
  'covariance_matrix_lag_series',
  'generic_distribution',
  'image_frame',
  'isi_distribution',
  'learning_metric_series',
  'multisignal_trace',
  'optimization_search',
  'phase_plane',
  'population_rate',
  'population_summary_trace',
  'psth',
  'response_curve',
  'spatial_connectivity_2d',
  'spatial_map_3d',
  'spike_raster',
  'structural_plasticity_history',
  'synaptic_weight_trace',
  'weight_distribution',
  'weight_matrix',
] as const);

export type SemanticDemandId = (typeof SEMANTIC_DEMAND_IDS)[number];

export const PRESENTATION_DEMAND_IDS = Object.freeze([
  'animation_frames',
  'color_scale',
  'cross_capability_bundle',
  'dual_y_axis',
  'error_bars',
  'live_incremental_redraw',
  'multi_panel',
  'same_axis_overlay',
  'single_panel',
  'static_file_export',
  'uncertainty_band',
] as const);

export type PresentationDemandId = (typeof PRESENTATION_DEMAND_IDS)[number];

export const VISUAL_OPERATION_IDS = Object.freeze([
  'bar',
  'error_bar',
  'filled_band',
  'heatmap',
  'histogram',
  'image',
  'line',
  'network_edges',
  'point',
  'raster',
  'spatial_points_2d',
  'spatial_points_3d',
  'step',
  'vector_field',
] as const);

export type VisualOperationId = (typeof VISUAL_OPERATION_IDS)[number];

type StableRepresentabilityState =
  | 'source_review_candidate'
  | 'partial_source_review_candidate'
  | 'no_stable_candidate';
type AdapterState = 'one_profile_available_no_example_match' | 'none';
type RendererState =
  | 'packaged_candidate_no_upstream_comparison'
  | 'partial_candidate_no_upstream_comparison'
  | 'none';

interface SemanticDemandDefinition {
  readonly id: SemanticDemandId;
  readonly description: string;
  readonly stableRepresentability: {
    readonly state: StableRepresentabilityState;
    readonly skillCandidates: readonly string[];
  };
  readonly executableAdapter: {
    readonly state: AdapterState;
    readonly adapterCandidates: readonly string[];
  };
  readonly renderer: {
    readonly state: RendererState;
    readonly rendererCandidates: readonly string[];
  };
  readonly upstreamParity: 'not_run';
  readonly scientificCertification: 'not_run';
  readonly notes: string;
}

function demand(
  id: SemanticDemandId,
  description: string,
  stableState: StableRepresentabilityState,
  skillCandidates: readonly string[],
  rendererState: RendererState,
  rendererCandidates: readonly string[],
  notes: string,
  executableAdapter: SemanticDemandDefinition['executableAdapter'] = {
    state: 'none',
    adapterCandidates: [],
  },
): SemanticDemandDefinition {
  return {
    id,
    description,
    stableRepresentability: { state: stableState, skillCandidates },
    executableAdapter,
    renderer: { state: rendererState, rendererCandidates },
    upstreamParity: 'not_run',
    scientificCertification: 'not_run',
    notes,
  };
}

const EXACT_CANDIDATE_NOTE =
  'The pinned source semantics have a plausible stable contract and packaged renderer candidate. No execution-bound output, source-to-request mapping receipt, example-specific adapter match, or upstream parity result exists.';
const PARTIAL_CANDIDATE_NOTE =
  'One or more stable contracts can carry part of this source-level demand, but the reviewed source also requires semantics or presentation that the current stable surface does not express as one complete capability. No upstream parity result exists.';
const ABSENT_CANDIDATE_NOTE =
  'No current stable FigureRequestV1 capability expresses this complete source-level demand. This is a representability gap, not evidence that an upstream output was produced or compared.';

export const SEMANTIC_DEMAND_DEFINITIONS: readonly SemanticDemandDefinition[] =
  Object.freeze([
    demand(
      'analog_trace',
      'One sampled scalar quantity against biological time.',
      'source_review_candidate',
      ['neuro.analog_trace'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.analog_trace'],
      EXACT_CANDIDATE_NOTE,
    ),
    demand(
      'animation_sequence',
      'An ordered frame sequence with declared timing and frame identity.',
      'no_stable_candidate',
      [],
      'none',
      [],
      ABSENT_CANDIDATE_NOTE,
    ),
    demand(
      'categorical_state_grid',
      'A bounded categorical cell grid whose symbols and state meanings are data.',
      'no_stable_candidate',
      [],
      'none',
      [],
      ABSENT_CANDIDATE_NOTE,
    ),
    demand(
      'compartment_trace',
      'Aligned quantities indexed by declared neuronal compartments.',
      'source_review_candidate',
      ['neuro.compartment_trace'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.compartment_trace'],
      EXACT_CANDIDATE_NOTE,
    ),
    demand(
      'connection_graph',
      'Nodes and directed connection assertions, including isolates and multapses.',
      'source_review_candidate',
      ['network.connection_graph'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.connection_graph'],
      EXACT_CANDIDATE_NOTE,
    ),
    demand(
      'covariance_matrix_lag_series',
      'A matrix-valued covariance history over a lag axis.',
      'no_stable_candidate',
      [],
      'none',
      [],
      ABSENT_CANDIDATE_NOTE,
    ),
    demand(
      'generic_distribution',
      'A histogram whose measured quantity is outside the closed stable distribution skills.',
      'no_stable_candidate',
      [],
      'none',
      [],
      ABSENT_CANDIDATE_NOTE,
    ),
    demand(
      'image_frame',
      'A source-bound raster image frame with pixels, extent, and image semantics.',
      'no_stable_candidate',
      [],
      'none',
      [],
      ABSENT_CANDIDATE_NOTE,
    ),
    demand(
      'isi_distribution',
      'A declared inter-spike-interval histogram.',
      'source_review_candidate',
      ['neuro.isi_distribution'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.distribution'],
      EXACT_CANDIDATE_NOTE,
    ),
    demand(
      'learning_metric_series',
      'Training or evaluation metrics indexed by an iteration or task coordinate.',
      'partial_source_review_candidate',
      ['neuro.response_curve'],
      'partial_candidate_no_upstream_comparison',
      ['figure.response_curve'],
      PARTIAL_CANDIDATE_NOTE,
    ),
    demand(
      'multisignal_trace',
      'Multiple aligned sampled signals with declared dimensions and series identity.',
      'source_review_candidate',
      ['neuro.multisignal_trace'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.multisignal_trace'],
      EXACT_CANDIDATE_NOTE,
    ),
    demand(
      'optimization_search',
      'Optimization population, search-ellipse, and fitness-history diagnostics.',
      'no_stable_candidate',
      [],
      'none',
      [],
      ABSENT_CANDIDATE_NOTE,
    ),
    demand(
      'phase_plane',
      'A phase plane with trajectory, nullcline, or vector-field carriers.',
      'source_review_candidate',
      ['neuro.phase_plane'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.phase_plane'],
      EXACT_CANDIDATE_NOTE,
    ),
    demand(
      'population_rate',
      'A population event rate or literal time-bin count/rate history.',
      'source_review_candidate',
      ['neuro.population_rate'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.population_rate'],
      EXACT_CANDIDATE_NOTE,
    ),
    demand(
      'population_summary_trace',
      'A population aggregate trace with explicit dispersion bands.',
      'partial_source_review_candidate',
      ['neuro.multisignal_trace'],
      'partial_candidate_no_upstream_comparison',
      ['figure.multisignal_trace'],
      PARTIAL_CANDIDATE_NOTE,
    ),
    demand(
      'psth',
      'A declared peri-stimulus or event-time histogram.',
      'source_review_candidate',
      ['neuro.psth'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.psth'],
      EXACT_CANDIDATE_NOTE,
    ),
    demand(
      'response_curve',
      'A measured response indexed by an ordered stimulus or condition.',
      'source_review_candidate',
      ['neuro.response_curve'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.response_curve'],
      EXACT_CANDIDATE_NOTE,
    ),
    demand(
      'spatial_connectivity_2d',
      'Measured two-dimensional positions together with a connection-neighborhood view.',
      'partial_source_review_candidate',
      ['network.spatial_map_2d', 'network.connection_graph'],
      'partial_candidate_no_upstream_comparison',
      ['figure.spatial_map_2d', 'figure.connection_graph'],
      PARTIAL_CANDIDATE_NOTE,
    ),
    demand(
      'spatial_map_3d',
      'Measured three-dimensional node positions and spatial connection context.',
      'no_stable_candidate',
      [],
      'none',
      [],
      ABSENT_CANDIDATE_NOTE,
    ),
    demand(
      'spike_raster',
      'Spike event times against an explicit sender universe and ordering.',
      'source_review_candidate',
      ['neuro.spike_raster'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.spike_raster'],
      EXACT_CANDIDATE_NOTE,
      {
        state: 'one_profile_available_no_example_match',
        adapterCandidates: ['nest-spike-recorder.v5'],
      },
    ),
    demand(
      'structural_plasticity_history',
      'Coupled structural-connectivity counts and state-variable histories.',
      'partial_source_review_candidate',
      ['neuro.multisignal_trace'],
      'partial_candidate_no_upstream_comparison',
      ['figure.multisignal_trace'],
      PARTIAL_CANDIDATE_NOTE,
    ),
    demand(
      'synaptic_weight_trace',
      'Per-connection sampled or event-updated synaptic weight history.',
      'source_review_candidate',
      ['network.synaptic_weight_trace'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.synaptic_weight_trace'],
      EXACT_CANDIDATE_NOTE,
    ),
    demand(
      'weight_distribution',
      'A declared distribution of connection weights.',
      'source_review_candidate',
      ['network.weight_distribution'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.distribution'],
      EXACT_CANDIDATE_NOTE,
    ),
    demand(
      'weight_matrix',
      'A source-by-target matrix of declared connection-weight aggregates.',
      'source_review_candidate',
      ['network.weight_matrix'],
      'packaged_candidate_no_upstream_comparison',
      ['figure.matrix'],
      EXACT_CANDIDATE_NOTE,
    ),
  ]);

type VisualizationStatus =
  | 'active_visualization'
  | 'visualization_import_only'
  | 'no_visualization_operation';

interface ReviewedBodyClassification {
  readonly visualizationStatus: VisualizationStatus;
  readonly semanticDemands: readonly SemanticDemandId[];
  readonly presentationDemands: readonly PresentationDemandId[];
  readonly visualOperations: readonly VisualOperationId[];
  readonly sourceLineAnchors: readonly number[];
}

function active(
  semanticDemands: readonly SemanticDemandId[],
  presentationDemands: readonly PresentationDemandId[],
  visualOperations: readonly VisualOperationId[],
  sourceLineAnchors: readonly number[],
): ReviewedBodyClassification {
  return {
    visualizationStatus: 'active_visualization',
    semanticDemands,
    presentationDemands,
    visualOperations,
    sourceLineAnchors,
  };
}

function none(): ReviewedBodyClassification {
  return {
    visualizationStatus: 'no_visualization_operation',
    semanticDemands: [],
    presentationDemands: [],
    visualOperations: [],
    sourceLineAnchors: [],
  };
}

function importOnly(sourceLine: number): ReviewedBodyClassification {
  return {
    visualizationStatus: 'visualization_import_only',
    semanticDemands: [],
    presentationDemands: [],
    visualOperations: [],
    sourceLineAnchors: [sourceLine],
  };
}

const ENTRYPOINT_CLASSIFICATIONS: Readonly<Record<string, ReviewedBodyClassification>> =
  Object.freeze({
    'pynest/examples/BrodyHopfield.py': active(
      ['spike_raster'], ['single_panel'], ['raster'], [113]),
    'pynest/examples/CampbellSiegert.py': none(),
    'pynest/examples/EI_clustered_network/run_simulation.py': active(
      ['spike_raster'], ['single_panel', 'static_file_export'], ['raster'], [46, 54]),
    'pynest/examples/aeif_cond_beta_multisynapse.py': active(
      ['analog_trace'], ['single_panel'], ['line'], [64]),
    'pynest/examples/artificial_synchrony.py': active(
      ['response_curve'], ['single_panel', 'same_axis_overlay'], ['line', 'point'], [352, 353]),
    'pynest/examples/astrocytes/astrocyte_brunel_bernoulli.py': active(
      ['population_rate', 'population_summary_trace', 'spike_raster'],
      ['cross_capability_bundle', 'dual_y_axis', 'multi_panel', 'uncertainty_band'],
      ['filled_band', 'histogram', 'line', 'raster'], [281, 363]),
    'pynest/examples/astrocytes/astrocyte_brunel_fixed_indegree.py': active(
      ['population_rate', 'population_summary_trace', 'spike_raster'],
      ['cross_capability_bundle', 'dual_y_axis', 'multi_panel', 'uncertainty_band'],
      ['filled_band', 'histogram', 'line', 'raster'], [278, 360]),
    'pynest/examples/astrocytes/astrocyte_interaction.py': active(
      ['multisignal_trace'], ['multi_panel'], ['line'], [131, 136]),
    'pynest/examples/astrocytes/astrocyte_single.py': active(
      ['multisignal_trace'], ['multi_panel'], ['line'], [94, 96]),
    'pynest/examples/astrocytes/astrocyte_small_network.py': active(
      ['connection_graph', 'population_summary_trace'],
      ['cross_capability_bundle', 'dual_y_axis', 'multi_panel', 'uncertainty_band'],
      ['filled_band', 'line', 'network_edges', 'point'], [227, 450, 452]),
    'pynest/examples/balancedneuron.py': active(
      ['analog_trace'], ['single_panel'], ['line'], [166]),
    'pynest/examples/brette_et_al_2007/coba.py': none(),
    'pynest/examples/brette_et_al_2007/cuba.py': none(),
    'pynest/examples/brette_et_al_2007/cuba_ps.py': none(),
    'pynest/examples/brette_et_al_2007/cuba_stdp.py': none(),
    'pynest/examples/brette_et_al_2007/hh_coba.py': none(),
    'pynest/examples/brette_gerstner_fig_2c.py': active(
      ['analog_trace'], ['single_panel'], ['line'], [84]),
    'pynest/examples/brette_gerstner_fig_3d.py': active(
      ['analog_trace'], ['single_panel'], ['line'], [84]),
    'pynest/examples/brunel_alpha_evolution_strategies.py': active(
      ['learning_metric_series', 'optimization_search', 'spike_raster'],
      ['cross_capability_bundle', 'error_bars', 'multi_panel', 'static_file_export'],
      ['error_bar', 'line', 'point', 'raster'], [528, 543, 561, 567]),
    'pynest/examples/brunel_alpha_nest.py': active(
      ['spike_raster'], ['single_panel'], ['raster'], [321]),
    'pynest/examples/brunel_delta_nest.py': active(
      ['spike_raster'], ['single_panel'], ['raster'], [273]),
    'pynest/examples/brunel_exp_multisynapse_nest.py': active(
      ['spike_raster'], ['single_panel'], ['raster'], [305]),
    'pynest/examples/brunel_siegert_nest.py': none(),
    'pynest/examples/clopath_synapse_small_network.py': active(
      ['weight_matrix'], ['color_scale', 'single_panel'], ['heatmap'], [185, 186]),
    'pynest/examples/clopath_synapse_spike_pairing.py': active(
      ['response_curve'], ['same_axis_overlay', 'single_panel'], ['line'], [151, 152]),
    'pynest/examples/compartmental_model/receptors_and_current.py': active(
      ['compartment_trace'], ['same_axis_overlay', 'single_panel'], ['line'], [117, 119]),
    'pynest/examples/compartmental_model/two_comps.py': active(
      ['compartment_trace'], ['multi_panel', 'same_axis_overlay'], ['line'], [162, 224]),
    'pynest/examples/correlospinmatrix_detector_two_neuron.py': active(
      ['covariance_matrix_lag_series'], ['same_axis_overlay', 'single_panel'], ['line'], [80, 83]),
    'pynest/examples/cross_check_mip_corrdet.py': none(),
    'pynest/examples/csa_example.py': active(
      ['analog_trace', 'connection_graph'],
      ['cross_capability_bundle', 'multi_panel', 'static_file_export'],
      ['line', 'network_edges'], [127, 134]),
    'pynest/examples/csa_spatial_example.py': active(
      ['spatial_connectivity_2d'], ['single_panel'], ['network_edges', 'spatial_points_2d'], [138]),
    'pynest/examples/eprop_plasticity/eprop_supervised_classification_evidence-accumulation_bsshslm_2020.py': active(
      ['learning_metric_series', 'multisignal_trace', 'spike_raster', 'synaptic_weight_trace', 'weight_matrix'],
      ['color_scale', 'cross_capability_bundle', 'multi_panel', 'same_axis_overlay'],
      ['heatmap', 'line', 'point', 'raster', 'step'], [778, 833, 899, 933]),
    'pynest/examples/eprop_plasticity/eprop_supervised_classification_neuromorphic_mnist.py': active(
      ['learning_metric_series', 'multisignal_trace', 'spike_raster', 'synaptic_weight_trace', 'weight_matrix'],
      ['color_scale', 'cross_capability_bundle', 'multi_panel', 'same_axis_overlay'],
      ['heatmap', 'line', 'point', 'raster', 'step'], [855, 910, 969, 1003]),
    'pynest/examples/eprop_plasticity/eprop_supervised_regression_handwriting_bsshslm_2020.py': active(
      ['learning_metric_series', 'multisignal_trace', 'spike_raster', 'synaptic_weight_trace', 'weight_matrix'],
      ['color_scale', 'cross_capability_bundle', 'multi_panel', 'same_axis_overlay'],
      ['heatmap', 'line', 'point', 'raster', 'step'], [586, 655, 715, 749]),
    'pynest/examples/eprop_plasticity/eprop_supervised_regression_lemniscate_bsshslm_2020.py': active(
      ['learning_metric_series', 'multisignal_trace', 'spike_raster', 'synaptic_weight_trace', 'weight_matrix'],
      ['color_scale', 'cross_capability_bundle', 'multi_panel', 'same_axis_overlay'],
      ['heatmap', 'line', 'point', 'raster', 'step'], [567, 636, 696, 730]),
    'pynest/examples/eprop_plasticity/eprop_supervised_regression_sine-waves.py': active(
      ['learning_metric_series', 'multisignal_trace', 'spike_raster', 'synaptic_weight_trace', 'weight_matrix'],
      ['color_scale', 'cross_capability_bundle', 'multi_panel', 'same_axis_overlay'],
      ['heatmap', 'line', 'point', 'raster', 'step'], [573, 619, 678, 712]),
    'pynest/examples/eprop_plasticity/eprop_supervised_regression_sine-waves_bsshslm_2020.py': active(
      ['learning_metric_series', 'multisignal_trace', 'spike_raster', 'synaptic_weight_trace', 'weight_matrix'],
      ['color_scale', 'cross_capability_bundle', 'multi_panel', 'same_axis_overlay'],
      ['heatmap', 'line', 'point', 'raster', 'step'], [540, 586, 645, 679]),
    'pynest/examples/evaluate_quantal_stp_synapse.py': active(
      ['analog_trace'], ['same_axis_overlay', 'single_panel'], ['line'], [211, 212]),
    'pynest/examples/evaluate_tsodyks2_synapse.py': active(
      ['analog_trace'], ['same_axis_overlay', 'single_panel'], ['line'], [139, 140]),
    'pynest/examples/gap_junctions_inhibitory_network.py': active(
      ['spike_raster'], ['single_panel'], ['raster'], [149]),
    'pynest/examples/gap_junctions_two_neurons.py': active(
      ['analog_trace'], ['same_axis_overlay', 'single_panel'], ['line'], [79, 80]),
    'pynest/examples/gif_cond_exp_multisynapse.py': none(),
    'pynest/examples/gif_pop_psc_exp.py': active(
      ['analog_trace', 'population_rate'],
      ['cross_capability_bundle', 'multi_panel', 'same_axis_overlay'],
      ['histogram', 'line'], [228, 347, 368]),
    'pynest/examples/gif_population.py': active(
      ['spike_raster'], ['single_panel'], ['raster'], [137]),
    'pynest/examples/glif_cond_neuron.py': active(
      ['multisignal_trace'], ['multi_panel', 'same_axis_overlay'], ['line', 'point'], [185, 216]),
    'pynest/examples/glif_psc_double_alpha_neuron.py': active(
      ['multisignal_trace'], ['multi_panel', 'same_axis_overlay'], ['line'], [187, 200]),
    'pynest/examples/glif_psc_neuron.py': active(
      ['multisignal_trace'], ['multi_panel', 'same_axis_overlay'], ['line', 'point'], [211, 232]),
    'pynest/examples/hh_phaseplane.py': active(
      ['phase_plane'], ['same_axis_overlay', 'single_panel'], ['line', 'vector_field'], [158, 170]),
    'pynest/examples/hh_psc_alpha.py': active(
      ['analog_trace'], ['single_panel'], ['line'], [72]),
    'pynest/examples/hpc_benchmark.py': importOnly(98),
    'pynest/examples/iaf_tum_2000_short_term_depression.py': active(
      ['analog_trace'], ['single_panel'], ['line'], [193]),
    'pynest/examples/iaf_tum_2000_short_term_facilitation.py': active(
      ['analog_trace'], ['single_panel'], ['line'], [191]),
    'pynest/examples/if_curve.py': none(),
    'pynest/examples/ignore_and_spike_mechanism.py': active(
      ['spike_raster'], ['single_panel'], ['raster'], [100]),
    'pynest/examples/intrinsic_currents_spiking.py': active(
      ['multisignal_trace'], ['multi_panel', 'same_axis_overlay'], ['line'], [159, 184]),
    'pynest/examples/intrinsic_currents_subthreshold.py': active(
      ['multisignal_trace'], ['multi_panel', 'same_axis_overlay'], ['line'], [152, 209]),
    'pynest/examples/lin_rate_ipn_network.py': active(
      ['multisignal_trace'], ['same_axis_overlay', 'single_panel'], ['line'], [157, 158]),
    'pynest/examples/mc_neuron.py': active(
      ['compartment_trace'], ['multi_panel', 'same_axis_overlay'], ['line'], [162, 175]),
    'pynest/examples/multimeter_file.py': active(
      ['multisignal_trace'], ['multi_panel', 'same_axis_overlay'], ['line'], [131, 137]),
    'pynest/examples/music_cont_out_proxy_example/nest_script.py': none(),
    'pynest/examples/one_neuron.py': active(
      ['analog_trace'], ['single_panel'], ['line'], [95]),
    'pynest/examples/one_neuron_with_noise.py': active(
      ['analog_trace'], ['single_panel'], ['line'], [82]),
    'pynest/examples/plot_weight_matrices.py': active(
      ['weight_matrix'], ['color_scale', 'multi_panel'], ['heatmap'], [135, 165]),
    'pynest/examples/pong/generate_gif.py': active(
      ['animation_sequence', 'image_frame', 'learning_metric_series', 'weight_matrix'],
      ['animation_frames', 'color_scale', 'cross_capability_bundle', 'multi_panel', 'static_file_export'],
      ['heatmap', 'image', 'line'], [182, 209, 257]),
    'pynest/examples/pong/run_simulations.py': none(),
    'pynest/examples/precise_spiking.py': active(
      ['analog_trace', 'spike_raster'],
      ['cross_capability_bundle', 'multi_panel', 'same_axis_overlay'],
      ['line', 'point', 'raster'], [125, 135]),
    'pynest/examples/pulsepacket.py': active(
      ['analog_trace'], ['same_axis_overlay', 'single_panel'], ['line'], [256, 276]),
    'pynest/examples/rate_neuron_dm.py': active(
      ['multisignal_trace'], ['multi_panel', 'same_axis_overlay'], ['line'], [126, 128]),
    'pynest/examples/recording_demo.py': none(),
    'pynest/examples/repeated_stimulation.py': active(
      ['spike_raster'], ['single_panel'], ['raster'], [114]),
    'pynest/examples/sensitivity_to_perturbation.py': active(
      ['spike_raster'], ['same_axis_overlay', 'single_panel'], ['raster'], [222, 223]),
    'pynest/examples/sinusoidal_gamma_generator.py': active(
      ['isi_distribution', 'population_rate', 'psth', 'spike_raster'],
      ['cross_capability_bundle', 'multi_panel', 'same_axis_overlay'],
      ['histogram', 'line', 'raster', 'step'], [95, 103, 140, 244]),
    'pynest/examples/sinusoidal_poisson_generator.py': active(
      ['isi_distribution', 'population_rate', 'psth', 'spike_raster'],
      ['cross_capability_bundle', 'multi_panel', 'same_axis_overlay'],
      ['histogram', 'line', 'raster', 'step'], [87, 95, 126, 156]),
    'pynest/examples/sonata_example/sonata_network.py': active(
      ['spike_raster'], ['single_panel'], ['raster'], [134]),
    'pynest/examples/spatial/conncomp.py': active(
      ['spatial_connectivity_2d'], ['single_panel'], ['network_edges', 'spatial_points_2d'], [80, 87]),
    'pynest/examples/spatial/conncon_sources.py': active(
      ['spatial_connectivity_2d'], ['same_axis_overlay', 'single_panel'], ['spatial_points_2d'], [78]),
    'pynest/examples/spatial/conncon_targets.py': active(
      ['spatial_connectivity_2d'], ['single_panel'], ['network_edges', 'spatial_points_2d'], [65]),
    'pynest/examples/spatial/connex.py': active(
      ['spatial_connectivity_2d'], ['single_panel'], ['network_edges', 'spatial_points_2d'], [62]),
    'pynest/examples/spatial/connex_ew.py': active(
      ['spatial_connectivity_2d'], ['single_panel'], ['network_edges', 'spatial_points_2d'], [64]),
    'pynest/examples/spatial/ctx_2n.py': active(
      ['spatial_connectivity_2d'], ['same_axis_overlay', 'single_panel'], ['network_edges', 'spatial_points_2d'], [60, 62]),
    'pynest/examples/spatial/gaussex.py': active(
      ['spatial_connectivity_2d'], ['single_panel'], ['network_edges', 'spatial_points_2d'], [64]),
    'pynest/examples/spatial/grid_iaf.py': active(
      ['spatial_connectivity_2d'], ['single_panel'], ['spatial_points_2d'], [41]),
    'pynest/examples/spatial/grid_iaf_irr.py': active(
      ['spatial_connectivity_2d'], ['single_panel'], ['spatial_points_2d'], [43]),
    'pynest/examples/spatial/grid_iaf_oc.py': active(
      ['spatial_connectivity_2d'], ['single_panel'], ['spatial_points_2d'], [42]),
    'pynest/examples/spatial/nodes_source_target.py': active(
      ['spatial_connectivity_2d'], ['multi_panel'], ['network_edges', 'spatial_points_2d'], [49, 56]),
    'pynest/examples/spatial/test_3d.py': active(
      ['generic_distribution', 'spatial_map_3d'],
      ['cross_capability_bundle', 'multi_panel'],
      ['histogram', 'spatial_points_3d'], [43, 71]),
    'pynest/examples/spatial/test_3d_exp.py': active(
      ['generic_distribution', 'spatial_map_3d'],
      ['cross_capability_bundle', 'multi_panel'],
      ['histogram', 'spatial_points_3d'], [43, 71]),
    'pynest/examples/spatial/test_3d_gauss.py': active(
      ['generic_distribution', 'spatial_map_3d'],
      ['cross_capability_bundle', 'multi_panel'],
      ['histogram', 'spatial_points_3d'], [43, 71]),
    'pynest/examples/store_restore_network.py': active(
      ['spike_raster', 'weight_distribution'],
      ['cross_capability_bundle', 'live_incremental_redraw', 'multi_panel', 'same_axis_overlay'],
      ['histogram', 'raster'], [227, 272, 285, 301]),
    'pynest/examples/structural_plasticity.py': active(
      ['structural_plasticity_history'],
      ['dual_y_axis', 'same_axis_overlay', 'single_panel', 'static_file_export'],
      ['line'], [266, 281]),
    'pynest/examples/sudoku/plot_progress.py': active(
      ['animation_sequence', 'categorical_state_grid', 'learning_metric_series'],
      ['animation_frames', 'cross_capability_bundle', 'multi_panel', 'static_file_export'],
      ['image', 'line'], [100, 141, 154]),
    'pynest/examples/sudoku/sudoku_solver.py': active(
      ['categorical_state_grid'], ['single_panel', 'static_file_export'], ['image'], [125, 128]),
    'pynest/examples/synapsecollection.py': active(
      ['weight_matrix'], ['color_scale', 'multi_panel'], ['heatmap'], [53, 189]),
    'pynest/examples/testiaf.py': active(
      ['analog_trace'], ['same_axis_overlay', 'single_panel'], ['line'], [104]),
    'pynest/examples/twoneurons.py': active(
      ['analog_trace'], ['single_panel'], ['line'], [84]),
    'pynest/examples/urbanczik_synapse_example.py': active(
      ['multisignal_trace', 'spike_raster', 'synaptic_weight_trace'],
      ['cross_capability_bundle', 'multi_panel', 'same_axis_overlay'],
      ['line', 'raster', 'step'], [320, 350, 354, 358]),
    'pynest/examples/vinit_example.py': active(
      ['analog_trace'], ['same_axis_overlay', 'single_panel'], ['line'], [82]),
    'pynest/examples/wang_decision_making.py': active(
      ['population_rate', 'spike_raster'],
      ['cross_capability_bundle', 'multi_panel'],
      ['bar', 'raster'], [386, 410, 418]),
  });

const SUPPORT_CLASSIFICATIONS: Readonly<Record<string, ReviewedBodyClassification>> =
  Object.freeze({
    'pynest/examples/EI_clustered_network/helper.py': active(
      ['spike_raster'], ['single_panel'], ['raster'], [142, 178]),
    'pynest/examples/EI_clustered_network/network.py': none(),
    'pynest/examples/EI_clustered_network/network_params.py': none(),
    'pynest/examples/EI_clustered_network/sim_params.py': none(),
    'pynest/examples/EI_clustered_network/stimulus_params.py': none(),
    'pynest/examples/brette_et_al_2007/brette_et_al_2007_benchmark.py': none(),
    'pynest/examples/music_cont_out_proxy_example/receiver_script.py': none(),
    'pynest/examples/pong/networks.py': none(),
    'pynest/examples/pong/pong.py': none(),
    'pynest/examples/sudoku/helpers_sudoku.py': active(
      ['categorical_state_grid'], ['single_panel'], ['image', 'line'], [310, 314]),
    'pynest/examples/sudoku/sudoku_net.py': none(),
  });

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sortedUnique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value) => right.includes(value)) &&
    right.every((value) => left.includes(value))
  );
}

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertReviewShape(
  path: string,
  review: ReviewedBodyClassification,
): void {
  const activeVisualization = review.visualizationStatus === 'active_visualization';
  if (
    activeVisualization !==
      (review.semanticDemands.length > 0 &&
        review.presentationDemands.length > 0 &&
        review.visualOperations.length > 0 &&
        review.sourceLineAnchors.length > 0)
  ) {
    throw new Error(`${path}: active visualization review fields are inconsistent`);
  }
  if (
    review.visualizationStatus === 'visualization_import_only' &&
    (review.semanticDemands.length > 0 ||
      review.presentationDemands.length > 0 ||
      review.visualOperations.length > 0 ||
      review.sourceLineAnchors.length !== 1)
  ) {
    throw new Error(`${path}: import-only review fields are inconsistent`);
  }
  if (
    review.visualizationStatus === 'no_visualization_operation' &&
    (review.semanticDemands.length > 0 ||
      review.presentationDemands.length > 0 ||
      review.visualOperations.length > 0 ||
      review.sourceLineAnchors.length > 0)
  ) {
    throw new Error(`${path}: no-visualization review fields are inconsistent`);
  }
  if (
    review.presentationDemands.includes('single_panel') ===
    review.presentationDemands.includes('multi_panel')
  ) {
    if (activeVisualization) {
      throw new Error(`${path}: active review must select exactly one panel cardinality`);
    }
  }
  if (
    review.presentationDemands.includes('cross_capability_bundle') &&
    review.semanticDemands.length < 2
  ) {
    throw new Error(`${path}: a cross-capability bundle needs at least two semantic demands`);
  }
  for (const anchor of review.sourceLineAnchors) {
    if (!Number.isSafeInteger(anchor) || anchor < 1) {
      throw new Error(`${path}: invalid source line anchor`);
    }
  }
  if (
    sortedUnique(review.semanticDemands).length !== review.semanticDemands.length ||
    sortedUnique(review.presentationDemands).length !== review.presentationDemands.length ||
    sortedUnique(review.visualOperations).length !== review.visualOperations.length ||
    [...new Set(review.sourceLineAnchors)].length !== review.sourceLineAnchors.length
  ) {
    throw new Error(`${path}: review arrays must be unique`);
  }
}

function sourceForPath(
  inventory: NestExampleSourceInventory,
  path: string,
): NestExampleSourcePath {
  const matches = inventory.sourcePaths.filter((source) => source.path === path);
  if (matches.length !== 1) {
    throw new Error(`${path}: source inventory path did not resolve exactly once`);
  }
  const source = matches[0];
  if (!source) throw new Error(`${path}: source inventory path is absent`);
  return source;
}

function bodyRecord(
  source: NestExampleSourcePath,
  review: ReviewedBodyClassification,
): JsonRecord {
  assertReviewShape(source.path, review);
  return {
    path: source.path,
    sourceId: source.sourceId,
    sha256: source.sha256,
    gitBlobSha1: source.gitBlobSha1,
    byteLength: source.byteLength,
    gitMode: source.gitMode,
    selectorMembership: [...source.selectorMembership],
    visualizationStatus: review.visualizationStatus,
    semanticDemands: sortedUnique(review.semanticDemands),
    presentationDemands: sortedUnique(review.presentationDemands),
    visualOperations: sortedUnique(review.visualOperations),
    sourceEvidence: {
      state: 'complete_pinned_source_body_review_not_executed',
      lineAnchors: [...review.sourceLineAnchors].sort((left, right) => left - right),
      lineAnchorMeaning: 'review_navigation_only_full_source_hash_is_the_byte_authority',
    },
  };
}

function classificationDigest(value: JsonRecord): string {
  const preimage: JsonRecord = { ...value };
  delete preimage.semanticBinding;
  return sha256Digest(`${DIGEST_DOMAIN}${canonicalize(preimage as never)}`);
}

export function nestExampleVisualizationCoverageDigest(value: unknown): string {
  if (!isRecord(value)) {
    throw new TypeError('NEST example visualization coverage root must be an object');
  }
  return classificationDigest(value);
}

export function buildNestExampleVisualizationCoverage(
  sourceInventory: NestExampleSourceInventory,
  documentationInventory: NestDocumentationSourceInventory,
): JsonRecord {
  const sourceProblems = validateNestExampleSourceInventory(sourceInventory);
  if (sourceProblems.length > 0) {
    throw new Error(`invalid NEST example source inventory: ${sourceProblems[0]}`);
  }
  const documentationProblems = validateNestDocumentationSourceInventory(
    documentationInventory,
  );
  if (documentationProblems.length > 0) {
    throw new Error(`invalid NEST documentation source inventory: ${documentationProblems[0]}`);
  }

  const entrypointPaths = sourceInventory.entrypoints.map(({ canonicalPath }) =>
    canonicalPath);
  const reviewedEntrypointPaths = Object.keys(ENTRYPOINT_CLASSIFICATIONS).sort();
  if (!sameStringSet(entrypointPaths, reviewedEntrypointPaths)) {
    throw new Error('reviewed entrypoint classification does not close the pinned 98-body set');
  }

  const supportSources = sourceInventory.sourcePaths
    .filter(
      ({ kind, role }) =>
        kind === 'regular_python' && role !== 'official_entrypoint',
    )
    .sort((left, right) => compareUtf16(left.path, right.path));
  const reviewedSupportPaths = Object.keys(SUPPORT_CLASSIFICATIONS).sort();
  if (!sameStringSet(supportSources.map(({ path }) => path), reviewedSupportPaths)) {
    throw new Error('reviewed support classification does not close the pinned 11-body set');
  }

  const canonicalExamples = sourceInventory.entrypoints.map((entrypoint) => {
    const source = sourceForPath(sourceInventory, entrypoint.canonicalPath);
    if (
      source.role !== 'official_entrypoint' ||
      source.canonicalSourceId !== entrypoint.canonicalSourceId
    ) {
      throw new Error(`${entrypoint.canonicalPath}: entrypoint/source identity mismatch`);
    }
    const review = ENTRYPOINT_CLASSIFICATIONS[entrypoint.canonicalPath];
    if (!review) throw new Error(`${entrypoint.canonicalPath}: review is absent`);
    return {
      entrypointId: entrypoint.entrypointId,
      canonicalSourceId: entrypoint.canonicalSourceId,
      aliasPaths: [...entrypoint.aliasPaths],
      documentationSelectedPaths: [...entrypoint.documentationSelectedPaths],
      runnerSelectedPaths: [...entrypoint.runnerSelectedPaths],
      ...bodyRecord(source, review),
    };
  });

  const supportAndCoordinatedBodies = supportSources.map((source) => {
    const review = SUPPORT_CLASSIFICATIONS[source.path];
    if (!review) throw new Error(`${source.path}: support review is absent`);
    return {
      role: source.role,
      ...bodyRecord(source, review),
    };
  });

  const countStatus = (
    rows: readonly JsonRecord[],
    status: VisualizationStatus,
  ): number => rows.filter(({ visualizationStatus }) => visualizationStatus === status).length;

  const root: JsonRecord = {
    protocol: 'cortexel-nest-example-visualization-coverage',
    protocolVersion: 2,
    description:
      'A source-only semantic visualization classification of every canonical official PyNEST example body at the exact pinned NEST 3.10 commit. It partitions canonical bodies, support/coordinated bodies, aliases, checked-in assets, and selected documentation surfaces. Candidate contract, adapter, and renderer axes are independent and transfer no execution, output, parity, or certification evidence.',
    upstream: { ...sourceInventory.upstream },
    authorities: {
      predecessor: {
        path: 'docs/audit/nest-example-coverage.v1.json',
        semanticDigest: 'sha256:1ac8b2b440e333c8be8fe250545c4ab8e8525f7664a5448e5390135c41a090fc',
        artifactSha256: 'sha256:21822081873157b58b93f449e914d6bee0f102b1590670ac568a7a6e5060853c',
        artifactByteLength: 23_522,
        evidenceTransfer: 'source_authority_only_no_visualization_evidence',
      },
      exampleSourceInventory: {
        path: 'docs/audit/nest-example-source-inventory.v2.json',
        protocol: sourceInventory.protocol,
        protocolVersion: sourceInventory.protocolVersion,
        inventoryDigest: PINNED_NEST_EXAMPLE_SOURCE_INVENTORY_DIGEST,
        artifactSha256: 'sha256:a8a7da4c62170a5405da3662dbef2602891c87cadbadd7f897196be6966928cd',
        artifactByteLength: 228_211,
      },
      documentationSourceInventory: {
        path: 'docs/audit/nest-documentation-source-inventory.v1.json',
        protocol: documentationInventory.protocol,
        protocolVersion: documentationInventory.protocolVersion,
        inventoryDigest: PINNED_NEST_DOCUMENTATION_SOURCE_INVENTORY_DIGEST,
        artifactSha256: 'sha256:d533a2f96046b484f192ed88ab70fa31d5620d48ebd647c72ec3008998f8f77c',
        artifactByteLength: 493_939,
      },
    },
    axisSemantics: {
      stableRepresentability:
        'A source-review candidate means only that a stable skill appears capable of carrying the named semantic demand. It is not an admitted example mapping or a claim about output bytes.',
      executableAdapter:
        'Only the exact nest-spike-recorder.v5 profile is packaged. No official example is asserted to satisfy that profile until a detached capture and receipt bind the example-specific source authority.',
      renderer:
        'A packaged renderer candidate can render its validated stable skill. It has not been compared with an execution-bound upstream example output.',
      upstreamParity: 'Every demand remains NOT_RUN against pinned upstream output.',
      scientificCertification:
        'Every demand remains NOT_RUN; source review and structural rendering do not certify scientific equivalence.',
    },
    semanticDemandDefinitions: SEMANTIC_DEMAND_DEFINITIONS,
    canonicalExamples,
    supportAndCoordinatedBodies,
    orchestrationAliases: sourceInventory.aliases.map((alias) => ({
      ...alias,
      classification: 'alias_not_an_additional_python_body',
    })),
    checkedInVisualAssets: sourceInventory.visualAssets.map((asset) => ({
      ...asset,
      evidenceState: 'checked_in_source_asset_not_execution_bound_output',
      semanticMapping: 'not_assessed',
      upstreamParity: 'not_run',
      scientificCertification: 'not_run',
    })),
    documentationSurfaces: {
      denominator: 'separate_selected_documentation_source_inventory_not_example_body_coverage',
      selectedBoundBlobCount: documentationInventory.summary.uniqueBoundBlobCount,
      documentationScriptFigureDefinitionCount:
        documentationInventory.summary.scriptFigureFamilyCount,
      documentationScriptActiveSaveCallCount:
        documentationInventory.summary.scriptActiveSaveCount,
      notebookStoredPngCount: documentationInventory.summary.notebookPngCount,
      notebookPlotLikePngCount: documentationInventory.summary.notebookPlotPngCount,
      publicVisualizationModuleDefinitionCount:
        documentationInventory.summary.publicVisualizationModuleCount,
      authoredDiagramDirectiveCount:
        documentationInventory.summary.authoredDiagramDirectiveCount,
      rstFigureOrImageReferenceCount:
        documentationInventory.rstDirectiveCounts.figureOrImageAssetReferences,
      evidenceState: 'source_definitions_and_stored_assets_only_not_built_or_executed',
      mappingState: 'not_assessed_in_this_example_body_classification',
      upstreamParity: 'not_run',
      scientificCertification: 'not_run',
    },
    evidenceAxes: [
      { id: 'pinned_source_body_classification', state: 'complete' },
      { id: 'execution_bound_visual_output_inventory', state: 'not_established' },
      { id: 'example_specific_stable_mapping', state: 'not_established' },
      { id: 'example_specific_executable_adapter_match', state: 'not_established' },
      { id: 'renderer_upstream_parity', state: 'not_run' },
      { id: 'upstream_execution', state: 'not_run' },
      { id: 'scientific_certification', state: 'not_run' },
    ],
    summary: {
      canonicalExampleBodyCount: canonicalExamples.length,
      canonicalActiveVisualizationBodyCount: countStatus(
        canonicalExamples,
        'active_visualization',
      ),
      canonicalVisualizationImportOnlyBodyCount: countStatus(
        canonicalExamples,
        'visualization_import_only',
      ),
      canonicalNoVisualizationBodyCount: countStatus(
        canonicalExamples,
        'no_visualization_operation',
      ),
      supportOrCoordinatedBodyCount: supportAndCoordinatedBodies.length,
      supportOrCoordinatedActiveVisualizationBodyCount: countStatus(
        supportAndCoordinatedBodies,
        'active_visualization',
      ),
      supportOrCoordinatedVisualizationImportOnlyBodyCount: countStatus(
        supportAndCoordinatedBodies,
        'visualization_import_only',
      ),
      supportOrCoordinatedNoVisualizationBodyCount: countStatus(
        supportAndCoordinatedBodies,
        'no_visualization_operation',
      ),
      regularPythonBodyCount:
        canonicalExamples.length + supportAndCoordinatedBodies.length,
      regularPythonActiveVisualizationBodyCount:
        countStatus(canonicalExamples, 'active_visualization') +
        countStatus(supportAndCoordinatedBodies, 'active_visualization'),
      regularPythonVisualizationImportOnlyBodyCount:
        countStatus(canonicalExamples, 'visualization_import_only') +
        countStatus(supportAndCoordinatedBodies, 'visualization_import_only'),
      regularPythonNoVisualizationBodyCount:
        countStatus(canonicalExamples, 'no_visualization_operation') +
        countStatus(supportAndCoordinatedBodies, 'no_visualization_operation'),
      orchestrationAliasCount: sourceInventory.aliases.length,
      runnerTargetProfileCount: sourceInventory.invocationProfiles.length,
      checkedInVisualAssetCount: sourceInventory.visualAssets.length,
      semanticDemandDefinitionCount: SEMANTIC_DEMAND_DEFINITIONS.length,
      executionBoundVisualOutputCount: 0,
      exampleSpecificMappedOutputCount: 0,
      exampleSpecificExecutableAdapterMatchCount: 0,
      rendererUpstreamParityResultCount: 0,
      upstreamExecutedOutputCount: 0,
      scientificallyCertifiedOutputCount: 0,
      coverageClaim: 'source_semantic_classification_only',
    },
    limitations: [
      'The review classifies exact pinned source bodies and representative source line anchors. Line anchors are navigation aids; the full source SHA-256 and Git blob identity are the byte authority.',
      'Static source review can identify declared plotting intent but cannot establish which branch executes, whether a figure is nonempty, what output bytes are emitted, or whether the source completes successfully.',
      'A source-review stable skill candidate is not an admitted mapping. No example-specific FigureRequest, adapter input, output artifact, or custody receipt is present in this artifact.',
      'The 92 default-runner profiles are a separate selector denominator. Runner selection neither adds canonical bodies nor proves execution.',
      'The 12 checked-in example-tree assets and selected documentation surfaces are separate source inventories. Their presence does not make them outputs of an example or semantic parity references.',
      'Every upstream execution, renderer parity, and scientific-certification count is zero. This artifact must not be described as complete visualization support for NEST.',
    ],
  };
  const digest = classificationDigest(root);
  root.semanticBinding = {
    identityAlgorithm: NEST_EXAMPLE_VISUALIZATION_COVERAGE_IDENTITY,
    digestScope: 'all_top_level_members_except_semanticBinding',
    semanticDigest: digest,
  };
  return root;
}

function schemaProblems(value: unknown, schema: unknown): string[] {
  if (!isRecord(schema)) return ['coverage-v2 schema root must be an object'];
  try {
    const validate = new Ajv2020({
      allErrors: true,
      strict: true,
      validateSchema: true,
    }).compile(schema);
    if (validate(value)) return [];
    return (validate.errors ?? []).slice(0, 64).map(
      (error) => `schema ${error.instancePath || '/'} ${error.message ?? error.keyword}`,
    );
  } catch {
    return ['coverage-v2 schema is not strict-compilable'];
  }
}

export function validateNestExampleVisualizationCoverage(
  value: unknown,
  schema: unknown,
  sourceInventory: unknown,
  documentationInventory: unknown,
  rawUtf8?: string,
): readonly string[] {
  const problems = schemaProblems(value, schema);
  const sourceProblems = validateNestExampleSourceInventory(sourceInventory);
  const documentationProblems = validateNestDocumentationSourceInventory(
    documentationInventory,
  );
  problems.push(...sourceProblems.map((problem) => `source inventory: ${problem}`));
  problems.push(...documentationProblems.map((problem) =>
    `documentation inventory: ${problem}`));
  if (
    sourceProblems.length > 0 ||
    documentationProblems.length > 0 ||
    !isRecord(value)
  ) {
    return [...new Set(problems)].sort().slice(0, 64);
  }

  try {
    if (
      rawUtf8 !== undefined &&
      rawUtf8 !== `${canonicalize(value as never)}\n`
    ) {
      problems.push('coverage-v2 artifact bytes are not exact canonical JSON plus one newline');
    }
    const expected = buildNestExampleVisualizationCoverage(
      sourceInventory as NestExampleSourceInventory,
      documentationInventory as NestDocumentationSourceInventory,
    );
    if (canonicalize(value as never) !== canonicalize(expected as never)) {
      problems.push('coverage-v2 value drifted from the closed reviewed projection');
    }
    const computed = nestExampleVisualizationCoverageDigest(value);
    const binding = isRecord(value.semanticBinding) ? value.semanticBinding : {};
    if (binding.semanticDigest !== computed) {
      problems.push('coverage-v2 semantic binding does not match its canonical preimage');
    }
    if (computed !== PINNED_NEST_EXAMPLE_VISUALIZATION_COVERAGE_DIGEST) {
      problems.push('coverage-v2 reviewed semantic digest drifted');
    }
  } catch (error) {
    problems.push(
      `coverage-v2 closed projection failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }

  return [...new Set(problems)].sort().slice(0, 64);
}
