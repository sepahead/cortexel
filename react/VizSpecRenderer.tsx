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

import type { ReactNode } from 'react';
import type { SceneName } from '../core/designLaws';
import {
  defaultHonestyCaption,
  requiresHonestyCaption,
} from '../core/provenance';
import { validateVizSpec } from '../core/vizSpec';
import { validateSkillInvocation } from '../core/skills/validateSkillInvocation';

export type CameraHint = 'default' | 'top' | 'side' | 'close' | 'cinematic';

export interface RenderSceneArgs {
  scene: SceneName;
  themeMode: 'dark' | 'light';
  active: boolean;
  /** Requested camera framing from the spec (undefined → host default). */
  camera?: CameraHint;
}

export interface VizSpecRendererProps {
  /** Untrusted spec (e.g. an agent payload). Validated before rendering. */
  spec: unknown;
  /** Host-injected scene renderer. Keeps Cortexel free of app dependencies. */
  renderScene: (args: RenderSceneArgs) => ReactNode;
  /** When set, the spec is validated through the strict skill gate
   *  (validateSkillInvocation): per-skill params + declared provenance keys are
   *  enforced, calibrated_posterior=true is rejected, and the honesty caption is
   *  bound at this render boundary. Prefer this for agent payloads. */
  skillId?: string;
  active?: boolean;
  onError?: (errors: string[]) => void;
}

export function VizSpecRenderer({
  spec,
  renderScene,
  skillId,
  active = true,
  onError,
}: VizSpecRendererProps) {
  // Strict, skill-aware path: the documented agent entrypoint.
  if (skillId) {
    const gated = validateSkillInvocation(skillId, spec);
    if (!gated.ok) {
      const messages = gated.errors.map((e) => `${e.path}: ${e.message}`);
      onError?.(messages);
      return (
        <div role="alert" className="cortexel-vizspec-error">
          <strong>Invalid skill invocation ({skillId})</strong>
          <ul>
            {messages.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      );
    }
    return (
      <SceneFrame
        scene={gated.scene}
        themeMode={gated.spec.themeMode}
        mode={gated.spec.mode}
        camera={gated.spec.camera}
        // Honesty is bound here: the gate already resolved the caption (fail-
        // closed), so the renderer cannot "forget" it.
        caption={gated.caption}
        active={active}
        renderScene={renderScene}
      />
    );
  }

  const result = validateVizSpec(spec);

  if (!result.ok) {
    onError?.(result.errors);
    return (
      <div role="alert" className="cortexel-vizspec-error">
        <strong>Invalid VizSpec</strong>
        <ul>
          {result.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }

  const { scene, themeMode, mode, camera, provenance } = result.spec;
  const caption = requiresHonestyCaption(provenance)
    ? defaultHonestyCaption(provenance)
    : null;
  return (
    <SceneFrame
      scene={scene}
      themeMode={themeMode}
      mode={mode}
      camera={camera}
      caption={caption}
      active={active}
      renderScene={renderScene}
    />
  );
}

interface SceneFrameProps {
  scene: SceneName;
  themeMode: 'dark' | 'light';
  mode: 'interactive' | 'export';
  camera?: CameraHint;
  caption: string | null;
  active: boolean;
  renderScene: (args: RenderSceneArgs) => ReactNode;
}

function SceneFrame({
  scene,
  themeMode,
  mode,
  camera,
  caption,
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
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {renderScene({ scene, themeMode, active, camera })}
      {caption && (
        <div
          className="cortexel-honesty-caption"
          role="note"
          aria-live="polite"
          aria-label="Scientific provenance disclosure"
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            maxWidth: '70%',
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
          {caption}
        </div>
      )}
    </div>
  );
}
