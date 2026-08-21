import { n as canonicalDigest } from "./canonicalize-F75Ifelv.js";
import { n as freezeGenerated } from "./deep-freeze-CyWYjAwr.js";
import { l as NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5, s as makeSourceAdapterExampleEnvelope } from "./source-example-BRb1SykW.js";

//#region src/generated/authoring.ts
/**
* GENERATED FILE — DO NOT EDIT.
*
* Produced by scripts/generate-contract.ts from contract/skills/, contract/schemas/, and contract/registries/.
* Edit the normative source and run `bun run generate`.
* `bun run check:generated` fails if this file drifts from its source.
*/
/** Versioned Ajv compile profile bound by catalogDigest. */
const AUTHORING_SCHEMA_COMPILATION_PROFILE_V1 = freezeGenerated({
	"id": "cortexel-authoring-schema-compilation-profile.v1",
	"dialect": "https://json-schema.org/draft/2020-12/schema",
	"engine": "ajv-8",
	"options": {
		"strict": true,
		"allErrors": true,
		"coerceTypes": false,
		"useDefaults": false,
		"removeAdditional": false,
		"allowUnionTypes": true,
		"validateFormats": false,
		"strictRequired": false,
		"strictTypes": false
	}
});
/** Shared offline resources required to compile every generated per-skill schema. */
const STABLE_CATALOG_SCHEMA_RESOURCES = freezeGenerated([{
	"$schema": "https://json-schema.org/draft/2020-12/schema",
	"$id": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json",
	"title": "Cortexel shared types v1",
	"description": "Shared structural types. Enumerations that have a registry (units, quantity kinds, error codes, skill ids) are $ref'd from contract/schemas/generated/ so there is exactly one authority for each.",
	"$defs": {
		"sha256": {
			"type": "string",
			"description": "A full SHA-256 digest. A shortened prefix may be displayed to a human; it is never an API value.",
			"pattern": "^sha256:[0-9a-f]{64}$"
		},
		"identifier": {
			"type": "string",
			"description": "A stable opaque identifier supplied by the caller (a sender id, a node id, an edge id). Numeric source ids are normalized to canonical decimal strings; they are never coerced from arbitrary labels.",
			"minLength": 1,
			"maxLength": 128,
			"pattern": "^[A-Za-z0-9][A-Za-z0-9._:@/-]*$"
		},
		"displayString": {
			"type": "string",
			"description": "Human-readable text that will be rendered. Control characters, C1 codes, bidi overrides/isolates, zero-width characters, and the XML-forbidden U+FFFE/U+FFFF noncharacters are excluded because they can visually spoof text or make the normative SVG ill-formed.",
			"maxLength": 200,
			"pattern": "^[^\\u0000-\\u001f\\u061c\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2069\\ufeff\\ufffe-\\uffff]*$"
		},
		"label": {
			"$ref": "#/$defs/displayString",
			"type": "string",
			"maxLength": 120,
			"description": "A short rendered label. `type` is restated alongside the $ref because a length constraint with no declared type is ambiguous — and Ajv's strict mode is right to reject it."
		},
		"unitCode": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/generated/registry-enums.v1.schema.json#/$defs/unitCode" },
		"quantityKind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/generated/registry-enums.v1.schema.json#/$defs/quantityKind" },
		"quantity": {
			"type": "object",
			"description": "A scalar physical quantity. There is no bare number at a semantic boundary: a value without a kind and a unit has no scientific meaning.",
			"properties": {
				"kind": { "$ref": "#/$defs/quantityKind" },
				"unit": { "$ref": "#/$defs/unitCode" },
				"value": { "type": "number" }
			},
			"required": [
				"kind",
				"unit",
				"value"
			],
			"additionalProperties": false
		},
		"quantitySeries": {
			"type": "object",
			"description": "A vector of observations of one quantity. `null` means the observation is MISSING — it is never mapped to zero, never interpolated across, and never omitted from the count.",
			"properties": {
				"kind": { "$ref": "#/$defs/quantityKind" },
				"unit": { "$ref": "#/$defs/unitCode" },
				"values": {
					"type": "array",
					"items": { "type": ["number", "null"] },
					"maxItems": 2e6
				}
			},
			"required": [
				"kind",
				"unit",
				"values"
			],
			"additionalProperties": false
		},
		"timeWindow": {
			"type": "object",
			"description": "An observation or analysis window. The boundary convention is explicit: an event exactly at `stop` is EXCLUDED under the default half-open convention. A source format that records a closed endpoint must say so.",
			"properties": {
				"start": { "type": "number" },
				"stop": { "type": "number" },
				"unit": { "$ref": "#/$defs/unitCode" },
				"boundary": {
					"type": "string",
					"enum": ["[start,stop)", "[start,stop]"],
					"default": "[start,stop)"
				}
			},
			"required": [
				"start",
				"stop",
				"unit"
			],
			"additionalProperties": false
		},
		"eventTimeWindow": {
			"type": "object",
			"description": "An event-membership window whose endpoint closure is mandatory. Unlike a sampled trace window, an event window may be open at start and closed at stop when that is the source recorder's native rule. The boundary is never defaulted at an event boundary.",
			"properties": {
				"start": { "type": "number" },
				"stop": { "type": "number" },
				"unit": { "$ref": "#/$defs/unitCode" },
				"boundary": {
					"type": "string",
					"enum": [
						"[start,stop)",
						"[start,stop]",
						"(start,stop]"
					]
				}
			},
			"required": [
				"start",
				"stop",
				"unit",
				"boundary"
			],
			"additionalProperties": false
		},
		"binSpec": {
			"type": "object",
			"description": "How a continuous axis is binned. Either explicit edges, or a width that tiles the window. `n` edges define `n-1` half-open bins. There is never a bare `bin_ms` alongside a separate free-text time unit.",
			"oneOf": [{
				"type": "object",
				"properties": {
					"mode": { "const": "edges" },
					"unit": { "$ref": "#/$defs/unitCode" },
					"edges": {
						"type": "array",
						"items": { "type": "number" },
						"minItems": 2,
						"maxItems": 100001,
						"description": "Strictly increasing finite edges. Verified by the semantic validator `bins.strictly_increasing`."
					},
					"boundary": {
						"type": "string",
						"enum": ["[lo,hi)", "[lo,hi]"],
						"default": "[lo,hi)"
					},
					"finalEdgeInclusive": {
						"type": "boolean",
						"default": true,
						"description": "Whether a value exactly at the LAST edge falls in the final bin. Bins are otherwise half-open; without this, the maximum observation would always be silently dropped."
					}
				},
				"required": [
					"mode",
					"unit",
					"edges"
				],
				"additionalProperties": false
			}, {
				"type": "object",
				"properties": {
					"mode": { "const": "width" },
					"unit": { "$ref": "#/$defs/unitCode" },
					"width": {
						"type": "number",
						"exclusiveMinimum": 0
					},
					"start": { "type": "number" },
					"stop": { "type": "number" },
					"boundary": {
						"type": "string",
						"enum": ["[lo,hi)", "[lo,hi]"],
						"default": "[lo,hi)"
					},
					"finalEdgeInclusive": {
						"type": "boolean",
						"default": true
					}
				},
				"required": [
					"mode",
					"unit",
					"width",
					"start",
					"stop"
				],
				"additionalProperties": false
			}]
		},
		"histogramNormalization": {
			"type": "string",
			"description": "count: exact integer counts. probability: values sum to 1 across bins. density: value x binWidth integrates to 1, so the unit is the reciprocal of the binned axis unit.",
			"enum": [
				"count",
				"probability",
				"density"
			]
		},
		"uncertainty": {
			"description": "A closed union. An uncertainty mark is meaningless without its method, level, basis, and units — so there is no generic {lower, upper, label}. Absence is stated explicitly rather than left blank. Parallel uncertainty arrays use one missingness mask: lower/upper are null together, and any supplied sampleCount is null exactly where its dispersion or interval is null.",
			"oneOf": [
				{
					"type": "object",
					"properties": {
						"kind": { "const": "none" },
						"reason": {
							"type": "string",
							"enum": [
								"single_trial",
								"not_computed",
								"not_available",
								"not_applicable"
							]
						}
					},
					"required": ["kind", "reason"],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"kind": { "enum": ["standard_deviation", "standard_error"] },
						"unit": { "$ref": "#/$defs/unitCode" },
						"values": {
							"type": "array",
							"items": { "type": ["number", "null"] },
							"maxItems": 2e6
						},
						"sampleCount": {
							"type": "array",
							"items": {
								"type": ["integer", "null"],
								"minimum": 1,
								"maximum": 9007199254740991
							}
						},
						"basis": {
							"type": "string",
							"enum": [
								"trials",
								"neurons",
								"ensemble_members",
								"bootstrap_draws",
								"replicates"
							]
						}
					},
					"required": [
						"kind",
						"unit",
						"values",
						"sampleCount",
						"basis"
					],
					"additionalProperties": false,
					"description": "A non-negative dispersion per point. It is NOT an interval and must never be relabelled as one."
				},
				{
					"type": "object",
					"properties": {
						"kind": { "enum": ["confidence_interval", "credible_interval"] },
						"unit": { "$ref": "#/$defs/unitCode" },
						"lower": {
							"type": "array",
							"items": { "type": ["number", "null"] },
							"maxItems": 2e6
						},
						"upper": {
							"type": "array",
							"items": { "type": ["number", "null"] },
							"maxItems": 2e6
						},
						"level": {
							"type": "number",
							"exclusiveMinimum": 0,
							"exclusiveMaximum": 1
						},
						"method": { "$ref": "#/$defs/label" },
						"coverage": {
							"type": "string",
							"enum": ["pointwise", "simultaneous"]
						},
						"sampleCount": {
							"type": "array",
							"items": {
								"type": ["integer", "null"],
								"minimum": 1,
								"maximum": 9007199254740991
							}
						},
						"basis": {
							"type": "string",
							"enum": [
								"trials",
								"neurons",
								"ensemble_members",
								"bootstrap_draws",
								"replicates"
							]
						}
					},
					"required": [
						"kind",
						"unit",
						"lower",
						"upper",
						"level",
						"method",
						"coverage",
						"basis"
					],
					"additionalProperties": false,
					"description": "`credible_interval` is structural diagnostic vocabulary only in contract 1.0: every stable skill refuses it because the current request/artifact boundary has no independently verified posterior-attestation input. Structural validity alone never establishes that a posterior was computed or calibrated."
				},
				{
					"type": "object",
					"properties": {
						"kind": { "const": "quantile_interval" },
						"unit": { "$ref": "#/$defs/unitCode" },
						"lower": {
							"type": "array",
							"items": { "type": ["number", "null"] },
							"maxItems": 2e6
						},
						"upper": {
							"type": "array",
							"items": { "type": ["number", "null"] },
							"maxItems": 2e6
						},
						"lowerQuantile": {
							"type": "number",
							"minimum": 0,
							"maximum": 1
						},
						"upperQuantile": {
							"type": "number",
							"minimum": 0,
							"maximum": 1
						},
						"method": { "$ref": "#/$defs/label" },
						"sampleCount": {
							"type": "array",
							"items": {
								"type": ["integer", "null"],
								"minimum": 1,
								"maximum": 9007199254740991
							}
						},
						"basis": {
							"type": "string",
							"enum": [
								"trials",
								"neurons",
								"ensemble_members",
								"bootstrap_draws",
								"replicates"
							]
						}
					},
					"required": [
						"kind",
						"unit",
						"lower",
						"upper",
						"lowerQuantile",
						"upperQuantile",
						"method",
						"basis"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"kind": { "const": "ensemble_range" },
						"unit": { "$ref": "#/$defs/unitCode" },
						"lower": {
							"type": "array",
							"items": { "type": ["number", "null"] },
							"maxItems": 2e6
						},
						"upper": {
							"type": "array",
							"items": { "type": ["number", "null"] },
							"maxItems": 2e6
						},
						"sampleCount": {
							"type": "array",
							"items": {
								"type": ["integer", "null"],
								"minimum": 1,
								"maximum": 9007199254740991
							}
						},
						"basis": {
							"type": "string",
							"enum": [
								"trials",
								"neurons",
								"ensemble_members",
								"bootstrap_draws",
								"replicates"
							]
						}
					},
					"required": [
						"kind",
						"unit",
						"lower",
						"upper",
						"sampleCount",
						"basis"
					],
					"additionalProperties": false,
					"description": "The observed minimum and maximum across the ensemble. It carries NO coverage probability and is never drawn or labelled as a confidence interval."
				}
			]
		},
		"dataRef": {
			"type": "object",
			"description": "A content-addressed reference to bulk data. Stable core has NO filesystem or network authority: it holds an opaque resolver key and never a URL, a path, or a command. The host resolves the key to bytes and MUST verify byteLength and sha256 before parsing.",
			"properties": {
				"id": { "$ref": "#/$defs/identifier" },
				"sha256": { "$ref": "#/$defs/sha256" },
				"mediaType": {
					"type": "string",
					"enum": [
						"application/vnd.cortexel.f64le+octet-stream",
						"application/vnd.cortexel.i32le+octet-stream",
						"application/json",
						"text/csv"
					]
				},
				"byteLength": {
					"type": "integer",
					"minimum": 0,
					"maximum": 1073741824
				},
				"shape": {
					"type": "array",
					"items": {
						"type": "integer",
						"minimum": 0
					},
					"minItems": 1,
					"maxItems": 4
				},
				"dtype": {
					"type": "string",
					"enum": [
						"f64",
						"i32",
						"utf8"
					]
				},
				"resolverKey": {
					"$ref": "#/$defs/identifier",
					"description": "An opaque key the HOST understands. Cortexel never interprets, dereferences, or joins it to a path."
				}
			},
			"required": [
				"id",
				"sha256",
				"mediaType",
				"byteLength"
			],
			"additionalProperties": false
		},
		"networkScope": {
			"description": "A closed scope union. A connection snapshot has no meaning without it, and a partial snapshot can never be upgraded to a global claim.",
			"oneOf": [
				{
					"type": "object",
					"properties": {
						"kind": { "const": "single_process" },
						"snapshotTime": { "$ref": "#/$defs/quantity" },
						"complete": {
							"type": "boolean",
							"const": true,
							"description": "A single-process run observes every connection, so this scope is complete by construction."
						}
					},
					"required": ["kind", "complete"],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"kind": { "const": "global_merged" },
						"snapshotTime": { "$ref": "#/$defs/quantity" },
						"worldSize": {
							"type": "integer",
							"minimum": 1,
							"maximum": 1e6
						},
						"mergedRanks": {
							"type": "array",
							"items": {
								"type": "integer",
								"minimum": 0
							},
							"minItems": 1,
							"maxItems": 1e6,
							"description": "Every rank actually merged. The semantic validator requires that these cover 0..worldSize-1 exactly once; a partial rank set remains partial."
						}
					},
					"required": [
						"kind",
						"worldSize",
						"mergedRanks"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"kind": { "const": "mpi_target_rank_local" },
						"snapshotTime": { "$ref": "#/$defs/quantity" },
						"rank": {
							"type": "integer",
							"minimum": 0,
							"maximum": 999999
						},
						"worldSize": {
							"type": "integer",
							"minimum": 1,
							"maximum": 1e6
						},
						"localTargetUniverseComplete": {
							"type": "boolean",
							"description": "Whether every connection whose target this rank owns is present. Under NEST's MPI semantics this is what makes a LOCAL in-degree computable — and what still makes a global out-degree impossible."
						}
					},
					"required": [
						"kind",
						"rank",
						"worldSize",
						"localTargetUniverseComplete"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"kind": { "const": "sampled" },
						"snapshotTime": { "$ref": "#/$defs/quantity" },
						"parentScope": {
							"type": "string",
							"enum": [
								"single_process",
								"global_merged",
								"mpi_target_rank_local"
							]
						},
						"method": {
							"type": "string",
							"enum": [
								"deterministic_first_n",
								"deterministic_stride",
								"declared_subset"
							]
						},
						"sourceConnectionCount": {
							"type": "integer",
							"minimum": 0
						},
						"retainedConnectionCount": {
							"type": "integer",
							"minimum": 0
						}
					},
					"required": [
						"kind",
						"parentScope",
						"method",
						"sourceConnectionCount",
						"retainedConnectionCount"
					],
					"additionalProperties": false,
					"description": "A subset. Degree and matrix completeness claims are refused under this scope."
				}
			]
		},
		"nodeUniverse": {
			"type": "object",
			"description": "The COMPLETE set of nodes under consideration, in a declared order. This is required wherever isolates or zero-degree nodes carry meaning: an edge list can only show that no edge was observed, never that a node has degree zero.",
			"properties": {
				"ids": {
					"type": "array",
					"items": { "$ref": "#/$defs/identifier" },
					"minItems": 1,
					"maxItems": 1e5
				},
				"order": {
					"type": "string",
					"enum": [
						"as_declared",
						"canonical_id",
						"grouped"
					],
					"default": "as_declared"
				},
				"groups": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"id": { "$ref": "#/$defs/identifier" },
							"label": { "$ref": "#/$defs/label" },
							"memberIds": {
								"type": "array",
								"items": { "$ref": "#/$defs/identifier" },
								"maxItems": 1e5
							}
						},
						"required": ["id", "memberIds"],
						"additionalProperties": false
					},
					"maxItems": 64
				},
				"complete": {
					"type": "boolean",
					"description": "Whether these ids are the complete selected universe. `false` forbids any isolate or zero-degree claim."
				}
			},
			"required": ["ids", "complete"],
			"additionalProperties": false
		},
		"connectionRows": {
			"type": "object",
			"description": "A connection snapshot in parallel-array form. Every multapse is a distinct row and is NEVER deduplicated: two connections between the same pair are two connections, not a duplicate-entry error.",
			"properties": {
				"sourceIds": {
					"type": "array",
					"items": { "$ref": "#/$defs/identifier" },
					"maxItems": 5e5
				},
				"targetIds": {
					"type": "array",
					"items": { "$ref": "#/$defs/identifier" },
					"maxItems": 5e5
				},
				"edgeIds": {
					"type": "array",
					"items": { "$ref": "#/$defs/identifier" },
					"maxItems": 5e5,
					"description": "Optional caller-supplied stable per-connection identity, parallel to sourceIds and targetIds. This shared type assigns no identity when the channel is absent: a skill may expose null or a clearly labelled local row ordinal only when its own contract says so, but it must not promote a generated ordinal into caller-supplied source identity."
				},
				"weights": { "$ref": "#/$defs/quantitySeries" },
				"delays": { "$ref": "#/$defs/quantitySeries" },
				"synapseModels": {
					"type": "array",
					"items": { "$ref": "#/$defs/label" },
					"maxItems": 5e5
				}
			},
			"required": ["sourceIds", "targetIds"],
			"additionalProperties": false
		},
		"multapseAggregation": {
			"type": "string",
			"description": "How multiple connections mapping to one cell are combined. There is no default and there is no 'last edge wins'. `no_aggregation` asserts at most one connection per cell and FAILS if that is untrue.",
			"enum": [
				"sum",
				"mean",
				"min",
				"max",
				"no_aggregation"
			]
		},
		"responseEventScope": {
			"description": "The one declared spike-train selection to which every condition and repeat in an event-derived response curve refers. It states what the caller's data is: one train or the superposition of a selected sender population, complete inside the measurement window. Cortexel checks internal bindings but cannot verify the caller's selection against an external simulator or paper.",
			"oneOf": [{
				"type": "object",
				"properties": {
					"kind": { "const": "single_train" },
					"selectionId": {
						"$ref": "#/$defs/identifier",
						"description": "Stable caller identity for the single event-train selection applied to every repeat and condition. It names the selection rule or role, not a Cortexel conclusion."
					},
					"eventKind": { "const": "spike" },
					"eventCompleteness": { "const": "complete_for_selection_within_measurement_window" },
					"poolingOperator": { "const": "identity_single_train" },
					"recordedSenderCount": {
						"type": "integer",
						"minimum": 1,
						"description": "Present in this branch only so the semantic gate can issue the precise unused-authority error. single_train states that one event train enters the response operation; it makes no recorded-sender-cardinality claim and therefore forbids this field."
					}
				},
				"required": [
					"kind",
					"selectionId",
					"eventKind",
					"eventCompleteness",
					"poolingOperator"
				],
				"additionalProperties": false
			}, {
				"type": "object",
				"properties": {
					"kind": { "const": "pooled_recorded_senders" },
					"selectionId": {
						"$ref": "#/$defs/identifier",
						"description": "Stable caller identity for the sender-population selection applied to every repeat and condition."
					},
					"eventKind": { "const": "spike" },
					"eventCompleteness": { "const": "complete_for_selection_within_measurement_window" },
					"poolingOperator": { "const": "superpose_selected_sender_trains" },
					"recordedSenderCount": {
						"type": "integer",
						"minimum": 1,
						"description": "The exact number of selected recorded senders, including silent senders. Required semantically; it remains schema-optional so a missing denominator reaches the actionable science error rather than an opaque union failure."
					},
					"membershipBinding": {
						"description": "How population membership is bound. Explicit ids are strongest; a canonical digest binds an externally retained list; cardinality_only is honest but cannot establish member identity and forces a mandatory disclosure.",
						"oneOf": [
							{
								"type": "object",
								"properties": {
									"kind": { "const": "explicit_sender_ids" },
									"senderIds": {
										"type": "array",
										"items": { "$ref": "#/$defs/identifier" },
										"minItems": 1,
										"maxItems": 1e5,
										"description": "The complete unique selected-sender universe. Its length must equal recordedSenderCount."
									}
								},
								"required": ["kind", "senderIds"],
								"additionalProperties": false
							},
							{
								"type": "object",
								"properties": {
									"kind": { "const": "canonical_sender_ids_digest" },
									"algorithm": { "const": "sha256" },
									"canonicalization": { "const": "cortexel_utf16_sorted_unique_identifier_array_rfc8785_v1" },
									"digest": { "$ref": "#/$defs/sha256" }
								},
								"required": [
									"kind",
									"algorithm",
									"canonicalization",
									"digest"
								],
								"additionalProperties": false
							},
							{
								"type": "object",
								"properties": { "kind": { "const": "cardinality_only" } },
								"required": ["kind"],
								"additionalProperties": false
							}
						]
					}
				},
				"required": [
					"kind",
					"selectionId",
					"eventKind",
					"eventCompleteness",
					"poolingOperator",
					"membershipBinding"
				],
				"additionalProperties": false
			}]
		},
		"sourceDeclaration": {
			"type": "object",
			"description": "What the CALLER declares about where the data came from. A caller declares what its data IS; it never declares what Cortexel concluded about it. `unknown` is valid and honest — it triggers a disclosure and is better than invented specificity.",
			"properties": {
				"kind": {
					"type": "string",
					"enum": [
						"simulation",
						"experimental_recording",
						"derived_dataset",
						"synthetic_fixture",
						"literature_extraction",
						"manual_entry",
						"unknown"
					]
				},
				"system": {
					"$ref": "#/$defs/label",
					"description": "The producing system, e.g. \"NEST\"."
				},
				"systemVersion": { "$ref": "#/$defs/label" },
				"runId": { "$ref": "#/$defs/identifier" },
				"sessionId": { "$ref": "#/$defs/identifier" },
				"datasetId": { "$ref": "#/$defs/identifier" },
				"recorderId": { "$ref": "#/$defs/identifier" },
				"sourceDigest": { "$ref": "#/$defs/sha256" },
				"declaredLimitations": {
					"type": "array",
					"items": { "$ref": "#/$defs/displayString" },
					"maxItems": 16,
					"description": "Limitations the caller knows about. Cortexel presents them in array order after every mandatory disclosure under the renderer-owned label \"Source limitation (declared by caller; not verified)\". Each caller body is bidi-isolated. Their exact text never enters artifact.disclosures and never replaces or suppresses a mandatory disclosure."
				},
				"declaredNote": {
					"$ref": "#/$defs/displayString",
					"type": "string",
					"maxLength": 200,
					"description": "A free-text caller note. Its presence triggers the generic contract-owned CALLER_NOTE_UNVERIFIED disclosure. The exact note is then rendered after the declared limitations and every mandatory disclosure under the renderer-owned label \"Source note (declared by caller; not verified)\", bidi-isolated; its exact text can never enter artifact.disclosures, precede, replace, suppress, or cover a mandatory disclosure."
				}
			},
			"required": ["kind"],
			"additionalProperties": false
		},
		"presentation": {
			"type": "object",
			"description": "Presentation preferences. These may never alter a scientific value, a required disclosure, or a normative output. There is no raw CSS, no style object, no URL, and no markup.",
			"properties": {
				"title": { "$ref": "#/$defs/label" },
				"subtitle": { "$ref": "#/$defs/label" },
				"themeId": {
					"$ref": "https://sepahead.github.io/cortexel/schemas/v1/generated/registry-enums.v1.schema.json#/$defs/themeId",
					"default": "light"
				},
				"paletteId": { "$ref": "#/$defs/label" },
				"width": {
					"type": "integer",
					"minimum": 160,
					"maximum": 4096,
					"default": 720
				},
				"height": {
					"type": "integer",
					"minimum": 120,
					"maximum": 4096,
					"default": 440
				},
				"budgetProfile": {
					"$ref": "https://sepahead.github.io/cortexel/schemas/v1/generated/registry-enums.v1.schema.json#/$defs/budgetProfileId",
					"default": "standard"
				}
			},
			"additionalProperties": false
		}
	}
}, {
	"$schema": "https://json-schema.org/draft/2020-12/schema",
	"$id": "https://sepahead.github.io/cortexel/schemas/v1/generated/registry-enums.v1.schema.json",
	"title": "Cortexel registry schema definitions (generated)",
	"description": "GENERATED from contract/registries/. Do not edit. Closed identifier enums and the structural unit-code shape live in exactly one place; canonical unit membership is enforced by the semantic unit validators so aliases receive an actionable repair.",
	"$defs": {
		"unitCode": {
			"type": "string",
			"minLength": 1,
			"maxLength": 32,
			"description": "A unit code. Deliberately NOT a structural enum. Units are a scientific concern, so they are owned by the semantic validators unit.canonical_code and unit.dimension_match — which is what lets an accepted alias such as \"milliseconds\" produce a repair pointing at \"ms\", rather than a bare \"not in enum\" from a stage that runs first and cannot suggest the fix. A canonical unit list lives in contract/registries/units.v1.json."
		},
		"quantityKind": {
			"type": "string",
			"description": "A quantity kind from contract/registries/units.v1.json.",
			"enum": [
				"angle",
				"concentration",
				"conductance",
				"correlation",
				"count",
				"current",
				"degree",
				"delay",
				"derivative",
				"duration",
				"firing_rate",
				"frequency",
				"interspike_interval",
				"length",
				"membrane_voltage",
				"position",
				"probability",
				"probability_density",
				"ratio",
				"state_variable",
				"synaptic_weight",
				"time",
				"voltage"
			]
		},
		"stableSkillId": {
			"type": "string",
			"description": "A STABLE catalog id. Experimental and removed ids are deliberately absent: a stable request cannot select them by accident.",
			"enum": [
				"network.adjacency_matrix",
				"network.connection_graph",
				"network.degree_distribution",
				"network.delay_distribution",
				"network.delay_matrix",
				"network.spatial_map_2d",
				"network.synaptic_weight_trace",
				"network.weight_distribution",
				"network.weight_matrix",
				"neuro.analog_trace",
				"neuro.compartment_trace",
				"neuro.correlogram",
				"neuro.isi_distribution",
				"neuro.multisignal_trace",
				"neuro.phase_plane",
				"neuro.population_rate",
				"neuro.psth",
				"neuro.response_curve",
				"neuro.spike_raster"
			]
		},
		"errorCode": {
			"type": "string",
			"enum": [
				"ADAPTER_ACCESSOR_INPUT_REJECTED",
				"ADAPTER_MAPPING_REQUIRED",
				"ADAPTER_NEST_TIME_ENCODING_UNSUPPORTED",
				"ADAPTER_NEST_UNSUPPORTED_SHAPE",
				"ADAPTER_UNSUPPORTED_VERSION",
				"CAPABILITY_EXPERIMENTAL",
				"CAPABILITY_REMOVED",
				"CONTRACT_DIGEST_MISMATCH",
				"CONTRACT_MISSING",
				"CONTRACT_SHAPE_INVALID",
				"CONTRACT_SKILL_REVISION_UNSUPPORTED",
				"CONTRACT_UNSUPPORTED_VERSION",
				"DATA_BYTE_LENGTH_MISMATCH",
				"DATA_DIGEST_MISMATCH",
				"DATA_MEDIA_TYPE_UNSUPPORTED",
				"DATA_REFERENCE_UNRESOLVED",
				"ERROR_LIMIT_REACHED",
				"INTERNAL_INVARIANT_VIOLATED",
				"JSON_ARRAY_TOO_LONG",
				"JSON_BOM_NOT_ALLOWED",
				"JSON_BYTES_EXCEEDED",
				"JSON_COMMENT_NOT_ALLOWED",
				"JSON_DANGEROUS_KEY",
				"JSON_DEPTH_EXCEEDED",
				"JSON_DUPLICATE_KEY",
				"JSON_EMPTY_INPUT",
				"JSON_INTEGER_OUT_OF_RANGE",
				"JSON_INVALID_NUMBER",
				"JSON_INVALID_UNICODE",
				"JSON_NON_FINITE_NUMBER",
				"JSON_NUMBER_TOKEN_TOO_LONG",
				"JSON_STRING_TOO_LONG",
				"JSON_SYNTAX",
				"JSON_TOKENS_EXCEEDED",
				"JSON_TOO_MANY_KEYS",
				"JSON_TRAILING_COMMA_NOT_ALLOWED",
				"JSON_TRAILING_DATA",
				"MIGRATION_AMBIGUOUS",
				"MIGRATION_AMBIGUOUS_CONNECTIVITY_MATRIX",
				"MIGRATION_INFORMATION_MISSING",
				"MIGRATION_LEGACY_ID_NOT_ACCEPTED",
				"MIGRATION_NO_STABLE_REPLACEMENT",
				"MIGRATION_UNKNOWN_LEGACY_ID",
				"PROVENANCE_ATTESTATION_UNVERIFIED",
				"PROVENANCE_CALLER_ASSURANCE_FORBIDDEN",
				"PROVENANCE_NOTE_TOO_LONG",
				"PROVENANCE_NOTE_UNSAFE_DISPLAY",
				"PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
				"PROVENANCE_SOURCE_REQUIRED",
				"RENDER_DEGENERATE_DOMAIN",
				"RENDER_DIVERGING_SCALE_NO_CENTER",
				"RENDER_LAYOUT_UNAVAILABLE",
				"RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN",
				"RENDER_NO_DATA",
				"RENDER_SERIES_LIMIT_EXCEEDED",
				"RENDER_THEME_NONCONFORMING",
				"RENDER_UNSUPPORTED_SKILL",
				"RENDER_UNVALIDATED_REQUEST",
				"RESOURCE_BUDGET_EXCEEDED",
				"RESOURCE_BUDGET_PROFILE_UNKNOWN",
				"RESOURCE_COMPACTION_UNAVAILABLE",
				"RESOURCE_MARKS_EXCEEDED",
				"RESOURCE_MATRIX_CELLS_EXCEEDED",
				"RESOURCE_OBSERVATIONS_EXCEEDED",
				"RESOURCE_OUTPUT_BYTES_EXCEEDED",
				"RESOURCE_PAIRWISE_EXCEEDED",
				"RESOURCE_SIDECAR_BYTES_EXCEEDED",
				"SCHEMA_ENUM_MISMATCH",
				"SCHEMA_REQUIRED_PROPERTY_MISSING",
				"SCHEMA_TYPE_MISMATCH",
				"SCHEMA_UNKNOWN_PROPERTY",
				"SCHEMA_UNKNOWN_SKILL",
				"SCHEMA_VALIDATION_FAILED",
				"SCIENCE_AGGREGATION_REQUIRED",
				"SCIENCE_BIN_EDGES_INVALID",
				"SCIENCE_CORRELATION_DENOMINATOR_INVALID",
				"SCIENCE_COUNT_ESTIMATOR_INCOHERENT",
				"SCIENCE_COUNT_NOT_INTEGER",
				"SCIENCE_DELAY_NONPOSITIVE",
				"SCIENCE_DENOMINATOR_INVALID",
				"SCIENCE_DENSITY_DOES_NOT_INTEGRATE",
				"SCIENCE_DUPLICATE_TIME_POLICY",
				"SCIENCE_EVENT_OUT_OF_WINDOW",
				"SCIENCE_EVENT_SCOPE_UNVERIFIABLE",
				"SCIENCE_LAG_RANGE_INVALID",
				"SCIENCE_LATENCY_OUTSIDE_WINDOW",
				"SCIENCE_NEGATIVE_INTERVAL",
				"SCIENCE_NORMALIZATION_UNVERIFIABLE",
				"SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
				"SCIENCE_PAIRED_REPEATS_INCOMPLETE",
				"SCIENCE_POPULATION_UNIVERSE_REQUIRED",
				"SCIENCE_RESPONSE_INPUT_DUPLICATE",
				"SCIENCE_RESPONSE_METHOD_MISMATCH",
				"SCIENCE_RESPONSE_VALUE_INVALID",
				"SCIENCE_TRIAL_UNIVERSE_REQUIRED",
				"SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
				"SCIENCE_UNCERTAINTY_LEVEL_INVALID",
				"SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA",
				"SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
				"SCIENCE_UNIT_ALIAS_NOT_CANONICAL",
				"SCIENCE_UNIT_DIMENSION_MISMATCH",
				"SCIENCE_UNIT_NOT_CONVERTIBLE",
				"SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
				"SCIENCE_WINDOW_INVALID",
				"SCIENCE_ZERO_INTERVAL_POLICY",
				"SCOPE_INCOMPATIBLE_WITH_SKILL",
				"SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL",
				"SCOPE_MERGE_CONFLICT",
				"SCOPE_MERGE_INCOMPLETE",
				"SCOPE_NODE_UNIVERSE_REQUIRED",
				"SCOPE_OUT_DEGREE_FROM_RANK_LOCAL",
				"SCOPE_POSITION_COVERAGE_INCOMPLETE",
				"SCOPE_REQUIRED",
				"SEMANTIC_DUPLICATE_ID",
				"SEMANTIC_EMPTY_SELECTION",
				"SEMANTIC_LENGTH_MISMATCH",
				"SEMANTIC_UNKNOWN_REFERENCE",
				"SEMANTIC_VALIDATOR_UNAVAILABLE",
				"SNAPSHOT_ACCESSOR_PROPERTY",
				"SNAPSHOT_CIRCULAR_REFERENCE",
				"SNAPSHOT_DANGEROUS_KEY",
				"SNAPSHOT_DECORATED_ARRAY",
				"SNAPSHOT_DEPTH_EXCEEDED",
				"SNAPSHOT_HOSTILE_REFLECTION",
				"SNAPSHOT_INTEGER_OUT_OF_RANGE",
				"SNAPSHOT_MALFORMED_STRING",
				"SNAPSHOT_NODES_EXCEEDED",
				"SNAPSHOT_NON_FINITE_NUMBER",
				"SNAPSHOT_NON_PLAIN_OBJECT",
				"SNAPSHOT_SPARSE_ARRAY",
				"SNAPSHOT_STRING_TOO_LONG",
				"SNAPSHOT_SYMBOL_KEY",
				"SNAPSHOT_UNSUPPORTED_TYPE"
			]
		},
		"errorStage": {
			"type": "string",
			"enum": [
				"parse",
				"snapshot",
				"identity",
				"structural",
				"semantic",
				"science",
				"scope",
				"provenance",
				"budget",
				"derivation",
				"render",
				"serialize",
				"migrate",
				"adapter",
				"internal"
			]
		},
		"disclosureId": {
			"type": "string",
			"enum": [
				"ABSENT_IS_NOT_ZERO",
				"AGGREGATE_WITHOUT_RAW_REPEATS",
				"CALLER_NOTE_UNVERIFIED",
				"DUPLICATE_TIMES_AGGREGATED",
				"EVENTS_EXCLUDED_OUT_OF_WINDOW",
				"EVENT_SCOPE_EXTERNAL_AUTHORITY_UNVERIFIED",
				"EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY",
				"KERNEL_SMOOTHED_RATE",
				"LAG_ORIENTATION",
				"MISSING_REPLICATES_EXCLUDED_FROM_AGGREGATE",
				"MISSING_VALUES_PRESENT",
				"MULTAPSE_AGGREGATED",
				"NEST_CAPTURE_BOUNDED_POSITIVE_INFINITY",
				"NEST_SERIALIZED_CLOCK_BOUNDARY",
				"NODE_UNIVERSE_INCOMPLETE",
				"NONSTANDARD_BUDGET_PROFILE",
				"PARTIAL_NETWORK_SCOPE",
				"POSITIONS_MISSING",
				"PRE_BINNED_INPUT",
				"RANK_LOCAL_SCOPE",
				"RECTANGULAR_SENDER_EXPOSURE_ASSERTED",
				"REFERENCE_COMPARISON_NOT_RUN",
				"SAMPLED_EDGES",
				"SCHEMATIC_LAYOUT",
				"SOURCE_AUTHENTICITY_UNVERIFIED",
				"SOURCE_KIND_UNKNOWN",
				"SOURCE_LITERATURE_EXTRACTION",
				"SOURCE_MANUAL_ENTRY",
				"SOURCE_SIMULATION",
				"SOURCE_SYNTHETIC_FIXTURE",
				"UNCERTAINTY_COVERAGE_INCOMPLETE",
				"UNCERTAINTY_NOT_PROVIDED",
				"UNIT_CONVERTED",
				"ZERO_LAG_SELF_PAIRS_EXCLUDED"
			]
		},
		"disclosureRecord": {
			"description": "An exact disclosure id/severity pair from disclosures.v1.json plus its bounded library-rendered text. Template substitution depends on artifact facts and is an executable postcondition, not a JSON Schema claim.",
			"oneOf": [
				{
					"type": "object",
					"properties": {
						"id": { "const": "SOURCE_SIMULATION" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "SOURCE_SYNTHETIC_FIXTURE" },
						"severity": { "const": "critical" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "SOURCE_KIND_UNKNOWN" },
						"severity": { "const": "critical" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "SOURCE_LITERATURE_EXTRACTION" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "SOURCE_MANUAL_ENTRY" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "SOURCE_AUTHENTICITY_UNVERIFIED" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "REFERENCE_COMPARISON_NOT_RUN" },
						"severity": { "const": "informational" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "PARTIAL_NETWORK_SCOPE" },
						"severity": { "const": "critical" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "RANK_LOCAL_SCOPE" },
						"severity": { "const": "critical" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "SAMPLED_EDGES" },
						"severity": { "const": "critical" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "NODE_UNIVERSE_INCOMPLETE" },
						"severity": { "const": "critical" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "MULTAPSE_AGGREGATED" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "ABSENT_IS_NOT_ZERO" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "SCHEMATIC_LAYOUT" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "POSITIONS_MISSING" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "EVENTS_EXCLUDED_OUT_OF_WINDOW" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "NEST_SERIALIZED_CLOCK_BOUNDARY" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "NEST_CAPTURE_BOUNDED_POSITIVE_INFINITY" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "MISSING_VALUES_PRESENT" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "UNIT_CONVERTED" },
						"severity": { "const": "informational" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "UNCERTAINTY_NOT_PROVIDED" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "UNCERTAINTY_COVERAGE_INCOMPLETE" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "AGGREGATE_WITHOUT_RAW_REPEATS" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "EVENT_SCOPE_EXTERNAL_AUTHORITY_UNVERIFIED" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "EVENT_SCOPE_MEMBERSHIP_CARDINALITY_ONLY" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "KERNEL_SMOOTHED_RATE" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "ZERO_LAG_SELF_PAIRS_EXCLUDED" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "LAG_ORIENTATION" },
						"severity": { "const": "informational" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "PRE_BINNED_INPUT" },
						"severity": { "const": "informational" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "RECTANGULAR_SENDER_EXPOSURE_ASSERTED" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "DUPLICATE_TIMES_AGGREGATED" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "MISSING_REPLICATES_EXCLUDED_FROM_AGGREGATE" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "CALLER_NOTE_UNVERIFIED" },
						"severity": { "const": "informational" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				},
				{
					"type": "object",
					"properties": {
						"id": { "const": "NONSTANDARD_BUDGET_PROFILE" },
						"severity": { "const": "important" },
						"text": {
							"type": "string",
							"minLength": 1,
							"maxLength": 400
						}
					},
					"required": [
						"id",
						"severity",
						"text"
					],
					"additionalProperties": false
				}
			]
		},
		"semanticValidatorId": {
			"type": "string",
			"description": "A semantic-validator id from semantic-validators.v1.json.",
			"enum": [
				"bins.strictly_increasing",
				"compartment_trace.series_identity_declared",
				"correlogram.event_trains_valid",
				"correlogram.lag_range_valid",
				"correlogram.prebinned_axis_consistent",
				"correlogram.roles_disjoint",
				"correlogram.statistic_denominator",
				"degree.counting_policy_declared",
				"events.sender_universe_declared",
				"events.source_clock_declared",
				"events.trial_universe_declared",
				"events.within_window",
				"histogram.normalization_consistent",
				"ids.unique",
				"isi.within_train_only",
				"isi.zero_interval_policy",
				"phase_plane.derivative_dimension",
				"provenance.no_caller_assurance",
				"provenance.note_safe_display",
				"psth.alignment_declared",
				"rate.denominator_positive",
				"rate.verify_normalization",
				"response_curve.estimator_declared",
				"series.equal_length",
				"spatial.equal_axis_units",
				"spatial.position_coverage_complete",
				"topology.delay_positive",
				"topology.edge_endpoints_in_universe",
				"topology.matrix_contract",
				"topology.multapse_aggregation_declared",
				"topology.node_universe_declared",
				"topology.scope_declared",
				"topology.scope_supports_claim",
				"topology.weight_group_compatible",
				"trace.axis_dimension_compatible",
				"trace.duplicate_time_policy",
				"uncertainty.supported_variant",
				"uncertainty.valid",
				"unit.canonical_code",
				"unit.dimension_match",
				"weight_trace.observation_kind_declared",
				"window.valid"
			]
		},
		"rendererId": {
			"type": "string",
			"description": "A renderer id from renderers.v1.json.",
			"enum": [
				"figure.analog_trace",
				"figure.compartment_trace",
				"figure.connection_graph",
				"figure.correlogram",
				"figure.distribution",
				"figure.matrix",
				"figure.multisignal_trace",
				"figure.phase_plane",
				"figure.population_rate",
				"figure.psth",
				"figure.response_curve",
				"figure.spatial_map_2d",
				"figure.spike_raster",
				"figure.synaptic_weight_trace"
			]
		},
		"rendererIdentity": {
			"type": "object",
			"description": "An exact renderer id/revision pair from renderers.v1.json.",
			"oneOf": [
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.analog_trace" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.multisignal_trace" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.compartment_trace" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.spike_raster" },
						"rendererRevision": { "const": 7 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.population_rate" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.psth" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.correlogram" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.distribution" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.response_curve" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.phase_plane" },
						"rendererRevision": { "const": 6 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.connection_graph" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.matrix" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.spatial_map_2d" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				},
				{
					"type": "object",
					"properties": {
						"rendererId": { "const": "figure.synaptic_weight_trace" },
						"rendererRevision": { "const": 5 }
					},
					"required": ["rendererId", "rendererRevision"]
				}
			]
		},
		"themeId": {
			"type": "string",
			"description": "A theme id from contract/registries/palettes.v1.json.",
			"enum": [
				"dark",
				"grayscale",
				"light",
				"print"
			]
		},
		"budgetProfileId": {
			"type": "string",
			"description": "A budget-profile id from contract/registries/budget-profiles.v1.json.",
			"enum": ["agent", "standard"]
		}
	}
}]);
const SKILL_AUTHORING = freezeGenerated({
	"network.adjacency_matrix": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/network.adjacency_matrix.request.v1.schema.json",
			"title": "network.adjacency_matrix request",
			"description": "GENERATED from contract/skills/network.adjacency_matrix.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "network.adjacency_matrix" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"description": "A connection snapshot plus the single complete, ordered node universe that becomes both axes. There is no `matrix` field: Cortexel derives the cells from the connections and the universe, so a caller can never hand it a matrix whose cells disagree with its own edge list.",
					"properties": {
						"nodeUniverse": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse" }, {
								"type": "object",
								"properties": { "order": { "const": "as_declared" } },
								"not": { "required": ["groups"] }
							}],
							"description": "The COMPLETE, ordered set of nodes. Its order is the row order AND the column order, so the visual diagonal is the self-connection diagonal by construction. `complete` must be true, or no empty cell can be read as a measured absence."
						},
						"connections": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/connectionRows" }, {
								"type": "object",
								"properties": {
									"weights": { "allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantitySeries" }, {
										"type": "object",
										"properties": { "kind": { "const": "synaptic_weight" } },
										"required": ["kind"]
									}] },
									"delays": { "allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantitySeries" }, {
										"type": "object",
										"properties": { "kind": { "const": "delay" } },
										"required": ["kind"]
									}] }
								}
							}],
							"description": "Every connection, one row per connection. Multapses are distinct rows and are never deduplicated. Carried `weights` and `delays` are validated and tabulated but never enter a cell value."
						},
						"scope": {
							"description": "What this snapshot actually saw. It decides which rows can support an absence claim and which cell modes are legal. `snapshotTime` is REQUIRED here even though the shared type leaves it optional: under structural plasticity an undated adjacency matrix is not merely unlabelled, it is undefined.",
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope" }, {
								"type": "object",
								"properties": { "snapshotTime": { "allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantity" }, {
									"type": "object",
									"properties": {
										"kind": { "const": "time" },
										"value": {
											"type": "number",
											"minimum": 0
										}
									},
									"required": ["kind", "value"]
								}] } },
								"required": ["snapshotTime"]
							}]
						},
						"observedTargetIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"minItems": 0,
							"maxItems": 1e5,
							"description": "The row targets whose incoming connections were COMPLETELY observed — the rank's own targets. Only inside these rows is an empty cell a measured absence. REQUIRED under `mpi_target_rank_local` and REJECTED under every other scope, where the observed set is derived: the whole universe under `single_process` and a fully merged `global_merged`, and the EMPTY set under `sampled`."
						}
					},
					"required": [
						"nodeUniverse",
						"connections",
						"scope"
					],
					"additionalProperties": false,
					"allOf": [{
						"description": "Rank-local evidence cannot be read off the connections: a rank holds every connection whose TARGET it owns, but nothing in the edge list says WHICH targets those are. Without `observedTargetIds` every remote target's row would be drawn empty, and an empty row reads as a measured in-degree of zero. It is therefore REQUIRED under `mpi_target_rank_local` and REJECTED under every other scope, where the observed set is derived — accepting it there would let a caller hand Cortexel an observability claim that the derivation then silently ignores.",
						"if": {
							"type": "object",
							"properties": { "scope": {
								"type": "object",
								"properties": { "kind": { "const": "mpi_target_rank_local" } },
								"required": ["kind"]
							} },
							"required": ["scope"]
						},
						"then": {
							"required": ["observedTargetIds"],
							"properties": { "scope": {
								"type": "object",
								"properties": { "localTargetUniverseComplete": { "const": true } },
								"required": ["localTargetUniverseComplete"]
							} }
						},
						"else": { "not": { "required": ["observedTargetIds"] } }
					}]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"selectionId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
						"selectionLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
						"universeLabel": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
							"description": "A name for the node population, e.g. \"L2/3 excitatory\". It is APPENDED to the library-generated role words \"Target\" (rows) and \"Source\" (columns); it can never replace them, because a caller who relabelled the axes could transpose the meaning of the figure without transposing the data."
						},
						"cellMode": {
							"type": "string",
							"enum": ["binary_presence", "multiplicity"],
							"description": "binary_presence: a cell is 1 when at least one connection lands in it. multiplicity: a cell is the exact count of connection rows in it, multapses and autapses included. They are different quantities: binary presence answers 'is there a connection', multiplicity answers 'how many connection entries are there'."
						},
						"multapseAggregation": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/multapseAggregation",
							"description": "Closed contributor policy. Only `sum` and `no_aggregation` are accepted semantically: `sum` preserves exact contributor accounting (multiplicity paints the count; binary_presence paints existential 1 and is not described as a numeric aggregate), while `no_aggregation` asserts at most one row per cell and fails when false. Mean, min, and max have no distinct adjacency role and are rejected rather than ignored."
						},
						"multiplicityScale": {
							"type": "string",
							"enum": ["linear", "log"],
							"description": "The value scale for multiplicity. `log` is safe here because a present cell has multiplicity >= 1, so the domain never contains zero. Refused with binary_presence: a two-valued presence domain has no scale to choose."
						},
						"tableCellEnumeration": {
							"type": "string",
							"enum": ["present_cells_only", "dense"],
							"default": "present_cells_only",
							"description": "present_cells_only (the default): the table lists every present cell, and the complete ordered universe plus the per-row observability let a reader derive the status of every cell that is not listed. dense: every cell is enumerated with an explicit status, which is exact but costs rows x columns entries and is refused above the matrix-cell or returned-table-row budgets."
						}
					},
					"required": [
						"selectionId",
						"cellMode",
						"multapseAggregation"
					],
					"additionalProperties": false,
					"allOf": [{
						"description": "A scale for a two-valued domain is meaningless, so the field is rejected rather than ignored.",
						"if": {
							"type": "object",
							"properties": { "cellMode": { "const": "binary_presence" } },
							"required": ["cellMode"]
						},
						"then": { "not": { "required": ["multiplicityScale"] } }
					}]
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "network.adjacency_matrix" },
			"data": {
				"nodeUniverse": {
					"ids": [
						"1",
						"2",
						"3",
						"4"
					],
					"order": "as_declared",
					"complete": true
				},
				"connections": {
					"sourceIds": [
						"1",
						"1",
						"2",
						"3",
						"3"
					],
					"targetIds": [
						"2",
						"2",
						"3",
						"3",
						"4"
					],
					"edgeIds": [
						"e1",
						"e2",
						"e3",
						"e4",
						"e5"
					],
					"weights": {
						"kind": "synaptic_weight",
						"unit": "nest:weight",
						"values": [
							1.2,
							.9,
							0,
							-.5,
							2
						]
					},
					"delays": {
						"kind": "delay",
						"unit": "ms",
						"values": [
							1.5,
							1.5,
							2,
							1,
							1
						]
					},
					"synapseModels": [
						"static_synapse",
						"static_synapse",
						"static_synapse",
						"static_synapse",
						"static_synapse"
					]
				},
				"scope": {
					"kind": "single_process",
					"complete": true,
					"snapshotTime": {
						"kind": "time",
						"unit": "ms",
						"value": 1e3
					}
				}
			},
			"parameters": {
				"selectionId": "l23_microcircuit",
				"selectionLabel": "L2/3 microcircuit",
				"universeLabel": "L2/3 neurons",
				"cellMode": "multiplicity",
				"multapseAggregation": "sum",
				"multiplicityScale": "linear",
				"tableCellEnumeration": "dense"
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"network.connection_graph": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/network.connection_graph.request.v1.schema.json",
			"title": "network.connection_graph request",
			"description": "GENERATED from contract/skills/network.connection_graph.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "network.connection_graph" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"properties": {
						"nodeUniverse": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse",
							"description": "The COMPLETE selected node universe, in a declared order. This is required and cannot be inferred: an edge list can only show that no edge was observed, never that a node has degree zero. Without it, every isolate silently disappears from the figure. The semantic validators read this at `data.nodeUniverse`."
						},
						"connections": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/connectionRows",
							"description": "One row per connection. Parallel connections between the same pair are distinct rows and are never deduplicated; a row whose source equals its target is an autapse and is never dropped."
						},
						"scope": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope",
							"description": "How much of the connectivity was actually observed. This is a fact about the CONNECTIONS and is independent of whether the node universe is complete."
						},
						"positions": {
							"type": "object",
							"description": "Measured node coordinates. Required when the layout mode is `measured_positions`, and then required to cover the node universe COMPLETELY: a node with no coordinate can neither be placed at the origin (which invents a measurement) nor dropped (which deletes a node and every edge touching it).",
							"properties": {
								"nodeIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"minItems": 1,
									"maxItems": 1e5,
									"description": "Binds each coordinate to a node explicitly. Coordinates are never matched to nodes by position in the array, because a reordered node universe would then silently relocate every neuron."
								},
								"x": {
									"type": "object",
									"properties": {
										"kind": { "const": "position" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"maxItems": 1e5
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"y": {
									"type": "object",
									"properties": {
										"kind": { "const": "position" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"maxItems": 1e5
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"frame": {
									"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
									"description": "The coordinate frame the positions were measured in. Cortexel does not transform between frames; it records which one was declared."
								}
							},
							"required": [
								"nodeIds",
								"x",
								"y"
							],
							"additionalProperties": false
						}
					},
					"required": [
						"nodeUniverse",
						"connections",
						"scope"
					],
					"additionalProperties": false
				},
				"parameters": {
					"type": "object",
					"properties": {
						"graphId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
						"graphLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
						"layout": {
							"type": "object",
							"description": "Either measured coordinates or a closed-form deterministic schematic construction. There is no force-directed option: a spring layout depends on iteration order and floating-point accumulation, so it cannot produce the byte-identical output a stable figure requires — and its distances mean nothing anyway.",
							"properties": { "mode": {
								"type": "string",
								"enum": [
									"measured_positions",
									"schematic_circular",
									"schematic_grouped_circular",
									"schematic_layered"
								],
								"description": "`measured_positions` is spatial and honours one equal scale on both axes. Every `schematic_*` mode is explicitly NON-SPATIAL: it is labelled as such on the figure and in the summary, because a reader who measures distance in it is measuring the algorithm."
							} },
							"required": ["mode"],
							"additionalProperties": false
						},
						"parallelEdges": {
							"type": "object",
							"description": "How multiple connections between the same pair are DRAWN. They are never merged in the data: every row survives in the canonical request and complete returned table regardless of this setting. An over-table-budget request is refused; no detached sidecar is emitted.",
							"properties": {
								"display": {
									"type": "string",
									"enum": ["separate_lanes", "bundled"],
									"description": "`separate_lanes` draws each connection on its own deterministic routed lane. `bundled` draws one stroke per ordered direction carrying an explicit count label when more than one row enters that bundle; reciprocal directions remain separate. When an edge value is encoded it additionally requires a declared aggregation."
								},
								"maxLanes": {
									"type": "integer",
									"minimum": 1,
									"maximum": 8,
									"description": "The maximum number of distinct lanes permitted for one unordered pair under `separate_lanes`. The render boundary re-checks it and refuses RENDER_SERIES_LIMIT_EXCEEDED rather than share a lane and hide a connection. It is retained under `bundled` for one closed parameter shape but does not cap the at-most-two reciprocal direction bundles."
								}
							},
							"required": ["display", "maxLanes"],
							"additionalProperties": false
						},
						"multapseAggregation": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/multapseAggregation",
							"description": "How parallel connections are summarized wherever one derived scalar is required. A bundled stroke applies it only to rows sharing the same ordered (source,target) direction; reciprocal directions never pool their values. REQUIRED whenever any unordered pair carries more than one connection because the shared semantic gate must also cover separate-lane pair summaries; `no_aggregation` asserts at most one connection per unordered pair and fails if that is untrue. The rows are never merged in the data regardless of this setting. Read by the semantic validator at `parameters.multapseAggregation`."
						},
						"edgeValueEncoding": {
							"type": "object",
							"description": "Optional. Absent means edges carry no value encoding and are drawn uniformly. Present means an attribute is mapped to stroke geometry, and the legend states the exact mapping.",
							"properties": {
								"mode": {
									"type": "string",
									"enum": ["weight", "delay"]
								},
								"channel": {
									"type": "string",
									"enum": [
										"width",
										"color",
										"width_and_color"
									]
								},
								"colorScale": {
									"type": "string",
									"enum": ["sequential", "diverging"],
									"description": "A diverging scale requires an explicit `center` — enforced structurally by the conditional below. Without one the map implies a symmetry the data may not have, and the request is refused."
								},
								"center": { "type": "number" },
								"scale": {
									"type": "string",
									"enum": ["linear", "symlog"]
								}
							},
							"required": ["mode", "channel"],
							"additionalProperties": false,
							"allOf": [{
								"if": {
									"properties": { "channel": { "enum": ["color", "width_and_color"] } },
									"required": ["channel"]
								},
								"then": { "required": ["colorScale"] }
							}, {
								"if": {
									"properties": { "colorScale": { "const": "diverging" } },
									"required": ["colorScale"]
								},
								"then": { "required": ["center"] }
							}]
						},
						"degreeAnnotation": {
							"type": "object",
							"description": "Optional. Absent means the figure makes NO degree claim at all — the safe default. Present means a degree is computed, labelled, and (optionally) encoded as node area, which requires both a complete node universe and a scope that can support the claim.",
							"properties": {
								"mode": {
									"type": "string",
									"enum": [
										"in_degree",
										"out_degree",
										"total_degree"
									],
									"description": "Under a target-rank-local scope only `in_degree` is computable; `out_degree` and `total_degree` are refused, because the connections leaving a local source toward a remote target are stored on the other rank."
								},
								"countingPolicy": {
									"type": "string",
									"enum": ["per_connection_entry", "per_unique_neighbour"],
									"description": "`per_connection_entry` counts every synapse, so a multapse contributes more than one. `per_unique_neighbour` counts partners. The two give different numbers and neither is a default."
								},
								"autapseContribution": {
									"type": "string",
									"enum": [
										"counts_in_and_out",
										"counts_once",
										"excluded"
									]
								},
								"encodeAsNodeArea": {
									"type": "boolean",
									"default": false,
									"description": "When true, node AREA (never radius) is proportional to the degree, and the legend states the reference area. When false, the degree appears only as a label and in the table."
								}
							},
							"required": [
								"mode",
								"countingPolicy",
								"autapseContribution"
							],
							"additionalProperties": false
						},
						"nodeColorBy": {
							"type": "string",
							"enum": ["none", "group"],
							"default": "none",
							"description": "Group color is always paired with a distinct marker shape, so group identity never depends on color perception."
						},
						"uncertainty": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty",
							"description": "Only the `none` variant is renderable here. A drawn edge is a connection that exists in the snapshot; there is no band to draw around it, and any other variant is refused rather than approximated into a shading that would state a probabilistic claim the snapshot cannot support."
						}
					},
					"required": [
						"graphId",
						"layout",
						"parallelEdges"
					],
					"additionalProperties": false
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "network.connection_graph" },
			"data": {
				"nodeUniverse": {
					"ids": [
						"1",
						"2",
						"3",
						"4"
					],
					"order": "as_declared",
					"groups": [{
						"id": "exc",
						"label": "Excitatory",
						"memberIds": [
							"1",
							"2",
							"3"
						]
					}, {
						"id": "inh",
						"label": "Inhibitory",
						"memberIds": ["4"]
					}],
					"complete": true
				},
				"connections": {
					"sourceIds": [
						"1",
						"1",
						"2",
						"1",
						"3"
					],
					"targetIds": [
						"2",
						"2",
						"1",
						"1",
						"3"
					],
					"edgeIds": [
						"e1",
						"e2",
						"e3",
						"e4",
						"e5"
					],
					"weights": {
						"kind": "synaptic_weight",
						"unit": "nest:weight",
						"values": [
							10.5,
							10.5,
							-3.2,
							2,
							1
						]
					},
					"delays": {
						"kind": "delay",
						"unit": "ms",
						"values": [
							1.5,
							1.5,
							2,
							1,
							1
						]
					},
					"synapseModels": [
						"static_synapse",
						"static_synapse",
						"static_synapse",
						"static_synapse",
						"static_synapse"
					]
				},
				"scope": {
					"kind": "single_process",
					"snapshotTime": {
						"kind": "time",
						"unit": "ms",
						"value": 1e3
					},
					"complete": true
				}
			},
			"parameters": {
				"graphId": "microcircuit_snapshot",
				"graphLabel": "Microcircuit connections at t = 1000 ms",
				"layout": { "mode": "schematic_grouped_circular" },
				"parallelEdges": {
					"display": "separate_lanes",
					"maxLanes": 4
				},
				"multapseAggregation": "sum",
				"edgeValueEncoding": {
					"mode": "weight",
					"channel": "width_and_color",
					"colorScale": "diverging",
					"center": 0,
					"scale": "linear"
				},
				"degreeAnnotation": {
					"mode": "total_degree",
					"countingPolicy": "per_connection_entry",
					"autapseContribution": "counts_in_and_out",
					"encodeAsNodeArea": true
				},
				"nodeColorBy": "group",
				"uncertainty": {
					"kind": "none",
					"reason": "not_applicable"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"network.degree_distribution": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/network.degree_distribution.request.v1.schema.json",
			"title": "network.degree_distribution request",
			"description": "GENERATED from contract/skills/network.degree_distribution.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "network.degree_distribution" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"description": "A connection snapshot plus the node universe it is drawn over, or one degree per node for that same universe. `mode` is the discriminator, and each mode is a CLOSED object: the fields of the other mode are refused rather than ignored, because a countedConnectionCount supplied beside the rows it is supposed to summarise is an assertion Cortexel would then have to choose between trusting and re-deriving.",
					"oneOf": [{
						"type": "object",
						"title": "connections",
						"description": "Cortexel counts the degrees itself from the rows.",
						"properties": {
							"mode": { "const": "connections" },
							"nodeUniverse": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse",
								"description": "The COMPLETE set of nodes under consideration, including every node that has no connection at all. Both endpoints of every counted connection must lie in it. `complete` must be true: this is what makes the zero bin an observation rather than an artifact of which nodes happened to appear in an edge list."
							},
							"connections": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/connectionRows",
								"description": "Exactly the connections in the selection, every endpoint a member of the node universe. Every multapse is its own row and is never deduplicated. Weights, delays and synapse models may be present; they do not affect a degree and are never used to filter or group one."
							},
							"observedTargetIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The targets an MPI rank actually owns, declared under `mpi_target_rank_local` with `direction: in`. It is an ownership declaration, not a filter: it removes no row, and it is meaningful only under a rank-local scope."
							},
							"scope": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope",
								"description": "What this snapshot actually saw. A degree distribution is a completeness claim, so the scope decides which directions are even askable."
							}
						},
						"required": [
							"mode",
							"nodeUniverse",
							"connections",
							"scope"
						],
						"additionalProperties": false
					}, {
						"type": "object",
						"title": "node_degrees",
						"description": "The caller supplies one degree per node and Cortexel verifies coverage instead of observing the rows.",
						"properties": {
							"mode": { "const": "node_degrees" },
							"nodeUniverse": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse",
								"description": "The COMPLETE set of nodes whose degree is histogrammed. `complete` must be true, and the supplied degrees must cover it exactly once."
							},
							"nodeDegrees": {
								"type": "object",
								"description": "One degree per node, for EVERY node of the declared universe — a node omitted here is not a node of degree zero, it is an unverifiable histogram.",
								"properties": {
									"nodeIds": {
										"type": "array",
										"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
										"minItems": 1,
										"maxItems": 1e5
									},
									"degrees": {
										"type": "array",
										"items": {
											"type": "integer",
											"minimum": 0
										},
										"minItems": 1,
										"maxItems": 1e5,
										"description": "Exact non-negative integer degrees, parallel to nodeIds."
									}
								},
								"required": ["nodeIds", "degrees"],
								"additionalProperties": false
							},
							"countedConnectionCount": {
								"type": "integer",
								"minimum": 0,
								"description": "The exact raw connection-row count after the autapse policy was applied. It remains distinct from countedIncidenceCount when parallel connections collapse under count_unique_neighbors."
							},
							"countedIncidenceCount": {
								"type": "integer",
								"minimum": 0,
								"description": "The exact sum of the supplied degrees after the declared counting policy. It equals countedConnectionCount under count_edges and is at most countedConnectionCount under count_unique_neighbors."
							},
							"excludedAutapseCount": {
								"type": "integer",
								"minimum": 0,
								"description": "How many self-connections were removed under `autapsePolicy: exclude` before the degrees were computed. Accepted only in this mode, where Cortexel cannot see the rows; in connections mode it is derived, and a caller-supplied value is refused rather than trusted."
							},
							"observedTargetIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The targets an MPI rank actually owns, declared under `mpi_target_rank_local` with `direction: in`. It is an ownership declaration, not a filter."
							},
							"scope": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope",
								"description": "What the snapshot these degrees were counted from actually saw. A degree distribution is a completeness claim, so the scope decides which directions are even askable."
							}
						},
						"required": [
							"mode",
							"nodeUniverse",
							"nodeDegrees",
							"countedConnectionCount",
							"countedIncidenceCount",
							"scope"
						],
						"additionalProperties": false
					}]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"selectionId": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
							"description": "Names the degree-bearing selection so two figures of the same run cannot be confused for one another."
						},
						"selectionLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
						"direction": {
							"type": "string",
							"enum": ["in", "out"],
							"description": "The closed discriminator that replaced the two legacy skills. `in` counts connections arriving at a node; `out` counts connections leaving one. Under a target-rank-local scope only `in` is answerable."
						},
						"countingPolicy": {
							"type": "string",
							"enum": ["count_edges", "count_unique_neighbors"],
							"description": "count_edges: every connection ENTRY counts, so a multapse of three contributes three. count_unique_neighbors: every distinct counterpart node counts once, however many parallel connections join the pair. The two give different answers and the difference is scientific, not cosmetic."
						},
						"autapsePolicy": {
							"type": "string",
							"enum": ["include", "exclude"],
							"description": "include: a self-connection contributes 1 to the node's in-degree and 1 to its out-degree, and under unique-neighbour counting the node is one of its own neighbours. exclude: self-connections are removed before counting and the removed count is reported."
						},
						"binning": {
							"type": "object",
							"description": "Revision 2 keeps one exact integer degree per row so the returned table preserves sum(degree × nodeCount).",
							"properties": { "mode": { "const": "per_integer_degree" } },
							"required": ["mode"],
							"additionalProperties": false
						},
						"normalization": {
							"description": "count: the exact integer number of NODES per bin. probability: that count divided by the COMPLETE declared node universe, zero-degree nodes included. `density` is deliberately not accepted — see science.derivation.",
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/histogramNormalization" }, { "enum": ["count", "probability"] }]
						},
						"uncertainty": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty" }, {
								"type": "object",
								"properties": { "kind": { "const": "none" } },
								"required": ["kind"]
							}],
							"description": "Explicit absence only. A single snapshot is an exact enumeration, and no realization-level uncertainty branch is yet complete across all output surfaces."
						}
					},
					"required": [
						"selectionId",
						"direction",
						"countingPolicy",
						"autapsePolicy",
						"binning",
						"normalization",
						"uncertainty"
					],
					"additionalProperties": false
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "network.degree_distribution" },
			"data": {
				"mode": "connections",
				"nodeUniverse": {
					"ids": [
						"1",
						"2",
						"3",
						"4"
					],
					"order": "as_declared",
					"complete": true
				},
				"connections": {
					"sourceIds": [
						"1",
						"1",
						"2",
						"3",
						"2"
					],
					"targetIds": [
						"2",
						"2",
						"3",
						"2",
						"2"
					],
					"edgeIds": [
						"c1",
						"c2",
						"c3",
						"c4",
						"c5"
					]
				},
				"scope": {
					"kind": "single_process",
					"complete": true,
					"snapshotTime": {
						"kind": "time",
						"unit": "ms",
						"value": 1e3
					}
				}
			},
			"parameters": {
				"selectionId": "exc",
				"selectionLabel": "Excitatory",
				"direction": "in",
				"countingPolicy": "count_edges",
				"autapsePolicy": "include",
				"binning": { "mode": "per_integer_degree" },
				"normalization": "count",
				"uncertainty": {
					"kind": "none",
					"reason": "not_applicable"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"network.delay_distribution": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/network.delay_distribution.request.v1.schema.json",
			"title": "network.delay_distribution request",
			"description": "GENERATED from contract/skills/network.delay_distribution.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "network.delay_distribution" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"description": "Either the connection rows themselves, or a histogram the caller already binned. `mode` is the discriminator, and the fields of the other mode are REFUSED rather than ignored -- a field Cortexel cannot check must not be accepted as though it had been checked.",
					"properties": {
						"mode": {
							"type": "string",
							"enum": ["connections", "prebinned"],
							"description": "connections: Cortexel counts and bins the delays itself from the rows. prebinned: the caller supplies bin counts and Cortexel verifies the normalization and the conservation identity instead of observing the rows. There is deliberately no raw delay-values mode: a bag of numbers with no edge linkage cannot be checked against a counting policy or an edge selection, and it offers nothing that connection rows do not."
						},
						"nodeUniverse": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse",
							"description": "The nodes permitted at EITHER endpoint of a counted connection: the source and target ends are both bound to this one declared endpoint universe, and a row whose source or target is not a member is refused with SEMANTIC_UNKNOWN_REFERENCE. It need not be complete -- this figure makes no isolate or zero-degree claim, so a node that contributes no connection contributes nothing at all. Under mpi_target_rank_local it may include remote source nodes as well as local targets; observedTargetIds is the separate complete authority for the targets this rank owns and must be contained in this endpoint universe."
						},
						"observedTargetIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"minItems": 1,
							"maxItems": 1e5,
							"description": "The complete target-id authority for mpi_target_rank_local evidence. Every row target must be a member. The list is required even in prebinned mode, where it remains a caller-declared scope fact because the rows are absent."
						},
						"connections": {
							"description": "Exactly the connections in the selection. Every multapse is its own row and is never deduplicated. A delay is REQUIRED on every row: a connection whose delay was not read cannot enter a delay histogram, and skipping it would shrink the population by an amount nobody sees.",
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/connectionRows" }, {
								"type": "object",
								"required": ["delays"],
								"properties": { "delays": {
									"type": "object",
									"description": "The delay of each connection, parallel to sourceIds. No lower bound is imposed structurally: a zero or negative delay is refused by the semantic layer with SCIENCE_DELAY_NONPOSITIVE, which names the science, rather than by a bare type constraint. null is not accepted -- a missing delay is not a delay.",
									"properties": {
										"kind": { "const": "delay" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"maxItems": 5e5
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								} }
							}]
						},
						"groupBy": {
							"type": "string",
							"enum": ["none", "synapse_model"],
							"description": "How rows are partitioned. `synapse_model` requires visible connection rows and their parallel synapseModels. Prebinned revision-2 input has one count vector and therefore requires exactly `none`."
						},
						"counts": {
							"type": "array",
							"items": {
								"type": "integer",
								"minimum": 0
							},
							"maxItems": 1e5,
							"description": "Exact observations per bin. Length must equal the derived bin count. These raw integers are the authority from which any probability or density is re-derived."
						},
						"histogram": {
							"type": "object",
							"description": "A histogram the caller already computed, on the bin edges declared in `parameters.bins`. The edges are NOT restated here: two copies of one fact are two facts that can drift. `values` are the per-bin quantity named by `parameters.normalization` -- the exact integer counts under `count`, the per-group probabilities under `probability`, or the densities under `density` -- and the semantic validator `histogram.normalization_consistent` re-derives that normalization from them and refuses a set that does not sum or integrate to one; it never takes the numbers on trust.",
							"properties": {
								"kind": {
									"type": "string",
									"enum": [
										"count",
										"probability",
										"probability_density"
									]
								},
								"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
								"values": {
									"type": "array",
									"items": { "type": "number" },
									"maxItems": 1e5,
									"description": "One value per bin; its length must equal the bin count derived from parameters.bins."
								}
							},
							"required": [
								"kind",
								"unit",
								"values"
							],
							"additionalProperties": false
						},
						"consideredConnectionCount": {
							"type": "integer",
							"minimum": 0,
							"description": "Exact connection rows considered before the counting policy. Cortexel checks its declared relation to the observation total but cannot authenticate it against absent rows."
						},
						"consideredOrderedPairCount": {
							"type": "integer",
							"minimum": 0,
							"description": "Exact ordered-pair total after grouping and pair aggregation. Required by semantics under per_ordered_pair; equals totalObservationCount and cannot exceed consideredConnectionCount."
						},
						"totalObservationCount": {
							"type": "integer",
							"minimum": 0,
							"description": "Exact observations before range exclusion. sum(counts) + underRangeCount + overRangeCount must equal this value."
						},
						"underRangeCount": {
							"type": "integer",
							"minimum": 0,
							"description": "Exact observations below the first edge. Under reject this must be zero."
						},
						"overRangeCount": {
							"type": "integer",
							"minimum": 0,
							"description": "Exact observations above the final edge. Under reject this must be zero."
						},
						"sourceResolution": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantity",
							"description": "The simulator's time resolution, kind `duration`, recorded as DECLARED context. It establishes neither the synapse model nor the assignment path: in the cited NEST 3.9/3.10 behavior normal Connect rounds delays to it, while `cont_delay_synapse` model defaults supplied through CopyModel or SetDefaults, or post-creation values changed through SynapseCollection.set (legacy SetStatus), can retain valid off-grid values. Registry v1 does not use this field as lattice proof and never snaps supplied delays to it (see knownLimitations)."
						},
						"scope": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope",
							"description": "What this snapshot actually saw. Every scope is answerable for a delay distribution -- including rank-local and sampled, which a degree distribution cannot support -- but each carries a different claim, and the claim is disclosed rather than assumed."
						}
					},
					"required": ["mode", "scope"],
					"additionalProperties": false,
					"allOf": [
						{
							"if": {
								"properties": { "mode": { "const": "connections" } },
								"required": ["mode"]
							},
							"then": {
								"required": [
									"connections",
									"nodeUniverse",
									"groupBy"
								],
								"not": { "required": ["histogram"] }
							}
						},
						{
							"if": {
								"properties": { "mode": { "const": "prebinned" } },
								"required": ["mode"]
							},
							"then": {
								"required": [
									"groupBy",
									"histogram",
									"counts",
									"consideredConnectionCount",
									"totalObservationCount",
									"underRangeCount",
									"overRangeCount"
								],
								"properties": { "groupBy": { "const": "none" } },
								"not": { "anyOf": [{ "required": ["connections"] }, { "required": ["nodeUniverse"] }] }
							}
						},
						{
							"if": {
								"properties": { "groupBy": { "const": "synapse_model" } },
								"required": ["groupBy"]
							},
							"then": {
								"required": ["connections"],
								"properties": { "connections": {
									"type": "object",
									"required": ["synapseModels"]
								} }
							}
						},
						{
							"if": {
								"properties": { "scope": {
									"properties": { "kind": { "const": "mpi_target_rank_local" } },
									"required": ["kind"]
								} },
								"required": ["scope"]
							},
							"then": { "required": ["observedTargetIds"] }
						}
					]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"selectionId": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
							"description": "Names the edge population so two figures of the same run cannot be confused for one another."
						},
						"selectionLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
						"countingPolicy": {
							"type": "string",
							"enum": ["per_connection", "per_ordered_pair"],
							"description": "Required; there is deliberately no schema default. per_connection: every connection row contributes one delay observation, so a multapse of three contributes three. This is the weighted-by-synapse reading and the conventional one, but it is stated explicitly rather than assumed -- an unstated counting policy is exactly what lets a per-pair figure be read as a per-synapse one. per_ordered_pair: every ordered (source, target) pair contributes one observation, obtained by multapseAggregation. The two answer different questions and diverge wherever multiplicity covaries with delay."
						},
						"multapseAggregation": {
							"description": "How the parallel connections of one ordered pair are reduced to a single delay under per_ordered_pair. Required for per_ordered_pair, forbidden for per_connection. `sum` is excluded: the sum of three 1.5 ms delays is 4.5 ms, which is not a delay any synapse carries. `no_aggregation` asserts at most one row per ordered pair and fails with SCIENCE_AGGREGATION_REQUIRED if that is untrue. This is the field the semantic validator `topology.multapse_aggregation_declared` reads.",
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/multapseAggregation" }, { "enum": [
								"min",
								"mean",
								"max",
								"no_aggregation"
							] }]
						},
						"bins": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/binSpec",
							"description": "Required, in both modes, and the single source of truth for the bin edges. Cortexel does not choose them. When the selected delays are known independently to lie on a resolution lattice, a width that is not an integer multiple of that resolution can draw a uniform lattice population as an alternating comb; `sourceResolution` alone does not establish that condition."
						},
						"normalization": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/histogramNormalization",
							"description": "count: exact integers. probability: sums to 1 over the binned observations of each group. density: integrates to 1 over the LINEAR bin widths, with a unit reciprocal to the bin unit. All three are admissible because a delay is a continuous physical quantity."
						},
						"outOfRangeDelays": {
							"type": "string",
							"enum": ["reject", "exclude_and_report"],
							"description": "What happens to a contributing delay outside [firstEdge, lastEdge]. `reject` requires the bins to cover the data. `exclude_and_report` excludes it, counts it, and discloses the under-range and over-range totals -- after which the drawn values describe only the binned subset, not the population."
						},
						"xScale": {
							"type": "string",
							"enum": ["linear", "log"],
							"default": "linear",
							"description": "Presentation only; it never changes a derived value. A delay is strictly positive, so a log axis is always defined -- but the density denominator remains the LINEAR bin width."
						},
						"uncertainty": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty" }, {
								"type": "object",
								"properties": { "kind": { "const": "none" } },
								"required": ["kind"]
							}],
							"description": "Explicit absence only. Revision 2 accepts no uncertainty array until its estimator, basis, table, summary, legend and geometry ship together."
						}
					},
					"required": [
						"selectionId",
						"countingPolicy",
						"bins",
						"normalization",
						"outOfRangeDelays",
						"uncertainty"
					],
					"additionalProperties": false,
					"allOf": [{
						"if": {
							"properties": { "countingPolicy": { "const": "per_ordered_pair" } },
							"required": ["countingPolicy"]
						},
						"then": { "required": ["multapseAggregation"] }
					}, {
						"if": {
							"properties": { "countingPolicy": { "const": "per_connection" } },
							"required": ["countingPolicy"]
						},
						"then": { "not": { "required": ["multapseAggregation"] } }
					}]
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "network.delay_distribution" },
			"data": {
				"mode": "connections",
				"nodeUniverse": {
					"ids": [
						"1",
						"2",
						"3",
						"4"
					],
					"order": "as_declared",
					"complete": true
				},
				"connections": {
					"sourceIds": [
						"1",
						"2",
						"3",
						"4"
					],
					"targetIds": [
						"2",
						"3",
						"4",
						"1"
					],
					"edgeIds": [
						"c1",
						"c2",
						"c3",
						"c4"
					],
					"delays": {
						"kind": "delay",
						"unit": "ms",
						"values": [
							1,
							1.5,
							1.5,
							2
						]
					}
				},
				"groupBy": "none",
				"sourceResolution": {
					"kind": "duration",
					"unit": "ms",
					"value": .1
				},
				"scope": {
					"kind": "single_process",
					"complete": true,
					"snapshotTime": {
						"kind": "time",
						"unit": "ms",
						"value": 1e3
					}
				}
			},
			"parameters": {
				"selectionId": "recurrent_ee",
				"selectionLabel": "Recurrent E to E",
				"countingPolicy": "per_connection",
				"bins": {
					"mode": "width",
					"unit": "ms",
					"width": .5,
					"start": .5,
					"stop": 3
				},
				"normalization": "count",
				"outOfRangeDelays": "reject",
				"xScale": "linear",
				"uncertainty": {
					"kind": "none",
					"reason": "not_applicable"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"network.delay_matrix": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/network.delay_matrix.request.v1.schema.json",
			"title": "network.delay_matrix request",
			"description": "GENERATED from contract/skills/network.delay_matrix.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "network.delay_matrix" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"properties": {
						"nodeUniverse": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse" }, {
								"type": "object",
								"properties": { "order": { "const": "as_declared" } },
								"not": { "required": ["groups"] }
							}],
							"description": "The COMPLETE node universe, in the exact order the axes are drawn. Row i is the target and column i is the source of the SAME node, so the matrix is square and its visual diagonal is the self-connection diagonal. Declared so that a node with no observed connection still has a row and a column: an edge list can only show that no edge was observed, never that a neuron receives or sends nothing."
						},
						"connections": {
							"type": "object",
							"description": "The connection snapshot in parallel-array form. Every multapse is its own row and is never deduplicated.",
							"properties": {
								"sourceIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"maxItems": 2e5,
									"description": "The presynaptic node of each connection. These select the COLUMN."
								},
								"targetIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"maxItems": 2e5,
									"description": "The postsynaptic node of each connection. These select the ROW. An adapter that swaps this array with sourceIds produces a figure that passes every check and states the opposite of the truth."
								},
								"edgeIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"maxItems": 2e5,
									"description": "Optional caller-supplied per-connection identity retained in the canonical request. Revision 2 does not synthesize ordinal identities or emit a per-cell contributor-address dataset when this field is absent."
								},
								"delays": {
									"type": "object",
									"description": "One delay per connection row. Values are plain numbers: null is not accepted, because a delay is a declared property of a connection rather than a sampled observation.",
									"properties": {
										"kind": { "const": "delay" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"maxItems": 2e5,
											"description": "Finite and strictly positive. Positivity is enforced by topology.delay_positive so the caller gets SCIENCE_DELAY_NONPOSITIVE and its corrective action, not a bare schema-keyword failure."
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"synapseModels": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
									"maxItems": 2e5,
									"description": "Optional per-connection synapse model. Delays of different models are dimensionally identical and may share one matrix, unlike weights; the model is carried so a reader can see which cells mix models, and so a split axonal/dendritic model is identifiable in the table."
								}
							},
							"required": [
								"sourceIds",
								"targetIds",
								"delays"
							],
							"additionalProperties": false
						},
						"scope": {
							"description": "What this snapshot could see. A sampled or incomplete-rank-local scope is refused because a delay aggregate requires the complete multapse set for its cell. `snapshotTime` is required because delays and connections can change during a run.",
							"allOf": [
								{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope" },
								{
									"type": "object",
									"properties": { "snapshotTime": { "allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantity" }, {
										"type": "object",
										"properties": {
											"kind": { "const": "time" },
											"value": {
												"type": "number",
												"minimum": 0
											}
										},
										"required": ["kind", "value"]
									}] } },
									"required": ["snapshotTime"]
								},
								{
									"type": "object",
									"properties": { "kind": { "enum": [
										"single_process",
										"global_merged",
										"mpi_target_rank_local"
									] } },
									"required": ["kind"]
								},
								{
									"if": {
										"type": "object",
										"properties": { "kind": { "const": "mpi_target_rank_local" } },
										"required": ["kind"]
									},
									"then": {
										"type": "object",
										"properties": { "localTargetUniverseComplete": { "const": true } },
										"required": ["localTargetUniverseComplete"]
									}
								}
							]
						},
						"observedTargetIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"minItems": 0,
							"maxItems": 1e5,
							"description": "The target rows this snapshot could actually observe. REQUIRED when scope.kind is mpi_target_rank_local (the locally owned targets) and forbidden otherwise, where the whole row universe is observed by construction. Rows outside this set render as not_observed."
						},
						"simulationResolution": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantity" }, {
								"type": "object",
								"properties": {
									"kind": { "const": "duration" },
									"value": {
										"type": "number",
										"exclusiveMinimum": 0
									}
								},
								"required": ["kind", "value"]
							}],
							"description": "Optional declared context: the source's simulation timestep. It is not lattice proof. In the cited NEST 3.9/3.10 behavior, normal Connect rounds delays to this resolution, but `cont_delay_synapse` model defaults supplied through CopyModel or SetDefaults, or values changed after creation through SynapseCollection.set (legacy SetStatus), can remain off-grid; every delay admitted by those cited models is still at least one simulation resolution. Cortexel records the value without snapping supplied delays or inferring the model and assignment path (see knownLimitations)."
						}
					},
					"required": [
						"nodeUniverse",
						"connections",
						"scope"
					],
					"additionalProperties": false,
					"allOf": [{
						"if": {
							"type": "object",
							"properties": { "scope": {
								"type": "object",
								"properties": { "kind": { "const": "mpi_target_rank_local" } },
								"required": ["kind"]
							} },
							"required": ["scope"]
						},
						"then": { "required": ["observedTargetIds"] },
						"else": { "not": { "required": ["observedTargetIds"] } }
					}]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"matrixLabel": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
							"description": "A label for the selection shown. It never renames the axes: 'Target (row)' and 'Source (column)' are contract-owned and are not caller-settable, because a relabelled axis is how a transposed figure gets legitimized."
						},
						"multapseAggregation": { "allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/multapseAggregation" }, {
							"enum": [
								"mean",
								"min",
								"max",
								"no_aggregation"
							],
							"description": "Mandatory: there is no default and there is no 'last edge wins'. `sum` exists in the shared type but is REFUSED here — parallel synapses are not in series, so the sum of two 5 ms delays is 10 ms, a latency nothing in the network experiences. `no_aggregation` asserts at most one connection per cell and fails if that is untrue."
						}] },
						"delaySemantics": {
							"type": "string",
							"enum": ["total_transmission", "dendritic_component_only"],
							"description": "Mandatory: what the reported number MEANS. Most synapse models report the full source-to-target transmission delay. Models that split an axonal and a dendritic component report only the dendritic part in their `delay` field, so the true latency is larger by the axonal component. The two are numerically indistinguishable, so Cortexel cannot infer this and refuses to guess; the declaration is rendered in the legend, the summary, and the table."
						},
						"displayUnit": {
							"type": "object",
							"description": "Optional. The unit the legend and table use, declared as a delay quantity ({kind: delay, unit}) so unit.dimension_match owns it: a non-time code fails with SCIENCE_UNIT_DIMENSION_MISMATCH rather than silently relabelling a millisecond as a millivolt. When omitted, the delays' own declared unit is used and no conversion is performed.",
							"properties": {
								"kind": { "const": "delay" },
								"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" }
							},
							"required": ["kind", "unit"],
							"additionalProperties": false
						},
						"scale": {
							"type": "object",
							"description": "How the sequential colour ramp maps delay to colour. Optional; the contract default is linear, and changing that default is a MAJOR change. There is no declared or shared colour domain: the domain is always the observed extent of the rendered cells (see knownLimitations).",
							"properties": { "kind": {
								"type": "string",
								"enum": ["linear", "log"],
								"description": "log is safe here because every delay is strictly positive, so RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN cannot arise."
							} },
							"required": ["kind"],
							"additionalProperties": false
						},
						"tableCellEnumeration": {
							"type": "string",
							"enum": ["present_cells_only", "dense"],
							"default": "present_cells_only",
							"description": "present_cells_only returns every connection-bearing cell; dense enumerates present, observed-absent, and not_observed cells and is refused above the complete-returned-table budget."
						}
					},
					"required": ["multapseAggregation", "delaySemantics"],
					"additionalProperties": false
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "network.delay_matrix" },
			"data": {
				"nodeUniverse": {
					"ids": [
						"1",
						"2",
						"3"
					],
					"order": "as_declared",
					"complete": true
				},
				"connections": {
					"sourceIds": [
						"1",
						"1",
						"2",
						"3"
					],
					"targetIds": [
						"2",
						"2",
						"3",
						"3"
					],
					"edgeIds": [
						"c1",
						"c2",
						"c3",
						"c4"
					],
					"delays": {
						"kind": "delay",
						"unit": "ms",
						"values": [
							1,
							9,
							2.5,
							4
						]
					},
					"synapseModels": [
						"static_synapse",
						"static_synapse",
						"static_synapse",
						"static_synapse"
					]
				},
				"scope": {
					"kind": "single_process",
					"complete": true,
					"snapshotTime": {
						"kind": "time",
						"unit": "ms",
						"value": 1e3
					}
				},
				"simulationResolution": {
					"kind": "duration",
					"unit": "ms",
					"value": .1
				}
			},
			"parameters": {
				"matrixLabel": "Excitatory subnetwork",
				"multapseAggregation": "min",
				"delaySemantics": "total_transmission",
				"displayUnit": {
					"kind": "delay",
					"unit": "ms"
				},
				"scale": { "kind": "linear" }
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"network.spatial_map_2d": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/network.spatial_map_2d.request.v1.schema.json",
			"title": "network.spatial_map_2d request",
			"description": "GENERATED from contract/skills/network.spatial_map_2d.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "network.spatial_map_2d" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"properties": {
						"nodeUniverse": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse",
							"description": "The COMPLETE selected node universe in a declared order. It is required and is never inferred from the position rows: a node the source failed to position must still be counted, or its absence from the map would be invisible. Optional groups are a disjoint subpartition: unique group ids, only universe members, no repeated or overlapping member. Read by topology.node_universe_declared, topology.edge_endpoints_in_universe, and spatial.position_coverage_complete."
						},
						"positions": {
							"type": "object",
							"description": "One row per POSITIONED node: an id, an x, a y, and optionally a value. Binding them in one row is what makes coverage structural — a value can never be supplied for a node that has no coordinate, and a coordinate can never lose its value.",
							"properties": {
								"nodeIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"minItems": 1,
									"maxItems": 1e5,
									"description": "Binds each coordinate to a node explicitly. Coordinates are never matched to nodes by array position, because a reordered node universe would then silently relocate every neuron."
								},
								"x": {
									"type": "object",
									"description": "The x coordinate per row. `kind` is `position`, whose only dimension is length: a spatial map at one equal scale asserts a distance, and a distance needs a unit. Bare model numbers are not plotted here.",
									"properties": {
										"kind": { "const": "position" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"maxItems": 1e5
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"y": {
									"type": "object",
									"description": "The y coordinate per row. No null is admitted on either axis: a node with an x and no y cannot be placed, and half a position is not a position.",
									"properties": {
										"kind": { "const": "position" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"maxItems": 1e5
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"status": {
									"type": "string",
									"enum": [
										"measured",
										"model_generated",
										"supplied"
									],
									"description": "`measured` was observed from a physical system. `model_generated` was produced by the model itself — a NEST grid or free layer is model_generated, not measured. `supplied` was authored by the caller. The status is stated in the summary and on every table row; it is never inferred from `source.kind`."
								},
								"frame": {
									"type": "object",
									"description": "The declared coordinate frame. Cortexel records it and never transforms between frames: a frame transform that nobody declared is a silent relocation of every node.",
									"properties": {
										"id": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
										"xAxisLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
										"yAxisLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" }
									},
									"required": ["id"],
									"additionalProperties": false
								},
								"domain": {
									"type": "object",
									"description": "The declared spatial domain — a NEST layer's centre, extent and edge_wrap. Optional; when present it IS the mapped rectangle and it supplies the period that a wrapped chord needs. Because the boundary rule lives here, a periodic chord rule can never be declared without the period it requires.",
									"properties": {
										"center": {
											"type": "object",
											"properties": {
												"x": {
													"type": "object",
													"properties": {
														"kind": { "const": "position" },
														"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
														"value": { "type": "number" }
													},
													"required": [
														"kind",
														"unit",
														"value"
													],
													"additionalProperties": false
												},
												"y": {
													"type": "object",
													"properties": {
														"kind": { "const": "position" },
														"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
														"value": { "type": "number" }
													},
													"required": [
														"kind",
														"unit",
														"value"
													],
													"additionalProperties": false
												}
											},
											"required": ["x", "y"],
											"additionalProperties": false
										},
										"extent": {
											"type": "object",
											"description": "The full width and height of the domain, not a half-extent. Both are strictly positive: a zero-extent domain has no scale and no period.",
											"properties": {
												"width": {
													"type": "object",
													"properties": {
														"kind": { "const": "length" },
														"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
														"value": {
															"type": "number",
															"exclusiveMinimum": 0
														}
													},
													"required": [
														"kind",
														"unit",
														"value"
													],
													"additionalProperties": false
												},
												"height": {
													"type": "object",
													"properties": {
														"kind": { "const": "length" },
														"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
														"value": {
															"type": "number",
															"exclusiveMinimum": 0
														}
													},
													"required": [
														"kind",
														"unit",
														"value"
													],
													"additionalProperties": false
												}
											},
											"required": ["width", "height"],
											"additionalProperties": false
										},
										"boundary": {
											"description": "Open or periodic. Under `periodic` the chord rule is REQUIRED and has no default: a connection across a wrapped boundary is drawn either as the minimum image or as the literal straight chord, the two differ by the period, and no reader can tell which one they are looking at unless the figure says so.",
											"oneOf": [{
												"type": "object",
												"properties": { "kind": { "const": "open" } },
												"required": ["kind"],
												"additionalProperties": false
											}, {
												"type": "object",
												"properties": {
													"kind": { "const": "periodic" },
													"x": {
														"type": "boolean",
														"description": "Whether the x axis wraps. Periodicity is declared per axis: NEST's edge_wrap is a property of the layer, and a layer may wrap in one axis only."
													},
													"y": { "type": "boolean" },
													"edgeChordRule": {
														"type": "string",
														"enum": ["minimum_image", "straight_chord"],
														"description": "`minimum_image` draws the shortest wrapped chord, split at the boundary, with no ghost node at the wrapped position. `straight_chord` draws the literal chord between the two declared coordinates and is labelled as such, together with the count of edges whose drawn length exceeds their modelled separation."
													}
												},
												"required": [
													"kind",
													"x",
													"y",
													"edgeChordRule"
												],
												"additionalProperties": false
											}]
										}
									},
									"required": [
										"center",
										"extent",
										"boundary"
									],
									"additionalProperties": false
								},
								"value": {
									"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantitySeries",
									"description": "Optional per-node scalar, parallel to `nodeIds`. A node with no value carries an explicit null and is still drawn with the reserved no-value symbol. Cortexel does not re-derive this value and makes no claim about how it was computed."
								},
								"valueLabel": {
									"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
									"description": "What the value IS, including the window it came from if it has one. The figure carries no analysis window of its own for it."
								}
							},
							"required": [
								"nodeIds",
								"x",
								"y",
								"status",
								"frame"
							],
							"additionalProperties": false
						},
						"scope": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope",
							"description": "How the snapshot query was partitioned, for the coordinates and for any connections. This is the single scope read by topology.scope_declared and topology.scope_supports_claim. It is not a coverage claim: a single-process query can still return no position for a node, and that gap is reported separately."
						},
						"connections": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/connectionRows",
							"description": "Optional edge layer in parallel-array form (`sourceIds`, `targetIds`, optional `edgeIds`, `weights`, `delays`, `synapseModels`). Multapses are distinct rows and are never deduplicated; on this map they share one chord and are counted, never lane-offset onto coordinates where nothing was measured. Every endpoint must resolve into `nodeUniverse` (topology.edge_endpoints_in_universe) and have a position (spatial.position_coverage_complete)."
						}
					},
					"required": [
						"nodeUniverse",
						"positions",
						"scope"
					],
					"additionalProperties": false
				},
				"parameters": {
					"type": "object",
					"properties": {
						"mapId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
						"mapLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
						"missingPositionPolicy": {
							"type": "string",
							"enum": ["reject", "omit_and_disclose"],
							"description": "Required, with no default. `reject` fails closed when any selected node has no position. `omit_and_disclose` is intended to draw the positioned nodes and disclose the omitted count (POSITIONS_MISSING). NOTE: under the current semantic-validator registry, spatial.position_coverage_complete always requires full coverage, so both policies presently require a position for every selected node; the enum is retained for the forward-compatible policy axis. An unpositioned node is NEVER placed at the origin, which under a centred layer is the single most plausible place for a real soma to be."
						},
						"nodeEncoding": {
							"description": "What a marker's colour means. Required: a figure in which colour acquired a meaning by default is a figure whose legend nobody wrote.",
							"oneOf": [
								{
									"type": "object",
									"properties": { "mode": { "const": "uniform" } },
									"required": ["mode"],
									"additionalProperties": false
								},
								{
									"type": "object",
									"description": "Categorical colour by declared group, always paired with a distinct marker shape so group identity never depends on colour perception.",
									"properties": { "mode": { "const": "group" } },
									"required": ["mode"],
									"additionalProperties": false
								},
								{
									"type": "object",
									"description": "Continuous colour by the per-node value. A diverging scale carries an explicit centre; a symlog transform carries its linear threshold. Neither is ever inferred.",
									"properties": {
										"mode": { "const": "value" },
										"colorScale": { "oneOf": [
											{
												"type": "object",
												"properties": {
													"kind": { "const": "sequential" },
													"transform": { "const": "linear" }
												},
												"required": ["kind", "transform"],
												"additionalProperties": false
											},
											{
												"type": "object",
												"properties": {
													"kind": { "const": "sequential" },
													"transform": { "const": "symlog" },
													"linearThreshold": {
														"type": "number",
														"exclusiveMinimum": 0
													}
												},
												"required": [
													"kind",
													"transform",
													"linearThreshold"
												],
												"additionalProperties": false
											},
											{
												"type": "object",
												"properties": {
													"kind": { "const": "diverging" },
													"center": { "type": "number" },
													"transform": { "const": "linear" }
												},
												"required": [
													"kind",
													"center",
													"transform"
												],
												"additionalProperties": false
											},
											{
												"type": "object",
												"properties": {
													"kind": { "const": "diverging" },
													"center": { "type": "number" },
													"transform": { "const": "symlog" },
													"linearThreshold": {
														"type": "number",
														"exclusiveMinimum": 0
													}
												},
												"required": [
													"kind",
													"center",
													"transform",
													"linearThreshold"
												],
												"additionalProperties": false
											}
										] }
									},
									"required": ["mode", "colorScale"],
									"additionalProperties": false
								}
							]
						},
						"markerRadiusPx": {
							"type": "integer",
							"minimum": 1,
							"maximum": 8,
							"default": 3,
							"description": "Fixed screen-space decoration. It encodes NOTHING: it never scales with a value, a degree, or a soma size, and two markers that touch are not two neurons that touch."
						},
						"multapseAggregation": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/multapseAggregation",
							"description": "The statistic that a shared chord's encoded value represents. Required (topology.multapse_aggregation_declared) whenever two or more connection rows share an unordered endpoint pair, because the chord between two measured places cannot be split into lanes without inventing geometry. `no_aggregation` ASSERTS at most one connection per pair and fails if that is untrue. Read at the parameters top level."
						},
						"synapseModelGroup": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
							"description": "An explicit declaration that weights from several synapse models are genuinely comparable and may be pooled onto one encoding. Read by topology.weight_group_compatible; without it, weights spanning more than one declared synapse model are refused (SCIENCE_WEIGHT_GROUP_INCOMPATIBLE)."
						},
						"connectionDisplay": {
							"description": "How the optional edge layer is drawn. Absent means chords are drawn uniformly with a count label on any multi-connection pair; the rows themselves are never merged and always reach the table. Encoding a value requires the channel that carries it — and, where that channel is colour, the scale — because a stroke that acquired its meaning from a default is a stroke whose legend nobody wrote.",
							"oneOf": [
								{
									"type": "object",
									"description": "Uniform chords. No value claim: stroke width and colour mean nothing, and direction is carried by the arrowhead alone.",
									"properties": { "valueEncoding": { "const": "none" } },
									"required": ["valueEncoding"],
									"additionalProperties": false
								},
								{
									"type": "object",
									"description": "A declared edge attribute encoded as stroke WIDTH over the bounded pixel range stated in the legend. No colour scale is admitted, because no colour meaning is claimed. Aggregation of a shared chord is declared at parameters.multapseAggregation.",
									"properties": {
										"valueEncoding": {
											"type": "string",
											"enum": ["weight", "delay"]
										},
										"channel": { "const": "width" }
									},
									"required": ["valueEncoding", "channel"],
									"additionalProperties": false
								},
								{
									"type": "object",
									"description": "A declared edge attribute encoded with COLOUR (alone or with width). The scale is required and never inferred: a diverging scale carries an explicit centre, and signed values are additionally dashed so a non-colour sign encoding remains present. This does not establish greyscale-print conformance. Aggregation of a shared chord is declared at parameters.multapseAggregation.",
									"properties": {
										"valueEncoding": {
											"type": "string",
											"enum": ["weight", "delay"]
										},
										"channel": {
											"type": "string",
											"enum": ["color", "width_and_color"]
										},
										"colorScale": { "oneOf": [{
											"type": "object",
											"properties": {
												"kind": { "const": "sequential" },
												"transform": { "const": "linear" }
											},
											"required": ["kind", "transform"],
											"additionalProperties": false
										}, {
											"type": "object",
											"properties": {
												"kind": { "const": "diverging" },
												"center": { "type": "number" },
												"transform": { "const": "linear" }
											},
											"required": [
												"kind",
												"center",
												"transform"
											],
											"additionalProperties": false
										}] }
									},
									"required": [
										"valueEncoding",
										"channel",
										"colorScale"
									],
									"additionalProperties": false
								}
							]
						},
						"uncertainty": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty",
							"description": "Only the `none` variant is renderable. UncertaintyV1 is a 1-D per-point channel; a position's error is 2-D, and drawing a single array as a disc around each marker would assert an isotropic localization error that the source never declared."
						}
					},
					"required": [
						"mapId",
						"missingPositionPolicy",
						"nodeEncoding"
					],
					"additionalProperties": false
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "network.spatial_map_2d" },
			"data": {
				"nodeUniverse": {
					"ids": [
						"1",
						"2",
						"3",
						"4"
					],
					"order": "as_declared",
					"groups": [{
						"id": "exc",
						"label": "Excitatory",
						"memberIds": [
							"1",
							"2",
							"3"
						]
					}, {
						"id": "inh",
						"label": "Inhibitory",
						"memberIds": ["4"]
					}],
					"complete": true
				},
				"positions": {
					"nodeIds": [
						"1",
						"2",
						"3",
						"4"
					],
					"x": {
						"kind": "position",
						"unit": "um",
						"values": [
							-150,
							150,
							-150,
							150
						]
					},
					"y": {
						"kind": "position",
						"unit": "um",
						"values": [
							-150,
							-150,
							150,
							150
						]
					},
					"status": "model_generated",
					"frame": {
						"id": "l4_sheet",
						"xAxisLabel": "x (medial-lateral)",
						"yAxisLabel": "y (rostral-caudal)"
					},
					"domain": {
						"center": {
							"x": {
								"kind": "position",
								"unit": "um",
								"value": 0
							},
							"y": {
								"kind": "position",
								"unit": "um",
								"value": 0
							}
						},
						"extent": {
							"width": {
								"kind": "length",
								"unit": "um",
								"value": 400
							},
							"height": {
								"kind": "length",
								"unit": "um",
								"value": 400
							}
						},
						"boundary": {
							"kind": "periodic",
							"x": true,
							"y": true,
							"edgeChordRule": "minimum_image"
						}
					}
				},
				"scope": {
					"kind": "single_process",
					"snapshotTime": {
						"kind": "time",
						"unit": "ms",
						"value": 1e3
					},
					"complete": true
				},
				"connections": {
					"sourceIds": [
						"1",
						"1",
						"2",
						"4"
					],
					"targetIds": [
						"2",
						"2",
						"1",
						"4"
					],
					"edgeIds": [
						"e1",
						"e2",
						"e3",
						"e4"
					],
					"weights": {
						"kind": "synaptic_weight",
						"unit": "nest:weight",
						"values": [
							10.5,
							10.5,
							-3.2,
							-1
						]
					},
					"delays": {
						"kind": "delay",
						"unit": "ms",
						"values": [
							1.5,
							1.5,
							2,
							1
						]
					},
					"synapseModels": [
						"static_synapse",
						"static_synapse",
						"static_synapse",
						"static_synapse"
					]
				}
			},
			"parameters": {
				"mapId": "l4_layer_map",
				"mapLabel": "L4 layer at t = 1000 ms",
				"missingPositionPolicy": "reject",
				"nodeEncoding": { "mode": "group" },
				"markerRadiusPx": 3,
				"multapseAggregation": "sum",
				"connectionDisplay": {
					"valueEncoding": "weight",
					"channel": "width_and_color",
					"colorScale": {
						"kind": "diverging",
						"center": 0,
						"transform": "linear"
					}
				},
				"uncertainty": {
					"kind": "none",
					"reason": "not_applicable"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"network.synaptic_weight_trace": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/network.synaptic_weight_trace.request.v1.schema.json",
			"title": "network.synaptic_weight_trace request",
			"description": "GENERATED from contract/skills/network.synaptic_weight_trace.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "network.synaptic_weight_trace" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"oneOf": [{
						"type": "object",
						"description": "Edges mode: the raw per-synapse observations. This is the honest input whenever the observations exist, because everything else in the figure — the aggregate, its denominators, the dispersion — is then DERIVED and checkable rather than asserted.",
						"properties": {
							"mode": { "const": "edges" },
							"window": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow",
								"description": "The analysis window and the single time frame of the figure. Every edge's times are converted into its unit. Half-open by default: an update exactly at `stop` is excluded and counted."
							},
							"scope": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope",
								"description": "Where these synapses were observed. Mandatory: a weight trace from a rank-local recorder and one from a merged global snapshot are different evidence, and only the scope can say which this is. `snapshotTime`, when supplied, names the moment the connection set was enumerated — the moment the declared membership is true of."
							},
							"observation": {
								"description": "What a sample IS, declared ONCE for the whole request because it is a property of the source recording. Mixing kinds in one figure is not offered: an aggregate that held a point sample, or averaged a step-held value with a continuously sampled one, would combine two incompatible assumptions about unobserved time.",
								"oneOf": [
									{
										"type": "object",
										"description": "The source wrote a value at each synaptic update (a NEST weight recorder). The weight is piecewise-constant between updates and is drawn as steps.",
										"properties": {
											"kind": { "const": "event_updated" },
											"updateSemantics": {
												"type": "string",
												"enum": ["value_after_update", "value_before_update"],
												"description": "Whether the value written at an event is the weight AFTER the update that event triggered (right-continuous: it holds forward from t) or the weight that was in force BEFORE it (left-continuous: it describes the interval ending at t). Required, with no default. The two conventions differ by exactly one inter-update interval on every step edge, and Cortexel cannot tell them apart from the numbers: the wrong declaration produces an entirely plausible figure in which a potentiation appears to precede the spike that caused it. It is a property of the synapse model's send() in the exact simulator version and must be established there, not guessed."
											}
										},
										"required": ["kind", "updateSemantics"],
										"additionalProperties": false
									},
									{
										"type": "object",
										"description": "The source sampled the weight at times of its own choosing (a polled GetConnections, a clock-driven state monitor). Consecutive finite samples are joined by a straight segment only within one valid render run; missingness and membership/recording availability transitions break runs. A surviving segment is a drawing convention and not a measurement.",
										"properties": { "kind": { "const": "point_sample" } },
										"required": ["kind"],
										"additionalProperties": false
									},
									{
										"type": "object",
										"description": "A caller/source-system reconstruction between supplied vertices. Revision 2 accepts only a linear interpolant because the canonical renderer draws straight segments; richer interpolants would otherwise be silently misrepresented. Its vertices are NOT observations: they never enter the observation count, and such a series may not be a member of a derived aggregate under a hold evaluation. Cortexel records and displays the reconstruction; it never performs one.",
										"properties": {
											"kind": { "const": "interpolated_trajectory" },
											"method": {
												"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
												"description": "The name of the algorithm that produced the trajectory. Required: a reconstructed line that will not name its method is an unattributable curve."
											},
											"interpolant": {
												"const": "linear",
												"description": "Revision 2 renders exactly the supplied vertices with straight segments and therefore accepts only `linear`. Holds belong to `event_updated`; spline and other reconstructions require a future geometry/authority carrier that can represent them exactly."
											},
											"reconstructedBy": {
												"type": "string",
												"enum": ["source_system", "caller"]
											}
										},
										"required": [
											"kind",
											"method",
											"interpolant",
											"reconstructedBy"
										],
										"additionalProperties": false
									}
								]
							},
							"series": {
								"type": "array",
								"minItems": 1,
								"maxItems": 1024,
								"description": "The synapses, in canonical identity order — one drawn time series per synapse. The array is named `series` and each synapse's weight quantity is named `values` so the registered trace validators read the actual carriers. Series order fixes table, legend and palette identity order. Exact mean and Type-7 order statistics are permutation-invariant; revision 2 reports no min/max extremizer identity or tie-break claim.",
								"items": {
									"type": "object",
									"properties": {
										"edgeId": {
											"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
											"description": "Stable per-SYNAPSE identity. Two parallel synapses between one pair are two edge ids and are never merged. A source that cannot attribute a weight event to a single synapse cannot supply this."
										},
										"label": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
										"endpoints": {
											"type": "object",
											"description": "The presynaptic source and postsynaptic target. Descriptive: this figure declares no node universe and makes no degree or connectivity claim. Both ids are required together — a half-identified synapse names nothing.",
											"properties": {
												"sourceId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
												"targetId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" }
											},
											"required": ["sourceId", "targetId"],
											"additionalProperties": false
										},
										"synapseModel": {
											"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
											"description": "The source system's synapse model — which IS the plasticity rule (`stdp_synapse`, `tsodyks2_synapse`, `static_synapse`). Required, recorded verbatim, and never used to infer a unit, a bound, or a comparability claim. Two numbers are not comparable merely because both are called `weight`."
										},
										"recordedInterval": {
											"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow",
											"description": "The span over which the source was actually observing THIS synapse. Required. A held step is drawn only inside it, and the last observed value is never extended past it: without this declaration, holding to the window edge would silently assert that no update occurred after the recorder stopped."
										},
										"time": {
											"type": "object",
											"description": "This synapse's observation times. Every value is finite: an observation with an unknown time is not an observation, so `null` is not accepted here — unlike a weight, where null is a legitimate missing value.",
											"properties": {
												"kind": { "const": "time" },
												"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
												"values": {
													"type": "array",
													"items": { "type": "number" },
													"maxItems": 25e4
												}
											},
											"required": [
												"kind",
												"unit",
												"values"
											],
											"additionalProperties": false
										},
										"values": {
											"type": "object",
											"description": "The observed weights for this synapse. Named `values` (not `weights`) so `trace.axis_dimension_compatible` reads `data.series[].values.unit` and refuses to pool weights of different dimensions on one axis. Written out rather than $ref'd to `quantitySeries` because the accepted `kind` is exactly one: a membrane potential or a firing rate on this axis would be a routing error, not a weight trace.",
											"properties": {
												"kind": { "const": "synaptic_weight" },
												"unit": {
													"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode",
													"description": "A code whose dimension is legal for `synaptic_weight`: `nest:weight` (simulator-defined, never converted), a conductance, a current, a voltage, or `1`. A simulator-defined weight has no SI mapping and is never pooled with any other code."
												},
												"values": {
													"type": "array",
													"items": { "type": ["number", "null"] },
													"maxItems": 25e4,
													"description": "`null` is a MISSING observation and it BREAKS THE HOLD: the interval to the next observed update is undefined and drawn as a gap. Holding the previous value across it would assert that the update did nothing."
												}
											},
											"required": [
												"kind",
												"unit",
												"values"
											],
											"additionalProperties": false
										},
										"eventKinds": {
											"type": "array",
											"maxItems": 25e4,
											"description": "Optional for event-updated and point-sample sources, exactly parallel to `time`: when present it has one entry per source observation and reaches the table as the source-event column. `poll` marks a value that was read rather than written. It is forbidden for interpolated_trajectory because reconstruction points are not source events; their distinct reconstruction carrier and method/interpolant/author metadata provide the relevant provenance without inventing a source-event classification.",
											"items": {
												"type": "string",
												"enum": [
													"presynaptic_spike",
													"postsynaptic_spike",
													"structural_update",
													"poll",
													"parameter_write",
													"unknown"
												]
											}
										},
										"initialWeight": {
											"type": "object",
											"description": "Optional. The weight at the start of the recorded interval, before the first observed update. It closes the leading gap under `value_after_update`, appears as an explicit declared-initial-state table carrier whenever that hold is directly painted or the state is consumed by a derived aggregate, and lets the member contribute to an aggregate before its first update. It is a DECLARATION and must say where it came from. In a derived aggregate its unit code must exactly equal the member values' unit so an independently rounded conversion never enters the statistic.",
											"properties": {
												"quantity": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantity" },
												"origin": {
													"type": "string",
													"enum": [
														"model_parameter",
														"measured_at_window_start",
														"declared_by_caller"
													],
													"description": "Required source metadata. A model parameter is a fact about the run; a caller assertion is a fact about the caller, and the table says which."
												}
											},
											"required": ["quantity", "origin"],
											"additionalProperties": false
										},
										"bounds": {
											"type": "object",
											"description": "Optional reference bounds (an STDP `Wmax`, a floor at zero). When `showReferenceLines` is true they are drawn for member series that the chosen display actually shows (`individual` or `aggregate_derived_with_members`); aggregate-only derived display intentionally omits member references. Every emitted line is annotated with its origin. Cortexel NEVER clamps, rounds, or corrects an observed weight against a bound: a value observed above a hard bound stays where it was observed, because clamping it would turn the figure into evidence that the bound was respected.",
											"properties": {
												"lower": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantity" },
												"upper": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantity" },
												"boundKind": {
													"type": "string",
													"enum": ["hard", "soft"],
													"description": "hard: the rule clips at the bound. soft: the rule approaches it asymptotically. The distinction changes how a flat trace at the bound should be read, and it is the caller's declaration."
												},
												"origin": {
													"type": "string",
													"enum": ["model_parameter", "declared_by_caller"]
												}
											},
											"required": ["boundKind", "origin"],
											"anyOf": [{
												"type": "object",
												"required": ["lower"]
											}, {
												"type": "object",
												"required": ["upper"]
											}],
											"additionalProperties": false
										},
										"uncertainty": {
											"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty",
											"description": "Required on every edge and semantically fixed to `{\"kind\":\"none\",\"reason\":...}` in revision 2. This series is one identified synapse from one run; no repeat universe, alignment, central estimator, or repeat-level carrier exists to substantiate a non-none uncertainty. Future repeat-aware input needs a new contract rather than an unbound basis label."
										},
										"sourceRef": {
											"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/dataRef",
											"description": "Optional content-addressed reference to the bytes this trace was extracted from. Cortexel RECORDS it and never resolves it — stable core has no filesystem or network authority — and it never substitutes for the inline observations."
										}
									},
									"required": [
										"edgeId",
										"synapseModel",
										"recordedInterval",
										"time",
										"values",
										"uncertainty"
									],
									"additionalProperties": false
								}
							},
							"membership": {
								"type": "object",
								"description": "The group whose aggregate is drawn, and WHEN each synapse belonged to it. Required for any derived aggregate. Membership over time is not a refinement: a synapse created by structural plasticity at 500 ms did not exist before, and counting it from 0 ms drags the mean toward its initial weight at times when it was not there.",
								"properties": {
									"groupId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"groupLabel": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
										"description": "Display text. The accessible summary always prints the member count beside it, so a label cannot do the work of a completeness claim that no scope in this contract supports."
									},
									"unit": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode",
										"description": "The time unit of the intervals below. Declared explicitly rather than inherited: a compatible unit such as seconds is converted exactly once into the window unit, while an incompatible dimension or an unrepresentable conversion is refused instead of silently shrinking or moving the group."
									},
									"members": {
										"type": "array",
										"minItems": 1,
										"maxItems": 1024,
										"description": "A set-like selection over declared edge ids. Array permutation does not change numeric aggregation or identity order: the selected members retain the canonical order of `data.series`; duplicate membership ids are refused.",
										"items": {
											"type": "object",
											"properties": {
												"edgeId": {
													"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
													"description": "Must resolve to exactly one declared edge. In derived mode the membership id set and data.series id set are equal: neither foreign members nor unused raw series are accepted."
												},
												"intervals": {
													"type": "array",
													"minItems": 1,
													"maxItems": 64,
													"description": "The half-open [enter, exit) spans during which this synapse belonged to the group. A synapse that was created, pruned, and re-created has several.",
													"items": {
														"type": "object",
														"properties": {
															"start": { "type": "number" },
															"stop": { "type": "number" }
														},
														"required": ["start", "stop"],
														"additionalProperties": false
													}
												}
											},
											"required": ["edgeId", "intervals"],
											"additionalProperties": false
										}
									}
								},
								"required": [
									"groupId",
									"unit",
									"members"
								],
								"additionalProperties": false
							}
						},
						"required": [
							"mode",
							"window",
							"scope",
							"observation",
							"series"
						],
						"additionalProperties": false
					}, {
						"type": "object",
						"description": "Pre-aggregated mode: the caller supplies an aggregate it computed elsewhere. Cortexel never saw the members, so it cannot re-derive the value — it checks what it can (lengths, counts, bounds, the denominator rules) and discloses that the individual synapses were not supplied and cannot be shown.",
						"properties": {
							"mode": { "const": "preaggregated" },
							"window": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow" },
							"scope": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope" },
							"aggregate": {
								"type": "object",
								"properties": {
									"groupId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"groupLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
									"synapseModel": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
										"description": "The one synapse model whose weights were aggregated. Revision 2 has only this scalar carrier, so a caller-declared aggregate spanning several models is not representable and must be split rather than encoded as a comma-joined pseudo-model."
									},
									"method": {
										"type": "string",
										"enum": [
											"mean",
											"median",
											"min",
											"max"
										],
										"description": "The statistic that was computed. `sum` is absent by design: over a membership that changes size it conflates a change in the number of synapses with a change in their weights, and no registered disclosure can carry that conflation."
									},
									"intervalMethod": {
										"type": "string",
										"enum": [
											"hold_last_observed",
											"shared_sample_grid",
											"declared_by_source"
										],
										"description": "How the caller obtained each member's value at each evaluation time. Required: an aggregate of event-updated weights is meaningless until it says what it assumed about the times between the updates. `declared_by_source` is an honest admission that the upstream system's rule is not known in this detail, and it is disclosed as such."
									},
									"observation": {
										"description": "How the AGGREGATE SERIES itself is to be read and drawn. The mean of right-continuous step functions is itself a right-continuous step function, so a hold-evaluated mean of event-updated weights is `event_updated` and is drawn as steps — not as a smooth line through its evaluation points.",
										"oneOf": [
											{
												"type": "object",
												"properties": {
													"kind": { "const": "event_updated" },
													"updateSemantics": {
														"type": "string",
														"enum": ["value_after_update", "value_before_update"]
													}
												},
												"required": ["kind", "updateSemantics"],
												"additionalProperties": false
											},
											{
												"type": "object",
												"properties": { "kind": { "const": "point_sample" } },
												"required": ["kind"],
												"additionalProperties": false
											},
											{
												"type": "object",
												"properties": {
													"kind": { "const": "interpolated_trajectory" },
													"method": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
													"interpolant": {
														"const": "linear",
														"description": "Revision 2's canonical geometry is a straight segment between supplied aggregate vertices, so only `linear` is accepted."
													},
													"reconstructedBy": {
														"type": "string",
														"enum": ["source_system", "caller"]
													}
												},
												"required": [
													"kind",
													"method",
													"interpolant",
													"reconstructedBy"
												],
												"additionalProperties": false
											}
										]
									},
									"time": {
										"type": "object",
										"description": "The evaluation times of the aggregate. Finite; no nulls.",
										"properties": {
											"kind": { "const": "time" },
											"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
											"values": {
												"type": "array",
												"items": { "type": "number" },
												"minItems": 1,
												"maxItems": 25e4
											}
										},
										"required": [
											"kind",
											"unit",
											"values"
										],
										"additionalProperties": false
									},
									"values": {
										"type": "object",
										"description": "The aggregate at each evaluation time. `null` where no member contributed — never 0.",
										"properties": {
											"kind": { "const": "synaptic_weight" },
											"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
											"values": {
												"type": "array",
												"items": { "type": ["number", "null"] },
												"contains": { "type": "number" },
												"minContains": 1,
												"minItems": 1,
												"maxItems": 25e4
											}
										},
										"required": [
											"kind",
											"unit",
											"values"
										],
										"additionalProperties": false
									},
									"memberCounts": {
										"type": "array",
										"items": {
											"type": "integer",
											"minimum": 0,
											"maximum": 9007199254740991
										},
										"minItems": 1,
										"maxItems": 25e4,
										"description": "How many synapses belonged to the group at each evaluation time. This is what makes a CHANGING membership visible: a mean that rises while this count falls is a different fact from a mean that rises while it holds."
									},
									"contributingCounts": {
										"type": "array",
										"items": {
											"type": "integer",
											"minimum": 0,
											"maximum": 9007199254740991
										},
										"minItems": 1,
										"maxItems": 25e4,
										"description": "How many of those members actually had a value at that time. THIS is the denominator of a mean — never the member count, never the number of synapses in the network. It must be <= the member count, it must be positive wherever a value is present, and where it is 0 the value must be null."
									},
									"uncertainty": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty",
										"description": "Required. The descriptive spread across the contributing member synapses at each evaluation time, or an explicit `none`. A non-none carrier must use basis `ensemble_members` and provide sampleCount; distinct synapses are not presumed to be statistical replicates. Empirical quantile/range counts equal positive contributingCounts, and quantile_interval method is exactly `empirical_type_7_linear`; sample standard deviation is allowed only with a mean, equals contributingCounts only at two or more contributors, and is null below that threshold. Range/quantile bounds must be mathematically compatible with the declared aggregate method and collapse to the sole aggregate value at one contributor. Standard error, confidence intervals, and credible intervals are refused because this request carries no inferential sampling or posterior design."
									}
								},
								"required": [
									"groupId",
									"synapseModel",
									"method",
									"intervalMethod",
									"observation",
									"time",
									"values",
									"memberCounts",
									"contributingCounts",
									"uncertainty"
								],
								"additionalProperties": false
							}
						},
						"required": [
							"mode",
							"window",
							"scope",
							"aggregate"
						],
						"additionalProperties": false
					}]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"display": {
							"type": "string",
							"enum": [
								"individual",
								"aggregate_derived",
								"aggregate_derived_with_members",
								"aggregate_declared"
							],
							"description": "individual: one drawn series per synapse, with a legend entry each; refused above 8 edges — the palette's `categoricalSeries.maxStableSeries` — rather than minting an unregistered style. The cap and tuple-uniqueness test do not establish perceptual or accessibility conformance. aggregate_derived: Cortexel computes the aggregate from the member observations. aggregate_derived_with_members: the same, with the members drawn behind it WITHOUT individual colour or legend identity, so the spread is visible while no per-synapse colour claim is made. aggregate_declared: the caller's pre-aggregated series, which Cortexel cannot re-derive. The first three require `data.mode: edges`; the last requires `data.mode: preaggregated`."
						},
						"weightComparability": {
							"description": "Why these weights may share one value axis at all. Required, because `nest:weight` is one code covering values whose physical meaning differs by synapse and neuron model: the same number 10.0 may be a 10 pA postsynaptic current under one model and a 10 nS conductance under another.",
							"oneOf": [{
								"type": "object",
								"description": "Every drawn weight comes from the same synapse model. If two or more distinct `synapseModel` values are present, this fails with SCIENCE_WEIGHT_GROUP_INCOMPATIBLE.",
								"properties": { "mode": { "const": "single_synapse_model" } },
								"required": ["mode"],
								"additionalProperties": false
							}, {
								"type": "object",
								"description": "The caller declares that the listed models produce weights that mean the same physical thing. The set of distinct models present must equal this list exactly. Cortexel verifies that the claim was made and that it matches the data; it cannot verify that it is TRUE, and the declared set is surfaced in the summary and the table, attributed to the caller.",
								"properties": {
									"mode": { "const": "declared_comparable_models" },
									"comparableModels": {
										"type": "array",
										"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
										"minItems": 2,
										"maxItems": 64
									}
								},
								"required": ["mode", "comparableModels"],
								"additionalProperties": false
							}]
						},
						"aggregate": {
							"type": "object",
							"description": "How Cortexel is to DERIVE the aggregate from the declared members. Required for `aggregate_derived` and `aggregate_derived_with_members`; forbidden for `individual` and for `aggregate_declared`, where there is nothing to derive.",
							"properties": {
								"method": {
									"type": "string",
									"enum": [
										"mean",
										"median",
										"min",
										"max"
									],
									"description": "mean divides by the CONTRIBUTING count, never the member count. median is the Type-7 0.5 quantile. min/max return the exact extreme value; revision 2 reports no extremizer identity or tie set."
								},
								"evaluation": {
									"description": "The interval method: how a member's value at an evaluation time is obtained. There is no interpolating mode and there never will be — an interpolated weight between two updates is a value that never existed.",
									"oneOf": [
										{
											"type": "object",
											"description": "Evaluate at the exact discontinuity closure: window start, every accepted member observation, membership start/stop, effective recorded start/stop, and an inclusive window stop. Holding is legal only when `data.observation.kind` is `event_updated`; including every state boundary prevents a value or denominator from being held across a change that is absent from the table.",
											"properties": { "mode": { "const": "hold_last_observed_at_union_times" } },
											"required": ["mode"],
											"additionalProperties": false
										},
										{
											"type": "object",
											"description": "Evaluate at an explicit grid, holding each member's last observed value. Legal only for `event_updated`, and the grid MUST contain the complete discontinuity closure used by the union mode. Extra read times are allowed; omitting an observation, membership, recording or initial-state boundary is refused because the rendered aggregate is a complete step carrier, not a sparse point sample.",
											"properties": {
												"mode": { "const": "hold_last_observed_at_declared_times" },
												"times": {
													"type": "object",
													"properties": {
														"kind": { "const": "time" },
														"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
														"values": {
															"type": "array",
															"items": { "type": "number" },
															"minItems": 1,
															"maxItems": 25e4
														}
													},
													"required": [
														"kind",
														"unit",
														"values"
													],
													"additionalProperties": false
												}
											},
											"required": ["mode", "times"],
											"additionalProperties": false
										},
										{
											"type": "object",
											"description": "Aggregate per sample index over an identical accepted time vector. Legal only for `point_sample`. Repeated samples must first be collapsed by the declared within-synapse aggregate method; `keep_replicates` is refused because no cross-member replicate identity licenses pairing by ordinal. Nothing is held or interpolated.",
											"properties": { "mode": { "const": "shared_sample_grid" } },
											"required": ["mode"],
											"additionalProperties": false
										}
									]
								},
								"dispersion": {
									"description": "The spread across the CONTRIBUTING member synapses at each evaluation time, computed by Cortexel from the members it was given. It is a library-generated fact, which is why it is requested by name here rather than supplied as values.",
									"oneOf": [
										{
											"type": "object",
											"properties": {
												"kind": { "const": "none" },
												"reason": {
													"type": "string",
													"enum": [
														"single_trial",
														"not_computed",
														"not_available",
														"not_applicable"
													]
												}
											},
											"required": ["kind", "reason"],
											"additionalProperties": false
										},
										{
											"type": "object",
											"description": "One sample standard deviation across the contributing members, descriptive only and permitted only around a mean. It is NOT an interval, standard error, or population claim and is never relabelled as one.",
											"properties": { "kind": { "const": "standard_deviation" } },
											"required": ["kind"],
											"additionalProperties": false
										},
										{
											"type": "object",
											"description": "Empirical quantiles of the contributing members. It carries no coverage probability and is never drawn or labelled as a confidence interval.",
											"properties": {
												"kind": { "const": "quantile_interval" },
												"lowerQuantile": {
													"type": "number",
													"minimum": 0,
													"maximum": 1
												},
												"upperQuantile": {
													"type": "number",
													"minimum": 0,
													"maximum": 1
												}
											},
											"required": [
												"kind",
												"lowerQuantile",
												"upperQuantile"
											],
											"additionalProperties": false
										},
										{
											"type": "object",
											"description": "The observed minimum and maximum across the contributing members. No coverage probability, and never drawn as a confidence interval.",
											"properties": { "kind": { "const": "ensemble_range" } },
											"required": ["kind"],
											"additionalProperties": false
										}
									]
								}
							},
							"required": [
								"method",
								"evaluation",
								"dispersion"
							],
							"additionalProperties": false
						},
						"duplicateTimePolicy": {
							"description": "What to do when one synapse has two carriers at one timestamp. Enforced semantically when duplicates actually exist. Revision 2 refuses actual `keep_replicates` for all weight kinds: event rows have no side/order identity, repeated point samples would be connected as an invented within-time trajectory, and two reconstruction y values at one x are not a function. Point samples and reconstruction vertices may instead be collapsed by one named method. Collapsing a series with non-none per-row uncertainty is refused because no propagation model is declared. The keep branch remains structurally parseable so this scientific refusal is explicit rather than downgraded to a generic schema error.",
							"oneOf": [
								{
									"type": "object",
									"properties": { "policy": { "const": "reject" } },
									"required": ["policy"],
									"additionalProperties": false
								},
								{
									"type": "object",
									"properties": { "policy": { "const": "keep_replicates" } },
									"required": ["policy"],
									"additionalProperties": false
								},
								{
									"type": "object",
									"description": "Applied within one edge at one timestamp over non-null repeated point samples or linear reconstruction vertices; an even-count median is the Type-7 0.5 quantile. The source-row multiplicity reaches the table. Event-updated duplicates may not aggregate, and actual duplicate keep_replicates is refused for every weight kind.",
									"properties": {
										"policy": { "const": "aggregate" },
										"method": {
											"type": "string",
											"enum": [
												"mean",
												"median",
												"min",
												"max"
											]
										}
									},
									"required": ["policy", "method"],
									"additionalProperties": false
								}
							]
						},
						"showObservationMarkers": {
							"type": "boolean",
							"default": false,
							"description": "Draw optional markers at every finite, marker-eligible displayed source observation, reconstruction vertex, and aggregate-evaluation carrier. Missing, table-only, or off-membership carriers remain unmarked. Presentation only: it changes no value or authority class. Reconstruction markers remain labelled reconstruction nodes; derived state-boundary evaluations remain derived carriers. One exception is contract-owned rather than optional: an included zero-duration event update at a closed terminal edge always receives an authority-bound terminal marker so it cannot be omitted from the RenderPlan."
						},
						"showReferenceLines": {
							"type": "boolean",
							"default": false,
							"description": "Draw declared initial weights and bounds for series present in the selected display (`individual`, `aggregate_derived_with_members`, or a caller-declared aggregate) as reference lines annotated with their declared origin. An aggregate-only derived display omits raw-member reference lines. Declarations are never used to clamp or correct an observed value."
						}
					},
					"required": ["display", "weightComparability"],
					"additionalProperties": false,
					"allOf": [{
						"if": {
							"properties": { "display": { "enum": ["aggregate_derived", "aggregate_derived_with_members"] } },
							"required": ["display"]
						},
						"then": { "required": ["aggregate"] }
					}, {
						"if": {
							"properties": { "display": { "enum": ["individual", "aggregate_declared"] } },
							"required": ["display"]
						},
						"then": { "not": { "required": ["aggregate"] } }
					}]
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "network.synaptic_weight_trace" },
			"data": {
				"mode": "edges",
				"window": {
					"start": 0,
					"stop": 1e3,
					"unit": "ms",
					"boundary": "[start,stop)"
				},
				"scope": {
					"kind": "single_process",
					"complete": true
				},
				"observation": {
					"kind": "event_updated",
					"updateSemantics": "value_after_update"
				},
				"series": [{
					"edgeId": "syn_12_45_0",
					"label": "12 to 45",
					"endpoints": {
						"sourceId": "12",
						"targetId": "45"
					},
					"synapseModel": "stdp_synapse",
					"recordedInterval": {
						"start": 0,
						"stop": 1e3,
						"unit": "ms",
						"boundary": "[start,stop)"
					},
					"time": {
						"kind": "time",
						"unit": "ms",
						"values": [
							10,
							60,
							130,
							210
						]
					},
					"values": {
						"kind": "synaptic_weight",
						"unit": "nest:weight",
						"values": [
							1,
							1.15,
							1.09,
							null
						]
					},
					"eventKinds": [
						"presynaptic_spike",
						"presynaptic_spike",
						"presynaptic_spike",
						"presynaptic_spike"
					],
					"initialWeight": {
						"quantity": {
							"kind": "synaptic_weight",
							"unit": "nest:weight",
							"value": 1
						},
						"origin": "model_parameter"
					},
					"bounds": {
						"upper": {
							"kind": "synaptic_weight",
							"unit": "nest:weight",
							"value": 2
						},
						"boundKind": "hard",
						"origin": "model_parameter"
					},
					"uncertainty": {
						"kind": "none",
						"reason": "single_trial"
					}
				}, {
					"edgeId": "syn_12_46_0",
					"label": "12 to 46",
					"endpoints": {
						"sourceId": "12",
						"targetId": "46"
					},
					"synapseModel": "stdp_synapse",
					"recordedInterval": {
						"start": 0,
						"stop": 1e3,
						"unit": "ms",
						"boundary": "[start,stop)"
					},
					"time": {
						"kind": "time",
						"unit": "ms",
						"values": [
							10,
							60,
							130
						]
					},
					"values": {
						"kind": "synaptic_weight",
						"unit": "nest:weight",
						"values": [
							1,
							.94,
							.9
						]
					},
					"eventKinds": [
						"presynaptic_spike",
						"presynaptic_spike",
						"presynaptic_spike"
					],
					"initialWeight": {
						"quantity": {
							"kind": "synaptic_weight",
							"unit": "nest:weight",
							"value": 1
						},
						"origin": "model_parameter"
					},
					"bounds": {
						"upper": {
							"kind": "synaptic_weight",
							"unit": "nest:weight",
							"value": 2
						},
						"boundKind": "hard",
						"origin": "model_parameter"
					},
					"uncertainty": {
						"kind": "none",
						"reason": "single_trial"
					}
				}]
			},
			"parameters": {
				"display": "individual",
				"weightComparability": { "mode": "single_synapse_model" },
				"duplicateTimePolicy": { "policy": "reject" },
				"showObservationMarkers": true,
				"showReferenceLines": true
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"network.weight_distribution": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/network.weight_distribution.request.v1.schema.json",
			"title": "network.weight_distribution request",
			"description": "GENERATED from contract/skills/network.weight_distribution.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "network.weight_distribution" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"description": "A connection snapshot with weights, or a pre-binned histogram of those weights, in both cases over an explicitly declared source x target rectangle and an explicit network scope. `mode` is the discriminator; the fields of the other mode are refused rather than ignored.",
					"oneOf": [{
						"type": "object",
						"properties": {
							"mode": { "const": "connections" },
							"sourceUniverse": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse",
								"description": "The COMPLETE set of presynaptic nodes the population was selected from. `complete` must be true: it is half of the statement 'these are the connections from A to B', and without it the histogram describes an unnamed population."
							},
							"targetUniverse": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse",
								"description": "The COMPLETE set of postsynaptic nodes the population was selected from. Under an MPI target-rank-local scope this is exactly the rank's local targets."
							},
							"connections": {
								"description": "Exactly the connections of the declared rectangle. `weights` is REQUIRED and its kind must be `synaptic_weight`: a connection snapshot without weights is a topology figure, not this one. Every multapse is its own row and is never deduplicated.",
								"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/connectionRows" }, {
									"type": "object",
									"required": ["weights", "synapseModels"],
									"properties": { "weights": {
										"type": "object",
										"required": ["kind"],
										"properties": { "kind": { "const": "synaptic_weight" } }
									} }
								}]
							},
							"observedTargetIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "Complete target-id authority under mpi_target_rank_local. It must equal targetUniverse.ids exactly."
							},
							"scope": {
								"description": "What this snapshot actually saw. `snapshotTime` is REQUIRED even though the shared type leaves it optional: a weight is a state variable, and an undated weight distribution cannot be bound to a moment in the run.",
								"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope" }, {
									"type": "object",
									"required": ["snapshotTime"]
								}]
							}
						},
						"required": [
							"mode",
							"sourceUniverse",
							"targetUniverse",
							"connections",
							"scope"
						],
						"additionalProperties": false
					}, {
						"type": "object",
						"properties": {
							"mode": { "const": "prebinned" },
							"sourceUniverse": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse",
								"description": "The COMPLETE set of presynaptic nodes the population was selected from. `complete` must be true: it is half of the statement 'these are the connections from A to B', and without it the histogram describes an unnamed population."
							},
							"targetUniverse": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse",
								"description": "The COMPLETE set of postsynaptic nodes the population was selected from. Under an MPI target-rank-local scope this is exactly the rank's local targets."
							},
							"binEdges": {
								"type": "object",
								"description": "Strictly increasing finite edges, read by `bins.strictly_increasing`. n edges define n-1 bins, half-open with a final-edge-inclusive last bin. When the range spans zero an exact edge at 0 is required.",
								"properties": {
									"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
									"edges": {
										"type": "array",
										"items": { "type": "number" },
										"minItems": 2,
										"maxItems": 100001
									}
								},
								"required": ["unit", "edges"],
								"additionalProperties": false
							},
							"counts": {
								"type": "array",
								"items": {
									"type": "integer",
									"minimum": 0
								},
								"minItems": 1,
								"maxItems": 1e5,
								"description": "Exact integer observation counts per bin. Length must be edges.length - 1. These are the raw numbers everything else is re-derived from."
							},
							"histogram": {
								"type": "object",
								"description": "Optional normalized values, read by `histogram.normalization_consistent`. If supplied they are RE-DERIVED from the counts and the denominator and checked within a tight tolerance; they are never taken on trust.",
								"properties": {
									"kind": { "allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" }, { "enum": ["probability", "probability_density"] }] },
									"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
									"values": {
										"type": "array",
										"items": { "type": "number" },
										"minItems": 1,
										"maxItems": 1e5
									}
								},
								"required": [
									"kind",
									"unit",
									"values"
								],
								"additionalProperties": false
							},
							"sourceConnectionCount": {
								"type": "integer",
								"minimum": 0,
								"description": "The number of connection ROWS in the declared rectangle, before any aggregation and before any exclusion. It is the top of the conservation chain: every row is either an observation or a missing weight."
							},
							"missingWeightCount": {
								"type": "integer",
								"minimum": 0,
								"description": "Rows whose weight was absent or null. They are excluded from every bin and every denominator and are NEVER counted as zero."
							},
							"missingObservationCount": {
								"type": "integer",
								"minimum": 0,
								"description": "Missing observations after applying observationUnit. Equals missingWeightCount under synapse; under node_pair it counts ordered pairs containing at least one missing row."
							},
							"sourceOrderedPairCount": {
								"type": "integer",
								"minimum": 0,
								"description": "Distinct ordered endpoint pairs before missing-pair exclusion. Required for prebinned node_pair and bounded by sourceConnectionCount."
							},
							"totalObservationCount": {
								"type": "integer",
								"minimum": 0,
								"description": "All observations formed, in range and out of range. Under `observationUnit: synapse` this plus missingWeightCount must equal sourceConnectionCount exactly."
							},
							"excludedUnderRangeCount": {
								"type": "integer",
								"minimum": 0,
								"description": "Observations below the first edge. Under outOfRangeWeights `reject` this must be 0."
							},
							"excludedOverRangeCount": {
								"type": "integer",
								"minimum": 0,
								"description": "Observations above the last edge. Under outOfRangeWeights `reject` this must be 0."
							},
							"zeroWeightCount": {
								"type": "integer",
								"minimum": 0,
								"description": "Observations whose value is exactly 0. Reported separately because the half-open convention places them in the first non-negative bin, where they would otherwise be read as weak excitatory synapses."
							},
							"contributingSynapseModels": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
								"minItems": 1,
								"maxItems": 64,
								"description": "Every distinct synapse model that contributed a weight. Required, because a pre-binned histogram destroys the per-row model and the comparability claim would otherwise be unverifiable against anything at all."
							},
							"observedTargetIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "Complete rank-owned target authority for mpi_target_rank_local evidence; equals targetUniverse.ids exactly. In prebin mode it remains a caller-declared upstream fact because rows are absent."
							},
							"scope": {
								"description": "What this snapshot actually saw. `snapshotTime` is REQUIRED even though the shared type leaves it optional: a weight is a state variable, and an undated weight distribution cannot be bound to a moment in the run.",
								"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope" }, {
									"type": "object",
									"required": ["snapshotTime"]
								}]
							}
						},
						"required": [
							"mode",
							"sourceUniverse",
							"targetUniverse",
							"binEdges",
							"counts",
							"sourceConnectionCount",
							"missingWeightCount",
							"missingObservationCount",
							"totalObservationCount",
							"excludedUnderRangeCount",
							"excludedOverRangeCount",
							"zeroWeightCount",
							"contributingSynapseModels",
							"scope"
						],
						"additionalProperties": false
					}]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"selectionId": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
							"description": "Names the edge population so two weight figures of the same run cannot be confused for one another."
						},
						"selectionLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
						"observationUnit": {
							"type": "string",
							"enum": ["synapse", "node_pair"],
							"description": "What ONE observation is. synapse: every connection row counts once, so a multapse of three contributes three weights — this is the distribution of synaptic weights. node_pair: the rows of an ordered pair are combined by the declared aggregation into one observation — this is the distribution of per-pair drive, which is a different quantity and is labelled as one. There is no default; the two answers differ, and the difference is scientific."
						},
						"aggregation": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/multapseAggregation",
							"description": "How the connections of one ordered pair are combined. Required under `node_pair` and REFUSED under `synapse`, where nothing is combined. `no_aggregation` asserts at most one connection per ordered pair and fails if that is untrue; there is no implicit 'last edge wins'."
						},
						"weightComparability": {
							"description": "Why these weights may share one axis at all. Required, because `nest:weight` is one code covering values whose physical meaning depends on the synapse AND the postsynaptic neuron model: the same number 10.0 may be 10 pA of injected current under one model and 10 nS of conductance under another, and a histogram of the two is a histogram of nothing.",
							"oneOf": [{
								"type": "object",
								"description": "Every contributing weight comes from one synapse model. If two or more distinct models are present this fails with SCIENCE_WEIGHT_GROUP_INCOMPATIBLE. If the weight unit is `nest:weight` and no model is declared at all, this also fails: under a simulator-defined unit an undeclared model set is an unproven pooling claim, not a homogeneous one.",
								"properties": { "mode": { "const": "single_synapse_model" } },
								"required": ["mode"],
								"additionalProperties": false
							}, {
								"type": "object",
								"description": "The caller declares that the listed synapse models produce weights that mean the same physical thing and may share one axis. The set of distinct models present must equal this list exactly. Cortexel verifies that the claim was made and that it matches the data; it cannot verify that the claim is true, and the declared set is surfaced in the summary and the table.",
								"properties": {
									"mode": { "const": "declared_comparable_models" },
									"comparableModels": {
										"type": "array",
										"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
										"minItems": 2,
										"maxItems": 64
									}
								},
								"required": ["mode", "comparableModels"],
								"additionalProperties": false
							}]
						},
						"signTreatment": {
							"type": "string",
							"enum": ["preserve", "magnitude"],
							"description": "preserve: the observation is the weight, sign and all. It is the only choice that destroys nothing. magnitude: the observation is |w|; a -60 pA inhibitory synapse and a +60 pA excitatory one become the same observation. It is applied only when it is asked for, it is recorded in the derivation receipt, and the axis is labelled |weight|."
						},
						"grouping": {
							"type": "string",
							"enum": ["none", "by_synapse_model"],
							"description": "none: one histogram over the pooled observations. by_synapse_model: one series per distinct synapse model over the SAME bins, which does not pool the counts but still shares an x axis — so it still requires `declared_comparable_models`, and requiring only one model with it is refused as a redundant encoding of one figure. Available only in `connections` mode, where the rows carry a model; series are capped at 8 (RENDER_SERIES_LIMIT_EXCEEDED)."
						},
						"bins": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/binSpec",
							"description": "The bin edges, in `connections` mode. Required there and REFUSED in `prebinned` mode, where the edges are data. Cortexel does not choose bin edges: with the same weights, edges that begin at 0 delete every inhibitory synapse, and a bin that straddles 0 merges the two populations into one bar. Both are refused rather than drawn."
						},
						"normalization": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/histogramNormalization",
							"description": "count: exact integers. probability: sums to 1 over the BINNED observations. density: integrates to 1 over the linear bin widths, with a unit reciprocal to the bin unit — and therefore refused on a `nest:weight` axis, which has no reciprocal code and no dimension a density could carry."
						},
						"outOfRangeWeights": {
							"type": "string",
							"enum": ["reject", "exclude_and_report"],
							"description": "What happens to an observation outside [firstEdge, lastEdge]. reject: the bins must cover the data. exclude_and_report: it is excluded, counted, and the under-range and over-range totals are disclosed — after which the plotted probabilities describe only the binned subset, not the population."
						},
						"xScale": {
							"type": "string",
							"enum": ["linear", "log"],
							"default": "linear",
							"description": "Presentation only; it never changes a derived value, and density always uses the LINEAR bin width. `log` requires every bin edge and every observation to be strictly positive, because a negative or zero weight has no position on a logarithmic axis and dropping it would delete exactly the inhibitory synapses and the silenced ones."
						},
						"uncertainty": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty" }, {
								"type": "object",
								"properties": { "kind": { "const": "none" } },
								"required": ["kind"]
							}],
							"description": "Explicit absence only. Revision 2 accepts no uncertainty array until estimator, basis, table, summary, legend and geometry ship together."
						}
					},
					"required": [
						"selectionId",
						"observationUnit",
						"weightComparability",
						"signTreatment",
						"grouping",
						"normalization",
						"outOfRangeWeights",
						"uncertainty"
					],
					"additionalProperties": false,
					"allOf": [
						{
							"if": {
								"properties": { "observationUnit": { "const": "node_pair" } },
								"required": ["observationUnit"]
							},
							"then": { "required": ["aggregation"] }
						},
						{
							"if": {
								"properties": { "observationUnit": { "const": "synapse" } },
								"required": ["observationUnit"]
							},
							"then": { "not": { "required": ["aggregation"] } }
						},
						{
							"if": {
								"properties": { "grouping": { "const": "by_synapse_model" } },
								"required": ["grouping"]
							},
							"then": { "properties": { "weightComparability": {
								"type": "object",
								"properties": { "mode": { "const": "declared_comparable_models" } },
								"required": ["mode"]
							} } }
						}
					]
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false,
			"allOf": [{ "allOf": [
				{
					"if": { "properties": { "data": {
						"properties": { "mode": { "const": "connections" } },
						"required": ["mode"]
					} } },
					"then": { "properties": { "parameters": { "required": ["bins"] } } }
				},
				{
					"if": { "properties": { "data": {
						"properties": { "mode": { "const": "prebinned" } },
						"required": ["mode"]
					} } },
					"then": { "properties": { "parameters": {
						"properties": { "grouping": { "const": "none" } },
						"not": { "required": ["bins"] }
					} } }
				},
				{
					"if": { "properties": { "data": {
						"properties": { "scope": {
							"properties": { "kind": { "const": "mpi_target_rank_local" } },
							"required": ["kind"]
						} },
						"required": ["scope"]
					} } },
					"then": { "properties": { "data": { "required": ["observedTargetIds"] } } }
				},
				{
					"if": { "properties": {
						"data": {
							"properties": { "mode": { "const": "prebinned" } },
							"required": ["mode"]
						},
						"parameters": {
							"properties": { "observationUnit": { "const": "node_pair" } },
							"required": ["observationUnit"]
						}
					} },
					"then": { "properties": { "data": { "required": ["sourceOrderedPairCount"] } } }
				}
			] }]
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "network.weight_distribution" },
			"data": {
				"mode": "connections",
				"sourceUniverse": {
					"ids": [
						"1",
						"2",
						"3",
						"4"
					],
					"order": "as_declared",
					"complete": true
				},
				"targetUniverse": {
					"ids": [
						"1",
						"2",
						"3",
						"4"
					],
					"order": "as_declared",
					"complete": true
				},
				"connections": {
					"sourceIds": [
						"1",
						"1",
						"2",
						"3",
						"4",
						"4"
					],
					"targetIds": [
						"2",
						"2",
						"3",
						"1",
						"3",
						"2"
					],
					"edgeIds": [
						"e1",
						"e2",
						"e3",
						"e4",
						"e5",
						"e6"
					],
					"weights": {
						"kind": "synaptic_weight",
						"unit": "pA",
						"values": [
							45,
							45,
							30.5,
							-60,
							-75.25,
							0
						]
					},
					"synapseModels": [
						"static_synapse",
						"static_synapse",
						"static_synapse",
						"static_synapse",
						"static_synapse",
						"static_synapse"
					]
				},
				"scope": {
					"kind": "single_process",
					"complete": true,
					"snapshotTime": {
						"kind": "time",
						"unit": "ms",
						"value": 1e3
					}
				}
			},
			"parameters": {
				"selectionId": "recurrent-all",
				"observationUnit": "synapse",
				"weightComparability": { "mode": "single_synapse_model" },
				"signTreatment": "preserve",
				"grouping": "none",
				"normalization": "count",
				"outOfRangeWeights": "reject",
				"uncertainty": {
					"kind": "none",
					"reason": "not_applicable"
				},
				"selectionLabel": "All recurrent connections",
				"bins": {
					"mode": "edges",
					"unit": "pA",
					"edges": [
						-100,
						-50,
						0,
						50,
						100
					],
					"boundary": "[lo,hi)",
					"finalEdgeInclusive": true
				},
				"xScale": "linear"
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"network.weight_matrix": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/network.weight_matrix.request.v1.schema.json",
			"title": "network.weight_matrix request",
			"description": "GENERATED from contract/skills/network.weight_matrix.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "network.weight_matrix" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"properties": {
						"nodeUniverse": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/nodeUniverse" }, {
								"type": "object",
								"properties": { "order": { "const": "as_declared" } },
								"not": { "required": ["groups"] }
							}],
							"description": "The COMPLETE node universe, in the order it is drawn. Rows are TARGET (postsynaptic) nodes and columns are SOURCE (presynaptic) nodes — both indexed by this one universe. For a recurrent population autapses land on the diagonal. Must be complete: a target with no incoming connection is a scientific fact, and only a declared universe can carry it. Read by topology.node_universe_declared and topology.edge_endpoints_in_universe."
						},
						"connections": {
							"description": "The connection snapshot. `weights` is REQUIRED here — a weight matrix without weights is an adjacency matrix, and the two differ in how they treat an absent cell, a zero, and a repeated connection.",
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/connectionRows" }, {
								"type": "object",
								"properties": {
									"weights": { "allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantitySeries" }, {
										"type": "object",
										"properties": { "kind": { "const": "synaptic_weight" } },
										"required": ["kind"]
									}] },
									"delays": { "allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantitySeries" }, {
										"type": "object",
										"properties": { "kind": { "const": "delay" } },
										"required": ["kind"]
									}] }
								},
								"required": ["weights"]
							}]
						},
						"scope": {
							"description": "The snapshot's scope. `snapshotTime` is REQUIRED here even though the shared type leaves it optional: a weight is a state variable, and an undated weight matrix cannot be bound to a moment in the run. The scope is additionally NARROWED — only `single_process`, `global_merged`, and a COMPLETE `mpi_target_rank_local` are admitted; a `sampled` scope and a rank-local scope with `localTargetUniverseComplete: false` are refused with a structural schema error, because a cell value is an aggregate over the COMPLETE connection set mapping to it and neither scope contains that set.",
							"allOf": [
								{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/networkScope" },
								{
									"type": "object",
									"properties": { "snapshotTime": { "allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantity" }, {
										"type": "object",
										"properties": {
											"kind": { "const": "time" },
											"value": {
												"type": "number",
												"minimum": 0
											}
										},
										"required": ["kind", "value"]
									}] } },
									"required": ["snapshotTime"]
								},
								{
									"type": "object",
									"properties": { "kind": { "enum": [
										"single_process",
										"global_merged",
										"mpi_target_rank_local"
									] } },
									"required": ["kind"]
								},
								{
									"if": {
										"type": "object",
										"properties": { "kind": { "const": "mpi_target_rank_local" } },
										"required": ["kind"]
									},
									"then": {
										"type": "object",
										"properties": { "localTargetUniverseComplete": { "const": true } },
										"required": ["localTargetUniverseComplete"]
									}
								}
							]
						},
						"observedTargetIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"minItems": 0,
							"maxItems": 1e5,
							"description": "Exactly the target rows owned by this rank. Required only for mpi_target_rank_local. Empty cells in these rows are observed absence; rows outside this set are not_observed. Every returned connection target must belong to this set."
						}
					},
					"required": [
						"nodeUniverse",
						"connections",
						"scope"
					],
					"additionalProperties": false,
					"allOf": [{
						"if": {
							"type": "object",
							"properties": { "scope": {
								"type": "object",
								"properties": { "kind": { "const": "mpi_target_rank_local" } },
								"required": ["kind"]
							} },
							"required": ["scope"]
						},
						"then": { "required": ["observedTargetIds"] },
						"else": { "not": { "required": ["observedTargetIds"] } }
					}]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"multapseAggregation": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/multapseAggregation",
							"description": "How multiple connections mapping to one cell are combined. Mandatory and closed. `no_aggregation` ASSERTS one connection per cell and fails with SCIENCE_AGGREGATION_REQUIRED if that is untrue; it is the only way to guarantee that a cell's colour describes a single synapse. Read by topology.multapse_aggregation_declared as parameters.multapseAggregation."
						},
						"synapseModelGroup": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
							"description": "Optional. Names a caller-declared comparability GROUP under which two or more distinct synapse models may be pooled onto one colour scale. When the snapshot carries two or more distinct `connections.synapseModels` and this is ABSENT, the request fails with SCIENCE_WEIGHT_GROUP_INCOMPATIBLE, because `nest:weight` is one code covering values whose physical meaning differs by model: the same number 10.0 may be 10 pA of postsynaptic current under one model and 10 nS of conductance under another. Its presence records the caller's comparability judgement; Cortexel verifies that the judgement was MADE, not that it is true, and (see knownLimitations) not that the group covers exactly the models present. Read by topology.weight_group_compatible as parameters.synapseModelGroup."
						},
						"colorScale": {
							"description": "The colour-map CLASS is a scientific declaration, not a style. A diverging map asserts that its centre is meaningful and that complete valued CELL AGGREGATES lie strictly on both sides. topology.matrix_contract checks that rule before rendering; hidden raw contributors do not justify a two-sided scale when every painted aggregate is one-sided.",
							"oneOf": [{
								"type": "object",
								"description": "An ordered-magnitude map. The correct choice whenever the weight domain has no meaningful neutral point — for example a strictly non-negative conductance weight. The palette registry records source-described perceptual properties separately; this discriminator does not establish perceptual or accessibility conformance.",
								"properties": { "class": { "const": "sequential" } },
								"required": ["class"],
								"additionalProperties": false
							}, {
								"type": "object",
								"description": "A signed map about an explicit centre. Refused with RENDER_DIVERGING_SCALE_NO_CENTER unless complete valued cell aggregates lie strictly below and above the centre.",
								"properties": {
									"class": { "const": "diverging" },
									"center": {
										"type": "number",
										"description": "The neutral value. For an excitatory/inhibitory weight domain this is 0: no net drive. There is no default, because a centre chosen by the library would be a scientific claim the library is not entitled to make."
									}
								},
								"required": ["class", "center"],
								"additionalProperties": false
							}]
						},
						"uncertainty": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty",
							"description": "Required, and only the `none` variant is supported. A heatmap cell is one colour: there is no visual channel left for a band, so any other variant is REFUSED (SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL) rather than silently discarded. Within-cell spread is reachable through the contributing count and the min/max table columns."
						},
						"tableCellEnumeration": {
							"type": "string",
							"enum": ["present_cells_only", "dense"],
							"default": "present_cells_only",
							"description": "present_cells_only returns every connection-bearing cell; absent and not_observed states remain derivable from the canonical universe and owned-target authority. dense enumerates the full cross-product and is refused above the complete-returned-table budget."
						}
					},
					"required": [
						"multapseAggregation",
						"colorScale",
						"uncertainty"
					],
					"additionalProperties": false
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "network.weight_matrix" },
			"data": {
				"nodeUniverse": {
					"ids": [
						"t1",
						"t2",
						"s1",
						"s2",
						"s3"
					],
					"order": "as_declared",
					"complete": true
				},
				"connections": {
					"sourceIds": [
						"s1",
						"s1",
						"s2",
						"s3"
					],
					"targetIds": [
						"t1",
						"t1",
						"t2",
						"t1"
					],
					"edgeIds": [
						"e1",
						"e2",
						"e3",
						"e4"
					],
					"weights": {
						"kind": "synaptic_weight",
						"unit": "pA",
						"values": [
							12,
							-8,
							-4.5,
							0
						]
					},
					"synapseModels": [
						"static_synapse",
						"static_synapse",
						"static_synapse",
						"static_synapse"
					]
				},
				"scope": {
					"kind": "single_process",
					"complete": true,
					"snapshotTime": {
						"kind": "time",
						"unit": "ms",
						"value": 1e3
					}
				}
			},
			"parameters": {
				"multapseAggregation": "sum",
				"colorScale": {
					"class": "diverging",
					"center": 0
				},
				"uncertainty": {
					"kind": "none",
					"reason": "not_applicable"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"neuro.analog_trace": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/neuro.analog_trace.request.v1.schema.json",
			"title": "neuro.analog_trace request",
			"description": "GENERATED from contract/skills/neuro.analog_trace.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "neuro.analog_trace" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"description": "A declared analysis window, a flat id universe, and a parallel list of series. Each series carries its OWN time vector and its own quantity samples, so channels sampled at different intervals or over different extents are never forced onto a common grid — padding a short channel would fabricate samples. `seriesIds[i]` names `series[i]`; the id vector is kept separate so a single declared identity governs the legend, the table, the palette, and any selection.",
					"properties": {
						"window": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow" },
						"seriesIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"minItems": 1,
							"maxItems": 16,
							"description": "The COMPLETE, ordered id universe, one id per series in declared order. Uniqueness is enforced by the semantic validator ids.unique: an ambiguous identity must fail before the legend, the table, the palette, or any selection can bind two series under the same name."
						},
						"series": {
							"type": "array",
							"minItems": 1,
							"maxItems": 16,
							"items": {
								"type": "object",
								"properties": {
									"label": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
									"recordedVariable": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
										"description": "The source system's own name for the recorded channel, e.g. NEST's `V_m` or `g_ex`. It is recorded verbatim and shown in the table. It is NEVER used to infer a quantity kind or a unit: `V_m` does not license `membrane_voltage`, the caller must declare it."
									},
									"populationId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"cellId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"conditionId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"observationKind": {
										"type": "string",
										"enum": ["point_sample", "piecewise_constant"],
										"description": "point_sample: an instantaneous sample of a continuous value; successive samples are joined by a straight segment. piecewise_constant: the value is HELD until the next sample and is drawn as a step. Drawing a held signal as a sloped line invents a ramp that never existed, so this is a required declaration and never a default."
									},
									"origin": {
										"description": "Whether these values were recorded or computed. A derived series is never re-labelled as recorded, and its method is always visible in the table.",
										"oneOf": [{
											"type": "object",
											"properties": { "kind": { "const": "recorded" } },
											"required": ["kind"],
											"additionalProperties": false
										}, {
											"type": "object",
											"properties": {
												"kind": { "const": "derived" },
												"method": {
													"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
													"description": "The name of the algorithm that produced these values, e.g. `mean_across_trials` or `lowpass_butterworth_4th_order_200Hz`. Required: a derived series that will not name its method is an unattributable number. Cortexel records and displays it and never re-derives or verifies it."
												}
											},
											"required": ["kind", "method"],
											"additionalProperties": false
										}]
									},
									"time": {
										"type": "object",
										"description": "This series' own time vector. Every value is a finite number: a sample with an unknown time is not an observation, so `null` is not accepted here (unlike a value, where null is a legitimate missing observation). Its length is checked against the series' value vector by series.equal_length before any sort.",
										"properties": {
											"kind": { "const": "time" },
											"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
											"values": {
												"type": "array",
												"items": { "type": "number" },
												"maxItems": 2e6
											}
										},
										"required": [
											"kind",
											"unit",
											"values"
										],
										"additionalProperties": false
									},
									"values": {
										"type": "object",
										"description": "The observations for this series. Written out rather than $ref'd to `quantitySeries` because the accepted `kind` set is deliberately narrower here: a synaptic weight or a firing rate on this axis would be a routing error, not a trace. The field is named `values` and read as the series' quantity by trace.axis_dimension_compatible.",
										"properties": {
											"kind": {
												"type": "string",
												"enum": [
													"membrane_voltage",
													"voltage",
													"current",
													"conductance",
													"concentration",
													"state_variable",
													"derivative"
												],
												"description": "`membrane_voltage` only when the source declares the signal IS a membrane potential. `state_variable` carries a declared dimension (voltage, current, conductance, concentration, or dimensionless). `derivative` is bound by the unit registry to the per_time dimension, so it can only express the derivative of a DIMENSIONLESS state variable (a gating variable's dn/dt in /ms). A dimensioned derivative such as dV/dt (mV/ms) has no representable kind in registry 1.0 and is refused rather than mislabelled."
											},
											"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
											"values": {
												"type": "array",
												"items": { "type": ["number", "null"] },
												"maxItems": 2e6,
												"description": "`null` is a MISSING observation. It is never zero, never interpolated across, and never dropped from the count."
											}
										},
										"required": [
											"kind",
											"unit",
											"values"
										],
										"additionalProperties": false
									},
									"sourceRef": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/dataRef",
										"description": "Optional content-addressed reference to the bytes this series was extracted from. Cortexel RECORDS it and never resolves it — stable core has no filesystem or network authority — and it never substitutes for the inline samples."
									}
								},
								"required": [
									"observationKind",
									"origin",
									"time",
									"values"
								],
								"additionalProperties": false
							}
						}
					},
					"required": [
						"window",
						"seriesIds",
						"series"
					],
					"additionalProperties": false
				},
				"parameters": {
					"type": "object",
					"properties": {
						"layout": {
							"type": "string",
							"enum": ["shared_axis", "small_multiples"],
							"description": "How the series are placed. There is no `auto`: whether two signals may share a numeric axis is a scientific judgement, and Cortexel will not make it silently. shared_axis overlays every series on one converted value axis (legal only within one dimension, checked by trace.axis_dimension_compatible); small_multiples gives each group its own panel and exempts that cross-series dimension check."
						},
						"valueUnit": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode",
							"description": "shared_axis only: the unit of the common value axis. Every series is converted into it, which is legal only within one dimension. When omitted, the unit of the FIRST series in declared order is used — a deterministic rule, never a heuristic about which unit 'looks nicer'."
						},
						"groupBy": {
							"type": "string",
							"enum": ["series", "quantity_kind"],
							"description": "small_multiples only: one panel per series, or one panel per quantity kind. Only keys guaranteed present on every series are offered: registry 1.0 has no validator that can assert an OPTIONAL key (population, condition, cell) is populated for every series, and a panel silently missing a series would be a lie of omission."
						},
						"sharedTimeAxis": {
							"type": "boolean",
							"default": true,
							"description": "small_multiples only: true means every panel spans one identical time domain, so panels may be compared horizontally; false means each panel spans its own covered extent, and no horizontal comparison across panels is licensed."
						},
						"duplicateTimePolicy": {
							"type": "string",
							"enum": [
								"reject",
								"keep_replicates",
								"aggregate"
							],
							"description": "What to do when a series has two samples at one timestamp. Optional in the schema and enforced semantically only when duplicates actually exist: with duplicates present and no policy declared, trace.duplicate_time_policy refuses with SCIENCE_DUPLICATE_TIME_POLICY. Last-write-wins is not on the list and never will be: it makes the drawn value a function of the recorder's write order."
						},
						"aggregateMethod": {
							"type": "string",
							"enum": [
								"mean",
								"median",
								"min",
								"max"
							],
							"description": "Used only with duplicateTimePolicy=aggregate. Applied within one series at one timestamp, over non-null replicates only. An even-count median is the arithmetic mean of the two central order statistics. The replicate count reaches the table, so an aggregate can never be read as a single observation."
						},
						"showSamplePoints": {
							"type": "boolean",
							"default": false,
							"description": "Draw a marker at every retained sample. Presentation only: it changes no value. An isolated or zero-length run still receives one mandatory fallback marker when false, because a move-only/zero-length SVG path paints no evidence."
						},
						"uncertainty": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty",
							"description": "The figure-level uncertainty declaration, read by uncertainty.valid and uncertainty.supported_variant. `{\"kind\":\"none\",\"reason\":...}` is the honest answer for a single trial; absence is STATED, never left blank, because a trace with no band and no statement reads as a trace whose uncertainty is small."
						}
					},
					"required": ["layout"],
					"additionalProperties": false,
					"allOf": [
						{
							"description": "`groupBy` is consumed only by the small-multiples compiler branch. Reject it on a shared axis instead of accepting a caller instruction that no output records or applies.",
							"if": {
								"properties": { "layout": { "const": "shared_axis" } },
								"required": ["layout"]
							},
							"then": { "not": { "required": ["groupBy"] } }
						},
						{
							"description": "`sharedTimeAxis` controls only the relationship among small-multiple panels. A shared-axis figure has one time axis by construction, so accepting this field there would silently ignore it.",
							"if": {
								"properties": { "layout": { "const": "shared_axis" } },
								"required": ["layout"]
							},
							"then": { "not": { "required": ["sharedTimeAxis"] } }
						},
						{
							"description": "`valueUnit` selects the single shared value axis. Small multiples derive each panel unit from its first declared member, so accepting `valueUnit` in that branch would silently ignore a caller-supplied conversion target.",
							"if": {
								"properties": { "layout": { "const": "small_multiples" } },
								"required": ["layout"]
							},
							"then": { "not": { "required": ["valueUnit"] } }
						},
						{
							"description": "`aggregateMethod` is meaningful if and only if duplicateTimePolicy is `aggregate`. Require the named operation before render when aggregation is selected, and reject an otherwise inert method when duplicates are rejected, retained, or no policy is declared.",
							"if": {
								"properties": { "duplicateTimePolicy": { "const": "aggregate" } },
								"required": ["duplicateTimePolicy"]
							},
							"then": { "required": ["aggregateMethod"] },
							"else": { "not": { "required": ["aggregateMethod"] } }
						}
					]
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "neuro.analog_trace" },
			"data": {
				"window": {
					"start": 0,
					"stop": .5,
					"unit": "ms",
					"boundary": "[start,stop)"
				},
				"seriesIds": ["cell_1_vm", "cell_2_vm"],
				"series": [{
					"label": "Cell 1 membrane potential",
					"recordedVariable": "V_m",
					"cellId": "1",
					"observationKind": "point_sample",
					"origin": { "kind": "recorded" },
					"time": {
						"kind": "time",
						"unit": "ms",
						"values": [
							0,
							.1,
							.2,
							.3,
							.4
						]
					},
					"values": {
						"kind": "membrane_voltage",
						"unit": "mV",
						"values": [
							-70,
							-69.2,
							-68.1,
							null,
							-65.4
						]
					}
				}, {
					"label": "Cell 2 membrane potential",
					"recordedVariable": "V_m",
					"cellId": "2",
					"observationKind": "point_sample",
					"origin": { "kind": "recorded" },
					"time": {
						"kind": "time",
						"unit": "ms",
						"values": [
							0,
							.1,
							.2,
							.3,
							.4
						]
					},
					"values": {
						"kind": "membrane_voltage",
						"unit": "mV",
						"values": [
							-70,
							-70.1,
							-69.9,
							-70,
							-69.8
						]
					}
				}]
			},
			"parameters": {
				"layout": "shared_axis",
				"valueUnit": "mV",
				"duplicateTimePolicy": "reject",
				"showSamplePoints": true,
				"uncertainty": {
					"kind": "none",
					"reason": "single_trial"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"neuro.compartment_trace": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/neuro.compartment_trace.request.v1.schema.json",
			"title": "neuro.compartment_trace request",
			"description": "GENERATED from contract/skills/neuro.compartment_trace.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "neuro.compartment_trace" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"description": "One cell, a declared compartment universe, and one series per RECORDED compartment. Each series carries its own time vector and a quantity with a kind and a unit; a compartment listed in the universe with no series was declared but not recorded.",
					"required": [
						"cellId",
						"compartmentIds",
						"compartmentOrderBasis",
						"compartmentUniverseComplete",
						"series",
						"window"
					],
					"additionalProperties": false,
					"properties": {
						"cellId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
						"cellLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
						"compartmentIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"minItems": 1,
							"maxItems": 2048,
							"description": "The DECLARED compartment universe, in the order the rows are drawn. Cortexel never re-orders it. A compartment listed here with no series was declared but not recorded."
						},
						"compartmentParentIds": {
							"type": "array",
							"items": { "oneOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" }, { "type": "null" }] },
							"maxItems": 2048,
							"description": "Parallel to compartmentIds. `null` marks a root. Parent membership in the universe is a declared, disclosed claim (there is no single-cell tree validator), never a rendered edge."
						},
						"compartmentLabels": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
							"maxItems": 2048,
							"description": "Parallel to compartmentIds."
						},
						"compartmentPathDistances": {
							"type": "object",
							"description": "Optional path distance from the declared root, parallel to compartmentIds. When supplied it is a caller declaration; a null distance is never defaulted to 0, because 0 is the soma.",
							"properties": {
								"kind": { "const": "length" },
								"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
								"values": {
									"type": "array",
									"items": { "type": ["number", "null"] },
									"maxItems": 2048
								}
							},
							"required": [
								"kind",
								"unit",
								"values"
							],
							"additionalProperties": false
						},
						"compartmentOrderBasis": {
							"type": "string",
							"enum": [
								"anatomical_declared",
								"path_distance_ascending",
								"tree_depth_first",
								"recorder_input_order",
								"arbitrary_id_order"
							],
							"description": "What the declared row order MEANS. It is disclosed as a caller declaration and never inferred. `recorder_input_order` and `arbitrary_id_order` carry no anatomical meaning at all."
						},
						"compartmentUniverseComplete": {
							"type": "boolean",
							"description": "Whether these are ALL the compartments of the model. `false` forbids any claim about the cell as a whole and is disclosed."
						},
						"series": {
							"type": "array",
							"minItems": 1,
							"maxItems": 8192,
							"description": "One series per RECORDED (compartment, signal). Every series shares a quantity dimension. A declared compartment with no series here was not recorded.",
							"items": {
								"type": "object",
								"properties": {
									"compartmentId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"signalId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"signalLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
									"time": {
										"type": "object",
										"description": "This series' OWN time vector. Two series may carry identical times or differ; Cortexel never resamples them onto a common grid.",
										"properties": {
											"kind": { "const": "time" },
											"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
											"values": {
												"type": "array",
												"items": { "type": "number" },
												"minItems": 1,
												"maxItems": 25e4
											}
										},
										"required": [
											"kind",
											"unit",
											"values"
										],
										"additionalProperties": false
									},
									"values": {
										"type": "object",
										"description": "The observations, with their REAL quantity kind and unit. A firing rate or a degree is not a compartment state variable. A null is a missing observation and is never zero.",
										"properties": {
											"kind": {
												"type": "string",
												"enum": [
													"membrane_voltage",
													"voltage",
													"current",
													"conductance",
													"concentration",
													"state_variable"
												]
											},
											"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
											"values": {
												"type": "array",
												"items": { "type": ["number", "null"] },
												"minItems": 1,
												"maxItems": 25e4
											}
										},
										"required": [
											"kind",
											"unit",
											"values"
										],
										"additionalProperties": false
									}
								},
								"required": [
									"compartmentId",
									"signalId",
									"time",
									"values"
								],
								"additionalProperties": false
							}
						},
						"window": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow" }
					},
					"allOf": [{
						"if": {
							"properties": { "compartmentOrderBasis": { "const": "path_distance_ascending" } },
							"required": ["compartmentOrderBasis"]
						},
						"then": { "required": ["compartmentPathDistances"] }
					}, {
						"if": {
							"properties": { "compartmentOrderBasis": { "const": "tree_depth_first" } },
							"required": ["compartmentOrderBasis"]
						},
						"then": { "required": ["compartmentParentIds"] }
					}]
				},
				"parameters": {
					"type": "object",
					"required": ["layout"],
					"additionalProperties": false,
					"properties": {
						"layout": {
							"type": "string",
							"enum": [
								"small_multiples",
								"heatmap",
								"overlay"
							],
							"description": "How the compartment axis is shown. There is no automatic switch: a silent change of representation is a silent change of what the reader is looking at. `small_multiples` requires a `yScale`; `heatmap` a `colorScale`; `overlay` an explicit `overlayCompartmentIds`."
						},
						"yScale": {
							"type": "string",
							"enum": ["shared", "independent"],
							"description": "For small_multiples. `independent` gives every panel its own domain, which makes a 2 mV dendritic EPSP and an 80 mV somatic spike look identical. It is legal, never the default, and the summary always states which was used."
						},
						"colorScale": {
							"type": "object",
							"description": "For heatmap. The colour domain is global across rows; a diverging family needs a declared reference point.",
							"properties": {
								"family": {
									"type": "string",
									"enum": ["sequential", "diverging"]
								},
								"center": {
									"type": "number",
									"description": "Required for `diverging`. A diverging map with no declared reference point asserts a symmetry the data may not have."
								}
							},
							"required": ["family"],
							"additionalProperties": false,
							"allOf": [{
								"if": {
									"properties": { "family": { "const": "diverging" } },
									"required": ["family"]
								},
								"then": { "required": ["center"] }
							}]
						},
						"overlayCompartmentIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"minItems": 1,
							"maxItems": 12,
							"description": "For overlay. An EXPLICIT bounded selection, because dozens of indistinguishable colours are refused, not minted. Each id is a declared compartment (a claim, not verified against the universe by a network validator this single-cell figure does not run)."
						},
						"duplicateTimePolicy": {
							"type": "string",
							"enum": [
								"reject",
								"keep_replicates",
								"aggregate"
							],
							"description": "Required whenever any series carries duplicate timestamps; a request with duplicates and no policy is refused with SCIENCE_DUPLICATE_TIME_POLICY. `first`/`last` are deliberately absent: the winner would depend on array order, which is not a scientific fact. It is structurally optional only because a trace with no duplicate timestamps needs no policy."
						},
						"duplicateTimeAggregate": {
							"type": "string",
							"enum": [
								"mean",
								"median",
								"min",
								"max"
							],
							"description": "The method used when duplicateTimePolicy is `aggregate`, applied only to the tied samples of one series."
						},
						"compartmentAggregate": {
							"type": "object",
							"description": "Optional. An aggregate across compartments is drawn as an ADDITIONAL labelled series carrying its compartment count. It never replaces the rows and is never labelled as the cell's value.",
							"properties": {
								"compartmentIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"minItems": 1,
									"maxItems": 2048,
									"description": "The EXPLICIT selection the aggregate covers. Required: an aggregate over an implied 'all compartments' would change meaning whenever a compartment is added, removed, or left unrecorded. Each id must be a member of `data.compartmentIds`."
								},
								"method": {
									"type": "string",
									"enum": [
										"mean",
										"sum",
										"median",
										"min",
										"max"
									]
								},
								"weighting": {
									"type": "string",
									"enum": ["uniform", "declared"],
									"description": "`uniform` is a CHOICE, not a physical fact: it weights a spine head equally with the soma. It is stated in the summary."
								},
								"weights": {
									"type": "array",
									"items": {
										"type": "number",
										"exclusiveMinimum": 0
									},
									"maxItems": 2048,
									"description": "Positive weights parallel to this aggregate's `compartmentIds` selection. `mean` normalizes them by their sum; `sum` uses them as declared multipliers. Median/min/max structurally require uniform weighting. A zero weight is refused: to exclude a compartment, do not select it."
								},
								"weightBasis": {
									"type": "string",
									"enum": [
										"surface_area",
										"volume",
										"membrane_capacitance",
										"other_declared"
									],
									"description": "What the weights were derived from. Required whenever weights are declared, because an unexplained weight vector is an unauditable one."
								},
								"label": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" }
							},
							"required": [
								"compartmentIds",
								"method",
								"weighting"
							],
							"additionalProperties": false,
							"allOf": [{
								"if": {
									"properties": { "weighting": { "const": "declared" } },
									"required": ["weighting"]
								},
								"then": { "required": ["weights", "weightBasis"] },
								"else": { "properties": {
									"weights": false,
									"weightBasis": false
								} }
							}, {
								"if": {
									"properties": { "method": { "enum": [
										"median",
										"min",
										"max"
									] } },
									"required": ["method"]
								},
								"then": { "properties": { "weighting": { "const": "uniform" } } }
							}]
						},
						"uncertainty": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty",
							"description": "Optional, declared once for the figure. `{ \"kind\": \"none\", \"reason\": ... }` is the honest answer for a single deterministic run — a curve with no band must SAY why it has no band, not merely lack one."
						}
					},
					"allOf": [
						{
							"if": {
								"properties": { "layout": { "const": "small_multiples" } },
								"required": ["layout"]
							},
							"then": { "required": ["yScale"] }
						},
						{
							"if": {
								"properties": { "layout": { "const": "heatmap" } },
								"required": ["layout"]
							},
							"then": { "required": ["colorScale"] }
						},
						{
							"if": {
								"properties": { "layout": { "const": "overlay" } },
								"required": ["layout"]
							},
							"then": { "required": ["overlayCompartmentIds"] }
						},
						{
							"if": {
								"properties": { "duplicateTimePolicy": { "const": "aggregate" } },
								"required": ["duplicateTimePolicy"]
							},
							"then": { "required": ["duplicateTimeAggregate"] }
						}
					]
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "neuro.compartment_trace" },
			"data": {
				"cellId": "cell_0",
				"cellLabel": "L5 pyramidal (cm_default)",
				"compartmentIds": [
					"soma",
					"dend_1",
					"dend_1_1"
				],
				"compartmentParentIds": [
					null,
					"soma",
					"dend_1"
				],
				"compartmentLabels": [
					"Soma",
					"Apical trunk",
					"Apical tuft"
				],
				"compartmentPathDistances": {
					"kind": "length",
					"unit": "um",
					"values": [
						0,
						120,
						340
					]
				},
				"compartmentOrderBasis": "path_distance_ascending",
				"compartmentUniverseComplete": true,
				"series": [
					{
						"compartmentId": "soma",
						"signalId": "v_m",
						"signalLabel": "Membrane potential",
						"time": {
							"kind": "time",
							"unit": "ms",
							"values": [
								0,
								.1,
								.2,
								.3
							]
						},
						"values": {
							"kind": "membrane_voltage",
							"unit": "mV",
							"values": [
								-70,
								-69.2,
								-40.5,
								12.4
							]
						}
					},
					{
						"compartmentId": "dend_1",
						"signalId": "v_m",
						"signalLabel": "Membrane potential",
						"time": {
							"kind": "time",
							"unit": "ms",
							"values": [
								0,
								.1,
								.2,
								.3
							]
						},
						"values": {
							"kind": "membrane_voltage",
							"unit": "mV",
							"values": [
								-70,
								-69.8,
								-55.1,
								-30.2
							]
						}
					},
					{
						"compartmentId": "dend_1_1",
						"signalId": "v_m",
						"signalLabel": "Membrane potential",
						"time": {
							"kind": "time",
							"unit": "ms",
							"values": [
								0,
								.1,
								.2,
								.3
							]
						},
						"values": {
							"kind": "membrane_voltage",
							"unit": "mV",
							"values": [
								-70,
								-70,
								-68.9,
								null
							]
						}
					}
				],
				"window": {
					"start": 0,
					"stop": .4,
					"unit": "ms",
					"boundary": "[start,stop)"
				}
			},
			"parameters": {
				"layout": "small_multiples",
				"yScale": "shared",
				"duplicateTimePolicy": "reject",
				"uncertainty": {
					"kind": "none",
					"reason": "single_trial"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"neuro.correlogram": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/neuro.correlogram.request.v1.schema.json",
			"title": "neuro.correlogram request",
			"description": "GENERATED from contract/skills/neuro.correlogram.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "neuro.correlogram" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"$defs": {
						"eventProcess": {
							"type": "object",
							"description": "The only multi-sender interpretation revision 4 accepts: one aggregate event process formed by preserving every event record from a complete recorded-sender universe. No per-sender divisor is implied.",
							"properties": {
								"aggregation": { "const": "pooled_total_event_process" },
								"membership": { "const": "complete_recorded_sender_universe_including_silent" },
								"multiplicity": { "const": "preserve_each_event_record" },
								"senderNormalization": { "const": "none" }
							},
							"required": [
								"aggregation",
								"membership",
								"multiplicity",
								"senderNormalization"
							],
							"additionalProperties": false
						},
						"trainUniverse": {
							"type": "object",
							"properties": {
								"trainId": {
									"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
									"description": "Stable identity for this declared aggregate event process. Cross-role train ids must differ."
								},
								"label": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
								"eventProcess": { "$ref": "#/properties/data/$defs/eventProcess" },
								"recordedSenderIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"minItems": 1,
									"maxItems": 1e5,
									"description": "The complete sender universe for this role, including silent senders. It is never inferred from active events."
								}
							},
							"required": [
								"trainId",
								"label",
								"eventProcess",
								"recordedSenderIds"
							],
							"additionalProperties": false
						},
						"eventTrain": {
							"type": "object",
							"properties": {
								"trainId": {
									"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
									"description": "Stable identity for this declared aggregate event process. Cross-role train ids must differ."
								},
								"label": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
								"eventProcess": { "$ref": "#/properties/data/$defs/eventProcess" },
								"recordedSenderIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"minItems": 1,
									"maxItems": 1e5,
									"description": "The complete sender universe for this role, including silent senders. Every event sender must be a member."
								},
								"eventTimes": {
									"type": "object",
									"properties": {
										"kind": { "const": "time" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"maxItems": 5e5
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"eventSenderIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"maxItems": 5e5,
									"description": "Parallel to eventTimes. Required even for a one-sender train so a later pooled train cannot acquire an inferred membership rule."
								},
								"eventIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"maxItems": 5e5,
									"description": "Optional identities parallel to the events and unique within this train. They detect duplicate exported records; cross-train equality has no meaning because ids are train-scoped."
								}
							},
							"required": [
								"trainId",
								"label",
								"eventProcess",
								"recordedSenderIds",
								"eventTimes",
								"eventSenderIds"
							],
							"additionalProperties": false
						},
						"lagOrientation": {
							"type": "object",
							"properties": {
								"definition": { "const": "target_time_minus_reference_time" },
								"positiveLagMeaning": { "const": "target_follows_reference" }
							},
							"required": ["definition", "positiveLagMeaning"],
							"additionalProperties": false,
							"description": "Fixed orientation metadata. Swapping the two explicit role containers mirrors the scientific question; no compiler may infer or silently reorder those roles."
						},
						"binEdges": {
							"type": "object",
							"properties": {
								"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
								"edges": {
									"type": "array",
									"items": { "type": "number" },
									"minItems": 2,
									"maxItems": 20002
								}
							},
							"required": ["unit", "edges"],
							"additionalProperties": false
						}
					},
					"oneOf": [
						{
							"type": "object",
							"description": "Autocorrelogram from exactly one declared train used in both roles. Mode is structural and never inferred from active senders.",
							"properties": {
								"mode": { "const": "events_auto" },
								"train": { "$ref": "#/properties/data/$defs/eventTrain" },
								"window": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/eventTimeWindow" },
								"selfPairPolicy": { "const": "exclude_same_event_record_by_ordinal" },
								"roleAssignment": { "const": "same_train_in_reference_and_target_roles" },
								"lagOrientation": { "$ref": "#/properties/data/$defs/lagOrientation" }
							},
							"required": [
								"mode",
								"train",
								"window",
								"selfPairPolicy",
								"roleAssignment",
								"lagOrientation"
							],
							"additionalProperties": false
						},
						{
							"type": "object",
							"description": "Cross-correlogram with explicit reference and target products. A target with no events remains the target because its complete universe and role container still exist.",
							"properties": {
								"mode": { "const": "events_cross" },
								"referenceTrain": { "$ref": "#/properties/data/$defs/eventTrain" },
								"targetTrain": { "$ref": "#/properties/data/$defs/eventTrain" },
								"window": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/eventTimeWindow" },
								"selfPairPolicy": { "const": "not_applicable_disjoint_sender_universes" },
								"roleAssignment": { "const": "explicit_reference_and_target_containers" },
								"lagOrientation": { "$ref": "#/properties/data/$defs/lagOrientation" }
							},
							"required": [
								"mode",
								"referenceTrain",
								"targetTrain",
								"window",
								"selfPairPolicy",
								"roleAssignment",
								"lagOrientation"
							],
							"additionalProperties": false
						},
						{
							"type": "object",
							"description": "Pre-binned autocorrelogram. Pair counts remain the declared exact numerator; Cortexel did not observe events and cannot repair self-pairs, re-bin, re-orient, verify numerator eligibility, or recover the reason each other candidate was not counted.",
							"properties": {
								"mode": { "const": "prebinned_auto" },
								"train": { "$ref": "#/properties/data/$defs/trainUniverse" },
								"binEdges": { "$ref": "#/properties/data/$defs/binEdges" },
								"pairCounts": {
									"type": "array",
									"items": {
										"type": "integer",
										"minimum": 0
									},
									"minItems": 1,
									"maxItems": 20001
								},
								"referenceEventCount": {
									"type": "integer",
									"minimum": 0,
									"description": "Exact source event count. It is required for pair conservation even when raw_pair_count has no rate denominator. Auto accounting derives candidate pairs n*n, excludes exactly n same-record self-pairs, and derives one aggregate other-not-counted remainder; without raw events Cortexel does not invent its lag-range versus edge-eligibility split."
								},
								"eligibleReferenceEventCounts": {
									"type": "array",
									"items": {
										"type": "integer",
										"minimum": 0
									},
									"minItems": 1,
									"maxItems": 20001
								},
								"window": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/eventTimeWindow" },
								"selfPairTreatment": { "const": "same_event_pairs_excluded_by_source" },
								"roleAssignment": { "const": "same_train_in_reference_and_target_roles" },
								"lagOrientation": { "$ref": "#/properties/data/$defs/lagOrientation" }
							},
							"required": [
								"mode",
								"train",
								"binEdges",
								"pairCounts",
								"referenceEventCount",
								"window",
								"selfPairTreatment",
								"roleAssignment",
								"lagOrientation"
							],
							"additionalProperties": false
						},
						{
							"type": "object",
							"description": "Pre-binned cross-correlogram with explicit source-channel role metadata and disjoint complete sender universes.",
							"properties": {
								"mode": { "const": "prebinned_cross" },
								"referenceTrain": { "$ref": "#/properties/data/$defs/trainUniverse" },
								"targetTrain": { "$ref": "#/properties/data/$defs/trainUniverse" },
								"binEdges": { "$ref": "#/properties/data/$defs/binEdges" },
								"pairCounts": {
									"type": "array",
									"items": {
										"type": "integer",
										"minimum": 0
									},
									"minItems": 1,
									"maxItems": 20001
								},
								"referenceEventCount": {
									"type": "integer",
									"minimum": 0,
									"description": "Exact reference-role source event count, required for candidate-count conservation and any rate denominator."
								},
								"targetEventCount": {
									"type": "integer",
									"minimum": 0,
									"description": "Exact target-role source event count, required so candidate pairs and the aggregate other-not-counted remainder are derived rather than guessed. The pre-binned product cannot classify that remainder by cause."
								},
								"eligibleReferenceEventCounts": {
									"type": "array",
									"items": {
										"type": "integer",
										"minimum": 0
									},
									"minItems": 1,
									"maxItems": 20001
								},
								"window": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/eventTimeWindow" },
								"selfPairTreatment": { "const": "not_applicable_disjoint_sender_universes" },
								"roleAssignment": { "const": "explicit_reference_and_target_containers" },
								"lagOrientation": { "$ref": "#/properties/data/$defs/lagOrientation" }
							},
							"required": [
								"mode",
								"referenceTrain",
								"targetTrain",
								"binEdges",
								"pairCounts",
								"referenceEventCount",
								"targetEventCount",
								"window",
								"selfPairTreatment",
								"roleAssignment",
								"lagOrientation"
							],
							"additionalProperties": false
						}
					]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"pairScope": {
							"const": "single_pair",
							"description": "Exactly one explicit role product. Multiple-pair panels and all-pairs pooling are different scientific outputs."
						},
						"lagRange": {
							"type": "object",
							"properties": {
								"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
								"min": { "type": "number" },
								"max": { "type": "number" }
							},
							"required": [
								"unit",
								"min",
								"max"
							],
							"additionalProperties": false,
							"description": "Centres of the symmetric lag bins. lag = target time minus reference time."
						},
						"bins": {
							"type": "object",
							"properties": {
								"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
								"width": { "type": "number" }
							},
							"required": ["unit", "width"],
							"additionalProperties": false
						},
						"statistic": {
							"type": "string",
							"enum": ["raw_pair_count", "target_rate_per_reference_event"],
							"description": "Closed revision-4 statistic set. Every accepted member is rendered. Weighted sums and coefficient-like products are not accepted by this skill."
						},
						"edgeCorrection": {
							"type": "string",
							"enum": ["none", "eligible_reference_events"]
						},
						"uncertainty": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty" }, {
								"type": "object",
								"properties": { "kind": { "const": "none" } },
								"required": ["kind"]
							}],
							"description": "Explicit absence only. Revision 4 has no accepted dispersion or interval branch because no uncertainty kind yet reaches the table, summary, legend, and geometry together."
						}
					},
					"required": [
						"pairScope",
						"lagRange",
						"bins",
						"statistic",
						"edgeCorrection"
					],
					"additionalProperties": false
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "neuro.correlogram" },
			"data": {
				"mode": "events_auto",
				"train": {
					"trainId": "pool-E",
					"label": "E aggregate event process",
					"eventProcess": {
						"aggregation": "pooled_total_event_process",
						"membership": "complete_recorded_sender_universe_including_silent",
						"multiplicity": "preserve_each_event_record",
						"senderNormalization": "none"
					},
					"recordedSenderIds": ["e1", "e2"],
					"eventTimes": {
						"kind": "time",
						"unit": "ms",
						"values": [
							1,
							2,
							5
						]
					},
					"eventSenderIds": [
						"e1",
						"e1",
						"e2"
					],
					"eventIds": [
						"E-1",
						"E-2",
						"E-3"
					]
				},
				"window": {
					"start": 0,
					"stop": 10,
					"unit": "ms",
					"boundary": "[start,stop)"
				},
				"selfPairPolicy": "exclude_same_event_record_by_ordinal",
				"roleAssignment": "same_train_in_reference_and_target_roles",
				"lagOrientation": {
					"definition": "target_time_minus_reference_time",
					"positiveLagMeaning": "target_follows_reference"
				}
			},
			"parameters": {
				"pairScope": "single_pair",
				"lagRange": {
					"unit": "ms",
					"min": -2,
					"max": 2
				},
				"bins": {
					"unit": "ms",
					"width": 1
				},
				"statistic": "raw_pair_count",
				"edgeCorrection": "none",
				"uncertainty": {
					"kind": "none",
					"reason": "single_trial"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"neuro.isi_distribution": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/neuro.isi_distribution.request.v1.schema.json",
			"title": "neuro.isi_distribution request",
			"description": "GENERATED from contract/skills/neuro.isi_distribution.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "neuro.isi_distribution" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"description": "Either raw events with their train linkage, or explicitly supplied intervals with their train linkage. There is deliberately no pre-binned histogram mode: a histogram of numbers the caller calls intervals, with no per-train linkage, cannot be checked for within-train formation — and within-train formation is the one thing this figure exists to guarantee.",
					"oneOf": [{
						"type": "object",
						"properties": {
							"mode": { "const": "events" },
							"eventTimes": {
								"type": "object",
								"properties": {
									"kind": { "const": "time" },
									"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
									"values": {
										"type": "array",
										"items": { "type": "number" },
										"maxItems": 2e6
									}
								},
								"required": [
									"kind",
									"unit",
									"values"
								],
								"additionalProperties": false
							},
							"eventSenderIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"maxItems": 2e6,
								"description": "Which sender produced each event. Parallel to eventTimes.values. Without it no train can be identified and no interval can be formed."
							},
							"eventTrialIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"maxItems": 2e6,
								"description": "Optional. When present, trains are partitioned by (senderId, trialId) and `trialIds` becomes REQUIRED — enforced by the semantic validator events.trial_universe_declared, not by a structural default, so the failure names the scientific reason."
							},
							"recordedSenderIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The COMPLETE selected-sender universe this figure is about — the recorded-sender set the validator events.sender_universe_declared checks. It includes senders that never fired and senders that fired once, cannot be inferred from the events, and is what makes the reported train count truthful."
							},
							"trialIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The declared trial universe, as the COMPLETE list of trial ids. Required whenever eventTrialIds is present. It exists only to make the train count and the zero-interval-train count correct; every trial id that appears in eventTrialIds must be a member. The validator events.trial_universe_declared reads this field (or trialCount); it is never inferred from the observed ids, because a trial in which a neuron stayed silent is still a trial."
							},
							"window": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow" }
						},
						"required": [
							"mode",
							"eventTimes",
							"eventSenderIds",
							"recordedSenderIds",
							"window"
						],
						"additionalProperties": false
					}, {
						"type": "object",
						"properties": {
							"mode": { "const": "intervals" },
							"intervals": {
								"type": "object",
								"description": "Intervals the caller already formed. No lower bound is imposed structurally: a negative value is refused by the derivation layer with SCIENCE_NEGATIVE_INTERVAL, which names the science, rather than by a bare type constraint.",
								"properties": {
									"kind": { "const": "interspike_interval" },
									"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
									"values": {
										"type": "array",
										"items": { "type": "number" },
										"maxItems": 2e6
									}
								},
								"required": [
									"kind",
									"unit",
									"values"
								],
								"additionalProperties": false
							},
							"intervalSenderIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"maxItems": 2e6,
								"description": "The train each interval came from. Parallel to intervals.values. This is the source linkage that makes the interval list checkable at all, and the semantic validator series.equal_length requires it to have the same length as intervals.values."
							},
							"intervalTrialIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"maxItems": 2e6,
								"description": "Optional. Required whenever the trains are partitioned by trial. Parallel to intervals.values."
							},
							"trains": {
								"type": "array",
								"minItems": 1,
								"maxItems": 1e5,
								"description": "Every train in the selection, with its in-window spike count. A train with k spikes can yield exactly max(k - 1, 0) intervals; the supplied intervals are reconciled against that identity in the derivation stage. Trains that produced no interval MUST still appear, otherwise the figure cannot say how much of the selection was silent.",
								"items": {
									"type": "object",
									"properties": {
										"senderId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
										"trialId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
										"spikeCount": {
											"type": "integer",
											"minimum": 0,
											"description": "The number of spikes of this train INSIDE the declared window. Not the number the recorder emitted, and not the number that survived some other filter."
										}
									},
									"required": ["senderId", "spikeCount"],
									"additionalProperties": false
								}
							},
							"recordedSenderIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The COMPLETE selected-sender universe, checked for uniqueness by ids.unique. Every interval sender must be a member."
							},
							"trialIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The declared trial universe as the COMPLETE list of trial ids. Required whenever intervalTrialIds is present."
							},
							"window": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow",
								"description": "Required even here. It fixes the censoring bound: two spikes inside a window of duration D cannot be more than D apart, so an interval exceeding D proves a spike outside the window or a difference taken across trains."
							}
						},
						"required": [
							"mode",
							"intervals",
							"intervalSenderIds",
							"trains",
							"recordedSenderIds",
							"window"
						],
						"additionalProperties": false
					}]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"selectionId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
						"selectionLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
						"bins": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/binSpec",
							"description": "Required. Cortexel does not choose bin edges for you. Bin width is not a cosmetic setting: with the same intervals, a 1 ms bin can show a bursting peak that a 20 ms bin dissolves entirely, so the choice is the caller's and it is recorded."
						},
						"normalization": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/histogramNormalization",
							"description": "count: exact integers. probability: sums to 1 over the BINNED intervals. density: integrates to 1 over the linear bin widths, with a unit reciprocal to the bin unit."
						},
						"zeroIntervalPolicy": {
							"type": "string",
							"enum": ["reject", "retain_as_zero"],
							"description": "How a zero-length interval is treated. `reject` refuses it: a 0 ms interval violates the absolute refractory period and is normally a duplicated event. `retain_as_zero` asserts the source may legitimately record duplicate same-sender events at one timestamp and keeps them as measured zeros. There is no discard option, because discarding would hide the corruption and bias the lowest bins. This field is OPTIONAL at the schema level ON PURPOSE: when a zero interval is present and NO policy was declared, the semantic validator isi.zero_interval_policy refuses the request with SCIENCE_ZERO_INTERVAL_POLICY — a required field would instead mask that as a bare structural omission. Declare it whenever coincident same-sender events are possible."
						},
						"outOfRangeIntervals": {
							"type": "string",
							"enum": ["reject", "exclude_and_report"],
							"description": "What happens to a formed interval outside [firstEdge, lastEdge]. `reject` requires the bins to cover the data. `exclude_and_report` excludes it, counts it, and discloses the under-range and over-range totals — after which the plotted probabilities describe only the binned subset, not the distribution."
						},
						"xScale": {
							"type": "string",
							"enum": ["linear", "log"],
							"default": "linear",
							"description": "Presentation only; it never changes a derived value. `log` requires every bin edge to be strictly positive and no zero-valued interval to exist, because neither has a position on a logarithmic axis and dropping them would delete exactly the shortest intervals. This positivity is a render-stage refusal (RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN), not a request-stage semantic rule."
						},
						"uncertainty": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty" }, {
								"type": "object",
								"properties": { "kind": { "const": "none" } },
								"required": ["kind"]
							}],
							"description": "Explicit absence only. Revision 2 does not accept an uncertainty array that its table, summary, legend and geometry cannot all identify and render."
						}
					},
					"required": [
						"selectionId",
						"bins",
						"normalization",
						"outOfRangeIntervals",
						"uncertainty"
					],
					"additionalProperties": false
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "neuro.isi_distribution" },
			"data": {
				"mode": "events",
				"eventTimes": {
					"kind": "time",
					"unit": "ms",
					"values": [
						10,
						30,
						12,
						22,
						42,
						5
					]
				},
				"eventSenderIds": [
					"1",
					"1",
					"2",
					"2",
					"2",
					"1"
				],
				"eventTrialIds": [
					"t1",
					"t1",
					"t1",
					"t1",
					"t1",
					"t2"
				],
				"recordedSenderIds": [
					"1",
					"2",
					"3"
				],
				"trialIds": ["t1", "t2"],
				"window": {
					"start": 0,
					"stop": 100,
					"unit": "ms",
					"boundary": "[start,stop)"
				}
			},
			"parameters": {
				"selectionId": "exc",
				"selectionLabel": "Excitatory",
				"bins": {
					"mode": "width",
					"unit": "ms",
					"width": 5,
					"start": 0,
					"stop": 25
				},
				"normalization": "count",
				"zeroIntervalPolicy": "reject",
				"outOfRangeIntervals": "reject",
				"xScale": "linear",
				"uncertainty": {
					"kind": "none",
					"reason": "not_computed"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"neuro.multisignal_trace": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/neuro.multisignal_trace.request.v1.schema.json",
			"title": "neuro.multisignal_trace request",
			"description": "GENERATED from contract/skills/neuro.multisignal_trace.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "neuro.multisignal_trace" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"additionalProperties": false,
					"required": [
						"timeBase",
						"timeAlignment",
						"series",
						"window"
					],
					"properties": {
						"timeBase": {
							"type": "string",
							"enum": ["shared", "per_series"],
							"description": "shared: one `sharedTime` vector every series is sampled on, and no series may carry its own `times`. per_series: every series carries its own `times` and there is no `sharedTime`. The two are exclusive because a mixture makes 'the same length as the time vector' ambiguous."
						},
						"eventTimes": {
							"type": "object",
							"description": "The one time vector every series is sampled on, on the display clock. Required when timeBase is `shared`, forbidden otherwise. `events.within_window` checks these sample times against `window`; a sample outside the window is refused, never cropped.",
							"properties": {
								"kind": { "const": "time" },
								"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
								"values": {
									"type": "array",
									"items": { "type": "number" },
									"minItems": 1,
									"maxItems": 2e6,
									"description": "Times are never null. A missing OBSERVATION is a null in the signal; a missing TIME is not an observation at all."
								}
							},
							"required": [
								"kind",
								"unit",
								"values"
							],
							"additionalProperties": false
						},
						"timeAlignment": {
							"type": "object",
							"description": "How the series' clocks relate. Required: a multi-signal figure exists to compare timing, and timing read across two unrelated clocks is not a result.",
							"properties": {
								"kind": {
									"type": "string",
									"enum": ["same_clock", "declared_offsets"],
									"description": "same_clock: every series is already on one clock (the single-run multimeter case). declared_offsets: every series carries an explicit `timeOffset`. There is no `not_aligned` member — signals whose clocks have an unknown relation cannot be drawn on one time axis."
								},
								"runId": {
									"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
									"description": "The run whose clock this is. Optional, and strongly recommended: it is the only thing that lets a reader check later whether two figures share a clock."
								}
							},
							"required": ["kind"],
							"additionalProperties": false
						},
						"series": {
							"type": "array",
							"minItems": 1,
							"maxItems": 24,
							"items": {
								"type": "object",
								"properties": {
									"seriesId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"label": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
									"entityId": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
										"description": "The biological entity this signal was recorded FROM. Two identical variables recorded from two neurons are two series and are never merged."
									},
									"entityKind": {
										"type": "string",
										"enum": [
											"neuron",
											"astrocyte",
											"glia",
											"synapse",
											"population",
											"device",
											"other"
										],
										"description": "A compartment is expressed as `compartmentId` on a neuron entity; a figure ABOUT compartments belongs to neuro.compartment_trace."
									},
									"compartmentId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"pathwayId": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
										"description": "The declared signalling pathway or projection this signal belongs to. Optional, and never inferred from a variable name."
									},
									"variableId": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
										"description": "The source model's OWN name for the recorded variable (`Ca_astro`, `IP3`, `V_m`, `I_SIC`). Required, because a quantity kind cannot distinguish two signals that share a dimension: calcium and IP3 are both concentrations, and a legend that reads 'concentration' twice is not a legend."
									},
									"panelId": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier",
										"description": "The declared panel this series is drawn in. Membership is structural: every series belongs to exactly one panel, so no series can be silently dropped from the layout and no panel partition can be left incomplete."
									},
									"timeOffset": {
										"type": "object",
										"description": "A `duration` added to this series' recorded times to place it on the display clock. Required when timeAlignment.kind is `declared_offsets`, forbidden when it is `same_clock` — an implicit zero offset would be an undeclared claim about synchronization.",
										"properties": {
											"kind": { "const": "duration" },
											"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
											"value": { "type": "number" }
										},
										"required": [
											"kind",
											"unit",
											"value"
										],
										"additionalProperties": false
									},
									"time": {
										"type": "object",
										"description": "This series' own time vector on the display clock. Required when timeBase is `per_series`, forbidden when it is `shared`. Duplicate timestamps here are decided by `parameters.duplicateTimePolicy` and never resolved by array order.",
										"properties": {
											"kind": { "const": "time" },
											"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
											"values": {
												"type": "array",
												"items": { "type": "number" },
												"minItems": 1,
												"maxItems": 2e6
											}
										},
										"required": [
											"kind",
											"unit",
											"values"
										],
										"additionalProperties": false
									},
									"observationKind": {
										"type": "string",
										"enum": ["point_sample", "piecewise_constant"],
										"description": "point_sample: an instantaneous sample of a continuous value; successive samples are joined by a straight segment. piecewise_constant: the value is HELD until the next sample and is drawn as a step. A held signal drawn as a sloped line invents a ramp that never existed, so this is a required declaration and never a default — and on a figure read for lead and lag, an invented ramp is an invented onset."
									},
									"origin": {
										"description": "Whether these values were recorded or computed. A derived series is never relabelled as recorded, and its method is always visible in the table.",
										"oneOf": [{
											"type": "object",
											"properties": { "kind": { "const": "recorded" } },
											"required": ["kind"],
											"additionalProperties": false
										}, {
											"type": "object",
											"properties": {
												"kind": { "const": "derived" },
												"method": {
													"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
													"description": "The name of the algorithm that produced these values, e.g. `mean_across_trials`. Required: a derived series that will not name its method is an unattributable number. Cortexel records and displays it and never re-derives or verifies it."
												}
											},
											"required": ["kind", "method"],
											"additionalProperties": false
										}]
									},
									"values": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantitySeries",
										"description": "The observations, with their REAL quantity kind and unit. A null is a missing sample: it is never zero, never interpolated across, and never removed from the count. `trace.axis_dimension_compatible` reads `values.unit`, so an overlay of two dimensions is refused."
									},
									"uncertainty": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty",
										"description": "Required on every series. `{ \"kind\": \"none\", \"reason\": ... }` is the honest answer for a single deterministic run — a curve with no band must SAY why it has no band, not merely lack one."
									},
									"sourceRef": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/dataRef",
										"description": "Optional content-addressed reference to the bytes this series was extracted from. Cortexel RECORDS it and never resolves it — stable core has no filesystem or network authority — and it never substitutes for the inline samples."
									}
								},
								"required": [
									"seriesId",
									"entityId",
									"entityKind",
									"variableId",
									"panelId",
									"observationKind",
									"origin",
									"values",
									"uncertainty"
								],
								"additionalProperties": false
							}
						},
						"window": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow" }
					},
					"allOf": [
						{
							"if": {
								"properties": { "timeBase": { "const": "shared" } },
								"required": ["timeBase"]
							},
							"then": {
								"required": ["eventTimes"],
								"properties": { "series": {
									"type": "array",
									"items": { "not": { "required": ["time"] } }
								} }
							}
						},
						{
							"if": {
								"properties": { "timeBase": { "const": "per_series" } },
								"required": ["timeBase"]
							},
							"then": {
								"not": { "required": ["eventTimes"] },
								"properties": { "series": {
									"type": "array",
									"items": { "required": ["time"] }
								} }
							}
						},
						{
							"if": {
								"properties": { "timeAlignment": {
									"properties": { "kind": { "const": "declared_offsets" } },
									"required": ["kind"]
								} },
								"required": ["timeAlignment"]
							},
							"then": { "properties": { "series": { "items": { "required": ["timeOffset"] } } } }
						},
						{
							"if": {
								"properties": { "timeAlignment": {
									"properties": { "kind": { "const": "same_clock" } },
									"required": ["kind"]
								} },
								"required": ["timeAlignment"]
							},
							"then": { "properties": { "series": { "items": { "not": { "required": ["timeOffset"] } } } } }
						}
					]
				},
				"parameters": {
					"type": "object",
					"additionalProperties": false,
					"required": [
						"layout",
						"panels",
						"duplicateTimePolicy"
					],
					"properties": {
						"layout": {
							"type": "string",
							"enum": [
								"small_multiples",
								"shared_axis_overlay",
								"normalized_overlay"
							],
							"description": "There is no default. The layout decides whether a magnitude comparison between two signals is meaningful at all, so it is never chosen for the caller. small_multiples: one panel per declared panel, independent y domains. shared_axis_overlay: one panel, one unit, dimensionally compatible series only. normalized_overlay: one dimensionless panel; each series is separately mapped to a ratio and NO magnitude claim survives."
						},
						"panels": {
							"type": "array",
							"minItems": 1,
							"maxItems": 12,
							"description": "The declared panel universe. Every series names one of these; a panel that no series names is refused with RENDER_NO_DATA rather than drawn as an empty axis.",
							"items": {
								"type": "object",
								"properties": {
									"panelId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"label": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
										"description": "The axis label. When a panel holds more than one `variableId`, the axis is labelled with THIS label, or with the shared unit alone — never with one member's variable name, which would silently attribute the whole panel to one species."
									},
									"unit": {
										"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode",
										"description": "The panel's DISPLAY unit. Every member series is converted into it, so every member must share its dimension. Under `normalized_overlay` it must be `1`: the drawn quantity there is a dimensionless ratio, not the source quantity."
									},
									"scale": {
										"type": "string",
										"enum": [
											"linear",
											"log",
											"symlog"
										],
										"default": "linear",
										"description": "linear draws values affinely. log uses log10 and is refused when any displayed value is non-positive. symlog uses the exact piecewise transform stated in science.normalization; it never chooses a threshold from the data."
									},
									"symlogLinearThreshold": {
										"type": "number",
										"exclusiveMinimum": 0,
										"description": "The half-width of the exactly linear region around zero. Required for `symlog`, whose transform is x/threshold inside and sign(x)*(1+ln(|x|/threshold)) outside."
									}
								},
								"required": ["panelId", "unit"],
								"additionalProperties": false,
								"allOf": [{
									"if": {
										"properties": { "scale": { "const": "symlog" } },
										"required": ["scale"]
									},
									"then": { "required": ["symlogLinearThreshold"] }
								}]
							}
						},
						"duplicateTimePolicy": {
							"type": "object",
							"description": "Required. Duplicate timestamps within a series are a source fact that has to be decided, not resolved by array order.",
							"properties": {
								"policy": {
									"type": "string",
									"enum": [
										"reject",
										"keep_replicates",
										"aggregate"
									],
									"description": "reject: duplicates fail the request. keep_replicates: every replicate is retained and drawn. aggregate: replicates are combined by the named method, and the aggregation is disclosed."
								},
								"aggregate": {
									"type": "string",
									"enum": [
										"mean",
										"median",
										"min",
										"max"
									]
								}
							},
							"required": ["policy"],
							"additionalProperties": false,
							"allOf": [{
								"if": {
									"properties": { "policy": { "const": "aggregate" } },
									"required": ["policy"]
								},
								"then": { "required": ["aggregate"] }
							}]
						},
						"normalization": {
							"type": "object",
							"description": "Required for `normalized_overlay`, forbidden otherwise. The method, its window, and its per-series constants are recorded in the derivation and shown in the table: a normalized figure whose constants are not published cannot be checked by anyone.",
							"properties": {
								"method": {
									"type": "string",
									"enum": [
										"z_score",
										"min_max",
										"divide_by_baseline_mean"
									],
									"description": "z_score: (x − mean) / sd with the sample standard deviation (ddof = 1) and N ≥ 2. min_max: (x − min) / (max − min), requiring max > min. divide_by_baseline_mean: x / mean, requiring the baseline mean to be finite and strictly positive."
								},
								"statisticsWindow": {
									"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow",
									"description": "The window the normalization statistics are computed over. Required and never defaulted to the whole trace: a baseline taken over a window that already contains the response shrinks the response it is supposed to measure."
								}
							},
							"required": ["method", "statisticsWindow"],
							"additionalProperties": false
						},
						"panelOrder": {
							"type": "string",
							"enum": ["as_declared", "by_panel_id"],
							"default": "as_declared",
							"description": "Panels are never ordered by amplitude, variance, or peak time. An order that depends on the data would make the layout itself a claim about the data."
						},
						"showSamplePoints": {
							"type": "boolean",
							"default": false,
							"description": "Draw a marker at every retained sample in addition to the line. Even when false, Cortexel still marks an isolated or zero-length run once, because an SVG move-only/zero-length path would otherwise succeed as a blank observation."
						}
					},
					"allOf": [
						{
							"if": {
								"properties": { "layout": { "const": "normalized_overlay" } },
								"required": ["layout"]
							},
							"then": {
								"required": ["normalization"],
								"properties": { "panels": {
									"maxItems": 1,
									"items": { "properties": { "unit": { "const": "1" } } }
								} }
							}
						},
						{
							"if": {
								"properties": { "layout": { "const": "shared_axis_overlay" } },
								"required": ["layout"]
							},
							"then": {
								"not": { "required": ["normalization"] },
								"properties": { "panels": { "maxItems": 1 } }
							}
						},
						{
							"if": {
								"properties": { "layout": { "const": "small_multiples" } },
								"required": ["layout"]
							},
							"then": { "not": { "required": ["normalization"] } }
						}
					]
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "neuro.multisignal_trace" },
			"presentation": { "height": 480 },
			"data": {
				"timeBase": "shared",
				"eventTimes": {
					"kind": "time",
					"unit": "ms",
					"values": [
						0,
						10,
						20,
						30,
						40
					]
				},
				"timeAlignment": {
					"kind": "same_clock",
					"runId": "run-2026-07-14-a"
				},
				"series": [
					{
						"seriesId": "ca",
						"label": "Astrocyte Ca",
						"entityId": "astro-1",
						"entityKind": "astrocyte",
						"variableId": "Ca_astro",
						"panelId": "chemistry",
						"observationKind": "point_sample",
						"origin": { "kind": "recorded" },
						"values": {
							"kind": "concentration",
							"unit": "umol/L",
							"values": [
								.073,
								.081,
								.19,
								.42,
								.11
							]
						},
						"uncertainty": {
							"kind": "none",
							"reason": "single_trial"
						}
					},
					{
						"seriesId": "ip3",
						"label": "Astrocyte IP3",
						"entityId": "astro-1",
						"entityKind": "astrocyte",
						"variableId": "IP3",
						"panelId": "chemistry",
						"observationKind": "point_sample",
						"origin": { "kind": "recorded" },
						"values": {
							"kind": "concentration",
							"unit": "umol/L",
							"values": [
								.16,
								.25,
								.61,
								.44,
								.21
							]
						},
						"uncertainty": {
							"kind": "none",
							"reason": "single_trial"
						}
					},
					{
						"seriesId": "vm",
						"label": "Target neuron V_m",
						"entityId": "nrn-7",
						"entityKind": "neuron",
						"compartmentId": "soma",
						"variableId": "V_m",
						"panelId": "membrane",
						"observationKind": "point_sample",
						"origin": { "kind": "recorded" },
						"values": {
							"kind": "membrane_voltage",
							"unit": "mV",
							"values": [
								-70,
								-69.8,
								-68.4,
								-64.1,
								-67.2
							]
						},
						"uncertainty": {
							"kind": "none",
							"reason": "single_trial"
						}
					},
					{
						"seriesId": "sic",
						"label": "Slow inward current",
						"entityId": "nrn-7",
						"entityKind": "neuron",
						"compartmentId": "soma",
						"pathwayId": "astro-1-to-nrn-7",
						"variableId": "I_SIC",
						"panelId": "current",
						"observationKind": "point_sample",
						"origin": { "kind": "recorded" },
						"values": {
							"kind": "current",
							"unit": "pA",
							"values": [
								0,
								0,
								12.4,
								38.9,
								null
							]
						},
						"uncertainty": {
							"kind": "none",
							"reason": "single_trial"
						}
					}
				],
				"window": {
					"start": 0,
					"stop": 50,
					"unit": "ms",
					"boundary": "[start,stop)"
				}
			},
			"parameters": {
				"layout": "small_multiples",
				"panels": [
					{
						"panelId": "chemistry",
						"label": "Astrocyte chemistry",
						"unit": "umol/L",
						"scale": "linear"
					},
					{
						"panelId": "membrane",
						"label": "Membrane potential",
						"unit": "mV",
						"scale": "linear"
					},
					{
						"panelId": "current",
						"label": "Astrocytic current",
						"unit": "pA",
						"scale": "linear"
					}
				],
				"duplicateTimePolicy": { "policy": "reject" },
				"panelOrder": "as_declared",
				"showSamplePoints": false
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"neuro.phase_plane": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/neuro.phase_plane.request.v1.schema.json",
			"title": "neuro.phase_plane request",
			"description": "GENERATED from contract/skills/neuro.phase_plane.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "neuro.phase_plane" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"description": "A state space, plus at least one of: trajectories through it, or a vector field evaluated on it. Nullclines and fixed points are optional annotations and are accepted only with a declared method.",
					"properties": {
						"axes": {
							"type": "object",
							"description": "The two state variables that define the space. This is the single source of truth for each axis's identity, kind, and unit; every series is checked against it.",
							"properties": {
								"x": {
									"type": "object",
									"properties": {
										"stateId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
										"label": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
										"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" }
									},
									"required": [
										"stateId",
										"kind",
										"unit"
									],
									"additionalProperties": false
								},
								"y": {
									"type": "object",
									"properties": {
										"stateId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
										"label": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
										"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" }
									},
									"required": [
										"stateId",
										"kind",
										"unit"
									],
									"additionalProperties": false
								}
							},
							"required": ["x", "y"],
							"additionalProperties": false
						},
						"trajectories": {
							"type": "object",
							"description": "One flat set of parallel per-point arrays, exactly as a multimeter emits them: one row per sample, tagged with the trajectory it belongs to. The array order IS the trajectory order and is never re-sorted.",
							"properties": {
								"universe": {
									"type": "object",
									"description": "The COMPLETE set of trajectories under consideration, including any that contributed no drawn point. A trajectory that left the domain immediately is a result, not an absence.",
									"properties": {
										"ids": {
											"type": "array",
											"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
											"minItems": 1,
											"maxItems": 256
										},
										"labels": {
											"type": "array",
											"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
											"maxItems": 256
										}
									},
									"required": ["ids"],
									"additionalProperties": false
								},
								"timeDirection": {
									"type": "string",
									"enum": ["forward", "backward"],
									"description": "The one global direction authority for every trajectory identity in this FigureRequest: model time must increase (`forward`) or decrease (`backward`) within each identity's stable source order. Arrowheads always point along INCREASING model time, so `backward` reverses them. A mixed forward/backward portrait requires separate FigureRequests; per-identity direction selection is not part of revision 5."
								},
								"pointTrajectoryIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"minItems": 1,
									"maxItems": 25e4,
									"description": "The trajectory each point belongs to. Every entry must be a member of `universe.ids`."
								},
								"times": {
									"type": "object",
									"description": "The time of every point. REQUIRED: without its parameter, a parametric curve has no direction, no speed, and no way to tell a 0.1 ms step from a 10 ms step. Cortexel never substitutes the sample index for a clock.",
									"properties": {
										"kind": { "const": "time" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"maxItems": 25e4
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"x": {
									"type": "object",
									"description": "The x state coordinate of every point. `null` means MISSING and breaks the path; it is never drawn as zero and never interpolated across.",
									"properties": {
										"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": ["number", "null"] },
											"maxItems": 25e4
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"y": {
									"type": "object",
									"properties": {
										"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": ["number", "null"] },
											"maxItems": 25e4
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"dxdt": {
									"type": "object",
									"description": "Optional. Supplied by the caller only: Cortexel never differentiates a trajectory numerically, because a finite difference depends on the sampling interval and is meaningless across a reset. The unit is a reciprocal-time code; the state dimension is inherited from axes.x.",
									"properties": {
										"kind": { "const": "derivative" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": ["number", "null"] },
											"maxItems": 25e4
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"dydt": {
									"type": "object",
									"properties": {
										"kind": { "const": "derivative" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": ["number", "null"] },
											"maxItems": 25e4
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								}
							},
							"required": [
								"universe",
								"timeDirection",
								"pointTrajectoryIds",
								"times",
								"x",
								"y"
							],
							"additionalProperties": false
						},
						"vectorField": {
							"type": "object",
							"description": "Samples the CALLER evaluated. Cortexel 1.0 evaluates no model equations: there is no registered model registry, and an executable expression is never accepted. Every sample carries its own explicit coordinates, so no ordering convention (row-major, column-major) is ever assumed.",
							"properties": {
								"x": {
									"type": "object",
									"properties": {
										"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"minItems": 1,
											"maxItems": 25e4
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"y": {
									"type": "object",
									"properties": {
										"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"minItems": 1,
											"maxItems": 25e4
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"dx": {
									"type": "object",
									"properties": {
										"kind": { "const": "derivative" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"minItems": 1,
											"maxItems": 25e4
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"dy": {
									"type": "object",
									"properties": {
										"kind": { "const": "derivative" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"minItems": 1,
											"maxItems": 25e4
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"domain": {
									"type": "object",
									"description": "The region of state space over which the field was actually evaluated. It bounds what the figure may claim: outside it, the absence of arrows is an absence of evaluation. There is no interval convention here because nothing is binned by it; both endpoints are drawn.",
									"properties": {
										"x": {
											"type": "object",
											"properties": {
												"start": { "type": "number" },
												"stop": { "type": "number" },
												"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" }
											},
											"required": [
												"start",
												"stop",
												"unit"
											],
											"additionalProperties": false
										},
										"y": {
											"type": "object",
											"properties": {
												"start": { "type": "number" },
												"stop": { "type": "number" },
												"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" }
											},
											"required": [
												"start",
												"stop",
												"unit"
											],
											"additionalProperties": false
										}
									},
									"required": ["x", "y"],
									"additionalProperties": false
								},
								"lattice": {
									"description": "Whether the samples form a regular grid or are scattered. The claim is VERIFIED: nx x ny must equal the sample count and the coordinates must actually form that lattice. A scattered field drawn as a lattice would imply a uniform coverage of the domain that was never evaluated. The lattice is capped at 50 x 50 because a denser arrow field is a legibility failure long before it is a resource one.",
									"oneOf": [{
										"type": "object",
										"properties": {
											"kind": { "const": "regular_grid" },
											"nx": {
												"type": "integer",
												"minimum": 2,
												"maximum": 50
											},
											"ny": {
												"type": "integer",
												"minimum": 2,
												"maximum": 50
											}
										},
										"required": [
											"kind",
											"nx",
											"ny"
										],
										"additionalProperties": false
									}, {
										"type": "object",
										"properties": { "kind": { "const": "scattered" } },
										"required": ["kind"],
										"additionalProperties": false
									}]
								}
							},
							"required": [
								"x",
								"y",
								"dx",
								"dy",
								"domain",
								"lattice"
							],
							"additionalProperties": false
						},
						"nullclines": {
							"type": "object",
							"description": "Curves on which one derivative is claimed to vanish. Per-curve declarations and per-point vertices are parallel arrays, so every constraint is checkable without an ordering convention. Cortexel never computes a nullcline.",
							"properties": {
								"curveIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"minItems": 1,
									"maxItems": 8
								},
								"labels": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
									"maxItems": 8
								},
								"zeroDerivativeOf": {
									"type": "array",
									"items": {
										"type": "string",
										"enum": ["x", "y"]
									},
									"maxItems": 8,
									"description": "WHICH derivative the curve zeroes. This is never inferred from colour, order, or naming: the x-nullcline (dx/dt = 0) and the y-nullcline (dy/dt = 0) are different curves, and swapping them moves every apparent equilibrium."
								},
								"methods": {
									"type": "array",
									"maxItems": 8,
									"items": {
										"type": "object",
										"properties": {
											"kind": {
												"type": "string",
												"enum": [
													"analytic",
													"contour_marching_squares",
													"sampled_root_find"
												]
											},
											"residualTolerance": {
												"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantity",
												"description": "The bound on |d?/dt| along the curve, as a `derivative` quantity in a reciprocal-time unit. A curve that claims a derivative is zero must say how close to zero it actually got."
											},
											"gridResolution": {
												"type": "object",
												"properties": {
													"nx": {
														"type": "integer",
														"minimum": 2,
														"maximum": 1e5
													},
													"ny": {
														"type": "integer",
														"minimum": 2,
														"maximum": 1e5
													}
												},
												"required": ["nx", "ny"],
												"additionalProperties": false
											}
										},
										"required": ["kind", "residualTolerance"],
										"additionalProperties": false
									}
								},
								"pointCurveIds": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"maxItems": 25e4
								},
								"x": {
									"type": "object",
									"properties": {
										"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": ["number", "null"] },
											"maxItems": 25e4
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"y": {
									"type": "object",
									"description": "A `null` pair separates disconnected branches of one nullcline. It is never bridged: joining two branches would draw a curve through states where the derivative is not zero.",
									"properties": {
										"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": ["number", "null"] },
											"maxItems": 25e4
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								}
							},
							"required": [
								"curveIds",
								"zeroDerivativeOf",
								"methods",
								"pointCurveIds",
								"x",
								"y"
							],
							"additionalProperties": false
						},
						"fixedPoints": {
							"type": "object",
							"description": "Declared equilibria. Each carries a NAMED numerical method, an absolute residual, the tolerance it was accepted against, and a convergence status that Cortexel re-derives. An annotation with no method has no place here: put it in `source.declaredNote`, where it renders as an attributed, unverified caller note.",
							"properties": {
								"ids": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
									"minItems": 1,
									"maxItems": 64
								},
								"labels": {
									"type": "array",
									"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
									"maxItems": 64
								},
								"x": {
									"type": "object",
									"properties": {
										"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"maxItems": 64
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"y": {
									"type": "object",
									"properties": {
										"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": { "type": "number" },
											"maxItems": 64
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"methods": {
									"type": "array",
									"items": {
										"type": "string",
										"enum": [
											"analytic",
											"newton_raphson",
											"grid_bisection",
											"levenberg_marquardt"
										]
									},
									"maxItems": 64,
									"description": "A closed set of NAMED methods. There is deliberately no `declared_without_method` member: an unbacked equilibrium claim is refused, not demoted."
								},
								"converged": {
									"type": "array",
									"items": { "type": "boolean" },
									"maxItems": 64,
									"description": "RE-DERIVED and checked against the residual and the tolerance. `false` is legal and is rendered as an unconverged candidate with a distinct mark; it is never drawn as an established equilibrium."
								},
								"residualDxDt": {
									"type": "object",
									"description": "|dx/dt| at the declared point. Non-negative: a signed residual would make the convergence comparison ambiguous.",
									"properties": {
										"kind": { "const": "derivative" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": {
												"type": "number",
												"minimum": 0
											},
											"maxItems": 64
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"residualDyDt": {
									"type": "object",
									"properties": {
										"kind": { "const": "derivative" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": {
												"type": "number",
												"minimum": 0
											},
											"maxItems": 64
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"toleranceDxDt": {
									"type": "object",
									"properties": {
										"kind": { "const": "derivative" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": {
												"type": "number",
												"exclusiveMinimum": 0
											},
											"maxItems": 64
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								},
								"toleranceDyDt": {
									"type": "object",
									"properties": {
										"kind": { "const": "derivative" },
										"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
										"values": {
											"type": "array",
											"items": {
												"type": "number",
												"exclusiveMinimum": 0
											},
											"maxItems": 64
										}
									},
									"required": [
										"kind",
										"unit",
										"values"
									],
									"additionalProperties": false
								}
							},
							"required": [
								"ids",
								"x",
								"y",
								"methods",
								"converged",
								"residualDxDt",
								"residualDyDt",
								"toleranceDxDt",
								"toleranceDyDt"
							],
							"additionalProperties": false
						}
					},
					"required": ["axes"],
					"anyOf": [{
						"type": "object",
						"required": ["trajectories"]
					}, {
						"type": "object",
						"required": ["vectorField"]
					}],
					"additionalProperties": false
				},
				"parameters": {
					"type": "object",
					"properties": {
						"arrowScaling": {
							"type": "object",
							"description": "Required whenever a vector field is present. Arrow length is a DISPLAY normalization; the magnitudes themselves are always retained in the table.",
							"properties": {
								"mode": {
									"type": "string",
									"enum": [
										"unit_length",
										"magnitude_proportional",
										"sqrt_magnitude"
									],
									"description": "unit_length draws direction only and makes no magnitude claim. magnitude_proportional is faithful but is dominated by the fastest region. sqrt_magnitude compresses the dynamic range and must never be read as a linear speed."
								},
								"maxArrowLengthFraction": {
									"type": "number",
									"exclusiveMinimum": 0,
									"maximum": .25,
									"default": .05,
									"description": "The longest arrow, as a fraction of the shorter drawn axis. Bounded so that arrows cannot overlap into an apparent flow that no sample supports."
								}
							},
							"required": ["mode"],
							"additionalProperties": false
						},
						"magnitudeBasis": {
							"type": "string",
							"enum": ["axis_normalized", "physical"],
							"description": "axis_normalized divides each component by its own drawn axis extent and is the only basis legal across incommensurable axes. physical takes the Euclidean norm in SI and is legal ONLY when both axes share a dimension; requested otherwise it is refused with SCIENCE_UNIT_DIMENSION_MISMATCH."
						},
						"directionMarkers": {
							"type": "object",
							"description": "Required whenever trajectories are present. Placement is deterministic and never depends on animation. A marker is emitted only for an eligible strictly timed, geometrically nonzero candidate segment; mode none, short runs, equal-time path breaks, and zero-length candidates may emit none.",
							"properties": {
								"mode": {
									"type": "string",
									"enum": [
										"none",
										"arrowhead_at_end",
										"arrowheads_every_n_points"
									]
								},
								"everyNPoints": {
									"type": "integer",
									"minimum": 2,
									"maximum": 25e4,
									"description": "For arrowheads_every_n_points, request a candidate on the Nth, 2Nth, ... finite point of EACH continuous strictly timed trajectory run (zero-based target ordinals N-1, 2N-1, ...). A missing coordinate or equal-time boundary resets the run. Each candidate is independently skipped when its segment has zero geometric length, so even a long run may emit no marker."
								}
							},
							"required": ["mode"],
							"additionalProperties": false
						},
						"duplicateTimePolicy": {
							"type": "string",
							"enum": ["reject", "keep_replicates"],
							"description": "Required whenever trajectories are present and applied independently after stable grouping by trajectory id. reject requires strict time in the declared direction and refuses equality. keep_replicates permits equal times without permitting reversal, retains every row, and turns each equal-time boundary into a path break with no connecting segment or direction marker. There is deliberately no aggregate."
						},
						"uncertainty": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty",
							"description": "Only `none` is supported. UncertaintyV1 is one-dimensional, and two marginal intervals are not a joint region for a point in state space: a box built from two 95% marginals does not have 95% joint coverage, and it is wrong in any direction the errors are correlated. Any other variant is refused with SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL."
						}
					},
					"required": ["uncertainty"],
					"additionalProperties": false
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "neuro.phase_plane" },
			"data": {
				"axes": {
					"x": {
						"stateId": "Vm",
						"label": "Membrane potential",
						"kind": "membrane_voltage",
						"unit": "mV"
					},
					"y": {
						"stateId": "w",
						"label": "Recovery variable",
						"kind": "state_variable",
						"unit": "1"
					}
				},
				"trajectories": {
					"universe": {
						"ids": ["n1"],
						"labels": ["Neuron 1"]
					},
					"timeDirection": "forward",
					"pointTrajectoryIds": [
						"n1",
						"n1",
						"n1",
						"n1"
					],
					"times": {
						"kind": "time",
						"unit": "ms",
						"values": [
							0,
							.5,
							1,
							1.5
						]
					},
					"x": {
						"kind": "membrane_voltage",
						"unit": "mV",
						"values": [
							-65,
							-60,
							-50,
							-40
						]
					},
					"y": {
						"kind": "state_variable",
						"unit": "1",
						"values": [
							.05,
							.06,
							.09,
							.14
						]
					},
					"dxdt": {
						"kind": "derivative",
						"unit": "/ms",
						"values": [
							10,
							18,
							22,
							15
						]
					},
					"dydt": {
						"kind": "derivative",
						"unit": "/ms",
						"values": [
							.02,
							.05,
							.08,
							.1
						]
					}
				},
				"vectorField": {
					"x": {
						"kind": "membrane_voltage",
						"unit": "mV",
						"values": [
							-70,
							-40,
							-70,
							-40
						]
					},
					"y": {
						"kind": "state_variable",
						"unit": "1",
						"values": [
							0,
							0,
							.2,
							.2
						]
					},
					"dx": {
						"kind": "derivative",
						"unit": "/ms",
						"values": [
							5,
							20,
							2,
							12
						]
					},
					"dy": {
						"kind": "derivative",
						"unit": "/ms",
						"values": [
							.01,
							.06,
							-.02,
							.03
						]
					},
					"domain": {
						"x": {
							"start": -70,
							"stop": -40,
							"unit": "mV"
						},
						"y": {
							"start": 0,
							"stop": .2,
							"unit": "1"
						}
					},
					"lattice": {
						"kind": "regular_grid",
						"nx": 2,
						"ny": 2
					}
				},
				"nullclines": {
					"curveIds": ["v-nullcline"],
					"labels": ["dV/dt = 0"],
					"zeroDerivativeOf": ["x"],
					"methods": [{
						"kind": "analytic",
						"residualTolerance": {
							"kind": "derivative",
							"unit": "/ms",
							"value": 1e-12
						}
					}],
					"pointCurveIds": [
						"v-nullcline",
						"v-nullcline",
						"v-nullcline"
					],
					"x": {
						"kind": "membrane_voltage",
						"unit": "mV",
						"values": [
							-70,
							-55,
							-40
						]
					},
					"y": {
						"kind": "state_variable",
						"unit": "1",
						"values": [
							.02,
							.1,
							.18
						]
					}
				},
				"fixedPoints": {
					"ids": ["fp1"],
					"labels": ["Resting state"],
					"x": {
						"kind": "membrane_voltage",
						"unit": "mV",
						"values": [-64.5]
					},
					"y": {
						"kind": "state_variable",
						"unit": "1",
						"values": [.0511]
					},
					"methods": ["newton_raphson"],
					"converged": [true],
					"residualDxDt": {
						"kind": "derivative",
						"unit": "/ms",
						"values": [2e-10]
					},
					"residualDyDt": {
						"kind": "derivative",
						"unit": "/ms",
						"values": [4e-12]
					},
					"toleranceDxDt": {
						"kind": "derivative",
						"unit": "/ms",
						"values": [1e-8]
					},
					"toleranceDyDt": {
						"kind": "derivative",
						"unit": "/ms",
						"values": [1e-8]
					}
				}
			},
			"parameters": {
				"arrowScaling": {
					"mode": "sqrt_magnitude",
					"maxArrowLengthFraction": .05
				},
				"magnitudeBasis": "axis_normalized",
				"directionMarkers": {
					"mode": "arrowheads_every_n_points",
					"everyNPoints": 2
				},
				"duplicateTimePolicy": "reject",
				"uncertainty": {
					"kind": "none",
					"reason": "not_applicable"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"neuro.population_rate": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/neuro.population_rate.request.v1.schema.json",
			"title": "neuro.population_rate request",
			"description": "GENERATED from contract/skills/neuro.population_rate.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "neuro.population_rate" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"oneOf": [{
						"type": "object",
						"properties": {
							"mode": { "const": "events" },
							"eventTimes": {
								"type": "object",
								"properties": {
									"kind": { "const": "time" },
									"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
									"values": {
										"type": "array",
										"items": { "type": "number" },
										"maxItems": 2e6
									}
								},
								"required": [
									"kind",
									"unit",
									"values"
								],
								"additionalProperties": false
							},
							"eventSenderIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"maxItems": 2e6
							},
							"recordedSenderIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The COMPLETE set of senders that were recorded — including any that never fired. This is the denominator basis and it cannot be inferred from the events."
							},
							"window": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow" }
						},
						"required": [
							"mode",
							"eventTimes",
							"eventSenderIds",
							"recordedSenderIds",
							"window"
						],
						"additionalProperties": false
					}, {
						"type": "object",
						"properties": {
							"mode": { "const": "prebinned" },
							"binEdges": {
								"type": "object",
								"properties": {
									"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
									"edges": {
										"type": "array",
										"items": { "type": "number" },
										"minItems": 2,
										"maxItems": 100001
									}
								},
								"required": ["unit", "edges"],
								"additionalProperties": false
							},
							"counts": {
								"type": "array",
								"items": {
									"type": "integer",
									"minimum": 0
								},
								"maxItems": 1e5,
								"description": "Exact integer event counts per bin. Length must be edges.length - 1."
							},
							"sourceEventCount": {
								"type": "integer",
								"minimum": 0,
								"description": "Exact number of in-window source events before binning. sum(counts) must equal it, so deletion of a first, middle or final bin is detectable. This is a caller-declared upstream fact whose internal consistency Cortexel checks; it is not a source-authenticity attestation."
							},
							"recordedSenderIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The complete recorded-sender universe, including silent senders. recordedSenderCount must equal its unique cardinality."
							},
							"recordedSenderCount": {
								"type": "integer",
								"minimum": 1
							},
							"rates": {
								"type": "object",
								"description": "Optional. If supplied it is RE-DERIVED from the counts and denominator and checked; it is never taken on trust.",
								"properties": {
									"kind": { "const": "firing_rate" },
									"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
									"values": {
										"type": "array",
										"items": { "type": "number" },
										"maxItems": 1e5
									}
								},
								"required": [
									"kind",
									"unit",
									"values"
								],
								"additionalProperties": false
							},
							"window": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow" }
						},
						"required": [
							"mode",
							"binEdges",
							"counts",
							"sourceEventCount",
							"recordedSenderIds",
							"recordedSenderCount",
							"window"
						],
						"additionalProperties": false
					}]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"populationId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
						"populationLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
						"rateMode": {
							"type": "string",
							"const": "binned_count",
							"description": "Revision 2 accepts literal event-count bins only. Kernel estimates remain structurally absent until their full scientific and rendering obligations are implemented."
						},
						"bins": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/binSpec" },
						"normalization": {
							"type": "string",
							"enum": ["mean_rate_per_recorded_sender", "total_event_rate"],
							"description": "mean_rate_per_recorded_sender divides by the recorded-sender count and IS a per-neuron claim. total_event_rate does not and is NOT. When the recorded universe is unknown, the honest choice is total_event_rate."
						},
						"uncertainty": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty" }, {
								"type": "object",
								"properties": { "kind": { "const": "none" } },
								"required": ["kind"]
							}],
							"description": "Explicit absence only. Revision 2 has no accepted dispersion or interval branch because no uncertainty kind yet reaches the table, summary, legend and geometry together."
						}
					},
					"required": [
						"populationId",
						"rateMode",
						"normalization",
						"uncertainty"
					],
					"additionalProperties": false
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false,
			"allOf": [{ "allOf": [{
				"if": { "properties": { "data": {
					"properties": { "mode": { "const": "events" } },
					"required": ["mode"]
				} } },
				"then": { "properties": { "parameters": {
					"required": ["bins"],
					"properties": { "bins": {
						"type": "object",
						"properties": {
							"boundary": { "const": "[lo,hi)" },
							"finalEdgeInclusive": { "const": false }
						},
						"required": ["boundary", "finalEdgeInclusive"]
					} }
				} } }
			}, {
				"if": { "properties": { "data": {
					"properties": { "mode": { "const": "prebinned" } },
					"required": ["mode"]
				} } },
				"then": { "properties": { "parameters": { "not": { "required": ["bins"] } } } }
			}] }]
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "neuro.population_rate" },
			"data": {
				"mode": "events",
				"eventTimes": {
					"kind": "time",
					"unit": "ms",
					"values": [
						1,
						1.5,
						2.5,
						2.5,
						3.75,
						8
					]
				},
				"eventSenderIds": [
					"1",
					"2",
					"1",
					"3",
					"2",
					"3"
				],
				"recordedSenderIds": [
					"1",
					"2",
					"3",
					"4"
				],
				"window": {
					"start": 0,
					"stop": 10,
					"unit": "ms",
					"boundary": "[start,stop)"
				}
			},
			"parameters": {
				"populationId": "exc",
				"populationLabel": "Excitatory",
				"rateMode": "binned_count",
				"bins": {
					"mode": "width",
					"unit": "ms",
					"width": 5,
					"start": 0,
					"stop": 10,
					"boundary": "[lo,hi)",
					"finalEdgeInclusive": false
				},
				"normalization": "mean_rate_per_recorded_sender",
				"uncertainty": {
					"kind": "none",
					"reason": "single_trial"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"neuro.psth": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/neuro.psth.request.v1.schema.json",
			"title": "neuro.psth request",
			"description": "GENERATED from contract/skills/neuro.psth.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "neuro.psth" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"oneOf": [{
						"type": "object",
						"properties": {
							"mode": { "const": "events" },
							"eventTimes": {
								"type": "object",
								"description": "ABSOLUTE event times on the recording clock. Pre-aligned relative times are not accepted: alignment is the operation this figure exists to perform, and a caller-computed relative time cannot be checked against the trial's alignment time.",
								"properties": {
									"kind": { "const": "time" },
									"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
									"values": {
										"type": "array",
										"items": { "type": "number" },
										"maxItems": 2e6
									}
								},
								"required": [
									"kind",
									"unit",
									"values"
								],
								"additionalProperties": false
							},
							"eventSenderIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"maxItems": 2e6
							},
							"eventTrialIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"maxItems": 2e6,
								"description": "The trial each event belongs to. It selects the alignment time; an event with no trial has no relative time. Read against `trialIds` by events.trial_universe_declared, so every value must be a member of the declared trial universe."
							},
							"recordedSenderIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The COMPLETE set of senders that were recorded AND selected — including any that never fired in any trial. This is the per-neuron denominator basis and it cannot be inferred from the events. events.sender_universe_declared requires every event sender to be a member."
							},
							"trialIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The COMPLETE trial universe as a flat array, including trials in which nothing happened. Declared, never inferred from the observed event trial ids: a trial with no events is still a trial. Kept unique by ids.unique and used as the universe by events.trial_universe_declared."
							},
							"alignmentUnit": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode",
								"description": "The unit of every entry in `alignmentTimes`. Alignment times are on the same absolute clock as `eventTimes` and must share its dimension; a differing code is converted through the typed unit layer and the conversion is disclosed."
							},
							"alignmentTimes": {
								"type": "array",
								"items": { "type": "number" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The absolute alignment time of each trial, positionally parallel to `trialIds`. Relative time is t_event minus the alignment time of the event's own trial. Required by psth.alignment_declared: without it there is nothing for time zero to mean."
							},
							"relativeWindow": {
								"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow" }, {
									"type": "object",
									"required": ["boundary"]
								}],
								"description": "The analysis window in RELATIVE time, measured from each trial's own alignment time. It decides membership; the bins decide placement. window.valid reads it at /data/relativeWindow."
							}
						},
						"required": [
							"mode",
							"eventTimes",
							"eventSenderIds",
							"eventTrialIds",
							"recordedSenderIds",
							"trialIds",
							"alignmentUnit",
							"alignmentTimes",
							"relativeWindow"
						],
						"additionalProperties": false
					}, {
						"type": "object",
						"properties": {
							"mode": { "const": "prebinned" },
							"trialIds": {
								"type": "array",
								"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The COMPLETE trial universe associated with the pre-binned analysis, as a flat array. It is includedTrialCount + excludedTrialCount long, but revision 2 does not identify which members are included versus excluded; only the exact partition cardinalities remain. Kept unique by ids.unique; its length is the trial count read by psth.alignment_declared."
							},
							"alignmentUnit": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode",
								"description": "The unit of every entry in `alignmentTimes`."
							},
							"alignmentTimes": {
								"type": "array",
								"items": { "type": "number" },
								"minItems": 1,
								"maxItems": 1e5,
								"description": "The absolute alignment time of each trial in `trialIds`, positionally parallel to it. A pre-binned request still declares the reference it was aligned to; psth.alignment_declared requires it in both modes."
							},
							"counts": {
								"type": "array",
								"items": {
									"type": ["integer", "null"],
									"minimum": 0
								},
								"maxItems": 1e5,
								"description": "Producer-supplied exact integer event counts per bin over the aggregate scope described only by included-trial and selected-sender cardinalities. Cortexel range-checks them and re-derives normalization but cannot re-derive them from raw observations. `null` means the producer declares that NO included trial covered the bin: it is a hole, not a measured zero. Length must be one less than the authoritative edge count."
							},
							"trialDenominators": {
								"type": "array",
								"items": {
									"type": ["integer", "null"],
									"minimum": 1
								},
								"maxItems": 1e5,
								"description": "The number of included trials that FULLY cover each bin. Under a uniform denominator this is the same positive integer in every bin. It is null exactly where `counts` is null: a count without a denominator, or a denominator without a count, is a contradiction and is refused."
							},
							"recordedSenderCount": {
								"type": "integer",
								"minimum": 1,
								"description": "The number of senders that were recorded and selected, including any that never fired. This exact cardinality is the per-neuron denominator. Prebinned mode does not retain their identities, so PRE_BINNED_INPUT discloses that membership cannot be recovered. rate.denominator_positive requires a positive integer."
							},
							"includedTrialCount": {
								"type": "integer",
								"minimum": 1,
								"description": "The exact number of trials included in the aggregate analysis. No per-bin denominator may exceed it. The identities of the included members of `trialIds` are not retained in revision 2."
							},
							"excludedTrialCount": {
								"type": "integer",
								"minimum": 0,
								"description": "The exact number of trials deliberately excluded from the aggregate analysis. Declared, never inferred: the trial-universe cardinality is includedTrialCount + excludedTrialCount, but revision 2 does not retain the membership partition."
							},
							"rates": {
								"type": "object",
								"description": "Optional. The pre-normalized values per bin. Its `kind` must match the requested normalization: `count` -> count, `count_per_trial` -> ratio, either rate -> firing_rate. `null` exactly where `counts` is null.",
								"properties": {
									"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
									"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
									"values": {
										"type": "array",
										"items": { "type": ["number", "null"] },
										"maxItems": 1e5
									}
								},
								"required": [
									"kind",
									"unit",
									"values"
								],
								"additionalProperties": false
							},
							"relativeWindow": {
								"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow" }, {
									"type": "object",
									"required": ["boundary"]
								}],
								"description": "The exact relative membership window used by the aggregate. Its boundary is required explicitly; PSTH does not inherit the common-schema display default."
							}
						},
						"required": [
							"mode",
							"trialIds",
							"alignmentUnit",
							"alignmentTimes",
							"counts",
							"trialDenominators",
							"recordedSenderCount",
							"includedTrialCount",
							"excludedTrialCount",
							"relativeWindow"
						],
						"additionalProperties": false
					}]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"seriesId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
						"seriesLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
						"alignmentLabel": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
							"description": "What the alignment times are DECLARED to be, for example \"Stimulus onset\". It labels the zero line. Cortexel cannot verify it: the scientific fact is the per-trial alignment time, and the label is a caller declaration like the source system."
						},
						"bins": {
							"allOf": [{ "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/binSpec" }, {
								"type": "object",
								"required": ["boundary", "finalEdgeInclusive"]
							}],
							"description": "The single authoritative bin-edge vector, in RELATIVE time, in BOTH modes. The bins must tile the relative window exactly. Boundary fields are not redundant alternatives here: `[start,stop)` requires `[lo,hi)` plus `finalEdgeInclusive:false`, while `[start,stop]` requires `[lo,hi]` plus `finalEdgeInclusive:true`; contradictory requested versus effective rules are refused. Cortexel never chooses a bin width for you: the width determines the height of every peak in the figure."
						},
						"normalization": {
							"type": "string",
							"enum": [
								"count",
								"count_per_trial",
								"total_event_rate_per_trial",
								"mean_rate_per_selected_sender_per_trial"
							],
							"description": "`count` is the exact integer. `count_per_trial` divides by the bin's trial denominator. `total_event_rate_per_trial` is the rate of the whole selected group per trial and carries NO per-neuron claim. `mean_rate_per_selected_sender_per_trial` additionally divides by the selected-sender count and IS a per-neuron claim. The two rates are separate ids precisely so they cannot be conflated."
						},
						"denominatorPolicy": {
							"type": "string",
							"enum": ["uniform_trial_count", "per_bin_covering_trials"],
							"description": "`uniform_trial_count` asserts that every included trial observed the entire relative window. `per_bin_covering_trials` is accepted only for prebinned data, where exact per-bin covering-trial counts are supplied. Events mode carries no per-trial coverage records in revision 2, so the root envelope constraint refuses that combination structurally rather than inventing uniform coverage."
						},
						"senderExposurePolicy": {
							"const": "all_selected_senders_cover_every_counted_trial_bin",
							"description": "Required only for `mean_rate_per_selected_sender_per_trial`. The caller asserts that every selected sender was observable in every trial/bin contributing to the count and trial denominator. Cortexel retains and discloses this nonverifiable exposure assumption; it never infers exposure from whether a sender fired."
						},
						"baseline": {
							"type": "object",
							"description": "Optional baseline subtraction, in RELATIVE time and in the unit of `relativeWindow`. Permitted ONLY with a rate normalization: a count is extensive — it grows with the bin width and with the number of covering trials — so subtracting a mean count from bins of different width or different coverage produces a number with no consistent meaning. Both bounds must coincide with bin edges.",
							"properties": {
								"mode": { "const": "subtract_mean_rate" },
								"start": { "type": "number" },
								"stop": { "type": "number" }
							},
							"required": [
								"mode",
								"start",
								"stop"
							],
							"additionalProperties": false
						},
						"uncertainty": {
							"type": "object",
							"description": "Revision 2 accepts no uncertainty geometry. Absence is explicit and drives UNCERTAINTY_NOT_PROVIDED; a numeric uncertainty variant is refused structurally rather than accepted and then omitted from the figure.",
							"properties": {
								"kind": { "const": "none" },
								"reason": {
									"type": "string",
									"enum": [
										"single_trial",
										"not_computed",
										"not_available",
										"not_applicable"
									]
								}
							},
							"required": ["kind", "reason"],
							"additionalProperties": false
						}
					},
					"required": [
						"seriesId",
						"alignmentLabel",
						"bins",
						"normalization",
						"denominatorPolicy"
					],
					"additionalProperties": false,
					"allOf": [{
						"if": {
							"properties": { "normalization": { "enum": ["count", "count_per_trial"] } },
							"required": ["normalization"]
						},
						"then": { "not": { "required": ["baseline"] } }
					}, {
						"if": {
							"properties": { "normalization": { "const": "mean_rate_per_selected_sender_per_trial" } },
							"required": ["normalization"]
						},
						"then": { "required": ["senderExposurePolicy"] }
					}]
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false,
			"allOf": [{ "allOf": [
				{
					"if": {
						"properties": { "data": {
							"type": "object",
							"properties": { "mode": { "const": "events" } },
							"required": ["mode"]
						} },
						"required": ["data"]
					},
					"then": {
						"properties": { "parameters": {
							"type": "object",
							"properties": { "denominatorPolicy": { "const": "uniform_trial_count" } },
							"required": ["denominatorPolicy"]
						} },
						"required": ["parameters"]
					}
				},
				{
					"if": {
						"properties": { "data": {
							"type": "object",
							"properties": { "relativeWindow": {
								"type": "object",
								"properties": { "boundary": { "const": "[start,stop]" } },
								"required": ["boundary"]
							} },
							"required": ["relativeWindow"]
						} },
						"required": ["data"]
					},
					"then": {
						"properties": { "parameters": {
							"type": "object",
							"properties": { "bins": {
								"type": "object",
								"properties": {
									"boundary": { "const": "[lo,hi]" },
									"finalEdgeInclusive": { "const": true }
								}
							} },
							"required": ["bins"]
						} },
						"required": ["parameters"]
					}
				},
				{
					"if": {
						"properties": { "data": {
							"type": "object",
							"properties": { "relativeWindow": {
								"type": "object",
								"properties": { "boundary": { "const": "[start,stop)" } },
								"required": ["boundary"]
							} },
							"required": ["relativeWindow"]
						} },
						"required": ["data"]
					},
					"then": {
						"properties": { "parameters": {
							"type": "object",
							"properties": { "bins": {
								"type": "object",
								"properties": {
									"boundary": { "const": "[lo,hi)" },
									"finalEdgeInclusive": { "const": false }
								}
							} },
							"required": ["bins"]
						} },
						"required": ["parameters"]
					}
				}
			] }]
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "neuro.psth" },
			"data": {
				"mode": "events",
				"eventTimes": {
					"kind": "time",
					"unit": "ms",
					"values": [
						1002,
						1005.5,
						1010,
						2004,
						2004,
						2011.5,
						3009
					]
				},
				"eventSenderIds": [
					"1",
					"2",
					"1",
					"1",
					"3",
					"2",
					"3"
				],
				"eventTrialIds": [
					"t1",
					"t1",
					"t1",
					"t2",
					"t2",
					"t2",
					"t3"
				],
				"recordedSenderIds": [
					"1",
					"2",
					"3",
					"4"
				],
				"trialIds": [
					"t1",
					"t2",
					"t3",
					"t4"
				],
				"alignmentUnit": "ms",
				"alignmentTimes": [
					1e3,
					2e3,
					3e3,
					4e3
				],
				"relativeWindow": {
					"start": -10,
					"stop": 20,
					"unit": "ms",
					"boundary": "[start,stop)"
				}
			},
			"parameters": {
				"seriesId": "exc",
				"seriesLabel": "Excitatory",
				"alignmentLabel": "Stimulus onset",
				"bins": {
					"mode": "width",
					"unit": "ms",
					"width": 10,
					"start": -10,
					"stop": 20,
					"boundary": "[lo,hi)",
					"finalEdgeInclusive": false
				},
				"normalization": "mean_rate_per_selected_sender_per_trial",
				"denominatorPolicy": "uniform_trial_count",
				"senderExposurePolicy": "all_selected_senders_cover_every_counted_trial_bin",
				"uncertainty": {
					"kind": "none",
					"reason": "not_computed"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"neuro.response_curve": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/neuro.response_curve.request.v1.schema.json",
			"title": "neuro.response_curve request",
			"description": "GENERATED from contract/skills/neuro.response_curve.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "neuro.response_curve" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"description": "Either raw repeats (every attempted repeat is a row, including the ones whose response was zero or undefined) or per-condition aggregates (a summary that carries its own sample and exclusion counts). The response METHOD lives on the response object itself, not in parameters, because it states what the numbers ARE — and because it is then bound STRUCTURALLY to the quantity kind and to the basis fields it requires, rather than by a conditional a reader has to reconstruct.",
					"oneOf": [{
						"type": "object",
						"properties": {
							"mode": { "const": "repeats" },
							"measurementWindow": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow",
								"description": "The interval over which every response was measured. A mean rate without its window is not auditable, and whether a pre-stimulus period is included changes the number."
							},
							"eventScope": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/responseEventScope",
								"description": "The one spike-train selection and superposition rule shared by every condition and repeat. It makes single-train counts/latencies distinguishable from pooled-population counts/latencies and binds rate denominators to an identified selection rather than a bare cardinality."
							},
							"conditions": {
								"type": "object",
								"description": "The declared condition universe. It is the x-axis domain: a condition with no usable repeat stays on the axis and is drawn as a gap, never removed.",
								"oneOf": [{
									"type": "object",
									"properties": {
										"axis": { "const": "numeric" },
										"ids": {
											"type": "array",
											"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
											"minItems": 1,
											"maxItems": 1e3
										},
										"labels": {
											"type": "array",
											"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
											"maxItems": 1e3
										},
										"input": {
											"type": "object",
											"description": "The controlled input level of each condition, parallel to `ids`. Any quantity kind is allowed — an injected current, a drive rate, a conductance, an orientation angle — and the unit's dimension must match the kind.",
											"properties": {
												"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
												"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
												"values": {
													"type": "array",
													"items": { "type": "number" },
													"minItems": 1,
													"maxItems": 1e3
												},
												"label": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
												"scale": {
													"type": "string",
													"enum": ["linear", "log10"],
													"description": "The scale on which the input was meaningfully spaced. `log10` with a zero or negative input is refused (RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN) rather than clipped, because clipping a zero-input control condition deletes the baseline."
												}
											},
											"required": [
												"kind",
												"unit",
												"values",
												"scale"
											],
											"additionalProperties": false
										}
									},
									"required": [
										"axis",
										"ids",
										"input"
									],
									"additionalProperties": false
								}, {
									"type": "object",
									"properties": {
										"axis": {
											"type": "string",
											"enum": ["ordinal", "nominal"],
											"description": "`ordinal` conditions have a meaningful declared order and may carry a guide line. `nominal` conditions have none and are NEVER connected: a line across unordered categories asserts an order that does not exist."
										},
										"ids": {
											"type": "array",
											"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
											"minItems": 1,
											"maxItems": 1e3
										},
										"labels": {
											"type": "array",
											"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
											"maxItems": 1e3
										},
										"inputLabel": {
											"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
											"description": "What distinguishes the conditions. A categorical axis has no numeric input and therefore no unit; it must not be given one."
										}
									},
									"required": ["axis", "ids"],
									"additionalProperties": false
								}]
							},
							"observations": {
								"type": "object",
								"description": "One row per ATTEMPTED repeat. A repeat that produced no event is still a row: for count-like methods its response is a measured 0, for a latency it is null.",
								"properties": {
									"attemptedCounts": {
										"type": "array",
										"items": {
											"type": "integer",
											"minimum": 0
										},
										"minItems": 1,
										"maxItems": 1e3,
										"description": "Declared attempted-repeat count for each condition, parallel to conditions.ids. Cortexel requires exactly this many rows for the condition, so an attempted repeat cannot disappear merely because its response was undefined. This verifies consistency with the caller's declared attempt universe, not external simulator truth."
									},
									"conditionIds": {
										"type": "array",
										"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
										"minItems": 1,
										"maxItems": 2e4
									},
									"repeatIds": {
										"type": "array",
										"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
										"minItems": 1,
										"maxItems": 2e4,
										"description": "Replicate identity: a trial, a seed, or a cell. Under a paired design the SAME id recurs across conditions and is how the pairing is expressed, so ids are unique within a condition rather than globally."
									},
									"response": {
										"type": "object",
										"description": "What the response numbers ARE. Each branch binds `method` to the quantity kind it must carry and to the fields that method cannot be interpreted without: a latency is never typed as a rate, and a peak never arrives without the estimator that produced it. There is no branch in which a basis, a latency reference, or a count audit attaches to a method it cannot describe.",
										"oneOf": [
											{
												"type": "object",
												"description": "A mean firing rate over the measurement window for the top-level eventScope. Optionally carries exact integer post-pooling event counts so Cortexel can RE-DERIVE each repeat's rate instead of trusting the supplied number. The divisor is fixed by rateNormalization: one for a single train or pooled total, and eventScope.recordedSenderCount for a mean per recorded sender.",
												"properties": {
													"method": { "const": "mean_firing_rate" },
													"kind": { "enum": ["firing_rate"] },
													"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
													"rateNormalization": {
														"type": "string",
														"enum": [
															"single_train_rate",
															"total_event_rate",
															"mean_rate_per_recorded_sender"
														],
														"description": "The arithmetic denominator, cross-checked against the top-level eventScope. single_train_rate requires single_train. total_event_rate and mean_rate_per_recorded_sender require pooled_recorded_senders; only the latter divides by eventScope.recordedSenderCount."
													},
													"values": {
														"type": "array",
														"items": { "type": ["number", "null"] },
														"minItems": 1,
														"maxItems": 2e4,
														"description": "null means the repeat was attempted and its response is UNDEFINED. It is never a zero, never interpolated, and never dropped from the attempted count. A repeat that fired no spike has response 0, not null."
													},
													"audit": {
														"type": "object",
														"description": "Optional per-repeat count audit. It is legal ONLY here because the exact event count, typed measurement-window duration, declared rate unit, and normalization divisor can reconstruct a MEAN rate; they cannot reconstruct a peak, latency, or voltage.",
														"properties": { "eventCounts": {
															"type": "array",
															"items": {
																"type": ["integer", "null"],
																"minimum": 0
															},
															"minItems": 1,
															"maxItems": 2e4,
															"description": "Exact integer counts, parallel to the observation rows. An entry is null exactly where the response is null."
														} },
														"required": ["eventCounts"],
														"additionalProperties": false
													}
												},
												"required": [
													"method",
													"kind",
													"unit",
													"rateNormalization",
													"values"
												],
												"additionalProperties": false
											},
											{
												"type": "object",
												"description": "A peak instantaneous rate. The basis is REQUIRED: a peak is a property of the estimator as much as of the system, and halving the bin width can roughly double it. Raw binned-count peaks additionally require exact peakBinCounts so rate and condition-estimator arithmetic can be re-derived at count level.",
												"properties": {
													"method": { "const": "peak_firing_rate" },
													"kind": { "enum": ["firing_rate"] },
													"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
													"rateNormalization": {
														"type": "string",
														"enum": [
															"single_train_rate",
															"total_event_rate",
															"mean_rate_per_recorded_sender"
														]
													},
													"values": {
														"type": "array",
														"items": { "type": ["number", "null"] },
														"minItems": 1,
														"maxItems": 2e4
													},
													"audit": {
														"type": "object",
														"description": "Required exactly when basis.estimator is binned_count. The identified max-bin counts bind every raw repeat to the discrete estimator and let Cortexel derive condition summaries at count level before one final rate rounding. Kernel peaks have no discrete count audit and forbid this object.",
														"properties": { "peakBinCounts": {
															"type": "array",
															"items": {
																"type": ["integer", "null"],
																"minimum": 0
															},
															"minItems": 1,
															"maxItems": 2e4,
															"description": "Exact max-bin event count for each observation row, parallel to response.values. An entry is null exactly where the response is null."
														} },
														"required": ["peakBinCounts"],
														"additionalProperties": false
													},
													"basis": {
														"type": "object",
														"description": "The estimator that produced the peak. Cortexel does not infer the max-bin count or recompute a kernel peak from unavailable events. For raw binned input it re-derives the rate and condition estimator from the supplied exact peakBinCounts; every peak basis remains mandatory.",
														"oneOf": [{
															"type": "object",
															"properties": {
																"estimator": { "const": "binned_count" },
																"binWidth": {
																	"type": "object",
																	"description": "The bin width whose maximum count produced the peak.",
																	"properties": {
																		"kind": { "enum": ["duration"] },
																		"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
																		"value": {
																			"type": "number",
																			"exclusiveMinimum": 0
																		}
																	},
																	"required": [
																		"kind",
																		"unit",
																		"value"
																	],
																	"additionalProperties": false
																},
																"binCount": {
																	"type": "integer",
																	"minimum": 1,
																	"maximum": 1e5,
																	"description": "Number of full bins. Cortexel independently materializes the declared grid and requires this count to agree."
																},
																"origin": { "const": "measurement_window_start" },
																"boundary": { "const": "[start,stop)" },
																"tilingPolicy": { "const": "cortexel_binary64_uniform_exposure_bins_v1" },
																"partialBinPolicy": { "const": "refuse" }
															},
															"required": [
																"estimator",
																"binWidth",
																"binCount",
																"origin",
																"boundary",
																"tilingPolicy",
																"partialBinPolicy"
															],
															"additionalProperties": false
														}, {
															"type": "object",
															"properties": {
																"estimator": { "const": "kernel" },
																"shape": {
																	"type": "string",
																	"enum": [
																		"gaussian",
																		"boxcar",
																		"exponential",
																		"laplace"
																	]
																},
																"kernelForm": {
																	"type": "string",
																	"enum": [
																		"symmetric",
																		"causal_past",
																		"symmetric_laplace"
																	],
																	"description": "The orientation of the normalized kernel. Gaussian is symmetric; boxcar is symmetric or causal_past; exponential is causal_past; Laplace is the explicitly two-sided symmetric_laplace form."
																},
																"bandwidthDefinition": {
																	"type": "string",
																	"enum": [
																		"standard_deviation",
																		"full_width",
																		"time_constant"
																	],
																	"description": "The mathematical meaning of bandwidth: Gaussian sigma, the boxcar's full support width, or exponential/Laplace tau."
																},
																"bandwidth": {
																	"type": "object",
																	"properties": {
																		"kind": { "enum": ["duration"] },
																		"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
																		"value": {
																			"type": "number",
																			"exclusiveMinimum": 0
																		}
																	},
																	"required": [
																		"kind",
																		"unit",
																		"value"
																	],
																	"additionalProperties": false
																},
																"support": {
																	"type": "object",
																	"oneOf": [
																		{
																			"type": "object",
																			"properties": { "kind": { "const": "analytic_infinite" } },
																			"required": ["kind"],
																			"additionalProperties": false
																		},
																		{
																			"type": "object",
																			"properties": {
																				"kind": { "const": "finite_cutoff" },
																				"geometry": {
																					"type": "string",
																					"enum": ["symmetric_radius", "past_horizon"]
																				},
																				"cutoff": {
																					"type": "object",
																					"properties": {
																						"kind": { "enum": ["duration"] },
																						"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
																						"value": {
																							"type": "number",
																							"exclusiveMinimum": 0
																						}
																					},
																					"required": [
																						"kind",
																						"unit",
																						"value"
																					],
																					"additionalProperties": false
																				},
																				"cutoffBoundary": { "const": "inclusive" },
																				"tailPolicy": { "const": "renormalize_to_unit_integral" }
																			},
																			"required": [
																				"kind",
																				"geometry",
																				"cutoff",
																				"cutoffBoundary",
																				"tailPolicy"
																			],
																			"additionalProperties": false
																		},
																		{
																			"type": "object",
																			"properties": {
																				"kind": { "const": "finite_full_width" },
																				"supportBoundary": { "const": "inclusive" }
																			},
																			"required": ["kind", "supportBoundary"],
																			"additionalProperties": false
																		}
																	]
																},
																"normalization": { "const": "unit_integral_on_declared_support" },
																"evaluationOperator": { "const": "direct_kernel_sum" },
																"edgePolicy": {
																	"type": "string",
																	"enum": ["none", "renormalize_evaluation_mass"],
																	"description": "none uses only events in the measurement window with no boundary correction. renormalize_evaluation_mass divides at each evaluation time by the unit-integral kernel mass whose event-time argument lies inside the measurement window."
																},
																"evaluation": { "oneOf": [{
																	"type": "object",
																	"properties": {
																		"mode": { "const": "continuous_supremum" },
																		"domain": { "const": "measurement_window" },
																		"boundary": {
																			"type": "string",
																			"enum": ["[start,stop)", "[start,stop]"]
																		}
																	},
																	"required": [
																		"mode",
																		"domain",
																		"boundary"
																	],
																	"additionalProperties": false
																}, {
																	"type": "object",
																	"properties": {
																		"mode": { "const": "sampled_grid" },
																		"origin": { "const": "measurement_window_start" },
																		"boundary": { "const": "[start,stop)" },
																		"stopPolicy": { "const": "exclude_stop" },
																		"tilingPolicy": { "const": "cortexel_binary64_nominal_steps_v1" },
																		"partialStepPolicy": { "const": "refuse" },
																		"step": {
																			"type": "object",
																			"properties": {
																				"kind": { "enum": ["duration"] },
																				"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
																				"value": {
																					"type": "number",
																					"exclusiveMinimum": 0
																				}
																			},
																			"required": [
																				"kind",
																				"unit",
																				"value"
																			],
																			"additionalProperties": false
																		},
																		"sampleCount": {
																			"type": "integer",
																			"minimum": 1,
																			"maximum": 1e5,
																			"description": "Number of sampled points t_k = start + k*step for k=0,...,sampleCount-1. stop is not sampled and equals start + sampleCount*step under the declared tiling policy."
																		}
																	},
																	"required": [
																		"mode",
																		"origin",
																		"boundary",
																		"stopPolicy",
																		"tilingPolicy",
																		"partialStepPolicy",
																		"step",
																		"sampleCount"
																	],
																	"additionalProperties": false
																}] }
															},
															"required": [
																"estimator",
																"shape",
																"kernelForm",
																"bandwidthDefinition",
																"bandwidth",
																"support",
																"normalization",
																"evaluationOperator",
																"edgePolicy",
																"evaluation"
															],
															"additionalProperties": false
														}]
													}
												},
												"allOf": [{
													"if": {
														"properties": { "basis": {
															"properties": { "estimator": { "const": "binned_count" } },
															"required": ["estimator"]
														} },
														"required": ["basis"]
													},
													"then": { "required": ["audit"] },
													"else": { "not": { "required": ["audit"] } }
												}],
												"required": [
													"method",
													"kind",
													"unit",
													"rateNormalization",
													"values",
													"basis"
												],
												"additionalProperties": false
											},
											{
												"type": "object",
												"description": "The latency of the first event inside the window. The reference is REQUIRED: a latency is a duration from a reference, and without it the number is not a latency.",
												"properties": {
													"method": { "const": "first_spike_latency" },
													"kind": { "enum": ["duration"] },
													"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
													"values": {
														"type": "array",
														"items": { "type": ["number", "null"] },
														"minItems": 1,
														"maxItems": 2e4,
														"description": "A repeat with no event is null and is never dropped from the attempted count. A defined 0 is not missing: it means the first event occurred exactly at the included measurement-window start."
													},
													"latencyReference": {
														"const": "measurement_window_start",
														"description": "Revision 2 binds latency to the measurement-window start so its upper bound is exactly checkable. stimulus_onset is unrepresentable until a typed onset coordinate relative to the window exists."
													}
												},
												"required": [
													"method",
													"kind",
													"unit",
													"values",
													"latencyReference"
												],
												"additionalProperties": false
											},
											{
												"type": "object",
												"description": "An exact integer event count, not a rate.",
												"properties": {
													"method": { "const": "event_count" },
													"kind": { "enum": ["count"] },
													"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
													"values": {
														"type": "array",
														"items": { "type": ["number", "null"] },
														"minItems": 1,
														"maxItems": 2e4
													}
												},
												"required": [
													"method",
													"kind",
													"unit",
													"values"
												],
												"additionalProperties": false
											}
										]
									}
								},
								"required": [
									"attemptedCounts",
									"conditionIds",
									"repeatIds",
									"response"
								],
								"additionalProperties": false
							}
						},
						"required": [
							"mode",
							"measurementWindow",
							"eventScope",
							"conditions",
							"observations"
						],
						"additionalProperties": false
					}, {
						"type": "object",
						"properties": {
							"mode": { "const": "aggregates" },
							"measurementWindow": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/timeWindow" },
							"eventScope": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/responseEventScope",
								"description": "The one spike-train selection and superposition rule summarized by every aggregate condition. Aggregate input does not weaken the need to identify what was counted or timed."
							},
							"conditions": {
								"type": "object",
								"oneOf": [{
									"type": "object",
									"properties": {
										"axis": { "const": "numeric" },
										"ids": {
											"type": "array",
											"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
											"minItems": 1,
											"maxItems": 1e3
										},
										"labels": {
											"type": "array",
											"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
											"maxItems": 1e3
										},
										"input": {
											"type": "object",
											"properties": {
												"kind": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/quantityKind" },
												"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
												"values": {
													"type": "array",
													"items": { "type": "number" },
													"minItems": 1,
													"maxItems": 1e3
												},
												"label": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
												"scale": {
													"type": "string",
													"enum": ["linear", "log10"]
												}
											},
											"required": [
												"kind",
												"unit",
												"values",
												"scale"
											],
											"additionalProperties": false
										}
									},
									"required": [
										"axis",
										"ids",
										"input"
									],
									"additionalProperties": false
								}, {
									"type": "object",
									"properties": {
										"axis": {
											"type": "string",
											"enum": ["ordinal", "nominal"]
										},
										"ids": {
											"type": "array",
											"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
											"minItems": 1,
											"maxItems": 1e3
										},
										"labels": {
											"type": "array",
											"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
											"maxItems": 1e3
										},
										"inputLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" }
									},
									"required": ["axis", "ids"],
									"additionalProperties": false
								}]
							},
							"aggregates": {
								"type": "object",
								"description": "Exactly one row per declared condition, POSITIONALLY bound to conditions.ids in the declared order. Positional binding is deliberate: it makes it impossible to omit a condition, which is the way an inconvenient low-input point usually disappears.",
								"properties": {
									"response": {
										"type": "object",
										"description": "The per-condition estimate. The method is bound to its quantity kind exactly as it is for raw repeats; a summary does not earn a weaker binding. There is no count audit here: an aggregate cannot be re-derived from per-repeat counts that were not supplied.",
										"oneOf": [
											{
												"type": "object",
												"properties": {
													"method": { "const": "mean_firing_rate" },
													"kind": { "enum": ["firing_rate"] },
													"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
													"rateNormalization": {
														"type": "string",
														"enum": [
															"single_train_rate",
															"total_event_rate",
															"mean_rate_per_recorded_sender"
														],
														"description": "single_train_rate requires eventScope.kind single_train. total_event_rate and mean_rate_per_recorded_sender require pooled_recorded_senders; only the latter divides by eventScope.recordedSenderCount."
													},
													"values": {
														"type": "array",
														"items": { "type": ["number", "null"] },
														"minItems": 1,
														"maxItems": 1e3,
														"description": "The estimate for each condition. null means no repeat yielded a usable response — the condition keeps its place on the axis with no point drawn."
													}
												},
												"required": [
													"method",
													"kind",
													"unit",
													"rateNormalization",
													"values"
												],
												"additionalProperties": false
											},
											{
												"type": "object",
												"properties": {
													"method": { "const": "peak_firing_rate" },
													"kind": { "enum": ["firing_rate"] },
													"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
													"rateNormalization": {
														"type": "string",
														"enum": [
															"single_train_rate",
															"total_event_rate",
															"mean_rate_per_recorded_sender"
														],
														"description": "single_train_rate requires eventScope.kind single_train. total_event_rate and mean_rate_per_recorded_sender require pooled_recorded_senders; only the latter divides by eventScope.recordedSenderCount."
													},
													"values": {
														"type": "array",
														"items": { "type": ["number", "null"] },
														"minItems": 1,
														"maxItems": 1e3,
														"description": "null means no first event. A defined 0 means the first event occurred exactly at the included measurement-window start."
													},
													"basis": {
														"type": "object",
														"oneOf": [{
															"type": "object",
															"properties": {
																"estimator": { "const": "binned_count" },
																"binWidth": {
																	"type": "object",
																	"properties": {
																		"kind": { "enum": ["duration"] },
																		"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
																		"value": {
																			"type": "number",
																			"exclusiveMinimum": 0
																		}
																	},
																	"required": [
																		"kind",
																		"unit",
																		"value"
																	],
																	"additionalProperties": false
																},
																"binCount": {
																	"type": "integer",
																	"minimum": 1,
																	"maximum": 1e5
																},
																"origin": { "const": "measurement_window_start" },
																"boundary": { "const": "[start,stop)" },
																"tilingPolicy": { "const": "cortexel_binary64_uniform_exposure_bins_v1" },
																"partialBinPolicy": { "const": "refuse" }
															},
															"required": [
																"estimator",
																"binWidth",
																"binCount",
																"origin",
																"boundary",
																"tilingPolicy",
																"partialBinPolicy"
															],
															"additionalProperties": false
														}, {
															"type": "object",
															"properties": {
																"estimator": { "const": "kernel" },
																"shape": {
																	"type": "string",
																	"enum": [
																		"gaussian",
																		"boxcar",
																		"exponential",
																		"laplace"
																	]
																},
																"kernelForm": {
																	"type": "string",
																	"enum": [
																		"symmetric",
																		"causal_past",
																		"symmetric_laplace"
																	]
																},
																"bandwidthDefinition": {
																	"type": "string",
																	"enum": [
																		"standard_deviation",
																		"full_width",
																		"time_constant"
																	]
																},
																"bandwidth": {
																	"type": "object",
																	"properties": {
																		"kind": { "enum": ["duration"] },
																		"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
																		"value": {
																			"type": "number",
																			"exclusiveMinimum": 0
																		}
																	},
																	"required": [
																		"kind",
																		"unit",
																		"value"
																	],
																	"additionalProperties": false
																},
																"support": {
																	"type": "object",
																	"oneOf": [
																		{
																			"type": "object",
																			"properties": { "kind": { "const": "analytic_infinite" } },
																			"required": ["kind"],
																			"additionalProperties": false
																		},
																		{
																			"type": "object",
																			"properties": {
																				"kind": { "const": "finite_cutoff" },
																				"geometry": {
																					"type": "string",
																					"enum": ["symmetric_radius", "past_horizon"]
																				},
																				"cutoff": {
																					"type": "object",
																					"properties": {
																						"kind": { "enum": ["duration"] },
																						"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
																						"value": {
																							"type": "number",
																							"exclusiveMinimum": 0
																						}
																					},
																					"required": [
																						"kind",
																						"unit",
																						"value"
																					],
																					"additionalProperties": false
																				},
																				"cutoffBoundary": { "const": "inclusive" },
																				"tailPolicy": { "const": "renormalize_to_unit_integral" }
																			},
																			"required": [
																				"kind",
																				"geometry",
																				"cutoff",
																				"cutoffBoundary",
																				"tailPolicy"
																			],
																			"additionalProperties": false
																		},
																		{
																			"type": "object",
																			"properties": {
																				"kind": { "const": "finite_full_width" },
																				"supportBoundary": { "const": "inclusive" }
																			},
																			"required": ["kind", "supportBoundary"],
																			"additionalProperties": false
																		}
																	]
																},
																"normalization": { "const": "unit_integral_on_declared_support" },
																"evaluationOperator": { "const": "direct_kernel_sum" },
																"edgePolicy": {
																	"type": "string",
																	"enum": ["none", "renormalize_evaluation_mass"]
																},
																"evaluation": { "oneOf": [{
																	"type": "object",
																	"properties": {
																		"mode": { "const": "continuous_supremum" },
																		"domain": { "const": "measurement_window" },
																		"boundary": {
																			"type": "string",
																			"enum": ["[start,stop)", "[start,stop]"]
																		}
																	},
																	"required": [
																		"mode",
																		"domain",
																		"boundary"
																	],
																	"additionalProperties": false
																}, {
																	"type": "object",
																	"properties": {
																		"mode": { "const": "sampled_grid" },
																		"origin": { "const": "measurement_window_start" },
																		"boundary": { "const": "[start,stop)" },
																		"stopPolicy": { "const": "exclude_stop" },
																		"tilingPolicy": { "const": "cortexel_binary64_nominal_steps_v1" },
																		"partialStepPolicy": { "const": "refuse" },
																		"step": {
																			"type": "object",
																			"properties": {
																				"kind": { "enum": ["duration"] },
																				"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
																				"value": {
																					"type": "number",
																					"exclusiveMinimum": 0
																				}
																			},
																			"required": [
																				"kind",
																				"unit",
																				"value"
																			],
																			"additionalProperties": false
																		},
																		"sampleCount": {
																			"type": "integer",
																			"minimum": 1,
																			"maximum": 1e5
																		}
																	},
																	"required": [
																		"mode",
																		"origin",
																		"boundary",
																		"stopPolicy",
																		"tilingPolicy",
																		"partialStepPolicy",
																		"step",
																		"sampleCount"
																	],
																	"additionalProperties": false
																}] }
															},
															"required": [
																"estimator",
																"shape",
																"kernelForm",
																"bandwidthDefinition",
																"bandwidth",
																"support",
																"normalization",
																"evaluationOperator",
																"edgePolicy",
																"evaluation"
															],
															"additionalProperties": false
														}]
													}
												},
												"required": [
													"method",
													"kind",
													"unit",
													"rateNormalization",
													"values",
													"basis"
												],
												"additionalProperties": false
											},
											{
												"type": "object",
												"properties": {
													"method": { "const": "first_spike_latency" },
													"kind": { "enum": ["duration"] },
													"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
													"values": {
														"type": "array",
														"items": { "type": ["number", "null"] },
														"minItems": 1,
														"maxItems": 1e3
													},
													"latencyReference": {
														"const": "measurement_window_start",
														"description": "Revision 2 binds latency to the measurement-window start so its upper bound is exactly checkable. stimulus_onset is unrepresentable until a typed onset coordinate relative to the window exists."
													}
												},
												"required": [
													"method",
													"kind",
													"unit",
													"values",
													"latencyReference"
												],
												"additionalProperties": false
											},
											{
												"type": "object",
												"properties": {
													"method": { "const": "event_count" },
													"kind": { "enum": ["count"] },
													"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
													"values": {
														"type": "array",
														"items": { "type": ["number", "null"] },
														"minItems": 1,
														"maxItems": 1e3,
														"description": "An estimator over exact counts need not itself be an integer: the mean of 3 and 4 counted events is 3.5, and rounding it would be a fabricated measurement. It must nevertheless lie on the exact estimator/sample-count lattice: mean and trimmed mean are correctly rounded integer-total ratios; odd-n median is integral; even-n median is integral or half-integral."
													}
												},
												"required": [
													"method",
													"kind",
													"unit",
													"values"
												],
												"additionalProperties": false
											}
										]
									},
									"sampleCounts": {
										"type": "array",
										"items": {
											"type": ["integer", "null"],
											"minimum": 1
										},
										"minItems": 1,
										"maxItems": 1e3,
										"description": "n RETAINED by the estimator for each condition; null exactly where the response is null. An aggregate without n is uninterpretable: the mean of 1 repeat draws identically to the mean of 50."
									},
									"excludedCounts": {
										"type": "array",
										"items": {
											"type": "integer",
											"minimum": 0
										},
										"minItems": 1,
										"maxItems": 1e3,
										"description": "Repeats ATTEMPTED but excluded because the response was undefined. For mean and median, attempted = sampleCount + excludedCount. For trimmed_mean, attempted = sampleCount + trimmedCount + excludedCount."
									},
									"trimmedCounts": {
										"type": "array",
										"items": {
											"type": "integer",
											"minimum": 0
										},
										"minItems": 1,
										"maxItems": 1e3,
										"description": "Total finite observations removed symmetrically from both tails. REQUIRED semantically iff estimator is trimmed_mean and FORBIDDEN otherwise. Each value is even and must equal 2 * floor_exact((sampleCount + trimmedCount) * trimFraction); it is 0 where sampleCount is null."
									}
								},
								"required": [
									"response",
									"sampleCounts",
									"excludedCounts"
								],
								"additionalProperties": false
							}
						},
						"required": [
							"mode",
							"measurementWindow",
							"eventScope",
							"conditions",
							"aggregates"
						],
						"additionalProperties": false
					}]
				},
				"parameters": {
					"type": "object",
					"description": "The estimator is a closed union: a trim fraction exists exactly where a trimmed mean does. A trim fraction with no trimmed mean would be an instruction silently ignored, and a trimmed mean with no fraction has no definition.",
					"oneOf": [{
						"type": "object",
						"properties": {
							"curveId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"curveLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
							"responseMethod": {
								"type": "string",
								"enum": [
									"mean_firing_rate",
									"peak_firing_rate",
									"first_spike_latency",
									"event_count"
								],
								"description": "What the response VALUE is, declared in parameters so the semantic layer can read it (validator response_curve.estimator_declared). It must name the same method carried by the response object; a curve whose y axis has no defined meaning is not a result."
							},
							"estimator": {
								"type": "string",
								"enum": ["mean", "median"],
								"description": "In repeats mode Cortexel computes this from the retained repeats. In aggregates mode it names the estimator that produced the supplied values. Either way the figure states which one it is, because a mean and a median of a skewed rate distribution are different numbers."
							},
							"repeatDesign": {
								"type": "string",
								"enum": ["independent", "paired"],
								"description": "`paired` means the same replicate (seed, cell, network realization) appears at every condition, so the repeats are not independent samples and an interval computed as if they were is too narrow. In raw-repeat mode the identical repeat-id set at every condition is machine-checked. In aggregate mode identities are absent, so pairing remains an explicitly unverified caller declaration."
							},
							"uncertainty": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty",
								"description": "Required. Revision 2 accepts only `{kind: none, reason}`. Leaving it out is not allowed because bare points imply a precision nobody stated; supplying an unsupported mark is refused rather than silently dropped."
							}
						},
						"required": [
							"curveId",
							"estimator",
							"responseMethod",
							"repeatDesign",
							"uncertainty"
						],
						"additionalProperties": false
					}, {
						"type": "object",
						"properties": {
							"curveId": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"curveLabel": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label" },
							"responseMethod": {
								"type": "string",
								"enum": [
									"mean_firing_rate",
									"peak_firing_rate",
									"first_spike_latency",
									"event_count"
								],
								"description": "What the response VALUE is, declared in parameters so the semantic layer can read it (validator response_curve.estimator_declared). It must name the same method carried by the response object; a curve whose y axis has no defined meaning is not a result."
							},
							"estimator": { "const": "trimmed_mean" },
							"trimFraction": {
								"type": "number",
								"minimum": 0,
								"exclusiveMaximum": .5,
								"description": "floor(n * trimFraction) values are removed from EACH tail, so 0.1 removes 20% of the repeats in total. The per-tail reading is the scipy convention; the per-total reading would trim half as much."
							},
							"repeatDesign": {
								"type": "string",
								"enum": ["independent", "paired"]
							},
							"uncertainty": {
								"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/uncertainty",
								"description": "Required. Revision 2 accepts only `{kind: none, reason}`; other common-union variants are semantically refused until truthful marks and verification ship."
							}
						},
						"required": [
							"curveId",
							"estimator",
							"responseMethod",
							"trimFraction",
							"repeatDesign",
							"uncertainty"
						],
						"additionalProperties": false
					}]
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "neuro.response_curve" },
			"data": {
				"eventScope": {
					"kind": "pooled_recorded_senders",
					"selectionId": "fi_output_cell",
					"eventKind": "spike",
					"eventCompleteness": "complete_for_selection_within_measurement_window",
					"poolingOperator": "superpose_selected_sender_trains",
					"recordedSenderCount": 1,
					"membershipBinding": {
						"kind": "explicit_sender_ids",
						"senderIds": ["cell-1"]
					}
				},
				"mode": "repeats",
				"measurementWindow": {
					"start": 0,
					"stop": 1e3,
					"unit": "ms",
					"boundary": "[start,stop)"
				},
				"conditions": {
					"axis": "numeric",
					"ids": [
						"I000",
						"I100",
						"I200"
					],
					"labels": [
						"0 pA",
						"100 pA",
						"200 pA"
					],
					"input": {
						"kind": "current",
						"unit": "pA",
						"values": [
							0,
							100,
							200
						],
						"label": "Injected current",
						"scale": "linear"
					}
				},
				"observations": {
					"attemptedCounts": [
						2,
						2,
						2
					],
					"conditionIds": [
						"I000",
						"I000",
						"I100",
						"I100",
						"I200",
						"I200"
					],
					"repeatIds": [
						"r1",
						"r2",
						"r1",
						"r2",
						"r1",
						"r2"
					],
					"response": {
						"method": "mean_firing_rate",
						"kind": "firing_rate",
						"unit": "Hz",
						"rateNormalization": "mean_rate_per_recorded_sender",
						"values": [
							0,
							0,
							12,
							14,
							31,
							29
						],
						"audit": { "eventCounts": [
							0,
							0,
							12,
							14,
							31,
							29
						] }
					}
				}
			},
			"parameters": {
				"curveId": "fi_curve",
				"curveLabel": "iaf_psc_alpha F-I",
				"estimator": "mean",
				"responseMethod": "mean_firing_rate",
				"repeatDesign": "independent",
				"uncertainty": {
					"kind": "none",
					"reason": "not_computed"
				}
			},
			"source": { "kind": "synthetic_fixture" }
		}
	},
	"neuro.spike_raster": {
		"requestSchema": {
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$id": "https://sepahead.github.io/cortexel/schemas/v1/skills/neuro.spike_raster.request.v1.schema.json",
			"title": "neuro.spike_raster request",
			"description": "GENERATED from contract/skills/neuro.spike_raster.v1.json. The complete structural request schema for this skill. Request acceptance also requires Cortexel identity, semantic, scientific, provenance, and request-budget gates. Figure acceptance additionally requires successful derivation and output budget enforcement through a rendering entrypoint.",
			"type": "object",
			"properties": {
				"$schema": { "type": "string" },
				"contract": {
					"type": "object",
					"properties": {
						"name": { "const": "cortexel-figure-request" },
						"version": {
							"type": "string",
							"enum": ["1.0"]
						}
					},
					"required": ["name", "version"],
					"additionalProperties": false
				},
				"contractDigest": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256" },
				"skill": {
					"type": "object",
					"properties": {
						"id": { "const": "neuro.spike_raster" },
						"revision": {
							"type": "integer",
							"minimum": 1,
							"description": "Optional in an authored request. A mismatched pin is refused before canonicalization. Every accepted canonical request materializes the resolved installed revision here, making an omitted pin and an explicit-current pin canonically identical."
						}
					},
					"required": ["id"],
					"additionalProperties": false
				},
				"data": {
					"type": "object",
					"properties": {
						"eventTimes": {
							"type": "object",
							"description": "One time per recorded event, in the caller's declared time unit.",
							"properties": {
								"kind": { "const": "time" },
								"unit": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/unitCode" },
								"values": {
									"type": "array",
									"items": { "type": "number" },
									"maxItems": 2e6,
									"description": "Finite binary64 times. Never null: a missing observation is not an event, so there is nothing to place and nothing to count."
								}
							},
							"required": [
								"kind",
								"unit",
								"values"
							],
							"additionalProperties": false
						},
						"eventSenderIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"maxItems": 2e6,
							"description": "The sender of each event, parallel to eventTimes.values. Every value must be a member of recordedSenderIds."
						},
						"eventTrialIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"maxItems": 2e6,
							"description": "Optional. The trial of each event, parallel to eventTimes.values. When present, the complete trial universe `trialIds` is required and rows become (sender, trial) pairs."
						},
						"eventIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"maxItems": 2e6,
							"description": "Optional stable per-event identity, parallel to eventTimes.values. When absent, a deterministic ordinal identity is assigned from the original row index and the assignment method is recorded, so an event can always be pointed at even though it was not named."
						},
						"recordedSenderIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"minItems": 1,
							"maxItems": 1e5,
							"description": "The COMPLETE set of senders that were recorded, INCLUDING every sender that never fired. These are the rows. It cannot be inferred from the events: a sender that stayed silent produces no event, and a raster whose rows come from the event list simply loses it — along with the negative evidence that is the raster's whole point."
						},
						"senderPopulationIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"maxItems": 1e5,
							"description": "Optional, parallel to recordedSenderIds: the population each recorded sender belongs to. The populations are exactly the distinct values here and their block order is first appearance in recordedSenderIds, so there is no second list to drift and no population id can dangle. Repetition is expected and is never treated as a duplicate-id error."
						},
						"trialIds": {
							"type": "array",
							"items": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/identifier" },
							"minItems": 1,
							"maxItems": 1e3,
							"description": "The COMPLETE trial universe in display order, INCLUDING trials in which nothing happened. Required whenever eventTrialIds are supplied. Cortexel never infers the trial count from the observed trial ids: a trial with no spikes is still a trial, and it is precisely the trial you must be able to see."
						},
						"window": {
							"description": "The declared event-membership window. Closure is mandatory. A finite-stop NEST memory recorder retains its native (origin + start, origin + stop] device interval. A recorder configured with NEST positive infinity uses a distinct capture-bounded variant whose finite upper endpoint is the successful-return biological capture time, never a fabricated device stop.",
							"allOf": [{
								"if": {
									"type": "object",
									"required": ["kind"]
								},
								"then": {
									"if": {
										"type": "object",
										"properties": { "kind": { "const": "nest_recording_device_origin_relative" } },
										"required": ["kind"]
									},
									"then": {
										"type": "object",
										"properties": {
											"kind": { "const": "nest_recording_device_origin_relative" },
											"origin": {
												"type": "number",
												"minimum": 0
											},
											"start": {
												"type": "number",
												"minimum": 0
											},
											"stop": {
												"type": "number",
												"minimum": 0
											},
											"unit": { "const": "ms" },
											"boundary": { "const": "(origin+start,origin+stop]" },
											"recordingBackend": { "const": "memory" },
											"timeEncoding": { "const": "native_binary64_ms" },
											"captureAuthority": {
												"type": "object",
												"description": "Caller-declared authority needed to interpret a retained NEST memory status as a complete raster. Cortexel checks this declaration for internal consistency and binds it into the request; it does not authenticate the runtime, buffer history, recorder mutations, sender wiring, or process scope.",
												"properties": {
													"kind": {
														"const": "caller_declaration",
														"description": "This detached JSON is an attributable caller claim, never a live-capture attestation."
													},
													"profile": { "const": "cortexel-nest-memory-spike-capture-authority.v3" },
													"runtimeStatus": {
														"type": "object",
														"properties": {
															"nestVersion": { "const": "3.10.0" },
															"timeBuildProfile": { "const": "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1" },
															"statusReadMethod": { "const": "pynest_single_spike_recorder_get_status_plain_projection_v1" },
															"executionScope": {
																"type": "object",
																"properties": {
																	"kind": { "const": "single_process" },
																	"numProcesses": { "const": 1 },
																	"rank": { "const": 0 },
																	"localNumThreads": {
																		"type": "integer",
																		"minimum": 1,
																		"maximum": 1e6
																	}
																},
																"required": [
																	"kind",
																	"numProcesses",
																	"rank",
																	"localNumThreads"
																],
																"additionalProperties": false
															},
															"resolutionMs": {
																"type": "number",
																"exclusiveMinimum": 0
															},
															"ticsPerMs": {
																"type": "string",
																"pattern": "^[1-9][0-9]*$",
																"maxLength": 16
															},
															"resolutionTics": {
																"type": "string",
																"pattern": "^[1-9][0-9]*$",
																"maxLength": 16
															},
															"captureBiologicalTimeTics": {
																"type": "string",
																"pattern": "^(?:0|[1-9][0-9]*)$",
																"maxLength": 16
															},
															"captureBoundary": { "const": "after_successful_simulate_or_run_return" }
														},
														"required": [
															"nestVersion",
															"timeBuildProfile",
															"statusReadMethod",
															"executionScope",
															"resolutionMs",
															"ticsPerMs",
															"resolutionTics",
															"captureBiologicalTimeTics",
															"captureBoundary"
														],
														"additionalProperties": false
													},
													"recordingGrid": {
														"type": "object",
														"description": "Exact NEST integer-tic preimages of the serialized origin/start/stop millisecond fields. These preserve grid authority that binary64 millisecond values alone cannot establish.",
														"properties": {
															"originTics": {
																"type": "string",
																"pattern": "^(?:0|[1-9][0-9]*)$",
																"maxLength": 16
															},
															"startTics": {
																"type": "string",
																"pattern": "^(?:0|[1-9][0-9]*)$",
																"maxLength": 16
															},
															"stopTics": {
																"type": "string",
																"pattern": "^(?:0|[1-9][0-9]*)$",
																"maxLength": 16
															}
														},
														"required": [
															"originTics",
															"startTics",
															"stopTics"
														],
														"additionalProperties": false
													},
													"bufferEpoch": {
														"type": "object",
														"description": "The most recent creation or n_events=0 clear of this recorder's memory buffer.",
														"properties": {
															"beganBy": {
																"type": "string",
																"enum": ["recorder_creation", "n_events_zero"]
															},
															"beganAtBiologicalTimeTics": {
																"type": "string",
																"pattern": "^(?:0|[1-9][0-9]*)$",
																"maxLength": 16
															}
														},
														"required": ["beganBy", "beganAtBiologicalTimeTics"],
														"additionalProperties": false
													},
													"recordingPlan": {
														"type": "object",
														"description": "The most recent mutation of the recorder window/backend/time encoding or sender wiring.",
														"properties": {
															"lastMutationAtBiologicalTimeTics": {
																"type": "string",
																"pattern": "^(?:0|[1-9][0-9]*)$",
																"maxLength": 16
															},
															"scope": { "const": "window_backend_time_encoding_and_sender_wiring" },
															"senderUniverseBinding": { "const": "recorded_sender_ids_exactly_equal_full_window_connected_source_universe" }
														},
														"required": [
															"lastMutationAtBiologicalTimeTics",
															"scope",
															"senderUniverseBinding"
														],
														"additionalProperties": false
													},
													"clockEpochContinuity": {
														"const": "biological_time_monotonic_since_last_kernel_initialization",
														"description": "Caller declaration that biological_time remained monotonic from the most recent process initialization or ResetKernel through capture. SetKernelStatus({biological_time: 0}) can preserve a recorder and its old memory while restarting the clock; NEST 3.10.0 marks that operation incompletely supported, so clearing n_events afterward does not restore this certified profile."
													},
													"eventCompleteness": { "const": "complete_for_recorded_senders" },
													"adapterInputDigest": {
														"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256",
														"description": "Domain-separated digest over the detached plain-data status projection and every normalized adapter option. This is content identity, not source authentication or projection attestation."
													}
												},
												"required": [
													"kind",
													"profile",
													"runtimeStatus",
													"recordingGrid",
													"bufferEpoch",
													"recordingPlan",
													"clockEpochContinuity",
													"eventCompleteness",
													"adapterInputDigest"
												],
												"additionalProperties": false
											}
										},
										"required": [
											"kind",
											"origin",
											"start",
											"stop",
											"unit",
											"boundary",
											"recordingBackend",
											"timeEncoding",
											"captureAuthority"
										],
										"additionalProperties": false
									},
									"else": {
										"if": {
											"type": "object",
											"properties": { "kind": { "const": "nest_recording_device_positive_infinity_capture_bounded" } },
											"required": ["kind"]
										},
										"then": {
											"type": "object",
											"description": "A finite observation window cut from a NEST memory spike recorder whose configured device stop was NEST positive infinity. The upper endpoint is the successful-return biological capture time. It is not a recorder deactivation time.",
											"properties": {
												"kind": { "const": "nest_recording_device_positive_infinity_capture_bounded" },
												"origin": {
													"type": "number",
													"minimum": 0
												},
												"start": {
													"type": "number",
													"minimum": 0
												},
												"captureTime": {
													"type": "number",
													"minimum": 0,
													"description": "Finite absolute NEST biological time in milliseconds at the successful Simulate or Run return where the memory status was read. Its exact integer-tic preimage is captureAuthority.runtimeStatus.captureBiologicalTimeTics."
												},
												"unit": { "const": "ms" },
												"boundary": { "const": "(origin+start,capture]" },
												"recordingBackend": { "const": "memory" },
												"timeEncoding": { "const": "native_binary64_ms" },
												"configuredStop": {
													"type": "object",
													"properties": {
														"kind": { "const": "nest_time_positive_infinity" },
														"exportedMs": {
															"const": 17976931348623157e292,
															"description": "Exact binary64 DBL_MAX value exposed by NEST 3.10.0 Time::get_ms() for its internal positive-infinity sentinel. This identifies the pinned projection rule; it does not authenticate the detached input."
														}
													},
													"required": ["kind", "exportedMs"],
													"additionalProperties": false,
													"description": "The source recorder retained NEST's positive-infinity stop. NEST 3.10.0 exposes that internal Time sentinel through PyNEST as DBL_MAX; the named projection replaces only that exact pinned-profile value with this closed JSON sentinel."
												},
												"captureAuthority": {
													"type": "object",
													"description": "Caller-declared authority for a finite capture of a NEST positive-infinity memory recorder. Cortexel derives and checks the finite capture endpoint from exact tics but does not authenticate the runtime, successful return, projection, history, wiring, or process scope.",
													"properties": {
														"kind": {
															"const": "caller_declaration",
															"description": "This detached JSON is an attributable caller claim, never a live-capture attestation."
														},
														"profile": { "const": "cortexel-nest-memory-spike-capture-authority.v4" },
														"runtimeStatus": {
															"type": "object",
															"properties": {
																"nestVersion": { "const": "3.10.0" },
																"timeBuildProfile": { "const": "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1" },
																"statusReadMethod": { "const": "pynest_single_spike_recorder_get_status_plain_projection_v2" },
																"executionScope": {
																	"type": "object",
																	"properties": {
																		"kind": { "const": "single_process" },
																		"numProcesses": { "const": 1 },
																		"rank": { "const": 0 },
																		"localNumThreads": {
																			"type": "integer",
																			"minimum": 1,
																			"maximum": 1e6
																		}
																	},
																	"required": [
																		"kind",
																		"numProcesses",
																		"rank",
																		"localNumThreads"
																	],
																	"additionalProperties": false
																},
																"resolutionMs": {
																	"type": "number",
																	"exclusiveMinimum": 0
																},
																"ticsPerMs": {
																	"type": "string",
																	"pattern": "^[1-9][0-9]*$",
																	"maxLength": 16
																},
																"resolutionTics": {
																	"type": "string",
																	"pattern": "^[1-9][0-9]*$",
																	"maxLength": 16
																},
																"captureBiologicalTimeTics": {
																	"type": "string",
																	"pattern": "^(?:0|[1-9][0-9]*)$",
																	"maxLength": 16
																},
																"captureBoundary": { "const": "after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation" }
															},
															"required": [
																"nestVersion",
																"timeBuildProfile",
																"statusReadMethod",
																"executionScope",
																"resolutionMs",
																"ticsPerMs",
																"resolutionTics",
																"captureBiologicalTimeTics",
																"captureBoundary"
															],
															"additionalProperties": false
														},
														"recordingGrid": {
															"type": "object",
															"description": "Exact NEST integer-tic preimages of the finite serialized origin and start values. There is deliberately no stopTics member: the configured stop is positive infinity and the finite upper endpoint is the independently declared capture biological time.",
															"properties": {
																"originTics": {
																	"type": "string",
																	"pattern": "^(?:0|[1-9][0-9]*)$",
																	"maxLength": 16
																},
																"startTics": {
																	"type": "string",
																	"pattern": "^(?:0|[1-9][0-9]*)$",
																	"maxLength": 16
																}
															},
															"required": ["originTics", "startTics"],
															"additionalProperties": false
														},
														"bufferEpoch": {
															"type": "object",
															"description": "The most recent creation or n_events=0 clear of this recorder's memory buffer.",
															"properties": {
																"beganBy": {
																	"type": "string",
																	"enum": ["recorder_creation", "n_events_zero"]
																},
																"beganAtBiologicalTimeTics": {
																	"type": "string",
																	"pattern": "^(?:0|[1-9][0-9]*)$",
																	"maxLength": 16
																}
															},
															"required": ["beganBy", "beganAtBiologicalTimeTics"],
															"additionalProperties": false
														},
														"recordingPlan": {
															"type": "object",
															"description": "The most recent mutation of the recorder window/backend/time encoding or sender wiring.",
															"properties": {
																"lastMutationAtBiologicalTimeTics": {
																	"type": "string",
																	"pattern": "^(?:0|[1-9][0-9]*)$",
																	"maxLength": 16
																},
																"scope": { "const": "window_backend_time_encoding_and_sender_wiring" },
																"senderUniverseBinding": { "const": "recorded_sender_ids_exactly_equal_full_window_connected_source_universe" }
															},
															"required": [
																"lastMutationAtBiologicalTimeTics",
																"scope",
																"senderUniverseBinding"
															],
															"additionalProperties": false
														},
														"clockEpochContinuity": {
															"const": "biological_time_monotonic_since_last_kernel_initialization",
															"description": "Caller declaration that biological_time remained monotonic from the most recent process initialization or ResetKernel through capture."
														},
														"eventCompleteness": { "const": "complete_for_recorded_senders" },
														"adapterInputDigest": {
															"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sha256",
															"description": "Domain-separated v5 digest over the detached positive-infinity plain-data projection and every normalized adapter option. This is content identity, not authentication."
														}
													},
													"required": [
														"kind",
														"profile",
														"runtimeStatus",
														"recordingGrid",
														"bufferEpoch",
														"recordingPlan",
														"clockEpochContinuity",
														"eventCompleteness",
														"adapterInputDigest"
													],
													"additionalProperties": false
												}
											},
											"required": [
												"kind",
												"origin",
												"start",
												"captureTime",
												"unit",
												"boundary",
												"recordingBackend",
												"timeEncoding",
												"configuredStop",
												"captureAuthority"
											],
											"additionalProperties": false
										},
										"else": {
											"type": "object",
											"properties": { "kind": {
												"type": "string",
												"enum": ["nest_recording_device_origin_relative", "nest_recording_device_positive_infinity_capture_bounded"]
											} },
											"required": ["kind"],
											"additionalProperties": false
										}
									}
								},
								"else": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/eventTimeWindow" }
							}]
						},
						"timeBase": {
							"type": "string",
							"enum": ["absolute_clock", "trial_relative"],
							"description": "What t = 0 means. `absolute_clock` is the source's own clock. `trial_relative` means times were re-expressed relative to a per-trial alignment event, which Cortexel cannot verify — so it must be named, and the axis is labelled with that name rather than with a bare time."
						},
						"alignmentLabel": {
							"$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/label",
							"description": "Required when timeBase is trial_relative: what the times are relative to (for example \"Stimulus onset\"). An unlabelled relative axis is indistinguishable from an absolute one and invites the reader to date a spike to a moment that never existed."
						},
						"senderUniverseComplete": {
							"type": "boolean",
							"description": "Whether recordedSenderIds is the complete recorded universe (true) or a declared selection from a larger recording (false). This is the completeness label; it is carried into the artifact, the deterministic summary, and the table metadata."
						},
						"eventCompleteness": {
							"type": "string",
							"enum": ["complete_for_recorded_senders"],
							"description": "An explicit assertion that every event of every declared sender inside the window is present. There is deliberately no `sampled` value: no disclosure rule exists that could mark a sampled raster honestly, and a raster whose ticks are a sample cannot be read — every gap becomes ambiguous between `did not fire` and `was not sampled`. This revision refuses a raster too large to draw exactly; caller-side sampling is not an accepted workaround."
						}
					},
					"required": [
						"eventTimes",
						"eventSenderIds",
						"recordedSenderIds",
						"window",
						"timeBase",
						"senderUniverseComplete",
						"eventCompleteness"
					],
					"additionalProperties": false,
					"allOf": [
						{
							"if": {
								"properties": { "timeBase": { "const": "trial_relative" } },
								"required": ["timeBase"]
							},
							"then": { "required": [
								"alignmentLabel",
								"eventTrialIds",
								"trialIds"
							] }
						},
						{
							"if": { "required": ["trialIds"] },
							"then": { "required": ["eventTrialIds"] }
						},
						{
							"if": {
								"properties": { "window": {
									"properties": { "kind": { "const": "nest_recording_device_origin_relative" } },
									"required": ["kind"]
								} },
								"required": ["window"]
							},
							"then": {
								"properties": { "timeBase": { "const": "absolute_clock" } },
								"required": ["timeBase"]
							}
						}
					]
				},
				"parameters": {
					"type": "object",
					"properties": {
						"rowOrder": {
							"type": "string",
							"enum": [
								"as_declared",
								"canonical_sender_id",
								"grouped_by_population"
							],
							"description": "The Y order, and it is always explicit. There is no option to sort by an observed statistic: sorting rows by rate or first-spike latency draws a diagonal band that reads as population structure and is an artifact of the sort. To use such an order, place it in recordedSenderIds with `as_declared`, where it is recorded as your choice. `grouped_by_population` with no declared populations degenerates to a single block and is recorded as such."
						},
						"markStyle": {
							"type": "string",
							"enum": ["tick", "point"],
							"default": "tick",
							"description": "How each event is drawn below the mark budget. This changes only the glyph; it never changes a time, a count, or which events are drawn."
						},
						"outOfWindowPolicy": {
							"type": "string",
							"enum": ["reject", "exclude_and_disclose"],
							"description": "What to do with an event outside the declared window. `reject` fails the request. `exclude_and_disclose` excludes it from the drawing, counts it, discloses the count, and keeps it in the table with inWindow = false. There is no third option in which it disappears."
						},
						"aboveMarkBudget": {
							"type": "string",
							"enum": ["refuse"],
							"description": "This revision fails with RESOURCE_MARKS_EXCEEDED when the event count exceeds the visible-mark budget. No compaction implementation or digest-bound complete-table sidecar is shipped, so an aggregation choice would be a false capability claim."
						}
					},
					"required": [
						"rowOrder",
						"outOfWindowPolicy",
						"aboveMarkBudget"
					],
					"additionalProperties": false
				},
				"source": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/sourceDeclaration" },
				"presentation": { "$ref": "https://sepahead.github.io/cortexel/schemas/v1/common.v1.schema.json#/$defs/presentation" }
			},
			"required": [
				"contract",
				"skill",
				"data",
				"parameters",
				"source"
			],
			"additionalProperties": false
		},
		"authoringExample": {
			"contract": {
				"name": "cortexel-figure-request",
				"version": "1.0"
			},
			"skill": { "id": "neuro.spike_raster" },
			"data": {
				"eventTimes": {
					"kind": "time",
					"unit": "ms",
					"values": [
						12,
						48.5,
						12,
						95
					]
				},
				"eventSenderIds": [
					"7",
					"7",
					"7",
					"7"
				],
				"eventTrialIds": [
					"t1",
					"t1",
					"t2",
					"t3"
				],
				"eventIds": [
					"ev-1",
					"ev-2",
					"ev-3",
					"ev-4"
				],
				"recordedSenderIds": ["7"],
				"trialIds": [
					"t1",
					"t2",
					"t3",
					"t4"
				],
				"window": {
					"start": 0,
					"stop": 100,
					"unit": "ms",
					"boundary": "[start,stop)"
				},
				"timeBase": "trial_relative",
				"alignmentLabel": "Stimulus onset",
				"senderUniverseComplete": false,
				"eventCompleteness": "complete_for_recorded_senders"
			},
			"parameters": {
				"rowOrder": "as_declared",
				"markStyle": "point",
				"outOfWindowPolicy": "exclude_and_disclose",
				"aboveMarkBudget": "refuse"
			},
			"source": { "kind": "synthetic_fixture" }
		}
	}
});

//#endregion
//#region src/adapters/source-catalog.ts
/**
* Closed discovery authority for executable source adapters.
*
* Skill contracts describe many candidate source mappings. Most are deliberately
* `not_implemented`; that prose is not an executable registry. This module exposes only
* adapters that the installed package can actually invoke. Its digest lets an agent bind
* a cached discovery response to the exact descriptor bytes it used.
*/
const SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN = "cortexel-source-adapter-discovery-catalog.rfc8785-sha256.v2";
const SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN = "cortexel-source-adapter-descriptor.rfc8785-sha256.v1";
const SOURCE_ADAPTER_IDS = Object.freeze(["nest-spike-recorder"]);
const SOURCE_ADAPTER_ID_SET = new Set(SOURCE_ADAPTER_IDS);
function isSourceAdapterId(value) {
	return typeof value === "string" && SOURCE_ADAPTER_ID_SET.has(value);
}
const NEST_SPIKE_RECORDER_POSITIVE_INFINITY_V5_EXAMPLE = {
	exportedStatus: {
		record_to: "memory",
		time_in_steps: false,
		origin: 0,
		start: 0,
		stop: { kind: "nest_time_positive_infinity" },
		n_events: 3,
		events: {
			senders: [
				2,
				1,
				2
			],
			times: [
				9.9,
				1,
				1
			]
		}
	},
	options: {
		recordedSenderIds: [
			1,
			2,
			3
		],
		nestVersion: "3.10.0",
		captureAuthority: {
			kind: "replace_with_caller_declaration_from_actual_capture",
			profile: "cortexel-nest-memory-spike-capture-authority.v4",
			runtimeStatus: {
				nestVersion: "3.10.0",
				timeBuildProfile: "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1",
				statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v2",
				executionScope: {
					kind: "single_process",
					numProcesses: 1,
					rank: 0,
					localNumThreads: 1
				},
				resolutionMs: .1,
				ticsPerMs: "1000",
				resolutionTics: "100",
				captureBiologicalTimeTics: "10000",
				captureBoundary: "after_successful_advancing_simulate_or_run_return_at_exact_capture_biological_time_before_any_further_advance_or_mutation"
			},
			recordingGrid: {
				originTics: "0",
				startTics: "0"
			},
			bufferEpoch: {
				beganBy: "recorder_creation",
				beganAtBiologicalTimeTics: "0"
			},
			recordingPlan: {
				lastMutationAtBiologicalTimeTics: "0",
				scope: "window_backend_time_encoding_and_sender_wiring",
				senderUniverseBinding: "recorded_sender_ids_exactly_equal_full_window_connected_source_universe"
			},
			clockEpochContinuity: "biological_time_monotonic_since_last_kernel_initialization",
			eventCompleteness: "complete_for_recorded_senders"
		},
		runId: "run-1",
		recorderId: "spike-recorder-1"
	}
};
const NEST_SPIKE_RECORDER_FINITE_STOP_V5_EXAMPLE = {
	exportedStatus: {
		record_to: "memory",
		time_in_steps: false,
		origin: 0,
		start: 0,
		stop: 10,
		n_events: 3,
		events: {
			senders: [
				2,
				1,
				2
			],
			times: [
				9.9,
				1,
				1
			]
		}
	},
	options: {
		recordedSenderIds: [
			1,
			2,
			3
		],
		nestVersion: "3.10.0",
		captureAuthority: {
			kind: "replace_with_caller_declaration_from_actual_capture",
			profile: "cortexel-nest-memory-spike-capture-authority.v3",
			runtimeStatus: {
				nestVersion: "3.10.0",
				timeBuildProfile: "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1",
				statusReadMethod: "pynest_single_spike_recorder_get_status_plain_projection_v1",
				executionScope: {
					kind: "single_process",
					numProcesses: 1,
					rank: 0,
					localNumThreads: 1
				},
				resolutionMs: .1,
				ticsPerMs: "1000",
				resolutionTics: "100",
				captureBiologicalTimeTics: "10000",
				captureBoundary: "after_successful_simulate_or_run_return"
			},
			recordingGrid: {
				originTics: "0",
				startTics: "0",
				stopTics: "10000"
			},
			bufferEpoch: {
				beganBy: "recorder_creation",
				beganAtBiologicalTimeTics: "0"
			},
			recordingPlan: {
				lastMutationAtBiologicalTimeTics: "0",
				scope: "window_backend_time_encoding_and_sender_wiring",
				senderUniverseBinding: "recorded_sender_ids_exactly_equal_full_window_connected_source_universe"
			},
			clockEpochContinuity: "biological_time_monotonic_since_last_kernel_initialization",
			eventCompleteness: "complete_for_recorded_senders"
		},
		runId: "run-1",
		recorderId: "spike-recorder-1"
	}
};
const NEST_SPIKE_RECORDER_POSITIVE_INFINITY_V5_EXAMPLE_ENVELOPE = makeSourceAdapterExampleEnvelope("nest-spike-recorder", 5, NEST_SPIKE_RECORDER_POSITIVE_INFINITY_V5_EXAMPLE);
const NEST_SPIKE_RECORDER_FINITE_STOP_V5_EXAMPLE_ENVELOPE = makeSourceAdapterExampleEnvelope("nest-spike-recorder", 5, NEST_SPIKE_RECORDER_FINITE_STOP_V5_EXAMPLE);
const SOURCE_ADAPTER_CATALOG_DATA = {
	protocol: "cortexel-source-adapter-catalog",
	protocolVersion: 1,
	adapters: { "nest-spike-recorder": {
		id: "nest-spike-recorder",
		revision: 5,
		title: "NEST 3.10.0 memory spike recorder to stable spike raster",
		sourceSystem: "NEST Simulator",
		admittedSourceVersions: ["3.10.0"],
		outputSkillId: "neuro.spike_raster",
		implementation: {
			packageSubpath: "cortexel/adapters/nest",
			exportName: "nestSpikeRecorderToRaster",
			profile: NEST_SPIKE_RECORDER_ADAPTER_PROFILE_V5
		},
		cli: {
			command: "cortexel source adapt nest-spike-recorder <input|->",
			exampleCommand: "cortexel source example nest-spike-recorder > capture.template.json",
			renderCommand: "cortexel source render nest-spike-recorder <input|-> --output figure.svg --format json",
			inputMediaType: "application/json",
			outputMediaType: "application/json",
			pipeExample: "cortexel source adapt nest-spike-recorder capture.json | cortexel render - --output figure.svg --format json",
			directRenderExample: "cortexel source render nest-spike-recorder capture.json --output figure.svg --format json"
		},
		inputEnvelope: {
			type: "object",
			requiredMembers: ["exportedStatus", "options"],
			additionalMembers: false,
			exportedStatus: "Exact detached plain-data projection of one NEST spike-recorder status.",
			options: "Complete recorded sender universe plus the caller-retained capture authority."
		},
		acceptanceBoundary: {
			example: "The shipped example is a known synthetic, versioned, template-only envelope. Both the outer envelope and its unchanged guarded input are deliberately non-executable; the caller must replace every value with a caller-owned capture before explicitly removing the guard and submitting only inputTemplate.",
			adapter: "The adapter checks one exact revision-5 source-faithful clock profile with closed finite-stop and positive-infinity/capture-bounded branches, then authors the corresponding request.",
			request: "The CLI then runs the complete stable FigureRequest validation pipeline before emitting JSON.",
			rendering: "`cortexel source render` applies the adapter, stable request gate, raw canonical-request boundary, derivation, render, and output-publication path in one process and is the recommended agent path. On success, the composable `source adapt | render` form produces the same canonical request, artifact, and SVG bytes. Ordinary shell pipelines can mask an upstream adapter failure unless the caller explicitly checks every pipeline status. Adapter success alone is never render authority."
		},
		authority: [
			"The source digest binds the detached JSON-compatible status projection, not a live simulator process.",
			"The adapter-input digest additionally binds the normalized options and caller-declared capture authority.",
			"Revision 5 binds the exact LP64/int64/IEEE-binary64 time-build profile and reproduces NEST 3.10.0 Time::get_ms as rounded reciprocal followed by rounded multiplication.",
			"The exact positive-infinity projection token maps to a finite window ending at the declared successful-return capture time; it never relabels that time as recorder deactivation.",
			"The emitted configuredStop records the pinned NEST 3.10.0 profile constant exportedMs=DBL_MAX; the typed input sentinel asserts that projection revision 2 recognized that value, but this version-bound interpretation remains unauthenticated.",
			"Projection v2 with capture-authority profile v4 requires the caller to declare that the last advancing Simulate or Run ended exactly at captureTime and that status was projected before any further advance or mutation.",
			"Finite-stop and positive-infinity requests use capture-authority v3/v4 respectively and one domain-separated revision-5 input digest; historical v1/v2 authority fails with an explicit migration error.",
			"The complete sender universe, recorder history, wiring history, process scope, run id, and recorder id remain caller declarations.",
			"Events retain source order and multiplicity; the scientific view owns any scoped sorting or aggregation."
		],
		limitations: [
			"Only record_to=memory and time_in_steps=false are admitted.",
			"Only the exact declared NEST 3.10.0 LP64/int64/IEEE-binary64 time-build profile and conservative safe-integer clock subset are admitted.",
			"Only a single-process capture scope is admitted.",
			"Positive-infinity status must pass through projection revision 2, which emits the exact typed sentinel; raw DBL_MAX is rejected.",
			"The package does not import PyNEST, inspect a live simulation, or authenticate caller declarations.",
			"ASCII, screen, MPI, SIONlib, step-plus-offset clocks, non-LP64 builds, clocks outside the safe source-round-trippable subset, and every other stable NEST mapping remain unsupported by this adapter revision.",
			"Real-NEST conformance gate R049 remains external release evidence; packaged code is not certification.",
			"Removing the synthetic-example guard is only an explicit caller acknowledgement; Cortexel cannot verify that the caller actually replaced every fixture value."
		],
		examples: {
			positiveInfinity: NEST_SPIKE_RECORDER_POSITIVE_INFINITY_V5_EXAMPLE_ENVELOPE,
			finiteStop: NEST_SPIKE_RECORDER_FINITE_STOP_V5_EXAMPLE_ENVELOPE
		},
		/** Prompt-budget default: a synthetic, guarded template—not executable evidence. */
		example: NEST_SPIKE_RECORDER_POSITIVE_INFINITY_V5_EXAMPLE_ENVELOPE
	} }
};
const SOURCE_ADAPTER_CATALOG = freezeGenerated(SOURCE_ADAPTER_CATALOG_DATA);
function lookupSourceAdapter(value) {
	if (!isSourceAdapterId(value)) return void 0;
	return SOURCE_ADAPTER_CATALOG.adapters[value];
}
/** Digests bind the complete descriptor returned by `source describe`. */
const SOURCE_ADAPTER_DESCRIPTOR_DIGESTS = freezeGenerated({ "nest-spike-recorder": canonicalDigest({
	domain: SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN,
	descriptor: SOURCE_ADAPTER_CATALOG.adapters["nest-spike-recorder"]
}) });
function lookupSourceAdapterDescriptorDigest(value) {
	return isSourceAdapterId(value) ? SOURCE_ADAPTER_DESCRIPTOR_DIGESTS[value] : void 0;
}
/**
* Compact executable discovery records. Each record binds its complete descriptor,
* so catalog consumers need not download every example and authority paragraph merely
* to discover an adapter, while `source describe` remains independently verifiable.
*/
const SOURCE_ADAPTER_DISCOVERY_CATALOG = freezeGenerated({
	protocol: "cortexel-source-adapter-discovery-catalog",
	protocolVersion: 1,
	adapters: SOURCE_ADAPTER_IDS.map((id) => {
		const descriptor = SOURCE_ADAPTER_CATALOG.adapters[id];
		return {
			id: descriptor.id,
			revision: descriptor.revision,
			title: descriptor.title,
			sourceSystem: descriptor.sourceSystem,
			admittedSourceVersions: descriptor.admittedSourceVersions,
			outputSkillId: descriptor.outputSkillId,
			command: descriptor.cli.command,
			renderCommand: descriptor.cli.renderCommand,
			descriptorDigest: SOURCE_ADAPTER_DESCRIPTOR_DIGESTS[id]
		};
	})
});
/** Exact, emitted digest preimage; no hidden package bytes are needed to reproduce it. */
const SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE = freezeGenerated({
	domain: SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN,
	catalog: SOURCE_ADAPTER_DISCOVERY_CATALOG
});
const SOURCE_ADAPTER_CATALOG_DIGEST = canonicalDigest(SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE);

//#endregion
export { SOURCE_ADAPTER_DESCRIPTOR_DIGESTS as a, SOURCE_ADAPTER_IDS as c, lookupSourceAdapterDescriptorDigest as d, AUTHORING_SCHEMA_COMPILATION_PROFILE_V1 as f, SOURCE_ADAPTER_CATALOG_DIGEST_PREIMAGE as i, isSourceAdapterId as l, STABLE_CATALOG_SCHEMA_RESOURCES as m, SOURCE_ADAPTER_CATALOG_DIGEST as n, SOURCE_ADAPTER_DESCRIPTOR_DIGEST_DOMAIN as o, SKILL_AUTHORING as p, SOURCE_ADAPTER_CATALOG_DIGEST_DOMAIN as r, SOURCE_ADAPTER_DISCOVERY_CATALOG as s, SOURCE_ADAPTER_CATALOG as t, lookupSourceAdapter as u };
//# sourceMappingURL=source-catalog-DZZvX0SR.js.map