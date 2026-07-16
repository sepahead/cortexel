import {
  defaultHonestyCaption,
  getPalette,
  requiresHonestyCaption,
  validateSkillInvocation,
  validateSpec,
  validateVizSpec
} from "./chunk-6L2O67R4.js";
import {
  readOwnEnumerableDataProperty
} from "./chunk-X23XMWZH.js";

// react/VizSpecRenderer.tsx
import { useEffect, useMemo, useRef } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function cloneValidatedJson(value) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
function VizSpecRenderer({
  spec,
  renderScene,
  skillId,
  trustedEnvelope = false,
  active = true,
  activePalette,
  captionPlacement = "overlay",
  onError,
  onInvocationError
}) {
  let embeddedSkillProperty;
  try {
    embeddedSkillProperty = readOwnEnumerableDataProperty(spec, "skill");
  } catch {
    embeddedSkillProperty = { kind: "absent" };
  }
  const hasEmbeddedSkill = embeddedSkillProperty.kind === "value";
  const embeddedSkill = embeddedSkillProperty.kind === "value" ? embeddedSkillProperty.value : void 0;
  const effectiveSkillId = skillId !== void 0 ? skillId : hasEmbeddedSkill ? typeof embeddedSkill === "string" ? embeddedSkill.length <= 80 ? embeddedSkill.trim() : embeddedSkill : embeddedSkill : void 0;
  const validation = useMemo(() => effectiveSkillId !== void 0 ? {
    kind: "strict",
    result: validateSkillInvocation(effectiveSkillId, spec)
  } : !trustedEnvelope ? {
    kind: "strict",
    result: validateSpec(spec)
  } : {
    kind: "plain",
    result: validateVizSpec(spec)
  }, [effectiveSkillId, spec, trustedEnvelope]);
  if (validation.kind === "strict") {
    const gated = validation.result;
    if (!gated.ok) {
      const messages = gated.errors.map((e) => `${e.path}: ${e.message}`);
      return /* @__PURE__ */ jsx(
        ValidationError,
        {
          title: "Invalid skill invocation",
          messages,
          errors: gated.errors,
          onError,
          onInvocationError
        }
      );
    }
    const palette2 = gated.spec.palette ? getPalette(gated.spec.palette) : activePalette ?? getPalette("crameri");
    return /* @__PURE__ */ jsx(
      SceneFrame,
      {
        skill: gated.skill,
        scene: gated.scene,
        themeMode: gated.spec.themeMode,
        mode: gated.spec.mode,
        camera: gated.spec.camera,
        palette: palette2,
        params: gated.spec.params,
        provenance: gated.spec.provenance,
        caption: gated.caption,
        captionPlacement,
        active,
        renderScene
      }
    );
  }
  const result = validation.result;
  if (!result.ok) {
    return /* @__PURE__ */ jsx(
      ValidationError,
      {
        title: "Invalid VizSpec",
        messages: result.errors,
        onError
      }
    );
  }
  const { scene, themeMode, mode, camera, provenance, params, palette: paletteHint } = result.spec;
  const caption = requiresHonestyCaption(provenance) ? defaultHonestyCaption(provenance) : null;
  const palette = paletteHint ? getPalette(paletteHint) : activePalette ?? getPalette("crameri");
  return /* @__PURE__ */ jsx(
    SceneFrame,
    {
      skill: result.spec.skill,
      scene,
      themeMode,
      mode,
      camera,
      palette,
      params,
      provenance,
      caption,
      captionPlacement,
      active,
      renderScene
    }
  );
}
function ValidationError({
  title,
  messages,
  errors,
  onError,
  onInvocationError
}) {
  const contentKey = errors ? JSON.stringify(errors) : messages.join("\n");
  const onErrorRef = useRef(onError);
  const onInvocationErrorRef = useRef(onInvocationError);
  const reportedKeyRef = useRef(null);
  useEffect(() => {
    onErrorRef.current = onError;
    onInvocationErrorRef.current = onInvocationError;
  }, [onError, onInvocationError]);
  useEffect(() => {
    if (reportedKeyRef.current === contentKey) return;
    reportedKeyRef.current = contentKey;
    onErrorRef.current?.([...messages]);
    if (errors) onInvocationErrorRef.current?.(errors);
  }, [contentKey]);
  return /* @__PURE__ */ jsxs("div", { role: "alert", "aria-live": "assertive", className: "cortexel-vizspec-error", children: [
    /* @__PURE__ */ jsx("strong", { children: title }),
    /* @__PURE__ */ jsx("p", { children: "Fix the fields below and validate the visualization again." }),
    /* @__PURE__ */ jsx("ul", { children: messages.map((message, index) => /* @__PURE__ */ jsx("li", { children: message }, `${index}-${message}`)) })
  ] });
}
function SceneFrame({
  skill,
  scene,
  themeMode,
  mode,
  camera,
  palette,
  params,
  provenance,
  caption,
  captionPlacement,
  active,
  renderScene
}) {
  if (mode === "export") {
    return /* @__PURE__ */ jsx("div", { role: "status", className: "cortexel-vizspec-export-unsupported", children: "Headless export rendering is not available in this build. Request an interactive render, or use the backend render endpoint once enabled." });
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "cortexel-vizspec",
      style: {
        position: "relative",
        width: "100%",
        height: captionPlacement === "footer" ? "auto" : "100%"
      },
      children: [
        renderScene({
          skill,
          scene,
          themeMode,
          active,
          camera,
          palette,
          params: cloneValidatedJson(params),
          provenance: cloneValidatedJson(provenance)
        }),
        caption && /* @__PURE__ */ jsx(
          "div",
          {
            className: "cortexel-honesty-caption",
            role: "note",
            "aria-live": "polite",
            "aria-label": "Scientific provenance disclosure",
            style: {
              position: captionPlacement === "footer" ? "relative" : "absolute",
              left: captionPlacement === "footer" ? 0 : 12,
              bottom: captionPlacement === "footer" ? "auto" : 12,
              maxWidth: captionPlacement === "footer" ? "100%" : "70%",
              width: captionPlacement === "footer" ? "100%" : "auto",
              boxSizing: "border-box",
              marginTop: captionPlacement === "footer" ? 8 : 0,
              padding: "4px 10px",
              borderRadius: 6,
              // Okabe-Ito amber on opaque dark — bloom-safe (DOM, not emissive).
              background: "rgba(20,22,28,0.92)",
              color: "#e69f00",
              fontSize: 12,
              lineHeight: 1.4,
              pointerEvents: "none"
            },
            children: /* @__PURE__ */ jsx("bdi", { dir: "auto", style: { unicodeBidi: "isolate" }, children: caption })
          }
        )
      ]
    }
  );
}

export {
  VizSpecRenderer
};
//# sourceMappingURL=chunk-CAOYXHLY.js.map