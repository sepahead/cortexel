/**
 * Peer-free bind-and-prepare boundary for the experimental legacy corpus graph.
 * Agents and hosts should use this instead of independently pairing a strict
 * caption with a separately mapped presentation.
 */

import {
  getPalette,
  SEMANTIC_PALETTE_KEYS,
  validatePalette,
  type ReadonlySemanticPalette,
  type SemanticPalette,
} from '../core/colormaps';
import { KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS } from
  '../core/skills/knowledgeGraphLimits';
import { validateSpec } from '../core/skills/authoring';
import type { KnowledgeGraph3DParams } from '../core/skills/params';
import { safeDiagnosticText, safeErrorMessage } from '../core/safeRuntime';
import { parseJsonStrict } from '../src/core/parse-json.js';
import type { VizSpec } from '../core/vizSpec';
import {
  knowledgeGraphLiveForceAvailability,
  mapCorpusKnowledgeGraph,
  type KnowledgeGraphLiveForceAvailabilityV1,
} from './knowledgeGraph';
import {
  prepareKnowledgeGraphView,
  type KnowledgeGraphViewPolicyV1,
  type PreparedKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphViewV1,
} from './knowledgeGraphPresentation.internal';
import { KNOWLEDGE_GRAPH_BACKGROUND_COLORS } from
  './knowledgeGraphVisualEncoding.internal';

export interface KnowledgeGraphFigureHostPolicyV1 {
  readonly presentation: PreparedKnowledgeGraphPresentationV1;
  /** Exact source-bound view; undefined means the complete presentation. */
  readonly view: PreparedKnowledgeGraphViewV1 | undefined;
  /** Authority of the complete VizSpec input boundary, before strict validation. */
  readonly sourceInputAssurance: KnowledgeGraphFigureSourceInputAssuranceV1;
  readonly palette: ReadonlySemanticPalette;
  readonly themeMode: VizSpec['themeMode'];
  /** Exact background required by the scene's contrast and blending policy. */
  readonly backgroundColor: string;
  readonly camera: VizSpec['camera'];
  /** Exact active-view admission result for the main-thread d3 force solver. */
  readonly liveForceAvailability: KnowledgeGraphLiveForceAvailabilityV1;
}

export interface KnowledgeGraphFigurePreparationErrorV1 {
  readonly code:
    | 'input_boundary_rejected'
    | 'raw_json_rejected'
    | 'strict_gate_rejected'
    | 'wrong_skill'
    | 'unsupported_mode'
    | 'missing_bound_caption'
    | 'presentation_preparation_failed'
    | 'view_preparation_failed';
  readonly path: string;
  readonly message: string;
  readonly gateCode?: string;
}

export type KnowledgeGraphFigureSourceInputAssuranceV1 =
  | Readonly<{
      readonly boundary: 'raw_json_text';
      readonly duplicateMembers: 'rejected_before_materialization';
    }>
  | Readonly<{
      readonly boundary: 'materialized_javascript_value';
      readonly duplicateMembers: 'not_observable_after_materialization';
    }>;

export interface AcceptedKnowledgeGraphFigureSourceV1 {
  readonly caption: string;
  readonly sourceInputAssurance: KnowledgeGraphFigureSourceInputAssuranceV1;
  readonly presentation: PreparedKnowledgeGraphPresentationV1 & {
    readonly profile: 'corpus_entity';
  };
}

export type PrepareCorpusKnowledgeGraphFigureResultV1 =
  | {
      readonly ok: true;
      readonly caption: string;
      readonly sourceInputAssurance: KnowledgeGraphFigureSourceInputAssuranceV1;
      readonly presentation: PreparedKnowledgeGraphPresentationV1 & {
        readonly profile: 'corpus_entity';
      };
      readonly view: PreparedKnowledgeGraphViewV1 | undefined;
      readonly hostPolicy: Readonly<KnowledgeGraphFigureHostPolicyV1>;
    }
  | {
      readonly ok: false;
      readonly errors: readonly Readonly<KnowledgeGraphFigurePreparationErrorV1>[];
      /** Present only when source validation/mapping passed but view policy failed. */
      readonly acceptedSource?: Readonly<AcceptedKnowledgeGraphFigureSourceV1>;
    };

export interface PrepareCorpusKnowledgeGraphFigureOptionsV1 {
  /** Trusted host fallback used only when the validated spec has no palette hint. */
  readonly activePalette?: ReadonlySemanticPalette;
  /** Strict visual-kind policy; omission means the complete presentation. */
  readonly viewPolicy?: KnowledgeGraphViewPolicyV1;
}

const MATERIALIZED_SOURCE_INPUT_ASSURANCE = Object.freeze({
  boundary: 'materialized_javascript_value' as const,
  duplicateMembers: 'not_observable_after_materialization' as const,
});
const RAW_JSON_SOURCE_INPUT_ASSURANCE = Object.freeze({
  boundary: 'raw_json_text' as const,
  duplicateMembers: 'rejected_before_materialization' as const,
});

function snapshotHostPalette(value: ReadonlySemanticPalette): ReadonlySemanticPalette {
  // The first pass closes the source shape; the second validates the detached
  // descriptor snapshot, avoiding a mutable host object in the returned policy.
  validatePalette(value);
  const snapshot = Object.create(null) as SemanticPalette;
  for (const key of SEMANTIC_PALETTE_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, 'value')
    ) {
      throw new TypeError(`active palette ${key} must remain an enumerable data property`);
    }
    snapshot[key] = descriptor.value as string;
  }
  validatePalette(snapshot);
  return Object.freeze(snapshot);
}

function failure(
  error: KnowledgeGraphFigurePreparationErrorV1,
  acceptedSource?: AcceptedKnowledgeGraphFigureSourceV1,
): PrepareCorpusKnowledgeGraphFigureResultV1 {
  const result: {
    ok: false;
    errors: readonly Readonly<KnowledgeGraphFigurePreparationErrorV1>[];
    acceptedSource?: Readonly<AcceptedKnowledgeGraphFigureSourceV1>;
  } = {
    ok: false,
    errors: Object.freeze([Object.freeze(error)]),
  };
  if (acceptedSource !== undefined) {
    result.acceptedSource = Object.freeze(acceptedSource);
  }
  return Object.freeze(result);
}

/**
 * Strictly validate one self-describing legacy VizSpec, require the exact corpus
 * skill and interactive intent, derive its mandatory caption, map only the
 * checked params, and return one bound immutable presentation/host-policy pair.
 *
 * This function performs no I/O and never throws for data/policy rejection. It
 * does not authenticate snapshot declarations, evidence references, mapper
 * provenance, or scientific claims, and it does not make WebGL deterministic.
 */
function prepareCorpusKnowledgeGraphFigureWithAssurance(
  spec: unknown,
  options: PrepareCorpusKnowledgeGraphFigureOptionsV1,
  sourceInputAssurance: KnowledgeGraphFigureSourceInputAssuranceV1,
): PrepareCorpusKnowledgeGraphFigureResultV1 {
  const gated = validateSpec(spec);
  if (!gated.ok) {
    return {
      ok: false,
      errors: Object.freeze(gated.errors.slice(0, 16).map((error) => Object.freeze({
        code: 'strict_gate_rejected' as const,
        path: safeDiagnosticText(error.path, 240),
        message: safeDiagnosticText(error.message, 600),
        gateCode: safeDiagnosticText(error.code, 120),
      }))),
    };
  }
  if (gated.skill !== 'corpus.knowledge_graph') {
    return failure({
      code: 'wrong_skill',
      path: 'skill',
      message: `requires corpus.knowledge_graph; received ${
        safeDiagnosticText(gated.skill, 80)
      }`,
    });
  }
  if (gated.spec.mode !== 'interactive') {
    return failure({
      code: 'unsupported_mode',
      path: 'mode',
      message: 'requires interactive mode; use an explicit export workflow for mode=export',
    });
  }
  if (gated.caption === null || gated.caption.length < 1) {
    return failure({
      code: 'missing_bound_caption',
      path: 'provenance',
      message: 'the strict gate did not return the required honesty caption',
    });
  }
  try {
    const selectedPalette = gated.spec.palette !== undefined
      ? getPalette(gated.spec.palette)
      : options.activePalette ?? getPalette('crameri');
    const palette = snapshotHostPalette(selectedPalette);
    const presentation = mapCorpusKnowledgeGraph(
      gated.spec.params as KnowledgeGraph3DParams,
      palette,
    );
    let view: PreparedKnowledgeGraphViewV1 | undefined;
    try {
      view = options.viewPolicy === undefined
        ? undefined
        : prepareKnowledgeGraphView(presentation, options.viewPolicy);
    } catch (error) {
      return failure({
        code: 'view_preparation_failed',
        path: 'viewPolicy',
        message: `knowledge-graph view preparation failed: ${safeErrorMessage(error)}`,
      }, {
        caption: gated.caption,
        sourceInputAssurance,
        presentation,
      });
    }
    const hostPolicy = Object.freeze({
      presentation,
      view,
      sourceInputAssurance,
      palette,
      themeMode: gated.spec.themeMode,
      backgroundColor: KNOWLEDGE_GRAPH_BACKGROUND_COLORS[gated.spec.themeMode],
      camera: gated.spec.camera,
      liveForceAvailability: knowledgeGraphLiveForceAvailability(
        view?.nodes.length ?? presentation.nodes.length,
        view?.edges.length ?? presentation.edges.length,
      ),
    });
    return Object.freeze({
      ok: true,
      caption: gated.caption,
      sourceInputAssurance,
      presentation,
      view,
      hostPolicy,
    });
  } catch (error) {
    return failure({
      code: 'presentation_preparation_failed',
      path: 'params',
      message: `knowledge-graph presentation preparation failed: ${safeErrorMessage(error)}`,
    });
  }
}

/**
 * Materialized-value boundary for a complete corpus VizSpec. It runs the same
 * strict skill, mapping, caption, view, and host-policy pipeline as the raw-text
 * entry, while recording honestly that duplicate JSON members are no longer
 * observable after a host has materialized the value.
 */
export function prepareCorpusKnowledgeGraphFigure(
  spec: unknown,
  options: PrepareCorpusKnowledgeGraphFigureOptionsV1 = {},
): PrepareCorpusKnowledgeGraphFigureResultV1 {
  return prepareCorpusKnowledgeGraphFigureWithAssurance(
    spec,
    options,
    MATERIALIZED_SOURCE_INPUT_ASSURANCE,
  );
}

/**
 * Strict raw-text boundary for a complete corpus VizSpec. It rejects duplicate
 * members and parser-budget violations before materialization, then runs the
 * same strict skill, mapping, caption, view, and host-policy pipeline as the
 * materialized-value entry. Ordinary rejection is returned and never thrown.
 */
export function prepareCorpusKnowledgeGraphFigureJson(
  text: string,
  options: PrepareCorpusKnowledgeGraphFigureOptionsV1 = {},
): PrepareCorpusKnowledgeGraphFigureResultV1 {
  const parsed = parseJsonStrict(text, {
    limits: KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS,
  });
  if (!parsed.ok) {
    return Object.freeze({
      ok: false as const,
      errors: Object.freeze(parsed.errors.slice(0, 16).map((error) => Object.freeze({
        code: 'raw_json_rejected' as const,
        path: safeDiagnosticText(error.instancePath || '(input)', 240),
        message: safeDiagnosticText(error.message, 600),
        gateCode: safeDiagnosticText(error.code, 120),
      }))),
    });
  }
  return prepareCorpusKnowledgeGraphFigureWithAssurance(
    parsed.value,
    options,
    RAW_JSON_SOURCE_INPUT_ASSURANCE,
  );
}
