import { validateSkillInvocation, validateVizSpec, requiresHonestyCaption, defaultHonestyCaption } from './chunk-X3PTQEFC.js';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { jsxs, jsx } from 'react/jsx-runtime';

function usePopulationExpand(controlled) {
  const [localSelected, setLocalSelected] = useState(null);
  const [localHovered, setLocalHovered] = useState(null);
  const selectedPopId = controlled ? controlled.selectedPopId : localSelected;
  const hoveredPopId = controlled ? controlled.hoveredPopId : localHovered;
  const setSelectedPopId = controlled ? controlled.setSelectedPopId : setLocalSelected;
  const setHoveredPopId = controlled ? controlled.setHoveredPopId : setLocalHovered;
  const toggleSelected = useCallback(
    (id) => setSelectedPopId(selectedPopId === id ? null : id),
    [selectedPopId, setSelectedPopId]
  );
  const reset = useCallback(() => {
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
  const meshRef = useRef(null);
  const ringRef = useRef(null);
  const scaleRef = useRef(1);
  const opacityRef = useRef(1);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);
  const voxelColor = useMemo(() => colorObj.clone().multiplyScalar(0.82), [colorObj]);
  const ringColor = useMemo(
    () => themeMode === "light" ? colorObj.clone().multiplyScalar(0.8) : colorObj.clone().multiplyScalar(1.15),
    // bloom-safe cap (was 1.25)
    [colorObj, themeMode]
  );
  const ringInner = size * 0.867;
  const ringOuter = size * 1.067;
  useFrame((state, delta) => {
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
  return /* @__PURE__ */ jsxs("group", { position, children: [
    /* @__PURE__ */ jsxs(
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
          /* @__PURE__ */ jsx("boxGeometry", { args: [size, size, size] }),
          /* @__PURE__ */ jsx("meshBasicMaterial", { color: voxelColor, transparent: true, toneMapped: true, fog: false })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("mesh", { ref: ringRef, rotation: [-Math.PI / 2, 0, 0], children: [
      /* @__PURE__ */ jsx("ringGeometry", { args: [ringInner, ringOuter, 32] }),
      /* @__PURE__ */ jsx(
        "meshBasicMaterial",
        {
          color: ringColor,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide
        }
      )
    ] })
  ] });
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
      return /* @__PURE__ */ jsxs("div", { role: "alert", className: "cortexel-vizspec-error", children: [
        /* @__PURE__ */ jsxs("strong", { children: [
          "Invalid skill invocation (",
          skillId,
          ")"
        ] }),
        /* @__PURE__ */ jsx("ul", { children: messages.map((e, i) => /* @__PURE__ */ jsx("li", { children: e }, i)) })
      ] });
    }
    return /* @__PURE__ */ jsx(
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
    return /* @__PURE__ */ jsxs("div", { role: "alert", className: "cortexel-vizspec-error", children: [
      /* @__PURE__ */ jsx("strong", { children: "Invalid VizSpec" }),
      /* @__PURE__ */ jsx("ul", { children: result.errors.map((e, i) => /* @__PURE__ */ jsx("li", { children: e }, i)) })
    ] });
  }
  const { scene, themeMode, mode, camera, provenance } = result.spec;
  const caption = requiresHonestyCaption(provenance) ? defaultHonestyCaption(provenance) : null;
  return /* @__PURE__ */ jsx(
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
    return /* @__PURE__ */ jsx("div", { role: "status", className: "cortexel-vizspec-export-unsupported", children: "Headless export rendering is not available in this build. Request an interactive render, or use the backend render endpoint once enabled." });
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "cortexel-vizspec",
      style: { position: "relative", width: "100%", height: "100%" },
      children: [
        renderScene({ scene, themeMode, active, camera }),
        caption && /* @__PURE__ */ jsx(
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

export { ExpandablePopulation, VizSpecRenderer, usePopulationExpand };
//# sourceMappingURL=chunk-FHJ5ZBE7.js.map
//# sourceMappingURL=chunk-FHJ5ZBE7.js.map