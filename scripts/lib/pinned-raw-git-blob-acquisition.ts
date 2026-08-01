/**
 * Bounded raw-HTTPS acquisition for content-addressed Git blobs.
 *
 * Callers derive exact path/blob pairs from an already-verified pinned tree.
 * This boundary retrieves only those paths from one fixed HTTPS host, rejects
 * redirects and content encodings, independently reproduces every Git blob
 * SHA-1, and stages accepted bytes with exclusive owner-only authority. It
 * does not authenticate GitHub beyond the platform TLS trust store. Each
 * response has a parser header-size limit, but there is no aggregate/wire-byte
 * quota for headers, TLS framing, DNS, or socket/kernel buffering. Byte limits
 * cover emitted HTTP 200 application-body chunks; timers are event-loop
 * deadlines and cannot preempt synchronous filesystem work or a stalled
 * JavaScript event loop.
 */
import { createHash } from 'node:crypto';
import {
  lstatSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { Agent, request as httpsRequest } from 'node:https';
import path from 'node:path';
import { types as utilTypes } from 'node:util';

import { requireExactPrivateDirectoryAuthority } from './posix-acl-authority.js';

const RAW_GIT_BLOB_HOSTNAME = 'raw.githubusercontent.com' as const;
const SHA1 = /^[0-9a-f]{40}$/u;
const GITHUB_SLUG = /^[0-9A-Za-z](?:[0-9A-Za-z._-]{0,99})$/u;
const MAX_GIT_PATH_CODE_UNITS = 16 * 1024;
const MAX_GIT_PATH_UTF8_BYTES = 64 * 1024;
const MAX_USER_AGENT_BYTES = 256;
const MAX_REFERENCE_COUNT = 10_000;
const MAX_CONCURRENCY = 32;
const MAX_ATTEMPTS = 8;
const MAX_BODY_BUDGET_BYTES = 512 * 1024 * 1024;
const MAX_EVENT_LOOP_DEADLINE_MS = 15 * 60_000;
const MAX_DATA_EVENTS = 1_000_000;

class RetryableRawGitBlobError extends Error {}

export interface PinnedRawGitBlobReference {
  readonly path: string;
  readonly gitBlobSha1: string;
}

export interface PinnedRawGitBlobRequestAuthority {
  readonly owner: string;
  readonly repository: string;
  readonly commit: string;
  readonly userAgent: string;
}

export interface PinnedRawGitBlobLimits {
  readonly expectedReferenceCount: number;
  readonly concurrency: number;
  readonly attempts: number;
  readonly blobByteLimit: number;
  readonly successfulByteLimit: number;
  readonly receivedBodyByteLimit: number;
  readonly idleTimeoutMs: number;
  readonly absoluteTimeoutMs: number;
  readonly globalTimeoutMs: number;
  readonly dataEventLimit: number;
  readonly retryDelayMs: readonly number[];
}

export interface PinnedRawGitBlobClock {
  readonly setTimeout: (callback: () => void, delayMs: number) => unknown;
  readonly clearTimeout: (handle: unknown) => void;
}

export interface PinnedRawGitBlobAgent {
  readonly destroy: () => void;
}

export interface PinnedRawGitBlobResponse {
  readonly statusCode: number | undefined;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly rawHeaders: readonly string[];
  readonly on: (
    event: 'data' | 'end' | 'error' | 'aborted' | 'close',
    listener: (...args: any[]) => void,
  ) => PinnedRawGitBlobResponse;
  readonly destroy: () => void;
}

export interface PinnedRawGitBlobRequest {
  readonly on: (
    event: 'error',
    listener: (error: unknown) => void,
  ) => PinnedRawGitBlobRequest;
  readonly destroy: (error?: Error) => void;
  readonly end: () => void;
}

export interface PinnedRawGitBlobRequestOptions {
  readonly agent: PinnedRawGitBlobAgent;
  readonly headers: Readonly<Record<string, string>>;
  readonly hostname: typeof RAW_GIT_BLOB_HOSTNAME;
  readonly maxHeaderSize: number;
  readonly method: 'GET';
  readonly path: string;
  readonly port: 443;
  readonly protocol: 'https:';
  readonly rejectUnauthorized: true;
  readonly signal: AbortSignal;
}

export interface PinnedRawGitBlobFileSystem {
  readonly verifyPrivateDirectory: (target: string) => string;
  readonly writeFile: (
    target: string,
    bytes: Buffer,
    options: { readonly flag: 'wx'; readonly mode: 0o600 },
  ) => void;
  readonly lstat: (target: string) => {
    readonly isFile: () => boolean;
    readonly isSymbolicLink: () => boolean;
    readonly uid: number;
    readonly mode: number;
    readonly nlink: number;
    readonly size: number;
  };
  readonly realpath: (target: string) => string;
}

export interface PinnedRawGitBlobBoundary {
  readonly limits: PinnedRawGitBlobLimits;
  readonly clock: PinnedRawGitBlobClock;
  readonly createAgent: (concurrency: number) => PinnedRawGitBlobAgent;
  readonly request: (
    options: PinnedRawGitBlobRequestOptions,
    onResponse: (response: PinnedRawGitBlobResponse) => void,
  ) => PinnedRawGitBlobRequest;
  readonly fileSystem: PinnedRawGitBlobFileSystem;
  readonly currentUid: number;
}

interface RawGitBlobBudget {
  successfulBytes: number;
  receivedBodyBytes: number;
  failure: Error | null;
}

interface RawGitBlobAcquisition {
  readonly budget: RawGitBlobBudget;
  readonly controller: AbortController;
  readonly activeRequests: Set<PinnedRawGitBlobRequest>;
  readonly agent: PinnedRawGitBlobAgent;
}

const PRODUCTION_RAW_GIT_BLOB_CLOCK: PinnedRawGitBlobClock = Object.freeze({
  setTimeout: (callback: () => void, delayMs: number) =>
    setTimeout(callback, delayMs),
  clearTimeout: (handle: unknown) => clearTimeout(
    handle as ReturnType<typeof setTimeout>,
  ),
});

const PRODUCTION_RAW_GIT_BLOB_FILE_SYSTEM: PinnedRawGitBlobFileSystem =
  Object.freeze({
    verifyPrivateDirectory: (target: string) =>
      requireExactPrivateDirectoryAuthority(
        target,
        'raw-source staging-directory authority',
      ).path,
    writeFile: (
      target: string,
      bytes: Buffer,
      options: { readonly flag: 'wx'; readonly mode: 0o600 },
    ) => writeFileSync(target, bytes, options),
    lstat: (target: string) => lstatSync(target),
    realpath: (target: string) => realpathSync(target),
  });

function safeDiagnostic(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu,
      '\uFFFD',
    )
    .slice(0, 2_000);
}

function rfc3986PathSegment(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/gu, (character) =>
    `%${character.codePointAt(0)!.toString(16).toUpperCase()}`);
}

function snapshotRequestAuthority(
  authority: PinnedRawGitBlobRequestAuthority,
): Readonly<PinnedRawGitBlobRequestAuthority> {
  if (
    authority === null ||
    typeof authority !== 'object' ||
    utilTypes.isProxy(authority) ||
    Array.isArray(authority) ||
    (Object.getPrototypeOf(authority) !== Object.prototype &&
      Object.getPrototypeOf(authority) !== null)
  ) {
    throw new Error('raw-source request authority is invalid');
  }
  const expectedKeys = ['commit', 'owner', 'repository', 'userAgent'] as const;
  const actualKeys = Reflect.ownKeys(authority);
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key) =>
      typeof key !== 'string' ||
      !(expectedKeys as readonly string[]).includes(key))
  ) {
    throw new Error('raw-source request authority is invalid');
  }
  const values = Object.create(null) as Record<(typeof expectedKeys)[number], string>;
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(authority, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, 'value') ||
      typeof descriptor.value !== 'string'
    ) {
      throw new Error('raw-source request authority is invalid');
    }
    values[key] = descriptor.value;
  }
  if (
    !GITHUB_SLUG.test(values.owner) ||
    !GITHUB_SLUG.test(values.repository) ||
    !SHA1.test(values.commit) ||
    values.userAgent.length === 0 ||
    values.userAgent.length > MAX_USER_AGENT_BYTES ||
    /[^\x21-\x7e]/u.test(values.userAgent) ||
    Buffer.byteLength(values.userAgent, 'ascii') > MAX_USER_AGENT_BYTES
  ) {
    throw new Error('raw-source request authority is invalid');
  }
  return Object.freeze({
    owner: values.owner,
    repository: values.repository,
    commit: values.commit,
    userAgent: values.userAgent,
  });
}

function validateReferencePath(referencePath: string): readonly string[] {
  if (
    typeof referencePath !== 'string' ||
    referencePath.length === 0 ||
    referencePath.length > MAX_GIT_PATH_CODE_UNITS ||
    referencePath.includes('\0') ||
    Buffer.byteLength(referencePath, 'utf8') > MAX_GIT_PATH_UTF8_BYTES ||
    path.posix.isAbsolute(referencePath) ||
    path.posix.normalize(referencePath) !== referencePath
  ) {
    throw new Error('raw-source reference has a non-canonical Git path');
  }
  const segments = referencePath.split('/');
  if (segments.some(
    (segment) => segment.length === 0 || segment === '.' || segment === '..',
  )) {
    throw new Error('raw-source reference has a non-canonical Git path');
  }
  return segments;
}

function requestPathFromSnapshots(
  reference: PinnedRawGitBlobReference,
  authority: PinnedRawGitBlobRequestAuthority,
): string {
  if (!SHA1.test(reference.gitBlobSha1)) {
    throw new Error('raw-source reference has an invalid Git blob identity');
  }
  const segments = validateReferencePath(reference.path);
  return [
    '',
    authority.owner,
    authority.repository,
    authority.commit,
    ...segments.map(rfc3986PathSegment),
  ].join('/');
}

export function pinnedRawGitBlobRequestPath(
  reference: PinnedRawGitBlobReference,
  authority: PinnedRawGitBlobRequestAuthority,
): string {
  return requestPathFromSnapshots(reference, snapshotRequestAuthority(authority));
}

function gitBlobSha1(bytes: Buffer): string {
  return createHash('sha1')
    .update(Buffer.from(`blob ${bytes.byteLength}\0`, 'ascii'))
    .update(bytes)
    .digest('hex');
}

function rawSourceError(
  error: unknown,
  reference: PinnedRawGitBlobReference,
): Error {
  if (error instanceof Error) return error;
  return new RetryableRawGitBlobError(
    `raw-source request failed for ${reference.gitBlobSha1}`,
  );
}

function waitForRawSourceRetry(
  attempt: number,
  signal: AbortSignal,
  budget: RawGitBlobBudget,
  boundary: PinnedRawGitBlobBoundary,
): Promise<void> {
  const delayMs = boundary.limits.retryDelayMs[attempt - 1];
  if (delayMs === undefined) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(budget.failure ?? new Error('raw-source acquisition was aborted'));
      return;
    }
    const onAbort = (): void => {
      boundary.clock.clearTimeout(timer);
      reject(budget.failure ?? new Error('raw-source acquisition was aborted'));
    };
    const timer = boundary.clock.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function closeRawSourceRequest(
  activeRequest: PinnedRawGitBlobRequest,
  error: Error,
): void {
  try {
    activeRequest.destroy(error);
  } catch {
    // Continue closing every request while preserving the first failure.
  }
}

function failRawSourceAcquisition(
  acquisition: RawGitBlobAcquisition,
  error: Error,
): Error {
  acquisition.budget.failure ??= error;
  const failure = acquisition.budget.failure;
  if (!acquisition.controller.signal.aborted) {
    acquisition.controller.abort(failure);
  }
  for (const activeRequest of [...acquisition.activeRequests]) {
    closeRawSourceRequest(activeRequest, failure);
  }
  try {
    acquisition.agent.destroy();
  } catch {
    // Individual request destruction above remains the primary abort path.
  }
  return failure;
}

function throwIfRawSourceAcquisitionFailed(
  acquisition: RawGitBlobAcquisition,
): void {
  if (acquisition.budget.failure !== null) throw acquisition.budget.failure;
  if (acquisition.controller.signal.aborted) {
    throw failRawSourceAcquisition(
      acquisition,
      new Error('raw-source acquisition was aborted'),
    );
  }
}

function fetchRawSourceBlob(
  reference: PinnedRawGitBlobReference,
  authority: PinnedRawGitBlobRequestAuthority,
  acquisition: RawGitBlobAcquisition,
  boundary: PinnedRawGitBlobBoundary,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let responseBodyBytes = 0;
    let responseDataEvents = 0;
    let responseEnded = false;
    let responseBody: Buffer | null = null;
    const requestPath = requestPathFromSnapshots(reference, authority);
    let clientRequest: PinnedRawGitBlobRequest | null = null;
    let response: PinnedRawGitBlobResponse | null = null;
    let absoluteTimer: unknown | null = null;
    let idleTimer: unknown | null = null;

    const clearRequestTimers = (): void => {
      if (absoluteTimer !== null) {
        boundary.clock.clearTimeout(absoluteTimer);
        absoluteTimer = null;
      }
      if (idleTimer !== null) {
        boundary.clock.clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const finish = (error: Error | null, bytes?: Buffer): void => {
      if (settled) return;
      settled = true;
      acquisition.controller.signal.removeEventListener(
        'abort',
        onAcquisitionAbort,
      );
      clearRequestTimers();
      if (clientRequest !== null) {
        acquisition.activeRequests.delete(clientRequest);
      }
      if (error !== null) {
        const retainedError = error instanceof RetryableRawGitBlobError
          ? error
          : failRawSourceAcquisition(acquisition, error);
        try {
          response?.destroy();
        } catch {
          // Preserve the request/acquisition failure.
        }
        if (clientRequest !== null) {
          closeRawSourceRequest(clientRequest, retainedError);
        }
        reject(retainedError);
      } else {
        resolve(bytes!);
      }
    };

    function onAcquisitionAbort(): void {
      finish(
        acquisition.budget.failure ??
          new Error('raw-source acquisition was aborted'),
      );
    }

    const armIdleTimer = (): void => {
      if (settled) return;
      if (idleTimer !== null) boundary.clock.clearTimeout(idleTimer);
      idleTimer = boundary.clock.setTimeout(() => {
        finish(new RetryableRawGitBlobError(
          `raw-source request became idle for ${reference.gitBlobSha1}`,
        ));
      }, boundary.limits.idleTimeoutMs);
    };

    acquisition.controller.signal.addEventListener(
      'abort',
      onAcquisitionAbort,
      { once: true },
    );
    if (acquisition.controller.signal.aborted) {
      onAcquisitionAbort();
      return;
    }

    try {
      absoluteTimer = boundary.clock.setTimeout(() => {
        finish(new RetryableRawGitBlobError(
          `raw-source request timed out for ${reference.gitBlobSha1}`,
        ));
      }, boundary.limits.absoluteTimeoutMs);
      armIdleTimer();
      const returnedRequest = boundary.request({
        agent: acquisition.agent,
        headers: {
          Accept: 'application/octet-stream',
          'Accept-Encoding': 'identity',
          'User-Agent': authority.userAgent,
        },
        hostname: RAW_GIT_BLOB_HOSTNAME,
        maxHeaderSize: 16 * 1024,
        method: 'GET',
        path: requestPath,
        port: 443,
        protocol: 'https:',
        rejectUnauthorized: true,
        signal: acquisition.controller.signal,
      }, (incoming) => {
        response = incoming;
        if (settled) {
          try {
            incoming.destroy();
          } catch {
            // The retained request failure remains authoritative.
          }
          return;
        }
        if (acquisition.budget.failure !== null) {
          finish(acquisition.budget.failure);
          return;
        }
        armIdleTimer();
        if (incoming.statusCode !== 200) {
          const status = incoming.statusCode ?? 0;
          finish(
            status === 408 || status === 425 || status === 429 ||
              (status >= 500 && status <= 599)
              ? new RetryableRawGitBlobError(
                `raw-source request returned HTTP ${status} for ${reference.gitBlobSha1}`,
              )
              : new Error(
                `raw-source request returned HTTP ${status} for ${reference.gitBlobSha1}`,
              ),
          );
          return;
        }
        const contentEncoding = incoming.headers['content-encoding'];
        if (contentEncoding !== undefined && contentEncoding !== 'identity') {
          finish(new Error(
            `raw-source response used an unsupported content encoding for ${reference.gitBlobSha1}`,
          ));
          return;
        }
        const contentLengthNames = incoming.rawHeaders.filter(
          (value, index) => index % 2 === 0 &&
            value.toLowerCase() === 'content-length',
        );
        if (contentLengthNames.length > 1) {
          finish(new Error(
            `raw-source response repeated content-length for ${reference.gitBlobSha1}`,
          ));
          return;
        }
        const transferEncodingNames = incoming.rawHeaders.filter(
          (value, index) => index % 2 === 0 &&
            value.toLowerCase() === 'transfer-encoding',
        );
        if (transferEncodingNames.length > 1) {
          finish(new Error(
            `raw-source response repeated transfer-encoding for ${reference.gitBlobSha1}`,
          ));
          return;
        }
        const transferEncoding = incoming.headers['transfer-encoding'];
        if (
          transferEncoding !== undefined &&
          transferEncoding !== 'chunked'
        ) {
          finish(new Error(
            `raw-source response used an unsupported transfer-encoding for ${reference.gitBlobSha1}`,
          ));
          return;
        }
        const contentLength = incoming.headers['content-length'];
        if (contentLength !== undefined && transferEncoding !== undefined) {
          finish(new Error(
            `raw-source response combined content-length and transfer-encoding for ${reference.gitBlobSha1}`,
          ));
          return;
        }
        if (contentLength !== undefined) {
          if (
            typeof contentLength !== 'string' ||
            !/^(?:0|[1-9][0-9]*)$/u.test(contentLength)
          ) {
            finish(new Error(
              `raw-source response has an invalid content-length for ${reference.gitBlobSha1}`,
            ));
            return;
          }
          const declaredLength = Number(contentLength);
          if (
            !Number.isSafeInteger(declaredLength) ||
            declaredLength > boundary.limits.blobByteLimit
          ) {
            finish(new Error(
              `raw-source response exceeds the per-blob byte limit for ${reference.gitBlobSha1}`,
            ));
            return;
          }
        }
        incoming.on('data', (chunk: Buffer | string) => {
          if (settled) return;
          if (acquisition.budget.failure !== null) {
            finish(acquisition.budget.failure);
            return;
          }
          responseDataEvents++;
          if (responseDataEvents > boundary.limits.dataEventLimit) {
            finish(new Error(
              `raw-source response exceeds the data-event limit for ${reference.gitBlobSha1}`,
            ));
            return;
          }
          if (!Buffer.isBuffer(chunk)) {
            finish(new Error(
              `raw-source response emitted non-binary data for ${reference.gitBlobSha1}`,
            ));
            return;
          }
          if (chunk.byteLength === 0) return;
          armIdleTimer();
          const bytes = chunk;
          if (
            bytes.byteLength > boundary.limits.receivedBodyByteLimit -
              acquisition.budget.receivedBodyBytes
          ) {
            const failure = failRawSourceAcquisition(
              acquisition,
              new Error('raw-source responses exceed the received-body byte limit'),
            );
            finish(failure);
            return;
          }
          acquisition.budget.receivedBodyBytes += bytes.byteLength;
          if (bytes.byteLength > boundary.limits.blobByteLimit - responseBodyBytes) {
            finish(new Error(
              `raw-source response exceeds the per-blob byte limit for ${reference.gitBlobSha1}`,
            ));
            return;
          }
          responseBodyBytes += bytes.byteLength;
          if (acquisition.budget.failure !== null) {
            finish(acquisition.budget.failure);
            return;
          }
          responseBody ??= Buffer.allocUnsafe(boundary.limits.blobByteLimit);
          bytes.copy(responseBody, responseBodyBytes - bytes.byteLength);
        });
        incoming.on('end', () => {
          if (settled) return;
          responseEnded = true;
          if (acquisition.budget.failure !== null) {
            finish(acquisition.budget.failure);
            return;
          }
          const bytes = responseBody === null
            ? Buffer.alloc(0)
            : Buffer.from(responseBody.subarray(0, responseBodyBytes));
          const declaredLength = incoming.headers['content-length'];
          if (
            declaredLength !== undefined &&
            Number(declaredLength) !== bytes.byteLength
          ) {
            finish(new RetryableRawGitBlobError(
              `raw-source response length drifted for ${reference.gitBlobSha1}`,
            ));
            return;
          }
          finish(null, bytes);
        });
        incoming.on('error', (error) => {
          finish(new RetryableRawGitBlobError(
            `raw-source response failed for ${reference.gitBlobSha1}: ${safeDiagnostic(error)}`,
          ));
        });
        incoming.on('aborted', () => {
          finish(new RetryableRawGitBlobError(
            `raw-source response was aborted for ${reference.gitBlobSha1}`,
          ));
        });
        incoming.on('close', () => {
          if (!responseEnded) {
            finish(new RetryableRawGitBlobError(
              `raw-source response closed before end for ${reference.gitBlobSha1}`,
            ));
          }
        });
      });
      clientRequest = returnedRequest;
      if (settled || acquisition.controller.signal.aborted) {
        closeRawSourceRequest(
          returnedRequest,
          acquisition.budget.failure ??
            new Error('raw-source request closed before handle publication'),
        );
        return;
      }
      acquisition.activeRequests.add(returnedRequest);
      returnedRequest.on('error', (error) => {
        finish(
          acquisition.controller.signal.aborted &&
            acquisition.budget.failure !== null
            ? acquisition.budget.failure
            : new RetryableRawGitBlobError(
              `raw-source request failed for ${reference.gitBlobSha1}: ${safeDiagnostic(error)}`,
            ),
        );
      });
      returnedRequest.end();
    } catch (error) {
      finish(new RetryableRawGitBlobError(
        `raw-source request construction failed for ${reference.gitBlobSha1}: ` +
          safeDiagnostic(error),
      ));
    }
  });
}

function validateBoundary(boundary: PinnedRawGitBlobBoundary): void {
  const { limits } = boundary;
  for (const [name, value] of Object.entries({
    expectedReferenceCount: limits.expectedReferenceCount,
    concurrency: limits.concurrency,
    attempts: limits.attempts,
    blobByteLimit: limits.blobByteLimit,
    successfulByteLimit: limits.successfulByteLimit,
    receivedBodyByteLimit: limits.receivedBodyByteLimit,
    idleTimeoutMs: limits.idleTimeoutMs,
    absoluteTimeoutMs: limits.absoluteTimeoutMs,
    globalTimeoutMs: limits.globalTimeoutMs,
    dataEventLimit: limits.dataEventLimit,
  })) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`raw-source ${name} must be a positive safe integer`);
    }
  }
  if (
    limits.expectedReferenceCount > MAX_REFERENCE_COUNT ||
    limits.concurrency > MAX_CONCURRENCY ||
    limits.concurrency > limits.expectedReferenceCount ||
    limits.attempts > MAX_ATTEMPTS ||
    limits.blobByteLimit > MAX_BODY_BUDGET_BYTES ||
    limits.successfulByteLimit > MAX_BODY_BUDGET_BYTES ||
    limits.receivedBodyByteLimit > MAX_BODY_BUDGET_BYTES ||
    limits.receivedBodyByteLimit < limits.successfulByteLimit ||
    limits.idleTimeoutMs > MAX_EVENT_LOOP_DEADLINE_MS ||
    limits.absoluteTimeoutMs > MAX_EVENT_LOOP_DEADLINE_MS ||
    limits.globalTimeoutMs > MAX_EVENT_LOOP_DEADLINE_MS ||
    limits.dataEventLimit > MAX_DATA_EVENTS
  ) {
    throw new Error('raw-source limits exceed the closed production bounds');
  }
  if (
    !Array.isArray(limits.retryDelayMs) ||
    utilTypes.isProxy(limits.retryDelayMs) ||
    Object.getPrototypeOf(limits.retryDelayMs) !== Array.prototype ||
    limits.retryDelayMs.length !== limits.attempts - 1
  ) {
    throw new Error('raw-source retry-delay schedule does not match attempt count');
  }
  for (let index = 0; index < limits.retryDelayMs.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(
      limits.retryDelayMs,
      String(index),
    );
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, 'value') ||
      !Number.isSafeInteger(descriptor.value) ||
      descriptor.value < 0 ||
      descriptor.value > MAX_EVENT_LOOP_DEADLINE_MS
    ) {
      throw new Error('raw-source retry delays must be non-negative safe integers');
    }
  }
  if (!Number.isSafeInteger(boundary.currentUid) || boundary.currentUid < 0) {
    throw new Error('raw-source staging requires a POSIX current UID');
  }
}

function snapshotReferences(
  references: readonly PinnedRawGitBlobReference[],
  expectedCount: number,
  authority: PinnedRawGitBlobRequestAuthority,
): readonly PinnedRawGitBlobReference[] {
  if (
    !Array.isArray(references) ||
    utilTypes.isProxy(references) ||
    Object.getPrototypeOf(references) !== Array.prototype ||
    references.length !== expectedCount
  ) {
    throw new Error('raw-source reference count differs from the pinned authority');
  }
  const arrayKeys = Reflect.ownKeys(references);
  if (
    arrayKeys.length !== expectedCount + 1 ||
    !arrayKeys.includes('length') ||
    Array.from({ length: expectedCount }, (_, index) => String(index)).some(
      (key) => !arrayKeys.includes(key),
    )
  ) {
    throw new Error('raw-source references must be one exact dense array');
  }
  const snapshot: PinnedRawGitBlobReference[] = [];
  const identities = new Set<string>();
  const paths = new Set<string>();
  for (let index = 0; index < references.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(references, String(index));
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, 'value')
    ) {
      throw new Error('raw-source references must contain own data records');
    }
    const reference = descriptor.value as unknown;
    if (
      reference === null ||
      typeof reference !== 'object' ||
      utilTypes.isProxy(reference) ||
      Array.isArray(reference) ||
      (Object.getPrototypeOf(reference) !== Object.prototype &&
        Object.getPrototypeOf(reference) !== null) ||
      Reflect.ownKeys(reference).length !== 2 ||
      !Reflect.ownKeys(reference).includes('path') ||
      !Reflect.ownKeys(reference).includes('gitBlobSha1')
    ) {
      throw new Error('raw-source references must contain own data records');
    }
    const pathDescriptor = Object.getOwnPropertyDescriptor(reference, 'path');
    const identityDescriptor = Object.getOwnPropertyDescriptor(
      reference,
      'gitBlobSha1',
    );
    if (
      pathDescriptor === undefined ||
      identityDescriptor === undefined ||
      !pathDescriptor.enumerable ||
      !identityDescriptor.enumerable ||
      !Object.hasOwn(pathDescriptor, 'value') ||
      !Object.hasOwn(identityDescriptor, 'value') ||
      typeof pathDescriptor.value !== 'string' ||
      typeof identityDescriptor.value !== 'string'
    ) {
      throw new Error('raw-source references must contain own data records');
    }
    const retained = Object.freeze({
      path: pathDescriptor.value,
      gitBlobSha1: identityDescriptor.value,
    });
    requestPathFromSnapshots(retained, authority);
    if (paths.has(retained.path) || identities.has(retained.gitBlobSha1)) {
      throw new Error('raw-source references must have unique paths and blob identities');
    }
    paths.add(retained.path);
    identities.add(retained.gitBlobSha1);
    snapshot.push(retained);
  }
  return Object.freeze(snapshot);
}

export async function downloadPinnedRawGitBlobsWithBoundary(
  references: readonly PinnedRawGitBlobReference[],
  stagingDirectory: string,
  authority: PinnedRawGitBlobRequestAuthority,
  boundary: PinnedRawGitBlobBoundary,
): Promise<readonly string[]> {
  const authoritySnapshot = snapshotRequestAuthority(authority);
  validateBoundary(boundary);
  if (
    typeof stagingDirectory !== 'string' ||
    stagingDirectory.length === 0 ||
    stagingDirectory.includes('\0') ||
    !path.isAbsolute(stagingDirectory) ||
    path.resolve(stagingDirectory) !== stagingDirectory ||
    Buffer.byteLength(stagingDirectory, 'utf8') > MAX_GIT_PATH_UTF8_BYTES
  ) {
    throw new Error('raw-source staging directory is not an exact absolute path');
  }
  const verifiedStagingDirectory =
    boundary.fileSystem.verifyPrivateDirectory(stagingDirectory);
  if (verifiedStagingDirectory !== stagingDirectory) {
    throw new Error('raw-source staging directory authority changed during resolution');
  }
  const referenceSnapshot = snapshotReferences(
    references,
    boundary.limits.expectedReferenceCount,
    authoritySnapshot,
  );
  const budget: RawGitBlobBudget = {
    successfulBytes: 0,
    receivedBodyBytes: 0,
    failure: null,
  };
  const controller = new AbortController();
  const agent = boundary.createAgent(boundary.limits.concurrency);
  const acquisition: RawGitBlobAcquisition = {
    budget,
    controller,
    activeRequests: new Set(),
    agent,
  };
  let globalTimer: unknown | null = null;
  try {
    globalTimer = boundary.clock.setTimeout(() => {
      failRawSourceAcquisition(
        acquisition,
        new Error('raw-source acquisition exceeded its global timeout'),
      );
    }, boundary.limits.globalTimeoutMs);
    const stagedPaths = new Array<string>(referenceSnapshot.length);
    let nextIndex = 0;

  const worker = async (): Promise<void> => {
    try {
      while (true) {
        throwIfRawSourceAcquisitionFailed(acquisition);
        const index = nextIndex++;
        if (index >= referenceSnapshot.length) return;
        const reference = referenceSnapshot[index]!;
        let bytes: Buffer | null = null;
        let finalTransportError: Error | null = null;
        for (let attempt = 1; attempt <= boundary.limits.attempts; attempt++) {
          try {
            bytes = await fetchRawSourceBlob(
              reference,
              authoritySnapshot,
              acquisition,
              boundary,
            );
            break;
          } catch (error) {
            const failure = rawSourceError(error, reference);
            if (
              !(failure instanceof RetryableRawGitBlobError) ||
              budget.failure !== null
            ) {
              throw budget.failure ?? failure;
            }
            finalTransportError = failure;
            if (attempt === boundary.limits.attempts) throw finalTransportError;
            await waitForRawSourceRetry(
              attempt,
              controller.signal,
              budget,
              boundary,
            );
          }
        }
        if (bytes === null) {
          throw finalTransportError ?? new Error('raw-source request failed');
        }
        throwIfRawSourceAcquisitionFailed(acquisition);
        if (gitBlobSha1(bytes) !== reference.gitBlobSha1) {
          throw new Error(
            `raw-source bytes do not match pinned Git blob ${reference.gitBlobSha1}`,
          );
        }
        throwIfRawSourceAcquisitionFailed(acquisition);
        if (
          bytes.byteLength >
            boundary.limits.successfulByteLimit - budget.successfulBytes
        ) {
          throw new Error('raw-source bytes exceed the successful-byte limit');
        }
        budget.successfulBytes += bytes.byteLength;
        throwIfRawSourceAcquisitionFailed(acquisition);
        const stagedPath = path.join(
          verifiedStagingDirectory,
          `${index.toString(10).padStart(4, '0')}.blob`,
        );
        boundary.fileSystem.writeFile(
          stagedPath,
          bytes,
          { flag: 'wx', mode: 0o600 },
        );
        const stat = boundary.fileSystem.lstat(stagedPath);
        if (
          !stat.isFile() ||
          stat.isSymbolicLink() ||
          boundary.fileSystem.realpath(stagedPath) !== stagedPath ||
          stat.uid !== boundary.currentUid ||
          (stat.mode & 0o7777) !== 0o600 ||
          stat.nlink !== 1 ||
          stat.size !== bytes.byteLength
        ) {
          throw new Error(
            `raw-source staging authority failed for ${reference.gitBlobSha1}`,
          );
        }
        throwIfRawSourceAcquisitionFailed(acquisition);
        stagedPaths[index] = stagedPath;
      }
    } catch (error) {
      throw failRawSourceAcquisition(
        acquisition,
        rawSourceError(error, referenceSnapshot[0]!),
      );
    }
  };

    const workers = Array.from(
      { length: Math.min(boundary.limits.concurrency, referenceSnapshot.length) },
      () => worker(),
    );
    const results = await Promise.allSettled(workers);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (budget.failure !== null) throw budget.failure;
    if (rejected !== undefined) {
      throw rawSourceError(rejected.reason, referenceSnapshot[0]!);
    }
    if (stagedPaths.some((entry) => entry === undefined)) {
      throw new Error('raw-source staging did not close every selected blob');
    }
    if (
      boundary.fileSystem.verifyPrivateDirectory(verifiedStagingDirectory) !==
        verifiedStagingDirectory
    ) {
      throw new Error('raw-source staging directory authority changed after download');
    }
    return Object.freeze(stagedPaths);
  } finally {
    if (globalTimer !== null) boundary.clock.clearTimeout(globalTimer);
    for (const activeRequest of [...acquisition.activeRequests]) {
      closeRawSourceRequest(
        activeRequest,
        budget.failure ?? new Error('raw-source acquisition closed'),
      );
    }
    acquisition.activeRequests.clear();
    let agentDestroyError: Error | null = null;
    try {
      agent.destroy();
    } catch (error) {
      agentDestroyError = new Error(
        'raw-source HTTPS agent cleanup is uncertain',
        { cause: error },
      );
    }
    if (agentDestroyError !== null) {
      if (budget.failure !== null) {
        throw new AggregateError(
          [budget.failure, agentDestroyError],
          'raw-source acquisition and HTTPS agent cleanup both failed',
          { cause: budget.failure },
        );
      }
      throw agentDestroyError;
    }
  }
}

export function productionPinnedRawGitBlobBoundary(
  limits: PinnedRawGitBlobLimits,
): PinnedRawGitBlobBoundary {
  const currentUid = process.getuid?.();
  if (currentUid === undefined) {
    throw new Error('raw-source staging requires a POSIX current UID');
  }
  return {
    limits,
    clock: PRODUCTION_RAW_GIT_BLOB_CLOCK,
    createAgent: (concurrency) => new Agent({
      keepAlive: true,
      maxFreeSockets: concurrency,
      maxSockets: concurrency,
      scheduling: 'fifo',
    }),
    request: (options, onResponse) => httpsRequest(
      options as import('node:https').RequestOptions,
      (incoming) => onResponse(
        incoming as unknown as PinnedRawGitBlobResponse,
      ),
    ) as unknown as PinnedRawGitBlobRequest,
    fileSystem: PRODUCTION_RAW_GIT_BLOB_FILE_SYSTEM,
    currentUid,
  };
}
