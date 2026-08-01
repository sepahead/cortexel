import { KNOWLEDGE_GRAPH_LIMITS } from '../core/skills/knowledgeGraphLimits';

export interface KnowledgeGraphPresentationBudgetReceiptV1 {
  /** Input-container/value occurrences inspected and copied, counted per alias occurrence. */
  readonly retainedOccurrences: number;
  /** UTF-16 code units read from accepted caller-supplied strings. */
  readonly sourceStringCodeUnits: number;
  /** Prototype, key, and descriptor inspection operations, including revalidation. */
  readonly inspectionWork: number;
}

/**
 * Source-internal counter. It is intentionally not exported by the packaged
 * capability entry: callers able to mutate this prototype could suppress the
 * limits before an official preparer mints WeakSet membership.
 */
export class KnowledgeGraphPresentationBudgetCounter {
  retainedOccurrences = 0;
  sourceStringCodeUnits = 0;
  inspectionWork = 0;

  retain(label: string, count = 1): void {
    this.retainedOccurrences += count;
    if (
      this.retainedOccurrences >
      KNOWLEDGE_GRAPH_LIMITS.maxPresentationRetainedOccurrences
    ) {
      throw new RangeError(
        `${label} exceeds the aggregate retained-occurrence limit of ` +
          `${KNOWLEDGE_GRAPH_LIMITS.maxPresentationRetainedOccurrences}`,
      );
    }
  }

  string(value: string, label: string): void {
    this.sourceStringCodeUnits += value.length;
    if (
      this.sourceStringCodeUnits >
      KNOWLEDGE_GRAPH_LIMITS.maxPresentationStringCodeUnits
    ) {
      throw new RangeError(
        `${label} exceeds the aggregate source-string limit of ` +
          `${KNOWLEDGE_GRAPH_LIMITS.maxPresentationStringCodeUnits} UTF-16 code units`,
      );
    }
  }

  inspect(label: string, count = 1): void {
    this.inspectionWork += count;
    if (
      this.inspectionWork >
      KNOWLEDGE_GRAPH_LIMITS.maxPresentationInspectionWork
    ) {
      throw new RangeError(
        `${label} exceeds the aggregate inspection-work limit of ` +
          `${KNOWLEDGE_GRAPH_LIMITS.maxPresentationInspectionWork}`,
      );
    }
  }

  receipt(): KnowledgeGraphPresentationBudgetReceiptV1 {
    return {
      retainedOccurrences: this.retainedOccurrences,
      sourceStringCodeUnits: this.sourceStringCodeUnits,
      inspectionWork: this.inspectionWork,
    };
  }
}
