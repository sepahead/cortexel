#!/usr/bin/env node
import { C as CortexelError } from '../errors-DUbFUu6n.cjs';

/**
 * Closed Cortexel CLI command authority.
 *
 * Dispatch and capability generation import this value directly. It is data, not a
 * source-text pattern, so quote style and comments cannot create or hide commands.
 */
declare const CLI_COMMANDS: readonly ["identity", "catalog", "validate", "render", "inspect", "migrate"];

/**
 * The Cortexel CLI.
 *
 * A narrow, auditable command surface for agents and reproducible pipelines: typed
 * input, deterministic output, explicit exit codes, and no network access. Everything is
 * offline by default; there is no `--url`, no implicit HTTP, and no shell hook, because a
 * scientific validator that could be turned into an ETL tool is a scientific validator
 * with an attack surface.
 *
 * The package installs this offline command as the `cortexel` bin. Importing the module
 * remains side-effect free; only exact direct execution reaches the dispatcher.
 *
 * Exit codes are a stable contract of their own: 0 ok, 2 usage, 3 parse, 4 schema,
 * 5 semantic, 6 budget, 7 I/O, 8 internal.
 */

/**
 * Map diagnostics to the stable CLI exit contract.
 *
 * Validation normally returns stage-sorted diagnostics. We nevertheless choose the
 * earliest error stage explicitly, while giving a genuine internal error precedence:
 * an invariant failure must never be reported as a caller repair problem. The terminal
 * ERROR_LIMIT_REACHED warning does not override the actual errors that preceded it.
 */
declare function exitCodeForErrors(errors: readonly CortexelError[]): number;
declare function run(argv: readonly string[]): number;

export { CLI_COMMANDS, exitCodeForErrors, run };
