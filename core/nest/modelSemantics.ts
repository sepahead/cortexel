import { z } from 'zod';
import { SAFE_DISPLAY_STRING_PATTERN } from '../safeRuntime';
import { parseNestInput } from './safeInput';

export const SYNAPSE_MEASUREMENT_FIELD_SEMANTICS = Object.freeze([
  'effective',
  'ignored',
  'unknown',
] as const);

export type SynapseMeasurementFieldSemantics =
  (typeof SYNAPSE_MEASUREMENT_FIELD_SEMANTICS)[number];

export interface SynapseModelMeasurementSemantics {
  synapseModel: string;
  weight: SynapseMeasurementFieldSemantics;
  delay: SynapseMeasurementFieldSemantics;
}

export type SynapseMeasurementChannel = 'weight' | 'delay';

const SYNAPSE_MODEL_SEMANTICS_MAXIMUM = 100_000;
const synapseModelNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(SAFE_DISPLAY_STRING_PATTERN);

const SynapseModelMeasurementSemanticsSchema = z
  .object({
    synapseModel: synapseModelNameSchema,
    weight: z.enum(SYNAPSE_MEASUREMENT_FIELD_SEMANTICS),
    delay: z.enum(SYNAPSE_MEASUREMENT_FIELD_SEMANTICS),
  })
  .strict();

/** Bound declarations before semantic set comparison can amplify host input. */
export function boundedSynapseModelMeasurementSemanticsSchema(maximum: number) {
  return z.array(SynapseModelMeasurementSemanticsSchema).max(maximum);
}

const KNOWN_IGNORED_CHANNELS = new Map<string, ReadonlySet<SynapseMeasurementChannel>>([
  // NEST main 182eba446a8b89108f21cd2ad54aa4c667afd86a:
  // these are the exact connection types whose set_delay rejects a supplied
  // value; diffusion_connection alone also rejects per-connection weight.
  // Base Connection::get_status can still report delay, and diffusion's
  // get_status reports its unused weight_, so raw field presence is not proof
  // that the model uses the measurement.
  ['gap_junction', new Set(['delay'])],
  ['rate_connection_instantaneous', new Set(['delay'])],
  ['diffusion_connection', new Set(['weight', 'delay'])],
]);

const SynapseModelSemanticsValidationInputSchema = z
  .object({
    synapseModels: z
      .array(synapseModelNameSchema)
      .max(SYNAPSE_MODEL_SEMANTICS_MAXIMUM)
      .optional(),
    declarations: boundedSynapseModelMeasurementSemanticsSchema(
      SYNAPSE_MODEL_SEMANTICS_MAXIMUM,
    ).optional(),
    presentChannels: z
      .array(z.enum(['weight', 'delay']))
      .max(2),
  })
  .strict();

export type SynapseModelSemanticsValidation =
  | { ok: true }
  | { ok: false; errors: string[] };

/**
 * Bind a complete per-model host declaration to the exact observed model set.
 *
 * The three exact built-in names below have official NEST semantics that cannot
 * be relabelled by a caller. Custom and copied names are not inferred: their
 * meaning remains an explicit, truthfulness-sensitive host declaration.
 */
export function validateSynapseModelMeasurementSemantics(
  synapseModels: unknown,
  declarations: unknown,
  presentChannels: unknown,
): SynapseModelSemanticsValidation {
  const parsed = parseNestInput(SynapseModelSemanticsValidationInputSchema, {
    synapseModels,
    declarations,
    presentChannels,
  });
  if (!parsed.ok) return parsed;
  const safeModels = parsed.data.synapseModels;
  const safeDeclarations = parsed.data.declarations;
  const safePresentChannels = parsed.data.presentChannels;

  if (safePresentChannels.length === 0) {
    return (safeDeclarations?.length ?? 0) === 0
      ? { ok: true }
      : {
        ok: false,
        errors: [
          'synapseModelSemantics: nonempty declarations are not allowed when no weight or delay channel is present',
        ],
      };
  }
  if (safeModels === undefined) {
    return {
      ok: false,
      errors: ['synapse_model: a complete per-connection model channel is required'],
    };
  }
  if (safeDeclarations === undefined) {
    return {
      ok: false,
      errors: [
        'synapseModelSemantics: declarations are required when a weight or delay channel is present',
      ],
    };
  }

  const observed = new Set(safeModels);
  const byModel = new Map<string, SynapseModelMeasurementSemantics>();
  for (let index = 0; index < safeDeclarations.length; index++) {
    const declaration = safeDeclarations[index];
    if (byModel.has(declaration.synapseModel)) {
      return {
        ok: false,
        errors: [
          `synapseModelSemantics.${index}: duplicate declaration for observed model ${JSON.stringify(declaration.synapseModel)}`,
        ],
      };
    }
    byModel.set(declaration.synapseModel, declaration);
  }

  for (const model of byModel.keys()) {
    if (!observed.has(model)) {
      return {
        ok: false,
        errors: [
          `synapseModelSemantics: declaration for unobserved model ${JSON.stringify(model)} is not allowed`,
        ],
      };
    }
  }
  for (const model of observed) {
    if (!byModel.has(model)) {
      return {
        ok: false,
        errors: [
          `synapseModelSemantics: missing declaration for observed model ${JSON.stringify(model)}`,
        ],
      };
    }
  }

  for (const [model, declaration] of byModel) {
    const knownIgnored = KNOWN_IGNORED_CHANNELS.get(model);
    if (knownIgnored) {
      for (const channel of knownIgnored) {
        if (declaration[channel] === 'effective') {
          return {
            ok: false,
            errors: [
              `synapseModelSemantics: ${JSON.stringify(model)} ${channel} is ignored by official NEST semantics and cannot be declared effective`,
            ],
          };
        }
      }
    }
    for (const channel of safePresentChannels) {
      if (declaration[channel] !== 'effective') {
        return {
          ok: false,
          errors: [
            `synapseModelSemantics: observed model ${JSON.stringify(model)} declares present ${channel} channel ${declaration[channel]}; every rendered measurement must be effective`,
          ],
        };
      }
    }
  }
  return { ok: true };
}
