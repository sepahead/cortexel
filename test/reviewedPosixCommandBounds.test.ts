import { describe, expect, it } from 'vitest';

import {
  REVIEWED_POSIX_COMMAND_LIMITS,
  reviewedPosixCommandTesting,
} from '../scripts/lib/reviewed-posix-command.js';
import {
  REVIEWED_POSIX_ARM_TIMEOUT_MS,
  REVIEWED_POSIX_GATE_TIMEOUT_MS,
  REVIEWED_POSIX_PIPE_DRAIN_TIMEOUT_MS,
  REVIEWED_POSIX_SETTLEMENT_TIMEOUT_MS,
  REVIEWED_POSIX_SUPERVISOR_GRACE_MS,
  REVIEWED_POSIX_SUPERVISOR_SCHEDULER_MARGIN_MS,
  REVIEWED_POSIX_TEST_HOOK_TIMEOUT_MS,
} from '../scripts/lib/reviewed-posix-supervisor.js';

describe('reviewed POSIX command timeout bounds', () => {
  it('admits the exact maximum and rejects every value above it without waiting', () => {
    expect(REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs).toBe(15 * 60_000);
    expect(reviewedPosixCommandTesting.outerTimeoutMs(
      REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs,
    )).toBe(15 * 60_000 + 19_000);
    expect(() => reviewedPosixCommandTesting.outerTimeoutMs(
      REVIEWED_POSIX_COMMAND_LIMITS.timeoutMs + 1,
    )).toThrow(/timeout is outside its bound/u);
  });

  it('pins the cooperative outer envelope to the exact fixed lifecycle grace', () => {
    expect(REVIEWED_POSIX_ARM_TIMEOUT_MS).toBe(5_000);
    expect(REVIEWED_POSIX_GATE_TIMEOUT_MS).toBe(7_000);
    expect(REVIEWED_POSIX_SETTLEMENT_TIMEOUT_MS).toBe(5_000);
    expect(REVIEWED_POSIX_PIPE_DRAIN_TIMEOUT_MS).toBe(2_000);
    expect(REVIEWED_POSIX_TEST_HOOK_TIMEOUT_MS).toBe(4_000);
    expect(REVIEWED_POSIX_SUPERVISOR_SCHEDULER_MARGIN_MS).toBe(3_000);
    expect(REVIEWED_POSIX_SUPERVISOR_GRACE_MS).toBe(
      REVIEWED_POSIX_ARM_TIMEOUT_MS +
      REVIEWED_POSIX_SETTLEMENT_TIMEOUT_MS +
      REVIEWED_POSIX_PIPE_DRAIN_TIMEOUT_MS +
      REVIEWED_POSIX_TEST_HOOK_TIMEOUT_MS +
      REVIEWED_POSIX_SUPERVISOR_SCHEDULER_MARGIN_MS,
    );
    expect(REVIEWED_POSIX_SUPERVISOR_GRACE_MS).toBe(19_000);
    // The worker gate is inside the supervisor arm phase. It is intentionally
    // not added again to the outer envelope.
    expect(REVIEWED_POSIX_SUPERVISOR_GRACE_MS).not.toBe(19_000 +
      REVIEWED_POSIX_GATE_TIMEOUT_MS);
  });
});
