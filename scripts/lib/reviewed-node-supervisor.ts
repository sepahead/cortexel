/**
 * Closed source strings for the package-smoke reviewed-Node lifecycle.
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

export const REVIEWED_NODE_COMMAND_RESULT_SCHEMA =
  'cortexel-package-smoke-command.v2' as const;
export const REVIEWED_NODE_COMMAND_HANDSHAKE_SCHEMA =
  'cortexel-package-smoke-command-handshake.v2' as const;
export const REVIEWED_NODE_TARGET_COMPLETION_SCHEMA =
  'cortexel-package-smoke-target-completion.v2' as const;
export const REVIEWED_NODE_WORKER_READY_SCHEMA =
  'cortexel-package-smoke-worker-ready.v1' as const;
export const REVIEWED_NODE_GUARDIAN_READY_SCHEMA =
  'cortexel-package-smoke-guardian-ready.v1' as const;
export const REVIEWED_NODE_GUARDIAN_SWEEP_INTENT_SCHEMA =
  'cortexel-package-smoke-guardian-sweep-intent.v1' as const;
export const REVIEWED_NODE_COMMAND_TEST_HOOK_SCHEMA =
  'cortexel-package-smoke-command-test-hook.v2' as const;

export const REVIEWED_NODE_SUPERVISOR_PAYLOAD_ENV =
  'CORTEXEL_PACKAGE_SMOKE_SUPERVISOR_PAYLOAD' as const;
export const REVIEWED_NODE_GUARDIAN_PAYLOAD_ENV =
  'CORTEXEL_PACKAGE_SMOKE_GUARDIAN_PAYLOAD' as const;
export const REVIEWED_NODE_WORKER_PAYLOAD_ENV =
  'CORTEXEL_PACKAGE_SMOKE_WORKER_PAYLOAD' as const;
export const REVIEWED_NODE_TEST_HOOK_ENV =
  'CORTEXEL_PACKAGE_SMOKE_TRUSTED_COMMAND_TEST_HOOK' as const;

export const REVIEWED_NODE_ARM_TIMEOUT_MS = 5_000;
export const REVIEWED_NODE_GATE_TIMEOUT_MS = 7_000;
export const REVIEWED_NODE_SETTLEMENT_TIMEOUT_MS = 5_000;
export const REVIEWED_NODE_PIPE_DRAIN_TIMEOUT_MS = 2_000;
export const REVIEWED_NODE_TEST_HOOK_TIMEOUT_MS = 4_000;
export const REVIEWED_NODE_SUPERVISOR_SCHEDULER_MARGIN_MS = 3_000;
export const REVIEWED_NODE_SUPERVISOR_GRACE_MS =
  REVIEWED_NODE_ARM_TIMEOUT_MS +
  REVIEWED_NODE_SETTLEMENT_TIMEOUT_MS +
  REVIEWED_NODE_PIPE_DRAIN_TIMEOUT_MS +
  REVIEWED_NODE_TEST_HOOK_TIMEOUT_MS +
  REVIEWED_NODE_SUPERVISOR_SCHEDULER_MARGIN_MS;

export const REVIEWED_NODE_TARGET_WORKER_SOURCE = String.raw`'use strict';
const childProcess = require('node:child_process');
const fs = require('node:fs');
const payloadName = ${JSON.stringify(REVIEWED_NODE_WORKER_PAYLOAD_ENV)};
const readySchema = ${JSON.stringify(REVIEWED_NODE_WORKER_READY_SCHEMA)};
const completionSchema = ${JSON.stringify(REVIEWED_NODE_TARGET_COMPLETION_SCHEMA)};
let payload;
try {
  payload = JSON.parse(process.env[payloadName] || 'null');
  const keys = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.keys(payload).sort()
    : [];
  if (
    JSON.stringify(keys) !== '["args","cwd","environment"]' ||
    !Array.isArray(payload.args) ||
    typeof payload.cwd !== 'string' ||
    !payload.environment ||
    typeof payload.environment !== 'object' ||
    Array.isArray(payload.environment)
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
const gateTimer = setTimeout(() => process.exit(70), ${REVIEWED_NODE_GATE_TIMEOUT_MS});
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
    target = childProcess.spawn(process.execPath, payload.args, {
      cwd: payload.cwd,
      detached: false,
      env: payload.environment,
      stdio: ['ignore', 'inherit', 'inherit'],
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

export const REVIEWED_NODE_GUARDIAN_SOURCE = String.raw`'use strict';
const childProcess = require('node:child_process');
const fs = require('node:fs');
const payloadName = ${JSON.stringify(REVIEWED_NODE_GUARDIAN_PAYLOAD_ENV)};
const workerPayloadName = ${JSON.stringify(REVIEWED_NODE_WORKER_PAYLOAD_ENV)};
const workerSource = ${JSON.stringify(REVIEWED_NODE_TARGET_WORKER_SOURCE)};
const workerReadySchema = ${JSON.stringify(REVIEWED_NODE_WORKER_READY_SCHEMA)};
const targetCompletionSchema = ${JSON.stringify(REVIEWED_NODE_TARGET_COMPLETION_SCHEMA)};
const guardianReadySchema = ${JSON.stringify(REVIEWED_NODE_GUARDIAN_READY_SCHEMA)};
const sweepIntentSchema = ${JSON.stringify(REVIEWED_NODE_GUARDIAN_SWEEP_INTENT_SCHEMA)};

let sweepStarted = false;
let worker = null;
let workerReady = false;
let readyPublished = false;
let goForwarded = false;
let gate = '';
let workerProtocol = Buffer.alloc(0);
let armTimer = null;
let gateTimer = null;

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
      ${REVIEWED_NODE_GATE_TIMEOUT_MS},
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
process.stdin.once('end', () => beginSweep('supervisor_lease_closed'));
process.stdin.once('error', () => beginSweep('supervisor_lease_closed'));
for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  process.on(signal, () => beginSweep('guardian_signal'));
}
process.on('uncaughtException', () => beginSweep('guardian_exception'));
process.on('unhandledRejection', () => beginSweep('guardian_exception'));

let payload;
try {
  payload = JSON.parse(process.env[payloadName] || 'null');
  const keys = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.keys(payload).sort()
    : [];
  if (
    JSON.stringify(keys) !== '["args","cwd","environment"]' ||
    !Array.isArray(payload.args) ||
    typeof payload.cwd !== 'string' ||
    !payload.environment ||
    typeof payload.environment !== 'object' ||
    Array.isArray(payload.environment)
  ) {
    throw new Error('invalid guardian payload');
  }
} catch {
  beginSweep('invalid_payload');
}
delete process.env[payloadName];
if (!sweepStarted) {
  const workerPayload = JSON.stringify({
    args: payload.args,
    cwd: payload.cwd,
    environment: payload.environment,
  });
  try {
    worker = childProcess.spawn(process.execPath, ['-e', workerSource], {
      cwd: payload.cwd,
      detached: false,
      env: { ...process.env, [workerPayloadName]: workerPayload },
      stdio: ['pipe', 'inherit', 'inherit', 'pipe'],
      windowsHide: true,
    });
  } catch {
    beginSweep('worker_spawn_error');
  }
}
if (!sweepStarted && worker) {
  armTimer = setTimeout(
    () => beginSweep('worker_ready_timeout'),
    ${REVIEWED_NODE_ARM_TIMEOUT_MS},
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

export const REVIEWED_NODE_SUPERVISOR_SOURCE = String.raw`'use strict';
const childProcess = require('node:child_process');
const fs = require('node:fs');
const payloadName = ${JSON.stringify(REVIEWED_NODE_SUPERVISOR_PAYLOAD_ENV)};
const guardianPayloadName = ${JSON.stringify(REVIEWED_NODE_GUARDIAN_PAYLOAD_ENV)};
const testHookPayloadName = ${JSON.stringify(REVIEWED_NODE_TEST_HOOK_ENV)};
const guardianSource = ${JSON.stringify(REVIEWED_NODE_GUARDIAN_SOURCE)};
const resultSchema = ${JSON.stringify(REVIEWED_NODE_COMMAND_RESULT_SCHEMA)};
const handshakeSchema = ${JSON.stringify(REVIEWED_NODE_COMMAND_HANDSHAKE_SCHEMA)};
const guardianReadySchema = ${JSON.stringify(REVIEWED_NODE_GUARDIAN_READY_SCHEMA)};
const sweepIntentSchema = ${JSON.stringify(REVIEWED_NODE_GUARDIAN_SWEEP_INTENT_SCHEMA)};
const completionSchema = ${JSON.stringify(REVIEWED_NODE_TARGET_COMPLETION_SCHEMA)};
const testHookSchema = ${JSON.stringify(REVIEWED_NODE_COMMAND_TEST_HOOK_SCHEMA)};

let payload;
let trustedTestHook = null;
try {
  payload = JSON.parse(process.env[payloadName] || 'null');
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
} catch {
  fs.writeSync(1, JSON.stringify({
    guardianSweepIntentCount: 0,
    outputOverflow: false,
    schema: resultSchema,
    signal: null,
    spawnError: 'invalid supervisor payload',
    status: null,
    stderrBase64: '',
    stdoutBase64: '',
    timedOut: false,
  }) + '\n');
  process.exit(0);
}
delete process.env[payloadName];
delete process.env[testHookPayloadName];

const chunks = { stdout: [], stderr: [] };
let capturedBytes = 0;
let outputOverflow = false;
let timedOut = false;
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
  const stdoutBase64 = Buffer.concat(chunks.stdout).toString('base64');
  const stderrBase64 = Buffer.concat(chunks.stderr).toString('base64');
  fs.writeSync(1, JSON.stringify({
    guardianSweepIntentCount,
    outputOverflow,
    schema: resultSchema,
    signal,
    spawnError,
    status,
    stderrBase64,
    stdoutBase64,
    timedOut,
  }) + '\n');
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
  }, ${REVIEWED_NODE_SETTLEMENT_TIMEOUT_MS});
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
for (const [signal, exitCode] of [['SIGTERM', 143], ['SIGINT', 130], ['SIGHUP', 129]]) {
  process.on(signal, () => cancelSupervisor(exitCode));
}
process.on('uncaughtException', () => cancelSupervisor(70));
process.on('unhandledRejection', () => cancelSupervisor(70));

const capture = (stream) => (chunk) => {
  if (settled || outputOverflow) return;
  const remaining = payload.outputLimitBytes - capturedBytes;
  if (chunk.length > remaining) {
    if (remaining > 0) chunks[stream].push(chunk.subarray(0, remaining));
    capturedBytes += Math.max(remaining, 0);
    outputOverflow = true;
    closeSupervisorLease();
    return;
  }
  chunks[stream].push(chunk);
  capturedBytes += chunk.length;
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
    ${REVIEWED_NODE_TEST_HOOK_TIMEOUT_MS},
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
    timedOut = true;
    closeSupervisorLease();
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
      schema: value.schema,
      workerPid: value.workerPid,
    };
    const canonical = Buffer.from(JSON.stringify(normalized) + '\n', 'utf8');
    if (
      JSON.stringify(keys) !== '["guardianPid","schema","workerPid"]' ||
      value.schema !== guardianReadySchema ||
      !Number.isSafeInteger(value.guardianPid) ||
      value.guardianPid !== guardian.pid ||
      !Number.isSafeInteger(value.workerPid) ||
      value.workerPid <= 1 ||
      !raw.equals(canonical)
    ) {
      failProtocol(
        'guardian READY frame is invalid ' +
          JSON.stringify({
            canonical: raw.equals(canonical),
            expectedGuardianPid: guardian.pid,
            guardianPid: value && value.guardianPid,
            keys,
            schema: value && value.schema,
            workerPid: value && value.workerPid,
          }),
      );
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
});
try {
  guardian = childProcess.spawn(process.execPath, ['-e', guardianSource], {
    cwd: payload.cwd,
    detached: true,
    env: { ...process.env, [guardianPayloadName]: guardianPayload },
    stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
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
    timedOut = true;
    closeSupervisorLease();
  }, ${REVIEWED_NODE_ARM_TIMEOUT_MS});
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
      }, ${REVIEWED_NODE_PIPE_DRAIN_TIMEOUT_MS});
    }
    finalizeGuardian();
  });
}
`;
