import type { ReadonlySemanticPalette } from '../../core/colormaps';
import type { SkillInvocationError } from '../../core/skills/validateSkillInvocation';
import { VizSpecRenderer } from '../VizSpecRenderer';
import { ReferenceChartScene } from './ReferenceChartScene';

export interface ReferenceVizSpecFigureProps {
  /** Untrusted agent payload. It is always routed through VizSpecRenderer's
   * strict skill-aware gate; this wrapper has no trusted-envelope escape hatch. */
  spec: unknown;
  skillId?: string;
  active?: boolean;
  activePalette?: ReadonlySemanticPalette;
  width?: number;
  height?: number;
  onError?: (errors: string[]) => void;
  onInvocationError?: (errors: readonly SkillInvocationError[]) => void;
}

/** Strict agent-spec -> canonical SVG chart path. VizSpecRenderer remains the
 * owner of validation and the mandatory honesty caption; ReferenceChartScene
 * sees only its detached, checked params/provenance snapshot. */
export function ReferenceVizSpecFigure({
  spec,
  skillId,
  active = true,
  activePalette,
  width,
  height,
  onError,
  onInvocationError,
}: ReferenceVizSpecFigureProps) {
  return (
    <VizSpecRenderer
      spec={spec}
      skillId={skillId}
      active={active}
      activePalette={activePalette}
      onError={onError}
      onInvocationError={onInvocationError}
      captionPlacement="footer"
      renderScene={(args) => (
        <ReferenceChartScene {...args} width={width} height={height} />
      )}
    />
  );
}
