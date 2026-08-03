const require_authoring = require('./authoring-CicuSscw.cjs');
const require_knowledgeGraphLimits = require('./knowledgeGraphLimits-C0j05-4h.cjs');
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");

//#region react/VizSpecRenderer.tsx
function cloneValidatedJson(value) {
	if (typeof globalThis.structuredClone === "function") return globalThis.structuredClone(value);
	return JSON.parse(JSON.stringify(value));
}
function VizSpecRenderer({ spec, renderScene, skillId, trustedEnvelope = false, active = true, activePalette, captionPlacement = "overlay", onError, onInvocationError }) {
	let embeddedSkillProperty;
	try {
		embeddedSkillProperty = require_knowledgeGraphLimits.readOwnEnumerableDataProperty(spec, "skill");
	} catch {
		embeddedSkillProperty = { kind: "absent" };
	}
	const hasEmbeddedSkill = embeddedSkillProperty.kind === "value";
	const embeddedSkill = embeddedSkillProperty.kind === "value" ? embeddedSkillProperty.value : void 0;
	const effectiveSkillId = skillId !== void 0 ? skillId : hasEmbeddedSkill ? typeof embeddedSkill === "string" ? embeddedSkill.length <= 80 ? embeddedSkill.trim() : embeddedSkill : embeddedSkill : void 0;
	const validation = (0, react.useMemo)(() => effectiveSkillId !== void 0 ? {
		kind: "strict",
		result: require_authoring.validateSkillInvocation(effectiveSkillId, spec)
	} : !trustedEnvelope ? {
		kind: "strict",
		result: require_authoring.validateSpec(spec)
	} : {
		kind: "plain",
		result: require_authoring.validateVizSpec(spec)
	}, [
		effectiveSkillId,
		spec,
		trustedEnvelope
	]);
	if (validation.kind === "strict") {
		const gated = validation.result;
		if (!gated.ok) {
			const messages = gated.errors.map((e) => `${e.path}: ${e.message}`);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValidationError, {
				title: "Invalid skill invocation",
				messages,
				errors: gated.errors,
				onError,
				onInvocationError
			});
		}
		const palette = gated.spec.palette ? require_authoring.getPalette(gated.spec.palette) : activePalette ?? require_authoring.getPalette("crameri");
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SceneFrame, {
			skill: gated.skill,
			scene: gated.scene,
			themeMode: gated.spec.themeMode,
			mode: gated.spec.mode,
			camera: gated.spec.camera,
			palette,
			params: gated.spec.params,
			provenance: gated.spec.provenance,
			caption: gated.caption,
			captionPlacement,
			active,
			renderScene
		});
	}
	const result = validation.result;
	if (!result.ok) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValidationError, {
		title: "Invalid VizSpec",
		messages: result.errors,
		onError
	});
	const { scene, themeMode, mode, camera, provenance, params, palette: paletteHint } = result.spec;
	const caption = require_authoring.requiresHonestyCaption(provenance) ? require_authoring.defaultHonestyCaption(provenance) : null;
	const palette = paletteHint ? require_authoring.getPalette(paletteHint) : activePalette ?? require_authoring.getPalette("crameri");
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SceneFrame, {
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
	});
}
function ValidationError({ title, messages, errors, onError, onInvocationError }) {
	const contentKey = errors ? JSON.stringify(errors) : messages.join("\n");
	const onErrorRef = (0, react.useRef)(onError);
	const onInvocationErrorRef = (0, react.useRef)(onInvocationError);
	const reportedKeyRef = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		onErrorRef.current = onError;
		onInvocationErrorRef.current = onInvocationError;
	}, [onError, onInvocationError]);
	(0, react.useEffect)(() => {
		if (reportedKeyRef.current === contentKey) return;
		reportedKeyRef.current = contentKey;
		onErrorRef.current?.([...messages]);
		if (errors) onInvocationErrorRef.current?.(errors);
	}, [contentKey]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		role: "alert",
		"aria-live": "assertive",
		className: "cortexel-vizspec-error",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: title }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "Fix the fields below and validate the visualization again." }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: messages.map((message, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: message }, `${index}-${message}`)) })
		]
	});
}
function SceneFrame({ skill, scene, themeMode, mode, camera, palette, params, provenance, caption, captionPlacement, active, renderScene }) {
	const captionId = `cortexel-honesty-caption-${(0, react.useId)().replace(/[^a-zA-Z0-9_-]/g, "")}`;
	if (mode === "export") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		role: "status",
		className: "cortexel-vizspec-export-unsupported",
		children: "Headless export rendering is not available in this build. Request an interactive render, or use the backend render endpoint once enabled."
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "cortexel-vizspec",
		role: caption ? "group" : void 0,
		"aria-describedby": caption ? captionId : void 0,
		style: {
			position: "relative",
			width: "100%",
			height: captionPlacement === "footer" ? "auto" : "100%"
		},
		children: [renderScene({
			skill,
			scene,
			themeMode,
			active,
			camera,
			palette,
			params: cloneValidatedJson(params),
			provenance: cloneValidatedJson(provenance)
		}), caption && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			id: captionId,
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
				background: "rgba(20,22,28,0.92)",
				color: "#e69f00",
				fontSize: 12,
				lineHeight: 1.4,
				pointerEvents: "none"
			},
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("bdi", {
				dir: "auto",
				style: { unicodeBidi: "isolate" },
				children: caption
			})
		})]
	});
}

//#endregion
Object.defineProperty(exports, 'VizSpecRenderer', {
  enumerable: true,
  get: function () {
    return VizSpecRenderer;
  }
});
//# sourceMappingURL=VizSpecRenderer-Duhebof_.cjs.map