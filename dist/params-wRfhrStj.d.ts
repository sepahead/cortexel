import { z } from 'zod';

/** Public validation budgets. Hosts with larger corpora should pass handles or
 *  pre-aggregate instead of sending an unbounded inline payload to a browser. */
declare const PARAM_LIMITS: Readonly<{
    maxSamples: 50000;
    maxSeries: 256;
    maxSpatialObjects: 50000;
    maxGraphNodes: 1000;
    maxGraphEdges: 4000;
}>;
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
}, z.core.$strict>;
type NetworkParams = z.infer<typeof NetworkParamsSchema>;
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
declare const KnowledgeGraph3DParamsSchema: z.ZodObject<{
    nodes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<{
            paper: "paper";
            model: "model";
            family: "family";
        }>;
        label: z.ZodString;
    }, z.core.$strict>>;
    edges: z.ZodArray<z.ZodObject<{
        source: z.ZodString;
        target: z.ZodString;
        kind: z.ZodEnum<{
            cites: "cites";
            same_as: "same_as";
            variant_of: "variant_of";
            instantiates: "instantiates";
            belongs_to_family: "belongs_to_family";
        }>;
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
    correlation: z.ZodArray<z.ZodNumber>;
    normalization: z.ZodEnum<{
        pearson_coefficient: "pearson_coefficient";
        raw_pair_count: "raw_pair_count";
        count_per_bin: "count_per_bin";
        rate_hz: "rate_hz";
    }>;
    correlation_units: z.ZodEnum<{
        1: "1";
        count: "count";
        "count/bin": "count/bin";
        Hz: "Hz";
    }>;
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

export { type AnimationReplayParams as A, type CompartmentalParams as C, type KnowledgeGraph3DParams as K, type NetworkParams as N, PARAM_LIMITS as P, type RateResponseParams as R, type Spatial2DParams as S, type VoltageTraceParams as V, AnimationReplayParamsSchema as a, type AstrocyteParams as b, AstrocyteParamsSchema as c, CompartmentalParamsSchema as d, type CorrelogramParams as e, CorrelogramParamsSchema as f, KnowledgeGraph3DParamsSchema as g, NetworkParamsSchema as h, type PhasePlaneParams as i, PhasePlaneParamsSchema as j, type PlasticityParams as k, PlasticityParamsSchema as l, RateResponseParamsSchema as m, Spatial2DParamsSchema as n, type Spatial3DParams as o, Spatial3DParamsSchema as p, type SpikeRasterParams as q, SpikeRasterParamsSchema as r, type StimulusResponseParams as s, StimulusResponseParamsSchema as t, VoltageTraceParamsSchema as u };
