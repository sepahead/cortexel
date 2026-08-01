/**
 * Closed source strings for the reusable reviewed-POSIX command lifecycle.
 *
 * Production authority is deliberately asymmetric:
 *
 * - the outer synchronous caller never receives a PID or PGID;
 * - the supervisor owns one exclusive guardian-lease writer and never signals a
 *   process or process group;
 * - the guardian is a live POSIX session/process-group leader and is the only
 *   process that may address that group, exactly once, as `-process.pid`;
 * - a gated non-leader worker is the reviewed target's immediate parent.
 *
 * The guardian's intent frame plus its observed SIGKILL exit is accepted
 * cooperative lifecycle evidence under the reviewed-code boundary. It does not
 * prove group closure or signal origin. Deliberate guardian discovery/killing,
 * regrouping, detachment, or signal-authority changes require external
 * containment.
 */

export const REVIEWED_POSIX_COMMAND_RESULT_SCHEMA =
  'cortexel-reviewed-posix-command.v3' as const;
export const REVIEWED_POSIX_COMMAND_HANDSHAKE_SCHEMA =
  'cortexel-reviewed-posix-command-handshake.v1' as const;
export const REVIEWED_POSIX_TARGET_COMPLETION_SCHEMA =
  'cortexel-reviewed-posix-target-completion.v1' as const;
export const REVIEWED_POSIX_WORKER_READY_SCHEMA =
  'cortexel-reviewed-posix-worker-ready.v1' as const;
export const REVIEWED_POSIX_GUARDIAN_READY_SCHEMA =
  'cortexel-reviewed-posix-guardian-ready.v2' as const;
export const REVIEWED_POSIX_LIFETIME_AUTHORITY_SCHEMA =
  'cortexel-reviewed-posix-lifetime-authority.v1' as const;
export const REVIEWED_POSIX_GUARDIAN_SWEEP_INTENT_SCHEMA =
  'cortexel-reviewed-posix-guardian-sweep-intent.v1' as const;
export const REVIEWED_POSIX_COMMAND_TEST_HOOK_SCHEMA =
  'cortexel-reviewed-posix-command-test-hook.v1' as const;

export const REVIEWED_POSIX_SUPERVISOR_PAYLOAD_ENV =
  'CORTEXEL_REVIEWED_POSIX_SUPERVISOR_PAYLOAD' as const;
export const REVIEWED_POSIX_GUARDIAN_PAYLOAD_ENV =
  'CORTEXEL_REVIEWED_POSIX_GUARDIAN_PAYLOAD' as const;
export const REVIEWED_POSIX_WORKER_PAYLOAD_ENV =
  'CORTEXEL_REVIEWED_POSIX_WORKER_PAYLOAD' as const;
export const REVIEWED_POSIX_TEST_HOOK_ENV =
  'CORTEXEL_REVIEWED_POSIX_TRUSTED_COMMAND_TEST_HOOK' as const;
export const REVIEWED_POSIX_LIFETIME_AUTHORITY_ENV =
  'CORTEXEL_REVIEWED_POSIX_LIFETIME_AUTHORITY' as const;

export const REVIEWED_POSIX_ARM_TIMEOUT_MS = 5_000;
export const REVIEWED_POSIX_GATE_TIMEOUT_MS = 7_000;
export const REVIEWED_POSIX_SETTLEMENT_TIMEOUT_MS = 5_000;
export const REVIEWED_POSIX_PIPE_DRAIN_TIMEOUT_MS = 2_000;
export const REVIEWED_POSIX_TEST_HOOK_TIMEOUT_MS = 4_000;
export const REVIEWED_POSIX_SUPERVISOR_SCHEDULER_MARGIN_MS = 3_000;
export const REVIEWED_POSIX_SUPERVISOR_GRACE_MS =
  REVIEWED_POSIX_ARM_TIMEOUT_MS +
  REVIEWED_POSIX_SETTLEMENT_TIMEOUT_MS +
  REVIEWED_POSIX_PIPE_DRAIN_TIMEOUT_MS +
  REVIEWED_POSIX_TEST_HOOK_TIMEOUT_MS +
  REVIEWED_POSIX_SUPERVISOR_SCHEDULER_MARGIN_MS;

export const REVIEWED_POSIX_TARGET_WORKER_SOURCE = String.raw`'use strict';
const childProcess = require('node:child_process');
const fs = require('node:fs');
const payloadName = ${JSON.stringify(REVIEWED_POSIX_WORKER_PAYLOAD_ENV)};
const readySchema = ${JSON.stringify(REVIEWED_POSIX_WORKER_READY_SCHEMA)};
const completionSchema = ${JSON.stringify(REVIEWED_POSIX_TARGET_COMPLETION_SCHEMA)};
let payload;
try {
  payload = JSON.parse(process.env[payloadName] || 'null');
  const keys = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.keys(payload).sort()
    : [];
  if (
    JSON.stringify(keys) !== '["args","cwd","environment","hasStdin","targetExecutable"]' ||
    !Array.isArray(payload.args) ||
    typeof payload.cwd !== 'string' ||
    !payload.environment ||
    typeof payload.environment !== 'object' ||
    Array.isArray(payload.environment) ||
    typeof payload.hasStdin !== 'boolean' ||
    typeof payload.targetExecutable !== 'string'
  ) {
    throw new Error('invalid worker payload');
  }
} catch {
  process.exit(70);
}
delete process.env[payloadName];

let gate = '';
let started = false;
let published = false;
let target = null;
const gateTimer = setTimeout(() => process.exit(70), ${REVIEWED_POSIX_GATE_TIMEOUT_MS});
const publishCompletion = (status, signal, spawnError) => {
  if (published) return;
  const validStatus = Number.isInteger(status) && status >= 0 && status <= 255;
  const validSignal = typeof signal === 'string' && /^SIG[A-Z0-9]+$/.test(signal);
  const validSpawnError = spawnError === 'target_spawn_failed';
  if (Number(validStatus) + Number(validSignal) + Number(validSpawnError) !== 1) {
    process.exit(70);
  }
  published = true;
  const record = Buffer.from(JSON.stringify({
    schema: completionSchema,
    signal: validSignal ? signal : null,
    spawnError: validSpawnError ? spawnError : null,
    status: validStatus ? status : null,
  }) + '\n', 'utf8');
  try {
    if (record.length > 512 || fs.writeSync(3, record) !== record.length) {
      process.exit(70);
    }
  } catch {
    process.exit(70);
  }
  // Stay in the guardian's group until its terminal sweep. Exiting here would
  // let the immediate-parent PID become reusable before cleanup.
  setInterval(() => {}, 1000);
};
const startTarget = () => {
  if (started) process.exit(70);
  started = true;
  clearTimeout(gateTimer);
  try {
    target = childProcess.spawn(payload.targetExecutable, payload.args, {
      cwd: payload.cwd,
      detached: false,
      env: payload.environment,
      // Descriptor 4 is an outer-host-authored, unlinked, read-only input spool.
      // The reviewed control plane passes it through without reading it, and the
      // worker publishes it as target stdin only after the complete GO gate.
      stdio: [payload.hasStdin ? 4 : 'ignore', 'inherit', 'inherit'],
      windowsHide: true,
    });
  } catch {
    publishCompletion(null, null, 'target_spawn_failed');
    return;
  }
  target.once('error', () => publishCompletion(null, null, 'target_spawn_failed'));
  // stdout/stderr are inherited. The exit event, unlike close, cannot be pinned by a
  // descendant retaining those descriptors.
  target.once('exit', (status, signal) => publishCompletion(status, signal, null));
};
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  if (started) process.exit(70);
  gate += chunk;
  if (!'GO\n'.startsWith(gate)) process.exit(70);
  if (gate === 'GO\n') startTarget();
});
process.stdin.once('end', () => process.exit(70));
process.stdin.once('error', () => process.exit(70));
process.on('uncaughtException', () => process.exit(70));
process.on('unhandledRejection', () => process.exit(70));
const ready = Buffer.from(JSON.stringify({ schema: readySchema }) + '\n', 'utf8');
try {
  if (fs.writeSync(3, ready) !== ready.length) process.exit(70);
} catch {
  process.exit(70);
}
`;

export const REVIEWED_POSIX_GUARDIAN_SOURCE = String.raw`'use strict';
const childProcess = require('node:child_process');
const fs = require('node:fs');
const payloadName = ${JSON.stringify(REVIEWED_POSIX_GUARDIAN_PAYLOAD_ENV)};
const workerPayloadName = ${JSON.stringify(REVIEWED_POSIX_WORKER_PAYLOAD_ENV)};
const workerSource = ${JSON.stringify(REVIEWED_POSIX_TARGET_WORKER_SOURCE)};
const workerReadySchema = ${JSON.stringify(REVIEWED_POSIX_WORKER_READY_SCHEMA)};
const targetCompletionSchema = ${JSON.stringify(REVIEWED_POSIX_TARGET_COMPLETION_SCHEMA)};
const guardianReadySchema = ${JSON.stringify(REVIEWED_POSIX_GUARDIAN_READY_SCHEMA)};
const sweepIntentSchema = ${JSON.stringify(REVIEWED_POSIX_GUARDIAN_SWEEP_INTENT_SCHEMA)};
const lifetimeAuthoritySchema = ${JSON.stringify(REVIEWED_POSIX_LIFETIME_AUTHORITY_SCHEMA)};

let sweepStarted = false;
let worker = null;
let workerReady = false;
let readyPublished = false;
let goForwarded = false;
let gate = '';
let workerProtocol = Buffer.alloc(0);
let armTimer = null;
let gateTimer = null;

const normalizeLifetimeAuthority = (value) => {
  const keys = value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).sort()
    : [];
  const integerKeys = ['dev', 'gid', 'ino', 'mode', 'nlink', 'rdev', 'uid'];
  if (
    JSON.stringify(keys) !==
      '["dev","gid","ino","kind","mode","nlink","rdev","schema","uid"]' ||
    value.schema !== lifetimeAuthoritySchema ||
    !['fifo', 'socket'].includes(value.kind) ||
    integerKeys.some((key) =>
      typeof value[key] !== 'string' ||
      !/^(?:0|-?[1-9][0-9]*)$/.test(value[key]))
  ) {
    return null;
  }
  return {
    dev: value.dev,
    gid: value.gid,
    ino: value.ino,
    kind: value.kind,
    mode: value.mode,
    nlink: value.nlink,
    rdev: value.rdev,
    schema: lifetimeAuthoritySchema,
    uid: value.uid,
  };
};
const inspectLifetimeAuthority = (descriptor) => {
  const stat = fs.fstatSync(descriptor, { bigint: true });
  const fifo = stat.isFIFO();
  const socket = stat.isSocket();
  if (Number(fifo) + Number(socket) !== 1) {
    throw new Error('guardian lifetime descriptor is not a pipe endpoint');
  }
  return {
    dev: stat.dev.toString(),
    gid: stat.gid.toString(),
    ino: stat.ino.toString(),
    kind: fifo ? 'fifo' : 'socket',
    mode: stat.mode.toString(),
    nlink: stat.nlink.toString(),
    rdev: stat.rdev.toString(),
    schema: lifetimeAuthoritySchema,
    uid: stat.uid.toString(),
  };
};
const sameLifetimeAuthority = (left, right) =>
  left !== null && right !== null && JSON.stringify(left) === JSON.stringify(right);

const beginSweep = (reason, completion = null) => {
  if (sweepStarted) return;
  sweepStarted = true;
  clearTimeout(armTimer);
  clearTimeout(gateTimer);
  const intent = Buffer.from(JSON.stringify({
    completion,
    reason,
    schema: sweepIntentSchema,
  }) + '\n', 'utf8');
  try {
    if (intent.length <= 1024) fs.writeSync(3, intent);
  } catch {
    // EPIPE means the supervisor lease is already gone. It must never suppress
    // the live guardian's anchored self-sweep.
  } finally {
    try {
      process.kill(-process.pid, 'SIGKILL');
    } catch (error) {
      try {
        fs.writeSync(
          2,
          'reviewed Node guardian self-sweep failed: ' +
            String(error && error.code ? error.code : 'unknown') + '\n',
        );
      } catch {
        // Exit 70 remains the fail-closed terminal state.
      }
      process.exit(70);
    }
  }
  setInterval(() => {}, 1000);
};

// Install terminal-state handlers before consulting any fallible authority.
// Every failure below therefore converges on the same still-live, self-addressed
// group sweep; no parent ever has to address this PID or PGID.
process.stdin.once('end', () => beginSweep('supervisor_lease_closed'));
process.stdin.once('error', () => beginSweep('supervisor_lease_closed'));
for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  process.on(signal, () => beginSweep('guardian_signal'));
}
process.on('uncaughtException', () => beginSweep('guardian_exception'));
process.on('unhandledRejection', () => beginSweep('guardian_exception'));

const validCompletion = (value) => {
  const keys = value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).sort()
    : [];
  const validStatus = value && Number.isInteger(value.status) &&
    value.status >= 0 && value.status <= 255;
  const validSignal = value && typeof value.signal === 'string' &&
    /^SIG[A-Z0-9]+$/.test(value.signal);
  const validSpawnError = value && value.spawnError === 'target_spawn_failed';
  if (
    JSON.stringify(keys) !== '["schema","signal","spawnError","status"]' ||
    value.schema !== targetCompletionSchema ||
    Number(validStatus) + Number(validSignal) + Number(validSpawnError) !== 1
  ) {
    return null;
  }
  return {
    schema: targetCompletionSchema,
    signal: validSignal ? value.signal : null,
    spawnError: validSpawnError ? value.spawnError : null,
    status: validStatus ? value.status : null,
  };
};
const acceptWorkerFrame = (raw) => {
  let value;
  try {
    value = JSON.parse(raw.toString('utf8'));
  } catch {
    beginSweep('worker_protocol_error');
    return;
  }
  if (!workerReady) {
    const canonical = Buffer.from(JSON.stringify({ schema: workerReadySchema }) + '\n');
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      JSON.stringify(Object.keys(value).sort()) !== '["schema"]' ||
      value.schema !== workerReadySchema ||
      !raw.equals(canonical)
    ) {
      beginSweep('worker_protocol_error');
      return;
    }
    workerReady = true;
    readyPublished = true;
    clearTimeout(armTimer);
    const ready = Buffer.from(JSON.stringify({
      guardianPid: process.pid,
      lifetimeAuthority: payload.lifetimeAuthority,
      schema: guardianReadySchema,
      workerPid: worker.pid,
    }) + '\n', 'utf8');
    try {
      if (ready.length > 512 || fs.writeSync(3, ready) !== ready.length) {
        beginSweep('status_channel_error');
        return;
      }
    } catch {
      beginSweep('status_channel_error');
      return;
    }
    gateTimer = setTimeout(
      () => beginSweep('gate_timeout'),
      ${REVIEWED_POSIX_GATE_TIMEOUT_MS},
    );
    return;
  }
  if (!goForwarded) {
    beginSweep('worker_protocol_error');
    return;
  }
  const completion = validCompletion(value);
  if (completion === null) {
    beginSweep('worker_protocol_error');
    return;
  }
  const canonical = Buffer.from(JSON.stringify(completion) + '\n', 'utf8');
  if (!raw.equals(canonical)) {
    beginSweep('worker_protocol_error');
    return;
  }
  beginSweep('target_completion', completion);
};
const captureWorkerProtocol = (chunk) => {
  if (sweepStarted) return;
  workerProtocol = Buffer.concat([workerProtocol, chunk]);
  if (workerProtocol.length > 2048) {
    beginSweep('worker_protocol_error');
    return;
  }
  while (!sweepStarted) {
    const lineEnd = workerProtocol.indexOf(0x0a);
    if (lineEnd < 0) return;
    const frame = workerProtocol.subarray(0, lineEnd + 1);
    workerProtocol = workerProtocol.subarray(lineEnd + 1);
    acceptWorkerFrame(frame);
  }
};

// Install the exclusive supervisor-lease boundary before parsing or publishing.
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  if (sweepStarted) return;
  if (goForwarded) {
    beginSweep('invalid_control');
    return;
  }
  gate += chunk;
  if (!'GO\n'.startsWith(gate)) {
    beginSweep('invalid_control');
    return;
  }
  if (gate === 'GO\n') {
    if (!readyPublished || !worker || !worker.stdin) {
      beginSweep('invalid_control');
      return;
    }
    goForwarded = true;
    clearTimeout(gateTimer);
    worker.stdin.write('GO\n', (error) => {
      if (error) beginSweep('worker_control_error');
    });
  }
});
let payload;
try {
  payload = JSON.parse(process.env[payloadName] || 'null');
  const keys = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.keys(payload).sort()
    : [];
  if (
    JSON.stringify(keys) !==
      '["args","cwd","environment","hasStdin","lifetimeAuthority","targetExecutable"]' ||
    !Array.isArray(payload.args) ||
    typeof payload.cwd !== 'string' ||
    !payload.environment ||
    typeof payload.environment !== 'object' ||
    Array.isArray(payload.environment) ||
    typeof payload.hasStdin !== 'boolean' ||
    normalizeLifetimeAuthority(payload.lifetimeAuthority) === null ||
    typeof payload.targetExecutable !== 'string'
  ) {
    throw new Error('invalid guardian payload');
  }
} catch {
  beginSweep('invalid_payload');
}
delete process.env[payloadName];
if (!sweepStarted) {
  payload.lifetimeAuthority = normalizeLifetimeAuthority(payload.lifetimeAuthority);
  try {
    // The numeric slot is not authority: Node can reuse a closed inherited slot
    // for an internal FIFO/socket before this source runs. Bind the exact kernel
    // object sealed by the outer launcher and retained by the supervisor.
    const observedLifetime = inspectLifetimeAuthority(5);
    if (!sameLifetimeAuthority(payload.lifetimeAuthority, observedLifetime)) {
      throw new Error('guardian lifetime descriptor identity mismatch');
    }
  } catch {
    beginSweep('invalid_lifetime_channel');
  }
}
if (!sweepStarted) {
  const workerPayload = JSON.stringify({
    args: payload.args,
    cwd: payload.cwd,
    environment: payload.environment,
    hasStdin: payload.hasStdin,
    targetExecutable: payload.targetExecutable,
  });
  try {
    worker = childProcess.spawn(process.execPath, ['-e', workerSource], {
      cwd: payload.cwd,
      detached: false,
      env: { ...process.env, [workerPayloadName]: workerPayload },
      // Guardian descriptor 4 is a pass-through capability. Neither guardian nor
      // worker JavaScript reads it before the worker's exact GO frame.
      stdio: [
        'pipe',
        'inherit',
        'inherit',
        'pipe',
        payload.hasStdin ? 4 : 'ignore',
        // Never propagate the outer-held guardian lifetime descriptor to the
        // worker or target. A detached descendant therefore cannot pin it.
        'ignore',
      ],
      windowsHide: true,
    });
  } catch {
    beginSweep('worker_spawn_error');
  }
}
if (!sweepStarted && worker) {
  armTimer = setTimeout(
    () => beginSweep('worker_ready_timeout'),
    ${REVIEWED_POSIX_ARM_TIMEOUT_MS},
  );
  worker.stdio[3].on('data', captureWorkerProtocol);
  worker.stdio[3].once('end', () => {
    if (!sweepStarted) beginSweep('worker_protocol_eof');
  });
  worker.stdio[3].once('error', () => beginSweep('worker_protocol_error'));
  worker.once('error', () => beginSweep('worker_spawn_error'));
  worker.once('exit', () => beginSweep('worker_exit'));
}
`;

export const REVIEWED_POSIX_SUPERVISOR_SOURCE = String.raw`'use strict';
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const payloadName = ${JSON.stringify(REVIEWED_POSIX_SUPERVISOR_PAYLOAD_ENV)};
const guardianPayloadName = ${JSON.stringify(REVIEWED_POSIX_GUARDIAN_PAYLOAD_ENV)};
const testHookPayloadName = ${JSON.stringify(REVIEWED_POSIX_TEST_HOOK_ENV)};
const lifetimeAuthorityPayloadName = ${JSON.stringify(REVIEWED_POSIX_LIFETIME_AUTHORITY_ENV)};
const guardianSource = ${JSON.stringify(REVIEWED_POSIX_GUARDIAN_SOURCE)};
const resultSchema = ${JSON.stringify(REVIEWED_POSIX_COMMAND_RESULT_SCHEMA)};
const handshakeSchema = ${JSON.stringify(REVIEWED_POSIX_COMMAND_HANDSHAKE_SCHEMA)};
const guardianReadySchema = ${JSON.stringify(REVIEWED_POSIX_GUARDIAN_READY_SCHEMA)};
const sweepIntentSchema = ${JSON.stringify(REVIEWED_POSIX_GUARDIAN_SWEEP_INTENT_SCHEMA)};
const completionSchema = ${JSON.stringify(REVIEWED_POSIX_TARGET_COMPLETION_SCHEMA)};
const testHookSchema = ${JSON.stringify(REVIEWED_POSIX_COMMAND_TEST_HOOK_SCHEMA)};
const lifetimeAuthoritySchema = ${JSON.stringify(REVIEWED_POSIX_LIFETIME_AUTHORITY_SCHEMA)};

const normalizeLifetimeAuthority = (value) => {
  const keys = value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).sort()
    : [];
  const integerKeys = ['dev', 'gid', 'ino', 'mode', 'nlink', 'rdev', 'uid'];
  if (
    JSON.stringify(keys) !==
      '["dev","gid","ino","kind","mode","nlink","rdev","schema","uid"]' ||
    value.schema !== lifetimeAuthoritySchema ||
    !['fifo', 'socket'].includes(value.kind) ||
    integerKeys.some((key) =>
      typeof value[key] !== 'string' ||
      !/^(?:0|-?[1-9][0-9]*)$/.test(value[key]))
  ) {
    return null;
  }
  return {
    dev: value.dev,
    gid: value.gid,
    ino: value.ino,
    kind: value.kind,
    mode: value.mode,
    nlink: value.nlink,
    rdev: value.rdev,
    schema: lifetimeAuthoritySchema,
    uid: value.uid,
  };
};
const inspectLifetimeAuthority = (descriptor) => {
  const stat = fs.fstatSync(descriptor, { bigint: true });
  const fifo = stat.isFIFO();
  const socket = stat.isSocket();
  if (Number(fifo) + Number(socket) !== 1) {
    throw new Error('supervisor lifetime descriptor is not a pipe endpoint');
  }
  return {
    dev: stat.dev.toString(),
    gid: stat.gid.toString(),
    ino: stat.ino.toString(),
    kind: fifo ? 'fifo' : 'socket',
    mode: stat.mode.toString(),
    nlink: stat.nlink.toString(),
    rdev: stat.rdev.toString(),
    schema: lifetimeAuthoritySchema,
    uid: stat.uid.toString(),
  };
};
const sameLifetimeAuthority = (left, right) =>
  left !== null && right !== null && JSON.stringify(left) === JSON.stringify(right);

let payload;
let trustedTestHook = null;
let lifetimeAuthority = null;
try {
  payload = JSON.parse(process.env[payloadName] || 'null');
  const payloadKeys = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.keys(payload).sort()
    : [];
  if (
    JSON.stringify(payloadKeys) !==
      '["args","cwd","environment","hasStdin","outputLimitBytes","targetExecutable","timeoutMs"]' ||
    !Array.isArray(payload.args) ||
    typeof payload.cwd !== 'string' ||
    !payload.environment ||
    typeof payload.environment !== 'object' ||
    Array.isArray(payload.environment) ||
    typeof payload.hasStdin !== 'boolean' ||
    !Number.isSafeInteger(payload.outputLimitBytes) ||
    payload.outputLimitBytes < 1 ||
    typeof payload.targetExecutable !== 'string' ||
    !Number.isSafeInteger(payload.timeoutMs) ||
    payload.timeoutMs < 1
  ) {
    throw new Error('invalid supervisor payload');
  }
  const rawTestHook = process.env[testHookPayloadName];
  if (rawTestHook !== undefined) {
    trustedTestHook = JSON.parse(rawTestHook);
    const keys = trustedTestHook && typeof trustedTestHook === 'object' &&
      !Array.isArray(trustedTestHook) ? Object.keys(trustedTestHook).sort() : [];
    if (
      JSON.stringify(keys) !== '["phase","readyPath","schema"]' ||
      trustedTestHook.schema !== testHookSchema ||
      ![
        'worker-ready-before-handshake',
        'handshake-published-before-go',
        'go-sent',
        'guardian-swept-before-result',
      ].includes(trustedTestHook.phase) ||
      typeof trustedTestHook.readyPath !== 'string'
    ) {
      throw new Error('invalid trusted command test hook');
    }
  }
  lifetimeAuthority = normalizeLifetimeAuthority(
    JSON.parse(process.env[lifetimeAuthorityPayloadName] || 'null'),
  );
  if (
    lifetimeAuthority === null ||
    !sameLifetimeAuthority(lifetimeAuthority, inspectLifetimeAuthority(6))
  ) {
    throw new Error('invalid supervisor lifetime authority');
  }
} catch {
  fs.writeSync(1, JSON.stringify({
    guardianSweepIntentCount: 0,
    outputOverflow: false,
    schema: resultSchema,
    signal: null,
    spawnError: 'invalid supervisor payload',
    status: null,
    stderrBytes: 0,
    stderrSha256: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    stdoutBytes: 0,
    stdoutSha256: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    timedOut: false,
  }) + '\n');
  process.exit(0);
}
delete process.env[payloadName];
delete process.env[testHookPayloadName];
delete process.env[lifetimeAuthorityPayloadName];

const outputDescriptors = { stdout: 4, stderr: 5 };
const outputBytes = { stdout: 0, stderr: 0 };
const outputDigests = {
  stdout: crypto.createHash('sha256'),
  stderr: crypto.createHash('sha256'),
};
let capturedBytes = 0;
let outputOverflow = false;
let timedOut = false;
let hardStopCause = null;
let settled = false;
let handshakePublished = false;
let goSent = false;
let controlClosed = false;
let cancellationStarted = false;
let cancellationExitCode = null;
let protocolFailed = false;
let protocolFailureReason = null;
let guardian = null;
let guardianReady = null;
let guardianIntent = null;
let guardianProtocol = Buffer.alloc(0);
let guardianExited = false;
let guardianExitStatus = undefined;
let guardianExitSignal = undefined;
let guardianStdoutEnded = false;
let guardianStderrEnded = false;
let guardianProtocolEnded = false;
let commandTimer = null;
let settlementTimer = null;
let drainTimer = null;
let testHookTimer = null;
let finalizeGuardian = () => {};

const terminalFailure = (reason) => {
  try {
    fs.writeSync(2, 'reviewed Node supervisor protocol failure: ' + reason + '\n');
  } catch {
    // Exit 70 remains authoritative if the diagnostic descriptor is unavailable.
  }
  process.exit(70);
};
const clearTimers = () => {
  clearTimeout(commandTimer);
  clearTimeout(settlementTimer);
  clearTimeout(drainTimer);
  clearTimeout(testHookTimer);
};
const finish = (status, signal, spawnError, guardianSweepIntentCount) => {
  if (settled) return;
  settled = true;
  clearTimers();
  fs.writeSync(1, JSON.stringify({
    guardianSweepIntentCount,
    outputOverflow,
    schema: resultSchema,
    signal,
    spawnError,
    status,
    stderrBytes: outputBytes.stderr,
    stderrSha256: 'sha256:' + outputDigests.stderr.digest('hex'),
    stdoutBytes: outputBytes.stdout,
    stdoutSha256: 'sha256:' + outputDigests.stdout.digest('hex'),
    timedOut,
  }) + '\n');
  // The outer launcher's lease must not keep a completed supervisor alive.
  // Guardian death and stream drain have already been established here.
  process.stdin.destroy();
};
const closeSupervisorLease = () => {
  if (controlClosed || guardianExited || settled) return;
  controlClosed = true;
  if (guardian && guardian.stdin) {
    try {
      guardian.stdin.end();
    } catch {
      try {
        guardian.stdin.destroy();
      } catch {
        // Process exit also closes the supervisor's exclusive writer.
      }
    }
  }
  settlementTimer = setTimeout(() => {
    if (!guardianExited && !settled) terminalFailure('guardian exit timeout');
  }, ${REVIEWED_POSIX_SETTLEMENT_TIMEOUT_MS});
};
// Node serializes these callbacks on one event loop. Latch the first hard-stop
// observation and freeze output capture at that boundary: a timeout can never
// later become an overflow (or vice versa) while guardian shutdown is pending.
const requestHardStop = (cause) => {
  if (
    hardStopCause !== null || settled || guardianExited || controlClosed ||
    protocolFailed || cancellationStarted
  ) {
    return;
  }
  hardStopCause = cause;
  timedOut = cause === 'timeout';
  outputOverflow = cause === 'output_overflow';
  clearTimeout(commandTimer);
  closeSupervisorLease();
};
const failProtocol = (reason = 'unspecified protocol error') => {
  if (protocolFailed) return;
  protocolFailed = true;
  protocolFailureReason = reason;
  closeSupervisorLease();
};
const cancelSupervisor = (exitCode) => {
  if (cancellationStarted) return;
  if (settled) {
    process.exit(exitCode);
    return;
  }
  cancellationStarted = true;
  cancellationExitCode = exitCode;
  clearTimeout(commandTimer);
  clearTimeout(testHookTimer);
  if (guardianExited) {
    finalizeGuardian();
    return;
  }
  closeSupervisorLease();
};
// The exact outer launcher owns this additional supervisor-lifetime lease. If
// the launcher is killed by its synchronous caller, EOF forces cancellation;
// unref keeps an otherwise completed supervisor from waiting on an open lease.
process.stdin.once('end', () => cancelSupervisor(70));
process.stdin.once('error', () => cancelSupervisor(70));
process.stdin.on('data', () => cancelSupervisor(70));
if (typeof process.stdin.unref === 'function') process.stdin.unref();
for (const [signal, exitCode] of [['SIGTERM', 143], ['SIGINT', 130], ['SIGHUP', 129]]) {
  process.on(signal, () => cancelSupervisor(exitCode));
}
process.on('uncaughtException', () => cancelSupervisor(70));
process.on('unhandledRejection', () => cancelSupervisor(70));

const capture = (stream) => (chunk) => {
  if (settled || hardStopCause !== null || controlClosed) return;
  const remaining = payload.outputLimitBytes - capturedBytes;
  const admitted = chunk.length > remaining ? chunk.subarray(0, Math.max(remaining, 0)) : chunk;
  let offset = 0;
  while (offset < admitted.length) {
    const written = fs.writeSync(
      outputDescriptors[stream],
      admitted,
      offset,
      admitted.length - offset,
    );
    if (written <= 0) throw new Error('reviewed output spool made no forward progress');
    offset += written;
  }
  if (admitted.length > 0) {
    outputDigests[stream].update(admitted);
    outputBytes[stream] += admitted.length;
    capturedBytes += admitted.length;
  }
  if (chunk.length > remaining) {
    requestHardStop('output_overflow');
    return;
  }
};
const validCompletion = (value) => {
  const keys = value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).sort()
    : [];
  const validStatus = value && Number.isInteger(value.status) &&
    value.status >= 0 && value.status <= 255;
  const validSignal = value && typeof value.signal === 'string' &&
    /^SIG[A-Z0-9]+$/.test(value.signal);
  const validSpawnError = value && value.spawnError === 'target_spawn_failed';
  if (
    JSON.stringify(keys) !== '["schema","signal","spawnError","status"]' ||
    value.schema !== completionSchema ||
    Number(validStatus) + Number(validSignal) + Number(validSpawnError) !== 1
  ) {
    return null;
  }
  return {
    schema: completionSchema,
    signal: validSignal ? value.signal : null,
    spawnError: validSpawnError ? value.spawnError : null,
    status: validStatus ? value.status : null,
  };
};
const publishTestHookAtomically = (ready) => {
  const finalPath = trustedTestHook.readyPath;
  const stagedPath =
    finalPath + '.stage-' + process.pid + '-' + require('node:crypto').randomBytes(16).toString('hex');
  let staged = false;
  try {
    // The final name is the synchronization boundary. Never expose it while its
    // JSON frame is only partly written: create and close a private sibling, then
    // publish with link(2), whose EEXIST behavior also preserves no-overwrite.
    fs.writeFileSync(stagedPath, JSON.stringify(ready) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    staged = true;
    fs.linkSync(stagedPath, finalPath);
  } finally {
    if (staged) {
      try {
        fs.unlinkSync(stagedPath);
      } catch {
        // This is a trusted test hook, not production cleanup authority. A stale,
        // uniquely named staging inode cannot become the published READY frame.
      }
    }
  }
};
const stopAtReadyHook = (phase) => {
  if (!trustedTestHook || trustedTestHook.phase !== phase) return false;
  const ready = phase === 'guardian-swept-before-result'
    ? {
        phase,
        schema: testHookSchema,
        supervisorPid: process.pid,
      }
    : {
        guardianPid: guardianReady.guardianPid,
        phase,
        schema: testHookSchema,
        supervisorPid: process.pid,
        workerPid: guardianReady.workerPid,
      };
  publishTestHookAtomically(ready);
  testHookTimer = setTimeout(
    () => cancelSupervisor(70),
    ${REVIEWED_POSIX_TEST_HOOK_TIMEOUT_MS},
  );
  return true;
};
const publishGoSentHook = () => {
  if (!trustedTestHook || trustedTestHook.phase !== 'go-sent') return;
  publishTestHookAtomically({
    guardianPid: guardianReady.guardianPid,
    phase: 'go-sent',
    schema: testHookSchema,
    supervisorPid: process.pid,
    workerPid: guardianReady.workerPid,
  });
};
const publishHandshakeAndGo = () => {
  if (handshakePublished || !guardianReady || protocolFailed) {
    failProtocol();
    return;
  }
  if (stopAtReadyHook('worker-ready-before-handshake')) return;
  const handshake = Buffer.from(JSON.stringify({
    guardianArmed: true,
    schema: handshakeSchema,
  }) + '\n', 'utf8');
  if (fs.writeSync(1, handshake) !== handshake.length) {
    failProtocol();
    return;
  }
  handshakePublished = true;
  if (stopAtReadyHook('handshake-published-before-go')) return;
  goSent = true;
  clearTimeout(commandTimer);
  commandTimer = setTimeout(() => {
    if (guardianExited || settled) return;
    requestHardStop('timeout');
  }, payload.timeoutMs);
  guardian.stdin.write('GO\n', (error) => {
    if (error) {
      failProtocol();
      return;
    }
    publishGoSentHook();
  });
};
const acceptGuardianFrame = (raw) => {
  let value;
  try {
    value = JSON.parse(raw.toString('utf8'));
  } catch {
    failProtocol('guardian frame is not JSON');
    return;
  }
  if (guardianReady === null) {
    const keys = value && typeof value === 'object' && !Array.isArray(value)
      ? Object.keys(value).sort()
      : [];
    const normalized = value && {
      guardianPid: value.guardianPid,
      lifetimeAuthority: normalizeLifetimeAuthority(value.lifetimeAuthority),
      schema: value.schema,
      workerPid: value.workerPid,
    };
    const canonical = Buffer.from(JSON.stringify(normalized) + '\n', 'utf8');
    if (
      JSON.stringify(keys) !==
        '["guardianPid","lifetimeAuthority","schema","workerPid"]' ||
      value.schema !== guardianReadySchema ||
      !Number.isSafeInteger(value.guardianPid) ||
      value.guardianPid !== guardian.pid ||
      !Number.isSafeInteger(value.workerPid) ||
      value.workerPid <= 1 ||
      !sameLifetimeAuthority(normalized.lifetimeAuthority, lifetimeAuthority) ||
      !raw.equals(canonical)
    ) {
      const failedPredicates = [
        JSON.stringify(keys) ===
          '["guardianPid","lifetimeAuthority","schema","workerPid"]'
          ? null : 'exact_keys',
        value && value.schema === guardianReadySchema ? null : 'schema',
        value && Number.isSafeInteger(value.guardianPid) ? null : 'guardian_integer',
        value && value.guardianPid === guardian.pid ? null : 'guardian_spawn_binding',
        value && Number.isSafeInteger(value.workerPid) && value.workerPid > 1
          ? null : 'worker_integer_domain',
        sameLifetimeAuthority(normalized.lifetimeAuthority, lifetimeAuthority)
          ? null : 'lifetime_authority',
        raw.equals(canonical) ? null : 'canonical_frame',
      ].filter((predicate) => predicate !== null);
      failProtocol(
        'guardian READY frame failed closed predicates: ' +
          failedPredicates.join(','),
      );
      return;
    }
    try {
      if (!sameLifetimeAuthority(lifetimeAuthority, inspectLifetimeAuthority(6))) {
        throw new Error('supervisor lifetime descriptor identity changed');
      }
      // Close exactly once only after the guardian has echoed the bound identity
      // and the retained supervisor endpoint still names that same kernel object.
      // A close exception is ambiguous; never retry or address the numeric slot.
      fs.closeSync(6);
    } catch {
      failProtocol('guardian lifetime descriptor revalidation/close failed');
      return;
    }
    guardianReady = normalized;
    publishHandshakeAndGo();
    return;
  }
  if (guardianIntent !== null) {
    failProtocol('guardian emitted more than one sweep intent');
    return;
  }
  const keys = value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).sort()
    : [];
  const allowedReasons = [
    'gate_timeout',
    'guardian_exception',
    'guardian_signal',
    'invalid_control',
    'invalid_lifetime_channel',
    'invalid_payload',
    'status_channel_error',
    'supervisor_lease_closed',
    'target_completion',
    'worker_control_error',
    'worker_exit',
    'worker_protocol_eof',
    'worker_protocol_error',
    'worker_ready_timeout',
    'worker_spawn_error',
  ];
  const completion = value && value.completion === null
    ? null
    : validCompletion(value && value.completion);
  const normalized = value && {
    completion,
    reason: value.reason,
    schema: value.schema,
  };
  const canonical = Buffer.from(JSON.stringify(normalized) + '\n', 'utf8');
  if (
    JSON.stringify(keys) !== '["completion","reason","schema"]' ||
    value.schema !== sweepIntentSchema ||
    !allowedReasons.includes(value.reason) ||
    (value.completion !== null && completion === null) ||
    (value.reason === 'target_completion') !== (completion !== null) ||
    !raw.equals(canonical)
  ) {
    failProtocol('guardian sweep-intent frame is invalid');
    return;
  }
  guardianIntent = normalized;
  clearTimeout(commandTimer);
};
const captureGuardianProtocol = (chunk) => {
  if (settled) return;
  guardianProtocol = Buffer.concat([guardianProtocol, chunk]);
  if (guardianProtocol.length > 4096) {
    failProtocol('guardian protocol exceeded its byte bound');
    return;
  }
  while (!protocolFailed) {
    const lineEnd = guardianProtocol.indexOf(0x0a);
    if (lineEnd < 0) return;
    const frame = guardianProtocol.subarray(0, lineEnd + 1);
    guardianProtocol = guardianProtocol.subarray(lineEnd + 1);
    acceptGuardianFrame(frame);
  }
};

const guardianPayload = JSON.stringify({
  args: payload.args,
  cwd: payload.cwd,
  environment: payload.environment,
  hasStdin: payload.hasStdin,
  lifetimeAuthority,
  targetExecutable: payload.targetExecutable,
});
try {
  guardian = childProcess.spawn(process.execPath, ['-e', guardianSource], {
    cwd: payload.cwd,
    // POSIX Node documents detached children as leaders of a new session and
    // process group. Successful sweeping requires that contract. If it were to
    // fail silently, a still-live process PID cannot concurrently identify an
    // unrelated extant PGID/SID; kill(-selfPID) therefore fails closed rather
    // than aliasing another group. The non-detached regression exercises this.
    detached: true,
    env: { ...process.env, [guardianPayloadName]: guardianPayload },
    // Descriptor 3 is the outer host's input spool; guardian descriptor 4 merely
    // propagates it toward the gated worker without exposing it as control stdin.
    stdio: [
      'pipe',
      'pipe',
      'pipe',
      'pipe',
      payload.hasStdin ? 3 : 'ignore',
      // Supervisor descriptor 6 is the exact outer-host pipe identity. Retain it
      // through the guardian's bound READY frame, recheck it, then close it once;
      // the guardian alone retains the write capability during target execution.
      6,
    ],
    windowsHide: true,
  });
} catch {
  guardian = null;
}
if (!guardian || !Number.isSafeInteger(guardian.pid)) {
  finish(null, null, 'reviewed Node guardian could not be spawned', 0);
} else {
  // Arming has its own bounded control-plane deadline. The caller-selected
  // command timeout begins only after the exact GO frame is sent.
  commandTimer = setTimeout(() => {
    if (guardianExited || settled) return;
    requestHardStop('timeout');
  }, ${REVIEWED_POSIX_ARM_TIMEOUT_MS});
  guardian.stdout.on('data', capture('stdout'));
  guardian.stderr.on('data', capture('stderr'));
  guardian.stdio[3].on('data', captureGuardianProtocol);
  const streamsDrained = () =>
    guardianStdoutEnded && guardianStderrEnded && guardianProtocolEnded;
  finalizeGuardian = () => {
    if (!guardianExited || !streamsDrained() || settled) return;
    clearTimeout(drainTimer);
    if (
      protocolFailed ||
      guardianExitStatus !== null ||
      guardianExitSignal !== 'SIGKILL' ||
      guardianIntent === null ||
      guardianProtocol.length !== 0
    ) {
      terminalFailure(
        'invalid guardian terminal state ' +
          JSON.stringify({
            guardianIntent: guardianIntent !== null,
            protocolFailed,
            protocolFailureReason,
            remainingProtocolBytes: guardianProtocol.length,
            signal: guardianExitSignal,
            status: guardianExitStatus,
          }),
      );
      return;
    }
    if (cancellationStarted) {
      process.exit(cancellationExitCode === null ? 70 : cancellationExitCode);
      return;
    }
    if (stopAtReadyHook('guardian-swept-before-result')) return;
    if (timedOut || outputOverflow) {
      finish(null, 'SIGKILL', null, 1);
      return;
    }
    if (!handshakePublished || !goSent || guardianIntent.reason !== 'target_completion') {
      terminalFailure('guardian swept without an accepted target completion');
      return;
    }
    const completion = guardianIntent.completion;
    if (completion.spawnError !== null) {
      finish(null, null, completion.spawnError, 1);
      return;
    }
    finish(completion.status, completion.signal, null, 1);
  };
  guardian.stdout.once('end', () => {
    guardianStdoutEnded = true;
    finalizeGuardian();
  });
  guardian.stdout.once('error', () => failProtocol('guardian stdout read error'));
  guardian.stderr.once('end', () => {
    guardianStderrEnded = true;
    finalizeGuardian();
  });
  guardian.stderr.once('error', () => failProtocol('guardian stderr read error'));
  guardian.stdio[3].once('end', () => {
    if (guardianProtocol.length !== 0) {
      failProtocol('guardian protocol ended with a partial frame');
    }
    guardianProtocolEnded = true;
    finalizeGuardian();
  });
  guardian.stdio[3].once('error', failProtocol);
  guardian.once('error', failProtocol);
  guardian.once('exit', (status, signal) => {
    guardianExited = true;
    guardianExitStatus = status;
    guardianExitSignal = signal;
    clearTimeout(commandTimer);
    clearTimeout(settlementTimer);
    if (!streamsDrained()) {
      drainTimer = setTimeout(() => {
        if (!settled && !streamsDrained()) {
          guardian.stdout.destroy();
          guardian.stderr.destroy();
          guardian.stdio[3].destroy();
          terminalFailure('guardian pipes did not reach bounded EOF after exit');
        }
      }, ${REVIEWED_POSIX_PIPE_DRAIN_TIMEOUT_MS});
    }
    finalizeGuardian();
  });
}
`;

/**
 * Exact-Node adapter around the asynchronous supervisor.
 *
 * The launcher's stdout is both the outer caller's ordinary protocol pipe and
 * the guardian's exclusive lifetime capability. The supervisor passes a
 * duplicate straight to the guardian and closes its own copy. Thus even a
 * runtime such as Bun that does not expose fd>2 spawnSync output cannot return
 * until both launcher and guardian close this standard stdout endpoint.
 */
export const REVIEWED_POSIX_OUTER_LAUNCHER_SOURCE = String.raw`'use strict';
const childProcess = require('node:child_process');
const fs = require('node:fs');
const supervisorSource = ${JSON.stringify(REVIEWED_POSIX_SUPERVISOR_SOURCE)};
const supervisorPayloadName = ${JSON.stringify(REVIEWED_POSIX_SUPERVISOR_PAYLOAD_ENV)};
const lifetimeAuthorityPayloadName = ${JSON.stringify(REVIEWED_POSIX_LIFETIME_AUTHORITY_ENV)};
const lifetimeAuthoritySchema = ${JSON.stringify(REVIEWED_POSIX_LIFETIME_AUTHORITY_SCHEMA)};
const protocolLimit = 65536;
let supervisor = null;
let stdoutBytes = 0;
let stderrBytes = 0;
let stdoutChunks = [];
let stderrChunks = [];
let overflow = false;
let completed = false;
let outerLifetimeAuthority = null;

const inspectLifetimeAuthority = (descriptor) => {
  const stat = fs.fstatSync(descriptor, { bigint: true });
  const fifo = stat.isFIFO();
  const socket = stat.isSocket();
  if (Number(fifo) + Number(socket) !== 1) {
    throw new Error('outer lifetime descriptor is not a pipe endpoint');
  }
  return {
    dev: stat.dev.toString(),
    gid: stat.gid.toString(),
    ino: stat.ino.toString(),
    kind: fifo ? 'fifo' : 'socket',
    mode: stat.mode.toString(),
    nlink: stat.nlink.toString(),
    rdev: stat.rdev.toString(),
    schema: lifetimeAuthoritySchema,
    uid: stat.uid.toString(),
  };
};
const sameLifetimeAuthority = (left, right) =>
  left !== null && right !== null && JSON.stringify(left) === JSON.stringify(right);

const cancel = () => {
  if (!supervisor || !supervisor.stdin || supervisor.stdin.destroyed) return;
  try {
    supervisor.stdin.end();
  } catch {
    try { supervisor.stdin.destroy(); } catch {}
  }
};
const capture = (channel) => (chunk) => {
  const current = channel === 'stdout' ? stdoutBytes : stderrBytes;
  const remaining = Math.max(protocolLimit - current, 0);
  const admitted = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
  if (admitted.length > 0) {
    if (channel === 'stdout') {
      stdoutChunks.push(admitted);
      stdoutBytes += admitted.length;
    } else {
      stderrChunks.push(admitted);
      stderrBytes += admitted.length;
    }
  }
  if (chunk.length > remaining) {
    overflow = true;
    cancel();
  }
};
const writeAll = (descriptor, chunks) => {
  for (const chunk of chunks) {
    let offset = 0;
    while (offset < chunk.length) {
      const count = fs.writeSync(descriptor, chunk, offset, chunk.length - offset);
      if (count <= 0) throw new Error('outer launcher protocol write made no progress');
      offset += count;
    }
  }
};
const failureKind = (error) => {
  const candidate = error && (error.code || error.name);
  return typeof candidate === 'string' && /^[A-Za-z0-9_]+$/.test(candidate)
    ? candidate.slice(0, 64)
    : 'unknown';
};
const failClosed = (reason = 'unknown') => {
  if (completed) return;
  completed = true;
  cancel();
  try {
    fs.writeSync(
      2,
      'reviewed POSIX outer launcher failed closed (' + String(reason).slice(0, 96) + ')\n',
    );
  } catch {}
  process.exitCode = 70;
};
process.on('uncaughtException', (error) => failClosed('uncaught_' + failureKind(error)));
process.on('unhandledRejection', (error) => failClosed('rejection_' + failureKind(error)));

try {
  const outerPayload = JSON.parse(process.env[supervisorPayloadName] || 'null');
  if (!outerPayload || typeof outerPayload.hasStdin !== 'boolean') {
    throw new Error('invalid outer payload');
  }
  outerLifetimeAuthority = inspectLifetimeAuthority(1);
  supervisor = childProcess.spawn(process.execPath, ['-e', supervisorSource], {
    cwd: process.cwd(),
    detached: false,
    env: {
      ...process.env,
      [lifetimeAuthorityPayloadName]: JSON.stringify(outerLifetimeAuthority),
    },
    // fd0 is a launcher-lifetime lease. fd1/fd2 are bounded protocol pipes.
    // fds3-5 are opaque host spool capabilities. fd6 duplicates this launcher's
    // standard stdout directly into the guardian lifetime chain.
    // Node closes an additional host stdio slot declared as "ignore", whereas
    // Bun currently materializes it. Forward numeric fd 3 only when the sealed
    // payload declares an input spool; otherwise create an ignored supervisor
    // slot and never address the outer process's intentionally absent fd 3.
    stdio: ['pipe', 'pipe', 'pipe', outerPayload.hasStdin ? 3 : 'ignore', 4, 5, 1],
    windowsHide: true,
  });
} catch (error) {
  failClosed('supervisor_spawn_' + failureKind(error));
}
if (supervisor) {
  // A fast supervisor can close its stdin before the outer launcher observes
  // child close. Node may surface that ordinary writer-end teardown as EPIPE or
  // ECONNRESET even though this launcher never writes command data. Do not let
  // an unhandled stream error overwrite the supervisor's terminal status. If
  // the endpoint is lost early, its EOF is itself the supervisor cancellation
  // lease and the supervisor must still exit nonzero.
  supervisor.stdin.on('error', () => {});
  supervisor.stdout.on('data', capture('stdout'));
  supervisor.stderr.on('data', capture('stderr'));
  supervisor.once('error', (error) => failClosed('supervisor_' + failureKind(error)));
  supervisor.once('close', (status, signal) => {
    if (completed) return;
    let lifetimeStable = false;
    try {
      lifetimeStable = sameLifetimeAuthority(
        outerLifetimeAuthority,
        inspectLifetimeAuthority(1),
      );
    } catch {
      lifetimeStable = false;
    }
    if (!lifetimeStable) {
      completed = true;
      try {
        fs.writeSync(2, 'reviewed POSIX outer lifetime authority changed\n');
      } catch {}
      process.exitCode = 70;
      return;
    }
    completed = true;
    const clean = !overflow && status === 0 && signal === null;
    try {
      writeAll(1, stdoutChunks);
      writeAll(2, stderrChunks);
      if (!clean && stderrChunks.length === 0) {
        const diagnostic = Buffer.from(
          'reviewed POSIX outer launcher observed supervisor failure ' +
            '(status ' + String(status) + ', signal ' + String(signal) + ')\n',
          'utf8',
        );
        writeAll(2, [diagnostic]);
      }
    } catch {
      process.exitCode = 70;
      return;
    }
    process.exitCode = clean ? 0 : 70;
  });
}
`;
