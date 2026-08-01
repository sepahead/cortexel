export interface KnowledgeGraphA11yNavigationPlan {
  readonly matchCursor: number;
  readonly nodePage: number;
}

/**
 * Choose one internally consistent cursor/page pair. Selection may establish
 * the initial query target, but explicit next/previous navigation owns later
 * transitions until the bound query/data/selection context changes.
 */
export function planKnowledgeGraphA11yNavigation(
  queryActive: boolean,
  queryMatchIndexes: readonly number[],
  selectedIndex: number,
  pageSize: number,
  pageCount: number,
): KnowledgeGraphA11yNavigationPlan {
  const boundedPageCount = Math.max(1, pageCount);
  if (queryActive && queryMatchIndexes.length > 0) {
    const selectedCursor = selectedIndex < 0
      ? -1
      : queryMatchIndexes.indexOf(selectedIndex);
    const matchCursor = selectedCursor < 0 ? 0 : selectedCursor;
    const rowIndex = queryMatchIndexes[matchCursor] ?? 0;
    return Object.freeze({
      matchCursor,
      nodePage: Math.min(
        boundedPageCount - 1,
        Math.max(0, Math.floor(rowIndex / pageSize)),
      ),
    });
  }
  return Object.freeze({
    matchCursor: 0,
    nodePage: selectedIndex < 0
      ? 0
      : Math.min(
          boundedPageCount - 1,
          Math.max(0, Math.floor(selectedIndex / pageSize)),
        ),
  });
}

/** Bind navigation state to every datum that can change target identity. */
export function knowledgeGraphA11yNavigationContextKey(
  normalizedQuery: string,
  pageSize: number,
  selectedId: string | null,
  orderedNodeIds: readonly string[],
  orderedMatchIds: readonly string[],
): string {
  return JSON.stringify([
    normalizedQuery,
    pageSize,
    selectedId,
    orderedNodeIds,
    orderedMatchIds,
  ]);
}
