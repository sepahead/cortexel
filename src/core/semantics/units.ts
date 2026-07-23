/**
 * Unit and dimension rules.
 *
 * Walks every quantity in the request and checks two things: that its unit code is
 * canonical, and that the unit's dimension matches what the quantity claims to be.
 *
 * The second check is what stops a whole class of plausible-looking nonsense. A
 * calcium concentration and a membrane potential are both "an array of numbers over
 * time". Nothing structural distinguishes them. Overlaying them on one axis produces
 * a figure that looks exactly like a comparison and is not one — and no reviewer
 * looking at the picture can tell.
 */

import {
  checkQuantityUnit,
  dimensionOf,
  isKnownUnit,
  isQuantityKind,
  kindAcceptsDimension,
  resolveAlias,
} from '../units.js';
import { makeError, pointer, type CortexelError } from '../errors.js';
import {
  asArray,
  asRecord,
  asString,
  type SemanticContext,
  type SemanticValidator,
} from './types.js';

/**
 * Closed property-name vocabulary for scalar unit-code claims.
 *
 * Most contract records use the ordinary `unit` member. Two stable request fields are
 * deliberately scalar because they qualify a neighbouring numeric array or select an
 * output axis. Keeping those exceptions here is safer than treating every string whose
 * name happens to end in "Unit" as physical metadata. A source-schema closure test pins
 * this tuple to every direct `$defs/unitCode` property in the common and skill schemas.
 */
export const UNIT_CODE_PROPERTY_NAMES = Object.freeze([
  'alignmentUnit',
  'unit',
  'valueUnit',
] as const);

/**
 * Find every object that looks like a quantity — has both a `kind` and a `unit` —
 * anywhere in the request, and report its path.
 *
 * Structural rather than a fixed list of pointers, so a new field in a skill
 * contract is covered the moment it exists rather than the moment someone
 * remembers to add it here.
 */
function collectQuantities(
  node: unknown,
  path: (string | number)[],
  out: { kind: string; unit: string; path: (string | number)[] }[],
): void {
  if (node === null || typeof node !== 'object') return;

  const pending: { node: object; path: (string | number)[] }[] = [{ node, path }];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (Array.isArray(current.node)) {
      for (let i = current.node.length - 1; i >= 0; i--) {
        const child = current.node[i];
        if (child !== null && typeof child === 'object') {
          pending.push({ node: child, path: [...current.path, i] });
        }
      }
      continue;
    }

    const record = current.node as Record<string, unknown>;
    const kind = asString(record.kind);
    const unit = asString(record.unit);
    if (kind !== undefined && unit !== undefined && isQuantityKind(kind)) {
      out.push({ kind, unit, path: current.path });
    }

    const keys = Object.keys(record);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      const child = record[key];
      if (child !== null && typeof child === 'object') {
        pending.push({ node: child, path: [...current.path, key] });
      }
    }
  }
}

/** Bare unit fields that carry no `kind` — a window, a bin spec, an uncertainty. */
function collectBareUnits(
  node: unknown,
  path: (string | number)[],
  out: { unit: string; path: (string | number)[] }[],
): void {
  if (node === null || typeof node !== 'object') return;

  const pending: { node: object; path: (string | number)[] }[] = [{ node, path }];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (Array.isArray(current.node)) {
      for (let i = current.node.length - 1; i >= 0; i--) {
        const child = current.node[i];
        if (child !== null && typeof child === 'object') {
          pending.push({ node: child, path: [...current.path, i] });
        }
      }
      continue;
    }

    const record = current.node as Record<string, unknown>;
    const kind = asString(record.kind);
    for (const property of UNIT_CODE_PROPERTY_NAMES) {
      const unit = asString(record[property]);
      if (unit === undefined) continue;
      // A registered `{kind, unit}` quantity is owned by unitDimensionMatch, whose
      // shared check emits the canonical-code repair before considering dimension.
      // The two scalar exceptions have no `kind` sibling and remain owned here.
      if (property === 'unit' && kind !== undefined && isQuantityKind(kind)) continue;
      out.push({ unit, path: [...current.path, property] });
    }

    const keys = Object.keys(record);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      const child = record[key];
      if (child !== null && typeof child === 'object') {
        pending.push({ node: child, path: [...current.path, key] });
      }
    }
  }
}

/**
 * Return a registered unit only when a neighbouring registered quantity kind owns
 * it legally. The ordinary quantity walk reports an illegal kind/unit pair; a
 * relational check must not pile a second, derivative diagnostic on top of it.
 */
export function legalKnownUnit(node: Record<string, unknown> | undefined): string | undefined {
  const unit = asString(node?.unit);
  if (unit === undefined || !isKnownUnit(unit)) return undefined;
  const kind = asString(node?.kind);
  if (kind !== undefined && isQuantityKind(kind)) {
    const dimension = dimensionOf(unit);
    if (dimension === undefined || !kindAcceptsDimension(kind, dimension)) return undefined;
  }
  return unit;
}

/**
 * Whether a source quantity can be represented in a bound display/axis unit.
 * Simulator-defined codes have no conversion relation, even to another code in the
 * same registry dimension; exact code identity is the only no-conversion case.
 */
function unitsCanShareBoundAxis(sourceUnit: string, targetUnit: string): boolean {
  const sourceDimension = dimensionOf(sourceUnit);
  const targetDimension = dimensionOf(targetUnit);
  if (sourceDimension === undefined || targetDimension === undefined) return false;
  if (sourceDimension === 'simulator_defined' || targetDimension === 'simulator_defined') {
    return sourceUnit === targetUnit;
  }
  return sourceDimension === targetDimension;
}

function contextualMismatch(
  path: readonly (string | number)[],
  message: string,
): CortexelError {
  return makeError({
    code: 'SCIENCE_UNIT_DIMENSION_MISMATCH',
    stage: 'science',
    instancePath: pointer(...path),
    validatorId: 'unit.dimension_match',
    message,
  });
}

function requireTimeUnit(
  node: Record<string, unknown> | undefined,
  path: readonly (string | number)[],
  meaning: string,
): CortexelError[] {
  const unit = asString(node?.unit);
  if (unit === undefined || !isKnownUnit(unit) || dimensionOf(unit) === 'time') return [];
  return [contextualMismatch(
    [...path, 'unit'],
    `${meaning} is a time interval and cannot carry unit "${unit}" (dimension ${String(dimensionOf(unit))}). Use a canonical time unit.`,
  )];
}

const UNOWNED_TIME_BIN_SKILLS = Object.freeze([
  'network.delay_distribution',
  'neuro.isi_distribution',
] as const);

/**
 * Three stable bare time axes have no more-specific scientific validator. Other
 * windows, bin specs, lag ranges, and PSTH alignment fields are deliberately owned
 * by their skill validators; checking them here as well would emit two diagnostics
 * for one defect and make the repair boundary ambiguous.
 */
function timeAxisContextualUnits(context: SemanticContext): CortexelError[] {
  const data = asRecord(context.request.data) ?? {};
  const parameters = asRecord(context.request.parameters) ?? {};
  const errors: CortexelError[] = [];
  if ((UNOWNED_TIME_BIN_SKILLS as readonly string[]).includes(context.skillId)) {
    errors.push(...requireTimeUnit(
      asRecord(parameters.bins),
      ['parameters', 'bins'],
      'bin axis',
    ));
  }
  if (context.skillId === 'neuro.population_rate') {
    errors.push(...requireTimeUnit(
      asRecord(data.binEdges),
      ['data', 'binEdges'],
      'pre-binned axis',
    ));
  }
  return errors;
}

/** Contextual claims in the weight-trace schema that do not have their own kind. */
function weightTraceContextualUnits(context: SemanticContext): CortexelError[] {
  if (context.skillId !== 'network.synaptic_weight_trace') return [];
  const data = asRecord(context.request.data) ?? {};
  const errors: CortexelError[] = [];
  const series = asArray(data.series) ?? [];

  for (let index = 0; index < series.length; index++) {
    const entry = asRecord(series[index]);
    if (!entry) continue;
    errors.push(...requireTimeUnit(
      asRecord(entry.recordedInterval),
      ['data', 'series', index, 'recordedInterval'],
      `series ${index}'s recordedInterval`,
    ));

    const valueUnit = legalKnownUnit(asRecord(entry.values));
    if (valueUnit === undefined) continue;
    const references = [
      {
        node: asRecord(asRecord(entry.initialWeight)?.quantity),
        path: ['data', 'series', index, 'initialWeight', 'quantity'] as const,
        label: 'initial weight',
      },
      {
        node: asRecord(asRecord(entry.bounds)?.lower),
        path: ['data', 'series', index, 'bounds', 'lower'] as const,
        label: 'lower bound',
      },
      {
        node: asRecord(asRecord(entry.bounds)?.upper),
        path: ['data', 'series', index, 'bounds', 'upper'] as const,
        label: 'upper bound',
      },
    ];
    for (const reference of references) {
      const unit = legalKnownUnit(reference.node);
      if (unit === undefined || unitsCanShareBoundAxis(unit, valueUnit)) continue;
      errors.push(contextualMismatch(
        [...reference.path, 'unit'],
        `series ${index}'s ${reference.label} is in "${unit}" but its observed weights are in "${valueUnit}". A reference line must be convertible onto the weight axis; simulator-defined weights require exact code identity.`,
      ));
    }
  }

  errors.push(...requireTimeUnit(
    asRecord(data.membership),
    ['data', 'membership'],
    'aggregate membership',
  ));
  return errors;
}

/** A pre-binned weight axis is still a synaptic-weight quantity despite lacking `kind`. */
function weightDistributionContextualUnits(context: SemanticContext): CortexelError[] {
  if (context.skillId !== 'network.weight_distribution') return [];
  const data = asRecord(context.request.data) ?? {};
  if (data.mode === 'prebinned') {
    const binEdges = asRecord(data.binEdges);
    const unit = asString(binEdges?.unit);
    if (unit === undefined || !isKnownUnit(unit)) return [];
    const dimension = dimensionOf(unit);
    if (dimension !== undefined && kindAcceptsDimension('synaptic_weight', dimension)) return [];
    return [contextualMismatch(
      ['data', 'binEdges', 'unit'],
      `pre-binned weight edges are a synaptic-weight axis, but "${unit}" has dimension ${String(dimension)}. Synaptic weights accept only the registry dimensions declared for kind "synaptic_weight".`,
    )];
  }

  if (data.mode === 'connections') {
    const parameters = asRecord(context.request.parameters) ?? {};
    const binUnit = asString(asRecord(parameters.bins)?.unit);
    const weightUnit = legalKnownUnit(asRecord(asRecord(data.connections)?.weights));
    if (
      binUnit === undefined || !isKnownUnit(binUnit) || weightUnit === undefined ||
      unitsCanShareBoundAxis(binUnit, weightUnit)
    ) return [];
    return [contextualMismatch(
      ['parameters', 'bins', 'unit'],
      `connection-weight bins are in "${binUnit}" but the observed weights are in "${weightUnit}". Bin edges must be convertible onto the observed weight axis; simulator-defined weights require exact code identity.`,
    )];
  }
  return [];
}

/** Bind every multisignal panel unit to the series the caller assigned to it. */
function multisignalPanelContextualUnits(context: SemanticContext): CortexelError[] {
  if (context.skillId !== 'neuro.multisignal_trace') return [];
  const data = asRecord(context.request.data) ?? {};
  const parameters = asRecord(context.request.parameters) ?? {};
  const series = asArray(data.series) ?? [];
  const panels = asArray(parameters.panels) ?? [];
  const normalized = parameters.layout === 'normalized_overlay';
  const errors: CortexelError[] = [];

  for (let panelIndex = 0; panelIndex < panels.length; panelIndex++) {
    const panel = asRecord(panels[panelIndex]);
    const panelId = asString(panel?.panelId);
    const panelUnit = legalKnownUnit(panel);
    if (panelId === undefined || panelUnit === undefined) continue;
    const members = series.flatMap((candidate, seriesIndex) => {
      const entry = asRecord(candidate);
      if (asString(entry?.panelId) !== panelId) return [];
      const unit = legalKnownUnit(asRecord(entry?.values));
      return unit === undefined ? [] : [{ seriesIndex, unit }];
    });

    if (normalized) {
      for (const member of members) {
        if (dimensionOf(member.unit) !== 'simulator_defined') continue;
        errors.push(contextualMismatch(
          ['data', 'series', member.seriesIndex, 'values', 'unit'],
          `series ${member.seriesIndex} uses simulator-defined unit "${member.unit}", which has no portable affine normalization. A normalized overlay may compare independently normalized physical quantities, never an opaque model-defined scale.`,
        ));
      }
      continue;
    }

    const simulatorMembers = members.filter(
      (member) => dimensionOf(member.unit) === 'simulator_defined',
    );
    if (simulatorMembers.length > 0 && members.length !== 1) {
      errors.push(contextualMismatch(
        ['parameters', 'panels', panelIndex, 'unit'],
        `panel "${panelId}" contains a simulator-defined quantity and ${members.length} total series. An opaque model-defined unit must occupy a panel alone because its code establishes no cross-series comparability.`,
      ));
      continue;
    }
    for (const member of members) {
      if (unitsCanShareBoundAxis(member.unit, panelUnit)) continue;
      errors.push(contextualMismatch(
        ['parameters', 'panels', panelIndex, 'unit'],
        `panel "${panelId}" displays unit "${panelUnit}" but series ${member.seriesIndex} is in "${member.unit}". A panel may change scale within one registered dimension, never physical meaning.`,
      ));
      break;
    }
  }
  return errors;
}

/** Bind every phase-plane state-space carrier to its declared x or y axis. */
function phasePlaneContextualUnits(context: SemanticContext): CortexelError[] {
  if (context.skillId !== 'neuro.phase_plane') return [];
  const data = asRecord(context.request.data) ?? {};
  const axes = asRecord(data.axes) ?? {};
  const trajectories = asRecord(data.trajectories);
  const vectorField = asRecord(data.vectorField);
  const fieldDomain = asRecord(vectorField?.domain);
  const nullclines = asRecord(data.nullclines);
  const fixedPoints = asRecord(data.fixedPoints);
  const errors: CortexelError[] = [];

  for (const coordinate of ['x', 'y'] as const) {
    const axisUnit = legalKnownUnit(asRecord(axes[coordinate]));
    if (axisUnit === undefined) continue;
    const carriers = [
      {
        node: asRecord(trajectories?.[coordinate]),
        path: ['data', 'trajectories', coordinate] as const,
        label: 'trajectory coordinates',
      },
      {
        node: asRecord(vectorField?.[coordinate]),
        path: ['data', 'vectorField', coordinate] as const,
        label: 'vector-field coordinates',
      },
      {
        node: asRecord(fieldDomain?.[coordinate]),
        path: ['data', 'vectorField', 'domain', coordinate] as const,
        label: 'vector-field domain',
      },
      {
        node: asRecord(nullclines?.[coordinate]),
        path: ['data', 'nullclines', coordinate] as const,
        label: 'nullcline coordinates',
      },
      {
        node: asRecord(fixedPoints?.[coordinate]),
        path: ['data', 'fixedPoints', coordinate] as const,
        label: 'fixed-point coordinates',
      },
    ];
    for (const carrier of carriers) {
      const unit = legalKnownUnit(carrier.node);
      if (unit === undefined || unitsCanShareBoundAxis(unit, axisUnit)) continue;
      errors.push(contextualMismatch(
        [...carrier.path, 'unit'],
        `phase-plane ${coordinate}-axis unit "${axisUnit}" is incompatible with ${carrier.label} in "${unit}". Every state-space carrier must be convertible onto the axis it inhabits.`,
      ));
    }
  }
  return errors;
}

function bindUncertaintyUnit(
  errors: CortexelError[],
  uncertainty: Record<string, unknown> | undefined,
  values: Record<string, unknown> | undefined,
  path: readonly (string | number)[],
  label: string,
): void {
  const uncertaintyUnit = legalKnownUnit(uncertainty);
  const valueUnit = legalKnownUnit(values);
  if (
    uncertaintyUnit === undefined || valueUnit === undefined ||
    unitsCanShareBoundAxis(uncertaintyUnit, valueUnit)
  ) return;
  errors.push(contextualMismatch(
    [...path, 'unit'],
    `${label} is in "${uncertaintyUnit}" but qualifies values in "${valueUnit}". A dispersion or interval bound has the same physical dimension as the estimate it qualifies.`,
  ));
}

/** Bind every supported trace uncertainty variant to the values it qualifies. */
function traceUncertaintyContextualUnits(context: SemanticContext): CortexelError[] {
  const data = asRecord(context.request.data) ?? {};
  const parameters = asRecord(context.request.parameters) ?? {};
  const errors: CortexelError[] = [];

  if (context.skillId === 'neuro.multisignal_trace') {
    const series = asArray(data.series) ?? [];
    for (let index = 0; index < series.length; index++) {
      const entry = asRecord(series[index]);
      bindUncertaintyUnit(
        errors,
        asRecord(entry?.uncertainty),
        asRecord(entry?.values),
        ['data', 'series', index, 'uncertainty'],
        `series ${index}'s uncertainty`,
      );
    }
    return errors;
  }

  if (context.skillId === 'network.synaptic_weight_trace') {
    const series = asArray(data.series) ?? [];
    for (let index = 0; index < series.length; index++) {
      const entry = asRecord(series[index]);
      bindUncertaintyUnit(
        errors,
        asRecord(entry?.uncertainty),
        asRecord(entry?.values),
        ['data', 'series', index, 'uncertainty'],
        `series ${index}'s uncertainty`,
      );
    }
    const aggregate = asRecord(data.aggregate);
    bindUncertaintyUnit(
      errors,
      asRecord(aggregate?.uncertainty),
      asRecord(aggregate?.values),
      ['data', 'aggregate', 'uncertainty'],
      'aggregate uncertainty',
    );
    return errors;
  }

  if (
    context.skillId === 'neuro.analog_trace' ||
    context.skillId === 'neuro.compartment_trace'
  ) {
    const uncertainty = asRecord(parameters.uncertainty);
    const series = asArray(data.series) ?? [];
    for (let index = 0; index < series.length; index++) {
      const previousErrorCount = errors.length;
      bindUncertaintyUnit(
        errors,
        uncertainty,
        asRecord(asRecord(series[index])?.values),
        ['parameters', 'uncertainty'],
        `figure uncertainty for series ${index}`,
      );
      // One figure-level unit has one repair target. A second incompatible series
      // does not justify repeating the identical diagnostic at the same pointer.
      if (errors.length > previousErrorCount) break;
    }
  }
  return errors;
}

function contextualUnitDimensionErrors(context: SemanticContext): CortexelError[] {
  return [
    ...timeAxisContextualUnits(context),
    ...weightTraceContextualUnits(context),
    ...weightDistributionContextualUnits(context),
    ...multisignalPanelContextualUnits(context),
    ...phasePlaneContextualUnits(context),
    ...traceUncertaintyContextualUnits(context),
  ];
}

export const unitDimensionMatch: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const quantities: { kind: string; unit: string; path: (string | number)[] }[] = [];
  // Walk the closed request envelope, not only today's data/parameters locations.
  // The source-schema closure gate then remains sound if a future reviewed common
  // type places a physical unit under another envelope branch.
  collectQuantities(context.request, [], quantities);

  const errors: CortexelError[] = [];
  for (const quantity of quantities) {
    errors.push(
      ...checkQuantityUnit(
        quantity.kind,
        quantity.unit,
        [...quantity.path, 'unit'],
        'unit.dimension_match',
      ),
    );
  }
  errors.push(...contextualUnitDimensionErrors(context));
  return errors;
};

export const unitCanonicalCode: SemanticValidator = (
  context: SemanticContext,
): CortexelError[] => {
  const bare: { unit: string; path: (string | number)[] }[] = [];
  collectBareUnits(context.request, [], bare);

  const errors: CortexelError[] = [];
  for (const entry of bare) {
    if (isKnownUnit(entry.unit)) continue;

    const at = entry.path
      .map((segment) => `/${String(segment).replace(/~/g, '~0').replace(/\//g, '~1')}`)
      .join('');
    const canonical = resolveAlias(entry.unit);

    if (canonical !== undefined) {
      errors.push(
        makeError({
          code: 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
          stage: 'science',
          instancePath: at,
          validatorId: 'unit.canonical_code',
          message: `"${entry.unit}" is an accepted alias, not a canonical code. Use "${canonical}". Cortexel does not convert it silently: a conversion the caller never sees is a number the caller never checked.`,
          repair: {
            operation: 'replace',
            path: at,
            value: canonical,
            reasonCode: 'SCIENCE_UNIT_ALIAS_NOT_CANONICAL',
          },
        }),
      );
    } else {
      errors.push(
        makeError({
          code: 'SCHEMA_ENUM_MISMATCH',
          stage: 'structural',
          instancePath: at,
          validatorId: 'unit.canonical_code',
          message: `"${entry.unit}" is not a unit code in the registry.`,
        }),
      );
    }
  }
  return errors;
};
