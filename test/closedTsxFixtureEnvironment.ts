import {
  lstatSync,
  mkdirSync,
  realpathSync,
  rmdirSync,
  type BigIntStats,
} from 'node:fs';
import path from 'node:path';
import { TextDecoder, types as utilTypes } from 'node:util';

import {
  assertReviewedNodeRuntimeLive,
  createReviewedNodeRuntime,
  disposeReviewedNodeRuntime,
  type ReviewedNodeRuntime,
} from '../scripts/lib/reviewed-node-runtime.js';
import {
  REVIEWED_POSIX_COMMAND_LIMITS,
  runReviewedPosixCommand,
} from '../scripts/lib/reviewed-posix-command.js';
import {
  requireExactPrivateDirectoryAuthority,
  type ExactPrivateDirectoryAuthority,
} from '../scripts/lib/posix-acl-authority.js';

const MAX_PATH_BYTES = REVIEWED_POSIX_COMMAND_LIMITS.pathBytes;
const LOADER_DIRECTORY_NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/u;
const CLOSED_ENVIRONMENT_KEYS = Object.freeze([
  'LANG',
  'LC_ALL',
  'TEMP',
  'TMP',
  'TMPDIR',
] as const);
const DARWIN_NODE_IMPLICIT_ENVIRONMENT_KEY = '__CF_USER_TEXT_ENCODING';

export interface ClosedTsxFixtureCommandOptions {
  readonly cwd: string;
  readonly outputLimitBytes: number;
  readonly timeoutMs: number;
}

export interface ClosedTsxFixtureCommandResult {
  readonly signal: NodeJS.Signals | null;
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

export interface ClosedTsxFixtureEnvironment {
  readonly environment: Readonly<NodeJS.ProcessEnv>;
  readonly loaderTemporaryDirectory: string;
  /** One exact reviewed invocation. The staged Node runtime is then disposed. */
  readonly runNode: (
    arguments_: readonly string[],
    options: ClosedTsxFixtureCommandOptions,
  ) => ClosedTsxFixtureCommandResult;
  /** Dispose an unused capability. A consumed capability rejects reuse. */
  readonly dispose: () => void;
}

interface OwnedDirectoryIdentity {
  readonly device: bigint;
  readonly inode: bigint;
}

function fail(message: string): never {
  throw new Error(`closed TSX fixture: ${message}`);
}

function platformIsSupported(platform: string): boolean {
  return platform === 'darwin' || platform === 'linux';
}

function samePrivateDirectoryAuthority(
  left: ExactPrivateDirectoryAuthority,
  right: ExactPrivateDirectoryAuthority,
): boolean {
  return left.path === right.path &&
    left.device === right.device &&
    left.inode === right.inode &&
    left.mode === right.mode &&
    left.uid === right.uid;
}

function ownedDirectoryIdentity(stat: BigIntStats): OwnedDirectoryIdentity {
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail('created loader scratch is not a direct directory');
  }
  return Object.freeze({ device: stat.dev, inode: stat.ino });
}

function removeOwnedEmptyDirectory(
  directory: string,
  identity: OwnedDirectoryIdentity,
): void {
  const observed = lstatSync(directory, { bigint: true });
  if (
    !observed.isDirectory() ||
    observed.isSymbolicLink() ||
    observed.dev !== identity.device ||
    observed.ino !== identity.inode
  ) {
    fail('loader scratch identity changed; foreign pathname was retained');
  }
  rmdirSync(directory);
}

function throwWithCleanup(
  primary: unknown,
  cleanupErrors: readonly unknown[],
  label: string,
): never {
  if (cleanupErrors.length === 0) throw primary;
  throw new AggregateError(
    [primary, ...cleanupErrors],
    `${label} failed and cleanup authority is uncertain`,
    { cause: primary },
  );
}

function requireBoundedPhysicalAbsolutePath(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_PATH_BYTES ||
    value.includes('\0') ||
    !path.isAbsolute(value) ||
    path.resolve(value) !== value ||
    Buffer.byteLength(value, 'utf8') > MAX_PATH_BYTES ||
    realpathSync(value) !== value
  ) {
    fail(`${label} must be one bounded physical absolute path`);
  }
  return value;
}

function exactEnvironment(loaderTemporaryDirectory: string): Readonly<NodeJS.ProcessEnv> {
  const environment: NodeJS.ProcessEnv = Object.create(null) as NodeJS.ProcessEnv;
  environment.LANG = 'C';
  environment.LC_ALL = 'C';
  environment.TEMP = loaderTemporaryDirectory;
  environment.TMP = loaderTemporaryDirectory;
  environment.TMPDIR = loaderTemporaryDirectory;
  if (
    Object.keys(environment).length !== CLOSED_ENVIRONMENT_KEYS.length ||
    CLOSED_ENVIRONMENT_KEYS.some((key) => environment[key] === undefined)
  ) {
    fail('closed environment construction drifted');
  }
  return Object.freeze(environment);
}

function decodeUtf8(bytes: Buffer, label: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    fail(`${label} is not well-formed UTF-8`);
  }
}

function snapshotArguments(value: unknown): readonly string[] {
  if (!Array.isArray(value) || utilTypes.isProxy(value)) {
    fail('Node arguments must be one direct array');
  }
  const prototype = Object.getPrototypeOf(value);
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  if (
    prototype !== Array.prototype ||
    !Number.isSafeInteger(length) ||
    length < 1 ||
    length > REVIEWED_POSIX_COMMAND_LIMITS.arguments
  ) {
    fail('Node arguments have invalid direct-array authority');
  }
  const snapshot: string[] = [];
  for (let index = 0; index < length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
      typeof descriptor.value !== 'string'
    ) {
      fail(`Node argument ${index} must be one enumerable own string`);
    }
    snapshot.push(descriptor.value);
  }
  if (Object.keys(value).length !== length) {
    fail('Node arguments must be dense and have no extra enumerable members');
  }
  return Object.freeze(snapshot);
}

function snapshotCommandOptions(value: unknown): ClosedTsxFixtureCommandOptions {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    utilTypes.isProxy(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail('command options must be one ordinary object');
  }
  const keys = Object.keys(value);
  if (
    keys.length !== 3 ||
    !keys.includes('cwd') ||
    !keys.includes('outputLimitBytes') ||
    !keys.includes('timeoutMs')
  ) {
    fail('command options do not have their exact member set');
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      fail(`command option ${key} must be an enumerable own data property`);
    }
  }
  const cwd = requireBoundedPhysicalAbsolutePath(record.cwd, 'command cwd');
  const outputLimitBytes = record.outputLimitBytes;
  const timeoutMs = record.timeoutMs;
  if (
    typeof outputLimitBytes !== 'number' ||
    !Number.isSafeInteger(outputLimitBytes) ||
    outputLimitBytes < 1 ||
    outputLimitBytes > REVIEWED_POSIX_COMMAND_LIMITS.outputBytes ||
    typeof timeoutMs !== 'number' ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs
  ) {
    fail('command timeout or output bound is invalid');
  }
  return Object.freeze({ cwd, outputLimitBytes, timeoutMs });
}

function createClosedTsxFixtureEnvironmentWithHook(
  physicalParentInput: string,
  directoryNameInput: string,
  trustedBeforeIdentityHook?: (loaderTemporaryDirectory: string) => void,
  trustedAfterCreateHook?: (loaderTemporaryDirectory: string) => void,
): ClosedTsxFixtureEnvironment {
  if (!platformIsSupported(process.platform)) {
    fail('reviewed fixture commands are implemented only on macOS/Linux');
  }
  const physicalParent = requireBoundedPhysicalAbsolutePath(
    physicalParentInput,
    'parent',
  );
  if (
    typeof directoryNameInput !== 'string' ||
    !LOADER_DIRECTORY_NAME.test(directoryNameInput)
  ) {
    fail('loader directory name is invalid');
  }
  if (
    trustedBeforeIdentityHook !== undefined &&
    (typeof trustedBeforeIdentityHook !== 'function' ||
      utilTypes.isProxy(trustedBeforeIdentityHook))
  ) {
    fail('pre-identity test hook is invalid');
  }
  if (
    trustedAfterCreateHook !== undefined &&
    (typeof trustedAfterCreateHook !== 'function' ||
      utilTypes.isProxy(trustedAfterCreateHook))
  ) {
    fail('post-create test hook is invalid');
  }
  if (
    typeof process.execPath !== 'string' ||
    process.release.name !== 'node' ||
    process.versions.bun !== undefined
  ) {
    fail('the fixture host is not an exact Node process');
  }
  const sourceNodeExecutable = requireBoundedPhysicalAbsolutePath(
    realpathSync(process.execPath),
    'source Node executable',
  );
  const loaderTemporaryDirectory = path.join(physicalParent, directoryNameInput);
  if (
    loaderTemporaryDirectory.length > MAX_PATH_BYTES ||
    Buffer.byteLength(loaderTemporaryDirectory, 'utf8') > MAX_PATH_BYTES ||
    path.dirname(loaderTemporaryDirectory) !== physicalParent
  ) {
    fail('joined loader scratch path exceeds its bound or parent');
  }
  const parentAuthority = requireExactPrivateDirectoryAuthority(
    physicalParent,
    'closed TSX fixture parent authority',
  );

  let loaderIdentity: OwnedDirectoryIdentity | null = null;
  let loaderWasCreated = false;
  let nodeRuntime: ReviewedNodeRuntime | null = null;
  try {
    mkdirSync(loaderTemporaryDirectory, { mode: 0o700 });
    loaderWasCreated = true;
    trustedBeforeIdentityHook?.(loaderTemporaryDirectory);
    loaderIdentity = ownedDirectoryIdentity(
      lstatSync(loaderTemporaryDirectory, { bigint: true }),
    );
    trustedAfterCreateHook?.(loaderTemporaryDirectory);
    const loaderAuthority = requireExactPrivateDirectoryAuthority(
      loaderTemporaryDirectory,
      'closed TSX fixture loader scratch authority',
    );
    if (
      loaderAuthority.device !== loaderIdentity.device ||
      loaderAuthority.inode !== loaderIdentity.inode
    ) {
      fail('loader scratch identity changed during creation');
    }
    const parentAfterCreate = requireExactPrivateDirectoryAuthority(
      physicalParent,
      'closed TSX fixture parent authority',
    );
    if (!samePrivateDirectoryAuthority(parentAuthority, parentAfterCreate)) {
      fail('parent authority changed during loader scratch creation');
    }
    nodeRuntime = createReviewedNodeRuntime(loaderTemporaryDirectory, {
      sourceNodeCandidates: [sourceNodeExecutable],
    });
    const environment = exactEnvironment(loaderTemporaryDirectory);
    const runtime = nodeRuntime;
    const loader = loaderAuthority;
    let active = true;

    const dispose = (): void => {
      if (!active) fail('command capability is already consumed or disposed');
      disposeReviewedNodeRuntime(runtime);
      active = false;
    };

    const runNode = (
      argumentsInput: readonly string[],
      optionsInput: ClosedTsxFixtureCommandOptions,
    ): ClosedTsxFixtureCommandResult => {
      if (!active) fail('command capability is already consumed or disposed');
      active = false;
      let outcome:
        | { readonly ok: true; readonly value: ClosedTsxFixtureCommandResult }
        | { readonly ok: false; readonly error: unknown };
      try {
        const arguments_ = snapshotArguments(argumentsInput);
        const options = snapshotCommandOptions(optionsInput);
        const parentBefore = requireExactPrivateDirectoryAuthority(
          physicalParent,
          'closed TSX fixture pre-command parent authority',
        );
        const loaderBefore = requireExactPrivateDirectoryAuthority(
          loaderTemporaryDirectory,
          'closed TSX fixture pre-command loader authority',
        );
        if (
          !samePrivateDirectoryAuthority(parentAuthority, parentBefore) ||
          !samePrivateDirectoryAuthority(loader, loaderBefore)
        ) {
          fail('fixture directory authority changed before command execution');
        }
        assertReviewedNodeRuntimeLive(runtime);
        const result = runReviewedPosixCommand(
          runtime.node.authority.executable,
          runtime.node.authority.executable,
          arguments_,
          options.cwd,
          {
            controlRuntimeAuthority: runtime.node.authority,
            environment,
            outputLimitBytes: options.outputLimitBytes,
            targetAuthority: runtime.node.authority,
            timeoutMs: options.timeoutMs,
          },
        );
        if (result.timedOut || result.outputOverflow) {
          fail('reviewed Node command exceeded its timeout or output bound');
        }
        outcome = {
          ok: true,
          value: Object.freeze({
            signal: result.signal,
            status: result.status,
            stderr: decodeUtf8(result.stderr, 'reviewed Node stderr'),
            stdout: decodeUtf8(result.stdout, 'reviewed Node stdout'),
          }),
        };
      } catch (error) {
        outcome = { ok: false, error };
      }

      const cleanupErrors: unknown[] = [];
      try {
        const parentAfter = requireExactPrivateDirectoryAuthority(
          physicalParent,
          'closed TSX fixture post-command parent authority',
        );
        const loaderAfter = requireExactPrivateDirectoryAuthority(
          loaderTemporaryDirectory,
          'closed TSX fixture post-command loader authority',
        );
        if (
          !samePrivateDirectoryAuthority(parentAuthority, parentAfter) ||
          !samePrivateDirectoryAuthority(loader, loaderAfter)
        ) {
          fail('fixture directory authority changed during command execution');
        }
      } catch (error) {
        cleanupErrors.push(error);
      }
      try {
        disposeReviewedNodeRuntime(runtime);
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (!outcome.ok) {
        throwWithCleanup(outcome.error, cleanupErrors, 'closed TSX fixture command');
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          cleanupErrors,
          'closed TSX fixture command completed but authority cleanup failed',
        );
      }
      return outcome.value;
    };

    return Object.freeze({
      dispose,
      environment,
      loaderTemporaryDirectory,
      runNode,
    });
  } catch (error) {
    const cleanupErrors: unknown[] = [];
    if (nodeRuntime !== null) {
      try {
        disposeReviewedNodeRuntime(nodeRuntime);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (loaderIdentity !== null) {
      try {
        removeOwnedEmptyDirectory(loaderTemporaryDirectory, loaderIdentity);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    } else if (loaderWasCreated) {
      try {
        const parentAfterFailure = requireExactPrivateDirectoryAuthority(
          physicalParent,
          'closed TSX fixture failed-creation parent authority',
        );
        if (!samePrivateDirectoryAuthority(parentAuthority, parentAfterFailure)) {
          fail('parent authority changed before pre-identity child cleanup');
        }
        const recovered = requireExactPrivateDirectoryAuthority(
          loaderTemporaryDirectory,
          'closed TSX fixture pre-identity child cleanup authority',
        );
        removeOwnedEmptyDirectory(loaderTemporaryDirectory, {
          device: recovered.device,
          inode: recovered.inode,
        });
      } catch (cleanupError) {
        cleanupErrors.push(new Error(
          'pre-identity loader scratch cleanup is uncertain; child was retained',
          { cause: cleanupError },
        ));
      }
    }
    throwWithCleanup(error, cleanupErrors, 'closed TSX fixture creation');
  }
}

/**
 * Give one nested TSX process a staged exact Node runtime and private scratch.
 * This closes executable selection and process environment, not Node's loader.
 */
export function createClosedTsxFixtureEnvironment(
  physicalParent: string,
  directoryName: string,
): ClosedTsxFixtureEnvironment {
  return createClosedTsxFixtureEnvironmentWithHook(physicalParent, directoryName);
}

export const closedTsxFixtureEnvironmentTesting = Object.freeze({
  closedEnvironmentKeys: (): readonly string[] => CLOSED_ENVIRONMENT_KEYS,
  effectiveNodeEnvironmentKeys: (platform: string): readonly string[] =>
    platform === 'darwin'
      ? Object.freeze([
          ...CLOSED_ENVIRONMENT_KEYS,
          DARWIN_NODE_IMPLICIT_ENVIRONMENT_KEY,
        ])
      : CLOSED_ENVIRONMENT_KEYS,
  createWithAfterCreateHook: (
    physicalParent: string,
    directoryName: string,
    hook: (loaderTemporaryDirectory: string) => void,
  ): ClosedTsxFixtureEnvironment => createClosedTsxFixtureEnvironmentWithHook(
    physicalParent,
    directoryName,
    undefined,
    hook,
  ),
  createWithBeforeIdentityHook: (
    physicalParent: string,
    directoryName: string,
    hook: (loaderTemporaryDirectory: string) => void,
  ): ClosedTsxFixtureEnvironment => createClosedTsxFixtureEnvironmentWithHook(
    physicalParent,
    directoryName,
    hook,
  ),
  maximumPathBytes: MAX_PATH_BYTES,
  platformIsSupported,
});
