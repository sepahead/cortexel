import { z } from 'zod';

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
var SCENE_FRAMING = {
  "live-activity": { position: [0, 0, 9.4], target: [0, 0, 0], rotatable: false },
  "cortical-column": { position: [3.4, 0.4, 10.6], target: [0.4, 0, 0], rotatable: true },
  "stdp": { position: [0, 0.2, 6.8], target: [0, 0, 0], rotatable: true },
  "network-topology": { position: [4.6, 2, 9.2], target: [0, 0, 0], rotatable: true },
  "brunel-network": { position: [0, 1.1, 9.4], target: [0, 0.2, 0], rotatable: true },
  "spike-raster": { position: [0, 0, 8], target: [0, 0, 0], rotatable: false },
  "voltage-trace": { position: [0, 0, 8.2], target: [0, 0, 0], rotatable: false },
  "phase-plane": { position: [0, 0, 7.8], target: [0, 0, 0], rotatable: false },
  "fi-curve": { position: [0, 0.7, 6.4], target: [0, 0.7, 0], rotatable: false },
  "isi-distribution": { position: [0, 0.6, 7.4], target: [0, 0.6, 0], rotatable: false },
  "psth": { position: [0, 0.6, 7.4], target: [0, 0.6, 0], rotatable: false },
  "weight-histogram": { position: [0, 0.6, 7.4], target: [0, 0.6, 0], rotatable: false }
};
var CAMERA_PRESETS = {
  default: { name: "default", position: [0, 0, 8], target: [0, 0, 0], fov: 50 },
  top: { name: "top", position: [0, 12, 0], target: [0, 0, 0], fov: 45 },
  side: { name: "side", position: [12, 0, 0], target: [0, 0, 0], fov: 45 },
  close: { name: "close", position: [0, 2, 4], target: [0, 0, 0], fov: 35 },
  cinematic: { name: "cinematic", position: [6, 4, 6], target: [0, 0, 0], fov: 40 }
};
var ProvenanceSchema = z.object({
  source: z.string().min(1).max(200),
  calibrated_posterior: z.boolean().default(false),
  // fail-closed
  advisory_only: z.boolean().default(false),
  is_paper_local_evidence: z.boolean().default(false),
  caption: z.string().max(500).optional()
});
var VizSpecSchema = z.object({
  scene: z.enum(SCENE_NAMES),
  // Scene-specific data/options. NOTE (Phase 1): this is intentionally opaque —
  // it is NOT validated per-scene yet, so an empty or malformed `params` passes
  // validation and any error surfaces only at render time. Per-scene typed
  // schemas are planned; until then, consult each scene's documented params.
  params: z.record(z.string(), z.unknown()).default({}),
  mode: z.enum(["interactive", "export"]).default("interactive"),
  themeMode: z.enum(["dark", "light"]).default("dark"),
  camera: z.enum(["default", "top", "side", "close", "cinematic"]).optional(),
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

// core/provenance.ts
var CONSERVATIVE_PROVENANCE = Object.freeze({
  calibrated_posterior: false,
  advisory_only: false,
  is_paper_local_evidence: false
});
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

export { CAMERA_PRESETS, CONSERVATIVE_PROVENANCE, ProvenanceSchema, SCENE_FRAMING, SCENE_NAMES, VizSpecSchema, defaultHonestyCaption, requiresHonestyCaption, validateVizSpec };
//# sourceMappingURL=chunk-K4R4BT7N.js.map
//# sourceMappingURL=chunk-K4R4BT7N.js.map