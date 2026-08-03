/** Closed source-map syntax and source-identity authority shared by build and smoke gates. */

import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * Exact repository inputs represented by the reviewed tsdown source-map closure.
 *
 * This is intentionally an inventory rather than a broad recursive source glob: an
 * ignored or newly-created source-looking file must not become publishable merely
 * because a compiler happened to include its bytes in `sourcesContent`.
 */
export const REVIEWED_PACKAGE_SOURCE_MAP_INPUTS = Object.freeze([
  'core/colormaps.ts',
  'core/designLaws.ts',
  'core/nest/adapters.ts',
  'core/nest/analysis.ts',
  'core/nest/modelSemantics.ts',
  'core/nest/safeInput.ts',
  'core/nest/shapes.ts',
  'core/nest/topology.ts',
  'core/provenance.ts',
  'core/safeRuntime.ts',
  'core/skills/authoring.ts',
  'core/skills/corpusKnowledgeGraph.ts',
  'core/skills/examples.ts',
  'core/skills/hostInvocation.ts',
  'core/skills/knowledgeGraphLimits.ts',
  'core/skills/paramPreflight.ts',
  'core/skills/params.ts',
  'core/skills/provenanceKeys.ts',
  'core/skills/registry.ts',
  'core/skills/router.ts',
  'core/skills/skillIds.ts',
  'core/skills/validateSkillInvocation.ts',
  'core/skills/verify.ts',
  'core/vizSpec.ts',
  'react/ExpandableNeurons.tsx',
  'react/ExpandablePopulation.tsx',
  'react/KnowledgeGraph3DScene.tsx',
  'react/KnowledgeGraphA11yList.tsx',
  'react/KnowledgeGraphAccessibleFigure.tsx',
  'react/KnowledgeGraphStaticRecordView.tsx',
  'react/SelectionA11yControls.tsx',
  'react/VizSpecRenderer.tsx',
  'react/charts/ReferenceChartScene.tsx',
  'react/charts/ReferenceVizSpecFigure.tsx',
  'react/charts/chartGeometry.ts',
  'react/charts/topologyGeometry.ts',
  'react/focusLabelResource.internal.ts',
  'react/knowledgeGraph.ts',
  'react/knowledgeGraphA11yNavigation.internal.ts',
  'react/knowledgeGraphCamera.internal.ts',
  'react/knowledgeGraphContextIdentity.internal.ts',
  'react/knowledgeGraphFigure.ts',
  'react/knowledgeGraphIdentity.internal.ts',
  'react/knowledgeGraphInteraction.internal.ts',
  'react/knowledgeGraphLayout.internal.ts',
  'react/knowledgeGraphParticles.internal.ts',
  'react/knowledgeGraphPresentation.internal.ts',
  'react/knowledgeGraphPresentationBudget.internal.ts',
  'react/knowledgeGraphPresentationProps.internal.ts',
  'react/knowledgeGraphVisualEncoding.internal.ts',
  'react/neuronShaders.ts',
  'react/usePopulationExpand.ts',
  'src/adapters/nest/profile.ts',
  'src/adapters/nest/recorders.ts',
  'src/adapters/source-catalog.ts',
  'src/adapters/source-example.ts',
  'src/analysis/bins.ts',
  'src/analysis/correlogram.ts',
  'src/analysis/distributions.ts',
  'src/analysis/matrices.ts',
  'src/analysis/psth.ts',
  'src/analysis/responseCurve.ts',
  'src/analysis/topology.ts',
  'src/analysis/traces.ts',
  'src/authority/evaluators/distributions.ts',
  'src/authority/evaluators/implementation-ids.ts',
  'src/authority/evaluators/matrices.ts',
  'src/authority/evaluators/model.ts',
  'src/authority/evaluators/registry.ts',
  'src/authority/evaluators/topology-dynamics.ts',
  'src/authority/evaluators/traces.ts',
  'src/cli/commands.ts',
  'src/cli/main.ts',
  'src/core/binning.ts',
  'src/core/canonicalize.ts',
  'src/core/contract-identity.ts',
  'src/core/deep-freeze.ts',
  'src/core/deterministic-transcendentals.ts',
  'src/core/disclosures.ts',
  'src/core/errors.ts',
  'src/core/exact-binary64.ts',
  'src/core/limits.ts',
  'src/core/migrate-v0.ts',
  'src/core/numeric.ts',
  'src/core/output-authority.ts',
  'src/core/parse-json.ts',
  'src/core/repairs.ts',
  'src/core/request.ts',
  'src/core/requestBoundary.internal.ts',
  'src/core/response-curve-basis.ts',
  'src/core/safe-snapshot.ts',
  'src/core/semantics/compartment-trace.ts',
  'src/core/semantics/distributions.ts',
  'src/core/semantics/events.ts',
  'src/core/semantics/index.ts',
  'src/core/semantics/nest-time.ts',
  'src/core/semantics/provenance.ts',
  'src/core/semantics/spikes.ts',
  'src/core/semantics/structure.ts',
  'src/core/semantics/topology.ts',
  'src/core/semantics/types.ts',
  'src/core/semantics/uncertainty.ts',
  'src/core/semantics/units.ts',
  'src/core/semantics/weight-trace.ts',
  'src/core/sha256.ts',
  'src/core/source-statements.ts',
  'src/core/spatial.ts',
  'src/core/structural-validator.ts',
  'src/core/units.ts',
  'src/generated/authoring.ts',
  'src/generated/budgets.ts',
  'src/generated/catalog.ts',
  'src/generated/identity.ts',
  'src/generated/registry.ts',
  'src/render/buildFigure.ts',
  'src/render/compile.ts',
  'src/render/compileFamilies.ts',
  'src/render/format.ts',
  'src/render/layout.ts',
  'src/render/output-authority-extract.ts',
  'src/render/output-authority-gate.ts',
  'src/render/plan-closure.ts',
  'src/render/scale.ts',
  'src/render/svg.ts',
] as const);

const REVIEWED_SOURCE_SET: ReadonlySet<string> = new Set(
  REVIEWED_PACKAGE_SOURCE_MAP_INPUTS,
);

/** SHA-256(JSON(sorted [identity, decoded UTF-8 source text] pairs)). */
export const REVIEWED_PACKAGE_SOURCE_MAP_INPUT_CLOSURE_DIGEST =
  'fba15f7ceccd7769fb3c33444d9395a6306c55353b968d4ea474439586380805' as const;

export type SourceMapOwnerKind = 'runtime' | 'declaration';

export interface ReviewedSourceMapMappingsReceipt {
  readonly generatedLines: number;
  readonly segments: number;
  readonly mappedSegments: number;
  readonly namedSegments: number;
}

/**
 * Allocation limits for the reviewed package source-map profile.
 *
 * These are hard gate limits, not promises about normal output size. The current
 * reviewed build is substantially smaller in every dimension; the headroom keeps
 * ordinary compiler evolution frictionless while preventing a malformed compiler
 * result from turning verification itself into an unbounded allocation.
 */
export const REVIEWED_PACKAGE_SOURCE_MAP_LIMITS = Object.freeze({
  mapBytes: 32 * 1024 * 1024,
  generatedCodeBytes: 32 * 1024 * 1024,
  sourceInputBytes: 32 * 1024 * 1024,
  generatedCodeUnits: 16 * 1024 * 1024,
  mappingsUnits: 8 * 1024 * 1024,
  sources: REVIEWED_PACKAGE_SOURCE_MAP_INPUTS.length,
  names: 65_536,
  nameUnits: 16_384,
  aggregateNameUnits: 1024 * 1024,
  aggregateSourceContentUnits: 16 * 1024 * 1024,
  generatedPhysicalLines: 262_144,
  aggregateOriginalPhysicalLines: 262_144,
  segments: 2_000_000,
  referencedNameUnits: 16 * 1024 * 1024,
} as const);

export interface ReviewedSourceMapResourceLimits {
  readonly generatedCodeUnits: number;
  readonly mappingsUnits: number;
  readonly sources: number;
  readonly names: number;
  readonly nameUnits: number;
  readonly aggregateNameUnits: number;
  readonly aggregateSourceContentUnits: number;
  readonly generatedPhysicalLines: number;
  readonly aggregateOriginalPhysicalLines: number;
  readonly segments: number;
  readonly referencedNameUnits: number;
}

const SOURCE_MAP_RESOURCE_LIMIT_KEYS = Object.freeze([
  'generatedCodeUnits',
  'mappingsUnits',
  'sources',
  'names',
  'nameUnits',
  'aggregateNameUnits',
  'aggregateSourceContentUnits',
  'generatedPhysicalLines',
  'aggregateOriginalPhysicalLines',
  'segments',
  'referencedNameUnits',
] as const satisfies readonly (keyof ReviewedSourceMapResourceLimits)[]);

const DEFAULT_SOURCE_MAP_RESOURCE_LIMITS: ReviewedSourceMapResourceLimits =
  REVIEWED_PACKAGE_SOURCE_MAP_LIMITS;

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_VALUES = (() => {
  const values = new Int16Array(128);
  values.fill(-1);
  for (let index = 0; index < BASE64_ALPHABET.length; index += 1) {
    values[BASE64_ALPHABET.charCodeAt(index)] = index;
  }
  return values;
})();
const VLQ_LIMIT = 2 ** 32;
const VLQ_SIGNED_MINIMUM = -(2 ** 31);

function encodeCanonicalVlq(value: number): string {
  let unsigned = value === VLQ_SIGNED_MINIMUM
    ? 1
    : Math.abs(value) * 2 + (value < 0 ? 1 : 0);
  let encoded = '';
  do {
    let digit = unsigned % 32;
    unsigned = Math.floor(unsigned / 32);
    if (unsigned > 0) digit += 32;
    encoded += BASE64_ALPHABET[digit];
  } while (unsigned > 0);
  return encoded;
}

function decodeCanonicalVlq(
  mappings: string,
  start: number,
  owner: string,
): { readonly next: number; readonly value: number } {
  let index = start;
  let unsigned = 0;
  let multiplier = 1;
  for (;;) {
    const code = mappings.charCodeAt(index);
    const digit = code < BASE64_VALUES.length ? BASE64_VALUES[code] : -1;
    if (digit < 0) {
      throw new Error(`source map has an invalid Base64-VLQ digit: ${owner}`);
    }
    unsigned += (digit & 31) * multiplier;
    if (!Number.isSafeInteger(unsigned) || unsigned >= VLQ_LIMIT) {
      throw new Error(`source map has an overflowing Base64-VLQ value: ${owner}`);
    }
    index += 1;
    if ((digit & 32) === 0) break;
    multiplier *= 32;
    if (index >= mappings.length || multiplier >= VLQ_LIMIT * 32) {
      throw new Error(`source map has an unterminated Base64-VLQ value: ${owner}`);
    }
  }
  const magnitude = Math.floor(unsigned / 2);
  const value = (unsigned & 1) === 0
    ? magnitude
    : magnitude === 0
      ? VLQ_SIGNED_MINIMUM
      : -magnitude;
  if (encodeCanonicalVlq(value) !== mappings.slice(start, index)) {
    throw new Error(`source map has a noncanonical Base64-VLQ value: ${owner}`);
  }
  return { next: index, value };
}

function sourceLines(source: string): readonly string[] {
  return source.split(/\r\n|[\n\r\u2028\u2029]/u);
}

function physicalLineCount(source: string): number {
  let lines = 1;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    if (code === 0x0d) {
      if (source.charCodeAt(index + 1) === 0x0a) index += 1;
      lines += 1;
    } else if (code === 0x0a || code === 0x2028 || code === 0x2029) {
      lines += 1;
    }
  }
  return lines;
}

function checkedSourceMapResourceLimits(
  limits: ReviewedSourceMapResourceLimits,
  owner: string,
): ReviewedSourceMapResourceLimits {
  for (const key of SOURCE_MAP_RESOURCE_LIMIT_KEYS) {
    const value = limits[key];
    const hardMaximum = REVIEWED_PACKAGE_SOURCE_MAP_LIMITS[key];
    if (
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > hardMaximum
    ) {
      throw new Error(`source map has invalid reviewed ${key} limit: ${owner}`);
    }
  }
  return limits;
}

/** Bound all allocations before resolving identities or decoding mappings. */
export function assertReviewedSourceMapResourceBounds(
  mappings: string,
  names: readonly string[],
  sourcesContent: readonly string[],
  generatedCode: string,
  owner: string,
  requestedLimits: ReviewedSourceMapResourceLimits = DEFAULT_SOURCE_MAP_RESOURCE_LIMITS,
): void {
  const limits = checkedSourceMapResourceLimits(requestedLimits, owner);
  if (
    typeof mappings !== 'string' ||
    typeof generatedCode !== 'string' ||
    !Array.isArray(names) ||
    !Array.isArray(sourcesContent)
  ) {
    throw new Error(`source map resource profile is not textual: ${owner}`);
  }
  if (mappings.length === 0 || mappings.length > limits.mappingsUnits) {
    throw new Error(`source map mappings exceed the reviewed resource bound: ${owner}`);
  }
  if (generatedCode.length > limits.generatedCodeUnits) {
    throw new Error(`source map owner exceeds the reviewed resource bound: ${owner}`);
  }
  if (names.length > limits.names || sourcesContent.length > limits.sources) {
    throw new Error(`source map table exceeds the reviewed resource bound: ${owner}`);
  }

  let aggregateNameUnits = 0;
  for (const name of names) {
    if (typeof name !== 'string' || name.length > limits.nameUnits) {
      throw new Error(`source map name exceeds the reviewed resource bound: ${owner}`);
    }
    aggregateNameUnits += name.length;
    if (aggregateNameUnits > limits.aggregateNameUnits) {
      throw new Error(`source map names exceed the reviewed resource bound: ${owner}`);
    }
  }

  let aggregateSourceContentUnits = 0;
  let aggregateOriginalPhysicalLines = 0;
  for (const source of sourcesContent) {
    if (typeof source !== 'string') {
      throw new Error(`source map embedded source is not textual: ${owner}`);
    }
    aggregateSourceContentUnits += source.length;
    if (aggregateSourceContentUnits > limits.aggregateSourceContentUnits) {
      throw new Error(`source map inputs exceed the reviewed resource bound: ${owner}`);
    }
    aggregateOriginalPhysicalLines += physicalLineCount(source);
    if (aggregateOriginalPhysicalLines > limits.aggregateOriginalPhysicalLines) {
      throw new Error(`source map input lines exceed the reviewed resource bound: ${owner}`);
    }
  }
  if (physicalLineCount(generatedCode) > limits.generatedPhysicalLines) {
    throw new Error(`source map owner lines exceed the reviewed resource bound: ${owner}`);
  }
}

function checkedCumulativePosition(
  current: number,
  relative: number,
  label: string,
  owner: string,
): number {
  const next = current + relative;
  if (!Number.isSafeInteger(next) || next < 0) {
    throw new Error(`source map has an invalid cumulative ${label}: ${owner}`);
  }
  return next;
}

/**
 * Fail closed on every ECMA-426 mapping grammar/decoder error and additionally
 * require canonical VLQs, source-order generated segments, and in-file positions.
 * This establishes structural coordinate authority, not semantic token equivalence.
 */
export function inspectReviewedSourceMapMappings(
  mappings: string,
  names: readonly string[],
  sourcesContent: readonly string[],
  generatedCode: string,
  owner: string,
  requestedLimits: ReviewedSourceMapResourceLimits = DEFAULT_SOURCE_MAP_RESOURCE_LIMITS,
): ReviewedSourceMapMappingsReceipt {
  assertReviewedSourceMapResourceBounds(
    mappings,
    names,
    sourcesContent,
    generatedCode,
    owner,
    requestedLimits,
  );
  const limits = checkedSourceMapResourceLimits(requestedLimits, owner);
  const generatedLines = sourceLines(generatedCode);
  const originalLines = sourcesContent.map(sourceLines);
  let generatedLine = 0;
  let generatedColumn = 0;
  let sourceIndex = 0;
  let originalLine = 0;
  let originalColumn = 0;
  let nameIndex = 0;
  let index = 0;
  let segments = 0;
  let mappedSegments = 0;
  let namedSegments = 0;
  let priorGeneratedColumn = -1;
  let referencedNameUnits = 0;
  const referencedSources = new Set<number>();
  const referencedNames = new Set<number>();

  while (index < mappings.length) {
    const delimiter = mappings[index];
    if (delimiter === ';') {
      generatedLine += 1;
      generatedColumn = 0;
      priorGeneratedColumn = -1;
      index += 1;
      continue;
    }
    if (delimiter === ',') {
      throw new Error(`source map has an empty mapping segment: ${owner}`);
    }

    const fields: number[] = [];
    while (index < mappings.length && mappings[index] !== ',' && mappings[index] !== ';') {
      const decoded = decodeCanonicalVlq(mappings, index, owner);
      fields.push(decoded.value);
      index = decoded.next;
      if (fields.length > 5) {
        throw new Error(`source map has too many fields in a mapping segment: ${owner}`);
      }
    }
    if (fields.length !== 1 && fields.length !== 4 && fields.length !== 5) {
      throw new Error(`source map has an invalid mapping-segment field count: ${owner}`);
    }

    const generatedDelta = fields[0];
    if (generatedDelta === undefined || generatedDelta < 0) {
      throw new Error(`source map has a descending generated-column delta: ${owner}`);
    }
    generatedColumn = checkedCumulativePosition(
      generatedColumn,
      generatedDelta,
      'generated column',
      owner,
    );
    if (generatedColumn < priorGeneratedColumn) {
      throw new Error(`source map has out-of-order generated columns: ${owner}`);
    }
    priorGeneratedColumn = generatedColumn;
    const generatedSourceLine = generatedLines[generatedLine];
    if (
      generatedSourceLine === undefined ||
      generatedColumn > generatedSourceLine.length ||
      (generatedColumn === generatedSourceLine.length &&
        generatedLine === generatedLines.length - 1)
    ) {
      throw new Error(`source map generated position is outside its owner: ${owner}`);
    }

    if (fields.length > 1) {
      sourceIndex = checkedCumulativePosition(
        sourceIndex,
        fields[1]!,
        'source index',
        owner,
      );
      originalLine = checkedCumulativePosition(
        originalLine,
        fields[2]!,
        'original line',
        owner,
      );
      originalColumn = checkedCumulativePosition(
        originalColumn,
        fields[3]!,
        'original column',
        owner,
      );
      const originalSourceLines = originalLines[sourceIndex];
      const originalSourceLine = originalSourceLines?.[originalLine];
      if (
        originalSourceLine === undefined ||
        originalColumn > originalSourceLine.length ||
        (originalColumn === originalSourceLine.length &&
          originalLine === (originalSourceLines?.length ?? 0) - 1)
      ) {
        throw new Error(`source map original position is outside its source: ${owner}`);
      }
      referencedSources.add(sourceIndex);
      mappedSegments += 1;
      if (fields.length === 5) {
        nameIndex = checkedCumulativePosition(
          nameIndex,
          fields[4]!,
          'name index',
          owner,
        );
        const mappedName = names[nameIndex];
        if (mappedName === undefined) {
          throw new Error(`source map name index is outside its names table: ${owner}`);
        }
        referencedNameUnits += mappedName.length;
        if (referencedNameUnits > limits.referencedNameUnits) {
          throw new Error(`source map named mappings exceed the reviewed resource bound: ${owner}`);
        }
        if (
          mappedName.length === 0 ||
          !originalSourceLine.startsWith(mappedName, originalColumn)
        ) {
          throw new Error(`source map name does not bind original source text: ${owner}`);
        }
        referencedNames.add(nameIndex);
        namedSegments += 1;
      }
    }
    segments += 1;
    if (segments > limits.segments) {
      throw new Error(`source map segments exceed the reviewed resource bound: ${owner}`);
    }

    if (mappings[index] === ',') {
      index += 1;
      if (index >= mappings.length || mappings[index] === ',' || mappings[index] === ';') {
        throw new Error(`source map has an empty mapping segment: ${owner}`);
      }
    }
  }

  if (segments === 0 || generatedLine >= generatedLines.length) {
    throw new Error(`source map mappings do not bind a position in their owner: ${owner}`);
  }
  if (referencedSources.size !== sourcesContent.length) {
    throw new Error(`source map contains an unreferenced embedded source: ${owner}`);
  }
  if (referencedNames.size !== names.length) {
    throw new Error(`source map contains an unreferenced name: ${owner}`);
  }

  return Object.freeze({
    generatedLines: generatedLine + 1,
    segments,
    mappedSegments,
    namedSegments,
  });
}

const REVIEWED_MAPLESS_PACKAGE_RUNTIME_OUTPUTS: ReadonlySet<string> = new Set([
  'dist/adapters/nest/index.cjs',
  'dist/adapters/nest/index.js',
  'dist/authoring/index.cjs',
  'dist/authoring/index.js',
  'dist/core/index.cjs',
  'dist/core/index.js',
  'dist/index.cjs',
  'dist/index.js',
  'dist/internal/figure-result-brand.cjs',
  'dist/internal/figure-result-brand.js',
  'dist/internal/knowledge-graph-presentation-brand.cjs',
  'dist/internal/knowledge-graph-presentation-brand.js',
  'dist/internal/validated-request-brand.cjs',
  'dist/internal/validated-request-brand.js',
  'dist/knowledge-graph/index.cjs',
  'dist/knowledge-graph/index.js',
  'dist/render-svg/index.cjs',
  'dist/render-svg/index.js',
]);

export function isReviewedMaplessPackageRuntime(
  ownerPackagePath: string,
  code: string,
): boolean {
  return REVIEWED_MAPLESS_PACKAGE_RUNTIME_OUTPUTS.has(ownerPackagePath) || (
    /^dist\/rolldown-runtime-[A-Za-z0-9_-]+\.cjs$/u.test(ownerPackagePath) &&
    code.startsWith('//#region \\0rolldown/runtime.js\n')
  );
}

/**
 * Admit no alternate comment form, data URL, embedded token, duplicate directive,
 * or non-terminal runtime directive. A mapless runtime returns `undefined`.
 */
export function inspectReviewedSourceMapMetadata(
  code: string,
  owner: string,
  kind: SourceMapOwnerKind,
): string | undefined {
  const rawReferenceCount = code.match(/sourceMappingURL/gu)?.length ?? 0;
  if (/sourceURL|debugId/gu.test(code)) {
    throw new Error(`output contains forbidden source-origin metadata: ${owner}`);
  }
  if (kind === 'declaration') {
    if (rawReferenceCount !== 0) {
      throw new Error(`declaration retains source-map metadata: ${owner}`);
    }
    return undefined;
  }

  const exactReferences = [
    ...code.matchAll(
      /(?:^|\n)\/\/# sourceMappingURL=([A-Za-z0-9._-]+\.(?:js|cjs)\.map)(?=$|\n)/gu,
    ),
  ];
  if (rawReferenceCount !== exactReferences.length) {
    throw new Error(`runtime has unreviewed source-map metadata syntax: ${owner}`);
  }
  if (exactReferences.length > 1) {
    throw new Error(`runtime has multiple source-map references: ${owner}`);
  }
  const reference = exactReferences[0]?.[1];
  if (reference === undefined) return undefined;
  const expectedReference = `${path.posix.basename(owner)}.map`;
  if (
    reference !== expectedReference ||
    !code.endsWith(`\n//# sourceMappingURL=${expectedReference}`)
  ) {
    throw new Error(`runtime source-map reference is not terminal: ${owner}`);
  }
  return reference;
}

/** Resolve a map-relative input to one exact, reviewed repository source identity. */
export function resolveReviewedPackageSourceMapInput(
  mapPackagePath: string,
  source: unknown,
): string {
  if (
    typeof source !== 'string' ||
    source.length === 0 ||
    source.includes('\\') ||
    source.includes('?') ||
    source.includes('#') ||
    source.includes('%') ||
    path.posix.isAbsolute(source) ||
    path.win32.isAbsolute(source) ||
    /^[A-Za-z]:/u.test(source) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(source) ||
    /[\u0000-\u001f\u007f]/u.test(source) ||
    path.posix.normalize(source) !== source ||
    source === '.'
  ) {
    throw new Error(`source map has an unsafe or noncanonical source: ${mapPackagePath}`);
  }
  if (
    mapPackagePath.includes('\\') ||
    path.posix.isAbsolute(mapPackagePath) ||
    path.win32.isAbsolute(mapPackagePath) ||
    path.posix.normalize(mapPackagePath) !== mapPackagePath ||
    !mapPackagePath.startsWith('dist/') ||
    !/\.(?:js|cjs)\.map$/u.test(mapPackagePath)
  ) {
    throw new Error(`source map has an unsafe package identity: ${mapPackagePath}`);
  }
  const identity = path.posix.normalize(
    path.posix.join(path.posix.dirname(mapPackagePath), source),
  );
  if (!REVIEWED_SOURCE_SET.has(identity)) {
    throw new Error(
      `source map contains an input outside the exact reviewed inventory: ${mapPackagePath}`,
    );
  }
  return identity;
}

/** Prove the complete identity/content projection, including cross-map consistency. */
export function reviewedPackageSourceMapInputClosureDigest(
  contents: ReadonlyMap<string, string>,
): string {
  const projection = [...contents]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return createHash('sha256')
    .update(JSON.stringify(projection), 'utf8')
    .digest('hex');
}

export function assertReviewedPackageSourceMapInputClosure(
  contents: ReadonlyMap<string, string>,
): void {
  if (
    contents.size !== REVIEWED_SOURCE_SET.size ||
    REVIEWED_PACKAGE_SOURCE_MAP_INPUTS.some((identity) => !contents.has(identity))
  ) {
    throw new Error('source-map inputs differ from the exact reviewed identity closure');
  }
  const digest = reviewedPackageSourceMapInputClosureDigest(contents);
  if (digest !== REVIEWED_PACKAGE_SOURCE_MAP_INPUT_CLOSURE_DIGEST) {
    throw new Error(
      'source-map embedded input bytes differ from the reviewed closure digest: ' +
      `expected ${REVIEWED_PACKAGE_SOURCE_MAP_INPUT_CLOSURE_DIGEST}; observed ${digest}`,
    );
  }
}
