import { z } from 'zod';

/** Public validation budgets. Hosts with larger corpora should pass handles or
 *  pre-aggregate instead of sending an unbounded inline payload to a browser. */
declare const PARAM_LIMITS: Readonly<{
    maxSamples: 50000;
    maxSeries: 256;
    maxTopologyNodes: 25000;
    maxTopologyEdges: 20000;
    maxSpatialObjects: 50000;
    maxGraphNodes: 1000;
    maxGraphEdges: 4000;
}>;
/** RFC 3339 timestamp with a required seconds component and explicit UTC/
 * numeric offset. Zod's ISO datetime check validates calendar dates and offset
 * ranges; the second pattern closes its optional-seconds extension so portable
 * hosts receive the same strict contract. */
declare const Rfc3339TimestampSchema: z.ZodISODateTime;
declare const VoltageTraceParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    series: z.ZodArray<z.ZodArray<z.ZodNumber>>;
    series_labels: z.ZodArray<z.ZodString>;
    units: z.ZodString;
}, z.core.$strict>;
type VoltageTraceParams = z.infer<typeof VoltageTraceParamsSchema>;
declare const SpikeRasterParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    senders: z.ZodArray<z.ZodNumber>;
}, z.core.$strict>;
type SpikeRasterParams = z.infer<typeof SpikeRasterParamsSchema>;
/** Portable tolerances shared by the TypeScript gate and manifest constraints.
 * Geometry is purely scale-relative: a fixed absolute epsilon would have physical
 * units and could dwarf a legitimately tiny time or weight bin. Normalized-mass
 * comparisons use a wider tolerance because they accumulate many binary64 values. */
declare const HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE = 0;
declare const HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE = 1e-9;
/** Bounded allowance for binary64 center ± half-width edge arithmetic. */
declare const HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS = 4;
/** No geometry repair may move a boundary by more than this fraction of its
 * local bin width or half-extent, regardless of absolute coordinate origin. */
declare const GEOMETRY_MAX_ROUNDOFF_FRACTION = 1e-7;
declare const HISTOGRAM_MASS_TOLERANCE = 0.000001;
declare const PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE = 0.000001;
/** Population-rate values are derived from integer event counts. Binary64
 * hosts compare the published rate with the specified operation order and this
 * mixed tolerance; a relative component is necessary for legitimately high
 * rates while the absolute term keeps zero/small rates stable. */
declare const POPULATION_RATE_ABSOLUTE_TOLERANCE = 1e-9;
declare const POPULATION_RATE_RELATIVE_TOLERANCE = 1e-9;
declare const IsiDistributionParamsSchema: z.ZodObject<{
    bin_centers_ms: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    bin_width_ms: z.ZodNumber;
    normalization: z.ZodEnum<{
        count: "count";
        probability: "probability";
        probability_density: "probability_density";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        probability: "probability";
        "1/ms": "1/ms";
    }>;
    interval_scope: z.ZodEnum<{
        per_sender: "per_sender";
        single_train: "single_train";
    }>;
}, z.core.$strict>;
type IsiDistributionParams = z.infer<typeof IsiDistributionParamsSchema>;
declare const PsthParamsSchema: z.ZodObject<{
    bin_centers_ms: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    bin_width_ms: z.ZodNumber;
    normalization: z.ZodEnum<{
        count: "count";
        count_per_trial: "count_per_trial";
        rate_hz: "rate_hz";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        "count/trial": "count/trial";
        Hz: "Hz";
    }>;
    trial_count: z.ZodNumber;
    alignment_event: z.ZodString;
    aggregation: z.ZodLiteral<"selected_senders_per_trial">;
}, z.core.$strict>;
type PsthParams = z.infer<typeof PsthParamsSchema>;
declare const PopulationRateParamsSchema: z.ZodObject<{
    bin_centers_ms: z.ZodArray<z.ZodNumber>;
    bin_width_ms: z.ZodNumber;
    window_start_ms: z.ZodNumber;
    window_stop_ms: z.ZodNumber;
    series: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        recorded_sender_count: z.ZodNumber;
        spike_counts: z.ZodArray<z.ZodNumber>;
        rates_hz: z.ZodArray<z.ZodNumber>;
    }, z.core.$strict>>;
    normalization: z.ZodLiteral<"mean_per_recorded_sender_hz">;
    aggregation: z.ZodLiteral<"selected_senders">;
    binning: z.ZodLiteral<"left_closed_right_open">;
}, z.core.$strict>;
type PopulationRateParams = z.infer<typeof PopulationRateParamsSchema>;
declare const RateResponseParamsSchema: z.ZodObject<{
    stimulus_amplitudes: z.ZodArray<z.ZodNumber>;
    rates_hz: z.ZodArray<z.ZodNumber>;
    stimulus_units: z.ZodString;
}, z.core.$strict>;
type RateResponseParams = z.infer<typeof RateResponseParamsSchema>;
declare const NetworkParamsSchema: z.ZodObject<{
    sources: z.ZodArray<z.ZodNumber>;
    targets: z.ZodArray<z.ZodNumber>;
    weights: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    delays: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    weight_units: z.ZodOptional<z.ZodString>;
    delay_units: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
type NetworkParams = z.infer<typeof NetworkParamsSchema>;
declare const SnapshotScopeSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"single_process_complete">;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"mpi_target_rank_local">;
    rank: z.ZodNumber;
    world_size: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"mpi_all_ranks_merged">;
    world_size: z.ZodNumber;
}, z.core.$strict>], "kind">;
type SnapshotScope = z.infer<typeof SnapshotScopeSchema>;
declare const PositionScopeSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"single_process_complete">;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"mpi_rank_local">;
    rank: z.ZodNumber;
    world_size: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"mpi_all_ranks_merged">;
    world_size: z.ZodNumber;
}, z.core.$strict>], "kind">;
type PositionScope = z.infer<typeof PositionScopeSchema>;
declare const ConnectionGraphParamsSchema: z.ZodObject<{
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        label: z.ZodString;
    }, z.core.$strict>>;
    edges: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        source: z.ZodNumber;
        target: z.ZodNumber;
        weight: z.ZodOptional<z.ZodNumber>;
        delay_ms: z.ZodOptional<z.ZodNumber>;
        synapse_model: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    weight_units: z.ZodOptional<z.ZodString>;
    delay_units: z.ZodOptional<z.ZodLiteral<"ms">>;
    layout: z.ZodLiteral<"schematic_circle">;
    parallel_edges: z.ZodLiteral<"preserved">;
    self_connections: z.ZodLiteral<"preserved">;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
    sample_policy: z.ZodEnum<{
        complete: "complete";
        deterministic_even_stride: "deterministic_even_stride";
    }>;
    source_connection_count: z.ZodNumber;
    edge_identity: z.ZodEnum<{
        nest_connection_identifier: "nest_connection_identifier";
        canonical_sorted_ordinal: "canonical_sorted_ordinal";
    }>;
}, z.core.$strict>;
type ConnectionGraphParams = z.infer<typeof ConnectionGraphParamsSchema>;
declare const AdjacencyMatrixParamsSchema: z.ZodObject<{
    cells: z.ZodArray<z.ZodObject<{
        source_id: z.ZodNumber;
        target_id: z.ZodNumber;
        connection_count: z.ZodNumber;
    }, z.core.$strict>>;
    display: z.ZodLiteral<"binary_presence">;
    aggregation: z.ZodLiteral<"any_connection">;
    source_ids: z.ZodArray<z.ZodNumber>;
    target_ids: z.ZodArray<z.ZodNumber>;
    axis_order: z.ZodLiteral<"target_rows_source_columns">;
    absent_cell: z.ZodLiteral<"no_connection">;
    sample_policy: z.ZodLiteral<"complete">;
    connection_count: z.ZodNumber;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type AdjacencyMatrixParams = z.infer<typeof AdjacencyMatrixParamsSchema>;
declare const WeightMatrixParamsSchema: z.ZodObject<{
    cells: z.ZodArray<z.ZodObject<{
        source_id: z.ZodNumber;
        target_id: z.ZodNumber;
        connection_count: z.ZodNumber;
        value: z.ZodNumber;
    }, z.core.$strict>>;
    weight_units: z.ZodString;
    aggregation: z.ZodEnum<{
        minimum: "minimum";
        maximum: "maximum";
        sum: "sum";
        mean: "mean";
        single_connection: "single_connection";
    }>;
    source_ids: z.ZodArray<z.ZodNumber>;
    target_ids: z.ZodArray<z.ZodNumber>;
    axis_order: z.ZodLiteral<"target_rows_source_columns">;
    absent_cell: z.ZodLiteral<"no_connection">;
    sample_policy: z.ZodLiteral<"complete">;
    connection_count: z.ZodNumber;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type WeightMatrixParams = z.infer<typeof WeightMatrixParamsSchema>;
declare const DelayMatrixParamsSchema: z.ZodObject<{
    cells: z.ZodArray<z.ZodObject<{
        source_id: z.ZodNumber;
        target_id: z.ZodNumber;
        connection_count: z.ZodNumber;
        value: z.ZodNumber;
    }, z.core.$strict>>;
    delay_units: z.ZodLiteral<"ms">;
    aggregation: z.ZodEnum<{
        minimum: "minimum";
        maximum: "maximum";
        mean: "mean";
        single_connection: "single_connection";
    }>;
    source_ids: z.ZodArray<z.ZodNumber>;
    target_ids: z.ZodArray<z.ZodNumber>;
    axis_order: z.ZodLiteral<"target_rows_source_columns">;
    absent_cell: z.ZodLiteral<"no_connection">;
    sample_policy: z.ZodLiteral<"complete">;
    connection_count: z.ZodNumber;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type DelayMatrixParams = z.infer<typeof DelayMatrixParamsSchema>;
declare const InDegreeDistributionParamsSchema: z.ZodObject<{
    degrees: z.ZodArray<z.ZodNumber>;
    node_counts: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    node_count: z.ZodNumber;
    connection_count: z.ZodNumber;
    direction: z.ZodLiteral<"in">;
    normalization: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    edge_counting: z.ZodLiteral<"each_synapse_collection_entry">;
    zero_degree_policy: z.ZodLiteral<"include_declared_universe">;
    sample_policy: z.ZodLiteral<"complete">;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type InDegreeDistributionParams = z.infer<typeof InDegreeDistributionParamsSchema>;
declare const OutDegreeDistributionParamsSchema: z.ZodObject<{
    degrees: z.ZodArray<z.ZodNumber>;
    node_counts: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    node_count: z.ZodNumber;
    connection_count: z.ZodNumber;
    direction: z.ZodLiteral<"out">;
    normalization: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    edge_counting: z.ZodLiteral<"each_synapse_collection_entry">;
    zero_degree_policy: z.ZodLiteral<"include_declared_universe">;
    sample_policy: z.ZodLiteral<"complete">;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type OutDegreeDistributionParams = z.infer<typeof OutDegreeDistributionParamsSchema>;
declare const DelayDistributionParamsSchema: z.ZodObject<{
    bin_centers_ms: z.ZodArray<z.ZodNumber>;
    delay_counts: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    bin_width_ms: z.ZodNumber;
    window_start_ms: z.ZodNumber;
    window_stop_ms: z.ZodNumber;
    normalization: z.ZodEnum<{
        count: "count";
        probability: "probability";
        probability_density: "probability_density";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        probability: "probability";
        "1/ms": "1/ms";
    }>;
    delay_units: z.ZodLiteral<"ms">;
    aggregation: z.ZodLiteral<"each_connection">;
    binning: z.ZodLiteral<"left_closed_right_open">;
    sample_policy: z.ZodLiteral<"complete">;
    connection_count: z.ZodNumber;
    snapshot_time_ms: z.ZodNumber;
    snapshot_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_target_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type DelayDistributionParams = z.infer<typeof DelayDistributionParamsSchema>;
/** Spatial bounds use a dimensionless extent-relative tolerance plus a small,
 * explicitly bounded allowance for the two binary64 operations that derive an
 * axis bound from center ± extent/2. */
declare const SPATIAL_BOUNDS_ROUNDOFF_ULPS = 2;
declare const SpatialMap2DParamsSchema: z.ZodObject<{
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        label: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strict>>;
    coordinate_units: z.ZodString;
    extent: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    center: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    edge_wrap: z.ZodBoolean;
    position_scope: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"single_process_complete">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_rank_local">;
        rank: z.ZodNumber;
        world_size: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"mpi_all_ranks_merged">;
        world_size: z.ZodNumber;
    }, z.core.$strict>], "kind">;
    marker_size: z.ZodLiteral<"fixed_screen_space">;
}, z.core.$strict>;
type SpatialMap2DParams = z.infer<typeof SpatialMap2DParamsSchema>;
declare const WeightHistogramParamsSchema: z.ZodObject<{
    bin_centers: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    bin_width: z.ZodNumber;
    weight_units: z.ZodString;
    normalization: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    value_units: z.ZodEnum<{
        count: "count";
        probability: "probability";
    }>;
    snapshot_time_ms: z.ZodNumber;
}, z.core.$strict>;
type WeightHistogramParams = z.infer<typeof WeightHistogramParamsSchema>;
declare const Spatial3DParamsSchema: z.ZodObject<{
    objects: z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, z.core.$loose>>;
    coordinate_units: z.ZodString;
}, z.core.$strict>;
type Spatial3DParams = z.infer<typeof Spatial3DParamsSchema>;
declare const PlasticityParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    weights: z.ZodArray<z.ZodNumber>;
    weight_units: z.ZodString;
}, z.core.$strict>;
type PlasticityParams = z.infer<typeof PlasticityParamsSchema>;
declare const PhasePlaneParamsSchema: z.ZodObject<{
    grid: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodNumber>>;
    derivatives: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodNumber>>;
    axis_units: z.ZodRecord<z.ZodString, z.ZodString>;
    derivative_units: z.ZodRecord<z.ZodString, z.ZodString>;
    axis_order: z.ZodTuple<[z.ZodString, z.ZodString], null>;
    flattening: z.ZodLiteral<"row-major-last-axis-fastest">;
}, z.core.$strict>;
type PhasePlaneParams = z.infer<typeof PhasePlaneParamsSchema>;
declare const AstrocyteParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    ca_trace: z.ZodArray<z.ZodNumber>;
    units: z.ZodString;
}, z.core.$strict>;
type AstrocyteParams = z.infer<typeof AstrocyteParamsSchema>;
declare const CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS: readonly ["paper", "model", "family"];
declare const CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS: readonly ["cites", "same_as", "variant_of", "instantiates", "belongs_to_family"];
declare const KNOWLEDGE_GRAPH_LIMITS: Readonly<{
    maxAttributes: 24;
    maxAttributeArrayItems: 16;
    maxEvidenceRefsPerElement: 8;
    maxParallelEdgesPerPair: 9;
    maxDetailLength: 1000;
    maxAttributeStringLength: 500;
    maxExcerptLength: 1000;
}>;
declare const KnowledgeGraph3DParamsSchema: z.ZodObject<{
    graph_id: z.ZodString;
    graph_source: z.ZodString;
    graph_snapshot_id: z.ZodString;
    graph_scope: z.ZodLiteral<"corpus_entity">;
    generated_at: z.ZodISODateTime;
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<{
            paper: "paper";
            model: "model";
            family: "family";
        }>;
        label: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        attributes: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>, z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>]>>;
        epistemic: z.ZodObject<{
            status: z.ZodLiteral<"derived_advisory">;
            advisory_only: z.ZodLiteral<true>;
            is_paper_local_evidence: z.ZodLiteral<false>;
            calibrated_posterior: z.ZodLiteral<false>;
        }, z.core.$strict>;
        evidence: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"graph_snapshot_record">;
            evidence_id: z.ZodString;
            record_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"graph_node">;
            evidence_id: z.ZodString;
            node_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"citation">;
            evidence_id: z.ZodString;
            paper_id: z.ZodString;
            citation_id: z.ZodString;
            page: z.ZodOptional<z.ZodNumber>;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
            doi: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"external_source">;
            evidence_id: z.ZodString;
            source_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>], "kind">>;
        uncalibrated_score: z.ZodOptional<z.ZodObject<{
            kind: z.ZodEnum<{
                extraction_confidence: "extraction_confidence";
                citation_resolution_confidence: "citation_resolution_confidence";
                structural_similarity: "structural_similarity";
                behavioral_agreement: "behavioral_agreement";
                retrieval_relevance: "retrieval_relevance";
            }>;
            value: z.ZodNumber;
            calibrated_posterior: z.ZodLiteral<false>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    edges: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        source: z.ZodString;
        target: z.ZodString;
        kind: z.ZodEnum<{
            cites: "cites";
            same_as: "same_as";
            variant_of: "variant_of";
            instantiates: "instantiates";
            belongs_to_family: "belongs_to_family";
        }>;
        label: z.ZodString;
        attributes: z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>, z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>]>>;
        epistemic: z.ZodObject<{
            status: z.ZodLiteral<"derived_advisory">;
            advisory_only: z.ZodLiteral<true>;
            is_paper_local_evidence: z.ZodLiteral<false>;
            calibrated_posterior: z.ZodLiteral<false>;
        }, z.core.$strict>;
        evidence: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"graph_snapshot_record">;
            evidence_id: z.ZodString;
            record_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"graph_node">;
            evidence_id: z.ZodString;
            node_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"citation">;
            evidence_id: z.ZodString;
            paper_id: z.ZodString;
            citation_id: z.ZodString;
            page: z.ZodOptional<z.ZodNumber>;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
            doi: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"external_source">;
            evidence_id: z.ZodString;
            source_id: z.ZodString;
            locator: z.ZodOptional<z.ZodString>;
            excerpt: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>], "kind">>;
        uncalibrated_score: z.ZodOptional<z.ZodObject<{
            kind: z.ZodEnum<{
                extraction_confidence: "extraction_confidence";
                citation_resolution_confidence: "citation_resolution_confidence";
                structural_similarity: "structural_similarity";
                behavioral_agreement: "behavioral_agreement";
                retrieval_relevance: "retrieval_relevance";
            }>;
            value: z.ZodNumber;
            calibrated_posterior: z.ZodLiteral<false>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
type KnowledgeGraph3DParams = z.infer<typeof KnowledgeGraph3DParamsSchema>;
declare const Spatial2DParamsSchema: z.ZodObject<{
    positions: z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    coordinate_units: z.ZodString;
}, z.core.$strict>;
type Spatial2DParams = z.infer<typeof Spatial2DParamsSchema>;
declare const CorrelogramParamsSchema: z.ZodObject<{
    lags_ms: z.ZodArray<z.ZodNumber>;
    values: z.ZodArray<z.ZodNumber>;
    bin_width_ms: z.ZodNumber;
    tau_max_ms: z.ZodNumber;
    counting_start_ms: z.ZodNumber;
    counting_stop_ms: z.ZodNumber;
    pair: z.ZodObject<{
        reference_label: z.ZodString;
        target_label: z.ZodString;
    }, z.core.$strict>;
    lag_convention: z.ZodLiteral<"positive_target_after_reference">;
    binning: z.ZodLiteral<"left_closed_right_open">;
    zero_lag_policy: z.ZodEnum<{
        included: "included";
        excluded_self_pairs: "excluded_self_pairs";
    }>;
    statistic: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"raw_pair_count">;
        units: z.ZodLiteral<"count">;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"weighted_pair_sum">;
        units: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"pair_rate_hz">;
        units: z.ZodLiteral<"Hz">;
        exposure_s: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"pearson_coefficient">;
        units: z.ZodLiteral<"1">;
        sample_count: z.ZodNumber;
    }, z.core.$strict>], "kind">;
}, z.core.$strict>;
type CorrelogramParams = z.infer<typeof CorrelogramParamsSchema>;
declare const StimulusResponseParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    stimulus: z.ZodArray<z.ZodNumber>;
    response: z.ZodArray<z.ZodNumber>;
}, z.core.$strict>;
type StimulusResponseParams = z.infer<typeof StimulusResponseParamsSchema>;
declare const CompartmentalParamsSchema: z.ZodObject<{
    times_ms: z.ZodArray<z.ZodNumber>;
    compartments: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        parent_id: z.ZodNullable<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        values: z.ZodArray<z.ZodNumber>;
    }, z.core.$strict>>;
}, z.core.$strict>;
type CompartmentalParams = z.infer<typeof CompartmentalParamsSchema>;
declare const AnimationReplayParamsSchema: z.ZodObject<{
    frames: z.ZodArray<z.ZodObject<{
        time_ms: z.ZodNumber;
        state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        annotation: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
type AnimationReplayParams = z.infer<typeof AnimationReplayParamsSchema>;

export { Rfc3339TimestampSchema as $, type AdjacencyMatrixParams as A, NetworkParamsSchema as B, CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS as C, type DelayDistributionParams as D, OutDegreeDistributionParamsSchema as E, PARAM_LIMITS as F, GEOMETRY_MAX_ROUNDOFF_FRACTION as G, HISTOGRAM_GEOMETRY_ABSOLUTE_TOLERANCE as H, type IsiDistributionParams as I, POPULATION_RATE_ABSOLUTE_TOLERANCE as J, type KnowledgeGraph3DParams as K, POPULATION_RATE_RELATIVE_TOLERANCE as L, PSTH_DERIVED_COUNT_ABSOLUTE_TOLERANCE as M, type NetworkParams as N, type OutDegreeDistributionParams as O, type PopulationRateParams as P, type PhasePlaneParams as Q, PhasePlaneParamsSchema as R, type SnapshotScope as S, type PlasticityParams as T, PlasticityParamsSchema as U, PopulationRateParamsSchema as V, type WeightMatrixParams as W, PositionScopeSchema as X, PsthParamsSchema as Y, type RateResponseParams as Z, RateResponseParamsSchema as _, CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS as a, SPATIAL_BOUNDS_ROUNDOFF_ULPS as a0, SnapshotScopeSchema as a1, type Spatial2DParams as a2, Spatial2DParamsSchema as a3, type Spatial3DParams as a4, Spatial3DParamsSchema as a5, SpatialMap2DParamsSchema as a6, type SpikeRasterParams as a7, SpikeRasterParamsSchema as a8, type StimulusResponseParams as a9, StimulusResponseParamsSchema as aa, type VoltageTraceParams as ab, VoltageTraceParamsSchema as ac, type WeightHistogramParams as ad, WeightHistogramParamsSchema as ae, WeightMatrixParamsSchema as af, type CorrelogramParams as b, type PsthParams as c, type PositionScope as d, type SpatialMap2DParams as e, type ConnectionGraphParams as f, type DelayMatrixParams as g, type InDegreeDistributionParams as h, AdjacencyMatrixParamsSchema as i, type AnimationReplayParams as j, AnimationReplayParamsSchema as k, type AstrocyteParams as l, AstrocyteParamsSchema as m, type CompartmentalParams as n, CompartmentalParamsSchema as o, ConnectionGraphParamsSchema as p, CorrelogramParamsSchema as q, DelayDistributionParamsSchema as r, DelayMatrixParamsSchema as s, HISTOGRAM_GEOMETRY_RELATIVE_TOLERANCE as t, HISTOGRAM_GEOMETRY_ROUNDOFF_ULPS as u, HISTOGRAM_MASS_TOLERANCE as v, InDegreeDistributionParamsSchema as w, IsiDistributionParamsSchema as x, KNOWLEDGE_GRAPH_LIMITS as y, KnowledgeGraph3DParamsSchema as z };
