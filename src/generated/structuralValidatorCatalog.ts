/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Produced by scripts/generate-contract.ts from contract/schemas/ and contract/ (digest).
 * Edit the normative source and run `bun run generate`.
 * `bun run check:generated` fails if this file drifts from its source.
 */

import type { ValidateFunction } from 'ajv';
import * as validators from './structuralValidators.js';

/** Precompiled functions for the complete exact offline structural resource closure. */
export const STRUCTURAL_VALIDATOR_CONTRACT_DIGEST = "sha256:3c5c60c5a1751ce94c17a08601d49b94114b06c5fd50f5810e0ab354175c9bfc";
export const STRUCTURAL_VALIDATORS: Readonly<Record<string, ValidateFunction>> = Object.freeze({
  "schemas/common.v1.schema.json": validators.validateSchema0,
  "schemas/figure-artifact.v1.schema.json": validators.validateSchema1,
  "schemas/figure-request.v1.schema.json": validators.validateSchema2,
  "schemas/generated/registry-enums.v1.schema.json": validators.validateSchema3,
  "schemas/skills/network.adjacency_matrix.request.v1.schema.json": validators.validateSchema4,
  "schemas/skills/network.connection_graph.request.v1.schema.json": validators.validateSchema5,
  "schemas/skills/network.degree_distribution.request.v1.schema.json": validators.validateSchema6,
  "schemas/skills/network.delay_distribution.request.v1.schema.json": validators.validateSchema7,
  "schemas/skills/network.delay_matrix.request.v1.schema.json": validators.validateSchema8,
  "schemas/skills/network.spatial_map_2d.request.v1.schema.json": validators.validateSchema9,
  "schemas/skills/network.synaptic_weight_trace.request.v1.schema.json": validators.validateSchema10,
  "schemas/skills/network.weight_distribution.request.v1.schema.json": validators.validateSchema11,
  "schemas/skills/network.weight_matrix.request.v1.schema.json": validators.validateSchema12,
  "schemas/skills/neuro.analog_trace.request.v1.schema.json": validators.validateSchema13,
  "schemas/skills/neuro.compartment_trace.request.v1.schema.json": validators.validateSchema14,
  "schemas/skills/neuro.correlogram.request.v1.schema.json": validators.validateSchema15,
  "schemas/skills/neuro.isi_distribution.request.v1.schema.json": validators.validateSchema16,
  "schemas/skills/neuro.multisignal_trace.request.v1.schema.json": validators.validateSchema17,
  "schemas/skills/neuro.phase_plane.request.v1.schema.json": validators.validateSchema18,
  "schemas/skills/neuro.population_rate.request.v1.schema.json": validators.validateSchema19,
  "schemas/skills/neuro.psth.request.v1.schema.json": validators.validateSchema20,
  "schemas/skills/neuro.response_curve.request.v1.schema.json": validators.validateSchema21,
  "schemas/skills/neuro.spike_raster.request.v1.schema.json": validators.validateSchema22,
  "schemas/stable-figure-request-union.v1.schema.json": validators.validateSchema23,
  "schemas/validation-error.v1.schema.json": validators.validateSchema24,
});
