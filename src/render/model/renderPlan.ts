/**
 * RenderPlanV1 — the framework-neutral description of a figure.
 *
 * A render plan is the complete, bounded, semantic description of a figure AFTER
 * validation and derivation, and BEFORE any drawing. It is not "drawing instructions":
 * it is a closed data structure with no JSX, no DOM node, no callback, no random number,
 * no clock read, and no unresolved data handle.
 *
 * This is what lets the CLI and React produce provably identical figures. Both consume
 * the same plan; a test compares their text, disclosures, scale domains, and table rows.
 * A renderer that computed a value the plan did not carry could diverge — so it cannot.
 *
 * The mark union is CLOSED. There is deliberately no raw-SVG-attribute escape hatch: a
 * mark that could carry an arbitrary attribute could carry an event handler or an
 * external URL, and the plan would become an unsafe visualization grammar rather than a
 * scientific contract.
 */

export interface RenderPlanV1 {
  readonly version: 1;
  readonly figureId: string;
  readonly skillId: string;
  readonly width: number;
  readonly height: number;
  readonly title: string;
  readonly subtitle?: string;
  readonly themeId: string;
  readonly panels: readonly Panel[];
  readonly legend?: LegendItem[];
  readonly disclosures: readonly DisclosureBlock[];
  readonly table: TableModel;
  readonly accessibility: AccessibilityModel;
  /** Binds the plan to the validated canonical request it was compiled from. */
  readonly sourceRequestDigest: string;
}

export interface DisclosureBlock {
  readonly id: string;
  readonly severity: 'critical' | 'important' | 'informational';
  readonly text: string;
}

export interface LegendItem {
  readonly label: string;
  readonly color: string;
  readonly outlineColor?: string;
  readonly glyph?: 'series' | 'band' | 'whisker' | 'rule';
  readonly dash?: string;
  readonly marker?: string;
}

export interface Panel {
  readonly id: string;
  readonly label?: string;
  /** Panel bounds in figure coordinates. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly axes: readonly Axis[];
  readonly marks: readonly Mark[];
  /** A structured empty state, when there is nothing valid to draw. */
  readonly noData?: { readonly reason: string };
}

export interface Axis {
  readonly orientation: 'bottom' | 'left' | 'top' | 'right';
  readonly label: string;
  readonly ticks: readonly { readonly position: number; readonly label: string }[];
  readonly transform: 'linear' | 'log' | 'symlog' | 'band';
}

/**
 * The closed mark union. Every mark references pre-computed device-independent
 * coordinates; none carries a style string, a URL, a callback, or an event handler.
 */
export type Mark =
  | LineMark
  | ArrowMark
  | PointMark
  | RectMark
  | RuleMark
  | AreaMark
  | PathMark
  | TextMark
  | GroupMark;

/**
 * Source-bound identity for one atomic data carrier. The internal OutputAuthority gate
 * reads these tags from the actual plan. Every atomic primitive is classified: a data
 * carrier, a synthetic connector vertex, or a decorative mark. The field remains
 * optional only while existing family compilers are migrated; the emission gate treats
 * absence as an invariant violation, so extra untagged scientific geometry cannot hide.
 *
 * V1 intentionally binds identity/order only. It does not claim numeric coordinate
 * correctness until a skill opts into an independent canonical-geometry evaluator.
 */
export interface OutputAuthorityCarrierV1 {
  readonly tag: 'data_carrier';
  readonly classId: string;
  readonly provenance: import('../../core/parse-json.js').JsonValue;
}

export interface OutputAuthorityConnectorV1 {
  /** Synthetic vertex needed to connect/close data geometry; never a carrier. */
  readonly tag: 'connector';
}

export interface OutputAuthorityDecorativeMarkV1 {
  /** Explicitly presentation-only atomic geometry; never a carrier. */
  readonly tag: 'decorative_mark';
}

export type OutputAuthorityAtomicRoleV1 =
  | OutputAuthorityCarrierV1
  | OutputAuthorityConnectorV1
  | OutputAuthorityDecorativeMarkV1;

export interface LineMark {
  readonly type: 'line';
  /** Each subpath is a run of connected points; a gap in the data starts a NEW subpath. */
  readonly subpaths: readonly (readonly {
    readonly x: number;
    readonly y: number;
    /** Transitional optionality only; the emission gate refuses every unclassified atom. */
    readonly authority?: OutputAuthorityAtomicRoleV1;
  }[])[];
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly dash?: string;
}

/**
 * A direction-bearing arrowhead whose orientation is fixed by two plan coordinates.
 * Keeping this primitive in the closed plan grammar prevents a serializer from guessing
 * direction from path order, marker defaults, animation, or colour.
 */
export interface ArrowMark {
  readonly type: 'arrow';
  readonly arrows: readonly {
    readonly from: { readonly x: number; readonly y: number };
    readonly to: { readonly x: number; readonly y: number };
    readonly authority?: OutputAuthorityAtomicRoleV1;
  }[];
  readonly fill: string;
  readonly size: number;
}

export interface PointMark {
  readonly type: 'point';
  readonly points: readonly {
    readonly x: number;
    readonly y: number;
    readonly authority?: OutputAuthorityAtomicRoleV1;
  }[];
  readonly fill: string;
  readonly radius: number;
  readonly shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'star' | 'plus' | 'hexagon';
}

export interface RectMark {
  readonly type: 'rect';
  readonly rects: readonly {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly fill: string;
    readonly authority?: OutputAuthorityAtomicRoleV1;
  }[];
  readonly stroke?: string;
}

export interface RuleMark {
  readonly type: 'rule';
  readonly orientation: 'horizontal' | 'vertical';
  readonly lines: readonly {
    readonly position: number;
    readonly from: number;
    readonly to: number;
    readonly authority?: OutputAuthorityAtomicRoleV1;
  }[];
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly dash?: string;
}

export interface AreaMark {
  readonly type: 'area';
  readonly subpaths: readonly (readonly {
    readonly x: number;
    readonly y0: number;
    readonly y1: number;
    readonly authority?: OutputAuthorityAtomicRoleV1;
  }[])[];
  readonly fill: string;
  readonly opacity: number;
  /** Full-opacity boundary needed for non-text contrast and zero-area pointwise intervals. */
  readonly stroke?: string;
  readonly strokeWidth?: number;
}

export interface PathMark {
  readonly type: 'path';
  /** Step/stem paths built from explicit segments; never a smoothed curve. */
  readonly subpaths: readonly (readonly {
    readonly x: number;
    readonly y: number;
    readonly authority?: OutputAuthorityAtomicRoleV1;
  }[])[];
  readonly stroke: string;
  readonly strokeWidth: number;
}

export interface TextMark {
  readonly type: 'text';
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly fontSize: number;
  readonly fill: string;
  readonly decorative?: boolean;
}

export interface GroupMark {
  readonly type: 'group';
  readonly id: string;
  readonly marks: readonly Mark[];
}

export interface TableModel {
  /** Every accepted row is returned on FigureResult.table; no sidecar/reference mode exists in V1. */
  readonly policy: 'complete_returned';
  readonly columns: readonly { readonly key: string; readonly header: string }[];
  readonly rows: readonly (readonly (string | number | null)[])[];
  /** Kept as an artifact-facing count name; for complete_returned it must equal rows.length and rowsTotal. */
  readonly rowsInline: number;
  readonly rowsTotal: number;
  /**
   * Figure-level facts that must accompany every representation of the table.
   * Family compilers may omit this while assembling an internal plan; buildFigure
   * always materializes it before exposing, freezing, or serializing the table.
   */
  readonly metadata?: {
    readonly disclosures: readonly DisclosureBlock[];
  };
}

export interface AccessibilityModel {
  readonly summary: string;
  readonly panelSummaries: readonly string[];
  /** True when each panel publishes its own value range and pooling them would mix axes. */
  readonly suppressGlobalValueRange?: boolean;
}
