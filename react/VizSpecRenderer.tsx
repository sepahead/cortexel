// VizSpecRenderer — the agent entrypoint into Cortexel.
//
// An agent emits a VizSpec; this component re-validates it client-side (and a
// host backend SHOULD mirror this schema as a server-side gate for defense in
// depth) and, on success, delegates rendering to a host-supplied `renderScene`
// callback. Cortexel does NOT bundle the concrete
// r3f scene components — the host application injects them, so the library stays
// standalone and host-agnostic (Engram today; Hermes / OpenClaw later).
//
// A fail-closed honesty caption is overlaid whenever the provenance is anything
// less than a calibrated, paper-local posterior. `mode: 'export'` (headless
// PNG/MP4) is not implemented in this phase: rather than fake an interactive
// render, we surface an explicit notice (the backend mirrors this with a 501).

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { SceneName } from '../core/designLaws';
import type { ReadonlySemanticPalette } from '../core/colormaps';
import type { ProvenanceMetadata } from '../core/provenance';
import {
  defaultHonestyCaption,
  requiresHonestyCaption,
} from '../core/provenance';
import { validateVizSpec } from '../core/vizSpec';
import {
  validateSkillInvocation,
  type SkillInvocationError,
} from '../core/skills/validateSkillInvocation';
import { validateSpec } from '../core/skills/authoring';
import { getPalette } from '../core/colormaps';
import { readOwnEnumerableDataProperty } from '../core/safeRuntime';

export type CameraHint = 'default' | 'top' | 'side' | 'close' | 'cinematic';

export interface RenderSceneArgs {
  /** Validated skill identity. This is essential where multiple skills share a
   *  scene (for example voltage vs glial analog traces). */
  skill?: string;
  scene: SceneName;
  themeMode: 'dark' | 'light';
  active: boolean;
  /** Requested camera framing from the spec (undefined → host default). */
  camera?: CameraHint;
  /** Resolved semantic palette — the active render policy. When the spec
   *  includes a palette hint, it is resolved here; otherwise the host's
   *  active palette (or the Cortexel default) is passed. Scene components
   *  should consume colors from this, not from module-level imports. */
  palette: ReadonlySemanticPalette;
  /** The scene's DATA/options — the whole point of the gate. On the skill path
   *  these are the params validated against the per-skill schema; on the plain
   *  path they are bounded literal JSON but remain skill-agnostic. Without this
   *  the host would have to reach
   *  back into the raw untrusted spec and re-parse what Cortexel already
   *  validated, so scene components render from here. Adapt to SceneData with the
   *  core/nest adapters as needed. */
  params: Readonly<Record<string, unknown>>;
  /** The spec's provenance (already reflected in the overlaid honesty caption).
   *  Exposed so a host can drive its own provenance-aware chrome if it wants. */
  provenance: Readonly<ProvenanceMetadata>;
}

function cloneValidatedJson<T>(value: T): T {
  // Every successful gate result is exact JSON, so the native structured clone
  // is deterministic and cannot invoke accessors/toJSON. A fresh render-facing
  // snapshot prevents a host callback from corrupting the memoized validation
  // result without paying Object.freeze's O(n) dense-array descriptor cost.
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface VizSpecRendererProps {
  /** The spec to render. Untrusted payloads are strict by default and must carry
   *  `skill` (or receive `skillId`) so deleting the discriminator cannot
   *  downgrade validation. */
  spec: unknown;
  /** Host-injected scene renderer. Keeps Cortexel free of app dependencies. */
  renderScene: (args: RenderSceneArgs) => ReactNode;
  /** When set (or when the spec carries a `skill` field), the spec is validated
   *  through the strict skill gate (validateSkillInvocation): per-skill params +
   *  declared provenance keys are enforced, calibrated_posterior=true is rejected,
   *  and the honesty caption (incl. the weak/derived-view disclosure) is bound at
   *  this render boundary. Prefer this for agent payloads. An explicit prop wins
   *  over the spec's `skill` field. */
  skillId?: string;
  /** Explicit opt-in for trusted, host-authored showcase envelopes that have no
   *  skill contract. This path checks exact JSON + the VizSpec envelope only;
   *  never enable it for agent/network payloads. */
  trustedEnvelope?: boolean;
  active?: boolean;
  /** The host's active palette — used when the spec does not include a palette
   *  hint. Defaults to the Cortexel default ('crameri'). The resolved palette
   *  (spec hint or host active) is passed to renderScene via RenderSceneArgs. */
  activePalette?: ReadonlySemanticPalette;
  /** Honesty caption layout. Overlay preserves the historical scene behavior;
   * footer keeps the same mandatory caption in normal flow for charts or other
   * figures whose axes/data must never be covered. This changes placement only
   * and cannot suppress, replace, or reorder disclosure text. */
  captionPlacement?: 'overlay' | 'footer';
  onError?: (errors: string[]) => void;
  /** Structured strict-gate errors for agent repair tooling. */
  onInvocationError?: (errors: readonly SkillInvocationError[]) => void;
}

export function VizSpecRenderer({
  spec,
  renderScene,
  skillId,
  trustedEnvelope = false,
  active = true,
  activePalette,
  captionPlacement = 'overlay',
  onError,
  onInvocationError,
}: VizSpecRendererProps) {
  // A self-describing spec (with a `skill` field) routes through the strict gate
  // even without an explicit skillId prop; an explicit prop always wins.
  let embeddedSkillProperty;
  try {
    embeddedSkillProperty = readOwnEnumerableDataProperty(spec, 'skill');
  } catch {
    // A hostile Proxy is routed into the plain exact gate and rejected there.
    embeddedSkillProperty = { kind: 'absent' as const };
  }
  const hasEmbeddedSkill = embeddedSkillProperty.kind === 'value';
  const embeddedSkill = embeddedSkillProperty.kind === 'value'
    ? embeddedSkillProperty.value
    : undefined;
  const effectiveSkillId =
    skillId !== undefined
      ? skillId
      : hasEmbeddedSkill
        ? typeof embeddedSkill === 'string'
          ? embeddedSkill.length <= 80
            ? embeddedSkill.trim()
            : embeddedSkill
          : embeddedSkill
        : undefined;

  // Validation takes a defensive snapshot and can be expensive for scientific
  // arrays. Keep that detached result across ordinary parent re-renders; if a
  // caller mutates the same raw object identity, the old validated snapshot is
  // still rendered (never the mutated untrusted object). Callers should replace
  // `spec` identity to submit new data.
  const validation = useMemo(() => (
    effectiveSkillId !== undefined
      ? {
          kind: 'strict' as const,
          result: validateSkillInvocation(effectiveSkillId, spec),
        }
      : !trustedEnvelope
        ? {
            kind: 'strict' as const,
            result: validateSpec(spec),
          }
      : {
          kind: 'plain' as const,
          result: validateVizSpec(spec),
        }
  ), [effectiveSkillId, spec, trustedEnvelope]);

  // Strict, skill-aware path: the documented/default agent entrypoint.
  if (validation.kind === 'strict') {
    const gated = validation.result;
    if (!gated.ok) {
      const messages = gated.errors.map((e) => `${e.path}: ${e.message}`);
      return (
        <ValidationError
          title="Invalid skill invocation"
          messages={messages}
          errors={gated.errors}
          onError={onError}
          onInvocationError={onInvocationError}
        />
      );
    }
    // Resolve palette: spec hint → host active → Cortexel default.
    const palette = gated.spec.palette
      ? getPalette(gated.spec.palette)
      : activePalette ?? getPalette('crameri');
    return (
      <SceneFrame
        skill={gated.skill}
        scene={gated.scene}
        themeMode={gated.spec.themeMode}
        mode={gated.spec.mode}
        camera={gated.spec.camera}
        palette={palette}
        // Forward the VALIDATED params + provenance so the host renders from
        // Cortexel's checked output, not by re-parsing the raw spec.
        params={gated.spec.params}
        provenance={gated.spec.provenance}
        // Honesty is bound here: the gate already resolved the caption (fail-
        // closed), so the renderer cannot "forget" it.
        caption={gated.caption}
        captionPlacement={captionPlacement}
        active={active}
        renderScene={renderScene}
      />
    );
  }

  const result = validation.result;

  if (!result.ok) {
    return (
      <ValidationError
        title="Invalid VizSpec"
        messages={result.errors}
        onError={onError}
      />
    );
  }

  const { scene, themeMode, mode, camera, provenance, params, palette: paletteHint } = result.spec;
  const caption = requiresHonestyCaption(provenance)
    ? defaultHonestyCaption(provenance)
    : null;
  const palette = paletteHint
    ? getPalette(paletteHint)
    : activePalette ?? getPalette('crameri');
  return (
    <SceneFrame
      skill={result.spec.skill}
      scene={scene}
      themeMode={themeMode}
      mode={mode}
      camera={camera}
      palette={palette}
      params={params}
      provenance={provenance}
      caption={caption}
      captionPlacement={captionPlacement}
      active={active}
      renderScene={renderScene}
    />
  );
}

interface ValidationErrorProps {
  title: string;
  messages: readonly string[];
  errors?: readonly SkillInvocationError[];
  onError?: (errors: string[]) => void;
  onInvocationError?: (errors: readonly SkillInvocationError[]) => void;
}

function ValidationError({
  title,
  messages,
  errors,
  onError,
  onInvocationError,
}: ValidationErrorProps) {
  // Reporting is an effect, never a render-time side effect. The content key
  // prevents duplicate reports when a state-setting callback is recreated by a
  // parent render. Callback refs keep the reporting effect keyed only on error
  // content, avoiding an effect → parent setState → new callback → effect loop.
  const contentKey = errors ? JSON.stringify(errors) : messages.join('\n');
  const onErrorRef = useRef(onError);
  const onInvocationErrorRef = useRef(onInvocationError);
  const reportedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    onErrorRef.current = onError;
    onInvocationErrorRef.current = onInvocationError;
  }, [onError, onInvocationError]);
  useEffect(() => {
    if (reportedKeyRef.current === contentKey) return;
    reportedKeyRef.current = contentKey;
    onErrorRef.current?.([...messages]);
    if (errors) onInvocationErrorRef.current?.(errors);
    // contentKey serializes the complete payload; identical content should not
    // report again merely because the parent created new array identities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  return (
    <div role="alert" aria-live="assertive" className="cortexel-vizspec-error">
      <strong>{title}</strong>
      <p>Fix the fields below and validate the visualization again.</p>
      <ul>
        {messages.map((message, index) => (
          <li key={`${index}-${message}`}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

interface SceneFrameProps {
  skill?: string;
  scene: SceneName;
  themeMode: 'dark' | 'light';
  mode: 'interactive' | 'export';
  camera?: CameraHint;
  palette: ReadonlySemanticPalette;
  params: Readonly<Record<string, unknown>>;
  provenance: Readonly<ProvenanceMetadata>;
  caption: string | null;
  captionPlacement: 'overlay' | 'footer';
  active: boolean;
  renderScene: (args: RenderSceneArgs) => ReactNode;
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
  renderScene,
}: SceneFrameProps) {
  if (mode === 'export') {
    return (
      <div role="status" className="cortexel-vizspec-export-unsupported">
        Headless export rendering is not available in this build. Request an
        interactive render, or use the backend render endpoint once enabled.
      </div>
    );
  }

  return (
    <div
      className="cortexel-vizspec"
      style={{
        position: 'relative',
        width: '100%',
        height: captionPlacement === 'footer' ? 'auto' : '100%',
      }}
    >
      {renderScene({
        skill,
        scene,
        themeMode,
        active,
        camera,
        palette,
        params: cloneValidatedJson(params),
        provenance: cloneValidatedJson(provenance),
      })}
      {caption && (
        <div
          className="cortexel-honesty-caption"
          role="note"
          aria-live="polite"
          aria-label="Scientific provenance disclosure"
          style={{
            position: captionPlacement === 'footer' ? 'relative' : 'absolute',
            left: captionPlacement === 'footer' ? 0 : 12,
            bottom: captionPlacement === 'footer' ? 'auto' : 12,
            maxWidth: captionPlacement === 'footer' ? '100%' : '70%',
            width: captionPlacement === 'footer' ? '100%' : 'auto',
            boxSizing: 'border-box',
            marginTop: captionPlacement === 'footer' ? 8 : 0,
            padding: '4px 10px',
            borderRadius: 6,
            // Okabe-Ito amber on opaque dark — bloom-safe (DOM, not emissive).
            background: 'rgba(20,22,28,0.92)',
            color: '#e69f00',
            fontSize: 12,
            lineHeight: 1.4,
            pointerEvents: 'none',
          }}
        >
          <bdi dir="auto" style={{ unicodeBidi: 'isolate' }}>{caption}</bdi>
        </div>
      )}
    </div>
  );
}
