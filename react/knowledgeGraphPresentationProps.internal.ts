import { KNOWLEDGE_GRAPH_LIMITS } from '../core/skills/knowledgeGraphLimits';
import { SAFE_DISPLAY_STRING_PATTERN } from '../core/safeRuntime';

function hasWellFormedUtf16(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (index + 1 >= value.length) return false;
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

export function assertKnowledgeGraphNodeReference(
  value: unknown,
  label: string,
): asserts value is string | null {
  if (value === null) return;
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength ||
    !hasWellFormedUtf16(value) ||
    !SAFE_DISPLAY_STRING_PATTERN.test(value)
  ) {
    throw new TypeError(
      `${label} must be a non-empty well-formed display-safe string <= ` +
        `${KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength} characters or null`,
    );
  }
}

export function assertKnowledgeGraphColor(value: unknown, label: string): void {
  if (value === undefined) return;
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > KNOWLEDGE_GRAPH_LIMITS.maxColorLength ||
    !hasWellFormedUtf16(value) ||
    !SAFE_DISPLAY_STRING_PATTERN.test(value)
  ) {
    throw new TypeError(
      `${label} must be a non-empty well-formed display-safe string <= ` +
        `${KNOWLEDGE_GRAPH_LIMITS.maxColorLength} characters`,
    );
  }
}
