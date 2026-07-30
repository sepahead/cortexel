type JsonRecord = Record<string, any>;

/**
 * Validate the source identity relation that JSON Schema cannot express.
 * `sourceId` identifies a mapping role/profile and must be unique; `system`
 * identifies a provider/profile class and may intentionally repeat.
 */
export function adapterSourceIdentityProblems(
  mapping: JsonRecord,
  label = `mapping ${String(mapping.mappingId)}`,
): string[] {
  const problems: string[] = [];
  const sourceIds = new Set<string>();
  for (const [index, source] of (mapping.sources ?? []).entries()) {
    if (typeof source.sourceId !== 'string') continue;
    if (sourceIds.has(source.sourceId)) {
      problems.push(
        `${label} sources[${index}]: duplicate sourceId "${source.sourceId}"`,
      );
    }
    sourceIds.add(source.sourceId);
  }
  return problems;
}
