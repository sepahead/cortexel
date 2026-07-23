/**
 * Executable integrity checks for the capability/availability registry.
 *
 * `status` and `availability` are deliberately orthogonal. The former is contract
 * maturity; the latter is evidence about the exact surface a caller can reach today.
 * Keeping the package and source evidence outside the registry prevents a record from
 * proving its own availability merely by asserting it.
 */

export type CapabilityAvailability = 'packaged' | 'source_only' | 'unavailable';

export interface CapabilityRecordSource {
  readonly id?: unknown;
  readonly kind?: unknown;
  readonly status?: unknown;
  readonly availability?: unknown;
  readonly renderer?: unknown;
  readonly replacement?: unknown;
}

export interface CapabilityRegistrySource {
  readonly statuses?: unknown;
  readonly availabilities?: unknown;
  readonly capabilities?: unknown;
}

export interface CapabilitySourceEvidence {
  /** Capability ids derived from package.json `exports` (and no other authority). */
  readonly packageExportIds: ReadonlySet<string>;
  /** Capability ids derived from actual tsup entry names. */
  readonly buildEntryIds: ReadonlySet<string>;
  /** Skill ids declared by the packaged legacy skills.manifest.json data export. */
  readonly packagedSkillIds: ReadonlySet<string>;
  /** Current FigureRequest skill ids backed by the packaged figure+renderer+contract trio. */
  readonly packagedFigureSkillIds: ReadonlySet<string>;
  /** Whether package.json publishes the source CLI through a bin entry. */
  readonly cliIsPackaged: boolean;
  /** Commands found in the source CLI dispatch. */
  readonly implementedCliIds: ReadonlySet<string>;
  /** Import ids declared by actual source entry modules. */
  readonly sourceExportIds: ReadonlySet<string>;
  /** Non-importable normative source capabilities with independently checked files. */
  readonly contractSourceIds: ReadonlySet<string>;
  /** Exact ids backed by contract/skills/<id>.v1.json. */
  readonly skillContractIds: ReadonlySet<string>;
  /** Renderer declarations loaded independently from renderers.v1.json. */
  readonly rendererIds: ReadonlySet<string>;
  /** Legacy ids backed by a deterministic migration-map record. */
  readonly legacyMapIds: ReadonlySet<string>;
  /** Whether package.json's tarball allow-list contains dist/. */
  readonly tarballIncludesDist: boolean;
}

const AVAILABILITIES = new Set<CapabilityAvailability>([
  'packaged',
  'source_only',
  'unavailable',
]);
const STATUSES = new Set(['stable', 'experimental', 'deprecated', 'removed']);
const KINDS = new Set(['skill', 'export', 'data_export', 'contract_source', 'cli']);
const PRIVATE_BUILD_ENTRY_KEYS = new Set([
  'cli/main',
  'internal/request-capability',
]);

/** Map a package export key to the public capability id named by that key. */
export function packageExportId(key: string): string {
  if (key.startsWith('./contract/')) return 'cortexel/contract';
  return key === '.' ? 'cortexel' : `cortexel/${key.replace(/^\.\//u, '')}`;
}

/** Map a tsup entry name to the public capability id its emitted files implement. */
export function buildEntryId(key: string): string {
  if (key === 'index') return 'cortexel';
  const normalized = key.endsWith('/index') ? key.slice(0, -'/index'.length) : key;
  return `cortexel/${normalized}`;
}

export function packageExportIds(packageJson: unknown): Set<string> {
  if (packageJson === null || typeof packageJson !== 'object' || Array.isArray(packageJson)) {
    return new Set();
  }
  const exportsValue = (packageJson as Record<string, unknown>).exports;
  if (exportsValue === null || typeof exportsValue !== 'object' || Array.isArray(exportsValue)) {
    return new Set();
  }
  return new Set(Object.keys(exportsValue as Record<string, unknown>).map(packageExportId));
}

export function buildEntryIds(entry: unknown): Set<string> {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return new Set();
  return new Set(Object.keys(entry as Record<string, unknown>)
    .filter((key) => !PRIVATE_BUILD_ENTRY_KEYS.has(key))
    .map(buildEntryId));
}

export function buildEntryOutputBases(entry: unknown): Map<string, string> {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return new Map();
  return new Map(Object.keys(entry as Record<string, unknown>)
    .filter((key) => !PRIVATE_BUILD_ENTRY_KEYS.has(key))
    .map((key) => [
      buildEntryId(key),
      `./dist/${key}`,
    ]));
}

function stringLeaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value === null || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  return Object.values(value as Record<string, unknown>).flatMap(stringLeaves);
}

/** Validate that package export targets are the files implied by the actual build entries. */
export function packageExportTargetProblems(
  packageJson: unknown,
  outputBases: ReadonlyMap<string, string>,
): string[] {
  if (packageJson === null || typeof packageJson !== 'object' || Array.isArray(packageJson)) {
    return ['package.json: expected an object'];
  }
  const exportsValue = (packageJson as Record<string, unknown>).exports;
  if (exportsValue === null || typeof exportsValue !== 'object' || Array.isArray(exportsValue)) {
    return ['package.json exports: expected a subpath map'];
  }

  const problems: string[] = [];
  const exportedIds = new Set<string>();
  for (const [key, target] of Object.entries(exportsValue as Record<string, unknown>)) {
    const id = packageExportId(key);
    exportedIds.add(id);
    const leaves = stringLeaves(target);
    if (leaves.length === 0) {
      problems.push(`package export ${id}: has no string target`);
      continue;
    }
    for (const leaf of leaves) {
      if (id === 'cortexel/package.json' && leaf === './package.json') continue;
      if (!leaf.startsWith('./dist/')) {
        problems.push(`package export ${id}: target ${leaf} is outside the packaged dist/ tree`);
      }
    }

    const base = outputBases.get(id);
    if (base !== undefined) {
      if (target === null || typeof target !== 'object' || Array.isArray(target)) {
        problems.push(`package export ${id}: code export must declare import and require conditions`);
      } else {
        const conditions = target as Record<string, unknown>;
        const conditionKeys = Object.keys(conditions);
        if (JSON.stringify(conditionKeys) !== JSON.stringify(['import', 'require'])) {
          problems.push(
            `package export ${id}: code export must contain exactly import and require conditions`,
          );
        }
        for (const condition of ['import', 'require'] as const) {
          const branch = conditions[condition];
          if (branch === null || typeof branch !== 'object' || Array.isArray(branch)) {
            problems.push(`package export ${id}: missing explicit ${condition} condition`);
            continue;
          }
          const branchKeys = Object.keys(branch as Record<string, unknown>);
          if (JSON.stringify(branchKeys) !== JSON.stringify(['types', 'default'])) {
            problems.push(
              `package export ${id}: ${condition} must contain exactly types then default`,
            );
          }
          const branchRecord = branch as Record<string, unknown>;
          const expectedTypes = `${base}.${condition === 'import' ? 'd.ts' : 'd.cts'}`;
          const expectedDefault = `${base}.${condition === 'import' ? 'js' : 'cjs'}`;
          if (branchRecord.types !== expectedTypes) {
            problems.push(`package export ${id}: ${condition}.types expected ${expectedTypes}`);
          }
          if (branchRecord.default !== expectedDefault) {
            problems.push(`package export ${id}: ${condition}.default expected ${expectedDefault}`);
          }
        }
      }
      const required = [`${base}.js`, `${base}.cjs`, `${base}.d.ts`, `${base}.d.cts`];
      for (const targetName of required) {
        if (!leaves.includes(targetName)) {
          problems.push(`package export ${id}: missing build target ${targetName}`);
        }
      }
    } else if (
      id !== 'cortexel/package.json' &&
      id !== 'cortexel/contract' &&
      !leaves.every((leaf) => leaf.endsWith('.json'))
    ) {
      problems.push(`package export ${id}: code target has no tsup entry`);
    }
  }

  for (const id of [...outputBases.keys()].sort()) {
    if (!exportedIds.has(id)) problems.push(`tsup entry ${id}: missing package export target`);
  }
  const exportsRecord = exportsValue as Record<string, unknown>;
  if (exportsRecord['./contract/manifest.json'] !== './dist/contract/manifest.v1.json') {
    problems.push(
      'package export cortexel/contract: manifest alias must target ./dist/contract/manifest.v1.json',
    );
  }
  if (exportsRecord['./contract/*'] !== './dist/contract/*') {
    problems.push(
      'package export cortexel/contract: wildcard must target the single ./dist/contract/* tree',
    );
  }
  return problems;
}

export function packageHasCortexelBin(packageJson: unknown): boolean {
  if (packageJson === null || typeof packageJson !== 'object' || Array.isArray(packageJson)) {
    return false;
  }
  const bin = (packageJson as Record<string, unknown>).bin;
  if (typeof bin === 'string') return bin.trim().length > 0;
  return bin !== null && typeof bin === 'object' && !Array.isArray(bin) &&
    typeof (bin as Record<string, unknown>).cortexel === 'string';
}

/** Bind the public bin name to the actual private tsup entry, not merely any string. */
export function packageBinTargetProblems(packageJson: unknown, entry: unknown): string[] {
  const problems: string[] = [];
  if (packageJson === null || typeof packageJson !== 'object' || Array.isArray(packageJson)) {
    return ['package.json: expected an object'];
  }
  const bin = (packageJson as Record<string, unknown>).bin;
  const target = typeof bin === 'string'
    ? bin
    : bin !== null && typeof bin === 'object' && !Array.isArray(bin)
      ? (bin as Record<string, unknown>).cortexel
      : undefined;
  if (target !== './dist/cli/main.js') {
    problems.push('package bin cortexel: expected exact target ./dist/cli/main.js');
  }
  if (
    entry === null || typeof entry !== 'object' || Array.isArray(entry) ||
    (entry as Record<string, unknown>)['cli/main'] !== 'src/cli/main.ts'
  ) {
    problems.push('package bin cortexel: private tsup entry cli/main is missing');
  }
  return problems;
}

export function packageIncludesDist(packageJson: unknown): boolean {
  if (packageJson === null || typeof packageJson !== 'object' || Array.isArray(packageJson)) {
    return false;
  }
  const files = (packageJson as Record<string, unknown>).files;
  return Array.isArray(files) && files.some(
    (entry) => typeof entry === 'string' && (entry === 'dist' || entry.startsWith('dist/')),
  );
}

export function packagedSkillIds(manifest: unknown): Set<string> {
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return new Set();
  }
  const skills = (manifest as Record<string, unknown>).skills;
  if (!Array.isArray(skills)) return new Set();
  return new Set(skills.flatMap((skill) => {
    if (skill === null || typeof skill !== 'object' || Array.isArray(skill)) return [];
    const id = (skill as Record<string, unknown>).id;
    return typeof id === 'string' ? [id] : [];
  }));
}

/** Read the exact public id from the leading source-entry documentation block. */
export function sourceEntryId(source: string): string | null {
  if (!/^export\s/mu.test(source)) return null;
  const leadingComment = source.match(/^\/\*\*[\s\S]*?\*\//u)?.[0];
  if (!leadingComment) return null;
  return leadingComment.match(/`(cortexel(?:\/[^`]+)?)`\s+—/u)?.[1] ?? null;
}

/** Enumerate actual CLI subcommands from the imported tuple that also gates dispatch. */
export function implementedCliIds(commands: readonly unknown[]): Set<string> {
  const ids = new Set<string>();
  for (const command of commands) {
    if (typeof command === 'string' && /^[a-z][a-z0-9-]*$/u.test(command)) {
      ids.add(`cli.${command}`);
    }
  }
  return ids;
}

function objectKeys(value: unknown): string[] {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value as Record<string, unknown>)
    : [];
}

/** Return every availability/source/package contradiction in deterministic order. */
export function capabilitySourceProblems(
  registry: CapabilityRegistrySource,
  evidence: CapabilitySourceEvidence,
): string[] {
  const problems: string[] = [];
  const statusKeys = objectKeys(registry.statuses).sort();
  const expectedStatusKeys = [...STATUSES].sort();
  if (JSON.stringify(statusKeys) !== JSON.stringify(expectedStatusKeys)) {
    problems.push(
      `capabilities.statuses: expected closed keys [${expectedStatusKeys.join(', ')}], got [${statusKeys.join(', ')}]`,
    );
  }
  const statuses = registry.statuses !== null && typeof registry.statuses === 'object' &&
    !Array.isArray(registry.statuses)
    ? registry.statuses as Record<string, unknown>
    : {};
  for (const status of expectedStatusKeys) {
    if (typeof statuses[status] !== 'string' || statuses[status].trim().length === 0) {
      problems.push(`capabilities.statuses.${status}: expected a non-empty semantic definition`);
    }
  }
  if (
    typeof statuses.stable === 'string' &&
    !statuses.stable.toLowerCase().includes('contract-maturity')
  ) {
    problems.push('capabilities.statuses.stable: must define contract maturity, not availability');
  }
  const availabilityKeys = objectKeys(registry.availabilities).sort();
  const expectedAvailabilityKeys = [...AVAILABILITIES].sort();
  if (JSON.stringify(availabilityKeys) !== JSON.stringify(expectedAvailabilityKeys)) {
    problems.push(
      `capabilities.availabilities: expected closed keys [${expectedAvailabilityKeys.join(', ')}], got [${availabilityKeys.join(', ')}]`,
    );
  }
  const availabilities = registry.availabilities !== null &&
    typeof registry.availabilities === 'object' && !Array.isArray(registry.availabilities)
    ? registry.availabilities as Record<string, unknown>
    : {};
  for (const availability of expectedAvailabilityKeys) {
    if (
      typeof availabilities[availability] !== 'string' ||
      availabilities[availability].trim().length === 0
    ) {
      problems.push(
        `capabilities.availabilities.${availability}: expected a non-empty semantic definition`,
      );
    }
  }

  if (!Array.isArray(registry.capabilities)) {
    return [...problems, 'capabilities.capabilities: expected an array'];
  }

  const records = registry.capabilities as CapabilityRecordSource[];
  const byId = new Map<string, CapabilityRecordSource>();
  for (const [index, record] of records.entries()) {
    const where = `capabilities.capabilities[${index}]`;
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      problems.push(`${where}: expected an object`);
      continue;
    }
    if (typeof record.id !== 'string' || record.id.length === 0) continue;
    byId.set(record.id, record);

    if (!STATUSES.has(record.status as string)) {
      problems.push(`${where} (${record.id}).status: expected a closed contract-maturity status`);
    }
    if (!KINDS.has(record.kind as string)) {
      problems.push(`${where} (${record.id}).kind: expected a closed capability kind`);
    }

    if (!AVAILABILITIES.has(record.availability as CapabilityAvailability)) {
      problems.push(
        `${where} (${record.id}).availability: required closed value packaged, source_only, or unavailable; no default exists`,
      );
      continue;
    }

    const availability = record.availability as CapabilityAvailability;
    const removed = record.status === 'removed';
    if (removed && availability !== 'unavailable') {
      problems.push(`${where} (${record.id}): status removed requires availability unavailable`);
    }
    if (!removed && availability === 'unavailable') {
      problems.push(`${where} (${record.id}): only status removed may use availability unavailable`);
    }
    if (record.kind === 'skill' && !removed) {
      if (!evidence.skillContractIds.has(record.id)) {
        problems.push(`${where} (${record.id}): live skill has no normative skill contract`);
      }
      if (typeof record.renderer !== 'string' || !evidence.rendererIds.has(record.renderer)) {
        problems.push(`${where} (${record.id}): live skill has no registered renderer`);
      }
    }

    const packageSurface = evidence.packageExportIds.has(record.id) ||
      (record.kind === 'skill' && (
        evidence.packagedSkillIds.has(record.id) ||
        evidence.packagedFigureSkillIds.has(record.id)
      )) ||
      (record.kind === 'cli' && evidence.cliIsPackaged && evidence.implementedCliIds.has(record.id));

    if (availability === 'packaged') {
      if (!packageSurface) {
        problems.push(`${where} (${record.id}): packaged has no package export, bin, or manifest evidence`);
      }
      if (!evidence.tarballIncludesDist) {
        problems.push(`${where} (${record.id}): packaged but package.json files does not include dist/`);
      }
      if (
        evidence.packageExportIds.has(record.id) &&
        record.kind !== 'export' && record.kind !== 'data_export'
      ) {
        problems.push(`${where} (${record.id}): a package export must use kind export or data_export`);
      }
      if (record.kind === 'export' && !evidence.buildEntryIds.has(record.id)) {
        problems.push(`${where} (${record.id}): packaged code export has no tsup entry`);
      }
      if (record.kind === 'data_export' && evidence.buildEntryIds.has(record.id)) {
        problems.push(`${where} (${record.id}): data_export unexpectedly has a code build entry`);
      }
    }

    if (availability === 'source_only') {
      if (packageSurface) {
        problems.push(`${where} (${record.id}): source_only contradicts a package or tarball surface`);
      }
      if (record.kind === 'cli') {
        if (!evidence.implementedCliIds.has(record.id)) {
          problems.push(`${where} (${record.id}): source_only CLI command has no source dispatch case`);
        }
      } else if (record.kind === 'export') {
        if (!evidence.sourceExportIds.has(record.id)) {
          problems.push(`${where} (${record.id}): source_only export has no source entry module`);
        }
      } else if (record.kind === 'contract_source') {
        if (!evidence.contractSourceIds.has(record.id)) {
          problems.push(`${where} (${record.id}): source_only contract_source has no normative source evidence`);
        }
      } else if (record.kind !== 'skill') {
        problems.push(`${where} (${record.id}): source_only kind ${String(record.kind)} has no evidence rule`);
      }
    }

    if (availability === 'unavailable' && !evidence.legacyMapIds.has(record.id)) {
      problems.push(`${where} (${record.id}): unavailable tombstone has no migration-map record`);
    }
  }

  // Package coverage is bidirectional: a public package export may not disappear from
  // the capability registry, and registry prose may not invent a packaged export.
  for (const id of [...evidence.packageExportIds].sort()) {
    const capability = byId.get(id);
    if (!capability) {
      problems.push(`package export ${id}: missing capability record`);
    } else if (capability.availability !== 'packaged') {
      problems.push(`package export ${id}: capability availability must be packaged`);
    }
  }

  for (const id of [...evidence.packagedSkillIds].sort()) {
    if (!evidence.legacyMapIds.has(id)) {
      problems.push(`packaged legacy skill ${id}: missing deterministic migration-map outcome`);
    }
  }

  for (const id of [...evidence.packagedFigureSkillIds].sort()) {
    const capability = byId.get(id);
    if (!capability) {
      problems.push(`packaged FigureRequest skill ${id}: missing capability record`);
    } else if (capability.kind !== 'skill' || capability.availability !== 'packaged') {
      problems.push(`packaged FigureRequest skill ${id}: capability must be a packaged skill`);
    }
  }

  // CLI coverage is also bidirectional. A tuple member is executable because the same
  // tuple gates dispatch; an undeclared member would otherwise be a hidden public bin
  // surface, while a declared command with no tuple member is already rejected above.
  for (const id of [...evidence.implementedCliIds].sort()) {
    const capability = byId.get(id);
    if (!capability) {
      problems.push(`implemented CLI command ${id}: missing capability record`);
    } else if (capability.kind !== 'cli' || capability.availability !== 'packaged') {
      problems.push(`implemented CLI command ${id}: capability must be a packaged CLI`);
    }
  }

  for (const [id, capability] of [...byId.entries()].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0
  )) {
    if (typeof capability.replacement === 'string' && !byId.has(capability.replacement)) {
      problems.push(`${id}: replacement ${capability.replacement} is not a capability`);
    }
  }

  // Every emitted code entry must be exported, and every packaged code export must be
  // backed by an emitted entry. JSON data exports are intentionally not tsup entries.
  for (const id of [...evidence.buildEntryIds].sort()) {
    if (!evidence.packageExportIds.has(id)) {
      problems.push(`tsup entry ${id}: missing package export`);
    }
  }

  // A renderer declaration with no capability using it is an invented surface. This is
  // what prevents a metadata-only figure.bundle renderer from reappearing unnoticed.
  const referencedRenderers = new Set(
    records.flatMap((record) => typeof record.renderer === 'string' ? [record.renderer] : []),
  );
  for (const renderer of [...evidence.rendererIds].sort()) {
    if (!referencedRenderers.has(renderer)) {
      problems.push(`renderer ${renderer}: no capability references this renderer`);
    }
  }

  return problems;
}
