/**
 * Versioned, deliberately non-executable source-adapter examples.
 *
 * A library-authored example is known to be synthetic.  It therefore cannot be
 * passed through an adapter that authors `source.kind = "simulation"`: doing so
 * would turn Cortexel's own fixture into a caller declaration about a simulator
 * run that never happened.  The outer envelope makes that status discoverable,
 * while the nested guard makes the unchanged `inputTemplate` fail even if a host
 * extracts it and calls the programmatic adapter directly.
 *
 * Removing the guard is intentionally never automatic.  It is the caller's
 * explicit acknowledgement that every synthetic value has first been replaced
 * with its caller-owned capture and authority record.  Cortexel cannot verify
 * that external act, but it can prevent the shipped bytes from silently crossing
 * the simulation-provenance boundary unchanged.
 */

export const SOURCE_ADAPTER_EXAMPLE_PROTOCOL =
  'cortexel-source-adapter-example' as const;
export const SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION = 1 as const;
export const SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER =
  'cortexelSyntheticExampleGuard' as const;

export const SOURCE_ADAPTER_EXAMPLE_ACTION =
  'replace_with_caller_owned_capture_then_remove_guard_and_submit_input_template' as const;

const SOURCE_ADAPTER_EXAMPLE_KIND = 'synthetic_fixture' as const;
const SOURCE_ADAPTER_EXAMPLE_EXECUTION = 'template_only' as const;
const SOURCE_ADAPTER_EXAMPLE_GUARD_STATUS = 'synthetic_unreplaced' as const;

export interface SourceAdapterInputTemplate {
  readonly exportedStatus: Readonly<Record<string, unknown>>;
  readonly options: Readonly<Record<string, unknown>>;
}

export interface SourceAdapterExampleGuardV1 {
  readonly protocol: typeof SOURCE_ADAPTER_EXAMPLE_PROTOCOL;
  readonly protocolVersion: typeof SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION;
  readonly status: typeof SOURCE_ADAPTER_EXAMPLE_GUARD_STATUS;
}

export interface SourceAdapterExampleEnvelopeV1<
  Id extends string = string,
  Input extends SourceAdapterInputTemplate = SourceAdapterInputTemplate,
> {
  readonly protocol: typeof SOURCE_ADAPTER_EXAMPLE_PROTOCOL;
  readonly protocolVersion: typeof SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION;
  readonly adapter: {
    readonly id: Id;
    readonly revision: number;
  };
  readonly exampleKind: typeof SOURCE_ADAPTER_EXAMPLE_KIND;
  readonly execution: typeof SOURCE_ADAPTER_EXAMPLE_EXECUTION;
  readonly action: typeof SOURCE_ADAPTER_EXAMPLE_ACTION;
  readonly inputTemplate: {
    readonly exportedStatus: Input['exportedStatus'];
    readonly options: Input['options'] & {
      readonly [SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER]: SourceAdapterExampleGuardV1;
    };
  };
}

const EXAMPLE_GUARD: SourceAdapterExampleGuardV1 = Object.freeze({
  protocol: SOURCE_ADAPTER_EXAMPLE_PROTOCOL,
  protocolVersion: SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION,
  status: SOURCE_ADAPTER_EXAMPLE_GUARD_STATUS,
});

/** Construct one closed template-only example from trusted catalog literals. */
export function makeSourceAdapterExampleEnvelope<
  const Id extends string,
  const Input extends SourceAdapterInputTemplate,
>(
  id: Id,
  revision: number,
  inputTemplate: Input,
): SourceAdapterExampleEnvelopeV1<Id, Input> {
  if (!Number.isSafeInteger(revision) || revision <= 0) {
    throw new TypeError('source-adapter example revision must be a positive safe integer');
  }
  if (Object.prototype.hasOwnProperty.call(
    inputTemplate.options,
    SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER,
  )) {
    throw new TypeError('source-adapter input template already contains the synthetic guard');
  }

  return {
    protocol: SOURCE_ADAPTER_EXAMPLE_PROTOCOL,
    protocolVersion: SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION,
    adapter: { id, revision },
    exampleKind: SOURCE_ADAPTER_EXAMPLE_KIND,
    execution: SOURCE_ADAPTER_EXAMPLE_EXECUTION,
    action: SOURCE_ADAPTER_EXAMPLE_ACTION,
    inputTemplate: {
      exportedStatus: inputTemplate.exportedStatus,
      options: {
        ...inputTemplate.options,
        [SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER]: EXAMPLE_GUARD,
      },
    },
  };
}

type ExampleEnvelopeClassification =
  | { readonly kind: 'not_example' }
  | { readonly kind: 'template_only' }
  | { readonly kind: 'malformed_example' };

const EXAMPLE_KEYS = Object.freeze([
  'action',
  'adapter',
  'exampleKind',
  'execution',
  'inputTemplate',
  'protocol',
  'protocolVersion',
] as const);
const EXAMPLE_KEY_SET: ReadonlySet<string> = new Set(EXAMPLE_KEYS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasAnyExampleEnvelopeKey(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => EXAMPLE_KEY_SET.has(key));
}

/**
 * Classify the outer envelope without inspecting a single `inputTemplate`
 * member.  Raw CLI JSON has already crossed the duplicate-key-safe parser, so
 * exact own-key and primitive checks are sufficient here.
 */
export function classifySourceAdapterExampleEnvelope(
  value: unknown,
): ExampleEnvelopeClassification {
  if (!isRecord(value) || !hasAnyExampleEnvelopeKey(value)) {
    return { kind: 'not_example' };
  }

  const keys = Object.keys(value).sort();
  if (
    keys.length !== EXAMPLE_KEYS.length ||
    keys.some((key, index) => key !== EXAMPLE_KEYS[index]) ||
    value.protocol !== SOURCE_ADAPTER_EXAMPLE_PROTOCOL ||
    value.protocolVersion !== SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION ||
    value.exampleKind !== SOURCE_ADAPTER_EXAMPLE_KIND ||
    value.execution !== SOURCE_ADAPTER_EXAMPLE_EXECUTION ||
    value.action !== SOURCE_ADAPTER_EXAMPLE_ACTION
  ) {
    return { kind: 'malformed_example' };
  }

  const adapter = value.adapter;
  if (!isRecord(adapter)) return { kind: 'malformed_example' };
  const adapterKeys = Object.keys(adapter).sort();
  if (
    adapterKeys.length !== 2 ||
    adapterKeys[0] !== 'id' ||
    adapterKeys[1] !== 'revision' ||
    typeof adapter.id !== 'string' ||
    adapter.id.length === 0 ||
    adapter.id.length > 64 ||
    !/^[a-z0-9._-]+$/u.test(adapter.id) ||
    !Number.isSafeInteger(adapter.revision) ||
    (adapter.revision as number) <= 0
  ) {
    return { kind: 'malformed_example' };
  }

  // Deliberately do not read, classify, snapshot, or validate inputTemplate.
  return { kind: 'template_only' };
}

/** True only for the exact nested guard Cortexel adds to its own fixtures. */
export function isSourceAdapterExampleGuard(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  return (
    keys.length === 3 &&
    keys[0] === 'protocol' &&
    keys[1] === 'protocolVersion' &&
    keys[2] === 'status' &&
    value.protocol === SOURCE_ADAPTER_EXAMPLE_PROTOCOL &&
    value.protocolVersion === SOURCE_ADAPTER_EXAMPLE_PROTOCOL_VERSION &&
    value.status === SOURCE_ADAPTER_EXAMPLE_GUARD_STATUS
  );
}
