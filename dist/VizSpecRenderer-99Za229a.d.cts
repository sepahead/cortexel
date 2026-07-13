import * as react from 'react';
import { ReactNode } from 'react';
import { S as SceneName, P as ProvenanceMetadata, a as SkillInvocationError } from './hostInvocation-B4xa-O3Q.cjs';
import { R as ReadonlySemanticPalette } from './colormaps-CZ6XejJa.cjs';

type CameraHint = 'default' | 'top' | 'side' | 'close' | 'cinematic';
interface RenderSceneArgs {
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
interface VizSpecRendererProps {
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
declare function VizSpecRenderer({ spec, renderScene, skillId, trustedEnvelope, active, activePalette, captionPlacement, onError, onInvocationError, }: VizSpecRendererProps): react.JSX.Element;

export { type CameraHint as C, type RenderSceneArgs as R, VizSpecRenderer as V, type VizSpecRendererProps as a };
