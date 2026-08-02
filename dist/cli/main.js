#!/usr/bin/env node
import {
  migrateLegacyRequest
} from "../chunk-A2GUFIQI.js";
import {
  AUTHORING_SCHEMA_COMPILATION_PROFILE_V1,
  SKILL_AUTHORING,
  SOURCE_ADAPTER_CATALOG_DIGEST,
  SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
  SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE,
  SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN,
  SOURCE_ADAPTER_DISCOVERY_CATALOG,
  SOURCE_ADAPTER_IDS,
  STABLE_CATALOG_SCHEMA_RESOURCES,
  isSourceAdapterId,
  lookupSourceAdapter,
  lookupSourceAdapterDescriptorDigest
} from "../chunk-HNZNJAWH.js";
import {
  buildFigureFromJson
} from "../chunk-COQKIXRX.js";
import "../chunk-U7D5HKZJ.js";
import "../chunk-QZWIZIZR.js";
import {
  ERROR_STAGES
} from "../chunk-3R5OZ4HO.js";
import "../chunk-XGABDL4O.js";
import {
  EXPERIMENTAL_CAPABILITY_IDS,
  SKILL_CATALOG,
  STABLE_SKILL_IDS,
  isStableSkillId
} from "../chunk-3YDCB72V.js";
import {
  nestSpikeRecorderToRaster
} from "../chunk-CLHJSX5J.js";
import "../chunk-OGJBOXWL.js";
import {
  SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER,
  classifySourceAdapterExampleEnvelope
} from "../chunk-WVFXQTTZ.js";
import "../chunk-2N3ZC6OE.js";
import {
  getBudgetLimits
} from "../chunk-AHJODCDL.js";
import {
  CATALOG_DIGEST_DOMAIN,
  getBuildIdentity
} from "../chunk-5FW7Q3ZT.js";
import "../chunk-Z2GYUK7B.js";
import {
  parseJsonStrict
} from "../chunk-EVZW37W7.js";
import {
  UNSAFE_DISPLAY_PATTERN_SOURCE,
  makeError,
  safeText
} from "../chunk-RF2EM75L.js";
import {
  canonicalize
} from "../chunk-ZYBCCIMH.js";

// src/cli/main.ts
import { randomBytes } from "crypto";
import {
  closeSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeSync
} from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseAndValidateRequest,
  validateRequestValue
} from "#cortexel-request-capability";

// src/cli/commands.ts
var CLI_COMMANDS = [
  "identity",
  "catalog",
  "describe",
  "source",
  "validate",
  "render",
  "inspect",
  "migrate"
];

// src/cli/main.ts
var EXIT = {
  ok: 0,
  usage: 2,
  parse: 3,
  schema: 4,
  semantic: 5,
  budget: 6,
  io: 7,
  internal: 8
};
function exitCodeForErrors(errors) {
  const actualErrors = errors.filter((error) => error.severity === "error");
  const considered = actualErrors.length > 0 ? actualErrors : errors;
  if (considered.length === 0) return EXIT.internal;
  if (considered.some((error) => error.stage === "internal")) return EXIT.internal;
  const firstStage = ERROR_STAGES.find((stage) => considered.some((error) => error.stage === stage));
  switch (firstStage) {
    case "parse":
    case "snapshot":
      return EXIT.parse;
    case "identity":
    case "structural":
      return EXIT.schema;
    case "budget":
    case "serialize":
      return EXIT.budget;
    case "semantic":
    case "science":
    case "scope":
    case "provenance":
    case "derivation":
    case "render":
    case "migrate":
    case "adapter":
      return EXIT.semantic;
    case "internal":
    case void 0:
      return EXIT.internal;
  }
}
var CLI_INPUT_BYTE_LIMIT = getBudgetLimits("standard").rawInputBytes;
var INPUT_READ_CHUNK_BYTES = 64 * 1024;
var CLI_UNSAFE_DISPLAY_REGEX = new RegExp(UNSAFE_DISPLAY_PATTERN_SOURCE, "gu");
function serializeCliJson(value) {
  return JSON.stringify(value, null, 2).replace(
    CLI_UNSAFE_DISPLAY_REGEX,
    (character) => {
      if (character.charCodeAt(0) <= 31) return character;
      return [...character].map((part) => `\\u${part.charCodeAt(0).toString(16).padStart(4, "0")}`).join("");
    }
  );
}
function writeCliJson(value, stream = process.stdout) {
  stream.write(`${serializeCliJson(value)}
`);
}
var CliInputBoundaryError = class extends Error {
  constructor(kind, limit, observed) {
    super(kind);
    this.kind = kind;
    this.limit = limit;
    this.observed = observed;
    this.name = "CliInputBoundaryError";
  }
  kind;
  limit;
  observed;
};
function readBoundedBytes(fd, limit) {
  const chunks = [];
  let total = 0;
  while (total <= limit) {
    const remaining = limit + 1 - total;
    if (remaining === 0) break;
    const chunk = Buffer.allocUnsafe(Math.min(INPUT_READ_CHUNK_BYTES, remaining));
    const count = readSync(fd, chunk, 0, chunk.byteLength, null);
    if (count === 0) break;
    chunks.push(chunk.subarray(0, count));
    total += count;
  }
  if (total > limit) {
    throw new CliInputBoundaryError("bytes-exceeded", limit, total);
  }
  return Buffer.concat(chunks, total);
}
function readInput(source) {
  let fd = 0;
  let close = false;
  try {
    if (source !== "-") {
      fd = openSync(source, "r");
      close = true;
    }
    const bytes = readBoundedBytes(fd, CLI_INPUT_BYTE_LIMIT);
    try {
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      throw new CliInputBoundaryError("invalid-utf8");
    }
  } finally {
    if (close) closeSync(fd);
  }
}
function inputBoundaryErrors(error) {
  if (!(error instanceof CliInputBoundaryError)) return void 0;
  if (error.kind === "bytes-exceeded") {
    return [makeError({
      code: "JSON_BYTES_EXCEEDED",
      stage: "parse",
      message: "the raw input is larger than the CLI host budget permits",
      limit: {
        name: "rawInputBytes",
        limit: error.limit,
        observed: error.observed
      }
    })];
  }
  return [makeError({
    code: "JSON_INVALID_UNICODE",
    stage: "parse",
    message: "the raw input byte stream is not well-formed UTF-8"
  })];
}
function printDiagnostics(errors, asJson) {
  if (asJson) {
    writeCliJson({ ok: false, errors }, process.stderr);
    return;
  }
  for (const error of errors) {
    process.stderr.write(`  ${error.code} at ${error.instancePath || "(root)"}: ${error.message}
`);
  }
}
var CliIoError = class extends Error {
  constructor(kind) {
    super(kind);
    this.kind = kind;
    this.name = "CliIoError";
  }
  kind;
};
function writeInputIoDiagnostic(asJson = false) {
  const message = "unable to read the selected input";
  if (asJson) {
    writeCliJson({
      ok: false,
      cliError: {
        kind: "input_io",
        message
      }
    }, process.stderr);
  } else {
    process.stderr.write(`I/O error: ${message}
`);
  }
}
function writeInternalCliDiagnostic(message, asJson = false) {
  if (asJson) {
    writeCliJson({
      ok: false,
      cliError: { kind: "internal", message }
    }, process.stderr);
  } else {
    process.stderr.write(`Internal error: ${message}
`);
  }
}
function outputIoMessage(error) {
  if (error instanceof CliIoError) {
    if (error.kind === "destination-exists") {
      return "refusing to overwrite an existing destination entry without --force";
    }
    if (error.kind === "destination-directory") {
      return "--force does not replace destination directories";
    }
    if (error.kind === "destination-locked") {
      return "another writer owns this figure output lock; if its process crashed, remove the stale .cortexel.figure-emission.lock entry manually";
    }
    return "this output directory does not permit atomic no-replace publication";
  }
  return "unable to publish the figure outputs";
}
function writeOutputIoDiagnostic(error, asJson = false) {
  const message = outputIoMessage(error);
  if (asJson) {
    writeCliJson({
      ok: false,
      cliError: {
        kind: "output_io",
        message
      }
    }, process.stderr);
  } else {
    process.stderr.write(`I/O error: ${message}
`);
  }
}
function handleInputReadFailure(error, asJson = false) {
  const boundaryErrors = inputBoundaryErrors(error);
  if (boundaryErrors) {
    printDiagnostics(boundaryErrors, asJson);
    return exitCodeForErrors(boundaryErrors);
  }
  writeInputIoDiagnostic(asJson);
  return EXIT.io;
}
function errorCode(error) {
  if (typeof error !== "object" || error === null || !("code" in error)) return void 0;
  return typeof error.code === "string" ? error.code : void 0;
}
function fsyncIfSupported(fd) {
  try {
    fsyncSync(fd);
  } catch (error) {
    if (!["EINVAL", "ENOSYS", "ENOTSUP", "EOPNOTSUPP"].includes(errorCode(error) ?? "")) {
      throw error;
    }
  }
}
function directorySyncUnsupported(error) {
  const code = errorCode(error);
  return code === "EINVAL" || code === "ENOSYS" || code === "ENOTSUP" || code === "EOPNOTSUPP" || code === "EISDIR" || process.platform === "win32" && (code === "EPERM" || code === "EACCES");
}
function fsyncDirectoryIfSupported(directory) {
  let fd;
  try {
    fd = openSync(directory, "r");
  } catch (error) {
    if (directorySyncUnsupported(error)) return;
    throw error;
  }
  try {
    fsyncIfSupported(fd);
  } finally {
    closeSync(fd);
  }
}
function removeTempBestEffort(temp) {
  if (!temp) return;
  try {
    unlinkSync(temp);
  } catch {
  }
}
function stageSibling(target, content) {
  const dir = path.dirname(target);
  mkdirSync(dir, { recursive: true });
  const bytes = Buffer.from(content, "utf8");
  for (let attempt = 0; attempt < 16; attempt++) {
    const nonce = randomBytes(16).toString("hex");
    const temp = path.join(dir, `.${nonce}.cortexel.tmp`);
    let fd;
    let created = false;
    try {
      fd = openSync(temp, "wx", 438);
      created = true;
      let offset = 0;
      while (offset < bytes.byteLength) {
        const written = writeSync(fd, bytes, offset, bytes.byteLength - offset);
        if (written <= 0) throw new Error("staging write made no progress");
        offset += written;
      }
      fsyncIfSupported(fd);
      closeSync(fd);
      fd = void 0;
      return temp;
    } catch (error) {
      if (fd !== void 0) {
        try {
          closeSync(fd);
        } catch {
        }
      }
      if (created) removeTempBestEffort(temp);
      if (errorCode(error) === "EEXIST") continue;
      throw error;
    }
  }
  throw new Error("could not allocate a unique temporary sibling");
}
function destinationState(target) {
  try {
    return lstatSync(target).isDirectory() ? "directory" : "entry";
  } catch (error) {
    if (errorCode(error) === "ENOENT") return "absent";
    throw error;
  }
}
function preflightDestinations(targets, force) {
  for (const target of targets) {
    const state = destinationState(target);
    if (!force && state !== "absent") throw new CliIoError("destination-exists");
    if (force && state === "directory") throw new CliIoError("destination-directory");
  }
}
function removeEntryIfPresent(target) {
  try {
    unlinkSync(target);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return;
    throw error;
  }
}
function publishNoReplace(temp, target) {
  try {
    linkSync(temp, target);
  } catch (error) {
    const code = errorCode(error);
    if (code === "EEXIST") throw new CliIoError("destination-exists");
    if (code === "EXDEV" || code === "EMLINK" || code === "ENOSYS" || code === "ENOTSUP" || code === "EOPNOTSUPP" || code === "EPERM" || code === "EACCES") {
      throw new CliIoError("atomic-no-replace-unavailable");
    }
    throw error;
  }
  unlinkSync(temp);
  fsyncDirectoryIfSupported(path.dirname(target));
}
function acquireEmissionLock(targets) {
  const lexicalDirectories = targets.map((target) => path.dirname(path.resolve(target)));
  for (const directory of lexicalDirectories) mkdirSync(directory, { recursive: true });
  const directories = lexicalDirectories.map((directory) => realpathSync(directory));
  if (directories[0] !== directories[1]) {
    throw new Error("figure outputs do not share one physical directory");
  }
  const lockPath = path.join(directories[0], ".cortexel.figure-emission.lock");
  const canonicalTargets = targets.map((target) => path.join(directories[0], path.basename(target)));
  let fd;
  try {
    fd = openSync(lockPath, "wx", 384);
  } catch (error) {
    if (errorCode(error) === "EEXIST") throw new CliIoError("destination-locked");
    throw error;
  }
  try {
    fsyncIfSupported(fd);
    fsyncDirectoryIfSupported(directories[0]);
    const identityStat = fstatSync(fd, { bigint: true });
    return {
      fd,
      path: lockPath,
      directory: directories[0],
      targets: canonicalTargets,
      device: identityStat.dev,
      inode: identityStat.ino
    };
  } catch (error) {
    try {
      closeSync(fd);
    } finally {
      removeTempBestEffort(lockPath);
    }
    throw error;
  }
}
function releaseEmissionLock(lock) {
  let identityMatches = false;
  try {
    const current = lstatSync(lock.path, { bigint: true });
    identityMatches = current.dev === lock.device && current.ino === lock.inode;
  } finally {
    closeSync(lock.fd);
  }
  if (!identityMatches) {
    throw new Error("figure output lock entry was replaced while held");
  }
  unlinkSync(lock.path);
  fsyncDirectoryIfSupported(lock.directory);
}
function writeFigureEmission(svgTarget, svg, artifactTarget, artifactJson, force) {
  const requestedTargets = [svgTarget, artifactTarget];
  const lock = acquireEmissionLock(requestedTargets);
  const [canonicalSvgTarget, canonicalArtifactTarget] = lock.targets;
  const targets = lock.targets;
  let svgTemp;
  let artifactTemp;
  let publicationError;
  try {
    preflightDestinations(targets, force);
    svgTemp = stageSibling(canonicalSvgTarget, svg);
    artifactTemp = stageSibling(canonicalArtifactTarget, artifactJson);
    if (force) {
      preflightDestinations(targets, true);
      removeEntryIfPresent(canonicalArtifactTarget);
      removeEntryIfPresent(canonicalSvgTarget);
      fsyncDirectoryIfSupported(path.dirname(canonicalSvgTarget));
      renameSync(svgTemp, canonicalSvgTarget);
      svgTemp = void 0;
      fsyncDirectoryIfSupported(path.dirname(canonicalSvgTarget));
      renameSync(artifactTemp, canonicalArtifactTarget);
      artifactTemp = void 0;
      fsyncDirectoryIfSupported(path.dirname(canonicalArtifactTarget));
    } else {
      publishNoReplace(svgTemp, canonicalSvgTarget);
      svgTemp = void 0;
      publishNoReplace(artifactTemp, canonicalArtifactTarget);
      artifactTemp = void 0;
    }
  } catch (error) {
    publicationError = error;
    throw error;
  } finally {
    removeTempBestEffort(svgTemp);
    removeTempBestEffort(artifactTemp);
    try {
      releaseEmissionLock(lock);
    } catch (error) {
      if (publicationError === void 0) throw error;
    }
  }
}
function parseArguments(args, grammar) {
  const allowedFlags = new Set(grammar.flags ?? []);
  const allowedValues = new Set(grammar.valueOptions ?? []);
  const seen = /* @__PURE__ */ new Set();
  const flags = /* @__PURE__ */ new Set();
  const values = /* @__PURE__ */ new Map();
  const positionals = [];
  let optionsEnded = false;
  for (let index = 0; index < args.length; index++) {
    const token = args[index];
    if (!optionsEnded && token === "--") {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && token !== "-" && token.startsWith("-")) {
      if (allowedFlags.has(token)) {
        if (seen.has(token)) {
          return { ok: false, message: "a singleton flag was supplied more than once" };
        }
        seen.add(token);
        flags.add(token);
        continue;
      }
      if (allowedValues.has(token)) {
        if (seen.has(token)) {
          return { ok: false, message: "a singleton option was supplied more than once" };
        }
        const value = args[index + 1];
        if (value === void 0 || value.length === 0 || value === "--" || value !== "-" && value.startsWith("-")) {
          return { ok: false, message: "an option is missing its required value" };
        }
        seen.add(token);
        values.set(token, value);
        index++;
        continue;
      }
      return { ok: false, message: "an unknown option was supplied" };
    }
    if (token.length === 0) {
      return { ok: false, message: "an empty positional argument was supplied" };
    }
    positionals.push(token);
  }
  if (positionals.length !== grammar.positionalCount) {
    return { ok: false, message: `expected exactly ${grammar.positionalCount} positional argument${grammar.positionalCount === 1 ? "" : "s"}` };
  }
  return { ok: true, args: { flags, values, positionals } };
}
function parseOrReport(args, grammar) {
  const parsed = parseArguments(args, grammar);
  if (parsed.ok) return parsed.args;
  process.stderr.write(`usage error: ${parsed.message}
`);
  return void 0;
}
function validateJsonFormat(parsed) {
  const format = parsed.values.get("--format");
  if (format === void 0 || format === "json") return true;
  process.stderr.write("usage error: --format accepts only json\n");
  return false;
}
function discoveryIdentity() {
  return {
    ...getBuildIdentity(),
    catalogDigestDomain: CATALOG_DIGEST_DOMAIN
  };
}
function describeSkillProjection(skill) {
  return {
    id: skill.id,
    revision: skill.revision,
    status: skill.status,
    availability: skill.availability,
    releaseReady: skill.releaseReady,
    title: skill.title,
    canonicalQuestion: skill.canonicalQuestion,
    cannotEstablish: skill.cannotEstablish,
    renderer: skill.renderer,
    semanticValidators: skill.semanticValidators,
    disclosures: skill.disclosures,
    budgets: skill.budgets,
    uncertaintySupport: skill.uncertaintySupport,
    accessibility: skill.accessibility,
    outputAuthority: skill.outputAuthority,
    evidence: skill.evidence,
    adapters: skill.adapters,
    legacyIds: skill.legacyIds,
    owner: skill.owner,
    knownLimitations: skill.knownLimitations
  };
}
function describeSkillSummaryProjection(skill) {
  return {
    id: skill.id,
    revision: skill.revision,
    title: skill.title,
    question: skill.canonicalQuestion,
    availability: skill.availability,
    releaseReady: skill.releaseReady,
    renderer: skill.renderer,
    adapters: skill.adapters.map((adapter) => ({
      mappingId: adapter.mappingId,
      feasibilityStatus: adapter.feasibilityStatus,
      definitionStatus: adapter.definitionStatus,
      implementationAvailability: adapter.implementationAvailability
    }))
  };
}
function utf16EditDistance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      current.push(Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + (left[leftIndex] === right[rightIndex] ? 0 : 1)
      ));
    }
    previous = current;
  }
  return previous[right.length];
}
function nearestStableSkillId(value) {
  if (value.length === 0 || value.length > 64 || !/^[a-z0-9._-]+$/u.test(value)) {
    return null;
  }
  const nearest = [...STABLE_SKILL_IDS].map((id) => ({ id, distance: utf16EditDistance(value, id) })).sort((left, right) => left.distance - right.distance || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))[0];
  return nearest !== void 0 && nearest.distance <= 3 ? nearest.id : null;
}
function cmdIdentity(args) {
  const parsed = parseOrReport(args, { flags: ["--json"], positionalCount: 0 });
  if (!parsed) return EXIT.usage;
  const identity = getBuildIdentity();
  if (parsed.flags.has("--json")) {
    writeCliJson(discoveryIdentity());
  } else {
    process.stdout.write(
      `Cortexel ${identity.packageVersion}
  request contract:  ${identity.requestContract}
  artifact contract: ${identity.artifactContract}
  contract digest:   ${identity.contractDigest}
  catalog digest:    ${identity.catalogDigest}
  catalog domain:    ${CATALOG_DIGEST_DOMAIN}
  stable skills:     ${identity.stableSkillCount}
  source revision:   ${identity.sourceRevision}
  release build:     ${identity.release}
`
    );
  }
  return EXIT.ok;
}
function cmdCatalog(args) {
  const parsed = parseOrReport(args, {
    flags: ["--include-experimental", "--json"],
    positionalCount: 0
  });
  if (!parsed) return EXIT.usage;
  const includeExperimental = parsed.flags.has("--include-experimental");
  if (parsed.flags.has("--json")) {
    const stable = STABLE_SKILL_IDS.map((id) => ({
      id,
      revision: SKILL_CATALOG[id].revision,
      title: SKILL_CATALOG[id].title,
      question: SKILL_CATALOG[id].canonicalQuestion,
      availability: SKILL_CATALOG[id].availability,
      releaseReady: SKILL_CATALOG[id].releaseReady,
      adapters: SKILL_CATALOG[id].adapters.map((adapter) => ({
        mappingId: adapter.mappingId,
        feasibilityStatus: adapter.feasibilityStatus,
        definitionStatus: adapter.definitionStatus,
        implementationAvailability: adapter.implementationAvailability
      }))
    }));
    const payload = {
      protocol: "cortexel-cli-catalog",
      protocolVersion: 1,
      buildIdentity: discoveryIdentity(),
      skills: stable
    };
    if (includeExperimental) payload.experimentalSkillIds = EXPERIMENTAL_CAPABILITY_IDS;
    writeCliJson(payload);
    return EXIT.ok;
  }
  process.stdout.write(`Stable catalog (${STABLE_SKILL_IDS.length}):
`);
  for (const id of STABLE_SKILL_IDS) {
    process.stdout.write(`  ${id.padEnd(32)} ${safeText(SKILL_CATALOG[id].title, 512)}
`);
  }
  if (includeExperimental) {
    process.stdout.write(
      `
Experimental FigureRequest skills (${EXPERIMENTAL_CAPABILITY_IDS.length}):
`
    );
    for (const id of EXPERIMENTAL_CAPABILITY_IDS) process.stdout.write(`  ${id}
`);
  } else {
    process.stdout.write(
      "\nThis revision has no experimental FigureRequest skills; --include-experimental is a forward-compatible skill-only opt-in.\n"
    );
  }
  return EXIT.ok;
}
function cmdDescribe(args) {
  const parsed = parseOrReport(args, {
    flags: ["--json"],
    valueOptions: ["--section"],
    positionalCount: 1
  });
  if (!parsed) return EXIT.usage;
  const section = parsed.values.get("--section") ?? "all";
  if (!["summary", "example", "schema", "all"].includes(section)) {
    process.stderr.write(
      "usage error: --section accepts summary, example, schema, or all\n"
    );
    return EXIT.usage;
  }
  if (parsed.values.has("--section") && !parsed.flags.has("--json")) {
    process.stderr.write("usage error: --section requires --json\n");
    return EXIT.usage;
  }
  const id = parsed.positionals[0];
  if (!isStableSkillId(id)) {
    if (parsed.flags.has("--json")) {
      writeCliJson({
        protocol: "cortexel-cli-error",
        protocolVersion: 1,
        buildIdentity: discoveryIdentity(),
        error: {
          code: "CLI_UNKNOWN_STABLE_SKILL",
          message: "Unknown stable skill id.",
          didYouMean: nearestStableSkillId(id),
          validSkillIds: STABLE_SKILL_IDS
        }
      }, process.stderr);
    } else {
      const suggestion = nearestStableSkillId(id);
      process.stderr.write(
        "usage error: unknown stable skill id" + (suggestion === null ? "\n" : `; did you mean ${suggestion}?
`)
      );
    }
    return EXIT.usage;
  }
  const skill = SKILL_CATALOG[id];
  if (parsed.flags.has("--json")) {
    const authoring = SKILL_AUTHORING[id];
    if (authoring === void 0) {
      process.stderr.write("internal error: stable authoring entry is unavailable\n");
      return EXIT.internal;
    }
    const payload = {
      protocol: "cortexel-cli-describe",
      protocolVersion: 1,
      buildIdentity: discoveryIdentity(),
      section,
      skill: section === "all" ? describeSkillProjection(skill) : describeSkillSummaryProjection(skill),
      acceptanceBoundary: {
        command: "cortexel validate <request.json>",
        note: "Structural schema success is not acceptance. Cortexel validation also runs identity, semantic, scientific, provenance, and request-budget gates. Use render --dry-run to prove derivation and output-budget acceptance."
      }
    };
    if (section === "example" || section === "all") {
      payload.authoringExample = authoring.authoringExample;
    }
    if (section === "schema" || section === "all") {
      payload.requestSchema = authoring.requestSchema;
      payload.schemaCompilationProfile = AUTHORING_SCHEMA_COMPILATION_PROFILE_V1;
      payload.schemaResources = STABLE_CATALOG_SCHEMA_RESOURCES;
    }
    writeCliJson(payload);
    return EXIT.ok;
  }
  process.stdout.write(
    `${skill.id}@${skill.revision} \u2014 ${safeText(skill.title, 512)}
Question: ${safeText(skill.canonicalQuestion, 4096)}
Availability: ${skill.availability}; release ready: ${skill.releaseReady}
Renderer: ${skill.renderer.id}@${skill.renderer.revision}
Source mappings (${skill.adapters.length}):
`
  );
  for (const adapter of skill.adapters) {
    process.stdout.write(
      `  ${adapter.mappingId}: ${adapter.feasibilityStatus}; ${adapter.definitionStatus}; ${adapter.implementationAvailability}
`
    );
    for (const source of adapter.sources) {
      process.stdout.write(
        `    ${source.role}: ${safeText(source.sourceId, 128)} (${safeText(source.system, 512)})
`
      );
    }
  }
  process.stdout.write(
    `Use "cortexel describe ${skill.id} --json --section example" for the synthetic request fixture, or --section schema/all for structural resources and the complete bundle.
`
  );
  return EXIT.ok;
}
function sourceDiscoveryIdentity() {
  return {
    buildIdentity: discoveryIdentity(),
    sourceAdapterCatalogDigest: SOURCE_ADAPTER_CATALOG_DIGEST,
    sourceAdapterCatalogDigestDomain: SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN
  };
}
function nearestSourceAdapterId(value) {
  if (value.length === 0 || value.length > 64 || !/^[a-z0-9._-]+$/u.test(value)) {
    return null;
  }
  const nearest = [...SOURCE_ADAPTER_IDS].map((id) => ({ id, distance: utf16EditDistance(value, id) })).sort((left, right) => left.distance - right.distance || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))[0];
  return nearest !== void 0 && nearest.distance <= 3 ? nearest.id : null;
}
function reportUnknownSourceAdapter(value, asJson) {
  const suggestion = nearestSourceAdapterId(value);
  if (asJson) {
    writeCliJson({
      protocol: "cortexel-cli-error",
      protocolVersion: 1,
      ...sourceDiscoveryIdentity(),
      error: {
        code: "CLI_UNKNOWN_SOURCE_ADAPTER",
        message: "Unknown executable source-adapter id.",
        didYouMean: suggestion,
        validSourceAdapterIds: SOURCE_ADAPTER_IDS
      }
    }, process.stderr);
  } else {
    process.stderr.write(
      "usage error: unknown executable source-adapter id" + (suggestion === null ? "\n" : `; did you mean ${suggestion}?
`)
    );
  }
  return EXIT.usage;
}
function cmdSourceCatalog(args) {
  const parsed = parseOrReport(args, { flags: ["--json"], positionalCount: 0 });
  if (!parsed) return EXIT.usage;
  if (parsed.flags.has("--json")) {
    writeCliJson({
      protocol: "cortexel-cli-source-catalog",
      protocolVersion: 1,
      ...sourceDiscoveryIdentity(),
      sourceAdapterCatalogDigestPreimage: SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE,
      adapters: SOURCE_ADAPTER_DISCOVERY_CATALOG.adapters
    });
    return EXIT.ok;
  }
  process.stdout.write(`Executable source adapters (${SOURCE_ADAPTER_IDS.length}):
`);
  for (const id of SOURCE_ADAPTER_IDS) {
    const descriptor = lookupSourceAdapter(id);
    process.stdout.write(
      `  ${id.padEnd(28)} ${safeText(descriptor.title, 512)}
`
    );
  }
  process.stdout.write(
    "\nCandidate mappings described by a skill are not executable unless listed here.\n"
  );
  return EXIT.ok;
}
function cmdSourceDescribe(args) {
  const parsed = parseOrReport(args, { flags: ["--json"], positionalCount: 1 });
  if (!parsed) return EXIT.usage;
  const id = parsed.positionals[0];
  if (!isSourceAdapterId(id)) {
    return reportUnknownSourceAdapter(id, parsed.flags.has("--json"));
  }
  const descriptor = lookupSourceAdapter(id);
  if (parsed.flags.has("--json")) {
    writeCliJson({
      protocol: "cortexel-cli-source-describe",
      protocolVersion: 1,
      ...sourceDiscoveryIdentity(),
      sourceAdapterDescriptorDigest: lookupSourceAdapterDescriptorDigest(id),
      sourceAdapterDescriptorDigestDomain: SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN,
      adapter: descriptor
    });
    return EXIT.ok;
  }
  process.stdout.write(
    `${descriptor.id}@${descriptor.revision} \u2014 ${safeText(descriptor.title, 512)}
Source: ${safeText(descriptor.sourceSystem, 256)} (${descriptor.admittedSourceVersions.join(", ")})
Output skill: ${descriptor.outputSkillId}
Command: ${descriptor.cli.command}
Direct render: ${descriptor.cli.renderCommand}
Use --json for the complete authority statement, limitations, and guarded template.
`
  );
  return EXIT.ok;
}
function cmdSourceExample(args) {
  const parsed = parseOrReport(args, { positionalCount: 1 });
  if (!parsed) return EXIT.usage;
  const id = parsed.positionals[0];
  if (!isSourceAdapterId(id)) return reportUnknownSourceAdapter(id, true);
  writeCliJson(lookupSourceAdapter(id).example);
  return EXIT.ok;
}
function adapterEnvelopeFailure(instancePath, message) {
  return [makeError({
    code: "ADAPTER_NEST_UNSUPPORTED_SHAPE",
    stage: "adapter",
    instancePath,
    message
  })];
}
function isPlainJsonRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function readSourceInput(input, asJson) {
  let text;
  try {
    text = readInput(input);
  } catch (error) {
    return { ok: false, exitCode: handleInputReadFailure(error, asJson) };
  }
  const parsed = parseJsonStrict(text, { limits: getBudgetLimits("standard") });
  if (!parsed.ok) {
    printDiagnostics(parsed.errors, asJson);
    return { ok: false, exitCode: exitCodeForErrors(parsed.errors) };
  }
  return { ok: true, value: parsed.value };
}
function prepareSourceRequest(id, value) {
  const exampleClassification = classifySourceAdapterExampleEnvelope(value);
  if (exampleClassification.kind !== "not_example") {
    return {
      ok: false,
      errors: adapterEnvelopeFailure(
        exampleClassification.kind === "template_only" ? "" : "/protocol",
        exampleClassification.kind === "template_only" ? `This is Cortexel's synthetic, template-only source example, not simulator output. Replace every synthetic value with a caller-owned detached NEST capture and authority record; then remove the options.${SOURCE_ADAPTER_EXAMPLE_GUARD_MEMBER} marker and submit only inputTemplate. Cortexel never strips the guard or relabels the fixture as simulation evidence.` : "This resembles a Cortexel source-example envelope but is not the exact closed version-1 shape. Generate a fresh template with `cortexel source example nest-spike-recorder`; do not delete or repair metadata to make synthetic values executable."
      )
    };
  }
  if (!isPlainJsonRecord(value)) {
    return {
      ok: false,
      errors: adapterEnvelopeFailure(
        "",
        "source-adapter input must be one object with exportedStatus and options members."
      )
    };
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== "exportedStatus" || keys[1] !== "options") {
    return {
      ok: false,
      errors: adapterEnvelopeFailure(
        "",
        "source-adapter input must contain exactly exportedStatus and options."
      )
    };
  }
  let adapted;
  switch (id) {
    case "nest-spike-recorder":
      adapted = nestSpikeRecorderToRaster(
        value.exportedStatus,
        value.options
      );
      break;
  }
  if (!adapted.ok) return { ok: false, errors: adapted.errors };
  const checked = validateRequestValue(adapted.request);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  try {
    return {
      ok: true,
      canonicalRequestText: `${canonicalize(checked.request.canonicalRequest)}
`
    };
  } catch {
    return { ok: false, internal: true };
  }
}
function reportPreparedSourceFailure(prepared, asJson) {
  if ("internal" in prepared) {
    writeInternalCliDiagnostic("adapted request canonicalization failed", asJson);
    return EXIT.internal;
  }
  printDiagnostics(prepared.errors, asJson);
  return exitCodeForErrors(prepared.errors);
}
function cmdSourceAdapt(args) {
  const parsed = parseOrReport(args, {
    valueOptions: ["--format"],
    positionalCount: 2
  });
  if (!parsed || !validateJsonFormat(parsed)) return EXIT.usage;
  const [id, input] = parsed.positionals;
  const asJson = parsed.values.get("--format") === "json";
  if (!isSourceAdapterId(id)) return reportUnknownSourceAdapter(id, asJson);
  const sourceInput = readSourceInput(input, asJson);
  if (!sourceInput.ok) return sourceInput.exitCode;
  const prepared = prepareSourceRequest(id, sourceInput.value);
  if (!prepared.ok) return reportPreparedSourceFailure(prepared, asJson);
  process.stdout.write(prepared.canonicalRequestText);
  return EXIT.ok;
}
function cmdSourceRender(args) {
  const parsed = parseOrReport(args, {
    flags: ["--force", "--dry-run"],
    valueOptions: ["--output", "--format"],
    positionalCount: 2
  });
  if (!parsed || !validateJsonFormat(parsed)) return EXIT.usage;
  const renderOptions = parseRenderInvocation(parsed);
  if (renderOptions === void 0) return EXIT.usage;
  const [id, input] = parsed.positionals;
  if (!isSourceAdapterId(id)) {
    return reportUnknownSourceAdapter(id, renderOptions.asJson);
  }
  const sourceInput = readSourceInput(input, renderOptions.asJson);
  if (!sourceInput.ok) return sourceInput.exitCode;
  const prepared = prepareSourceRequest(id, sourceInput.value);
  if (!prepared.ok) return reportPreparedSourceFailure(prepared, renderOptions.asJson);
  return finishFigureRender(
    buildFigureFromJson(prepared.canonicalRequestText),
    renderOptions,
    id
  );
}
function cmdSource(args) {
  const [subcommand, ...rest] = args;
  switch (subcommand) {
    case "catalog":
      return cmdSourceCatalog(rest);
    case "describe":
      return cmdSourceDescribe(rest);
    case "example":
      return cmdSourceExample(rest);
    case "adapt":
      return cmdSourceAdapt(rest);
    case "render":
      return cmdSourceRender(rest);
    default:
      process.stderr.write(
        "usage error: source requires catalog, describe, example, adapt, or render\n"
      );
      return EXIT.usage;
  }
}
function cmdValidate(args) {
  const parsed = parseOrReport(args, { valueOptions: ["--format"], positionalCount: 1 });
  if (!parsed || !validateJsonFormat(parsed)) return EXIT.usage;
  const input = parsed.positionals[0];
  const asJson = parsed.values.get("--format") === "json";
  let text;
  try {
    text = readInput(input);
  } catch (error) {
    return handleInputReadFailure(error, asJson);
  }
  const outcome = parseAndValidateRequest(text);
  if (outcome.ok) {
    if (asJson) {
      writeCliJson({
        ok: true,
        skill: outcome.request.skillId,
        requestDigest: outcome.request.requestDigest,
        inputAssurance: outcome.request.inputAssurance
      });
    } else {
      process.stdout.write(`valid: ${outcome.request.skillId} (${outcome.request.requestDigest})
`);
    }
    return EXIT.ok;
  }
  printDiagnostics(outcome.errors, asJson);
  return exitCodeForErrors(outcome.errors);
}
function parseRenderInvocation(parsed) {
  const output = parsed.values.get("--output");
  const force = parsed.flags.has("--force");
  const dryRun = parsed.flags.has("--dry-run");
  const asJson = parsed.values.get("--format") === "json";
  if (output === "-") {
    process.stderr.write("usage error: --output requires a filesystem path\n");
    return void 0;
  }
  if (output !== void 0 && (!output.endsWith(".svg") || path.basename(output).length <= ".svg".length)) {
    process.stderr.write("usage error: --output must name a nonempty .svg file\n");
    return void 0;
  }
  if (!dryRun && !output) {
    process.stderr.write("usage error: render requires --output <figure.svg> unless --dry-run is set\n");
    return void 0;
  }
  if (dryRun && output) {
    process.stderr.write("usage error: --dry-run cannot be combined with --output\n");
    return void 0;
  }
  if (dryRun && force) {
    process.stderr.write("usage error: --force requires --output\n");
    return void 0;
  }
  return { output, force, dryRun, asJson };
}
function sourceAdapterExecutionMetadata(id, result) {
  const requestDigest = result.artifact.provenance.requestDigest;
  return {
    id,
    revision: lookupSourceAdapter(id).revision,
    catalogDigest: SOURCE_ADAPTER_CATALOG_DIGEST,
    catalogDigestDomain: SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
    descriptorDigest: lookupSourceAdapterDescriptorDigest(id),
    descriptorDigestDomain: SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN,
    requestDigest,
    artifactDigest: result.artifact.artifactDigest,
    sourceAuthentication: "not_performed"
  };
}
function finishFigureRender(result, invocation, sourceAdapterId) {
  const { output, force, dryRun, asJson } = invocation;
  if (!result.ok) {
    printDiagnostics(result.errors, asJson);
    return exitCodeForErrors(result.errors);
  }
  const sourceExecution = sourceAdapterId === void 0 ? void 0 : sourceAdapterExecutionMetadata(sourceAdapterId, result);
  const sourceProtocol = sourceExecution === void 0 ? {} : {
    protocol: "cortexel-cli-source-render",
    protocolVersion: 1
  };
  const renderedSkill = result.artifact.canonicalRequest?.skill?.id ?? "figure";
  if (dryRun) {
    const svgByteLength = Buffer.byteLength(result.svg, "utf8");
    if (asJson) {
      writeCliJson({
        ...sourceProtocol,
        ok: true,
        dryRun: true,
        skill: renderedSkill,
        svgByteLength,
        tableRowsTotal: result.table.rowsTotal,
        ...sourceExecution === void 0 ? {} : { sourceAdapterExecution: sourceExecution }
      });
    } else {
      process.stdout.write(
        `would render ${renderedSkill}` + (sourceAdapterId === void 0 ? "" : ` via ${sourceAdapterId}`) + `: ${svgByteLength} SVG bytes, ${result.table.rowsTotal} in-memory table rows
`
      );
    }
    return EXIT.ok;
  }
  const svgTarget = output;
  const base = svgTarget.slice(0, -".svg".length);
  const artifactTarget = `${base}.artifact.json`;
  let artifactJson;
  try {
    artifactJson = canonicalize(result.artifact);
  } catch {
    writeInternalCliDiagnostic("artifact canonicalization failed", asJson);
    return EXIT.internal;
  }
  try {
    writeFigureEmission(svgTarget, result.svg, artifactTarget, artifactJson, force);
    if (asJson) {
      writeCliJson({
        ...sourceProtocol,
        ok: true,
        dryRun: false,
        skill: renderedSkill,
        artifactDigest: result.artifact.artifactDigest,
        outputs: result.artifact.outputs,
        tableSidecar: null,
        ...sourceExecution === void 0 ? {} : { sourceAdapterExecution: sourceExecution }
      });
    } else {
      process.stdout.write(
        "wrote figure SVG and completion artifact" + (sourceAdapterId === void 0 ? "" : ` via ${sourceAdapterId}`) + " (no canonical table sidecar)\n"
      );
    }
  } catch (error) {
    writeOutputIoDiagnostic(error, asJson);
    return EXIT.io;
  }
  return EXIT.ok;
}
function cmdRender(args) {
  const parsed = parseOrReport(args, {
    flags: ["--force", "--dry-run"],
    valueOptions: ["--output", "--format"],
    positionalCount: 1
  });
  if (!parsed || !validateJsonFormat(parsed)) return EXIT.usage;
  const invocation = parseRenderInvocation(parsed);
  if (invocation === void 0) return EXIT.usage;
  const input = parsed.positionals[0];
  let text;
  try {
    text = readInput(input);
  } catch (error) {
    return handleInputReadFailure(error, invocation.asJson);
  }
  return finishFigureRender(buildFigureFromJson(text), invocation);
}
function cmdInspect(args) {
  const parsed = parseOrReport(args, { positionalCount: 1 });
  if (!parsed) return EXIT.usage;
  const input = parsed.positionals[0];
  let text;
  try {
    text = readInput(input);
  } catch (error) {
    return handleInputReadFailure(error, false);
  }
  const outcome = parseAndValidateRequest(text);
  if (!outcome.ok) {
    printDiagnostics(outcome.errors, false);
    return exitCodeForErrors(outcome.errors);
  }
  const catalog = SKILL_CATALOG[outcome.request.skillId];
  process.stdout.write(
    `skill:        ${outcome.request.skillId} (rev ${outcome.request.skillRevision})
renderer:     ${catalog.renderer.id}
requestDigest:${outcome.request.requestDigest}
assurance:    ${outcome.request.inputAssurance.duplicateKeys}
disclosures:  ${catalog.disclosures.length} possible rules
`
  );
  return EXIT.ok;
}
function cmdMigrate(args) {
  const parsedArgs = parseOrReport(args, { positionalCount: 1 });
  if (!parsedArgs) return EXIT.usage;
  const input = parsedArgs.positionals[0];
  let text;
  try {
    text = readInput(input);
  } catch (error) {
    return handleInputReadFailure(error, true);
  }
  const parsed = parseJsonStrict(text, { limits: getBudgetLimits("standard") });
  if (!parsed.ok) {
    printDiagnostics(parsed.errors, true);
    return exitCodeForErrors(parsed.errors);
  }
  const result = migrateLegacyRequest(parsed.value);
  writeCliJson(result);
  return result.report.errors.length > 0 ? EXIT.semantic : EXIT.ok;
}
var USAGE = `Cortexel \u2014 provenance-first scientific figure contracts

Usage:
  cortexel identity [--json]
  cortexel catalog  [--include-experimental] [--json]
  cortexel describe <stable-skill-id> [--json [--section summary|example|schema|all]]
  cortexel source catalog [--json]
  cortexel source describe <source-adapter-id> [--json]
  cortexel source example <source-adapter-id>
  cortexel source adapt <source-adapter-id> <input|-> [--format json]
  cortexel source render <source-adapter-id> <input|-> --output figure.svg [--force] [--format json]
  cortexel source render <source-adapter-id> <input|-> --dry-run [--format json]
  cortexel validate <input|-> [--format json]
  cortexel render   <input|-> --output figure.svg [--force] [--format json]
  cortexel render   <input|-> --dry-run [--format json]
  cortexel inspect  <input|->
  cortexel migrate  <input|->

In a repository checkout, replace cortexel with: bun src/cli/main.ts
Both forms are offline. There is no network access, no shell hook, and no --url.
Output publication is not a two-file transaction. The host must provide a trusted output directory.
Exit codes: 0 ok, 2 usage, 3 parse, 4 schema, 5 semantic, 6 budget, 7 I/O, 8 internal.
`;
var CLI_HANDLERS = {
  identity: cmdIdentity,
  catalog: cmdCatalog,
  describe: cmdDescribe,
  source: cmdSource,
  validate: cmdValidate,
  render: cmdRender,
  inspect: cmdInspect,
  migrate: cmdMigrate
};
function run(argv) {
  const [command, ...args] = argv;
  if (CLI_COMMANDS.includes(command ?? "")) {
    return CLI_HANDLERS[command](args);
  }
  switch (command) {
    case void 0:
      process.stdout.write(USAGE);
      return EXIT.usage;
    case "--help":
    case "-h":
    case "help": {
      if (args.length > 0) {
        process.stderr.write(`usage error: help accepts no arguments

${USAGE}`);
        return EXIT.usage;
      }
      process.stdout.write(USAGE);
      return EXIT.ok;
    }
    default:
      process.stderr.write(`usage error: unknown command

${USAGE}`);
      return EXIT.usage;
  }
}
function isDirectExecution() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(path.resolve(entry)) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
function installDirectPipeErrorHandlers() {
  process.stdout.on("error", (error) => {
    if (error.code === "EPIPE") {
      process.exitCode = EXIT.ok;
      return;
    }
    throw error;
  });
  process.stderr.on("error", (error) => {
    if (error.code === "EPIPE") return;
    throw error;
  });
}
if (isDirectExecution()) {
  installDirectPipeErrorHandlers();
  process.exitCode = run(process.argv.slice(2));
}
export {
  CLI_COMMANDS,
  exitCodeForErrors,
  run,
  serializeCliJson
};
//# sourceMappingURL=main.js.map