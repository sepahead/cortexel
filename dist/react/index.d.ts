import * as react from 'react';
import { ReactNode } from 'react';
import { i as SceneName } from '../designLaws-DjS3Nx-h.js';

interface PopulationExpandController {
    selectedPopId: string | null;
    hoveredPopId: string | null;
    setSelectedPopId: (id: string | null) => void;
    setHoveredPopId: (id: string | null) => void;
}
interface PopulationExpand extends PopulationExpandController {
    isSelected: (id: string) => boolean;
    isHovered: (id: string) => boolean;
    isAnySelected: () => boolean;
    /** Toggle selection: selecting an already-selected id clears it. */
    toggleSelected: (id: string) => void;
    reset: () => void;
}
declare function usePopulationExpand(controlled?: PopulationExpandController): PopulationExpand;

interface ExpandablePopulationProps {
    /** Stable population id (used by the owning scene's selection state). */
    id: string;
    position: [number, number, number];
    color: string;
    isSelected: boolean;
    isAnySelected: boolean;
    isHovered: boolean;
    onHover: (hovered: boolean) => void;
    onClick: () => void;
    themeMode: 'dark' | 'light';
    /** Cube edge length (STDP/Cortical hubs use 0.3). */
    size?: number;
    reducedMotion?: boolean;
}
declare function ExpandablePopulation({ position, color, isSelected, isAnySelected, isHovered, onHover, onClick, themeMode, size, reducedMotion, }: ExpandablePopulationProps): react.JSX.Element;

type CameraHint = 'default' | 'top' | 'side' | 'close' | 'cinematic';
interface RenderSceneArgs {
    scene: SceneName;
    themeMode: 'dark' | 'light';
    active: boolean;
    /** Requested camera framing from the spec (undefined → host default). */
    camera?: CameraHint;
}
interface VizSpecRendererProps {
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
declare function VizSpecRenderer({ spec, renderScene, skillId, active, onError, }: VizSpecRendererProps): react.JSX.Element;

export { type CameraHint, ExpandablePopulation, type ExpandablePopulationProps, type PopulationExpand, type PopulationExpandController, type RenderSceneArgs, VizSpecRenderer, type VizSpecRendererProps, usePopulationExpand };
