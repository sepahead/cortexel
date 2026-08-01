import type {
  KnowledgeGraph3DEdge,
  KnowledgeGraph3DNode,
  KnowledgeGraphAttributeScalar,
  KnowledgeGraphAttributes,
  KnowledgeGraphContext,
  KnowledgeGraphEpistemic,
  KnowledgeGraphEvidenceRef,
  KnowledgeGraphUncalibratedScore,
} from './knowledgeGraphPresentation.types';
import { graphEdgeIdentityKey } from './knowledgeGraphIdentity.internal';
import {
  KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS,
  KNOWLEDGE_GRAPH_LIMITS,
} from '../core/skills/knowledgeGraphLimits';
import { SAFE_DISPLAY_STRING_PATTERN } from '../core/safeRuntime';
import { deepFreeze } from '../src/core/deep-freeze.js';
import { canonicalize } from '../src/core/canonicalize.js';
import { parseJsonStrict } from '../src/core/parse-json.js';
import type { CortexelError } from '../src/core/errors.js';
import type {
  PreparedKnowledgeGraphNominalBrand,
  PreparedKnowledgeGraphViewNominalBrand,
} from
  '#cortexel-knowledge-graph-presentation-brand';
import {
  KnowledgeGraphPresentationBudgetCounter,
  type KnowledgeGraphPresentationBudgetReceiptV1,
} from './knowledgeGraphPresentationBudget.internal';
import { deriveKnowledgeGraphContextIdentity } from
  './knowledgeGraphContextIdentity.internal';
import {
  CORPUS_EDGE_STROKE_PATTERN_BY_KIND,
  CORPUS_NODE_GLYPH_BY_KIND,
  isKnowledgeGraphEdgeStrokePattern,
  isKnowledgeGraphNodeGlyph,
} from './knowledgeGraphVisualEncoding.internal';

export const KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1 =
  'cortexel-knowledge-graph-presentation-input.v1' as const;
export const PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1 =
  'cortexel-prepared-knowledge-graph-presentation.v1' as const;
export const PREPARED_KNOWLEDGE_GRAPH_VIEW_V1 =
  'cortexel-prepared-knowledge-graph-view.v1' as const;

/** Public preparation contract for caller-owned generic visual records. */
export interface KnowledgeGraphPresentationInputV1 {
  readonly contract: typeof KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1;
  readonly profile: 'generic_visual';
  readonly graphIdentity: string;
  readonly nodes: readonly KnowledgeGraph3DNode[];
  readonly edges: readonly KnowledgeGraph3DEdge[];
  readonly context?: never;
}

interface CorpusKnowledgeGraphPresentationInputV1 {
  readonly contract: typeof KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1;
  readonly profile: 'corpus_entity';
  readonly nodes: readonly KnowledgeGraph3DNode[];
  readonly edges: readonly KnowledgeGraph3DEdge[];
  readonly context: Readonly<KnowledgeGraphContext>;
  readonly graphIdentity?: never;
}

type InternalKnowledgeGraphPresentationInputV1 =
  | KnowledgeGraphPresentationInputV1
  | CorpusKnowledgeGraphPresentationInputV1;

export type { KnowledgeGraphPresentationBudgetReceiptV1 } from
  './knowledgeGraphPresentationBudget.internal';

export type KnowledgeGraphPresentationInputAssuranceV1 =
  | {
      readonly boundary: 'raw_json_text';
      readonly duplicateMembers: 'rejected_before_materialization';
      readonly proxyTrapFreedom: 'not_applicable';
    }
  | {
      readonly boundary: 'materialized_javascript_value';
      readonly duplicateMembers: 'not_observable_after_materialization';
      readonly proxyTrapFreedom: 'not_established';
    };

export type KnowledgeGraphPresentationMappingAuthorityV1 =
  | {
      readonly kind: 'caller_declared_visual_mapping';
      readonly scientificAuthority: 'not_established';
    }
  | {
      readonly kind: 'corpus_visual_mapping';
      readonly presentationInvariants:
        'bounded_closed_visual_records_redundant_kind_channels_and_graph_integrity';
      readonly derivationAuthentication: 'not_performed';
      readonly scientificAuthority: 'not_established';
    };

/**
 * A detached, deeply frozen presentation accepted for inspection and exact-source
 * views. Public direct renderers admit only the generic profile; the canonical corpus
 * composition uses package-internal renderers. The TypeScript brand is documentation;
 * a module-private WeakSet is the runtime authority, so an object literal or serialized
 * copy cannot forge this value.
 */
interface PreparedKnowledgeGraphPresentationBaseV1
  extends PreparedKnowledgeGraphNominalBrand {
  readonly contract: typeof PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1;
  readonly graphIdentity: string;
  readonly nodes: readonly Readonly<KnowledgeGraph3DNode>[];
  readonly edges: readonly Readonly<KnowledgeGraph3DEdge>[];
  readonly budget: Readonly<KnowledgeGraphPresentationBudgetReceiptV1>;
  readonly inputAssurance: Readonly<KnowledgeGraphPresentationInputAssuranceV1>;
}

/** Profile, context, and authority are one discriminated unit. */
export type PreparedKnowledgeGraphPresentationV1 =
  PreparedKnowledgeGraphPresentationBaseV1 & (
    | {
        readonly profile: 'generic_visual';
        readonly context?: never;
        readonly mappingAuthority: Readonly<Extract<
          KnowledgeGraphPresentationMappingAuthorityV1,
          { readonly kind: 'caller_declared_visual_mapping' }
        >>;
      }
    | {
        readonly profile: 'corpus_entity';
        readonly context: Readonly<KnowledgeGraphContext>;
        readonly mappingAuthority: Readonly<Extract<
          KnowledgeGraphPresentationMappingAuthorityV1,
          { readonly kind: 'corpus_visual_mapping' }
        >>;
      }
  );

export type PreparedGenericKnowledgeGraphPresentationV1 = Extract<
  PreparedKnowledgeGraphPresentationV1,
  { readonly profile: 'generic_visual' }
>;

export type PreparedCorpusKnowledgeGraphPresentationV1 = Extract<
  PreparedKnowledgeGraphPresentationV1,
  { readonly profile: 'corpus_entity' }
>;

export interface KnowledgeGraphViewPolicyV1 {
  /** Omission means all source node kinds; an empty array intentionally means none. */
  readonly nodeKinds?: readonly string[];
  /** Omission means all source edge kinds; an empty array intentionally means none. */
  readonly edgeKinds?: readonly string[];
}

export interface PreparedKnowledgeGraphViewV1
  extends PreparedKnowledgeGraphViewNominalBrand {
  readonly contract: typeof PREPARED_KNOWLEDGE_GRAPH_VIEW_V1;
  readonly graphIdentity: string;
  readonly policy: Readonly<{
    readonly nodeKinds: 'all' | readonly string[];
    readonly edgeKinds: 'all' | readonly string[];
  }>;
  /** Frozen arrays reuse the exact source token's frozen record objects. */
  readonly nodes: readonly Readonly<KnowledgeGraph3DNode>[];
  readonly edges: readonly Readonly<KnowledgeGraph3DEdge>[];
  readonly counts: Readonly<{
    readonly sourceNodes: number;
    readonly sourceEdges: number;
    readonly visibleNodes: number;
    readonly visibleEdges: number;
    readonly edgeKindFilteredEdges: number;
    readonly endpointPrunedEdges: number;
  }>;
}

/** Strict-parser diagnostics are retained without flattening them into prose. */
export class KnowledgeGraphPresentationJsonError extends TypeError {
  readonly diagnostics: readonly CortexelError[];

  constructor(diagnostics: readonly CortexelError[]) {
    super('knowledge-graph presentation JSON failed strict parsing');
    this.name = 'KnowledgeGraphPresentationJsonError';
    this.diagnostics = deepFreeze([...diagnostics]);
  }
}

type AttributeValue = KnowledgeGraphAttributes[string];
type PropertyKeyList = readonly PropertyKey[];

/** Remove ambient Object.prototype from every owned published record. */
function nullPrototypeOwnedRecords(
  value: unknown,
  seen = new Set<object>(),
): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      nullPrototypeOwnedRecords(value[index], seen);
    }
    return;
  }
  Object.setPrototypeOf(value, null);
  for (const key of Object.keys(value)) {
    nullPrototypeOwnedRecords((value as Record<string, unknown>)[key], seen);
  }
}

interface PrototypeProbe {
  readonly object: object;
  readonly prototype: object | null;
}

interface KeysProbe {
  readonly object: object;
  readonly keys: PropertyKeyList;
}

interface DescriptorProbe {
  readonly object: object;
  readonly key: PropertyKey;
  readonly descriptor: PropertyDescriptor;
}

class PresentationPlanner {
  readonly budget = new KnowledgeGraphPresentationBudgetCounter();
  private readonly prototypeProbes: PrototypeProbe[] = [];
  private readonly keysProbes: KeysProbe[] = [];
  private readonly descriptorProbes: DescriptorProbe[] = [];

  private changed(): never {
    throw new TypeError('knowledge-graph presentation input changed during preparation');
  }

  private inspectPrototype(value: object, label: string): object | null {
    this.budget.inspect(label);
    const prototype = Object.getPrototypeOf(value);
    this.prototypeProbes.push({ object: value, prototype });
    return prototype;
  }

  private inspectKeys(value: object, label: string): PropertyKey[] {
    this.budget.inspect(label);
    const keys = Reflect.ownKeys(value);
    this.budget.inspect(label, keys.length);
    this.keysProbes.push({ object: value, keys: Object.freeze([...keys]) });
    return keys;
  }

  private inspectDescriptor(
    value: object,
    key: PropertyKey,
    label: string,
  ): PropertyDescriptor {
    this.budget.inspect(label);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) this.changed();
    const snapshot = Object.freeze({ ...descriptor });
    this.descriptorProbes.push({ object: value, key, descriptor: snapshot });
    return snapshot;
  }

  record(
    value: unknown,
    label: string,
    requiredKeys: readonly string[],
    optionalKeys: readonly string[] = [],
  ): Readonly<Record<string, unknown>> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(`${label} must be a plain data record`);
    }
    const prototype = this.inspectPrototype(value, label);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${label} must use a plain or null prototype`);
    }
    const allowed = new Set([...requiredKeys, ...optionalKeys]);
    const keys = this.inspectKeys(value, label);
    const result: Record<string, unknown> = Object.create(null);
    this.budget.retain(label); // the retained record container
    for (const key of keys) {
      if (typeof key !== 'string' || !allowed.has(key)) {
        throw new TypeError(`${label} contains an unknown member`);
      }
      const descriptor = this.inspectDescriptor(value, key, `${label}.${key}`);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`${label}.${key} must be an enumerable data property`);
      }
      this.budget.retain(`${label}.${key}`);
      this.budget.string(key, `${label} member names`);
      result[key] = descriptor.value;
    }
    for (const key of requiredKeys) {
      if (!Object.hasOwn(result, key)) {
        throw new TypeError(`${label}.${key} is required`);
      }
    }
    return result;
  }

  openRecord(value: unknown, label: string, maximumKeys: number): Readonly<Record<string, unknown>> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(`${label} must be a plain data record`);
    }
    const prototype = this.inspectPrototype(value, label);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${label} must use a plain or null prototype`);
    }
    const keys = this.inspectKeys(value, label);
    if (keys.length > maximumKeys) {
      throw new RangeError(`${label} may contain at most ${maximumKeys} keys`);
    }
    const result: Record<string, unknown> = Object.create(null);
    this.budget.retain(label);
    for (const key of keys) {
      if (typeof key !== 'string') throw new TypeError(`${label} cannot contain symbols`);
      const descriptor = this.inspectDescriptor(value, key, `${label}.${key}`);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`${label}.${key} must be an enumerable data property`);
      }
      this.budget.retain(`${label}.${key}`);
      this.budget.string(key, `${label} member names`);
      result[key] = descriptor.value;
    }
    return result;
  }

  array(value: unknown, label: string, maximum: number): readonly unknown[] {
    if (!Array.isArray(value)) throw new TypeError(`${label} must be a dense data array`);
    const lengthDescriptor = this.inspectDescriptor(value, 'length', `${label}.length`);
    if (
      !Object.hasOwn(lengthDescriptor, 'value') ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0
    ) {
      throw new TypeError(`${label} must have an intrinsic non-negative integer length`);
    }
    const length = lengthDescriptor.value as number;
    if (length > maximum) {
      throw new RangeError(`${label} may contain at most ${maximum} items`);
    }
    const keys = this.inspectKeys(value, label);
    if (keys.length !== length + 1 || keys[keys.length - 1] !== 'length') {
      throw new TypeError(`${label} must be dense and contain no extra properties`);
    }
    const result = new Array<unknown>(length);
    this.budget.retain(label); // the retained array container
    for (let index = 0; index < length; index++) {
      const key = String(index);
      if (keys[index] !== key) {
        throw new TypeError(`${label} must be dense and contain no extra properties`);
      }
      const descriptor = this.inspectDescriptor(value, key, `${label}[${index}]`);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`${label} must contain enumerable data elements`);
      }
      this.budget.retain(`${label}[${index}]`);
      result[index] = descriptor.value;
    }
    return result;
  }

  revalidate(): void {
    for (const probe of this.prototypeProbes) {
      this.budget.inspect('knowledge-graph prototype revalidation');
      if (Object.getPrototypeOf(probe.object) !== probe.prototype) this.changed();
    }
    for (const probe of this.keysProbes) {
      this.budget.inspect('knowledge-graph key revalidation');
      const keys = Reflect.ownKeys(probe.object);
      this.budget.inspect('knowledge-graph key revalidation', keys.length);
      if (keys.length !== probe.keys.length) this.changed();
      for (let index = 0; index < keys.length; index++) {
        if (keys[index] !== probe.keys[index]) this.changed();
      }
    }
    for (const probe of this.descriptorProbes) {
      this.budget.inspect('knowledge-graph descriptor revalidation');
      const current = Object.getOwnPropertyDescriptor(probe.object, probe.key);
      const planned = probe.descriptor;
      if (
        current === undefined ||
        current.enumerable !== planned.enumerable ||
        current.configurable !== planned.configurable ||
        current.writable !== planned.writable ||
        current.get !== planned.get ||
        current.set !== planned.set ||
        !Object.is(current.value, planned.value)
      ) {
        this.changed();
      }
    }
  }
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu;
const SCORE_KINDS = new Set([
  'extraction_confidence',
  'citation_resolution_confidence',
  'structural_similarity',
  'behavioral_agreement',
  'retrieval_relevance',
]);
const PREPARED_PRESENTATIONS = new WeakSet<object>();
const PRESENTATION_NODE_IDS = new WeakMap<object, ReadonlySet<string>>();
const PREPARED_VIEWS = new WeakSet<object>();
const VIEW_SOURCES = new WeakMap<object, PreparedKnowledgeGraphPresentationV1>();
const RFC3339_WITH_SECONDS =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/u;

function isRfc3339WithSeconds(value: string): boolean {
  const match = RFC3339_WITH_SECONDS.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > days[month - 1]) return false;
  const offset = match[7];
  if (offset !== 'Z') {
    const offsetHour = Number(offset.slice(1, 3));
    const offsetMinute = Number(offset.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return false;
  }
  return true;
}

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

function boundedString(
  planner: PresentationPlanner,
  value: unknown,
  label: string,
  maxLength: number,
  allowEmpty = false,
): string {
  if (
    typeof value !== 'string' ||
    (!allowEmpty && value.length < 1) ||
    value.length > maxLength ||
    !hasWellFormedUtf16(value) ||
    !SAFE_DISPLAY_STRING_PATTERN.test(value)
  ) {
    throw new TypeError(
      `${label} must be a ${allowEmpty ? '' : 'non-empty '}display-safe string <= ` +
        `${maxLength} characters`,
    );
  }
  planner.budget.string(value, label);
  return value;
}

function optionalBoundedString(
  planner: PresentationPlanner,
  record: Readonly<Record<string, unknown>>,
  key: string,
  label: string,
  maxLength: number,
): string | undefined {
  return Object.hasOwn(record, key)
    ? boundedString(planner, record[key], label, maxLength)
    : undefined;
}

function optionalBoolean(
  record: Readonly<Record<string, unknown>>,
  key: string,
  label: string,
): boolean | undefined {
  if (!Object.hasOwn(record, key)) return undefined;
  const value = record[key];
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
  return value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Object.is(value, -0)) {
    throw new TypeError(`${label} must be a finite number other than negative zero`);
  }
  return value;
}

function normalizedHexColor(value: string): string {
  const lower = value.toLowerCase();
  return lower.length === 4
    ? `#${lower[1]}${lower[1]}${lower[2]}${lower[2]}${lower[3]}${lower[3]}`
    : lower;
}

function assertExactRecordShape(
  record: Readonly<Record<string, unknown>>,
  label: string,
  required: readonly string[],
  optional: readonly string[],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) throw new TypeError(`${label}.${key} is not allowed for this kind`);
  }
  for (const key of required) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${label}.${key} is required`);
  }
}

function addOptional<T extends Record<string, unknown>>(
  target: T,
  key: string,
  value: unknown,
): void {
  if (value !== undefined) (target as Record<string, unknown>)[key] = value;
}

function snapshotAttributes(
  planner: PresentationPlanner,
  value: unknown,
  label: string,
): KnowledgeGraphAttributes {
  const record = planner.openRecord(value, label, KNOWLEDGE_GRAPH_LIMITS.maxAttributes);
  const stringKeys = Object.keys(record);
  for (const key of stringKeys) {
    if (
      key.length < 1 ||
      key.length > KNOWLEDGE_GRAPH_LIMITS.maxAttributeKeyLength ||
      !hasWellFormedUtf16(key) ||
      !SAFE_DISPLAY_STRING_PATTERN.test(key)
    ) {
      throw new TypeError(
        `${label} keys must be non-empty display-safe strings <= ` +
          `${KNOWLEDGE_GRAPH_LIMITS.maxAttributeKeyLength} characters`,
      );
    }
  }
  const snapshot: Record<string, AttributeValue> = Object.create(null);
  for (const key of stringKeys) {
    const item = record[key];
    if (!Array.isArray(item)) {
      if (
        item !== null &&
        typeof item !== 'string' &&
        typeof item !== 'number' &&
        typeof item !== 'boolean'
      ) {
        throw new TypeError(`${label}.${key} must be a JSON scalar or scalar array`);
      }
      if (typeof item === 'number') finiteNumber(item, `${label}.${key}`);
      if (typeof item === 'string') {
        boundedString(
          planner,
          item,
          `${label}.${key}`,
          KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength,
          true,
        );
      }
      snapshot[key] = item;
      continue;
    }
    const input = planner.array(
      item,
      `${label}.${key}`,
      KNOWLEDGE_GRAPH_LIMITS.maxAttributeArrayItems,
    );
    const items = new Array<KnowledgeGraphAttributeScalar>(input.length);
    for (let index = 0; index < input.length; index++) {
      const scalar = input[index];
      if (
        scalar !== null &&
        typeof scalar !== 'string' &&
        typeof scalar !== 'number' &&
        typeof scalar !== 'boolean'
      ) {
        throw new TypeError(`${label}.${key}[${index}] must be a JSON scalar`);
      }
      if (typeof scalar === 'number') finiteNumber(scalar, `${label}.${key}[${index}]`);
      if (typeof scalar === 'string') {
        boundedString(
          planner,
          scalar,
          `${label}.${key}[${index}]`,
          KNOWLEDGE_GRAPH_LIMITS.maxAttributeStringLength,
          true,
        );
      }
      items[index] = scalar;
    }
    snapshot[key] = items;
  }
  return snapshot as KnowledgeGraphAttributes;
}

function snapshotEpistemic(
  planner: PresentationPlanner,
  value: unknown,
  label: string,
): KnowledgeGraphEpistemic {
  const record = planner.record(value, label, [
    'status',
    'advisory_only',
    'is_paper_local_evidence',
    'calibrated_posterior',
  ]);
  if (
    record.status !== 'derived_advisory' ||
    record.advisory_only !== true ||
    record.is_paper_local_evidence !== false ||
    record.calibrated_posterior !== false
  ) {
    throw new TypeError(`${label} must remain exactly derived/advisory`);
  }
  planner.budget.string(record.status, `${label}.status`);
  return {
    status: record.status,
    advisory_only: true,
    is_paper_local_evidence: false,
    calibrated_posterior: false,
  };
}

function snapshotEvidenceReference(
  planner: PresentationPlanner,
  value: unknown,
  label: string,
): KnowledgeGraphEvidenceRef {
  const discriminated = planner.record(value, label, ['kind'], [
    'evidence_id',
    'record_id',
    'node_id',
    'paper_id',
    'citation_id',
    'page',
    'source_id',
    'locator',
    'excerpt',
    'doi',
  ]);
  const kind = boundedString(planner, discriminated.kind, `${label}.kind`, 32);
  const exact = (
    required: readonly string[],
    optional: readonly string[],
  ): Readonly<Record<string, unknown>> => {
    assertExactRecordShape(discriminated, label, required, optional);
    return discriminated;
  };
  switch (kind) {
    case 'graph_snapshot_record': {
      const record = exact(['kind', 'evidence_id', 'record_id'], ['locator']);
      const result: Record<string, unknown> = {
        kind,
        evidence_id: boundedString(
          planner,
          record.evidence_id,
          `${label}.evidence_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength,
        ),
        record_id: boundedString(
          planner,
          record.record_id,
          `${label}.record_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxRecordIdLength,
        ),
      };
      addOptional(result, 'locator', optionalBoundedString(
        planner, record, 'locator', `${label}.locator`, KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength,
      ));
      return result as unknown as KnowledgeGraphEvidenceRef;
    }
    case 'graph_node': {
      const record = exact(['kind', 'evidence_id', 'node_id'], ['locator', 'excerpt']);
      const result: Record<string, unknown> = {
        kind,
        evidence_id: boundedString(
          planner, record.evidence_id, `${label}.evidence_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength,
        ),
        node_id: boundedString(
          planner, record.node_id, `${label}.node_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength,
        ),
      };
      addOptional(result, 'locator', optionalBoundedString(
        planner, record, 'locator', `${label}.locator`, KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength,
      ));
      addOptional(result, 'excerpt', optionalBoundedString(
        planner, record, 'excerpt', `${label}.excerpt`, KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength,
      ));
      return result as unknown as KnowledgeGraphEvidenceRef;
    }
    case 'citation': {
      const record = exact(
        ['kind', 'evidence_id', 'paper_id', 'citation_id'],
        ['page', 'locator', 'excerpt', 'doi'],
      );
      const result: Record<string, unknown> = {
        kind,
        evidence_id: boundedString(
          planner, record.evidence_id, `${label}.evidence_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength,
        ),
        paper_id: boundedString(
          planner, record.paper_id, `${label}.paper_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxPaperIdLength,
        ),
        citation_id: boundedString(
          planner, record.citation_id, `${label}.citation_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxCitationIdLength,
        ),
      };
      if (Object.hasOwn(record, 'page')) {
        if (Object.is(record.page, -0)) {
          throw new TypeError(`${label}.page must not be negative zero`);
        }
        if (!Number.isSafeInteger(record.page) || (record.page as number) < 0) {
          throw new TypeError(`${label}.page must be a non-negative safe integer`);
        }
        result.page = record.page;
      }
      addOptional(result, 'locator', optionalBoundedString(
        planner, record, 'locator', `${label}.locator`, KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength,
      ));
      addOptional(result, 'excerpt', optionalBoundedString(
        planner, record, 'excerpt', `${label}.excerpt`, KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength,
      ));
      addOptional(result, 'doi', optionalBoundedString(
        planner, record, 'doi', `${label}.doi`, KNOWLEDGE_GRAPH_LIMITS.maxDoiLength,
      ));
      return result as unknown as KnowledgeGraphEvidenceRef;
    }
    case 'external_source': {
      const record = exact(['kind', 'evidence_id', 'source_id'], ['locator', 'excerpt']);
      const result: Record<string, unknown> = {
        kind,
        evidence_id: boundedString(
          planner, record.evidence_id, `${label}.evidence_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxEvidenceIdLength,
        ),
        source_id: boundedString(
          planner, record.source_id, `${label}.source_id`,
          KNOWLEDGE_GRAPH_LIMITS.maxSourceIdLength,
        ),
      };
      addOptional(result, 'locator', optionalBoundedString(
        planner, record, 'locator', `${label}.locator`, KNOWLEDGE_GRAPH_LIMITS.maxLocatorLength,
      ));
      addOptional(result, 'excerpt', optionalBoundedString(
        planner, record, 'excerpt', `${label}.excerpt`, KNOWLEDGE_GRAPH_LIMITS.maxExcerptLength,
      ));
      return result as unknown as KnowledgeGraphEvidenceRef;
    }
    default:
      throw new TypeError(`${label}.kind is unsupported`);
  }
}

function snapshotEvidence(
  planner: PresentationPlanner,
  value: unknown,
  label: string,
): KnowledgeGraphEvidenceRef[] {
  const input = planner.array(
    value,
    label,
    KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement,
  );
  const snapshot = input.map((item, index) =>
    snapshotEvidenceReference(planner, item, `${label}[${index}]`));
  const evidenceIds = new Set<string>();
  for (let index = 0; index < snapshot.length; index++) {
    const evidenceId = snapshot[index].evidence_id;
    if (evidenceIds.has(evidenceId)) {
      throw new TypeError(`${label} contains duplicate evidence_id at index ${index}`);
    }
    evidenceIds.add(evidenceId);
  }
  return snapshot;
}

function snapshotScore(
  planner: PresentationPlanner,
  value: unknown,
  label: string,
): KnowledgeGraphUncalibratedScore {
  const record = planner.record(value, label, [
    'kind',
    'value',
    'calibrated_posterior',
  ]);
  const kind = boundedString(planner, record.kind, `${label}.kind`, 80);
  const score = finiteNumber(record.value, `${label}.value`);
  if (
    !SCORE_KINDS.has(kind) ||
    record.calibrated_posterior !== false ||
    score < 0 ||
    score > 1
  ) {
    throw new TypeError(`${label} must be bounded and explicitly uncalibrated`);
  }
  return {
    kind: kind as KnowledgeGraphUncalibratedScore['kind'],
    value: score,
    calibrated_posterior: false,
  };
}

function snapshotNode(
  planner: PresentationPlanner,
  value: unknown,
  index: number,
): KnowledgeGraph3DNode {
  const label = `knowledge-graph nodes[${index}]`;
  const record = planner.record(value, label, ['id', 'label', 'color', 'radius', 'kind'], [
    'detail',
    'attributes',
    'epistemic',
    'evidence',
    'uncalibrated_score',
    'radiusMeaning',
    'nodeGlyph',
  ]);
  const radius = finiteNumber(record.radius, `${label}.radius`);
  if (radius <= 0 || radius > 64) {
    throw new RangeError(`${label}.radius must be greater than zero and at most 64`);
  }
  const colorSource = boundedString(
    planner,
    record.color,
    `${label}.color`,
    KNOWLEDGE_GRAPH_LIMITS.maxColorLength,
  );
  if (!HEX_COLOR.test(colorSource)) {
    throw new TypeError(`${label}.color must be exact #rgb or #rrggbb hex`);
  }
  const color = normalizedHexColor(colorSource);
  const result: Record<string, unknown> = {
    id: boundedString(
      planner, record.id, `${label}.id`, KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength,
    ),
    label: boundedString(
      planner, record.label, `${label}.label`, KNOWLEDGE_GRAPH_LIMITS.maxNodeLabelLength,
    ),
    color,
    radius,
    kind: boundedString(
      planner, record.kind, `${label}.kind`, KNOWLEDGE_GRAPH_LIMITS.maxKindLength,
    ),
    nodeGlyph: 'sphere_outline',
  };
  if (Object.hasOwn(record, 'nodeGlyph')) {
    const nodeGlyph = boundedString(
      planner,
      record.nodeGlyph,
      `${label}.nodeGlyph`,
      32,
    );
    if (!isKnowledgeGraphNodeGlyph(nodeGlyph)) {
      throw new TypeError(`${label}.nodeGlyph is unsupported`);
    }
    result.nodeGlyph = nodeGlyph;
  }
  addOptional(result, 'detail', optionalBoundedString(
    planner, record, 'detail', `${label}.detail`, KNOWLEDGE_GRAPH_LIMITS.maxDetailLength,
  ));
  if (Object.hasOwn(record, 'attributes')) {
    result.attributes = snapshotAttributes(planner, record.attributes, `${label}.attributes`);
  }
  if (Object.hasOwn(record, 'epistemic')) {
    result.epistemic = snapshotEpistemic(planner, record.epistemic, `${label}.epistemic`);
  }
  if (Object.hasOwn(record, 'evidence')) {
    result.evidence = snapshotEvidence(planner, record.evidence, `${label}.evidence`);
  }
  if (Object.hasOwn(record, 'uncalibrated_score')) {
    result.uncalibrated_score = snapshotScore(
      planner,
      record.uncalibrated_score,
      `${label}.uncalibrated_score`,
    );
  }
  addOptional(result, 'radiusMeaning', optionalBoundedString(
    planner,
    record,
    'radiusMeaning',
    `${label}.radiusMeaning`,
    KNOWLEDGE_GRAPH_LIMITS.maxRadiusMeaningLength,
  ));
  return result as unknown as KnowledgeGraph3DNode;
}

function snapshotEdge(
  planner: PresentationPlanner,
  value: unknown,
  index: number,
): KnowledgeGraph3DEdge {
  const label = `knowledge-graph edges[${index}]`;
  const record = planner.record(value, label, ['source', 'target', 'color', 'kind'], [
    'id',
    'label',
    'attributes',
    'epistemic',
    'evidence',
    'uncalibrated_score',
    'directed',
    'particles',
    'edgeStrokePattern',
  ]);
  const colorSource = boundedString(
    planner,
    record.color,
    `${label}.color`,
    KNOWLEDGE_GRAPH_LIMITS.maxColorLength,
  );
  if (!HEX_COLOR.test(colorSource)) {
    throw new TypeError(`${label}.color must be exact #rgb or #rrggbb hex`);
  }
  const color = normalizedHexColor(colorSource);
  const result: Record<string, unknown> = {
    source: boundedString(
      planner, record.source, `${label}.source`, KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength,
    ),
    target: boundedString(
      planner, record.target, `${label}.target`, KNOWLEDGE_GRAPH_LIMITS.maxNodeIdLength,
    ),
    color,
    kind: boundedString(
      planner, record.kind, `${label}.kind`, KNOWLEDGE_GRAPH_LIMITS.maxKindLength,
    ),
    edgeStrokePattern: 'solid',
  };
  if (Object.hasOwn(record, 'edgeStrokePattern')) {
    const edgeStrokePattern = boundedString(
      planner,
      record.edgeStrokePattern,
      `${label}.edgeStrokePattern`,
      32,
    );
    if (!isKnowledgeGraphEdgeStrokePattern(edgeStrokePattern)) {
      throw new TypeError(`${label}.edgeStrokePattern is unsupported`);
    }
    result.edgeStrokePattern = edgeStrokePattern;
  }
  addOptional(result, 'id', optionalBoundedString(
    planner, record, 'id', `${label}.id`, KNOWLEDGE_GRAPH_LIMITS.maxEdgeIdLength,
  ));
  addOptional(result, 'label', optionalBoundedString(
    planner, record, 'label', `${label}.label`, KNOWLEDGE_GRAPH_LIMITS.maxEdgeLabelLength,
  ));
  if (Object.hasOwn(record, 'attributes')) {
    result.attributes = snapshotAttributes(planner, record.attributes, `${label}.attributes`);
  }
  if (Object.hasOwn(record, 'epistemic')) {
    result.epistemic = snapshotEpistemic(planner, record.epistemic, `${label}.epistemic`);
  }
  if (Object.hasOwn(record, 'evidence')) {
    result.evidence = snapshotEvidence(planner, record.evidence, `${label}.evidence`);
  }
  if (Object.hasOwn(record, 'uncalibrated_score')) {
    result.uncalibrated_score = snapshotScore(
      planner,
      record.uncalibrated_score,
      `${label}.uncalibrated_score`,
    );
  }
  addOptional(result, 'directed', optionalBoolean(record, 'directed', `${label}.directed`));
  addOptional(result, 'particles', optionalBoolean(record, 'particles', `${label}.particles`));
  return result as unknown as KnowledgeGraph3DEdge;
}

function snapshotContext(
  planner: PresentationPlanner,
  value: unknown,
): KnowledgeGraphContext {
  const label = 'knowledge-graph context';
  const record = planner.record(value, label, [
    'graph_id',
    'graph_source',
    'graph_snapshot_id',
    'graph_scope',
    'generated_at',
  ]);
  const context = {
    graph_id: boundedString(planner, record.graph_id, `${label}.graph_id`, 160),
    graph_source: boundedString(planner, record.graph_source, `${label}.graph_source`, 200),
    graph_snapshot_id: boundedString(
      planner,
      record.graph_snapshot_id,
      `${label}.graph_snapshot_id`,
      200,
    ),
    graph_scope: boundedString(planner, record.graph_scope, `${label}.graph_scope`, 80),
    generated_at: boundedString(planner, record.generated_at, `${label}.generated_at`, 80),
  };
  if (context.graph_scope !== 'corpus_entity') {
    throw new TypeError(`${label}.graph_scope must equal corpus_entity`);
  }
  if (!isRfc3339WithSeconds(context.generated_at)) {
    throw new TypeError(`${label}.generated_at must be an RFC 3339 timestamp with seconds`);
  }
  return context;
}

function assertUniqueNodesAndRenderableEdges(
  nodes: readonly KnowledgeGraph3DNode[],
  edges: readonly KnowledgeGraph3DEdge[],
): void {
  const nodeIds = new Set<string>();
  for (let index = 0; index < nodes.length; index++) {
    const id = nodes[index].id;
    if (nodeIds.has(id)) {
      throw new TypeError(`knowledge graph node id is duplicated at index ${index}`);
    }
    nodeIds.add(id);
  }
  const assertEvidenceReferences = (
    evidence: readonly KnowledgeGraphEvidenceRef[] | undefined,
    label: string,
  ): void => {
    if (evidence === undefined) return;
    for (let index = 0; index < evidence.length; index++) {
      const reference = evidence[index];
      if (reference.kind === 'graph_node' && !nodeIds.has(reference.node_id)) {
        throw new TypeError(
          `${label} evidence at index ${index} references a missing graph node`,
        );
      }
    }
  };
  for (let index = 0; index < nodes.length; index++) {
    assertEvidenceReferences(nodes[index].evidence, `knowledge graph node at index ${index}`);
  }
  const identities = new Set<string>();
  const pairCounts = new Map<string, number>();
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index];
    assertEvidenceReferences(edge.evidence, `knowledge graph edge at index ${index}`);
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new TypeError(`knowledge graph edge at index ${index} has a missing endpoint`);
    }
    if (edge.source === edge.target) {
      throw new TypeError(`knowledge graph edge at index ${index} is a self-loop`);
    }
    if (edge.directed === false && edge.particles === true) {
      throw new TypeError(
        `knowledge graph edge at index ${index} is undirected but carries directional particles`,
      );
    }
    const identity = graphEdgeIdentityKey(edge);
    if (identities.has(identity)) {
      throw new TypeError(`knowledge graph edge identity is duplicated at index ${index}`);
    }
    identities.add(identity);
    const pair = edge.source < edge.target
      ? JSON.stringify([edge.source, edge.target])
      : JSON.stringify([edge.target, edge.source]);
    const count = (pairCounts.get(pair) ?? 0) + 1;
    if (count > KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair) {
      throw new RangeError(
        `knowledge graph edge bundle exceeds ` +
          `${KNOWLEDGE_GRAPH_LIMITS.maxParallelEdgesPerPair} at index ${index}`,
      );
    }
    pairCounts.set(pair, count);
  }
}

const CORPUS_NODE_KINDS = new Set(['paper', 'model', 'family']);
const CORPUS_EDGE_SEMANTICS = {
  cites: {
    source: 'paper', target: 'paper', directed: true, particles: true,
    scoreKinds: ['citation_resolution_confidence'],
  },
  same_as: {
    source: 'model', target: 'model', directed: false, particles: false,
    scoreKinds: ['structural_similarity'],
  },
  variant_of: {
    source: 'model', target: 'model', directed: true, particles: false,
    scoreKinds: ['structural_similarity'],
  },
  instantiates: {
    source: 'paper', target: 'model', directed: true, particles: false,
    scoreKinds: [],
  },
  belongs_to_family: {
    source: 'model', target: 'family', directed: true, particles: false,
    scoreKinds: [],
  },
} as const;

function hasDirectEvidenceAnchor(
  evidence: readonly KnowledgeGraphEvidenceRef[] | undefined,
): boolean {
  return evidence !== undefined && evidence.length > 0 &&
    evidence.some((reference) => reference.kind !== 'graph_node');
}

/**
 * Closed visual-record and graph-integrity checks for the corpus presentation
 * profile. These are deliberately narrower than the legacy corpus params schema:
 * they do not claim its trimming/normalization semantics or authenticate the
 * mapper that produced the visual records.
 */
function assertCorpusPresentationSemantics(
  nodes: readonly KnowledgeGraph3DNode[],
  edges: readonly KnowledgeGraph3DEdge[],
): void {
  if (nodes.length < 1) {
    throw new TypeError('corpus knowledge-graph presentation requires at least one node');
  }
  const nodeKinds = new Map<string, string>();
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (!CORPUS_NODE_KINDS.has(node.kind)) {
      throw new TypeError(`corpus knowledge-graph node at index ${index} has an invalid kind`);
    }
    if (
      node.attributes === undefined ||
      node.epistemic === undefined ||
      !hasDirectEvidenceAnchor(node.evidence)
    ) {
      throw new TypeError(
        `corpus knowledge-graph node at index ${index} requires attributes, ` +
          'advisory epistemic metadata, and a direct evidence anchor',
      );
    }
    if (
      node.uncalibrated_score !== undefined &&
      node.uncalibrated_score.kind !== 'extraction_confidence'
    ) {
      throw new TypeError(
        `corpus knowledge-graph node at index ${index} permits only ` +
          'extraction_confidence',
      );
    }
    if (node.radiusMeaning === undefined) {
      throw new TypeError(
        `corpus knowledge-graph node at index ${index} requires derived radius semantics`,
      );
    }
    if (
      node.nodeGlyph !== CORPUS_NODE_GLYPH_BY_KIND[
        node.kind as keyof typeof CORPUS_NODE_GLYPH_BY_KIND
      ]
    ) {
      throw new TypeError(
        `corpus knowledge-graph node at index ${index} has an invalid glyph mapping`,
      );
    }
    nodeKinds.set(node.id, node.kind);
  }
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index];
    const semantics = CORPUS_EDGE_SEMANTICS[
      edge.kind as keyof typeof CORPUS_EDGE_SEMANTICS
    ];
    if (semantics === undefined) {
      throw new TypeError(`corpus knowledge-graph edge at index ${index} has an invalid kind`);
    }
    if (
      edge.id === undefined ||
      edge.label === undefined ||
      edge.attributes === undefined ||
      edge.epistemic === undefined ||
      !hasDirectEvidenceAnchor(edge.evidence)
    ) {
      throw new TypeError(
        `corpus knowledge-graph edge at index ${index} requires a stable id, label, ` +
          'attributes, advisory epistemic metadata, and a direct evidence anchor',
      );
    }
    if (
      nodeKinds.get(edge.source) !== semantics.source ||
      nodeKinds.get(edge.target) !== semantics.target
    ) {
      throw new TypeError(
        `corpus knowledge-graph edge at index ${index} has incompatible endpoint kinds`,
      );
    }
    if (
      (edge.directed !== false) !== semantics.directed ||
      (edge.particles === true) !== semantics.particles
    ) {
      throw new TypeError(
        `corpus knowledge-graph edge at index ${index} has invalid direction/flow semantics`,
      );
    }
    if (
      edge.edgeStrokePattern !== CORPUS_EDGE_STROKE_PATTERN_BY_KIND[
        edge.kind as keyof typeof CORPUS_EDGE_STROKE_PATTERN_BY_KIND
      ]
    ) {
      throw new TypeError(
        `corpus knowledge-graph edge at index ${index} has an invalid stroke mapping`,
      );
    }
    if (
      edge.uncalibrated_score !== undefined &&
      !(semantics.scoreKinds as readonly string[]).includes(
        edge.uncalibrated_score.kind,
      )
    ) {
      throw new TypeError(
        `corpus knowledge-graph edge at index ${index} has an invalid score meaning`,
      );
    }
  }
}

/**
 * Prepare an ordinary materialized JavaScript value.
 *
 * This convenience boundary never reads an accessor and performs a complete
 * descriptor/key/prototype revalidation before publication. JavaScript offers no
 * operation that can inspect an arbitrary Proxy without allowing its internal
 * methods to execute traps; therefore Proxy objects are not an inert input to this
 * function. Use `parseKnowledgeGraphPresentationJson` for hostile input.
 */
function prepareKnowledgeGraphPresentationWithAssurance(
  input: InternalKnowledgeGraphPresentationInputV1,
  inputAssurance: KnowledgeGraphPresentationInputAssuranceV1,
  expectedProfile: InternalKnowledgeGraphPresentationInputV1['profile'],
): PreparedKnowledgeGraphPresentationV1 {
  const planner = new PresentationPlanner();
  const record = planner.record(input, 'knowledge-graph presentation', [
    'contract',
    'profile',
    'nodes',
    'edges',
  ], ['graphIdentity', 'context']);
  if (record.contract !== KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1) {
    throw new TypeError(
      `knowledge-graph presentation.contract must equal ` +
        `${KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1}`,
    );
  }
  planner.budget.string(record.contract, 'knowledge-graph presentation.contract');
  if (record.profile !== expectedProfile) {
    throw new TypeError(
      `knowledge-graph presentation.profile must equal ${expectedProfile}`,
    );
  }
  planner.budget.string(
    record.profile as InternalKnowledgeGraphPresentationInputV1['profile'],
    'knowledge-graph presentation.profile',
  );
  const nodeInputs = planner.array(
    record.nodes,
    'knowledge-graph nodes',
    KNOWLEDGE_GRAPH_LIMITS.maxPresentationNodes,
  );
  const edgeInputs = planner.array(
    record.edges,
    'knowledge-graph edges',
    KNOWLEDGE_GRAPH_LIMITS.maxPresentationEdges,
  );
  const nodes = nodeInputs.map((node, index) => snapshotNode(planner, node, index));
  const edges = edgeInputs.map((edge, index) => snapshotEdge(planner, edge, index));
  const hasContext = Object.hasOwn(record, 'context');
  const hasGraphIdentity = Object.hasOwn(record, 'graphIdentity');
  if (expectedProfile === 'generic_visual' && hasContext) {
    throw new TypeError('generic visual presentations cannot carry corpus context');
  }
  if (expectedProfile === 'corpus_entity' && (!hasContext || hasGraphIdentity)) {
    throw new TypeError(
      'corpus presentations require context and cannot supply graphIdentity',
    );
  }
  const context = hasContext ? snapshotContext(planner, record.context) : undefined;
  let graphIdentity: string;
  if (expectedProfile === 'corpus_entity' && context !== undefined) {
    graphIdentity = deriveKnowledgeGraphContextIdentity(context);
  } else {
    if (!hasGraphIdentity) {
      throw new TypeError(
        'generic visual presentations require graphIdentity',
      );
    }
    graphIdentity = boundedString(
      planner,
      record.graphIdentity,
      'knowledge-graph presentation.graphIdentity',
      1_024,
    );
  }
  assertUniqueNodesAndRenderableEdges(nodes, edges);
  if (expectedProfile === 'corpus_entity') {
    assertCorpusPresentationSemantics(nodes, edges);
  }
  planner.revalidate();

  const owned: Record<string, unknown> = {
    contract: PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
    profile: expectedProfile,
    graphIdentity,
    nodes,
    edges,
    budget: planner.budget.receipt(),
    inputAssurance,
    mappingAuthority: expectedProfile === 'corpus_entity'
      ? {
          kind: 'corpus_visual_mapping',
          presentationInvariants:
            'bounded_closed_visual_records_redundant_kind_channels_and_graph_integrity',
          derivationAuthentication: 'not_performed',
          scientificAuthority: 'not_established',
        }
      : {
          kind: 'caller_declared_visual_mapping',
          scientificAuthority: 'not_established',
        },
  };
  if (context !== undefined) owned.context = context;
  nullPrototypeOwnedRecords(owned);
  const prepared = deepFreeze(owned) as unknown as PreparedKnowledgeGraphPresentationV1;
  PREPARED_PRESENTATIONS.add(prepared);
  PRESENTATION_NODE_IDS.set(prepared, new Set(nodes.map(({ id }) => id)));
  return prepared;
}

export function prepareKnowledgeGraphPresentation(
  input: KnowledgeGraphPresentationInputV1,
): PreparedGenericKnowledgeGraphPresentationV1 {
  return prepareKnowledgeGraphPresentationWithAssurance(input, {
    boundary: 'materialized_javascript_value',
    duplicateMembers: 'not_observable_after_materialization',
    proxyTrapFreedom: 'not_established',
  }, 'generic_visual') as PreparedGenericKnowledgeGraphPresentationV1;
}

/** Package-shared corpus mint called by the legacy corpus visual mapper. */
export function prepareCorpusKnowledgeGraphPresentation(
  input: CorpusKnowledgeGraphPresentationInputV1,
): PreparedCorpusKnowledgeGraphPresentationV1 {
  return prepareKnowledgeGraphPresentationWithAssurance(input, {
    boundary: 'materialized_javascript_value',
    duplicateMembers: 'not_observable_after_materialization',
    proxyTrapFreedom: 'not_established',
  }, 'corpus_entity') as PreparedCorpusKnowledgeGraphPresentationV1;
}

/**
 * Strong raw-text boundary: duplicate members, excessive depth/materialization,
 * malformed Unicode, and oversized input are rejected before ordinary objects
 * reach the descriptor-based preparer.
 */
export function parseKnowledgeGraphPresentationJson(
  text: string,
): PreparedGenericKnowledgeGraphPresentationV1 {
  const parsed = parseJsonStrict(text, {
    limits: KNOWLEDGE_GRAPH_JSON_PARSE_LIMITS,
  });
  if (!parsed.ok) throw new KnowledgeGraphPresentationJsonError(parsed.errors);
  return prepareKnowledgeGraphPresentationWithAssurance(
    parsed.value as unknown as KnowledgeGraphPresentationInputV1,
    {
      boundary: 'raw_json_text',
      duplicateMembers: 'rejected_before_materialization',
      proxyTrapFreedom: 'not_applicable',
    },
    'generic_visual',
  ) as PreparedGenericKnowledgeGraphPresentationV1;
}

export function isPreparedKnowledgeGraphPresentation(
  value: unknown,
): value is PreparedKnowledgeGraphPresentationV1 {
  return value !== null &&
    typeof value === 'object' &&
    PREPARED_PRESENTATIONS.has(value);
}

export function assertPreparedKnowledgeGraphPresentation(
  value: unknown,
): asserts value is PreparedKnowledgeGraphPresentationV1 {
  if (!isPreparedKnowledgeGraphPresentation(value)) {
    throw new TypeError(
      'knowledge-graph surfaces require a capability returned by ' +
        'prepareKnowledgeGraphPresentation, parseKnowledgeGraphPresentationJson, ' +
        'or the canonical corpus-figure preparation boundary',
    );
  }
}

export function assertPreparedGenericKnowledgeGraphPresentation(
  value: unknown,
): asserts value is PreparedGenericKnowledgeGraphPresentationV1 {
  assertPreparedKnowledgeGraphPresentation(value);
  if (value.profile !== 'generic_visual') {
    throw new TypeError(
      'direct knowledge-graph surfaces accept only generic_visual presentations; ' +
      'render corpus_entity through KnowledgeGraphAccessibleFigure so its bound ' +
      'honesty caption remains in the composition',
    );
  }
}

export function assertPreparedCorpusKnowledgeGraphPresentation(
  value: unknown,
): asserts value is PreparedCorpusKnowledgeGraphPresentationV1 {
  assertPreparedKnowledgeGraphPresentation(value);
  if (value.profile !== 'corpus_entity') {
    throw new TypeError('canonical corpus surfaces require a corpus_entity presentation');
  }
}

/** O(1) exact-token membership check; candidate ids are ordinary bounded strings. */
export function knowledgeGraphPresentationContainsNode(
  presentation: PreparedKnowledgeGraphPresentationV1,
  nodeId: string,
): boolean {
  assertPreparedKnowledgeGraphPresentation(presentation);
  return PRESENTATION_NODE_IDS.get(presentation)!.has(nodeId);
}

/**
 * Complete RFC 8785 serialization of the exact prepared presentation record.
 * Array order remains data. The bytes are deterministic inspection/export data,
 * not a snapshot authentication, evidence-resolution, custody, or rehydration
 * receipt; parsing them does not recreate the module-private capability.
 */
export function serializePreparedKnowledgeGraphPresentation(
  value: unknown,
): string {
  assertPreparedKnowledgeGraphPresentation(value);
  return canonicalize(value);
}

const VIEW_NODE_IDS = new WeakMap<object, ReadonlySet<string>>();
interface ViewSourceKinds {
  readonly nodeKinds: ReadonlySet<string>;
  readonly edgeKinds: ReadonlySet<string>;
}
const VIEW_SOURCE_KINDS = new WeakMap<object, ViewSourceKinds>();
const VIEW_CACHE = new WeakMap<object, Map<string, PreparedKnowledgeGraphViewV1>>();

function sourceViewKinds(
  source: PreparedKnowledgeGraphPresentationV1,
): ViewSourceKinds {
  const existing = VIEW_SOURCE_KINDS.get(source);
  if (existing !== undefined) return existing;
  const created = {
    nodeKinds: new Set(source.nodes.map(({ kind }) => kind)),
    edgeKinds: new Set(source.edges.map(({ kind }) => kind)),
  };
  VIEW_SOURCE_KINDS.set(source, created);
  return created;
}

function snapshotViewKinds(
  planner: PresentationPlanner,
  record: Readonly<Record<string, unknown>>,
  key: 'nodeKinds' | 'edgeKinds',
  sourceKinds: ReadonlySet<string>,
): 'all' | readonly string[] {
  if (!Object.hasOwn(record, key)) return 'all';
  const input = planner.array(
    record[key],
    `knowledge-graph view policy.${key}`,
    key === 'nodeKinds'
      ? KNOWLEDGE_GRAPH_LIMITS.maxViewNodeKinds
      : KNOWLEDGE_GRAPH_LIMITS.maxViewEdgeKinds,
  );
  const result: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < input.length; index++) {
    const kind = boundedString(
      planner,
      input[index],
      `knowledge-graph view policy.${key}[${index}]`,
      KNOWLEDGE_GRAPH_LIMITS.maxKindLength,
    );
    if (seen.has(kind)) {
      throw new TypeError(`knowledge-graph view policy.${key} contains a duplicate kind`);
    }
    if (!sourceKinds.has(kind)) {
      throw new TypeError(
        `knowledge-graph view policy.${key} requests a kind absent from the source graph`,
      );
    }
    seen.add(kind);
    result.push(kind);
  }
  result.sort();
  return result;
}

/**
 * Prepare a deterministic view over an exact source capability. Filters are
 * sets: duplicates and unknown kinds are rejected, stored arrays are sorted,
 * omission means all, and [] intentionally means none. No scientific record is
 * copied or minted; visible arrays reuse exact frozen source record references.
 */
export function prepareKnowledgeGraphView(
  source: PreparedKnowledgeGraphPresentationV1,
  policy: KnowledgeGraphViewPolicyV1 = {},
): PreparedKnowledgeGraphViewV1 {
  assertPreparedKnowledgeGraphPresentation(source);
  const planner = new PresentationPlanner();
  const record = planner.record(
    policy,
    'knowledge-graph view policy',
    [],
    ['nodeKinds', 'edgeKinds'],
  );
  const sourceKinds = sourceViewKinds(source);
  const nodeKinds = snapshotViewKinds(
    planner,
    record,
    'nodeKinds',
    sourceKinds.nodeKinds,
  );
  const edgeKinds = snapshotViewKinds(
    planner,
    record,
    'edgeKinds',
    sourceKinds.edgeKinds,
  );
  planner.revalidate();
  const cacheKey = JSON.stringify([nodeKinds, edgeKinds]);
  const cache = VIEW_CACHE.get(source);
  const cached = cache?.get(cacheKey);
  if (cached !== undefined && cache !== undefined) {
    cache.delete(cacheKey);
    cache.set(cacheKey, cached);
    return cached;
  }
  const selectedNodeKinds = nodeKinds === 'all' ? undefined : new Set(nodeKinds);
  const selectedEdgeKinds = edgeKinds === 'all' ? undefined : new Set(edgeKinds);
  const nodes = source.nodes.filter((node) =>
    selectedNodeKinds === undefined || selectedNodeKinds.has(node.kind));
  const nodeIds = new Set(nodes.map(({ id }) => id));
  let edgeKindCandidates = 0;
  const edges = source.edges.filter((edge) => {
    if (selectedEdgeKinds !== undefined && !selectedEdgeKinds.has(edge.kind)) return false;
    edgeKindCandidates += 1;
    return nodeIds.has(edge.source) && nodeIds.has(edge.target);
  });
  const storedPolicy: Record<string, unknown> = Object.create(null);
  storedPolicy.nodeKinds = nodeKinds === 'all' ? 'all' : Object.freeze([...nodeKinds]);
  storedPolicy.edgeKinds = edgeKinds === 'all' ? 'all' : Object.freeze([...edgeKinds]);
  const counts: Record<string, number> = Object.create(null);
  counts.sourceNodes = source.nodes.length;
  counts.sourceEdges = source.edges.length;
  counts.visibleNodes = nodes.length;
  counts.visibleEdges = edges.length;
  counts.edgeKindFilteredEdges = source.edges.length - edgeKindCandidates;
  counts.endpointPrunedEdges = edgeKindCandidates - edges.length;
  const owned: Record<string, unknown> = Object.create(null);
  owned.contract = PREPARED_KNOWLEDGE_GRAPH_VIEW_V1;
  owned.graphIdentity = source.graphIdentity;
  owned.policy = Object.freeze(storedPolicy);
  owned.nodes = Object.freeze(nodes);
  owned.edges = Object.freeze(edges);
  owned.counts = Object.freeze(counts);
  const prepared = Object.freeze(owned) as unknown as PreparedKnowledgeGraphViewV1;
  PREPARED_VIEWS.add(prepared);
  VIEW_SOURCES.set(prepared, source);
  VIEW_NODE_IDS.set(prepared, nodeIds);
  if (cache !== undefined) {
    if (cache.size >= KNOWLEDGE_GRAPH_LIMITS.maxCachedViewsPerPresentation) {
      const oldest = cache.keys().next().value as string | undefined;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(cacheKey, prepared);
  } else {
    VIEW_CACHE.set(source, new Map([[cacheKey, prepared]]));
  }
  return prepared;
}

export function isPreparedKnowledgeGraphView(
  value: unknown,
): value is PreparedKnowledgeGraphViewV1 {
  return value !== null && typeof value === 'object' && PREPARED_VIEWS.has(value);
}

/** O(1) brand and exact-source binding check; no candidate property is read. */
export function assertPreparedKnowledgeGraphView(
  value: unknown,
  source: PreparedKnowledgeGraphPresentationV1,
): asserts value is PreparedKnowledgeGraphViewV1 {
  assertPreparedKnowledgeGraphPresentation(source);
  if (
    !isPreparedKnowledgeGraphView(value) ||
    VIEW_SOURCES.get(value) !== source
  ) {
    throw new TypeError(
      'knowledge-graph view must be a capability prepared for the exact source presentation',
    );
  }
}

export function knowledgeGraphViewContainsNode(
  view: PreparedKnowledgeGraphViewV1,
  source: PreparedKnowledgeGraphPresentationV1,
  nodeId: string,
): boolean {
  assertPreparedKnowledgeGraphView(view, source);
  return VIEW_NODE_IDS.get(view)!.has(nodeId);
}
