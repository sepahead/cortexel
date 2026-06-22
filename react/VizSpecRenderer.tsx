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
  active?: boolean;
  onError?: (errors: string[]) => void;
}

export function VizSpecRenderer({
  spec,
  renderScene,
  active = true,
  onError,
}: VizSpecRendererProps) {
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

  if (mode === 'export') {
    return (
      <div role="status" className="cortexel-vizspec-export-unsupported">
        Headless export rendering is not available in this build. Request an
        interactive render, or use the backend render endpoint once enabled.
      </div>
    );
  }

  const showCaption = requiresHonestyCaption(provenance);

  return (
    <div
      className="cortexel-vizspec"
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {renderScene({ scene, themeMode, active, camera })}
      {showCaption && (
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
          {defaultHonestyCaption(provenance)}
        </div>
      )}
    </div>
  );
}
