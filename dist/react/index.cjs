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
  return !p.calibrated_posterior || p.advisory_only || !p.is_paper_local_evidence;
}
function defaultHonestyCaption(p) {
  if (p.caption) return p.caption;
  if (p.source === "synthetic_test" || p.source.startsWith("synthetic")) {
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

// core/vizSpec.ts
var ProvenanceSchema = zod.z.object({
  source: zod.z.string().min(1).max(200),
  calibrated_posterior: zod.z.boolean().default(false),
  // fail-closed
  advisory_only: zod.z.boolean().default(false),
  is_paper_local_evidence: zod.z.boolean().default(false),
  caption: zod.z.string().max(500).optional()
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
function VizSpecRenderer({
  spec,
  renderScene,
  active = true,
  onError
}) {
  const result = validateVizSpec(spec);
  if (!result.ok) {
    onError?.(result.errors);
    return /* @__PURE__ */ jsxRuntime.jsxs("div", { role: "alert", className: "cortexel-vizspec-error", children: [
      /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "Invalid VizSpec" }),
      /* @__PURE__ */ jsxRuntime.jsx("ul", { children: result.errors.map((e, i) => /* @__PURE__ */ jsxRuntime.jsx("li", { children: e }, i)) })
    ] });
  }
  const { scene, themeMode, mode, camera, provenance } = result.spec;
  if (mode === "export") {
    return /* @__PURE__ */ jsxRuntime.jsx("div", { role: "status", className: "cortexel-vizspec-export-unsupported", children: "Headless export rendering is not available in this build. Request an interactive render, or use the backend render endpoint once enabled." });
  }
  const showCaption = requiresHonestyCaption(provenance);
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "div",
    {
      className: "cortexel-vizspec",
      style: { position: "relative", width: "100%", height: "100%" },
      children: [
        renderScene({ scene, themeMode, active, camera }),
        showCaption && /* @__PURE__ */ jsxRuntime.jsx(
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
            children: defaultHonestyCaption(provenance)
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