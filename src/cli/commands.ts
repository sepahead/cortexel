/**
 * Closed Cortexel CLI command authority.
 *
 * Dispatch and capability generation import this value directly. It is data, not a
 * source-text pattern, so quote style and comments cannot create or hide commands.
 */
export const CLI_COMMANDS = [
  'identity',
  'catalog',
  'describe',
  'source',
  'validate',
  'render',
  'inspect',
  'migrate',
] as const;

export type CliCommand = (typeof CLI_COMMANDS)[number];
