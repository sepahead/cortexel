'use strict';

var react = require('react');
var fiber = require('@react-three/fiber');
var THREE = require('three');
var jsxRuntime = require('react/jsx-runtime');
var zod = require('zod');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var THREE__namespace = /*#__PURE__*/_interopNamespace(THREE);

// react/usePopulationExpand.ts
function usePopulationExpand(controlled) {
  const [localSelected, setLocalSelected] = react.useState(null);
  const [localHovered, setLocalHovered] = react.useState(null);
  const selectedPopId = controlled ? controlled.selectedPopId : localSelected;
  const hoveredPopId = controlled ? controlled.hoveredPopId : localHovered;
  const setSelectedPopId = controlled ? controlled.setSelectedPopId : setLocalSelected;
  const setHoveredPopId = controlled ? controlled.setHoveredPopId : setLocalHovered;
  const toggleSelected = react.useCallback(
    (id) => setSelectedPopId(selectedPopId === id ? null : id),
    [selectedPopId, setSelectedPopId]
  );
  const reset = react.useCallback(() => {
    setSelectedPopId(null);
    setHoveredPopId(null);
  }, [setSelectedPopId, setHoveredPopId]);
  return {
    selectedPopId,
    hoveredPopId,
    setSelectedPopId,
    setHoveredPopId,
    isSelected: (id) => selectedPopId === id,
    isHovered: (id) => hoveredPopId === id,
    isAnySelected: () => selectedPopId !== null,
    toggleSelected,
    reset
  };
}
function ExpandablePopulation({
  position,
  color,
  isSelected,
  isAnySelected,
  isHovered,
  onHover,
  onClick,
  themeMode,
  size = 0.3,
  reducedMotion = false
}) {
  const meshRef = react.useRef(null);
  const ringRef = react.useRef(null);
  const scaleRef = react.useRef(1);
  const opacityRef = react.useRef(1);
  const colorObj = react.useMemo(() => new THREE__namespace.Color(color), [color]);
  const voxelColor = react.useMemo(() => colorObj.clone().multiplyScalar(0.82), [colorObj]);
  const ringColor = react.useMemo(
    () => themeMode === "light" ? colorObj.clone().multiplyScalar(0.8) : colorObj.clone().multiplyScalar(1.15),
    // bloom-safe cap (was 1.25)
    [colorObj, themeMode]
  );
  const ringInner = size * 0.867;
  const ringOuter = size * 1.067;
  fiber.useFrame((state, delta) => {
    let targetScale = 1;
    let targetOpacity = 1;
    if (isSelected) {
      targetScale = 0;
      targetOpacity = 0;
    } else if (isAnySelected) {
      targetScale = 0.5;
      targetOpacity = 0.05;
    } else if (isHovered) {
      targetScale = 1.25;
      targetOpacity = 1;
    }
    const lerp = reducedMotion ? 1 : 0.15;
    scaleRef.current += (targetScale - scaleRef.current) * lerp;
    opacityRef.current += (targetOpacity - opacityRef.current) * lerp;
    if (meshRef.current) {
      const breathe = reducedMotion ? 1 : 1 + Math.sin(state.clock.elapsedTime * 4) * 0.06 * (isHovered ? 1.5 : 1);
      meshRef.current.scale.setScalar(scaleRef.current * breathe);
      const mat = meshRef.current.material;
      mat.opacity = opacityRef.current;
    }
    if (ringRef.current && opacityRef.current > 0.01) {
      const ringMat = ringRef.current.material;
      if (reducedMotion) {
        ringRef.current.scale.set(scaleRef.current, scaleRef.current, 1);
        ringMat.opacity = opacityRef.current * 0.25;
      } else {
        const ringTime = state.clock.elapsedTime * 1.5 % 1;
        const ringScale = scaleRef.current * (1 + ringTime * 1.2);
        ringRef.current.scale.set(ringScale, ringScale, 1);
        ringMat.opacity = opacityRef.current * (1 - ringTime) * 0.4;
      }
    }
  });
  return /* @__PURE__ */ jsxRuntime.jsxs("group", { position, children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      "mesh",
      {
        ref: meshRef,
        onPointerOver: (e) => {
          e.stopPropagation();
          onHover(true);
        },
        onPointerOut: () => {
          onHover(false);
        },
        onClick: (e) => {
          e.stopPropagation();
          onClick();
        },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx("boxGeometry", { args: [size, size, size] }),
          /* @__PURE__ */ jsxRuntime.jsx("meshBasicMaterial", { color: voxelColor, transparent: true, toneMapped: true, fog: false })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs("mesh", { ref: ringRef, rotation: [-Math.PI / 2, 0, 0], children: [
      /* @__PURE__ */ jsxRuntime.jsx("ringGeometry", { args: [ringInner, ringOuter, 32] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "meshBasicMaterial",
        {
          color: ringColor,
          transparent: true,
          depthWrite: false,
          side: THREE__namespace.DoubleSide
        }
      )
    ] })
  ] });
}
function requiresHonestyCaption(p) {
  return !!p.synthetic || !p.calibrated_posterior || p.advisory_only || !p.is_paper_local_evidence;
}
function defaultHonestyCaption(p) {
  if (p.caption) return p.caption;
  if (p.synthetic || p.source === "synthetic_test" || p.source.startsWith("synthetic")) {
    return "Schematic \u2014 illustrative synthetic data, not measured.";
  }
  if (!p.is_paper_local_evidence) {
    return "Advisory \u2014 not paper-local evidence; candidate ranking only.";
  }
  return "Illustrative \u2014 not a calibrated posterior.";
}

// core/designLaws.ts
var SCENE_NAMES = [
  "live-activity",
  "cortical-column",
  "stdp",
  "spike-raster",
  "network-topology",
  "voltage-trace",
  "phase-plane",
  "brunel-network",
  "fi-curve",
  "isi-distribution",
  "psth",
  "weight-histogram"
];
var PROVENANCE_KEYS = [
  "device_id",
  "recorded_variable",
  "units",
  "sampling_interval",
  "recorder_id",
  "sender_ids",
  "population_labels",
  "time_units",
  "source_ids",
  "target_ids",
  "synapse_model",
  "weight_units",
  "extent",
  "mask",
  "kernel",
  "projection_sample_policy",
  "morphology_disclaimer",
  "frame_rate",
  "state_variables",
  "bin_ms",
  "pair_labels",
  "stim_units",
  "rate_normalization"
];
var ProvenanceKeyEnum = zod.z.enum(PROVENANCE_KEYS);

// core/vizSpec.ts
var ProvenanceSchema = zod.z.object({
  source: zod.z.string().min(1).max(200),
  calibrated_posterior: zod.z.boolean().default(false),
  // fail-closed
  advisory_only: zod.z.boolean().default(false),
  is_paper_local_evidence: zod.z.boolean().default(false),
  caption: zod.z.string().max(500).optional(),
  /** Machine-checkable record of the inputs an agent declared (keyed by
   *  ProvenanceKey). validateSkillInvocation requires the keys a skill's
   *  honesty contract demands. Presence-checked here; value truthfulness is the
   *  host/backend's responsibility (Cortexel is host-agnostic). */
  declared_inputs: zod.z.partialRecord(
    ProvenanceKeyEnum,
    zod.z.union([zod.z.string(), zod.z.number(), zod.z.literal(true)])
  ).optional(),
  /** Explicit synthetic/illustrative discriminator — forces the schematic
   *  caption regardless of the other flags. */
  synthetic: zod.z.boolean().default(false)
});
var VizSpecSchema = zod.z.object({
  scene: zod.z.enum(SCENE_NAMES),
  // Scene-specific data/options. NOTE (Phase 1): this is intentionally opaque —
  // it is NOT validated per-scene yet, so an empty or malformed `params` passes
  // validation and any error surfaces only at render time. Per-scene typed
  // schemas are planned; until then, consult each scene's documented params.
  params: zod.z.record(zod.z.string(), zod.z.unknown()).default({}),
  mode: zod.z.enum(["interactive", "export"]).default("interactive"),
  themeMode: zod.z.enum(["dark", "light"]).default("dark"),
  camera: zod.z.enum(["default", "top", "side", "close", "cinematic"]).optional(),
  provenance: ProvenanceSchema
});
function validateVizSpec(input) {
  const result = VizSpecSchema.safeParse(input);
  if (result.success) return { ok: true, spec: result.data };
  return {
    ok: false,
    errors: result.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`
    )
  };
}
var numArray = zod.z.array(zod.z.number());
var VoltageTraceParamsSchema = zod.z.object({
  times_ms: numArray.min(1),
  series: zod.z.array(zod.z.array(zod.z.number())).min(1),
  units: zod.z.string().min(1)
}).passthrough();
var SpikeRasterParamsSchema = zod.z.object({
  times_ms: numArray.min(1),
  senders: numArray.min(1)
}).passthrough();
var RateResponseParamsSchema = zod.z.object({
  stimulus_amplitudes: numArray.min(1),
  rates_hz: numArray.min(1),
  units: zod.z.string().min(1)
}).passthrough();
var NetworkParamsSchema = zod.z.object({
  sources: numArray.min(1),
  targets: numArray.min(1),
  weights: numArray.optional()
}).passthrough();
var Spatial3DParamsSchema = zod.z.object({
  objects: zod.z.array(zod.z.unknown()).min(1)
}).passthrough();
var PlasticityParamsSchema = zod.z.object({
  times_ms: numArray.min(1),
  weights: numArray.min(1),
  weight_units: zod.z.string().min(1)
}).passthrough();
var PhasePlaneParamsSchema = zod.z.object({
  grid: zod.z.record(zod.z.string(), zod.z.unknown())
}).passthrough();
var AstrocyteParamsSchema = zod.z.object({
  ca_trace: numArray.min(1),
  units: zod.z.string().min(1)
}).passthrough();

// core/skills/registry.ts
var NEST_SKILL_REGISTRY = {
  "pi.nest.voltage_trace": {
    id: "pi.nest.voltage_trace",
    version: "1.0.0",
    title: "NEST voltage trace renderer",
    description: "Render multimeter/voltmeter analog traces (V_m, currents, conductances).",
    deviceFamily: "multimeter",
    scene: "voltage-trace",
    requiredInputKeys: ["times_ms", "series", "units"],
    paramsSchema: VoltageTraceParamsSchema,
    requiredProvenanceKeys: [
      "device_id",
      "recorded_variable",
      "units",
      "sampling_interval"
    ],
    rendererRoutes: ["pi.media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "One neuron example / multimeter recording",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/one_neuron.html",
        dataShape: "times_ms + V_m/current/conductance series split by sender",
        output: "Selectable trace, spike markers, JSON + SVG export",
        note: "Mirrors NEST voltage_trace while keeping data provenance inspectable."
      }
    ]
  },
  "pi.nest.spike_raster": {
    id: "pi.nest.spike_raster",
    version: "1.0.0",
    title: "NEST spike raster renderer",
    description: "Render spike_recorder events as rasters, spike trains and population plots.",
    deviceFamily: "spike_recorder",
    scene: "spike-raster",
    requiredInputKeys: ["times_ms", "senders"],
    paramsSchema: SpikeRasterParamsSchema,
    requiredProvenanceKeys: [
      "recorder_id",
      "sender_ids",
      "population_labels",
      "time_units"
    ],
    rendererRoutes: ["pi.media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Random balanced Brunel network",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/brunel_alpha_nest.html",
        dataShape: "spike_recorder events: times_ms, senders, population labels",
        output: "Sender-time raster, population rate strip, selectable windows",
        note: "Use exact spike times first; aggregate only when too dense to read."
      }
    ]
  },
  "pi.nest.rate_response": {
    id: "pi.nest.rate_response",
    version: "1.0.0",
    title: "NEST rate / IF response renderer",
    description: "Render firing-rate / IF curves and population rates derived from spike counts.",
    deviceFamily: "spike_recorder",
    scene: "fi-curve",
    requiredInputKeys: ["stimulus_amplitudes", "rates_hz", "units"],
    paramsSchema: RateResponseParamsSchema,
    requiredProvenanceKeys: ["stim_units", "bin_ms", "rate_normalization"],
    rendererRoutes: ["pi.media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "IF curve example",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/if_curve.html",
        dataShape: "stimulus amplitudes, rates_hz, spike counts",
        output: "IF curve, population-rate trace, decision crossing markers",
        note: "Always show bin width / counting window so rates stay auditable."
      }
    ]
  },
  "pi.nest.connectivity_matrix": {
    id: "pi.nest.connectivity_matrix",
    version: "1.0.0",
    title: "NEST connectivity matrix renderer",
    description: "Render SynapseCollection connectivity, weights and population blocks.",
    deviceFamily: "get_connections",
    scene: "network-topology",
    requiredInputKeys: ["sources", "targets"],
    paramsSchema: NetworkParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "weight_units"
    ],
    rendererRoutes: ["pi.media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Plot weight matrices example / SynapseCollection",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/plot_weight_matrices.html",
        dataShape: "sources, targets, weights, delays, source/target populations",
        output: "Topology node-edge view, selected block stats, weight histogram",
        note: "Keep absent connections distinct from zero-weight connections."
      }
    ]
  },
  "pi.nest.spatial_2d": {
    id: "pi.nest.spatial_2d",
    version: "1.0.0",
    title: "NEST 2D spatial renderer",
    description: "Render 2D layer positions, masks, kernels and sampled projections.",
    deviceFamily: "get_position",
    scene: null,
    // no honest 2D-spatial scene yet (would violate sphere/voxel law)
    requiredInputKeys: ["positions"],
    requiredProvenanceKeys: ["extent", "mask", "kernel"],
    rendererRoutes: ["pi.media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Circular mask, Gaussian kernel, grid/free spatial examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/connex.html",
        dataShape: "node x/y positions, masks, kernels, sampled edges",
        output: "No Cortexel scene yet \u2014 route to a 2D d3 map on the host.",
        note: "scene:null \u2014 render via host d3, not a Cortexel 3D scene."
      }
    ]
  },
  "pi.nest.spatial_3d": {
    id: "pi.nest.spatial_3d",
    version: "1.0.0",
    title: "NEST 3D spatial renderer",
    description: "Render 3D population/node positions for spatial inspection.",
    deviceFamily: "get_position",
    scene: "network-topology",
    requiredInputKeys: ["objects"],
    paramsSchema: Spatial3DParamsSchema,
    requiredProvenanceKeys: ["extent", "projection_sample_policy"],
    rendererRoutes: [
      "pi.media.webgl_scene",
      "pi.media.react_fiber_scene",
      "three",
      "fiber"
    ],
    examples: [
      {
        nestExample: "3D spatial network with exponential/Gaussian probabilities",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/test_3d.html",
        dataShape: "node x/y/z positions, extent, sampled edges",
        output: "Selectable 3D scene plus SVG projection fallback",
        note: "Use 3D as inspection aid; do not imply biological geometry."
      }
    ]
  },
  "pi.nest.plasticity_dynamics": {
    id: "pi.nest.plasticity_dynamics",
    version: "1.0.0",
    title: "NEST plasticity dynamics renderer",
    description: "Render STDP windows, weight adaptation and short-term dynamics.",
    deviceFamily: "weight_recorder",
    scene: "stdp",
    requiredInputKeys: ["times_ms", "weights", "weight_units"],
    paramsSchema: PlasticityParamsSchema,
    requiredProvenanceKeys: ["synapse_model", "weight_units"],
    rendererRoutes: ["pi.media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Urbanczik-Senn / Clopath / Tsodyks short-term plasticity",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/urbanczik_synapse_example.html",
        dataShape: "weights, u/x resources, pre/post spikes, delta_t, delta_weight",
        output: "Weight trace, STDP window, spike protocol rugs",
        note: "Preserve pre/post sign convention; label all plasticity parameters."
      }
    ]
  },
  "pi.nest.phase_plane": {
    id: "pi.nest.phase_plane",
    version: "1.0.0",
    title: "NEST phase-plane renderer",
    description: "Render phase planes, vector fields, nullclines and trajectories.",
    deviceFamily: "computed",
    scene: "phase-plane",
    requiredInputKeys: ["grid"],
    paramsSchema: PhasePlaneParamsSchema,
    requiredProvenanceKeys: ["state_variables"],
    rendererRoutes: ["pi.media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Numerical phase-plane analysis of the Hodgkin-Huxley neuron",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/hh_phaseplane.html",
        dataShape: "state variable grid, derivatives, nullcline points, trajectory",
        output: "Vector field, nullclines, trajectory, equilibrium annotations",
        note: "Distinguish clamped state variables from simulated dynamic ones."
      }
    ]
  },
  "pi.nest.correlogram": {
    id: "pi.nest.correlogram",
    version: "1.0.0",
    title: "NEST correlogram / synchrony renderer",
    description: "Render auto/cross-correlation functions for spike trains.",
    deviceFamily: "spike_recorder",
    scene: null,
    // ISI-histogram scene exists but the math differs — no honest reuse
    requiredInputKeys: ["lags_ms", "correlation"],
    requiredProvenanceKeys: ["bin_ms", "pair_labels"],
    rendererRoutes: ["pi.media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Auto- and crosscorrelation functions for spike trains",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/cross_check_mip_corrdet.html",
        dataShape: "lags_ms, correlation values, pair labels, bin width",
        output: "No Cortexel scene (distinct from ISI) \u2014 route to host d3.",
        note: "scene:null \u2014 correlogram math differs from the ISI histogram scene."
      }
    ]
  },
  "pi.nest.stimulus_response": {
    id: "pi.nest.stimulus_response",
    version: "1.0.0",
    title: "NEST stimulus-response protocol renderer",
    description: "Render aligned stimulus waveforms, responses, spikes and protocol epochs.",
    deviceFamily: "multimeter",
    scene: null,
    // composite multi-panel protocol; no single Cortexel scene
    requiredInputKeys: ["stimulus", "response"],
    requiredProvenanceKeys: ["stim_units", "units"],
    rendererRoutes: ["pi.media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Sinusoidal generator / pulse packet / repeated stimulation",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/pulsepacket.html",
        dataShape: "stimulus waveform, analog response, spike events, epochs",
        output: "Composite protocol panels \u2014 host-composed, no single scene.",
        note: "scene:null \u2014 multi-panel protocol composed by the host."
      }
    ]
  },
  "pi.nest.astrocyte_dynamics": {
    id: "pi.nest.astrocyte_dynamics",
    version: "1.0.0",
    title: "NEST astrocyte Ca\xB2\u207A/IP\u2083 dynamics renderer",
    description: "Render tripartite-synapse calcium/IP3 state-variable traces.",
    deviceFamily: "multimeter",
    scene: "voltage-trace",
    weak: true,
    // analog-trace reuse: Ca/IP3 are not membrane voltage
    requiredInputKeys: ["ca_trace", "units"],
    paramsSchema: AstrocyteParamsSchema,
    requiredProvenanceKeys: ["recorded_variable", "units"],
    rendererRoutes: ["pi.media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Single astrocyte / tripartite interaction examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/astrocytes/astrocyte_single.html",
        dataShape: "Ca/IP3/state variables, linked neuron events",
        output: "Calcium/IP3 traces via the analog-trace scene (flagged derived)",
        note: "weak:true \u2014 keep glial and neuronal units explicitly separate."
      }
    ]
  },
  "pi.nest.compartmental_dynamics": {
    id: "pi.nest.compartmental_dynamics",
    version: "1.0.0",
    title: "NEST compartmental morphology + dynamics renderer",
    description: "Render multi-compartment morphologies, receptor ports and soma/dendrite traces.",
    deviceFamily: "multimeter",
    scene: null,
    // morphology geometry has no honest Cortexel scene (no invented geometry)
    requiredInputKeys: ["compartments"],
    requiredProvenanceKeys: ["morphology_disclaimer", "recorded_variable"],
    rendererRoutes: ["pi.media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Receptors/current and two-compartment neuron examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/compartmental_model/receptors_and_current.html",
        dataShape: "compartments, receptor ports, soma/dendrite traces",
        output: "No Cortexel scene \u2014 host d3 morphology tree with linked traces.",
        note: "scene:null \u2014 do not invent morphology geometry from labels."
      }
    ]
  },
  "pi.nest.animation_replay": {
    id: "pi.nest.animation_replay",
    version: "1.0.0",
    title: "NEST state replay / animation storyboard renderer",
    description: "Render time-evolution storyboards and inspectable state replays.",
    deviceFamily: "computed",
    scene: null,
    // offline manim storyboard, not a live r3f scene — do not mis-route
    requiredInputKeys: ["frames"],
    requiredProvenanceKeys: ["frame_rate"],
    rendererRoutes: ["pi.media.manim_storyboard", "manim"],
    examples: [
      {
        nestExample: "Sudoku progress GIF / Pong replay",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/sudoku/plot_progress.html",
        dataShape: "frames, entities, metrics, frame rate, annotations",
        output: "Manim storyboard / source \u2014 no live Cortexel scene.",
        note: "scene:null \u2014 offline storyboard, not a real-time render target."
      }
    ]
  }
};
function getSkill(id) {
  return NEST_SKILL_REGISTRY[id];
}

// core/skills/skillIds.ts
var PI_NEST_SKILL_IDS = [
  "pi.nest.voltage_trace",
  "pi.nest.spike_raster",
  "pi.nest.rate_response",
  "pi.nest.connectivity_matrix",
  "pi.nest.spatial_2d",
  "pi.nest.spatial_3d",
  "pi.nest.plasticity_dynamics",
  "pi.nest.phase_plane",
  "pi.nest.correlogram",
  "pi.nest.stimulus_response",
  "pi.nest.astrocyte_dynamics",
  "pi.nest.compartmental_dynamics",
  "pi.nest.animation_replay"
];

// core/skills/validateSkillInvocation.ts
function validateSkillInvocation(skillId, payload) {
  const errors = [];
  const contract = getSkill(skillId);
  if (!contract) {
    return {
      ok: false,
      errors: [
        {
          code: "unknown_skill",
          path: "skillId",
          message: `unknown skill '${skillId}'`,
          hint: "Use one of the registered pi.nest.* skills.",
          validSkills: PI_NEST_SKILL_IDS
        }
      ]
    };
  }
  const envelope = validateVizSpec(payload);
  if (!envelope.ok) {
    return {
      ok: false,
      errors: envelope.errors.map((message) => ({
        code: "invalid_envelope",
        path: "(spec)",
        message,
        validScenes: SCENE_NAMES
      }))
    };
  }
  const spec = envelope.spec;
  const prov = spec.provenance;
  if (prov.calibrated_posterior === true) {
    errors.push({
      code: "calibrated_posterior_unsupported",
      path: "provenance.calibrated_posterior",
      message: "calibrated_posterior=true is not implemented and is rejected at the visualization boundary",
      hint: "Validation/search is candidate ranking; leave calibrated_posterior=false."
    });
  }
  if (contract.scene === null) {
    errors.push({
      code: "no_cortexel_scene",
      path: "skillId",
      message: `skill '${skillId}' has no Cortexel scene (route to a host renderer)`,
      hint: `Renderer routes: ${contract.rendererRoutes.join(", ")}.`
    });
  } else if (spec.scene !== contract.scene) {
    errors.push({
      code: "scene_mismatch",
      path: "scene",
      message: `scene '${spec.scene}' does not match skill '${skillId}' scene '${contract.scene}'`,
      hint: `Set scene: '${contract.scene}'.`,
      validScenes: [contract.scene]
    });
  }
  if (contract.paramsSchema) {
    const parsed = contract.paramsSchema.safeParse(spec.params);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          code: "invalid_params",
          path: `params.${issue.path.join(".") || "(root)"}`,
          message: issue.message,
          hint: `Required params: ${contract.requiredInputKeys.join(", ")}.`
        });
      }
    }
  }
  const declared = prov.declared_inputs ?? {};
  for (const key of contract.requiredProvenanceKeys) {
    if (!(key in declared)) {
      errors.push({
        code: "missing_provenance",
        path: `provenance.declared_inputs.${key}`,
        message: `missing required provenance: ${key}`,
        hint: `Skill '${skillId}' requires declared_inputs for: ${contract.requiredProvenanceKeys.join(", ")}.`
      });
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  const caption = requiresHonestyCaption(prov) ? defaultHonestyCaption(prov) : null;
  return { ok: true, spec, scene: contract.scene, caption };
}
function VizSpecRenderer({
  spec,
  renderScene,
  skillId,
  active = true,
  onError
}) {
  if (skillId) {
    const gated = validateSkillInvocation(skillId, spec);
    if (!gated.ok) {
      const messages = gated.errors.map((e) => `${e.path}: ${e.message}`);
      onError?.(messages);
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { role: "alert", className: "cortexel-vizspec-error", children: [
        /* @__PURE__ */ jsxRuntime.jsxs("strong", { children: [
          "Invalid skill invocation (",
          skillId,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("ul", { children: messages.map((e, i) => /* @__PURE__ */ jsxRuntime.jsx("li", { children: e }, i)) })
      ] });
    }
    return /* @__PURE__ */ jsxRuntime.jsx(
      SceneFrame,
      {
        scene: gated.scene,
        themeMode: gated.spec.themeMode,
        mode: gated.spec.mode,
        camera: gated.spec.camera,
        caption: gated.caption,
        active,
        renderScene
      }
    );
  }
  const result = validateVizSpec(spec);
  if (!result.ok) {
    onError?.(result.errors);
    return /* @__PURE__ */ jsxRuntime.jsxs("div", { role: "alert", className: "cortexel-vizspec-error", children: [
      /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "Invalid VizSpec" }),
      /* @__PURE__ */ jsxRuntime.jsx("ul", { children: result.errors.map((e, i) => /* @__PURE__ */ jsxRuntime.jsx("li", { children: e }, i)) })
    ] });
  }
  const { scene, themeMode, mode, camera, provenance } = result.spec;
  const caption = requiresHonestyCaption(provenance) ? defaultHonestyCaption(provenance) : null;
  return /* @__PURE__ */ jsxRuntime.jsx(
    SceneFrame,
    {
      scene,
      themeMode,
      mode,
      camera,
      caption,
      active,
      renderScene
    }
  );
}
function SceneFrame({
  scene,
  themeMode,
  mode,
  camera,
  caption,
  active,
  renderScene
}) {
  if (mode === "export") {
    return /* @__PURE__ */ jsxRuntime.jsx("div", { role: "status", className: "cortexel-vizspec-export-unsupported", children: "Headless export rendering is not available in this build. Request an interactive render, or use the backend render endpoint once enabled." });
  }
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "div",
    {
      className: "cortexel-vizspec",
      style: { position: "relative", width: "100%", height: "100%" },
      children: [
        renderScene({ scene, themeMode, active, camera }),
        caption && /* @__PURE__ */ jsxRuntime.jsx(
          "div",
          {
            className: "cortexel-honesty-caption",
            role: "note",
            "aria-live": "polite",
            "aria-label": "Scientific provenance disclosure",
            style: {
              position: "absolute",
              left: 12,
              bottom: 12,
              maxWidth: "70%",
              padding: "4px 10px",
              borderRadius: 6,
              // Okabe-Ito amber on opaque dark — bloom-safe (DOM, not emissive).
              background: "rgba(20,22,28,0.92)",
              color: "#e69f00",
              fontSize: 12,
              lineHeight: 1.4,
              pointerEvents: "none"
            },
            children: caption
          }
        )
      ]
    }
  );
}

exports.ExpandablePopulation = ExpandablePopulation;
exports.VizSpecRenderer = VizSpecRenderer;
exports.usePopulationExpand = usePopulationExpand;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map