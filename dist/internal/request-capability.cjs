Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
const require_canonicalize = require('../canonicalize-CM-RPRQS.cjs');
const require_exact_binary64 = require('../exact-binary64-B9QJo1AS.cjs');
const require_deep_freeze = require('../deep-freeze-CX4sIEIO.cjs');
const require_errors = require('../errors-DaUwoa4p.cjs');
const require_identity = require('../identity-DvvM9pyL.cjs');
const require_catalog = require('../catalog-B4eoXq8w.cjs');
const require_registry = require('../registry-CCvLcMCj.cjs');
const require_provenance = require('../provenance-jOGKOHvC.cjs');
const require_response_curve_basis = require('../response-curve-basis-BoFkbgrp.cjs');
const require_contract_identity = require('../contract-identity-BMEyNZJi.cjs');
const require_nest_time = require('../nest-time-CaEztfRm.cjs');
const require_structural_validator = require('../structural-validator-C5wX5pu1.cjs');

//#region src/core/semantics/types.ts
/** Read a value at a JSON Pointer. Returns undefined rather than throwing. */
function readPointer(root, jsonPointer) {
	if (jsonPointer === "") return root;
	if (!jsonPointer.startsWith("/")) return void 0;
	let node = root;
	for (const rawToken of jsonPointer.slice(1).split("/")) {
		const token = rawToken.replace(/~1/g, "/").replace(/~0/g, "~");
		if (node === null || typeof node !== "object") return void 0;
		if (Array.isArray(node)) {
			const index = Number(token);
			if (!Number.isInteger(index) || index < 0 || index >= node.length) return void 0;
			node = node[index];
		} else {
			if (!Object.prototype.hasOwnProperty.call(node, token)) return void 0;
			node = node[token];
		}
	}
	return node;
}
function asRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function asArray(value) {
	return Array.isArray(value) ? value : void 0;
}
function asNumber(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function asString(value) {
	return typeof value === "string" ? value : void 0;
}
/** Convenience: `request.data` as a record. */
function getData(context) {
	return asRecord(context.request.data) ?? {};
}
/** Convenience: `request.parameters` as a record. */
function getParameters(context) {
	return asRecord(context.request.parameters) ?? {};
}
/**
* The tolerance for comparing a supplied normalized value against a re-derived one.
*
* Relative, with an absolute floor so that a value near zero does not demand
* impossible precision. This is deliberately TIGHT — it exists to absorb binary64
* rounding in a handful of operations, not to wave through a value that is merely
* in the right neighbourhood. A rate that is 1% off is not a rounding error; it is
* a different rate.
*/
const NUMERIC_TOLERANCE = Object.freeze({
	relative: 1e-9,
	absolute: 1e-12
});

//#endregion
//#region src/core/semantics/units.ts
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
/**
* Closed property-name vocabulary for scalar unit-code claims.
*
* Most contract records use the ordinary `unit` member. Two stable request fields are
* deliberately scalar because they qualify a neighbouring numeric array or select an
* output axis. Keeping those exceptions here is safer than treating every string whose
* name happens to end in "Unit" as physical metadata. A source-schema closure test pins
* this tuple to every direct `$defs/unitCode` property in the common and skill schemas.
*/
const UNIT_CODE_PROPERTY_NAMES = Object.freeze([
	"alignmentUnit",
	"unit",
	"valueUnit"
]);
/**
* Find every object that looks like a quantity — has both a `kind` and a `unit` —
* anywhere in the request, and report its path.
*
* Structural rather than a fixed list of pointers, so a new field in a skill
* contract is covered the moment it exists rather than the moment someone
* remembers to add it here.
*/
function collectQuantities(node, path, out) {
	if (node === null || typeof node !== "object") return;
	const pending = [{
		node,
		path
	}];
	while (pending.length > 0) {
		const current = pending.pop();
		if (Array.isArray(current.node)) {
			for (let i = current.node.length - 1; i >= 0; i--) {
				const child = current.node[i];
				if (child !== null && typeof child === "object") pending.push({
					node: child,
					path: [...current.path, i]
				});
			}
			continue;
		}
		const record = current.node;
		const kind = asString(record.kind);
		const unit = asString(record.unit);
		if (kind !== void 0 && unit !== void 0 && require_response_curve_basis.isQuantityKind(kind)) out.push({
			kind,
			unit,
			path: current.path
		});
		const keys = Object.keys(record);
		for (let i = keys.length - 1; i >= 0; i--) {
			const key = keys[i];
			const child = record[key];
			if (child !== null && typeof child === "object") pending.push({
				node: child,
				path: [...current.path, key]
			});
		}
	}
}
/** Bare unit fields that carry no `kind` — a window, a bin spec, an uncertainty. */
function collectBareUnits(node, path, out) {
	if (node === null || typeof node !== "object") return;
	const pending = [{
		node,
		path
	}];
	while (pending.length > 0) {
		const current = pending.pop();
		if (Array.isArray(current.node)) {
			for (let i = current.node.length - 1; i >= 0; i--) {
				const child = current.node[i];
				if (child !== null && typeof child === "object") pending.push({
					node: child,
					path: [...current.path, i]
				});
			}
			continue;
		}
		const record = current.node;
		const kind = asString(record.kind);
		for (const property of UNIT_CODE_PROPERTY_NAMES) {
			const unit = asString(record[property]);
			if (unit === void 0) continue;
			if (property === "unit" && kind !== void 0 && require_response_curve_basis.isQuantityKind(kind)) continue;
			out.push({
				unit,
				path: [...current.path, property]
			});
		}
		const keys = Object.keys(record);
		for (let i = keys.length - 1; i >= 0; i--) {
			const key = keys[i];
			const child = record[key];
			if (child !== null && typeof child === "object") pending.push({
				node: child,
				path: [...current.path, key]
			});
		}
	}
}
/**
* Return a registered unit only when a neighbouring registered quantity kind owns
* it legally. The ordinary quantity walk reports an illegal kind/unit pair; a
* relational check must not pile a second, derivative diagnostic on top of it.
*/
function legalKnownUnit(node) {
	const unit = asString(node?.unit);
	if (unit === void 0 || !require_response_curve_basis.isKnownUnit(unit)) return void 0;
	const kind = asString(node?.kind);
	if (kind !== void 0 && require_response_curve_basis.isQuantityKind(kind)) {
		const dimension = require_response_curve_basis.dimensionOf(unit);
		if (dimension === void 0 || !require_response_curve_basis.kindAcceptsDimension(kind, dimension)) return void 0;
	}
	return unit;
}
/**
* Whether a source quantity can be represented in a bound display/axis unit.
* Simulator-defined codes have no conversion relation, even to another code in the
* same registry dimension; exact code identity is the only no-conversion case.
*/
function unitsCanShareBoundAxis(sourceUnit, targetUnit) {
	const sourceDimension = require_response_curve_basis.dimensionOf(sourceUnit);
	const targetDimension = require_response_curve_basis.dimensionOf(targetUnit);
	if (sourceDimension === void 0 || targetDimension === void 0) return false;
	if (sourceDimension === "simulator_defined" || targetDimension === "simulator_defined") return sourceUnit === targetUnit;
	return sourceDimension === targetDimension;
}
function contextualMismatch(path, message) {
	return require_errors.makeError({
		code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
		stage: "science",
		instancePath: require_errors.pointer(...path),
		validatorId: "unit.dimension_match",
		message
	});
}
function requireTimeUnit(node, path, meaning) {
	const unit = asString(node?.unit);
	if (unit === void 0 || !require_response_curve_basis.isKnownUnit(unit) || require_response_curve_basis.dimensionOf(unit) === "time") return [];
	return [contextualMismatch([...path, "unit"], `${meaning} is a time interval and cannot carry unit "${unit}" (dimension ${String(require_response_curve_basis.dimensionOf(unit))}). Use a canonical time unit.`)];
}
const UNOWNED_TIME_BIN_SKILLS = Object.freeze(["network.delay_distribution", "neuro.isi_distribution"]);
/**
* Three stable bare time axes have no more-specific scientific validator. Other
* windows, bin specs, lag ranges, and PSTH alignment fields are deliberately owned
* by their skill validators; checking them here as well would emit two diagnostics
* for one defect and make the repair boundary ambiguous.
*/
function timeAxisContextualUnits(context) {
	const data = asRecord(context.request.data) ?? {};
	const parameters = asRecord(context.request.parameters) ?? {};
	const errors = [];
	if (UNOWNED_TIME_BIN_SKILLS.includes(context.skillId)) errors.push(...requireTimeUnit(asRecord(parameters.bins), ["parameters", "bins"], "bin axis"));
	if (context.skillId === "neuro.population_rate") errors.push(...requireTimeUnit(asRecord(data.binEdges), ["data", "binEdges"], "pre-binned axis"));
	return errors;
}
/** Contextual claims in the weight-trace schema that do not have their own kind. */
function weightTraceContextualUnits(context) {
	if (context.skillId !== "network.synaptic_weight_trace") return [];
	const data = asRecord(context.request.data) ?? {};
	const errors = [];
	const series = asArray(data.series) ?? [];
	for (let index = 0; index < series.length; index++) {
		const entry = asRecord(series[index]);
		if (!entry) continue;
		errors.push(...requireTimeUnit(asRecord(entry.recordedInterval), [
			"data",
			"series",
			index,
			"recordedInterval"
		], `series ${index}'s recordedInterval`));
		const valueUnit = legalKnownUnit(asRecord(entry.values));
		if (valueUnit === void 0) continue;
		const references = [
			{
				node: asRecord(asRecord(entry.initialWeight)?.quantity),
				path: [
					"data",
					"series",
					index,
					"initialWeight",
					"quantity"
				],
				label: "initial weight"
			},
			{
				node: asRecord(asRecord(entry.bounds)?.lower),
				path: [
					"data",
					"series",
					index,
					"bounds",
					"lower"
				],
				label: "lower bound"
			},
			{
				node: asRecord(asRecord(entry.bounds)?.upper),
				path: [
					"data",
					"series",
					index,
					"bounds",
					"upper"
				],
				label: "upper bound"
			}
		];
		for (const reference of references) {
			const unit = legalKnownUnit(reference.node);
			if (unit === void 0 || unitsCanShareBoundAxis(unit, valueUnit)) continue;
			errors.push(contextualMismatch([...reference.path, "unit"], `series ${index}'s ${reference.label} is in "${unit}" but its observed weights are in "${valueUnit}". A reference line must be convertible onto the weight axis; simulator-defined weights require exact code identity.`));
		}
	}
	errors.push(...requireTimeUnit(asRecord(data.membership), ["data", "membership"], "aggregate membership"));
	return errors;
}
/** A pre-binned weight axis is still a synaptic-weight quantity despite lacking `kind`. */
function weightDistributionContextualUnits(context) {
	if (context.skillId !== "network.weight_distribution") return [];
	const data = asRecord(context.request.data) ?? {};
	if (data.mode === "prebinned") {
		const binEdges = asRecord(data.binEdges);
		const unit = asString(binEdges?.unit);
		if (unit === void 0 || !require_response_curve_basis.isKnownUnit(unit)) return [];
		const dimension = require_response_curve_basis.dimensionOf(unit);
		if (dimension !== void 0 && require_response_curve_basis.kindAcceptsDimension("synaptic_weight", dimension)) return [];
		return [contextualMismatch([
			"data",
			"binEdges",
			"unit"
		], `pre-binned weight edges are a synaptic-weight axis, but "${unit}" has dimension ${String(dimension)}. Synaptic weights accept only the registry dimensions declared for kind "synaptic_weight".`)];
	}
	if (data.mode === "connections") {
		const parameters = asRecord(context.request.parameters) ?? {};
		const binUnit = asString(asRecord(parameters.bins)?.unit);
		const weightUnit = legalKnownUnit(asRecord(asRecord(data.connections)?.weights));
		if (binUnit === void 0 || !require_response_curve_basis.isKnownUnit(binUnit) || weightUnit === void 0 || unitsCanShareBoundAxis(binUnit, weightUnit)) return [];
		return [contextualMismatch([
			"parameters",
			"bins",
			"unit"
		], `connection-weight bins are in "${binUnit}" but the observed weights are in "${weightUnit}". Bin edges must be convertible onto the observed weight axis; simulator-defined weights require exact code identity.`)];
	}
	return [];
}
/** Bind every multisignal panel unit to the series the caller assigned to it. */
function multisignalPanelContextualUnits(context) {
	if (context.skillId !== "neuro.multisignal_trace") return [];
	const data = asRecord(context.request.data) ?? {};
	const parameters = asRecord(context.request.parameters) ?? {};
	const series = asArray(data.series) ?? [];
	const panels = asArray(parameters.panels) ?? [];
	const normalized = parameters.layout === "normalized_overlay";
	const errors = [];
	for (let panelIndex = 0; panelIndex < panels.length; panelIndex++) {
		const panel = asRecord(panels[panelIndex]);
		const panelId = asString(panel?.panelId);
		const panelUnit = legalKnownUnit(panel);
		if (panelId === void 0 || panelUnit === void 0) continue;
		const members = series.flatMap((candidate, seriesIndex) => {
			const entry = asRecord(candidate);
			if (asString(entry?.panelId) !== panelId) return [];
			const unit = legalKnownUnit(asRecord(entry?.values));
			return unit === void 0 ? [] : [{
				seriesIndex,
				unit
			}];
		});
		if (normalized) {
			for (const member of members) {
				if (require_response_curve_basis.dimensionOf(member.unit) !== "simulator_defined") continue;
				errors.push(contextualMismatch([
					"data",
					"series",
					member.seriesIndex,
					"values",
					"unit"
				], `series ${member.seriesIndex} uses simulator-defined unit "${member.unit}", which has no portable affine normalization. A normalized overlay may compare independently normalized physical quantities, never an opaque model-defined scale.`));
			}
			continue;
		}
		if (members.filter((member) => require_response_curve_basis.dimensionOf(member.unit) === "simulator_defined").length > 0 && members.length !== 1) {
			errors.push(contextualMismatch([
				"parameters",
				"panels",
				panelIndex,
				"unit"
			], `panel "${panelId}" contains a simulator-defined quantity and ${members.length} total series. An opaque model-defined unit must occupy a panel alone because its code establishes no cross-series comparability.`));
			continue;
		}
		for (const member of members) {
			if (unitsCanShareBoundAxis(member.unit, panelUnit)) continue;
			errors.push(contextualMismatch([
				"parameters",
				"panels",
				panelIndex,
				"unit"
			], `panel "${panelId}" displays unit "${panelUnit}" but series ${member.seriesIndex} is in "${member.unit}". A panel may change scale within one registered dimension, never physical meaning.`));
			break;
		}
	}
	return errors;
}
/** Bind every phase-plane state-space carrier to its declared x or y axis. */
function phasePlaneContextualUnits(context) {
	if (context.skillId !== "neuro.phase_plane") return [];
	const data = asRecord(context.request.data) ?? {};
	const axes = asRecord(data.axes) ?? {};
	const trajectories = asRecord(data.trajectories);
	const vectorField = asRecord(data.vectorField);
	const fieldDomain = asRecord(vectorField?.domain);
	const nullclines = asRecord(data.nullclines);
	const fixedPoints = asRecord(data.fixedPoints);
	const errors = [];
	for (const coordinate of ["x", "y"]) {
		const axisUnit = legalKnownUnit(asRecord(axes[coordinate]));
		if (axisUnit === void 0) continue;
		const carriers = [
			{
				node: asRecord(trajectories?.[coordinate]),
				path: [
					"data",
					"trajectories",
					coordinate
				],
				label: "trajectory coordinates"
			},
			{
				node: asRecord(vectorField?.[coordinate]),
				path: [
					"data",
					"vectorField",
					coordinate
				],
				label: "vector-field coordinates"
			},
			{
				node: asRecord(fieldDomain?.[coordinate]),
				path: [
					"data",
					"vectorField",
					"domain",
					coordinate
				],
				label: "vector-field domain"
			},
			{
				node: asRecord(nullclines?.[coordinate]),
				path: [
					"data",
					"nullclines",
					coordinate
				],
				label: "nullcline coordinates"
			},
			{
				node: asRecord(fixedPoints?.[coordinate]),
				path: [
					"data",
					"fixedPoints",
					coordinate
				],
				label: "fixed-point coordinates"
			}
		];
		for (const carrier of carriers) {
			const unit = legalKnownUnit(carrier.node);
			if (unit === void 0 || unitsCanShareBoundAxis(unit, axisUnit)) continue;
			errors.push(contextualMismatch([...carrier.path, "unit"], `phase-plane ${coordinate}-axis unit "${axisUnit}" is incompatible with ${carrier.label} in "${unit}". Every state-space carrier must be convertible onto the axis it inhabits.`));
		}
	}
	return errors;
}
function bindUncertaintyUnit(errors, uncertainty, values, path, label) {
	const uncertaintyUnit = legalKnownUnit(uncertainty);
	const valueUnit = legalKnownUnit(values);
	if (uncertaintyUnit === void 0 || valueUnit === void 0 || unitsCanShareBoundAxis(uncertaintyUnit, valueUnit)) return;
	errors.push(contextualMismatch([...path, "unit"], `${label} is in "${uncertaintyUnit}" but qualifies values in "${valueUnit}". A dispersion or interval bound has the same physical dimension as the estimate it qualifies.`));
}
/** Bind every supported trace uncertainty variant to the values it qualifies. */
function traceUncertaintyContextualUnits(context) {
	const data = asRecord(context.request.data) ?? {};
	const parameters = asRecord(context.request.parameters) ?? {};
	const errors = [];
	if (context.skillId === "neuro.multisignal_trace") {
		const series = asArray(data.series) ?? [];
		for (let index = 0; index < series.length; index++) {
			const entry = asRecord(series[index]);
			bindUncertaintyUnit(errors, asRecord(entry?.uncertainty), asRecord(entry?.values), [
				"data",
				"series",
				index,
				"uncertainty"
			], `series ${index}'s uncertainty`);
		}
		return errors;
	}
	if (context.skillId === "network.synaptic_weight_trace") {
		const series = asArray(data.series) ?? [];
		for (let index = 0; index < series.length; index++) {
			const entry = asRecord(series[index]);
			bindUncertaintyUnit(errors, asRecord(entry?.uncertainty), asRecord(entry?.values), [
				"data",
				"series",
				index,
				"uncertainty"
			], `series ${index}'s uncertainty`);
		}
		const aggregate = asRecord(data.aggregate);
		bindUncertaintyUnit(errors, asRecord(aggregate?.uncertainty), asRecord(aggregate?.values), [
			"data",
			"aggregate",
			"uncertainty"
		], "aggregate uncertainty");
		return errors;
	}
	if (context.skillId === "neuro.analog_trace" || context.skillId === "neuro.compartment_trace") {
		const uncertainty = asRecord(parameters.uncertainty);
		const series = asArray(data.series) ?? [];
		for (let index = 0; index < series.length; index++) {
			const previousErrorCount = errors.length;
			bindUncertaintyUnit(errors, uncertainty, asRecord(asRecord(series[index])?.values), ["parameters", "uncertainty"], `figure uncertainty for series ${index}`);
			if (errors.length > previousErrorCount) break;
		}
	}
	return errors;
}
function contextualUnitDimensionErrors(context) {
	return [
		...timeAxisContextualUnits(context),
		...weightTraceContextualUnits(context),
		...weightDistributionContextualUnits(context),
		...multisignalPanelContextualUnits(context),
		...phasePlaneContextualUnits(context),
		...traceUncertaintyContextualUnits(context)
	];
}
const unitDimensionMatch = (context) => {
	const quantities = [];
	collectQuantities(context.request, [], quantities);
	const errors = [];
	for (const quantity of quantities) errors.push(...require_response_curve_basis.checkQuantityUnit(quantity.kind, quantity.unit, [...quantity.path, "unit"], "unit.dimension_match"));
	errors.push(...contextualUnitDimensionErrors(context));
	return errors;
};
const unitCanonicalCode = (context) => {
	const bare = [];
	collectBareUnits(context.request, [], bare);
	const errors = [];
	for (const entry of bare) {
		if (require_response_curve_basis.isKnownUnit(entry.unit)) continue;
		const at = entry.path.map((segment) => `/${String(segment).replace(/~/g, "~0").replace(/\//g, "~1")}`).join("");
		const canonical = require_response_curve_basis.resolveAlias(entry.unit);
		if (canonical !== void 0) errors.push(require_errors.makeError({
			code: "SCIENCE_UNIT_ALIAS_NOT_CANONICAL",
			stage: "science",
			instancePath: at,
			validatorId: "unit.canonical_code",
			message: `"${entry.unit}" is an accepted alias, not a canonical code. Use "${canonical}". Cortexel does not convert it silently: a conversion the caller never sees is a number the caller never checked.`,
			repair: {
				operation: "replace",
				path: at,
				value: canonical,
				reasonCode: "SCIENCE_UNIT_ALIAS_NOT_CANONICAL"
			}
		}));
		else errors.push(require_errors.makeError({
			code: "SCHEMA_ENUM_MISMATCH",
			stage: "structural",
			instancePath: at,
			validatorId: "unit.canonical_code",
			message: `"${entry.unit}" is not a unit code in the registry.`
		}));
	}
	return errors;
};

//#endregion
//#region src/core/semantics/structure.ts
/**
* Cross-field structural rules that JSON Schema cannot state.
*
* A schema can say "this is an array of numbers" and "that is an array of strings".
* It cannot say "and they must be the same length" — which is the difference
* between a list of spike times with senders, and a list of spike times paired with
* whatever senders happened to be nearby.
*/
/**
* Parallel arrays that describe the same observations must have equal length.
*
* The skill contract supplies groups of JSON Pointers; a pointer that resolves to
* nothing is skipped, because an optional array that is absent is not a mismatch.
* Values are NEVER paired with times by best effort — a shorter sender array does
* not mean "reuse the last sender", it means the export is broken.
*/
const seriesEqualLength = (context) => {
	const groups = context.parameters?.groups;
	if (!Array.isArray(groups)) return [];
	const errors = [];
	for (const group of groups) {
		if (!Array.isArray(group)) continue;
		const present = [];
		for (const jsonPointer of group) {
			if (typeof jsonPointer !== "string") continue;
			const value = readPointer(context.request, jsonPointer);
			const array = asArray(value);
			if (array === void 0) continue;
			present.push({
				path: jsonPointer,
				length: array.length
			});
		}
		if (present.length < 2) continue;
		const expected = present[0];
		for (const entry of present.slice(1)) if (entry.length !== expected.length) errors.push(require_errors.makeError({
			code: "SEMANTIC_LENGTH_MISMATCH",
			stage: "semantic",
			instancePath: entry.path,
			validatorId: "series.equal_length",
			message: `this array has ${entry.length} entries but ${expected.path} has ${expected.length}. They describe the same observations, so they must have the same length; Cortexel does not pair values with times by best effort.`
		}));
	}
	return errors;
};
/**
* Declared identifiers must be unique.
*
* A duplicate id has to fail BEFORE anything can bind to it. Once two nodes share
* an id, selection, edge binding, and table lookup can each resolve it differently,
* and the figure quietly stops being about the network the caller described.
*/
const idsUnique = (context) => {
	const pointers = context.parameters?.pointers;
	if (!Array.isArray(pointers)) return [];
	const errors = [];
	for (const jsonPointer of pointers) {
		if (typeof jsonPointer !== "string") continue;
		const array = asArray(readPointer(context.request, jsonPointer));
		if (array === void 0) continue;
		const seen = /* @__PURE__ */ new Map();
		for (let index = 0; index < array.length; index++) {
			const id = array[index];
			if (typeof id !== "string") continue;
			const first = seen.get(id);
			if (first !== void 0) {
				errors.push(require_errors.makeError({
					code: "SEMANTIC_DUPLICATE_ID",
					stage: "semantic",
					instancePath: `${jsonPointer}/${index}`,
					validatorId: "ids.unique",
					message: `the id "${id}" already appears at index ${first}. An ambiguous identity must fail here, before selection or edge binding can resolve it two different ways.`
				}));
				continue;
			}
			seen.set(id, index);
		}
	}
	return errors;
};
/** Every referenced id is a member of the declared universe. */
function checkReferencesInUniverse(referenced, universe, referencedPath, validatorId, universeDescription) {
	const errors = [];
	const reported = /* @__PURE__ */ new Set();
	for (let index = 0; index < referenced.length; index++) {
		const id = referenced[index];
		if (typeof id !== "string" || universe.has(id) || reported.has(id)) continue;
		reported.add(id);
		errors.push(require_errors.makeError({
			code: "SEMANTIC_UNKNOWN_REFERENCE",
			stage: "semantic",
			instancePath: require_errors.pointer(...referencedPath, index),
			validatorId,
			message: `"${id}" is not in ${universeDescription}. Cortexel does not silently extend a universe you declared complete — a member that was supposedly not there cannot have produced an observation.`
		}));
		if (reported.size >= 8) break;
	}
	return errors;
}

//#endregion
//#region src/core/semantics/events.ts
/**
* Event, bin, window, and rate semantics.
*
* Spike analyses are deceptively easy to draw and easy to get subtly wrong. Every
* rule here exists because the wrong version of it produces a figure that looks
* completely reasonable and says something false.
*/
const NEST_FINITE_STOP_WINDOW_KIND = "nest_recording_device_origin_relative";
const NEST_CAPTURE_BOUNDED_WINDOW_KIND = "nest_recording_device_positive_infinity_capture_bounded";
function nestWindowKind(window) {
	const kind = asString(window.kind);
	if (kind === NEST_FINITE_STOP_WINDOW_KIND) return "finite_stop";
	if (kind === NEST_CAPTURE_BOUNDED_WINDOW_KIND) return "positive_infinity_capture_bounded";
}
const CANONICAL_NEST_TIC = /^(?:0|[1-9][0-9]*)$/u;
function nestTic(value) {
	const text = asString(value);
	return text !== void 0 && text.length <= 32 && CANONICAL_NEST_TIC.test(text) ? BigInt(text) : void 0;
}
/**
* Project the two absolute NEST endpoints from their integer-tic authority.
*
* The separately serialized `origin`, `start`, and `stop` fields are useful
* human-scale projections, but adding those binary64 values would round twice.
* Endpoint membership is defined by adding tics first and then reproducing the
* pinned binary64 reciprocal-and-multiply `Time::get_ms()` source sequence.
*/
function projectNestEndpoints(window, captureBounded) {
	const captureAuthority = asRecord(window.captureAuthority);
	const runtimeStatus = asRecord(captureAuthority?.runtimeStatus);
	const recordingGrid = asRecord(captureAuthority?.recordingGrid);
	const ticsPerMs = nestTic(runtimeStatus?.ticsPerMs);
	const resolutionTics = nestTic(runtimeStatus?.resolutionTics);
	const captureTics = nestTic(runtimeStatus?.captureBiologicalTimeTics);
	const originTics = nestTic(recordingGrid?.originTics);
	const startTics = nestTic(recordingGrid?.startTics);
	const upperTics = captureBounded ? captureTics : nestTic(recordingGrid?.stopTics);
	const bufferEpoch = asRecord(captureAuthority?.bufferEpoch);
	const recordingPlan = asRecord(captureAuthority?.recordingPlan);
	const bufferTics = nestTic(bufferEpoch?.beganAtBiologicalTimeTics);
	const mutationTics = nestTic(recordingPlan?.lastMutationAtBiologicalTimeTics);
	const resolutionMs = asNumber(runtimeStatus?.resolutionMs);
	const originMs = asNumber(window.origin);
	const startMs = asNumber(window.start);
	const upperMs = asNumber(captureBounded ? window.captureTime : window.stop);
	if (ticsPerMs === void 0 || resolutionTics === void 0 || captureTics === void 0 || originTics === void 0 || startTics === void 0 || upperTics === void 0 || bufferTics === void 0 || mutationTics === void 0 || resolutionMs === void 0 || originMs === void 0 || startMs === void 0 || upperMs === void 0 || asString(runtimeStatus?.timeBuildProfile) !== "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1") return void 0;
	for (const [tics, milliseconds] of [
		[resolutionTics, resolutionMs],
		[originTics, originMs],
		[startTics, startMs],
		[upperTics, upperMs]
	]) {
		const sourceProjection = require_nest_time.projectNestTicsToMillisecondsV310(tics, ticsPerMs);
		if (!sourceProjection.ok || !Object.is(sourceProjection.milliseconds, milliseconds)) return;
	}
	const retainedTics = [
		originTics,
		startTics,
		upperTics,
		captureTics,
		bufferTics,
		mutationTics
	];
	if (resolutionTics === 0n || retainedTics.some((tics) => tics % resolutionTics !== 0n)) return void 0;
	const projection = require_nest_time.projectNestWindowEndpointsV310({
		ticsPerMs,
		resolutionTics,
		retainedTics,
		lowerEndpointTics: originTics + startTics,
		upperEndpointTics: captureBounded ? upperTics : originTics + upperTics
	});
	return projection.ok ? {
		lowerMs: projection.lowerMilliseconds,
		upperMs: projection.upperMilliseconds
	} : void 0;
}
/** Resolve bin edges from either an explicit edge list or a width that tiles a range. */
function resolveBinEdges(spec) {
	if (!spec) return void 0;
	const mode = asString(spec.mode);
	if (mode === "edges") {
		const edges = asArray(spec.edges);
		if (!edges) return void 0;
		const numeric = edges.map(asNumber);
		return numeric.every((value) => value !== void 0) ? numeric : void 0;
	}
	if (mode === "width") {
		const width = asNumber(spec.width);
		const start = asNumber(spec.start);
		const stop = asNumber(spec.stop);
		if (width === void 0 || start === void 0 || stop === void 0) return void 0;
		if (!(width > 0) || !(stop > start)) return void 0;
		const result = require_response_curve_basis.materializeWidthBins(start, stop, width);
		return result.ok ? [...result.edges] : void 0;
	}
}
/**
* A population-rate figure has one declared observation window and one binned
* domain. Their physical outer endpoints must be the same quantities, even when
* written in different registered time units.
*
* This comparison stays exact. Converting an edge to binary64 first can make two
* physically distinct declarations round to the same number (for example
* `0.3 ms` and `0.0003 s`), after which validation could no longer recover the
* contradiction.
*/
function populationRateBinsBindWindow(context) {
	if (context.skillId !== "neuro.population_rate") return [];
	const data = getData(context);
	const parameters = getParameters(context);
	const window = asRecord(data.window);
	const windowStart = asNumber(window?.start);
	const windowStop = asNumber(window?.stop);
	const windowUnit = asString(window?.unit);
	if (windowStart === void 0 || windowStop === void 0 || !windowUnit) return [];
	let firstEdge;
	let lastEdge;
	let binUnit;
	let firstPath;
	let lastPath;
	if (asString(data.mode) === "events") {
		const bins = asRecord(parameters.bins);
		binUnit = asString(bins?.unit);
		if (asString(bins?.mode) === "width") {
			firstEdge = asNumber(bins?.start);
			lastEdge = asNumber(bins?.stop);
			firstPath = [
				"parameters",
				"bins",
				"start"
			];
			lastPath = [
				"parameters",
				"bins",
				"stop"
			];
		} else {
			const edgeValues = asArray(bins?.edges);
			firstEdge = asNumber(edgeValues?.[0]);
			lastEdge = asNumber(edgeValues?.[Math.max(0, (edgeValues?.length ?? 1) - 1)]);
			firstPath = [
				"parameters",
				"bins",
				"edges",
				0
			];
			lastPath = [
				"parameters",
				"bins",
				"edges",
				Math.max(0, (edgeValues?.length ?? 1) - 1)
			];
		}
	} else if (asString(data.mode) === "prebinned") {
		const binEdges = asRecord(data.binEdges);
		const edgeValues = asArray(binEdges?.edges);
		firstEdge = asNumber(edgeValues?.[0]);
		lastEdge = asNumber(edgeValues?.[Math.max(0, (edgeValues?.length ?? 1) - 1)]);
		binUnit = asString(binEdges?.unit);
		firstPath = [
			"data",
			"binEdges",
			"edges",
			0
		];
		lastPath = [
			"data",
			"binEdges",
			"edges",
			Math.max(0, (edgeValues?.length ?? 1) - 1)
		];
	} else return [];
	if (firstEdge === void 0 || lastEdge === void 0 || !binUnit) return [];
	const errors = [];
	const checks = [{
		edge: firstEdge,
		windowValue: windowStart,
		windowName: "start",
		at: firstPath
	}, {
		edge: lastEdge,
		windowValue: windowStop,
		windowName: "stop",
		at: lastPath
	}];
	for (const check of checks) {
		let comparison;
		try {
			comparison = require_response_curve_basis.compareExactUnitSumToValue([{
				value: check.edge,
				unit: binUnit
			}], {
				value: check.windowValue,
				unit: windowUnit
			});
		} catch {
			continue;
		}
		if (comparison === 0) continue;
		errors.push(require_errors.makeError({
			code: "SCIENCE_BIN_EDGES_INVALID",
			stage: "science",
			instancePath: require_errors.pointer(...check.at),
			validatorId: "bins.strictly_increasing",
			message: `population-rate bins must tile exactly the declared observation window: the ${check.windowName} bin edge ${check.edge} ${binUnit} is not exactly equal to window ${check.windowName} ${check.windowValue} ${windowUnit}. Rounded unit conversion is not sufficient because it can conceal a real boundary mismatch.`
		}));
	}
	return errors;
}
const binsStrictlyIncreasing = (context) => {
	const errors = [];
	const check = (edges, at) => {
		const array = asArray(edges);
		if (!array) return;
		for (let i = 0; i < array.length; i++) {
			const value = asNumber(array[i]);
			if (value === void 0) {
				errors.push(require_errors.makeError({
					code: "SCIENCE_BIN_EDGES_INVALID",
					stage: "science",
					instancePath: require_errors.pointer(...at, i),
					validatorId: "bins.strictly_increasing",
					message: "a bin edge must be a finite number."
				}));
				return;
			}
			if (i > 0) {
				const previous = asNumber(array[i - 1]);
				if (previous !== void 0 && !(value > previous)) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_BIN_EDGES_INVALID",
						stage: "science",
						instancePath: require_errors.pointer(...at, i),
						validatorId: "bins.strictly_increasing",
						message: `bin edges must be strictly increasing: edge ${i} (${value}) is not greater than edge ${i - 1} (${previous}). A zero-width or inverted bin has no meaning.`
					}));
					return;
				}
			}
		}
	};
	const data = getData(context);
	const parameters = getParameters(context);
	check(asRecord(data.binEdges)?.edges, [
		"data",
		"binEdges",
		"edges"
	]);
	check(asRecord(parameters.bins)?.edges, [
		"parameters",
		"bins",
		"edges"
	]);
	for (const [container, at] of [[asRecord(parameters.bins), ["parameters", "bins"]]]) {
		if (!container || asString(container.mode) !== "width") continue;
		const width = asNumber(container.width);
		const start = asNumber(container.start);
		const stop = asNumber(container.stop);
		if (width !== void 0 && !(width > 0)) errors.push(require_errors.makeError({
			code: "SCIENCE_BIN_EDGES_INVALID",
			stage: "science",
			instancePath: require_errors.pointer(...at, "width"),
			validatorId: "bins.strictly_increasing",
			message: "the bin width must be positive."
		}));
		if (start !== void 0 && stop !== void 0 && !(stop > start)) errors.push(require_errors.makeError({
			code: "SCIENCE_BIN_EDGES_INVALID",
			stage: "science",
			instancePath: require_errors.pointer(...at, "stop"),
			validatorId: "bins.strictly_increasing",
			message: "the binned range must be non-empty: stop must be greater than start."
		}));
		if (width !== void 0 && start !== void 0 && stop !== void 0 && width > 0 && stop > start) {
			if (!require_response_curve_basis.materializeWidthBins(start, stop, width).ok) errors.push(require_errors.makeError({
				code: "SCIENCE_BIN_EDGES_INVALID",
				stage: "science",
				instancePath: require_errors.pointer(...at, "width"),
				validatorId: "bins.strictly_increasing",
				message: `the width-mode specification cannot be materialized as at most ${require_response_curve_basis.MAX_MATERIALIZED_BINS} strictly increasing binary64 bins over the declared range. Increase the width or use explicit edges.`
			}));
		}
	}
	errors.push(...populationRateBinsBindWindow(context));
	return errors;
};
const windowValid = (context) => {
	const at = asString(context.parameters?.pointer) ?? "/data/window";
	const window = asRecord(readPointer(context.request, at));
	if (!window) return [];
	const nestKind = nestWindowKind(window);
	const nestWindow = nestKind !== void 0;
	const captureBounded = nestKind === "positive_infinity_capture_bounded";
	const origin = asNumber(window.origin);
	const start = asNumber(window.start);
	const upper = asNumber(captureBounded ? window.captureTime : window.stop);
	const upperName = captureBounded ? "captureTime" : "stop";
	const unit = asString(window.unit);
	const unitDimension = asString(context.parameters?.unitDimension);
	if (unit !== void 0 && require_response_curve_basis.isKnownUnit(unit) && unitDimension !== void 0 && require_response_curve_basis.dimensionOf(unit) !== unitDimension) return [require_errors.makeError({
		code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
		stage: "science",
		instancePath: `${at}/unit`,
		validatorId: "window.valid",
		message: `this interval requires unit dimension ${JSON.stringify(unitDimension)}; got ${JSON.stringify(unit)} with dimension ${JSON.stringify(require_response_curve_basis.dimensionOf(unit))}.`
	})];
	for (const [name, value] of [
		...nestWindow ? [["origin", window.origin]] : [],
		["start", window.start],
		[upperName, captureBounded ? window.captureTime : window.stop]
	]) if (typeof value === "number" && !Number.isFinite(value)) return [require_errors.makeError({
		code: "SCIENCE_WINDOW_INVALID",
		stage: "science",
		instancePath: `${at}/${name}`,
		validatorId: "window.valid",
		message: `the observation-window ${name} must be finite.`
	})];
	if (nestWindow && origin === void 0) return [];
	if (start === void 0 || upper === void 0) return [];
	if (!nestWindow && !(upper > start)) return [require_errors.makeError({
		code: "SCIENCE_WINDOW_INVALID",
		stage: "science",
		instancePath: `${at}/${upperName}`,
		validatorId: "window.valid",
		message: `the observation window is empty or inverted (start ${start}, stop ${upper}). It must satisfy start < stop.`
	})];
	if (!nestWindow || !unit || require_response_curve_basis.dimensionOf(unit) !== "time") return [];
	const captureAuthority = asRecord(window.captureAuthority);
	const runtimeStatus = asRecord(captureAuthority?.runtimeStatus);
	const recordingGrid = asRecord(captureAuthority?.recordingGrid);
	const bufferEpoch = asRecord(captureAuthority?.bufferEpoch);
	const recordingPlan = asRecord(captureAuthority?.recordingPlan);
	const resolutionMs = asNumber(runtimeStatus?.resolutionMs);
	const ticsPerMsText = asString(runtimeStatus?.ticsPerMs);
	const resolutionTicsText = asString(runtimeStatus?.resolutionTics);
	const captureTicsText = asString(runtimeStatus?.captureBiologicalTimeTics);
	const originTicsText = asString(recordingGrid?.originTics);
	const startTicsText = asString(recordingGrid?.startTics);
	const stopTicsText = captureBounded ? void 0 : asString(recordingGrid?.stopTics);
	const bufferTicsText = asString(bufferEpoch?.beganAtBiologicalTimeTics);
	const mutationTicsText = asString(recordingPlan?.lastMutationAtBiologicalTimeTics);
	const requiredTicText = [
		ticsPerMsText,
		resolutionTicsText,
		captureTicsText,
		originTicsText,
		startTicsText,
		...captureBounded ? [] : [stopTicsText],
		bufferTicsText,
		mutationTicsText
	];
	if (resolutionMs === void 0 || requiredTicText.some((value) => value === void 0)) return [];
	if (requiredTicText.some((value) => value === void 0 || value.length === 0 || value.length > 32 || !CANONICAL_NEST_TIC.test(value))) return [];
	const ticsPerMs = BigInt(ticsPerMsText);
	const resolutionTics = BigInt(resolutionTicsText);
	const captureBiologicalTimeTics = BigInt(captureTicsText);
	const originTics = BigInt(originTicsText);
	const startTics = BigInt(startTicsText);
	const stopTics = stopTicsText === void 0 ? void 0 : BigInt(stopTicsText);
	const beganAtBiologicalTimeTics = BigInt(bufferTicsText);
	const lastMutationAtBiologicalTimeTics = BigInt(mutationTicsText);
	if (ticsPerMs === 0n || resolutionTics === 0n) return [];
	const maximumSafeTics = BigInt(Number.MAX_SAFE_INTEGER);
	const ticsPerMsPath = `${at}/captureAuthority/runtimeStatus/ticsPerMs`;
	const resolutionTicsPath = `${at}/captureAuthority/runtimeStatus/resolutionTics`;
	const errors = [];
	const sourceInvalidNames = /* @__PURE__ */ new Set();
	const unsafeTicNames = /* @__PURE__ */ new Set();
	const sourceFailure = (name, instancePath, message) => {
		sourceInvalidNames.add(name);
		errors.push(require_errors.makeError({
			code: "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
			stage: "provenance",
			instancePath,
			validatorId: "window.valid",
			message
		}));
	};
	const unsafeTicFailure = (name, instancePath, message) => {
		unsafeTicNames.add(name);
		sourceFailure(name, instancePath, message);
	};
	if (ticsPerMs > maximumSafeTics) sourceFailure("ticsPerMs", ticsPerMsPath, "ticsPerMs is outside executable mapping profile 5; it must be a positive safe integer.");
	const finiteTimeLimitTics = resolutionTics <= maximumSafeTics ? require_nest_time.nestFiniteTimeLimitTicsV310(resolutionTics) : void 0;
	if (finiteTimeLimitTics === void 0) unsafeTicFailure("resolutionTics", resolutionTicsPath, "resolutionTics is outside the pinned LP64/int64 NEST 3.10.0 finite-Time build profile.");
	const captureTicsPath = `${at}/captureAuthority/runtimeStatus/captureBiologicalTimeTics`;
	const originTicsPath = `${at}/captureAuthority/recordingGrid/originTics`;
	const startTicsPath = `${at}/captureAuthority/recordingGrid/startTics`;
	const stopTicsPath = `${at}/captureAuthority/recordingGrid/stopTics`;
	const bufferTicsPath = `${at}/captureAuthority/bufferEpoch/beganAtBiologicalTimeTics`;
	const mutationTicsPath = `${at}/captureAuthority/recordingPlan/lastMutationAtBiologicalTimeTics`;
	const projectionChecks = [
		[
			"resolutionTics",
			resolutionTics,
			resolutionMs,
			`${at}/captureAuthority/runtimeStatus/resolutionMs`,
			"resolutionMs"
		],
		[
			"originTics",
			originTics,
			origin,
			originTicsPath,
			"origin"
		],
		[
			"startTics",
			startTics,
			start,
			startTicsPath,
			"start"
		]
	];
	if (captureBounded) projectionChecks.push([
		"captureBiologicalTimeTics",
		captureBiologicalTimeTics,
		upper,
		captureTicsPath,
		"captureTime"
	]);
	else if (stopTics !== void 0) projectionChecks.push([
		"stopTics",
		stopTics,
		upper,
		stopTicsPath,
		"stop"
	]);
	const retainedTics = [
		[
			"resolutionTics",
			resolutionTics,
			resolutionTicsPath,
			"resolutionTics"
		],
		[
			"originTics",
			originTics,
			originTicsPath,
			"originTics"
		],
		[
			"startTics",
			startTics,
			startTicsPath,
			"startTics"
		],
		[
			"captureBiologicalTimeTics",
			captureBiologicalTimeTics,
			captureTicsPath,
			"captureBiologicalTimeTics"
		],
		[
			"beganAtBiologicalTimeTics",
			beganAtBiologicalTimeTics,
			bufferTicsPath,
			"beganAtBiologicalTimeTics"
		],
		[
			"lastMutationAtBiologicalTimeTics",
			lastMutationAtBiologicalTimeTics,
			mutationTicsPath,
			"lastMutationAtBiologicalTimeTics"
		]
	];
	if (stopTics !== void 0) retainedTics.splice(3, 0, [
		"stopTics",
		stopTics,
		stopTicsPath,
		"stopTics"
	]);
	const gridChecks = retainedTics.filter(([name]) => name !== "resolutionTics");
	const absoluteStartTics = originTics + startTics;
	const absoluteUpperTics = captureBounded ? captureBiologicalTimeTics : originTics + stopTics;
	const retainedProjections = /* @__PURE__ */ new Map();
	for (const [name, tics, instancePath, label] of retainedTics) {
		if (unsafeTicNames.has(name)) continue;
		if (tics > maximumSafeTics || finiteTimeLimitTics !== void 0 && tics >= finiteTimeLimitTics) {
			unsafeTicFailure(name, instancePath, `${label} is outside executable mapping profile 5: it must be a safe integer${finiteTimeLimitTics === void 0 ? "." : " strictly below the pinned finite-Time limit."}`);
			continue;
		}
		if (sourceInvalidNames.has("ticsPerMs")) continue;
		const projection = require_nest_time.projectNestTicsToMillisecondsV310(tics, ticsPerMs);
		if (!projection.ok) {
			sourceFailure(name, instancePath, `${label} is outside executable mapping profile 5: ${projection.message}`);
			continue;
		}
		retainedProjections.set(name, projection.milliseconds);
	}
	for (const [name, , milliseconds, instancePath, label] of projectionChecks) {
		const projected = retainedProjections.get(name);
		if (projected === void 0) continue;
		if (!Object.is(projected, milliseconds)) sourceFailure(name, instancePath, `${label} is not the pinned NEST 3.10.0 get_ms binary64 projection of its declared integer-tic preimage.`);
	}
	let gridInvalid = false;
	if (!unsafeTicNames.has("resolutionTics")) for (const [name, tics, instancePath, label] of gridChecks) {
		if (unsafeTicNames.has(name) || tics % resolutionTics === 0n) continue;
		gridInvalid = true;
		errors.push(require_errors.makeError({
			code: "SCIENCE_WINDOW_INVALID",
			stage: "science",
			instancePath,
			validatorId: "window.valid",
			message: `${label} is not on the declared NEST runtime resolution grid.`
		}));
	}
	const upperAuthorityPath = captureBounded ? captureTicsPath : stopTicsPath;
	const absoluteStartOperandsSafe = !unsafeTicNames.has("originTics") && !unsafeTicNames.has("startTics");
	const absoluteUpperOperandsSafe = captureBounded ? !unsafeTicNames.has("captureBiologicalTimeTics") : !unsafeTicNames.has("originTics") && !unsafeTicNames.has("stopTics");
	const exactIntervalOrdered = absoluteStartOperandsSafe && absoluteUpperOperandsSafe ? absoluteUpperTics > absoluteStartTics : void 0;
	if (exactIntervalOrdered === false) errors.push(require_errors.makeError({
		code: "SCIENCE_WINDOW_INVALID",
		stage: "science",
		instancePath: upperAuthorityPath,
		validatorId: "window.valid",
		message: captureBounded ? "the NEST positive-infinity capture time must be strictly later than originTics + startTics; a capture at the open start has no complete observation interval." : "the NEST finite stop must be strictly later than start on the declared integer-tic clock."
	}));
	if (exactIntervalOrdered === true && !captureBounded && stopTics !== void 0 && !unsafeTicNames.has("captureBiologicalTimeTics")) {
		if (captureBiologicalTimeTics < absoluteUpperTics) errors.push(require_errors.makeError({
			code: "SCIENCE_WINDOW_INVALID",
			stage: "science",
			instancePath: captureTicsPath,
			validatorId: "window.valid",
			message: "the NEST capture time is earlier than originTics + stopTics. The final status must be read only after the Simulate or Run call that reached the closed-stop endpoint returned successfully."
		}));
	}
	if (absoluteStartOperandsSafe && !unsafeTicNames.has("beganAtBiologicalTimeTics") && beganAtBiologicalTimeTics > absoluteStartTics) errors.push(require_errors.makeError({
		code: "SCIENCE_WINDOW_INVALID",
		stage: "science",
		instancePath: bufferTicsPath,
		validatorId: "window.valid",
		message: "the most recent NEST recorder creation or n_events=0 clear occurred after originTics + startTics, so the retained buffer cannot substantiate the complete window."
	}));
	if (absoluteStartOperandsSafe && !unsafeTicNames.has("lastMutationAtBiologicalTimeTics") && lastMutationAtBiologicalTimeTics > absoluteStartTics) errors.push(require_errors.makeError({
		code: "SCIENCE_WINDOW_INVALID",
		stage: "science",
		instancePath: mutationTicsPath,
		validatorId: "window.valid",
		message: "the most recent NEST recorder-window, backend, time-encoding, or sender-wiring mutation occurred after originTics + startTics, so one plan did not govern the complete window."
	}));
	let endpointSourceValid = finiteTimeLimitTics !== void 0 && !gridInvalid && !sourceInvalidNames.has("ticsPerMs") && !sourceInvalidNames.has("resolutionTics") && retainedProjections.size === retainedTics.length && retainedTics.every(([name]) => !sourceInvalidNames.has(name));
	if (endpointSourceValid) for (const [name, tics, instancePath, label] of [[
		"absoluteStartTics",
		absoluteStartTics,
		startTicsPath,
		"originTics + startTics"
	], [
		"absoluteUpperTics",
		absoluteUpperTics,
		upperAuthorityPath,
		captureBounded ? "captureBiologicalTimeTics" : "originTics + stopTics"
	]]) {
		if (tics > maximumSafeTics || tics >= finiteTimeLimitTics) {
			sourceFailure(name, instancePath, `${label} is outside executable mapping profile 5: it must be a safe integer strictly below the pinned finite-Time limit.`);
			endpointSourceValid = false;
			continue;
		}
		const projection = require_nest_time.projectNestTicsToMillisecondsV310(tics, ticsPerMs);
		if (!projection.ok) {
			sourceFailure(name, instancePath, `${label} is outside executable mapping profile 5: ${projection.message}`);
			endpointSourceValid = false;
		}
	}
	if (endpointSourceValid && exactIntervalOrdered === true) {
		const endpointProjection = require_nest_time.projectNestWindowEndpointsV310({
			ticsPerMs,
			resolutionTics,
			retainedTics: retainedTics.map(([, tics]) => tics),
			lowerEndpointTics: absoluteStartTics,
			upperEndpointTics: absoluteUpperTics
		});
		if (!endpointProjection.ok) {
			const sourceProfileFailure = endpointProjection.kind === "source_profile";
			errors.push(require_errors.makeError({
				code: sourceProfileFailure ? "PROVENANCE_SOURCE_CLOCK_INCONSISTENT" : endpointProjection.kind === "window_order" ? "SCIENCE_WINDOW_INVALID" : "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
				stage: sourceProfileFailure ? "provenance" : "science",
				instancePath: upperAuthorityPath,
				validatorId: "window.valid",
				message: `the pinned NEST 3.10.0 endpoint projection is not admissible: ${endpointProjection.message}`
			}));
		}
	}
	return errors;
};
/**
* Events must lie within the declared observation window.
*
* General event windows explicitly select [start, stop), [start, stop], or
* (start, stop]. A finite-stop NEST recording-device window retains the
* simulator's native (origin + start, origin + stop] convention. A NEST device
* configured with positive infinity instead ends this artifact's finite prefix
* at the exact successful-return capture time: (origin + start, capture]. NEST
* endpoints are added in integer tics and then projected with the pinned
* `Time::get_ms()` binary64 operation sequence before comparison with exported
* binary64 event times. Separately serialized origin/offset fields are never summed.
*
* Out-of-window events are reported with a COUNT, never silently dropped — a
* disclosure on the figure then says how many were excluded. The semantic gate
* accepts deliberate `exclude_and_disclose`; the renderer remains responsible
* for retaining those observations in the table and omitting only their marks.
*/
const eventsWithinWindow = (context) => {
	const data = getData(context);
	const window = asRecord(data.window);
	if (!window) return [];
	const nestKind = nestWindowKind(window);
	const nestWindow = nestKind !== void 0;
	const captureBounded = nestKind === "positive_infinity_capture_bounded";
	if (nestWindow && nestSourceClockDeclarationErrors(context).length > 0) return [];
	const origin = asNumber(window.origin);
	const start = asNumber(window.start);
	const upper = asNumber(captureBounded ? window.captureTime : window.stop);
	if (start === void 0 || upper === void 0 || nestWindow && origin === void 0) return [];
	if (!nestWindow && !(upper > start)) return [];
	const eventTimes = asRecord(data.eventTimes);
	const times = asArray(eventTimes?.values);
	if (!times) return [];
	const eventUnit = legalKnownUnit(eventTimes);
	const windowUnit = asString(window.unit);
	if (!eventUnit || !windowUnit || !require_response_curve_basis.isKnownUnit(windowUnit) || require_response_curve_basis.dimensionOf(windowUnit) !== "time") return [];
	const lowerTerms = nestWindow ? [{
		value: origin,
		unit: windowUnit
	}, {
		value: start,
		unit: windowUnit
	}] : [{
		value: start,
		unit: windowUnit
	}];
	const upperTerms = captureBounded ? [{
		value: upper,
		unit: windowUnit
	}] : nestWindow ? [{
		value: origin,
		unit: windowUnit
	}, {
		value: upper,
		unit: windowUnit
	}] : [{
		value: upper,
		unit: windowUnit
	}];
	const boundary = captureBounded ? "(origin+start,capture]" : nestWindow ? "(origin+start,origin+stop]" : asString(window.boundary);
	const openStart = boundary === "(start,stop]" || boundary === "(origin+start,origin+stop]" || boundary === "(origin+start,capture]";
	const closedStop = boundary === "[start,stop]" || boundary === "(start,stop]" || boundary === "(origin+start,origin+stop]" || boundary === "(origin+start,capture]";
	const nestEndpoints = nestWindow ? projectNestEndpoints(window, captureBounded) : void 0;
	if (nestWindow && (!nestEndpoints || eventUnit !== "ms" || windowUnit !== "ms")) return [];
	let outside = 0;
	let firstIndex = -1;
	for (let i = 0; i < times.length; i++) {
		const time = asNumber(times[i]);
		if (time === void 0) continue;
		let beforeStart;
		let beyondStop;
		try {
			if (nestEndpoints) {
				beforeStart = openStart ? time <= nestEndpoints.lowerMs : time < nestEndpoints.lowerMs;
				beyondStop = closedStop ? time > nestEndpoints.upperMs : time >= nestEndpoints.upperMs;
			} else {
				const lowerComparedWithEvent = require_response_curve_basis.compareExactUnitSumToValue(lowerTerms, {
					value: time,
					unit: eventUnit
				});
				const upperComparedWithEvent = require_response_curve_basis.compareExactUnitSumToValue(upperTerms, {
					value: time,
					unit: eventUnit
				});
				beforeStart = openStart ? lowerComparedWithEvent >= 0 : lowerComparedWithEvent > 0;
				beyondStop = closedStop ? upperComparedWithEvent < 0 : upperComparedWithEvent <= 0;
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "event-time unit conversion failed";
			const numericResolution = message.includes("overflowed") || message.includes("underflowed");
			return [require_errors.makeError({
				code: numericResolution ? "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE" : "SCIENCE_UNIT_DIMENSION_MISMATCH",
				stage: "science",
				instancePath: require_errors.pointer("data", "eventTimes", "values", i),
				validatorId: "events.within_window",
				message: numericResolution ? `event ${i} cannot be converted from ${eventUnit} to ${windowUnit} without overflowing or underflowing finite binary64, so its window membership is not representable.` : `event times in ${eventUnit} cannot be compared with a window in ${windowUnit}: ${message}`
			})];
		}
		if (beforeStart || beyondStop) {
			outside++;
			if (firstIndex < 0) firstIndex = i;
		}
	}
	if (outside === 0) return [];
	if (asString(getParameters(context).outOfWindowPolicy) === "exclude_and_disclose") return [];
	const windowDescription = captureBounded ? `(origin ${origin} + start ${start}, capture ${upper}] ${windowUnit}` : nestWindow ? `(origin ${origin} + start ${start}, origin ${origin} + stop ${upper}] ${windowUnit}` : `${boundary ?? "[start,stop)"} with start ${start}, stop ${upper} ${windowUnit}`;
	return [require_errors.makeError({
		code: "SCIENCE_EVENT_OUT_OF_WINDOW",
		stage: "science",
		instancePath: require_errors.pointer("data", "eventTimes", "values", firstIndex),
		validatorId: "events.within_window",
		message: `${outside} of ${times.length} events fall outside the declared window ${windowDescription} under ${nestWindow ? "the pinned NEST source-clock projection" : "exact registered-unit comparison"} with the event clock in ${eventUnit}. Widen the window or choose exclude_and_disclose; Cortexel will not quietly ignore an observation you supplied.`
	})];
};
/**
* Bind each source-specific NEST clock declaration to executable mapping profile 5.
* Finite-stop and positive-infinity windows retain distinct shapes, but share the
* same corrected source-bound NEST 3.10.0 time projection. This is an
* internal-consistency check, not an authenticity claim.
*/
function nestSourceClockDeclarationErrors(context) {
	const data = getData(context);
	const window = asRecord(data.window);
	if (!window) return [];
	if (nestWindowKind(window) === void 0) return [];
	const source = asRecord(context.request.source);
	const eventTimes = asRecord(data.eventTimes);
	const version = asString(source?.systemVersion);
	const digest = asString(source?.sourceDigest);
	const captureAuthority = asRecord(window.captureAuthority);
	const runtimeStatus = asRecord(captureAuthority?.runtimeStatus);
	const captureVersion = asString(runtimeStatus?.nestVersion);
	return [
		{
			valid: asString(source?.kind) === "simulation",
			path: ["source", "kind"],
			message: "a NEST origin-relative event clock requires source.kind = simulation."
		},
		{
			valid: asString(source?.system) === "NEST",
			path: ["source", "system"],
			message: "a NEST origin-relative event clock requires source.system = NEST exactly."
		},
		{
			valid: version === "3.10.0",
			path: ["source", "systemVersion"],
			message: "executable mapping profile 5 admits only the exact pinned NEST 3.10.0 runtime declaration."
		},
		{
			valid: captureVersion === version,
			path: [
				"data",
				"window",
				"captureAuthority",
				"runtimeStatus",
				"nestVersion"
			],
			message: "the capture-authority runtime version must exactly equal source.systemVersion."
		},
		{
			valid: asString(runtimeStatus?.timeBuildProfile) === "nest_3_10_time_tic_int64_long_int64_binary64_rne_no_excess_v1",
			path: [
				"data",
				"window",
				"captureAuthority",
				"runtimeStatus",
				"timeBuildProfile"
			],
			message: "mapping revision 5 admits only the caller-declared LP64/int64 NEST 3.10.0 binary64 roundTiesToEven, stored-operation, no-excess-precision time build profile. R049 must independently establish the runtime rounding mode and toolchain flags."
		},
		{
			valid: digest !== void 0 && /^sha256:[0-9a-f]{64}$/u.test(digest),
			path: ["source", "sourceDigest"],
			message: "the exported recorder object must be bound by a full lowercase sha256: sourceDigest."
		},
		{
			valid: asString(window.recordingBackend) === "memory",
			path: [
				"data",
				"window",
				"recordingBackend"
			],
			message: "executable mapping profile 5 admits only the NEST memory recording backend."
		},
		{
			valid: asString(window.timeEncoding) === "native_binary64_ms",
			path: [
				"data",
				"window",
				"timeEncoding"
			],
			message: "executable mapping profile 5 admits only native_binary64_ms (time_in_steps=false), not reconstructed step/offset clocks."
		},
		{
			valid: asString(eventTimes?.unit) === "ms",
			path: [
				"data",
				"eventTimes",
				"unit"
			],
			message: "a NEST native-binary64 memory clock must retain its serialized event unit ms."
		},
		{
			valid: asString(data.timeBase) === "absolute_clock",
			path: ["data", "timeBase"],
			message: "a NEST origin-relative recorder clock is an absolute source clock and cannot be relabelled trial_relative."
		}
	].filter((check) => !check.valid).map((check) => require_errors.makeError({
		code: "PROVENANCE_SOURCE_CLOCK_INCONSISTENT",
		stage: "provenance",
		instancePath: require_errors.pointer(...check.path),
		validatorId: "events.source_clock_declared",
		message: check.message
	}));
}
const eventsSourceClockDeclared = nestSourceClockDeclarationErrors;
/**
* The recorded-sender universe must be declared, and every event must come from it.
*
* This is the rule that stops the most common silent error in population figures.
* The number of neurons that SPIKED is not the number of neurons that were RECORDED.
* A neuron that stayed silent for the whole window was still recorded, and it still
* belongs in the denominator. Inferring the denominator from the event list drops
* exactly those neurons — so the reported rate comes out too HIGH, in the direction
* that makes the result look more interesting. Cortexel refuses to infer it.
*/
const eventsSenderUniverseDeclared = (context) => {
	const data = getData(context);
	const recorded = asArray(data.recordedSenderIds);
	const senders = asArray(data.eventSenderIds);
	if (recorded === void 0) return [];
	if (recorded.length === 0) return [require_errors.makeError({
		code: "SCIENCE_POPULATION_UNIVERSE_REQUIRED",
		stage: "science",
		instancePath: require_errors.pointer("data", "recordedSenderIds"),
		validatorId: "events.sender_universe_declared",
		message: "the recorded-sender universe is empty. A per-neuron rate has no denominator without it, and Cortexel will not count the senders that happened to spike instead — a silent neuron is still a recorded neuron."
	})];
	if (!senders) return [];
	const universe = new Set(recorded.filter((id) => typeof id === "string"));
	return checkReferencesInUniverse(senders, universe, ["data", "eventSenderIds"], "events.sender_universe_declared", "the declared recorded-sender universe");
};
/**
* The trial universe must be declared.
*
* Same failure, different axis: a trial in which nothing happened is still a trial.
* Inferring the trial count from the maximum observed trial id silently drops the
* empty ones, which shrinks the denominator and inflates every per-trial value.
*/
const eventsTrialUniverseDeclared = (context) => {
	const data = getData(context);
	const declaredCount = asNumber(data.trialCount);
	const trialIds = asArray(data.trialIds);
	const eventTrialIds = asArray(data.eventTrialIds);
	if (declaredCount === void 0 && trialIds === void 0) {
		if (eventTrialIds !== void 0) return [require_errors.makeError({
			code: "SCIENCE_TRIAL_UNIVERSE_REQUIRED",
			stage: "science",
			instancePath: require_errors.pointer("data"),
			validatorId: "events.trial_universe_declared",
			message: "events carry trial ids but no trial universe or count was declared. Cortexel does not infer the trial count from the observed ids: a trial with no events is still a trial, and omitting it inflates every per-trial value."
		})];
		return [];
	}
	if (trialIds !== void 0 && eventTrialIds !== void 0) {
		const universe = new Set(trialIds.filter((id) => typeof id === "string"));
		return checkReferencesInUniverse(eventTrialIds, universe, ["data", "eventTrialIds"], "events.trial_universe_declared", "the declared trial universe");
	}
	return [];
};
const rateDenominatorPositive = (context) => {
	const data = getData(context);
	const count = asNumber(data.recordedSenderCount);
	if (count === void 0) return [];
	if (!Number.isSafeInteger(count) || count < 1) return [require_errors.makeError({
		code: "SCIENCE_DENOMINATOR_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("data", "recordedSenderCount"),
		validatorId: "rate.denominator_positive",
		message: `the recorded-sender count must be a positive safe integer; got ${count}. Counts above Number.MAX_SAFE_INTEGER cannot be represented as arbitrary exact JSON integers.`
	})];
	return [];
};
function histogramBinUnitIsIndividuallyLegal(context, binUnit) {
	if (binUnit === void 0 || !require_response_curve_basis.isKnownUnit(binUnit)) return false;
	if (context.skillId === "network.delay_distribution" || context.skillId === "neuro.isi_distribution") return require_response_curve_basis.dimensionOf(binUnit) === "time";
	if (context.skillId !== "network.weight_distribution") return true;
	const data = getData(context);
	if (asString(data.mode) === "prebinned") {
		const dimension = require_response_curve_basis.dimensionOf(binUnit);
		return dimension !== void 0 && require_response_curve_basis.kindAcceptsDimension("synaptic_weight", dimension);
	}
	const connections = asRecord(data.connections);
	const weightUnit = legalKnownUnit(asRecord(connections?.weights));
	return weightUnit !== void 0 && (weightUnit === binUnit || require_response_curve_basis.axesAreCompatible(weightUnit, binUnit));
}
/**
* Histogram normalization must be self-consistent.
*
* `count` must be exact integers. `probability` must sum to 1. `density` must
* INTEGRATE to 1 — that is, sum(value x binWidth) = 1, not sum(value) = 1. The
* difference between those two is the single most common histogram error there is,
* and with unequal bin widths it is invisible in the picture.
*
* An EMPTY histogram normalizes to nothing at all — never to NaN, and never to a
* fabricated flat distribution.
*/
const histogramNormalizationConsistent = (context) => {
	const data = getData(context);
	const parameters = getParameters(context);
	const normalization = asString(parameters.normalization);
	if (!normalization) return [];
	const values = asArray(data.values) ?? asArray(asRecord(data.histogram)?.values);
	const valuesAtHistogram = asArray(asRecord(data.histogram)?.values) !== void 0;
	const edges = asArray(asRecord(data.binEdges)?.edges) ?? resolveBinEdges(asRecord(parameters.bins));
	const binUnit = asString(asRecord(data.binEdges)?.unit) ?? asString(asRecord(parameters.bins)?.unit);
	const legalBinUnit = histogramBinUnitIsIndividuallyLegal(context, binUnit) ? binUnit : void 0;
	const histogramUnit = asString(asRecord(data.histogram)?.unit);
	const legalHistogramUnit = legalKnownUnit(asRecord(data.histogram));
	const valuePath = valuesAtHistogram ? [
		"data",
		"histogram",
		"values"
	] : ["data", "values"];
	if (!values || !edges || values.length === 0) return [];
	if (edges.length !== values.length + 1) return [];
	const errors = [];
	if (normalization === "count") {
		for (let i = 0; i < values.length; i++) {
			const value = asNumber(values[i]);
			if (value === void 0) continue;
			if (!Number.isSafeInteger(value) || value < 0) errors.push(require_errors.makeError({
				code: "SCIENCE_COUNT_NOT_INTEGER",
				stage: "science",
				instancePath: require_errors.pointer(...valuePath, i),
				validatorId: "histogram.normalization_consistent",
				message: `a count must be an exact non-negative integer; got ${value}.`
			}));
		}
		return errors;
	}
	if (normalization === "density" && legalBinUnit !== void 0 && require_response_curve_basis.reciprocalUnit(legalBinUnit) !== void 0 && histogramUnit !== void 0 && legalHistogramUnit !== void 0 && require_response_curve_basis.reciprocalUnit(legalBinUnit) !== legalHistogramUnit) errors.push(require_errors.makeError({
		code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
		stage: "science",
		instancePath: require_errors.pointer("data", "histogram", "unit"),
		validatorId: "histogram.normalization_consistent",
		message: `a density over bins in ${legalBinUnit} must use the registered reciprocal unit ${String(require_response_curve_basis.reciprocalUnit(legalBinUnit))}; got ${histogramUnit}.`
	}));
	const probabilities = [];
	let exactIntegralUnits = 0n;
	let anyValue = false;
	for (let i = 0; i < values.length; i++) {
		const value = asNumber(values[i]);
		if (value === void 0) continue;
		anyValue = true;
		if (value < 0) {
			errors.push(require_errors.makeError({
				code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
				stage: "science",
				instancePath: require_errors.pointer(...valuePath, i),
				validatorId: "histogram.normalization_consistent",
				message: `${normalization} values must be non-negative; got ${value}.`
			}));
			continue;
		}
		if (normalization === "probability") probabilities.push(value);
		else {
			const lo = asNumber(edges[i]);
			const hi = asNumber(edges[i + 1]);
			if (lo === void 0 || hi === void 0) return errors;
			const widthUnits = require_exact_binary64.finiteBinary64ToMinSubnormalUnits(hi) - require_exact_binary64.finiteBinary64ToMinSubnormalUnits(lo);
			exactIntegralUnits += require_exact_binary64.finiteBinary64ToMinSubnormalUnits(value) * widthUnits;
		}
	}
	if (!anyValue) return errors;
	let total;
	try {
		total = normalization === "probability" ? require_exact_binary64.exactBinary64Sum(probabilities) : require_exact_binary64.exactRationalToBinary64(exactIntegralUnits, 1n, -2148);
	} catch {
		errors.push(require_errors.makeError({
			code: normalization === "density" ? "SCIENCE_DENSITY_DOES_NOT_INTEGRATE" : "SCIENCE_NORMALIZATION_UNVERIFIABLE",
			stage: "science",
			instancePath: require_errors.pointer(...valuePath),
			validatorId: "histogram.normalization_consistent",
			message: `the ${normalization} total is outside the finite binary64 range and cannot be verified.`
		}));
		return errors;
	}
	if (Math.abs(total - 1) > 1e-6) errors.push(require_errors.makeError({
		code: normalization === "density" ? "SCIENCE_DENSITY_DOES_NOT_INTEGRATE" : "SCIENCE_NORMALIZATION_UNVERIFIABLE",
		stage: "science",
		instancePath: require_errors.pointer(...valuePath),
		validatorId: "histogram.normalization_consistent",
		message: normalization === "density" ? `a density must integrate to 1 over its bin widths, but sum(value x binWidth) = ${total}. Note that this is NOT the same as sum(value): with unequal bin widths the two differ, and only the integral is the density.` : `a probability histogram must sum to 1, but these values sum to ${total}.`
	}));
	return errors;
};

//#endregion
//#region src/core/semantics/spikes.ts
/**
* ISI, PSTH, and correlogram semantics.
*
* Three analyses, three ways to be confidently wrong:
*
*   ISI — an interval must be formed between two successive events OF THE SAME
*   TRAIN. Sort a mixed multi-neuron event list by time and take differences, and
*   you get a distribution of the intervals between *whichever neurons happened to
*   fire next* — a quantity that has no name because it means nothing. It looks
*   like an ISI distribution. It is shaped like one. It is not one.
*
*   PSTH — the denominator is the number of trials that were RUN, not the number
*   that produced a spike. Inferring it from the data drops the empty trials and
*   inflates the response.
*
*   Correlogram — the lag sign convention, and whether an event is paired with
*   itself, decide what the picture says. A zero-lag peak that is really just every
*   spike counting itself is an artifact that looks exactly like synchrony.
*/
const psthAlignmentDeclared = (context) => {
	const data = getData(context);
	const parameters = getParameters(context);
	const errors = [];
	if ((data.alignmentTimes ?? parameters.alignmentTimes) === void 0) errors.push(require_errors.makeError({
		code: "SCIENCE_TRIAL_UNIVERSE_REQUIRED",
		stage: "science",
		instancePath: require_errors.pointer("data", "alignmentTimes"),
		validatorId: "psth.alignment_declared",
		message: "a PSTH needs an alignment reference per trial. Without it there is nothing for time zero to mean."
	}));
	const trialCount = asNumber(data.trialCount) ?? asArray(data.trialIds)?.length;
	if (trialCount !== void 0 && trialCount < 1) errors.push(require_errors.makeError({
		code: "SCIENCE_DENOMINATOR_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("data", "trialCount"),
		validatorId: "psth.alignment_declared",
		message: "the trial count must be at least 1 to normalize per trial."
	}));
	const alignmentUnit = asString(data.alignmentUnit);
	if (alignmentUnit !== void 0 && require_response_curve_basis.isKnownUnit(alignmentUnit) && require_response_curve_basis.dimensionOf(alignmentUnit) !== "time") errors.push(require_errors.makeError({
		code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
		stage: "science",
		instancePath: require_errors.pointer("data", "alignmentUnit"),
		validatorId: "psth.alignment_declared",
		message: `PSTH alignment times require a registered time unit; got ${alignmentUnit}.`
	}));
	const binUnit = asString(asRecord(parameters.bins)?.unit);
	if (binUnit !== void 0 && require_response_curve_basis.isKnownUnit(binUnit) && require_response_curve_basis.dimensionOf(binUnit) !== "time") errors.push(require_errors.makeError({
		code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "bins", "unit"),
		validatorId: "psth.alignment_declared",
		message: `PSTH bin coordinates require a registered time unit; got ${binUnit}.`
	}));
	return errors;
};
const correlogramLagRangeValid = (context) => {
	const parameters = getParameters(context);
	const errors = [];
	const lagRange = asRecord(parameters.lagRange);
	if (!lagRange) return [];
	const min = asNumber(lagRange.min);
	const max = asNumber(lagRange.max);
	const bins = asRecord(parameters.bins);
	const width = asNumber(bins?.width);
	const lagUnit = asString(lagRange.unit);
	const widthUnit = asString(bins?.unit);
	for (const [path, unit] of [[[
		"parameters",
		"lagRange",
		"unit"
	], lagUnit], [[
		"parameters",
		"bins",
		"unit"
	], widthUnit]]) {
		if (unit === void 0 || !require_response_curve_basis.isKnownUnit(unit) || require_response_curve_basis.dimensionOf(unit) === "time") continue;
		errors.push(require_errors.makeError({
			code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
			stage: "science",
			instancePath: require_errors.pointer(...path),
			validatorId: "correlogram.lag_range_valid",
			message: `correlogram lag coordinates require a registered time unit; got ${unit}.`
		}));
	}
	if (min !== void 0 && max !== void 0 && !(max > min)) errors.push(require_errors.makeError({
		code: "SCIENCE_LAG_RANGE_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "lagRange", "max"),
		validatorId: "correlogram.lag_range_valid",
		message: `the lag range is empty or inverted (min ${min}, max ${max}).`
	}));
	if (width !== void 0 && !(width > 0)) errors.push(require_errors.makeError({
		code: "SCIENCE_LAG_RANGE_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "bins", "width"),
		validatorId: "correlogram.lag_range_valid",
		message: "the correlogram bin width must be positive."
	}));
	if (min !== void 0 && max !== void 0 && width !== void 0 && max > min && width > 0 && lagUnit !== void 0 && widthUnit !== void 0 && require_response_curve_basis.dimensionOf(lagUnit) === "time" && require_response_curve_basis.dimensionOf(widthUnit) === "time") try {
		const widthInLagUnit = widthUnit === lagUnit ? width : require_response_curve_basis.convert(width, widthUnit, lagUnit);
		if (require_response_curve_basis.materializeCenteredLagBins(min, max, widthInLagUnit, 20001).ok) return errors;
		errors.push(require_errors.makeError({
			code: "SCIENCE_LAG_RANGE_INVALID",
			stage: "science",
			instancePath: require_errors.pointer("parameters", "bins", "width"),
			validatorId: "correlogram.lag_range_valid",
			message: "the correlogram lag centres must be symmetric about zero and tauMax/binWidth must be a positive integer producing at most 20001 centred bins with representable half-width outer edges."
		}));
	} catch (error) {
		const detail = error instanceof Error ? error.message : "unit conversion failed";
		errors.push(require_errors.makeError({
			code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
			stage: "science",
			instancePath: require_errors.pointer("parameters", "bins", "unit"),
			validatorId: "correlogram.lag_range_valid",
			message: `the correlogram bin width cannot be compared with the lag range: ${detail}.`
		}));
	}
	return errors;
};
function rawCorrelogramTrains(data) {
	if (data.mode === "events_auto") {
		const train = asRecord(data.train);
		return train ? [{
			path: ["data", "train"],
			value: train
		}] : [];
	}
	if (data.mode === "events_cross") {
		const reference = asRecord(data.referenceTrain);
		const target = asRecord(data.targetTrain);
		return [...reference ? [{
			path: ["data", "referenceTrain"],
			value: reference
		}] : [], ...target ? [{
			path: ["data", "targetTrain"],
			value: target
		}] : []];
	}
	return [];
}
function trainUniverse(data, name) {
	return asArray(asRecord(data[name])?.recordedSenderIds);
}
/**
* Validate each explicitly role-bound raw train without inferring scientific roles.
*
* A silent train has two empty event arrays and a non-empty recorded universe. It is
* still a train. This validator therefore never derives auto/cross from active
* senders, event counts, or array contents: the product discriminator already made
* that decision, and these checks only establish the product's internal facts.
*/
const correlogramEventTrainsValid = (context) => {
	const data = getData(context);
	const trains = rawCorrelogramTrains(data);
	if (trains.length === 0) return [];
	const window = asRecord(data.window);
	const start = asNumber(window?.start);
	const stop = asNumber(window?.stop);
	const windowUnit = asString(window?.unit);
	const boundary = asString(window?.boundary);
	const errors = [];
	for (const train of trains) {
		const at = train.path;
		const eventTimes = asRecord(train.value.eventTimes);
		const times = asArray(eventTimes?.values);
		const timeUnit = legalKnownUnit(eventTimes);
		const senders = asArray(train.value.eventSenderIds);
		const eventIds = asArray(train.value.eventIds);
		const recorded = asArray(train.value.recordedSenderIds);
		if (recorded !== void 0 && recorded.length === 0) errors.push(require_errors.makeError({
			code: "SCIENCE_POPULATION_UNIVERSE_REQUIRED",
			stage: "science",
			instancePath: require_errors.pointer(...at, "recordedSenderIds"),
			validatorId: "correlogram.event_trains_valid",
			message: "a correlogram train must declare at least one recorded sender, including senders that were silent. The event list cannot establish the recorded universe."
		}));
		if (times && senders && times.length !== senders.length) errors.push(require_errors.makeError({
			code: "SEMANTIC_LENGTH_MISMATCH",
			stage: "semantic",
			instancePath: require_errors.pointer(...at, "eventSenderIds"),
			validatorId: "correlogram.event_trains_valid",
			message: `this train has ${times.length} event times but ${senders.length} event sender ids. Every event has exactly one declared sender; Cortexel never truncates or broadcasts either array.`
		}));
		if (times && eventIds && times.length !== eventIds.length) errors.push(require_errors.makeError({
			code: "SEMANTIC_LENGTH_MISMATCH",
			stage: "semantic",
			instancePath: require_errors.pointer(...at, "eventIds"),
			validatorId: "correlogram.event_trains_valid",
			message: `this train has ${times.length} event times but ${eventIds.length} event ids. Optional event identity, when supplied, is parallel to every event rather than a partial annotation.`
		}));
		if (recorded) {
			const universe = /* @__PURE__ */ new Set();
			for (let index = 0; index < recorded.length; index++) {
				const id = recorded[index];
				if (typeof id !== "string") continue;
				if (universe.has(id)) {
					errors.push(require_errors.makeError({
						code: "SEMANTIC_DUPLICATE_ID",
						stage: "semantic",
						instancePath: require_errors.pointer(...at, "recordedSenderIds", index),
						validatorId: "correlogram.event_trains_valid",
						message: `sender id "${id}" appears more than once in this train's complete universe. A sender cannot occupy two denominator positions.`
					}));
					break;
				}
				universe.add(id);
			}
			if (senders) for (let index = 0; index < senders.length; index++) {
				const id = senders[index];
				if (typeof id !== "string" || universe.has(id)) continue;
				errors.push(require_errors.makeError({
					code: "SEMANTIC_UNKNOWN_REFERENCE",
					stage: "semantic",
					instancePath: require_errors.pointer(...at, "eventSenderIds", index),
					validatorId: "correlogram.event_trains_valid",
					message: `event sender "${id}" is not in this train's complete recorded-sender universe. A third sender belongs to a correlogram only through an explicit train universe; Cortexel never assigns it to a role from event order.`
				}));
				break;
			}
		}
		if (eventIds) {
			const seen = /* @__PURE__ */ new Map();
			for (let index = 0; index < eventIds.length; index++) {
				const id = eventIds[index];
				if (typeof id !== "string") continue;
				const first = seen.get(id);
				if (first !== void 0) {
					errors.push(require_errors.makeError({
						code: "SEMANTIC_DUPLICATE_ID",
						stage: "semantic",
						instancePath: require_errors.pointer(...at, "eventIds", index),
						validatorId: "correlogram.event_trains_valid",
						message: `event id "${id}" already identifies event ${first} in this train. Event ids are scoped to one train but must be unique within it, or self-pair identity is ambiguous.`
					}));
					break;
				}
				seen.set(id, index);
			}
		}
		if (!times || start === void 0 || stop === void 0 || windowUnit === void 0 || timeUnit === void 0 || !require_response_curve_basis.isKnownUnit(windowUnit) || require_response_curve_basis.dimensionOf(windowUnit) !== "time" || !(stop > start)) continue;
		const openStart = boundary === "(start,stop]";
		const closedStop = boundary === "[start,stop]" || boundary === "(start,stop]";
		for (let index = 0; index < times.length; index++) {
			const time = asNumber(times[index]);
			if (time === void 0) continue;
			try {
				const lowerVsEvent = require_response_curve_basis.compareExactUnitSumToValue([{
					value: start,
					unit: windowUnit
				}], {
					value: time,
					unit: timeUnit
				});
				const upperVsEvent = require_response_curve_basis.compareExactUnitSumToValue([{
					value: stop,
					unit: windowUnit
				}], {
					value: time,
					unit: timeUnit
				});
				if (!(openStart ? lowerVsEvent >= 0 : lowerVsEvent > 0) && !(closedStop ? upperVsEvent < 0 : upperVsEvent <= 0)) continue;
				errors.push(require_errors.makeError({
					code: "SCIENCE_EVENT_OUT_OF_WINDOW",
					stage: "science",
					instancePath: require_errors.pointer(...at, "eventTimes", "values", index),
					validatorId: "correlogram.event_trains_valid",
					message: `this event lies outside the shared ${boundary ?? "[start,stop)"} window ${start} to ${stop} ${windowUnit}. Raw correlogram numerators and denominators must describe the same observation window; events are never silently dropped.`
				}));
				break;
			} catch (error) {
				const detail = error instanceof Error ? error.message : "unit comparison failed";
				errors.push(require_errors.makeError({
					code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
					stage: "science",
					instancePath: require_errors.pointer(...at, "eventTimes", "unit"),
					validatorId: "correlogram.event_trains_valid",
					message: `this train's event times cannot be compared with the shared observation window: ${detail}.`
				}));
				break;
			}
		}
	}
	return errors;
};
/** Cross roles must remain explicit even when either train has no observed events. */
const correlogramRolesDisjoint = (context) => {
	const data = getData(context);
	const mode = asString(data.mode);
	const universes = mode === "prebinned_auto" ? trainUniverse(data, "train") ? [{
		name: "train",
		value: trainUniverse(data, "train")
	}] : [] : mode === "prebinned_cross" ? [...trainUniverse(data, "referenceTrain") ? [{
		name: "referenceTrain",
		value: trainUniverse(data, "referenceTrain")
	}] : [], ...trainUniverse(data, "targetTrain") ? [{
		name: "targetTrain",
		value: trainUniverse(data, "targetTrain")
	}] : []] : [];
	for (const universe of universes) {
		const seen = /* @__PURE__ */ new Set();
		for (let index = 0; index < universe.value.length; index++) {
			const id = universe.value[index];
			if (typeof id !== "string") continue;
			if (!seen.has(id)) {
				seen.add(id);
				continue;
			}
			return [require_errors.makeError({
				code: "SEMANTIC_DUPLICATE_ID",
				stage: "semantic",
				instancePath: require_errors.pointer("data", universe.name, "recordedSenderIds", index),
				validatorId: "correlogram.roles_disjoint",
				message: `sender "${id}" appears twice in this pre-binned role's complete universe. A sender universe is a set, not a multiplicity-weighted denominator.`
			})];
		}
	}
	if (data.mode !== "events_cross" && data.mode !== "prebinned_cross") return [];
	const reference = asRecord(data.referenceTrain);
	const target = asRecord(data.targetTrain);
	if (!reference || !target) return [];
	const referenceId = asString(reference.trainId);
	const targetId = asString(target.trainId);
	if (referenceId !== void 0 && targetId === referenceId) return [require_errors.makeError({
		code: "SEMANTIC_DUPLICATE_ID",
		stage: "semantic",
		instancePath: require_errors.pointer("data", "targetTrain", "trainId"),
		validatorId: "correlogram.roles_disjoint",
		message: `cross roles both use train id "${referenceId}". Reference and target must be independently named containers; using one identity for both is an autocorrelogram, not a cross-correlogram.`
	})];
	const referenceUniverse = trainUniverse(data, "referenceTrain");
	const targetUniverse = trainUniverse(data, "targetTrain");
	if (!referenceUniverse || !targetUniverse) return [];
	const referenceSet = new Set(referenceUniverse.filter((id) => typeof id === "string"));
	for (let index = 0; index < targetUniverse.length; index++) {
		const id = targetUniverse[index];
		if (typeof id !== "string" || !referenceSet.has(id)) continue;
		return [require_errors.makeError({
			code: "SEMANTIC_DUPLICATE_ID",
			stage: "semantic",
			instancePath: require_errors.pointer("data", "targetTrain", "recordedSenderIds", index),
			validatorId: "correlogram.roles_disjoint",
			message: `sender "${id}" is declared in both cross-role universes. Its own event pairs would add an autocorrelation to a figure labelled cross-correlation, so the roles must be disjoint.`
		})];
	}
	return [];
};
/** Bind a pre-binned payload to the exact centred lag axis it claims to use. */
const correlogramPrebinnedAxisConsistent = (context) => {
	const data = getData(context);
	if (data.mode !== "prebinned_auto" && data.mode !== "prebinned_cross") return [];
	const parameters = getParameters(context);
	const binEdges = asRecord(data.binEdges);
	const edges = asArray(binEdges?.edges);
	const counts = asArray(data.pairCounts);
	const eligible = asArray(data.eligibleReferenceEventCounts);
	const errors = [];
	if (edges && counts && edges.length !== counts.length + 1) errors.push(require_errors.makeError({
		code: "SEMANTIC_LENGTH_MISMATCH",
		stage: "semantic",
		instancePath: require_errors.pointer("data", "pairCounts"),
		validatorId: "correlogram.prebinned_axis_consistent",
		message: `${edges.length} lag edges define ${Math.max(0, edges.length - 1)} bins, but pairCounts has ${counts.length} entries. Every exact numerator belongs to exactly one declared bin.`
	}));
	if (counts && eligible && counts.length !== eligible.length) errors.push(require_errors.makeError({
		code: "SEMANTIC_LENGTH_MISMATCH",
		stage: "semantic",
		instancePath: require_errors.pointer("data", "eligibleReferenceEventCounts"),
		validatorId: "correlogram.prebinned_axis_consistent",
		message: `${counts.length} pair-count bins require ${counts.length} parallel eligible-reference denominators; got ${eligible.length}.`
	}));
	for (const [name, values] of [["pairCounts", counts], ["eligibleReferenceEventCounts", eligible]]) {
		if (!values) continue;
		for (let index = 0; index < values.length; index++) {
			const value = asNumber(values[index]);
			if (value === void 0 || Number.isSafeInteger(value) && value >= 0) continue;
			errors.push(require_errors.makeError({
				code: "SCIENCE_COUNT_NOT_INTEGER",
				stage: "science",
				instancePath: require_errors.pointer("data", name, index),
				validatorId: "correlogram.prebinned_axis_consistent",
				message: `pre-binned count ${String(values[index])} is not an exact non-negative safe integer. A rounded or unsafe numerator/denominator cannot be audited exactly.`
			}));
			break;
		}
	}
	if (!edges || edges.length < 2) return errors;
	const numericEdges = edges.map(asNumber);
	if (!numericEdges.every((value) => value !== void 0)) return errors;
	for (let index = 1; index < numericEdges.length; index++) {
		if (numericEdges[index] > numericEdges[index - 1]) continue;
		errors.push(require_errors.makeError({
			code: "SCIENCE_BIN_EDGES_INVALID",
			stage: "science",
			instancePath: require_errors.pointer("data", "binEdges", "edges", index),
			validatorId: "correlogram.prebinned_axis_consistent",
			message: "pre-binned lag edges must be finite and strictly increasing."
		}));
		return errors;
	}
	const lag = asRecord(parameters.lagRange);
	const bins = asRecord(parameters.bins);
	const min = asNumber(lag?.min);
	const max = asNumber(lag?.max);
	const width = asNumber(bins?.width);
	const lagUnit = asString(lag?.unit);
	const widthUnit = asString(bins?.unit);
	const edgeUnit = asString(binEdges?.unit);
	if (min === void 0 || max === void 0 || width === void 0 || lagUnit === void 0 || widthUnit === void 0 || edgeUnit === void 0) return errors;
	if (!require_response_curve_basis.isKnownUnit(lagUnit) || require_response_curve_basis.dimensionOf(lagUnit) !== "time" || !require_response_curve_basis.isKnownUnit(widthUnit) || require_response_curve_basis.dimensionOf(widthUnit) !== "time" || !require_response_curve_basis.isKnownUnit(edgeUnit)) return errors;
	if (require_response_curve_basis.dimensionOf(edgeUnit) !== "time") {
		errors.push(require_errors.makeError({
			code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
			stage: "science",
			instancePath: require_errors.pointer("data", "binEdges", "unit"),
			validatorId: "correlogram.prebinned_axis_consistent",
			message: `pre-binned correlogram edges require a registered time unit; got ${edgeUnit}.`
		}));
		return errors;
	}
	try {
		const widthInLagUnit = widthUnit === lagUnit ? width : require_response_curve_basis.convert(width, widthUnit, lagUnit);
		const expected = require_response_curve_basis.materializeCenteredLagBins(min, max, widthInLagUnit, 20001);
		if (!expected.ok || expected.edges.length !== numericEdges.length) {
			errors.push(require_errors.makeError({
				code: "SCIENCE_LAG_RANGE_INVALID",
				stage: "science",
				instancePath: require_errors.pointer("data", "binEdges"),
				validatorId: "correlogram.prebinned_axis_consistent",
				message: "the supplied pre-binned edge count does not match the centred lag axis declared by lagRange and bins."
			}));
			return errors;
		}
		for (let index = 0; index < numericEdges.length; index++) {
			const actual = edgeUnit === lagUnit ? numericEdges[index] : require_response_curve_basis.convert(numericEdges[index], edgeUnit, lagUnit);
			if (actual === expected.edges[index] || require_exact_binary64.binary64RelativeDifferenceWithinEpsilons(actual, expected.edges[index], 16)) continue;
			errors.push(require_errors.makeError({
				code: "SCIENCE_LAG_RANGE_INVALID",
				stage: "science",
				instancePath: require_errors.pointer("data", "binEdges", "edges", index),
				validatorId: "correlogram.prebinned_axis_consistent",
				message: `pre-binned edge ${index} converts to ${actual} ${lagUnit}, but the declared centred lag axis requires ${expected.edges[index]} ${lagUnit}. Cortexel will not relabel an existing histogram with a different axis.`
			}));
			break;
		}
	} catch (error) {
		const detail = error instanceof Error ? error.message : "unit conversion failed";
		errors.push(require_errors.makeError({
			code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
			stage: "science",
			instancePath: require_errors.pointer("data", "binEdges", "unit"),
			validatorId: "correlogram.prebinned_axis_consistent",
			message: `the pre-binned lag axis cannot be compared with lagRange and bins: ${detail}.`
		}));
	}
	return errors;
};
/** Bind the closed revision-4 statistic product to exact denominator/accounting laws. */
const correlogramStatisticDenominator = (context) => {
	const parameters = getParameters(context);
	const data = getData(context);
	const statistic = asString(parameters.statistic);
	const edgeCorrection = asString(parameters.edgeCorrection);
	const mode = asString(data.mode);
	const raw = mode === "events_auto" || mode === "events_cross";
	const prebinned = mode === "prebinned_auto" || mode === "prebinned_cross";
	if (statistic !== "raw_pair_count" && statistic !== "target_rate_per_reference_event") return [require_errors.makeError({
		code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "statistic"),
		validatorId: "correlogram.statistic_denominator",
		message: "revision 4 renders only raw_pair_count and target_rate_per_reference_event. An unknown statistic is refused even if a structural gate was skipped."
	})];
	if (statistic === "raw_pair_count" && edgeCorrection !== "none" || statistic === "target_rate_per_reference_event" && edgeCorrection !== "none" && edgeCorrection !== "eligible_reference_events") return [require_errors.makeError({
		code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "edgeCorrection"),
		validatorId: "correlogram.statistic_denominator",
		message: statistic === "raw_pair_count" ? "raw_pair_count has no denominator and requires edgeCorrection `none`." : "target_rate_per_reference_event requires `none` or exact `eligible_reference_events` correction."
	})];
	if (raw) {
		if (data.referenceEventCount !== void 0 || data.targetEventCount !== void 0 || data.eligibleReferenceEventCounts !== void 0) return [require_errors.makeError({
			code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
			stage: "science",
			instancePath: data.referenceEventCount !== void 0 ? require_errors.pointer("data", "referenceEventCount") : data.targetEventCount !== void 0 ? require_errors.pointer("data", "targetEventCount") : require_errors.pointer("data", "eligibleReferenceEventCounts"),
			validatorId: "correlogram.statistic_denominator",
			message: "raw role counts and eligible-reference counts are derived from the explicit event arrays. A caller-supplied duplicate count would create a second authority."
		})];
		return [];
	}
	if (!prebinned) return [];
	const pairCounts = asArray(data.pairCounts);
	const referenceCount = asNumber(data.referenceEventCount);
	const targetCount = mode === "prebinned_auto" ? referenceCount : asNumber(data.targetEventCount);
	for (const [name, count] of [["referenceEventCount", referenceCount], ["targetEventCount", targetCount]]) {
		if (count !== void 0 && Number.isSafeInteger(count) && count >= 0) continue;
		return [require_errors.makeError({
			code: "SCIENCE_DENOMINATOR_INVALID",
			stage: "science",
			instancePath: require_errors.pointer("data", name),
			validatorId: "correlogram.statistic_denominator",
			message: `pre-binned pair accounting requires ${name} as an exact non-negative safe integer, including zero for a completely observed silent role.`
		})];
	}
	if (pairCounts && referenceCount !== void 0 && targetCount !== void 0) {
		const exactCounts = pairCounts.map(asNumber);
		if (exactCounts.every((value) => value !== void 0 && Number.isSafeInteger(value) && value >= 0)) {
			const counted = exactCounts.reduce((sum, value) => sum + BigInt(value), 0n);
			const candidate = BigInt(referenceCount) * BigInt(targetCount);
			const selfPairs = mode === "prebinned_auto" ? BigInt(referenceCount) : 0n;
			if (candidate > BigInt(Number.MAX_SAFE_INTEGER)) return [require_errors.makeError({
				code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
				stage: "science",
				instancePath: require_errors.pointer("data", mode === "prebinned_auto" ? "referenceEventCount" : "targetEventCount"),
				validatorId: "correlogram.statistic_denominator",
				message: "the exact candidate role product exceeds the safe-integer JSON domain, so Cortexel cannot emit an exact pair-accounting receipt."
			})];
			if (counted > candidate - selfPairs) return [require_errors.makeError({
				code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
				stage: "science",
				instancePath: require_errors.pointer("data", "pairCounts"),
				validatorId: "correlogram.statistic_denominator",
				message: `exact pair conservation failed: ${candidate.toString()} candidate ordered pairs minus ${selfPairs.toString()} excluded same-event self-pairs cannot contain ${counted.toString()} counted in-range pairs. The implied out-of-range count would be negative.`
			})];
		}
	}
	const eligible = asArray(data.eligibleReferenceEventCounts);
	if (statistic === "raw_pair_count" || edgeCorrection === "none") {
		if (eligible !== void 0) return [require_errors.makeError({
			code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
			stage: "science",
			instancePath: require_errors.pointer("data", "eligibleReferenceEventCounts"),
			validatorId: "correlogram.statistic_denominator",
			message: statistic === "raw_pair_count" ? "raw_pair_count has no per-bin denominator, so eligibleReferenceEventCounts is a meaningless second authority." : "edgeCorrection `none` uses referenceEventCount for every lag; a parallel eligible-reference array would create two denominator authorities."
		})];
	} else if (!eligible || !pairCounts || eligible.length !== pairCounts.length) return [require_errors.makeError({
		code: "SEMANTIC_LENGTH_MISMATCH",
		stage: "semantic",
		instancePath: require_errors.pointer("data", "eligibleReferenceEventCounts"),
		validatorId: "correlogram.statistic_denominator",
		message: "eligible_reference_events requires one exact eligible-reference denominator per pair-count bin."
	})];
	if (!pairCounts || referenceCount === void 0 || targetCount === void 0) return [];
	for (let index = 0; index < pairCounts.length; index++) {
		const eligibleCount = edgeCorrection === "none" ? referenceCount : asNumber(eligible?.[index]);
		const pairCount = asNumber(pairCounts[index]);
		if (eligibleCount === void 0 || !Number.isSafeInteger(eligibleCount) || eligibleCount < 0) continue;
		if (referenceCount !== void 0 && eligibleCount > referenceCount) return [require_errors.makeError({
			code: "SCIENCE_DENOMINATOR_INVALID",
			stage: "science",
			instancePath: require_errors.pointer("data", "eligibleReferenceEventCounts", index),
			validatorId: "correlogram.statistic_denominator",
			message: `eligible-reference count ${eligibleCount} exceeds the exact reference-event count ${referenceCount}.`
		})];
		if (eligibleCount === 0 && pairCount !== 0) return [require_errors.makeError({
			code: "SCIENCE_DENOMINATOR_INVALID",
			stage: "science",
			instancePath: require_errors.pointer("data", "pairCounts", index),
			validatorId: "correlogram.statistic_denominator",
			message: "a zero eligible-reference denominator can produce no eligible ordered pair. The bin is valid only with pairCount 0 and compiles to null with status undefined_zero_eligible_reference_events."
		})];
		if (pairCount === void 0 || !Number.isSafeInteger(pairCount) || pairCount < 0) continue;
		const targetChoices = mode === "prebinned_auto" ? Math.max(0, targetCount - 1) : targetCount;
		const maximumPairCount = BigInt(eligibleCount) * BigInt(targetChoices);
		if (BigInt(pairCount) > maximumPairCount) {
			const roleExplanation = mode === "prebinned_auto" ? `${targetChoices} distinct target ordinals after same-event self-pair exclusion` : `${targetChoices} target-role events`;
			return [require_errors.makeError({
				code: "SCIENCE_CORRELATION_DENOMINATOR_INVALID",
				stage: "science",
				instancePath: require_errors.pointer("data", "pairCounts", index),
				validatorId: "correlogram.statistic_denominator",
				message: `pre-binned pair count ${pairCount} exceeds the exact per-bin maximum ${maximumPairCount.toString()} = ${eligibleCount} eligible reference events multiplied by ${roleExplanation}. A pre-binned numerator cannot contain more ordered pairs than its declared role cardinalities permit.`
			})];
		}
	}
	return [];
};

//#endregion
//#region src/core/semantics/topology.ts
/**
* Network topology semantics.
*
* The rule this file exists for:
*
*   Under NEST's MPI execution, `GetConnections` on a rank returns the connections
*   whose TARGET that rank owns. So a rank-local snapshot contains every connection
*   INTO its local targets — and therefore supports a complete local IN-degree.
*
*   It does not, and cannot, support an OUT-degree. The connections leaving a local
*   source and arriving at a target owned by another rank live on that other rank.
*   A rank-local out-degree is not "approximately right" or "a subset"; it is a
*   number computed from the wrong set, and the neurons whose targets happen to be
*   remote will appear to have fewer outgoing connections than they have.
*
* Nothing about the data's SHAPE reveals this. The arrays look identical. Only the
* declared scope distinguishes them, which is why scope is mandatory and why it can
* never be inferred.
*/
const topologyScopeDeclared = (context) => {
	const scope = asRecord(getData(context).scope);
	if (scope && asString(scope.kind) !== void 0) return [];
	return [require_errors.makeError({
		code: "SCOPE_REQUIRED",
		stage: "scope",
		instancePath: require_errors.pointer("data", "scope"),
		validatorId: "topology.scope_declared",
		message: "a network figure must declare its scope. A connection snapshot with no scope cannot be interpreted: nothing in the arrays distinguishes a complete network from one rank’s view of it."
	})];
};
/**
* Does the declared scope actually support the claim this figure makes?
*
* This is the check that refuses to draw a global out-degree from a rank-local
* snapshot — the failure that would otherwise be completely invisible.
*/
const topologyScopeSupportsClaim = (context) => {
	const data = getData(context);
	const parameters = getParameters(context);
	const scope = asRecord(data.scope);
	if (!scope) return [];
	const kind = asString(scope.kind);
	const errors = [];
	if (kind === "mpi_target_rank_local") {
		const rank = asNumber(scope.rank);
		const worldSize = asNumber(scope.worldSize);
		if (rank !== void 0 && worldSize !== void 0 && rank >= worldSize) errors.push(require_errors.makeError({
			code: "SCOPE_MERGE_CONFLICT",
			stage: "scope",
			instancePath: require_errors.pointer("data", "scope", "rank"),
			validatorId: "topology.scope_supports_claim",
			message: `rank ${rank} is not valid in a world of size ${worldSize}.`
		}));
		const direction = asString(parameters.direction);
		if (context.skillId === "network.degree_distribution" && direction === "out") errors.push(require_errors.makeError({
			code: "SCOPE_OUT_DEGREE_FROM_RANK_LOCAL",
			stage: "scope",
			instancePath: require_errors.pointer("parameters", "direction"),
			validatorId: "topology.scope_supports_claim",
			message: "an out-degree cannot be computed from a target-rank-local snapshot. This rank holds the connections whose TARGET it owns, so the connections leaving a local source for a remote target are on another rank entirely. In-degree is complete here; out-degree is not merely incomplete, it is computed from the wrong set. Merge every rank and declare global_merged.",
			repair: {
				operation: "replace",
				path: require_errors.pointer("parameters", "direction"),
				value: "in",
				reasonCode: "SCOPE_OUT_DEGREE_FROM_RANK_LOCAL"
			}
		}));
		if (scope.localTargetUniverseComplete === false && context.skillId === "network.degree_distribution") errors.push(require_errors.makeError({
			code: "SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL",
			stage: "scope",
			instancePath: require_errors.pointer("data", "scope", "localTargetUniverseComplete"),
			validatorId: "topology.scope_supports_claim",
			message: "the local target universe is declared incomplete, so even a local in-degree cannot be established: a target with no observed incoming connection may simply not have been captured."
		}));
	}
	if (kind === "global_merged") {
		const worldSize = asNumber(scope.worldSize);
		const merged = asArray(scope.mergedRanks);
		if (worldSize !== void 0 && merged) {
			const numericRanks = merged.filter((rank) => typeof rank === "number" && Number.isSafeInteger(rank));
			const ranks = new Set(numericRanks);
			const inRange = [...ranks].filter((rank) => rank >= 0 && rank < worldSize);
			const outOfRange = [...ranks].filter((rank) => rank < 0 || rank >= worldSize);
			const missingCount = Math.max(0, worldSize - inRange.length);
			if (missingCount > 0) {
				const sorted = inRange.sort((a, b) => a - b);
				const missing = [];
				let expected = 0;
				for (const rank of sorted) {
					while (expected < rank && missing.length < 8) missing.push(expected++);
					expected = rank + 1;
					if (missing.length >= 8) break;
				}
				while (expected < worldSize && missing.length < 8) missing.push(expected++);
				errors.push(require_errors.makeError({
					code: "SCOPE_MERGE_INCOMPLETE",
					stage: "scope",
					instancePath: require_errors.pointer("data", "scope", "mergedRanks"),
					validatorId: "topology.scope_supports_claim",
					message: `this claims a global merge of a ${worldSize}-rank run, but ${missingCount} rank${missingCount === 1 ? " is" : "s are"} missing${missing.length > 0 ? ` (first: ${missing.join(", ")}${missingCount > missing.length ? ", ..." : ""})` : ""}. A partial rank set stays partial; it cannot be upgraded to a global claim by declaring one.`
				}));
			}
			if (ranks.size !== merged.length) errors.push(require_errors.makeError({
				code: "SCOPE_MERGE_CONFLICT",
				stage: "scope",
				instancePath: require_errors.pointer("data", "scope", "mergedRanks"),
				validatorId: "topology.scope_supports_claim",
				message: "a rank appears more than once in the merge. Merging one rank twice would double-count every connection it owns."
			}));
			if (outOfRange.length > 0) errors.push(require_errors.makeError({
				code: "SCOPE_MERGE_CONFLICT",
				stage: "scope",
				instancePath: require_errors.pointer("data", "scope", "mergedRanks"),
				validatorId: "topology.scope_supports_claim",
				message: `${outOfRange.length} merged rank${outOfRange.length === 1 ? " is" : "s are"} outside the valid range 0..${worldSize - 1} (first: ${outOfRange.slice(0, 8).join(", ")}). Extra ranks are a merge conflict, not evidence of global coverage.`
			}));
		}
	}
	if (kind === "sampled") {
		const source = asNumber(scope.sourceConnectionCount);
		const retained = asNumber(scope.retainedConnectionCount);
		if (source !== void 0 && retained !== void 0 && retained > source) errors.push(require_errors.makeError({
			code: "SCOPE_MERGE_CONFLICT",
			stage: "scope",
			instancePath: require_errors.pointer("data", "scope", "retainedConnectionCount"),
			validatorId: "topology.scope_supports_claim",
			message: `a sample cannot retain more connections (${retained}) than its source had (${source}).`
		}));
		if (context.skillId === "network.degree_distribution") errors.push(require_errors.makeError({
			code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
			stage: "scope",
			instancePath: require_errors.pointer("data", "scope", "kind"),
			validatorId: "topology.scope_supports_claim",
			message: "a degree distribution cannot be computed from a sampled snapshot. Sampling removes edges, so every degree it reports is lower than the real one — and by an amount that depends on how the sample was drawn. This is refused rather than disclosed."
		}));
	}
	return errors;
};
/**
* A figure whose meaning depends on isolates must declare its node universe.
*
* An edge list can prove that an edge exists. It can never prove that one does not:
* a node absent from the edge list might have degree zero, or might simply not have
* been mentioned. Those are different facts and only the caller knows which.
*/
const topologyNodeUniverseDeclared = (context) => {
	const data = getData(context);
	const universe = asRecord(data.nodeUniverse);
	if (!universe) return [require_errors.makeError({
		code: "SCOPE_NODE_UNIVERSE_REQUIRED",
		stage: "scope",
		instancePath: require_errors.pointer("data", "nodeUniverse"),
		validatorId: "topology.node_universe_declared",
		message: "this figure needs a declared node universe. An edge list can show that an edge exists but never that one does not: a node missing from it may have degree zero, or may simply not have been listed. Only the caller knows which."
	})];
	if (universe.complete === false) return [require_errors.makeError({
		code: "SCOPE_NODE_UNIVERSE_REQUIRED",
		stage: "scope",
		instancePath: require_errors.pointer("data", "nodeUniverse", "complete"),
		validatorId: "topology.node_universe_declared",
		message: "the node universe is declared incomplete, so no zero-degree or isolate claim can be made from it."
	})];
	return [];
};
const topologyEdgeEndpointsInUniverse = (context) => {
	const data = getData(context);
	const ids = asArray(asRecord(data.nodeUniverse)?.ids);
	const connections = asRecord(data.connections);
	if (!ids || !connections) return [];
	const universe = new Set(ids.filter((id) => typeof id === "string"));
	const errors = [];
	const sources = asArray(connections.sourceIds);
	const targets = asArray(connections.targetIds);
	if (sources) errors.push(...checkReferencesInUniverse(sources, universe, [
		"data",
		"connections",
		"sourceIds"
	], "topology.edge_endpoints_in_universe", "the declared node universe"));
	if (targets) errors.push(...checkReferencesInUniverse(targets, universe, [
		"data",
		"connections",
		"targetIds"
	], "topology.edge_endpoints_in_universe", "the declared node universe"));
	return errors;
};
/**
* When two connections land in one matrix cell, an aggregation must be declared.
*
* A multapse is not a duplicate error — NEST supports multiple connections between
* the same pair, and they are real synapses. `no_aggregation` ASSERTS that there is
* at most one per cell, and fails loudly if that is untrue, rather than quietly
* keeping whichever one happened to be last in the array.
*/
const topologyMultapseAggregationDeclared = (context) => {
	const data = getData(context);
	const parameters = getParameters(context);
	const connections = asRecord(data.connections);
	if (!connections) return [];
	const sources = asArray(connections.sourceIds);
	const targets = asArray(connections.targetIds);
	if (!sources || !targets) return [];
	const aggregation = asString(parameters.multapseAggregation);
	const cells = /* @__PURE__ */ new Map();
	let maxPerCell = 0;
	let exampleCell = "";
	for (let i = 0; i < Math.min(sources.length, targets.length); i++) {
		const source = sources[i];
		const target = targets[i];
		if (typeof source !== "string" || typeof target !== "string") continue;
		const key = `${target}\u0000${source}`;
		const next = (cells.get(key) ?? 0) + 1;
		cells.set(key, next);
		if (next > maxPerCell) {
			maxPerCell = next;
			exampleCell = `target "${target}", source "${source}"`;
		}
	}
	if (maxPerCell <= 1) return [];
	if (aggregation === void 0) return [require_errors.makeError({
		code: "SCIENCE_AGGREGATION_REQUIRED",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "multapseAggregation"),
		validatorId: "topology.multapse_aggregation_declared",
		message: `${maxPerCell} connections map to a single cell (${exampleCell}) and no aggregation was declared. These are multapses — real, distinct synapses — not duplicate rows. Declare sum, mean, min, or max. Cortexel never applies "last edge wins", because which edge is last depends only on array order.`
	})];
	if (aggregation === "no_aggregation") return [require_errors.makeError({
		code: "SCIENCE_AGGREGATION_REQUIRED",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "multapseAggregation"),
		validatorId: "topology.multapse_aggregation_declared",
		message: `"no_aggregation" asserts at most one connection per cell, but ${maxPerCell} connections map to one (${exampleCell}). The assertion is false, so it fails rather than silently discarding ${maxPerCell - 1} real synapses.`
	})];
	return [];
};
/**
* Matrix-only laws that cannot be represented by the closed request schemas alone.
*
* Most importantly, NEST's rank-local SynapseCollection authority is target-owned.
* The edge rows cannot reveal which zero-input targets this rank owns, so the caller
* must declare exactly one owned-target set.  Every returned edge target must belong
* to it; every empty owned row is observed absence; every non-owned row is unknown.
*/
const topologyMatrixContract = (context) => {
	if (context.skillId !== "network.adjacency_matrix" && context.skillId !== "network.weight_matrix" && context.skillId !== "network.delay_matrix") return [];
	const data = getData(context);
	const parameters = getParameters(context);
	const scope = asRecord(data.scope);
	const universeIds = asArray(asRecord(data.nodeUniverse)?.ids);
	const connections = asRecord(data.connections);
	const sourceIds = asArray(connections?.sourceIds);
	const targetIds = asArray(connections?.targetIds);
	if (!scope || !universeIds || !sourceIds || !targetIds) return [];
	const nodeIds = universeIds.filter((value) => typeof value === "string");
	const sources = sourceIds.filter((value) => typeof value === "string");
	const targets = targetIds.filter((value) => typeof value === "string");
	if (nodeIds.length !== universeIds.length || sources.length !== sourceIds.length || targets.length !== targetIds.length) return [];
	const kind = asString(scope.kind);
	const observedRaw = asArray(data.observedTargetIds);
	const observed = observedRaw?.filter((value) => typeof value === "string");
	const errors = [];
	if (kind === "mpi_target_rank_local") {
		if (scope.localTargetUniverseComplete !== true) errors.push(require_errors.makeError({
			code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
			stage: "scope",
			instancePath: require_errors.pointer("data", "scope", "localTargetUniverseComplete"),
			validatorId: "topology.matrix_contract",
			message: "a rank-local matrix requires localTargetUniverseComplete: true. Otherwise even an owned target cell may be missing multapses, so multiplicity, weight, and delay aggregates are not established."
		}));
		if (!observed || observed.length !== (observedRaw?.length ?? 0)) errors.push(require_errors.makeError({
			code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
			stage: "scope",
			instancePath: require_errors.pointer("data", "observedTargetIds"),
			validatorId: "topology.matrix_contract",
			message: "a target-rank-local matrix requires the exact observedTargetIds set owned by this rank. The set may be empty; connection rows cannot reveal a locally owned target with zero incoming connections."
		}));
		else {
			const universe = new Set(nodeIds);
			const owned = new Set(observed);
			for (let index = 0; index < observed.length && errors.length < 8; index++) if (!universe.has(observed[index])) errors.push(require_errors.makeError({
				code: "SEMANTIC_UNKNOWN_REFERENCE",
				stage: "semantic",
				instancePath: require_errors.pointer("data", "observedTargetIds", index),
				validatorId: "topology.matrix_contract",
				message: "an observed target is outside the declared ordered node universe. Cortexel never extends an axis from an observability claim."
			}));
			for (let index = 0; index < targets.length && errors.length < 8; index++) if (!owned.has(targets[index])) errors.push(require_errors.makeError({
				code: "SCOPE_MERGE_CONFLICT",
				stage: "scope",
				instancePath: require_errors.pointer("data", "connections", "targetIds", index),
				validatorId: "topology.matrix_contract",
				message: "a connection returned by a target-rank-local snapshot targets a node not declared as owned by this rank. The connection rows and target-ownership authority contradict each other."
			}));
		}
	} else if (observedRaw !== void 0) errors.push(require_errors.makeError({
		code: "SCOPE_MERGE_CONFLICT",
		stage: "scope",
		instancePath: require_errors.pointer("data", "observedTargetIds"),
		validatorId: "topology.matrix_contract",
		message: "observedTargetIds is legal only for mpi_target_rank_local. Complete scopes derive every row as observed; sampled scope derives no empty row as observed, so a second caller-authored set would create conflicting authority."
	}));
	if (kind === "sampled") {
		const retained = asNumber(scope.retainedConnectionCount);
		if (retained !== void 0 && retained !== sources.length) errors.push(require_errors.makeError({
			code: "SCOPE_MERGE_CONFLICT",
			stage: "scope",
			instancePath: require_errors.pointer("data", "scope", "retainedConnectionCount"),
			validatorId: "topology.matrix_contract",
			message: `the sampled scope says it retained ${retained} connections, but the request contains ${sources.length} connection rows. The redundant conservation claim must agree exactly.`
		}));
		if (context.skillId !== "network.adjacency_matrix" || asString(parameters.cellMode) !== "binary_presence") errors.push(require_errors.makeError({
			code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
			stage: "scope",
			instancePath: require_errors.pointer("data", "scope", "kind"),
			validatorId: "topology.matrix_contract",
			message: "a sample can prove that a retained connection exists, but cannot establish a cell multiplicity or a complete weight/delay aggregate. Only adjacency binary_presence accepts sampled scope."
		}));
		if (context.skillId === "network.adjacency_matrix" && asString(parameters.multapseAggregation) !== "sum") errors.push(require_errors.makeError({
			code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
			stage: "scope",
			instancePath: require_errors.pointer("parameters", "multapseAggregation"),
			validatorId: "topology.matrix_contract",
			message: "sampled binary presence requires sum over retained rows. no_aggregation would claim that the full network cell has at most one connection, which an incomplete sample cannot establish even when it retained only one row."
		}));
	}
	if (context.skillId === "network.adjacency_matrix") {
		const aggregation = asString(parameters.multapseAggregation);
		if (aggregation !== "sum" && aggregation !== "no_aggregation") errors.push(require_errors.makeError({
			code: "SCIENCE_AGGREGATION_REQUIRED",
			stage: "science",
			instancePath: require_errors.pointer("parameters", "multapseAggregation"),
			validatorId: "topology.matrix_contract",
			message: "adjacency accepts only sum (exact connection-row multiplicity, with binary paint clamped to presence) or no_aggregation (an assertion of at most one row per cell). Mean, min, and max would be accepted fields with no distinct scientific role."
		}));
	}
	if (context.skillId === "network.weight_matrix") {
		const colorScale = asRecord(parameters.colorScale);
		const center = asNumber(colorScale?.center);
		const weightsRaw = asArray(asRecord(connections?.weights)?.values);
		const aggregation = asString(parameters.multapseAggregation);
		const edgeIdsRaw = asArray(connections?.edgeIds);
		const modelsRaw = asArray(connections?.synapseModels);
		const edgeIds = edgeIdsRaw?.filter((value) => typeof value === "string");
		const models = modelsRaw?.filter((value) => typeof value === "string");
		const weights = weightsRaw?.filter((value) => value === null || typeof value === "number" && Number.isFinite(value));
		const supportedAggregation = aggregation === "sum" || aggregation === "mean" || aggregation === "min" || aggregation === "max" || aggregation === "no_aggregation";
		if (weights && weights.length === (weightsRaw?.length ?? -1) && supportedAggregation && sources.length === targets.length && weights.length === sources.length && (!edgeIdsRaw || edgeIds?.length === edgeIdsRaw.length) && (!modelsRaw || models?.length === modelsRaw.length)) {
			const matrixInput = {
				nodeIds,
				sourceIds: sources,
				targetIds: targets,
				...edgeIds ? { edgeIds } : {},
				...models ? { synapseModels: models } : {},
				scope,
				...observed ? { observedTargetIds: observed } : {}
			};
			try {
				const matrix = require_structural_validator.deriveWeightMatrix(matrixInput, weights, aggregation);
				if (asString(colorScale?.class) === "diverging" && center !== void 0) {
					const aggregates = matrix.presentCells.flatMap((cell) => cell.aggregate === null ? [] : [cell.aggregate]);
					if (!aggregates.some((value) => value < center) || !aggregates.some((value) => value > center)) errors.push(require_errors.makeError({
						code: "RENDER_DIVERGING_SCALE_NO_CENTER",
						stage: "render",
						instancePath: require_errors.pointer("parameters", "colorScale", "center"),
						validatorId: "topology.matrix_contract",
						message: "the complete valued cell aggregates do not lie strictly on both sides of the declared diverging centre. A hidden raw contributor on the other side cannot justify a two-sided colour claim when the painted aggregates are one-sided."
					}));
				}
			} catch (error) {
				if (!(error instanceof require_structural_validator.MatrixDerivationError)) throw error;
				if (error.code === "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE" || error.code === "SCIENCE_AGGREGATION_REQUIRED") errors.push(require_errors.makeError({
					code: error.code,
					stage: "science",
					instancePath: error.code === "SCIENCE_AGGREGATION_REQUIRED" ? require_errors.pointer("parameters", "multapseAggregation") : require_errors.pointer("data", "connections", "weights", "values"),
					validatorId: "topology.matrix_contract",
					message: error.code === "SCIENCE_AGGREGATION_REQUIRED" ? error.message : `the requested cell aggregate is not representable as finite binary64: ${error.message}`
				}));
			}
		}
	}
	return errors;
};
/** Both spatial axes must carry the same dimension, or an equal aspect ratio is a lie. */
const spatialEqualAxisUnits = (context) => {
	const positions = asRecord(getData(context).positions);
	if (!positions) return [];
	const xUnit = legalKnownUnit(asRecord(positions.x));
	const yUnit = legalKnownUnit(asRecord(positions.y));
	if (!xUnit || !yUnit) return [];
	if (!require_response_curve_basis.axesAreCompatible(xUnit, yUnit)) return [require_errors.makeError({
		code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
		stage: "science",
		instancePath: require_errors.pointer("data", "positions", "y", "unit"),
		validatorId: "spatial.equal_axis_units",
		message: `the x axis is in "${xUnit}" and the y axis in "${yUnit}". A spatial map is drawn with one equal scale on both axes; if they are not the same dimension, the distances on the page mean nothing.`
	})];
	return [];
};
/** Positions cover exactly the universe, whose optional groups form a disjoint subpartition. */
const spatialPositionCoverageComplete = (context) => {
	const data = getData(context);
	const nodeUniverse = asRecord(data.nodeUniverse);
	const ids = asArray(nodeUniverse?.ids);
	const positions = asRecord(data.positions);
	if (!ids || !positions) return [];
	const positionIds = asArray(positions.nodeIds);
	const xs = asArray(asRecord(positions.x)?.values);
	if (!positionIds || !xs) return [];
	if (positionIds.length !== xs.length) return [];
	const universe = new Set(ids.filter((id) => typeof id === "string"));
	const errors = checkReferencesInUniverse(positionIds, universe, [
		"data",
		"positions",
		"nodeIds"
	], "spatial.position_coverage_complete", "the declared node universe");
	const positioned = new Set(positionIds.filter((id) => typeof id === "string"));
	const missing = ids.filter((id) => typeof id === "string" && !positioned.has(id));
	if (missing.length > 0) errors.push(require_errors.makeError({
		code: "SCOPE_POSITION_COVERAGE_INCOMPLETE",
		stage: "scope",
		instancePath: require_errors.pointer("data", "positions", "nodeIds"),
		validatorId: "spatial.position_coverage_complete",
		message: `${missing.length} of ${ids.length} nodes in the universe have no declared position (for example "${String(missing[0])}"). Supply them, or narrow the selection. A node with no position is never placed at the origin — that would invent a measurement.`
	}));
	const groups = asArray(nodeUniverse?.groups);
	if (!groups) return errors;
	const seenGroupIds = /* @__PURE__ */ new Map();
	const memberGroup = /* @__PURE__ */ new Map();
	for (let groupIndex = 0; groupIndex < groups.length && errors.length < 16; groupIndex++) {
		const group = asRecord(groups[groupIndex]);
		if (!group) continue;
		const groupId = asString(group.id);
		if (groupId !== void 0) {
			const firstGroupIndex = seenGroupIds.get(groupId);
			if (firstGroupIndex !== void 0) errors.push(require_errors.makeError({
				code: "SEMANTIC_DUPLICATE_ID",
				stage: "semantic",
				instancePath: require_errors.pointer("data", "nodeUniverse", "groups", groupIndex, "id"),
				validatorId: "spatial.position_coverage_complete",
				message: `group id "${groupId}" already appears at group index ${firstGroupIndex}. Group order, legend identity, and marker styling require unique group ids.`
			}));
			else seenGroupIds.set(groupId, groupIndex);
		}
		const members = asArray(group.memberIds);
		if (!members) continue;
		for (let memberIndex = 0; memberIndex < members.length && errors.length < 16; memberIndex++) {
			const member = members[memberIndex];
			if (typeof member !== "string") continue;
			const memberPath = require_errors.pointer("data", "nodeUniverse", "groups", groupIndex, "memberIds", memberIndex);
			if (!universe.has(member)) {
				errors.push(require_errors.makeError({
					code: "SEMANTIC_UNKNOWN_REFERENCE",
					stage: "semantic",
					instancePath: memberPath,
					validatorId: "spatial.position_coverage_complete",
					message: `group ${JSON.stringify(groupId)} names node "${member}", which is outside the declared node universe. Groups partition that universe; they never extend it.`
				}));
				continue;
			}
			const previous = memberGroup.get(member);
			if (previous) errors.push(require_errors.makeError({
				code: "SEMANTIC_DUPLICATE_ID",
				stage: "semantic",
				instancePath: memberPath,
				validatorId: "spatial.position_coverage_complete",
				message: previous.groupIndex === groupIndex ? `node "${member}" is repeated within group ${JSON.stringify(groupId)}. One group membership is one identity binding, not a multiplicity.` : `node "${member}" belongs to both group ${JSON.stringify(previous.groupId)} and group ${JSON.stringify(groupId)}. Group colour, marker shape, and legend membership require disjoint groups.`
			}));
			else if (groupId !== void 0) memberGroup.set(member, {
				groupId,
				groupIndex
			});
		}
	}
	return errors;
};

//#endregion
//#region src/core/semantics/distributions.ts
/**
* Stable distribution contracts whose accepted product branches need more than a
* generic shape check.
*
* Each wrapper delegates arithmetic to `src/analysis/distributions.ts`. The semantic
* layer only binds request fields to that independent kernel and translates a failed
* invariant into a bounded Cortexel diagnostic. This separation keeps the renderer
* from becoming the authority for the science it displays.
*/
function stringArray(value) {
	const array = asArray(value);
	if (!array || !array.every((entry) => typeof entry === "string")) return void 0;
	return array;
}
function numberArray(value) {
	const array = asArray(value);
	if (!array || !array.every((entry) => typeof entry === "number" && Number.isFinite(entry))) return void 0;
	return array;
}
function nullableNumberArray(value) {
	const array = asArray(value);
	if (!array || !array.every((entry) => entry === null || typeof entry === "number" && Number.isFinite(entry))) return void 0;
	return array;
}
function stageForCode(code) {
	if (code.startsWith("SEMANTIC_")) return "semantic";
	if (code.startsWith("SCOPE_")) return "scope";
	if (code.startsWith("RESOURCE_")) return "budget";
	if (code.startsWith("RENDER_")) return "render";
	return "science";
}
function fromDerivationError(error, validatorId, base = []) {
	if (!(error instanceof require_structural_validator.DistributionDerivationError)) {
		const detail = error instanceof Error ? error.message : "unknown arithmetic failure";
		return [require_errors.makeError({
			code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
			stage: "science",
			instancePath: require_errors.pointer(...base),
			validatorId,
			message: `the exact distribution derivation could not be completed (${detail}).`
		})];
	}
	return [require_errors.makeError({
		code: error.code,
		stage: stageForCode(error.code),
		instancePath: require_errors.pointer(...base, ...error.path),
		validatorId,
		message: error.message
	})];
}
function resolveBins(spec, defaultFinalEdgeInclusive) {
	if (!spec) return void 0;
	const mode = asString(spec.mode);
	const unit = asString(spec.unit);
	if (!unit) return void 0;
	let edges;
	if (mode === "edges") edges = numberArray(spec.edges);
	if (mode === "width") {
		const start = asNumber(spec.start);
		const stop = asNumber(spec.stop);
		const width = asNumber(spec.width);
		if (start === void 0 || stop === void 0 || width === void 0) return void 0;
		const materialized = require_response_curve_basis.materializeWidthBins(start, stop, width);
		if (!materialized.ok) return void 0;
		edges = materialized.edges;
	}
	if (!edges) return void 0;
	return {
		edges,
		unit,
		finalEdgeInclusive: typeof spec.finalEdgeInclusive === "boolean" ? spec.finalEdgeInclusive : defaultFinalEdgeInclusive
	};
}
function exactOuterEdgesMatchWindow(bins, window, validatorId) {
	const start = asNumber(window.start);
	const stop = asNumber(window.stop);
	const unit = asString(window.unit);
	if (start === void 0 || stop === void 0 || !unit || bins.edges.length < 2) return [];
	const errors = [];
	for (const check of [{
		edge: bins.edges[0],
		value: start,
		name: "start",
		ordinal: 0
	}, {
		edge: bins.edges[bins.edges.length - 1],
		value: stop,
		name: "stop",
		ordinal: bins.edges.length - 1
	}]) try {
		if (require_response_curve_basis.compareExactUnitSumToValue([{
			value: check.edge,
			unit: bins.unit
		}], {
			value: check.value,
			unit
		}) !== 0) errors.push(require_errors.makeError({
			code: "SCIENCE_BIN_EDGES_INVALID",
			stage: "science",
			instancePath: require_errors.pointer("parameters", "bins", "edges", check.ordinal),
			validatorId,
			message: `the ${check.name} bin edge must equal the observation-window ${check.name} exactly after registered-unit scaling.`
		}));
	} catch (error) {
		return [require_errors.makeError({
			code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
			stage: "science",
			instancePath: require_errors.pointer("parameters", "bins", "unit"),
			validatorId,
			message: `the bin axis cannot be compared with the observation window (${error instanceof Error ? error.message : "unit failure"}).`
		})];
	}
	return errors;
}
function exactCountSum(values) {
	let total = 0n;
	for (const value of values) {
		if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return void 0;
		total += BigInt(value);
	}
	return total;
}
function countError(validatorId, path, message) {
	return require_errors.makeError({
		code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
		stage: "science",
		instancePath: require_errors.pointer(...path),
		validatorId,
		message
	});
}
/** Revision-2 meaning of the historical rate.verify_normalization validator id. */
const rateVerifyNormalization = (context) => {
	if (context.skillId !== "neuro.population_rate") return [];
	const data = getData(context);
	const parameters = getParameters(context);
	const validatorId = "rate.verify_normalization";
	const errors = [];
	const window = asRecord(data.window);
	if (!window) return [];
	if ((asString(window.boundary) ?? "[start,stop)") !== "[start,stop)") errors.push(require_errors.makeError({
		code: "SCIENCE_WINDOW_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("data", "window", "boundary"),
		validatorId,
		message: "population-rate revision 2 uses exactly the half-open observation window [start,stop)."
	}));
	if (asString(parameters.rateMode) !== "binned_count") {
		errors.push(require_errors.makeError({
			code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
			stage: "science",
			instancePath: require_errors.pointer("parameters", "rateMode"),
			validatorId,
			message: "kernel estimates are not accepted until a kernel, edge policy, table, summary, legend, and geometry are implemented as one contract branch."
		}));
		return errors;
	}
	const mode = asString(data.mode);
	const bins = mode === "events" ? resolveBins(asRecord(parameters.bins), false) : (() => {
		const node = asRecord(data.binEdges);
		const unit = asString(node?.unit);
		const edges = numberArray(node?.edges);
		return unit && edges ? {
			edges,
			unit,
			finalEdgeInclusive: false
		} : void 0;
	})();
	if (!bins) return errors;
	const windowUnit = asString(window.unit);
	if (windowUnit === void 0 || !require_response_curve_basis.isKnownUnit(windowUnit) || require_response_curve_basis.dimensionOf(windowUnit) !== "time" || !require_response_curve_basis.isKnownUnit(bins.unit)) return errors;
	if (require_response_curve_basis.dimensionOf(bins.unit) !== "time") {
		if (mode === "events") errors.push(require_errors.makeError({
			code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
			stage: "science",
			instancePath: require_errors.pointer("parameters", "bins", "unit"),
			validatorId,
			message: `population-rate bin coordinates require a registered time unit; got ${bins.unit}.`
		}));
		return errors;
	}
	if (bins.finalEdgeInclusive) errors.push(require_errors.makeError({
		code: "SCIENCE_BIN_EDGES_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "bins", "finalEdgeInclusive"),
		validatorId,
		message: "population-rate bins tile [start,stop) exactly; an event at stop is outside the window and cannot enter the final bin."
	}));
	errors.push(...exactOuterEdgesMatchWindow(bins, window, validatorId));
	if (errors.length > 0) return errors;
	const normalization = asString(parameters.normalization);
	if (normalization !== "mean_rate_per_recorded_sender" && normalization !== "total_event_rate") return errors;
	if (mode === "events") {
		const eventTimes = asRecord(data.eventTimes);
		const times = numberArray(eventTimes?.values);
		const eventUnit = legalKnownUnit(eventTimes);
		const senders = stringArray(data.eventSenderIds);
		const recorded = stringArray(data.recordedSenderIds);
		if (!times || !eventUnit || !senders || !recorded) return errors;
		if (senders.length !== times.length) return errors;
		const senderSet = new Set(recorded);
		for (let ordinal = 0; ordinal < senders.length; ordinal++) if (!senderSet.has(senders[ordinal])) {
			errors.push(require_errors.makeError({
				code: "SEMANTIC_UNKNOWN_REFERENCE",
				stage: "semantic",
				instancePath: require_errors.pointer("data", "eventSenderIds", ordinal),
				validatorId,
				message: "an event sender is absent from the complete recorded-sender universe."
			}));
			break;
		}
		try {
			require_structural_validator.derivePopulationRateCounts({
				eventTimes: times,
				eventUnit,
				bins,
				recordedSenderCount: recorded.length,
				normalization
			});
		} catch (error) {
			errors.push(...fromDerivationError(error, validatorId, ["data"]));
		}
		return errors;
	}
	if (mode !== "prebinned") return errors;
	const counts = asArray(data.counts);
	const recorded = stringArray(data.recordedSenderIds);
	const recordedCount = asNumber(data.recordedSenderCount);
	const sourceEventCount = asNumber(data.sourceEventCount);
	if (!counts || !recorded || recordedCount === void 0 || sourceEventCount === void 0) return errors;
	if (new Set(recorded).size !== recorded.length) return errors;
	if (!Number.isSafeInteger(recordedCount) || recordedCount !== recorded.length) errors.push(countError(validatorId, ["data", "recordedSenderCount"], `recordedSenderCount ${recordedCount} must equal the complete recordedSenderIds length ${recorded.length}.`));
	const sourceEventCountValid = Number.isSafeInteger(sourceEventCount) && sourceEventCount >= 0;
	if (!sourceEventCountValid) errors.push(require_errors.makeError({
		code: "SCIENCE_COUNT_NOT_INTEGER",
		stage: "science",
		instancePath: require_errors.pointer("data", "sourceEventCount"),
		validatorId,
		message: "sourceEventCount must be an exact non-negative safe integer."
	}));
	if (counts.length !== bins.edges.length - 1) {
		errors.push(require_errors.makeError({
			code: "SEMANTIC_LENGTH_MISMATCH",
			stage: "semantic",
			instancePath: require_errors.pointer("data", "counts"),
			validatorId,
			message: `counts has ${counts.length} entries for ${bins.edges.length - 1} bins.`
		}));
		return errors;
	}
	const sum = exactCountSum(counts);
	if (sum === void 0) {
		errors.push(require_errors.makeError({
			code: "SCIENCE_COUNT_NOT_INTEGER",
			stage: "science",
			instancePath: require_errors.pointer("data", "counts"),
			validatorId,
			message: "every pre-binned event count must be an exact non-negative safe integer."
		}));
		return errors;
	}
	if (sourceEventCountValid && sum !== BigInt(sourceEventCount)) errors.push(countError(validatorId, ["data", "sourceEventCount"], `sum(counts) is ${sum}, not declared in-window sourceEventCount ${sourceEventCount}. No first, middle, or final bin may vanish.`));
	const ratesNode = asRecord(data.rates);
	const rates = numberArray(ratesNode?.values);
	const rateUnit = legalKnownUnit(ratesNode);
	if (rates && rateUnit) if (rates.length !== counts.length) errors.push(require_errors.makeError({
		code: "SEMANTIC_LENGTH_MISMATCH",
		stage: "semantic",
		instancePath: require_errors.pointer("data", "rates", "values"),
		validatorId,
		message: "supplied rate values must be parallel to exact counts."
	}));
	else for (let ordinal = 0; ordinal < rates.length; ordinal++) {
		const count = counts[ordinal];
		if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) continue;
		try {
			const divisor = normalization === "mean_rate_per_recorded_sender" ? recorded.length : 1;
			const expected = require_response_curve_basis.divideExactIntegerByConvertedDifference(count, divisor, bins.edges[ordinal], bins.edges[ordinal + 1], bins.unit, "s");
			const actual = require_response_curve_basis.convert(rates[ordinal], rateUnit, "Hz");
			if (actual === 0 !== (expected === 0) || !require_exact_binary64.binary64RelativeDifferenceWithinTolerance(actual, expected, 1e-9)) {
				errors.push(countError(validatorId, [
					"data",
					"rates",
					"values",
					ordinal
				], `supplied rate does not equal count/exposure for bin ${ordinal}; expected ${expected} Hz.`));
				break;
			}
		} catch (error) {
			errors.push(countError(validatorId, [
				"data",
				"rates",
				"values",
				ordinal
			], `supplied rate could not be verified (${error instanceof Error ? error.message : "numeric failure"}).`));
			break;
		}
	}
	return errors;
};
/** Revision-2 meaning of isi.within_train_only: train authority plus conservation. */
const isiWithinTrainOnly = (context) => {
	if (context.skillId !== "neuro.isi_distribution") return [];
	const data = getData(context);
	const parameters = getParameters(context);
	const validatorId = "isi.within_train_only";
	const window = asRecord(data.window);
	const bins = resolveBins(asRecord(parameters.bins), true);
	const recordedSenderIds = stringArray(data.recordedSenderIds);
	if (!window || !bins || !recordedSenderIds) return [];
	const boundary = asString(window.boundary) ?? "[start,stop)";
	if (boundary !== "[start,stop)") return [require_errors.makeError({
		code: "SCIENCE_WINDOW_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("data", "window", "boundary"),
		validatorId,
		message: "ISI revision 2 forms intervals only from the exact half-open event window [start,stop)."
	})];
	const start = asNumber(window.start);
	const stop = asNumber(window.stop);
	const windowUnit = asString(window.unit);
	if (start === void 0 || stop === void 0 || !windowUnit) return [];
	if (!require_response_curve_basis.isKnownUnit(windowUnit) || require_response_curve_basis.dimensionOf(windowUnit) !== "time" || !require_response_curve_basis.isKnownUnit(bins.unit) || require_response_curve_basis.dimensionOf(bins.unit) !== "time") return [];
	const normalization = asString(parameters.normalization);
	const outOfRangePolicy = asString(parameters.outOfRangeIntervals);
	const zeroIntervalPolicy = asString(parameters.zeroIntervalPolicy);
	if (!normalization || !outOfRangePolicy || !zeroIntervalPolicy) return [require_errors.makeError({
		code: "SCIENCE_ZERO_INTERVAL_POLICY",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "zeroIntervalPolicy"),
		validatorId,
		message: "every ISI request declares how a same-train zero interval is handled."
	})];
	const trialIds = stringArray(data.trialIds);
	try {
		if (asString(data.mode) === "events") {
			const eventTimesNode = asRecord(data.eventTimes);
			const eventTimes = numberArray(eventTimesNode?.values);
			const eventUnit = legalKnownUnit(eventTimesNode);
			const eventSenderIds = stringArray(data.eventSenderIds);
			const eventTrialIds = stringArray(data.eventTrialIds);
			if (!eventTimes || !eventUnit || !eventSenderIds) return [];
			require_structural_validator.deriveIsiFromEvents({
				eventTimes,
				eventSenderIds,
				...eventTrialIds ? { eventTrialIds } : {},
				recordedSenderIds,
				...trialIds ? { trialIds } : {},
				intervalUnit: eventUnit,
				window: {
					start,
					stop,
					unit: windowUnit,
					boundary
				},
				bins,
				normalization,
				zeroIntervalPolicy,
				outOfRangePolicy
			});
			return [];
		}
		if (asString(data.mode) === "intervals") {
			const intervalsNode = asRecord(data.intervals);
			const intervals = numberArray(intervalsNode?.values);
			const intervalUnit = legalKnownUnit(intervalsNode);
			const intervalSenderIds = stringArray(data.intervalSenderIds);
			const intervalTrialIds = stringArray(data.intervalTrialIds);
			const rawTrains = asArray(data.trains);
			if (!intervals || !intervalUnit || !intervalSenderIds || !rawTrains) return [];
			const trains = rawTrains.flatMap((entry) => {
				const train = asRecord(entry);
				const senderId = asString(train?.senderId);
				const trialId = asString(train?.trialId);
				const spikeCount = asNumber(train?.spikeCount);
				return senderId !== void 0 && spikeCount !== void 0 ? [{
					senderId,
					...trialId ? { trialId } : {},
					spikeCount
				}] : [];
			});
			if (trains.length !== rawTrains.length) return [];
			require_structural_validator.deriveIsiFromIntervals({
				intervals,
				intervalSenderIds,
				...intervalTrialIds ? { intervalTrialIds } : {},
				trains,
				recordedSenderIds,
				...trialIds ? { trialIds } : {},
				intervalUnit,
				window: {
					start,
					stop,
					unit: windowUnit,
					boundary
				},
				bins,
				normalization,
				zeroIntervalPolicy,
				outOfRangePolicy
			});
		}
		return [];
	} catch (error) {
		return fromDerivationError(error, validatorId, ["data"]);
	}
};
/**
* Historical narrow entrypoint. The full validator owns the exact composite train
* key; this projection prevents the registry symbol from becoming a misleading
* no-op while avoiding duplicate non-zero-policy diagnostics.
*/
const isiZeroIntervalPolicy = (context) => isiWithinTrainOnly(context).filter((error) => error.code === "SCIENCE_ZERO_INTERVAL_POLICY");
function exactSameSet(left, right) {
	if (left.length !== right.length) return false;
	const rightSet = new Set(right);
	return rightSet.size === right.length && left.every((value) => rightSet.has(value));
}
/** Revision-2 degree validator: policy, universe, scope, and exact incidence identity. */
const degreeCountingPolicyDeclared = (context) => {
	if (context.skillId !== "network.degree_distribution") return [];
	const data = getData(context);
	const parameters = getParameters(context);
	const validatorId = "degree.counting_policy_declared";
	const universe = asRecord(data.nodeUniverse);
	const nodeIds = stringArray(universe?.ids);
	if (!nodeIds) return [];
	const errors = [];
	if (universe?.complete !== true) errors.push(require_errors.makeError({
		code: "SCOPE_NODE_UNIVERSE_REQUIRED",
		stage: "scope",
		instancePath: require_errors.pointer("data", "nodeUniverse", "complete"),
		validatorId,
		message: "degree enumeration requires a complete node universe, including every zero-degree node."
	}));
	const scope = asRecord(data.scope);
	if (asString(scope?.kind) === "mpi_target_rank_local") {
		const observed = stringArray(data.observedTargetIds);
		if (!observed || !exactSameSet(nodeIds, observed)) errors.push(require_errors.makeError({
			code: "SCOPE_LOCAL_CANNOT_CLAIM_GLOBAL",
			stage: "scope",
			instancePath: require_errors.pointer("data", "observedTargetIds"),
			validatorId,
			message: "a rank-local in-degree universe must equal the complete observed target-id authority exactly; silent owned targets cannot disappear."
		}));
	}
	if (asString(scope?.kind) === "sampled") errors.push(require_errors.makeError({
		code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
		stage: "scope",
		instancePath: require_errors.pointer("data", "scope", "kind"),
		validatorId,
		message: "a sampled edge set cannot establish exact degrees."
	}));
	const direction = asString(parameters.direction);
	const countingPolicy = asString(parameters.countingPolicy);
	const autapsePolicy = asString(parameters.autapsePolicy);
	const normalization = asString(parameters.normalization);
	const binning = asRecord(parameters.binning);
	const binningMode = asString(binning?.mode);
	if (!direction || !countingPolicy || !autapsePolicy || !normalization || !binningMode) return errors;
	if (binningMode !== "per_integer_degree") {
		errors.push(require_errors.makeError({
			code: "SCIENCE_BIN_EDGES_INVALID",
			stage: "science",
			instancePath: require_errors.pointer("parameters", "binning", "mode"),
			validatorId,
			message: "revision 2 retains one integer degree per bin so sum(degree × nodeCount) remains independently recoverable from the returned table."
		}));
		return errors;
	}
	try {
		if (asString(data.mode) === "connections") {
			const connections = asRecord(data.connections);
			const sourceIds = stringArray(connections?.sourceIds);
			const targetIds = stringArray(connections?.targetIds);
			if (!sourceIds || !targetIds) return errors;
			require_structural_validator.deriveDegreeDistribution({
				nodeIds,
				sourceIds,
				targetIds,
				direction,
				countingPolicy,
				autapsePolicy,
				binning: { mode: "per_integer_degree" },
				normalization
			});
		} else if (asString(data.mode) === "node_degrees") {
			const supplied = asRecord(data.nodeDegrees);
			const suppliedNodeIds = stringArray(supplied?.nodeIds);
			const suppliedDegrees = numberArray(supplied?.degrees);
			const countedConnectionCount = asNumber(data.countedConnectionCount);
			const countedIncidenceCount = asNumber(data.countedIncidenceCount);
			const excludedAutapseCount = asNumber(data.excludedAutapseCount);
			if (!suppliedNodeIds || !suppliedDegrees || countedConnectionCount === void 0 || countedIncidenceCount === void 0) return errors;
			if (autapsePolicy === "exclude" && excludedAutapseCount === void 0) errors.push(countError(validatorId, ["data", "excludedAutapseCount"], "supplied node degrees under autapse exclusion require the exact removed-row count."));
			if (autapsePolicy === "include" && excludedAutapseCount !== void 0) errors.push(countError(validatorId, ["data", "excludedAutapseCount"], "excludedAutapseCount has no role when autapses are included."));
			require_structural_validator.deriveDegreeDistribution({
				nodeIds,
				suppliedNodeIds,
				suppliedDegrees,
				suppliedCountedConnectionCount: countedConnectionCount,
				suppliedCountedIncidenceCount: countedIncidenceCount,
				...excludedAutapseCount !== void 0 ? { suppliedExcludedAutapseCount: excludedAutapseCount } : {},
				direction,
				countingPolicy,
				autapsePolicy,
				binning: { mode: "per_integer_degree" },
				normalization
			});
		}
	} catch (error) {
		errors.push(...fromDerivationError(error, validatorId, ["data"]));
	}
	return errors;
};
function rankLocalEdgeScopeErrors(input) {
	const data = getData(input.context);
	const scope = asRecord(data.scope);
	const kind = asString(scope?.kind);
	const errors = [];
	if (kind === "mpi_target_rank_local") {
		if (scope?.localTargetUniverseComplete !== true) errors.push(require_errors.makeError({
			code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
			stage: "scope",
			instancePath: require_errors.pointer("data", "scope", "localTargetUniverseComplete"),
			validatorId: input.validatorId,
			message: "a target-rank-local edge distribution requires the complete local target rectangle."
		}));
		const observed = stringArray(data.observedTargetIds);
		if (!observed || observed.length === 0) errors.push(require_errors.makeError({
			code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
			stage: "scope",
			instancePath: require_errors.pointer("data", "observedTargetIds"),
			validatorId: input.validatorId,
			message: "rank-local edge evidence requires a complete non-empty observedTargetIds authority."
		}));
		else {
			if (input.declaredTargets && !exactSameSet(observed, input.declaredTargets)) errors.push(require_errors.makeError({
				code: "SCOPE_MERGE_CONFLICT",
				stage: "scope",
				instancePath: require_errors.pointer("data", "observedTargetIds"),
				validatorId: input.validatorId,
				message: "the declared target selection must equal the target ids this rank says it owns."
			}));
			if (input.allowedTargets) {
				const allowed = new Set(input.allowedTargets);
				const outsideAuthority = observed.findIndex((target) => !allowed.has(target));
				if (outsideAuthority >= 0) errors.push(require_errors.makeError({
					code: "SCOPE_MERGE_CONFLICT",
					stage: "scope",
					instancePath: require_errors.pointer("data", "observedTargetIds", outsideAuthority),
					validatorId: input.validatorId,
					message: "the rank-owned target authority must be contained in the declared endpoint universe."
				}));
			}
			if (input.targetIds) {
				const owned = new Set(observed);
				const outside = input.targetIds.findIndex((target) => !owned.has(target));
				if (outside >= 0) errors.push(require_errors.makeError({
					code: "SCOPE_MERGE_CONFLICT",
					stage: "scope",
					instancePath: require_errors.pointer("data", "connections", "targetIds", outside),
					validatorId: input.validatorId,
					message: "a rank-local connection targets a node absent from this rank’s ownership authority."
				}));
			}
		}
	}
	if (kind === "sampled") {
		const retained = asNumber(scope?.retainedConnectionCount);
		if (retained !== void 0 && retained !== input.consideredConnectionCount) errors.push(countError(input.validatorId, [
			"data",
			"scope",
			"retainedConnectionCount"
		], `sampled scope retained ${retained} rows but the distribution accounts for ${input.consideredConnectionCount}.`));
		if (input.pairAggregation) errors.push(require_errors.makeError({
			code: "SCOPE_INCOMPATIBLE_WITH_SKILL",
			stage: "scope",
			instancePath: require_errors.pointer("data", "scope", "kind"),
			validatorId: input.validatorId,
			message: "a sampled subset cannot establish a complete multapse aggregate for an ordered pair."
		}));
	}
	return errors;
}
function validatePrebinnedAccounting(input) {
	const counts = asArray(input.data.counts);
	const total = asNumber(input.data[input.totalField]);
	const under = asNumber(input.data[input.underField]);
	const over = asNumber(input.data[input.overField]);
	if (!counts || total === void 0 || under === void 0 || over === void 0) return [];
	const errors = [];
	let accountingScalarsValid = true;
	if (counts.length !== input.bins.edges.length - 1) {
		errors.push(require_errors.makeError({
			code: "SEMANTIC_LENGTH_MISMATCH",
			stage: "semantic",
			instancePath: require_errors.pointer("data", "counts"),
			validatorId: input.validatorId,
			message: `counts has ${counts.length} entries for ${input.bins.edges.length - 1} bins.`
		}));
		return errors;
	}
	const countSum = exactCountSum(counts);
	for (const [name, value] of [
		[input.totalField, total],
		[input.underField, under],
		[input.overField, over]
	]) if (!Number.isSafeInteger(value) || value < 0) {
		accountingScalarsValid = false;
		errors.push(require_errors.makeError({
			code: "SCIENCE_COUNT_NOT_INTEGER",
			stage: "science",
			instancePath: require_errors.pointer("data", name),
			validatorId: input.validatorId,
			message: `${name} must be an exact non-negative safe integer.`
		}));
	}
	if (countSum === void 0) {
		errors.push(require_errors.makeError({
			code: "SCIENCE_COUNT_NOT_INTEGER",
			stage: "science",
			instancePath: require_errors.pointer("data", "counts"),
			validatorId: input.validatorId,
			message: "every bin count must be an exact non-negative safe integer."
		}));
		return errors;
	}
	if (!accountingScalarsValid) return errors;
	if (countSum + BigInt(under) + BigInt(over) !== BigInt(total)) errors.push(countError(input.validatorId, ["data", input.totalField], `sum(counts) + ${input.underField} + ${input.overField} must equal ${input.totalField} exactly.`));
	if (asString(input.parameters.outOfRangeDelays ?? input.parameters.outOfRangeWeights) === "reject" && (under !== 0 || over !== 0)) errors.push(require_errors.makeError({
		code: "SCIENCE_BIN_EDGES_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("data", under !== 0 ? input.underField : input.overField),
		validatorId: input.validatorId,
		message: "reject requires every accepted observation to lie inside the declared bin range."
	}));
	const normalization = asString(input.parameters.normalization);
	const histogram = asRecord(input.data.histogram);
	const suppliedValues = numberArray(histogram?.values);
	const expectedKind = normalization === "density" ? "probability_density" : normalization;
	if (histogram && asString(histogram.kind) !== expectedKind) errors.push(countError(input.validatorId, [
		"data",
		"histogram",
		"kind"
	], `histogram.kind must be ${expectedKind} for normalization ${normalization}.`));
	if (suppliedValues && normalization === "count") {
		if (suppliedValues.length !== counts.length || suppliedValues.some((value, ordinal) => value !== counts[ordinal])) errors.push(countError(input.validatorId, [
			"data",
			"histogram",
			"values"
		], "count histogram values must equal the exact raw counts element for element."));
	}
	if (suppliedValues && (normalization === "probability" || normalization === "density")) try {
		const mismatches = require_structural_validator.verifyHistogramValues({
			counts,
			suppliedValues,
			edges: input.bins.edges,
			unit: input.bins.unit,
			normalization
		});
		if (mismatches.length > 0) errors.push(countError(input.validatorId, [
			"data",
			"histogram",
			"values",
			mismatches[0]
		], "supplied normalized value does not follow from its exact count and in-range denominator."));
	} catch (error) {
		errors.push(...fromDerivationError(error, input.validatorId, ["data"]));
	}
	return errors;
}
/** Revision-2 delay validator: positivity plus scope, partition, and conservation. */
const topologyDelayPositive = (context) => {
	if (context.skillId !== "network.delay_distribution") {
		const values = asArray(asRecord(asRecord(getData(context).connections)?.delays)?.values);
		if (!values) return [];
		const invalid = values.findIndex((value) => value !== null && (typeof value !== "number" || !Number.isFinite(value) || !(value > 0)));
		return invalid < 0 ? [] : [require_errors.makeError({
			code: "SCIENCE_DELAY_NONPOSITIVE",
			stage: "science",
			instancePath: require_errors.pointer("data", "connections", "delays", "values", invalid),
			validatorId: "topology.delay_positive",
			message: "a delay must be finite and strictly positive."
		})];
	}
	const data = getData(context);
	const parameters = getParameters(context);
	const validatorId = "topology.delay_positive";
	const bins = resolveBins(asRecord(parameters.bins), true);
	if (!bins) return [];
	if (!require_response_curve_basis.isKnownUnit(bins.unit) || require_response_curve_basis.dimensionOf(bins.unit) !== "time") return [];
	const normalization = asString(parameters.normalization);
	const outOfRangePolicy = asString(parameters.outOfRangeDelays);
	const countingPolicy = asString(parameters.countingPolicy);
	if (!normalization || !outOfRangePolicy || !countingPolicy) return [];
	const errors = [];
	if (asString(data.mode) === "connections") {
		const connections = asRecord(data.connections);
		const sourceIds = stringArray(connections?.sourceIds);
		const targetIds = stringArray(connections?.targetIds);
		const delays = numberArray(asRecord(connections?.delays)?.values);
		const delayUnit = legalKnownUnit(asRecord(connections?.delays));
		const nodeIds = stringArray(asRecord(data.nodeUniverse)?.ids);
		const synapseModels = stringArray(connections?.synapseModels);
		const groupBy = asString(data.groupBy);
		const aggregation = asString(parameters.multapseAggregation);
		if (!sourceIds || !targetIds || !delays || !delayUnit || !nodeIds || !groupBy) return [];
		try {
			require_structural_validator.deriveDelayDistribution({
				sourceIds,
				targetIds,
				delayValues: delays,
				delayUnit,
				nodeUniverse: nodeIds,
				...synapseModels ? { synapseModels } : {},
				groupBy,
				countingPolicy,
				...aggregation ? { aggregation } : {},
				bins: {
					...bins,
					edgeToleranceUlps: 8
				},
				normalization,
				outOfRangePolicy
			});
		} catch (error) {
			errors.push(...fromDerivationError(error, validatorId, ["data", "connections"]));
		}
		errors.push(...rankLocalEdgeScopeErrors({
			context,
			validatorId,
			targetIds,
			allowedTargets: nodeIds,
			consideredConnectionCount: sourceIds.length,
			pairAggregation: countingPolicy === "per_ordered_pair"
		}));
		return errors;
	}
	if (asString(data.mode) !== "prebinned") return [];
	errors.push(...validatePrebinnedAccounting({
		data,
		parameters,
		bins,
		validatorId,
		totalField: "totalObservationCount",
		underField: "underRangeCount",
		overField: "overRangeCount"
	}));
	const considered = asNumber(data.consideredConnectionCount);
	const total = asNumber(data.totalObservationCount);
	if (considered !== void 0 && total !== void 0) {
		if (countingPolicy === "per_connection" && considered !== total) errors.push(countError(validatorId, ["data", "totalObservationCount"], "per_connection requires exactly one delay observation per considered connection row."));
		if (countingPolicy === "per_ordered_pair") {
			const pairCount = asNumber(data.consideredOrderedPairCount);
			if (!Number.isSafeInteger(pairCount) || pairCount < 0 || pairCount !== total || pairCount > considered) errors.push(countError(validatorId, ["data", "consideredOrderedPairCount"], "pre-binned per_ordered_pair requires an exact pair count equal to total observations and no greater than considered rows."));
		}
		if (asString(data.groupBy) !== "none") errors.push(countError(validatorId, ["data", "groupBy"], "revision-2 pre-binned delay input has one count vector and therefore supports exactly groupBy: none."));
		errors.push(...rankLocalEdgeScopeErrors({
			context,
			validatorId,
			declaredTargets: stringArray(data.observedTargetIds),
			consideredConnectionCount: considered,
			pairAggregation: countingPolicy === "per_ordered_pair"
		}));
	}
	return errors;
};
function validateWeightZeroAxis(bins, signTreatment, validatorId) {
	const first = bins.edges[0];
	const last = bins.edges[bins.edges.length - 1];
	if (signTreatment === "magnitude" && first < 0) return [require_errors.makeError({
		code: "SCIENCE_BIN_EDGES_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "bins"),
		validatorId,
		message: "magnitude observations are non-negative; a negative bin domain has no accepted role."
	})];
	if (signTreatment === "preserve" && first < 0 && last > 0 && !bins.edges.some((edge) => edge === 0)) return [require_errors.makeError({
		code: "SCIENCE_BIN_EDGES_INVALID",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "bins"),
		validatorId,
		message: "a sign-preserving range that spans zero requires an exact binary64 edge at 0; no bin may conflate negative and non-negative weights."
	})];
	return [];
}
function validateWeightComparability(parameters, models, validatorId) {
	const distinct = [...new Set(models)].sort();
	const claim = asRecord(parameters.weightComparability);
	const mode = asString(claim?.mode);
	if (mode === "single_synapse_model" && distinct.length !== 1) return [require_errors.makeError({
		code: "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "weightComparability"),
		validatorId,
		message: `single_synapse_model was declared but ${distinct.length} distinct models contribute.`
	})];
	if (mode === "declared_comparable_models") {
		const declared = stringArray(claim?.comparableModels);
		if (!declared || new Set(declared).size !== declared.length || !exactSameSet(distinct, declared)) return [require_errors.makeError({
			code: "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
			stage: "science",
			instancePath: require_errors.pointer("parameters", "weightComparability", "comparableModels"),
			validatorId,
			message: "declared comparable models must equal the distinct contributing model set exactly once."
		})];
	}
	if (asString(parameters.grouping) === "by_synapse_model" && distinct.length < 2) return [require_errors.makeError({
		code: "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "grouping"),
		validatorId,
		message: "grouping one model is a redundant second encoding of the ungrouped figure."
	})];
	return [];
}
/** Revision-2 weight validator: comparability plus exact row/observation accounting. */
const topologyWeightGroupCompatible = (context) => {
	if (context.skillId !== "network.weight_distribution") {
		const data = getData(context);
		const models = stringArray(asRecord(data.connections)?.synapseModels);
		if (!models || new Set(models).size <= 1 || asString(getParameters(context).synapseModelGroup)) return [];
		return [require_errors.makeError({
			code: "SCIENCE_WEIGHT_GROUP_INCOMPATIBLE",
			stage: "science",
			instancePath: require_errors.pointer("data", "connections", "synapseModels"),
			validatorId: "topology.weight_group_compatible",
			message: "weights from multiple models require an explicit comparability/group declaration."
		})];
	}
	const data = getData(context);
	const parameters = getParameters(context);
	const validatorId = "topology.weight_group_compatible";
	const mode = asString(data.mode);
	const bins = mode === "connections" ? resolveBins(asRecord(parameters.bins), true) : (() => {
		const node = asRecord(data.binEdges);
		const edges = numberArray(node?.edges);
		const unit = asString(node?.unit);
		return edges && unit ? {
			edges,
			unit,
			finalEdgeInclusive: true
		} : void 0;
	})();
	if (!bins) return [];
	if (!require_response_curve_basis.isKnownUnit(bins.unit)) return [];
	if (mode === "prebinned" && !require_response_curve_basis.kindAcceptsDimension("synaptic_weight", String(require_response_curve_basis.dimensionOf(bins.unit)))) return [];
	const errors = validateWeightZeroAxis(bins, asString(parameters.signTreatment), validatorId);
	const observationUnit = asString(parameters.observationUnit);
	const grouping = asString(parameters.grouping);
	const signTreatment = asString(parameters.signTreatment);
	const normalization = asString(parameters.normalization);
	const outOfRangePolicy = asString(parameters.outOfRangeWeights);
	const aggregation = asString(parameters.aggregation);
	if (!observationUnit || !grouping || !signTreatment || !normalization || !outOfRangePolicy) return errors;
	const sourceUniverseNode = asRecord(data.sourceUniverse);
	const targetUniverseNode = asRecord(data.targetUniverse);
	const sourceUniverse = stringArray(sourceUniverseNode?.ids);
	const targetUniverse = stringArray(targetUniverseNode?.ids);
	if (!sourceUniverse || !targetUniverse) return errors;
	if (sourceUniverseNode?.complete !== true || targetUniverseNode?.complete !== true) errors.push(require_errors.makeError({
		code: "SCOPE_NODE_UNIVERSE_REQUIRED",
		stage: "scope",
		instancePath: require_errors.pointer("data", sourceUniverseNode?.complete !== true ? "sourceUniverse" : "targetUniverse", "complete"),
		validatorId,
		message: "the selected source × target rectangle requires complete declared endpoint universes."
	}));
	if (mode === "connections") {
		const connections = asRecord(data.connections);
		const sourceIds = stringArray(connections?.sourceIds);
		const targetIds = stringArray(connections?.targetIds);
		const weights = nullableNumberArray(asRecord(connections?.weights)?.values);
		const weightUnit = legalKnownUnit(asRecord(connections?.weights));
		const models = stringArray(connections?.synapseModels);
		if (!sourceIds || !targetIds || !weights || !weightUnit || !models) return errors;
		if (!(weightUnit === bins.unit || require_response_curve_basis.axesAreCompatible(weightUnit, bins.unit))) return errors;
		errors.push(...validateWeightComparability(parameters, models, validatorId));
		try {
			const result = require_structural_validator.deriveWeightDistribution({
				sourceIds,
				targetIds,
				weightValues: weights,
				weightUnit,
				sourceUniverse,
				targetUniverse,
				synapseModels: models,
				grouping,
				observationUnit,
				...aggregation ? { aggregation } : {},
				signTreatment,
				bins,
				normalization,
				outOfRangePolicy
			});
			if (asString(parameters.xScale) === "log" && (bins.edges.some((edge) => !(edge > 0)) || result.minimumObservation === null || !(result.minimumObservation > 0))) errors.push(require_errors.makeError({
				code: "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN",
				stage: "render",
				instancePath: require_errors.pointer("parameters", "xScale"),
				validatorId,
				message: "a logarithmic weight axis requires every edge and every formed observation to be strictly positive; missing values are not converted to zero."
			}));
		} catch (error) {
			errors.push(...fromDerivationError(error, validatorId, ["data", "connections"]));
		}
		errors.push(...rankLocalEdgeScopeErrors({
			context,
			validatorId,
			targetIds,
			declaredTargets: targetUniverse,
			consideredConnectionCount: sourceIds.length,
			pairAggregation: observationUnit === "node_pair"
		}));
		return errors;
	}
	if (mode !== "prebinned") return errors;
	const models = stringArray(data.contributingSynapseModels);
	if (models) errors.push(...validateWeightComparability(parameters, models, validatorId));
	if (grouping !== "none") errors.push(countError(validatorId, ["parameters", "grouping"], "revision-2 pre-binned input has one count vector and therefore supports exactly grouping: none."));
	errors.push(...validatePrebinnedAccounting({
		data,
		parameters,
		bins,
		validatorId,
		totalField: "totalObservationCount",
		underField: "excludedUnderRangeCount",
		overField: "excludedOverRangeCount"
	}));
	const sourceConnectionCount = asNumber(data.sourceConnectionCount);
	const missingWeightCount = asNumber(data.missingWeightCount);
	const missingObservationCount = asNumber(data.missingObservationCount);
	const totalObservationCount = asNumber(data.totalObservationCount);
	const zeroWeightCount = asNumber(data.zeroWeightCount);
	if (sourceConnectionCount !== void 0 && missingWeightCount !== void 0 && missingObservationCount !== void 0 && totalObservationCount !== void 0 && zeroWeightCount !== void 0) {
		let accountingScalarsValid = true;
		for (const [name, value] of [
			["sourceConnectionCount", sourceConnectionCount],
			["missingWeightCount", missingWeightCount],
			["missingObservationCount", missingObservationCount],
			["totalObservationCount", totalObservationCount],
			["zeroWeightCount", zeroWeightCount]
		]) if (!Number.isSafeInteger(value) || value < 0) {
			accountingScalarsValid = false;
			errors.push(require_errors.makeError({
				code: "SCIENCE_COUNT_NOT_INTEGER",
				stage: "science",
				instancePath: require_errors.pointer("data", name),
				validatorId,
				message: `${name} must be an exact non-negative safe integer.`
			}));
		}
		if (!accountingScalarsValid) return errors;
		if (zeroWeightCount > totalObservationCount) errors.push(countError(validatorId, ["data", "zeroWeightCount"], "measured-zero observations cannot outnumber all formed observations."));
		if (observationUnit === "synapse") {
			if (missingObservationCount !== missingWeightCount || BigInt(totalObservationCount) + BigInt(missingObservationCount) !== BigInt(sourceConnectionCount)) errors.push(countError(validatorId, ["data", "sourceConnectionCount"], "synapse mode requires missing observations to equal missing rows and every connection to be exactly one measured or missing observation."));
		} else {
			const pairCount = asNumber(data.sourceOrderedPairCount);
			if (!Number.isSafeInteger(pairCount) || pairCount < 0 || BigInt(totalObservationCount) + BigInt(missingObservationCount) !== BigInt(pairCount) || pairCount > sourceConnectionCount || missingObservationCount > missingWeightCount) errors.push(countError(validatorId, ["data", "sourceOrderedPairCount"], "node_pair mode requires exact pair accounting: observed pairs + missing pairs = source ordered pairs <= connection rows."));
		}
		if (asString(parameters.xScale) === "log" && (bins.edges.some((edge) => !(edge > 0)) || zeroWeightCount > 0)) errors.push(require_errors.makeError({
			code: "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN",
			stage: "render",
			instancePath: require_errors.pointer("parameters", "xScale"),
			validatorId,
			message: "a logarithmic axis cannot represent a measured zero or a non-positive bin edge."
		}));
		errors.push(...rankLocalEdgeScopeErrors({
			context,
			validatorId,
			declaredTargets: targetUniverse,
			consideredConnectionCount: sourceConnectionCount,
			pairAggregation: observationUnit === "node_pair"
		}));
	}
	const histogram = asRecord(data.histogram);
	if (histogram) {
		const expectedUnit = normalization === "density" ? require_response_curve_basis.reciprocalUnit(bins.unit) : "1";
		if (expectedUnit === void 0 || asString(histogram.unit) !== expectedUnit) errors.push(require_errors.makeError({
			code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
			stage: "science",
			instancePath: require_errors.pointer("data", "histogram", "unit"),
			validatorId,
			message: `the supplied normalized histogram requires unit ${String(expectedUnit)}.`
		}));
	}
	return errors;
};

//#endregion
//#region src/core/semantics/uncertainty.ts
/**
* Uncertainty, trace, and estimator semantics.
*
* A shaded band is meaningless unless it says what it is. "±error" is not a
* statement — a standard deviation, a standard error, a 95% confidence interval,
* and the observed min–max across an ensemble are four different things that render
* identically and differ by factors that matter.
*
* So `UncertaintyV1` is a closed union in which the method, the level, the basis,
* and the sample count are all structurally required, and there is deliberately no
* generic `{lower, upper, label}` to fall back on.
*
* The rule underneath all of it: Cortexel never CONVERTS one kind of uncertainty
* into another. A standard deviation is not an interval. An ensemble range carries
* no coverage probability. An arbitrary pair of bounds is not a confidence interval
* just because it has a lower and an upper.
*/
function findUncertainty(context) {
	const fromParameters = asRecord(getParameters(context).uncertainty);
	if (fromParameters) return {
		node: fromParameters,
		path: ["parameters", "uncertainty"]
	};
	const fromData = asRecord(getData(context).uncertainty);
	if (fromData) return {
		node: fromData,
		path: ["data", "uncertainty"]
	};
}
/** Validate one already-structural uncertainty carrier at an explicit nested path. */
function validateUncertaintyNode(node, path, validatorId = "uncertainty.valid") {
	const kind = asString(node.kind);
	if (!kind || kind === "none") return [];
	const errors = [];
	const level = asNumber(node.level);
	if (level !== void 0 && !(level > 0 && level < 1)) errors.push(require_errors.makeError({
		code: "SCIENCE_UNCERTAINTY_LEVEL_INVALID",
		stage: "science",
		instancePath: require_errors.pointer(...path, "level"),
		validatorId,
		message: `an interval level must lie strictly in (0, 1); got ${level}. A 95% interval is 0.95, not 95.`
	}));
	if (kind === "standard_deviation" || kind === "standard_error") {
		const values = asArray(node.values);
		if (values) for (let i = 0; i < values.length; i++) {
			const value = values[i];
			if (value === null) continue;
			const numeric = asNumber(value);
			if (numeric !== void 0 && numeric < 0) {
				errors.push(require_errors.makeError({
					code: "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
					stage: "science",
					instancePath: require_errors.pointer(...path, "values", i),
					validatorId,
					message: `a ${kind.replace("_", " ")} cannot be negative; got ${numeric}. It is a distance.`
				}));
				break;
			}
		}
		const sampleCounts = asArray(node.sampleCount);
		if (values && sampleCounts) {
			for (let i = 0; i < Math.min(values.length, sampleCounts.length); i++) if (values[i] === null !== (sampleCounts[i] === null)) {
				errors.push(require_errors.makeError({
					code: "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
					stage: "science",
					instancePath: require_errors.pointer(...path, "sampleCount", i),
					validatorId,
					message: `at index ${i}, ${kind.replace("_", " ")} and sampleCount must be present or missing together. A sample count cannot qualify an absent dispersion, and a dispersion without its required count is incomplete.`
				}));
				break;
			}
		}
	}
	const lower = asArray(node.lower);
	const upper = asArray(node.upper);
	if (lower && upper) if (lower.length !== upper.length) errors.push(require_errors.makeError({
		code: "SEMANTIC_LENGTH_MISMATCH",
		stage: "semantic",
		instancePath: require_errors.pointer(...path, "upper"),
		validatorId,
		message: `the lower bounds have ${lower.length} entries and the upper bounds ${upper.length}. They describe the same points.`
	}));
	else for (let i = 0; i < lower.length; i++) {
		const lo = lower[i];
		const hi = upper[i];
		if (lo === null !== (hi === null)) {
			errors.push(require_errors.makeError({
				code: "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
				stage: "science",
				instancePath: require_errors.pointer(...path, hi === null ? "upper" : "lower", i),
				validatorId,
				message: `at index ${i}, lower and upper uncertainty bounds must be present or missing together. A one-sided value is not the declared two-sided interval.`
			}));
			break;
		}
		if (lo === null) continue;
		const loValue = asNumber(lo);
		const hiValue = asNumber(hi);
		if (loValue !== void 0 && hiValue !== void 0 && loValue > hiValue) {
			errors.push(require_errors.makeError({
				code: "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
				stage: "science",
				instancePath: require_errors.pointer(...path, "lower", i),
				validatorId,
				message: `at index ${i} the lower bound (${loValue}) exceeds the upper bound (${hiValue}).`
			}));
			break;
		}
	}
	const sampleCounts = asArray(node.sampleCount);
	if (lower && upper && sampleCounts) {
		for (let i = 0; i < Math.min(lower.length, upper.length, sampleCounts.length); i++) if ((lower[i] === null && upper[i] === null) !== (sampleCounts[i] === null)) {
			errors.push(require_errors.makeError({
				code: "SCIENCE_UNCERTAINTY_BOUNDS_INVALID",
				stage: "science",
				instancePath: require_errors.pointer(...path, "sampleCount", i),
				validatorId,
				message: `at index ${i}, interval bounds and sampleCount must share one missingness mask. A count cannot qualify an absent interval, and a counted interval cannot omit its count.`
			}));
			break;
		}
	}
	if (sampleCounts) for (let i = 0; i < sampleCounts.length; i++) {
		const count = sampleCounts[i];
		if (count === null) continue;
		const numeric = asNumber(count);
		if (numeric !== void 0 && (!Number.isSafeInteger(numeric) || numeric < 1)) {
			errors.push(require_errors.makeError({
				code: "SCIENCE_UNCERTAINTY_LEVEL_INVALID",
				stage: "science",
				instancePath: require_errors.pointer(...path, "sampleCount", i),
				validatorId,
				message: `a sample count must be a positive safe integer; got ${numeric}. Binary64 cannot preserve exact cardinality outside the safe-integer domain, and an interval estimated from zero samples is not an interval.`
			}));
			break;
		}
	}
	if (kind === "quantile_interval") {
		const lowerQuantile = asNumber(node.lowerQuantile);
		const upperQuantile = asNumber(node.upperQuantile);
		if (lowerQuantile !== void 0 && upperQuantile !== void 0 && !(lowerQuantile < upperQuantile)) errors.push(require_errors.makeError({
			code: "SCIENCE_UNCERTAINTY_LEVEL_INVALID",
			stage: "science",
			instancePath: require_errors.pointer(...path, "upperQuantile"),
			validatorId,
			message: `the lower quantile (${lowerQuantile}) must be below the upper quantile (${upperQuantile}).`
		}));
	}
	return errors;
}
const uncertaintyValid = (context) => {
	const found = findUncertainty(context);
	return found === void 0 ? [] : validateUncertaintyNode(found.node, found.path);
};
/**
* The figure must actually support the uncertainty variant it was handed.
*
* `credible_interval` is intentionally present in the structural vocabulary so a
* request receives a precise scientific refusal instead of being mistaken for a
* typo. No stable 1.0 skill supports it: a credible interval is a statement about a
* posterior, and Artifact 1.0 has neither an attestation input nor an attestation
* verifier. Structural validity can only establish that two arrays have the shape
* of an interval; it cannot establish that a posterior was computed or calibrated.
*/
const uncertaintySupportedVariant = (context) => {
	const found = findUncertainty(context);
	if (!found) return [];
	const { node, path } = found;
	const kind = asString(node.kind);
	if (!kind) return [];
	const catalog = require_catalog.lookupSkillCatalogEntry(context.skillId);
	if (!catalog) return [];
	const supported = catalog.uncertaintySupport;
	const errors = [];
	if (!supported.includes(kind)) errors.push(require_errors.makeError({
		code: "SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL",
		stage: "science",
		instancePath: require_errors.pointer(...path, "kind"),
		validatorId: "uncertainty.supported_variant",
		skillId: context.skillId,
		message: `${context.skillId} cannot render a "${kind}" truthfully. It supports: ${supported.join(", ")}.`
	}));
	return errors;
};
/**
* Duplicate timestamps in one series need an explicit policy.
*
* Last-write-wins would mean the surviving sample depends on array order, which is
* not a scientific criterion. Cortexel makes the caller say what the duplicates mean.
*/
const traceDuplicateTimePolicy = (context) => {
	const data = getData(context);
	const policyNode = getParameters(context).duplicateTimePolicy;
	const policy = asString(policyNode) ?? asString(asRecord(policyNode)?.policy);
	const candidates = [];
	const sharedTimes = asArray(asRecord(data.eventTimes)?.values);
	if (data.timeBase === "shared" && sharedTimes) candidates.push({
		times: sharedTimes,
		label: "the shared time base"
	});
	const series = asArray(data.series);
	if (series) for (let index = 0; index < series.length; index++) {
		const times = asArray(asRecord(asRecord(series[index])?.time)?.values);
		if (times) candidates.push({
			times,
			label: `series ${index}`
		});
	}
	for (const candidate of candidates) {
		const seen = /* @__PURE__ */ new Set();
		for (const time of candidate.times) {
			const value = asNumber(time);
			if (value === void 0) continue;
			if (seen.has(value)) {
				const declaration = policy === void 0 ? "no duplicate-time policy was declared" : `the declared policy is "${policy}", which requires duplicates to be absent`;
				if (policy === "keep_replicates" || policy === "aggregate") return [];
				return [require_errors.makeError({
					code: "SCIENCE_DUPLICATE_TIME_POLICY",
					stage: "science",
					instancePath: require_errors.pointer("parameters", "duplicateTimePolicy"),
					validatorId: "trace.duplicate_time_policy",
					message: `${candidate.label} has more than one sample at t = ${value}, and ${declaration}. Choose keep_replicates, or a named aggregate. Cortexel does not apply last-write-wins, because which sample survives would then depend on array order rather than on anything scientific.`
				})];
			}
			seen.add(value);
		}
	}
	return [];
};
/** Series overlaid on one axis must share a dimension, or the comparison is fictional. */
const traceAxisDimensionCompatible = (context) => {
	const series = asArray(getData(context).series);
	if (!series || series.length < 1) return [];
	const parameters = getParameters(context);
	const layout = asString(parameters.layout);
	if (layout === "small_multiples" || layout === "normalized_overlay") return [];
	const units = [];
	for (let i = 0; i < series.length; i++) {
		const values = asRecord(asRecord(series[i])?.values);
		if (asString(values?.unit) === void 0) continue;
		const unit = legalKnownUnit(values);
		if (unit === void 0) return [];
		units.push({
			unit,
			index: i
		});
	}
	if (units.length < 1) return [];
	const targetUnit = asString(parameters.valueUnit);
	if (targetUnit !== void 0 && require_response_curve_basis.isKnownUnit(targetUnit)) for (const entry of units) {
		if (!require_response_curve_basis.isKnownUnit(entry.unit) || entry.unit === targetUnit || require_response_curve_basis.axesAreCompatible(entry.unit, targetUnit)) continue;
		const simulatorDefined = require_response_curve_basis.dimensionOf(entry.unit) === "simulator_defined" || require_response_curve_basis.dimensionOf(targetUnit) === "simulator_defined";
		return [require_errors.makeError({
			code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
			stage: "science",
			instancePath: require_errors.pointer("parameters", "valueUnit"),
			validatorId: "trace.axis_dimension_compatible",
			message: simulatorDefined ? `valueUnit "${targetUnit}" cannot be a shared display unit for series ${entry.index}: different simulator-defined unit codes have no registered conversion relation.` : `valueUnit "${targetUnit}" cannot display series ${entry.index} in "${entry.unit}" because their registered dimensions differ. A shared axis may convert scale, never physical meaning.`
		})];
	}
	if (units.length < 2) return [];
	const errors = [];
	const first = units[0];
	if (context.skillId === "network.synaptic_weight_trace" && require_response_curve_basis.dimensionOf(first.unit) === "simulator_defined" && units.every((entry) => entry.unit === first.unit)) return [];
	for (const entry of units.slice(1)) if (!require_response_curve_basis.axesAreCompatible(entry.unit, first.unit)) {
		const simulatorDefined = require_response_curve_basis.dimensionOf(entry.unit) === "simulator_defined" || require_response_curve_basis.dimensionOf(first.unit) === "simulator_defined";
		errors.push(require_errors.makeError({
			code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
			stage: "science",
			instancePath: require_errors.pointer("data", "series", entry.index, "values", "unit"),
			validatorId: "trace.axis_dimension_compatible",
			message: simulatorDefined ? `series ${entry.index} and series ${first.index} use simulator-defined units. Even an identical code cannot establish cross-series comparability because its physical meaning depends on the source model. Put each series on its own panel.` : `series ${entry.index} is in "${entry.unit}" but series ${first.index} is in "${first.unit}", and these are different dimensions. Overlaying them on one axis produces something that looks exactly like a comparison and is not one. Use layout "small_multiples".`,
			repair: {
				operation: "replace",
				path: require_errors.pointer("parameters", "layout"),
				value: "small_multiples",
				reasonCode: "SCIENCE_UNIT_DIMENSION_MISMATCH"
			}
		}));
		break;
	}
	return errors;
};
const responseCurveEstimatorDeclared = (context) => {
	const parameters = getParameters(context);
	const data = getData(context);
	const mode = asString(data.mode);
	const carrier = asRecord(mode === "aggregates" ? data.aggregates : data.observations);
	const response = asRecord(carrier?.response);
	const parameterMethod = asString(parameters.responseMethod);
	const responseMethod = asString(response?.method);
	const errors = [];
	let rateAuthority;
	let peakBasisVerification;
	const conditions = asRecord(data.conditions);
	if (asString(conditions?.axis) === "numeric") {
		const inputs = asArray(asRecord(conditions?.input)?.values);
		if (inputs) {
			const seen = /* @__PURE__ */ new Map();
			for (let index = 0; index < inputs.length; index++) {
				const value = asNumber(inputs[index]);
				if (value === void 0) continue;
				if (asString(asRecord(conditions?.input)?.scale) === "log10" && !(value > 0)) {
					errors.push(require_errors.makeError({
						code: "RENDER_LOG_SCALE_NONPOSITIVE_DOMAIN",
						stage: "render",
						instancePath: require_errors.pointer("data", "conditions", "input", "values", index),
						validatorId: "response_curve.estimator_declared",
						message: `a log10 response-curve input axis requires every declared value to be strictly positive; got ${value}.`
					}));
					break;
				}
				const prior = seen.get(value);
				if (prior !== void 0) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_RESPONSE_INPUT_DUPLICATE",
						stage: "science",
						instancePath: require_errors.pointer("data", "conditions", "input", "values", index),
						validatorId: "response_curve.estimator_declared",
						message: `numeric input ${value} is declared by both condition indices ${prior} and ${index}. Overlapping them at one x coordinate would hide which condition owns a point or gap.`
					}));
					break;
				}
				seen.set(value, index);
			}
		}
	}
	if (parameterMethod === void 0) errors.push(require_errors.makeError({
		code: "SEMANTIC_LENGTH_MISMATCH",
		stage: "semantic",
		instancePath: require_errors.pointer("parameters", "responseMethod"),
		validatorId: "response_curve.estimator_declared",
		message: "declare what the response VALUE is — a mean rate, a peak, a latency. It cannot be inferred from the name of the figure, and a curve whose y axis has no defined meaning is not a result."
	}));
	if (responseMethod !== void 0 && parameterMethod !== responseMethod) errors.push(require_errors.makeError({
		code: "SCIENCE_RESPONSE_METHOD_MISMATCH",
		stage: "science",
		instancePath: require_errors.pointer("parameters", "responseMethod"),
		validatorId: "response_curve.estimator_declared",
		message: `parameters.responseMethod is ${JSON.stringify(parameterMethod)} but the response values are typed as ${JSON.stringify(responseMethod)}. Relabelling the same numbers as a different scientific quantity is refused.`
	}));
	const rateResponse = responseMethod === "mean_firing_rate" || responseMethod === "peak_firing_rate";
	const eventScope = require_response_curve_basis.verifyResponseEventScope(data.eventScope);
	if (!eventScope.ok) errors.push(require_errors.makeError({
		code: "SCIENCE_EVENT_SCOPE_UNVERIFIABLE",
		stage: "science",
		instancePath: `/data${eventScope.path}`,
		validatorId: "response_curve.estimator_declared",
		message: eventScope.message
	}));
	if (rateResponse && eventScope.ok) {
		rateAuthority = require_response_curve_basis.verifyResponseRateAuthority(response?.rateNormalization, data.eventScope);
		if (!rateAuthority.ok) {
			const instancePath = rateAuthority.path === "/rateNormalization" ? require_errors.pointer("data", mode === "aggregates" ? "aggregates" : "observations", "response", "rateNormalization") : `/data${rateAuthority.path}`;
			errors.push(require_errors.makeError({
				code: rateAuthority.path.startsWith("/eventScope") ? "SCIENCE_EVENT_SCOPE_UNVERIFIABLE" : "SCIENCE_NORMALIZATION_UNVERIFIABLE",
				stage: "science",
				instancePath,
				validatorId: "response_curve.estimator_declared",
				message: rateAuthority.message
			}));
		}
	}
	if (responseMethod === "peak_firing_rate") {
		peakBasisVerification = require_response_curve_basis.verifyPeakBasisAgainstWindow(response?.basis, data.measurementWindow);
		if (!peakBasisVerification.ok) {
			const responseBase = require_errors.pointer("data", mode === "aggregates" ? "aggregates" : "observations", "response");
			errors.push(require_errors.makeError({
				code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
				stage: "science",
				instancePath: peakBasisVerification.path === "/measurementWindow" ? require_errors.pointer("data", "measurementWindow") : `${responseBase}${peakBasisVerification.path}`,
				validatorId: "response_curve.estimator_declared",
				message: peakBasisVerification.message
			}));
		}
	}
	const values = asArray(response?.values);
	if (responseMethod !== void 0 && values) for (let index = 0; index < values.length; index++) {
		if (values[index] === null) continue;
		const value = asNumber(values[index]);
		if (value === void 0) continue;
		const instancePath = require_errors.pointer("data", mode === "aggregates" ? "aggregates" : "observations", "response", "values", index);
		if ((responseMethod === "mean_firing_rate" || responseMethod === "peak_firing_rate") && value < 0) {
			errors.push(require_errors.makeError({
				code: "SCIENCE_RESPONSE_VALUE_INVALID",
				stage: "science",
				instancePath,
				validatorId: "response_curve.estimator_declared",
				message: `${responseMethod} is a firing rate and cannot be negative; got ${value}. A silent repeat is measured zero, not a negative rate.`
			}));
			break;
		}
		if (responseMethod === "first_spike_latency" && value < 0) {
			errors.push(require_errors.makeError({
				code: "SCIENCE_RESPONSE_VALUE_INVALID",
				stage: "science",
				instancePath,
				validatorId: "response_curve.estimator_declared",
				message: `a defined first-spike latency must be non-negative; got ${value}. Zero means the first event occurred exactly at the included measurement-window start; use null only when no first spike occurred.`
			}));
			break;
		}
		if (responseMethod === "event_count") {
			if (mode === "repeats" && (!Number.isSafeInteger(value) || value < 0)) {
				errors.push(require_errors.makeError({
					code: "SCIENCE_COUNT_NOT_INTEGER",
					stage: "science",
					instancePath,
					validatorId: "response_curve.estimator_declared",
					message: `a raw repeat event count must be an exact non-negative safe integer; got ${value}.`
				}));
				break;
			}
			if (mode === "aggregates" && value < 0) {
				errors.push(require_errors.makeError({
					code: "SCIENCE_RESPONSE_VALUE_INVALID",
					stage: "science",
					instancePath,
					validatorId: "response_curve.estimator_declared",
					message: `an aggregate estimator over event counts may be fractional but cannot be negative; got ${value}.`
				}));
				break;
			}
		}
	}
	if (responseMethod === "first_spike_latency" && asString(response?.latencyReference) !== "measurement_window_start") errors.push(require_errors.makeError({
		code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
		stage: "science",
		instancePath: require_errors.pointer("data", mode === "aggregates" ? "aggregates" : "observations", "response", "latencyReference"),
		validatorId: "response_curve.estimator_declared",
		message: "revision 2 supports first-spike latency only from measurement_window_start; stimulus onset has no typed coordinate relative to the window."
	}));
	if (responseMethod === "first_spike_latency" && asString(response?.latencyReference) === "measurement_window_start" && values) {
		const window = asRecord(data.measurementWindow);
		const windowStart = asNumber(window?.start);
		const windowStop = asNumber(window?.stop);
		const windowUnit = asString(window?.unit);
		const responseUnit = asString(response?.unit);
		if (windowStart !== void 0 && windowStop !== void 0 && windowStop > windowStart && windowUnit !== void 0 && responseUnit !== void 0 && require_response_curve_basis.dimensionOf(windowUnit) === require_response_curve_basis.dimensionOf(responseUnit)) {
			const closedStop = asString(window?.boundary) === "[start,stop]";
			for (let index = 0; index < values.length; index++) {
				if (values[index] === null) continue;
				const latency = asNumber(values[index]);
				if (latency === void 0 || latency < 0) continue;
				const comparison = require_response_curve_basis.compareExactUnitArraySumToDifference([latency], responseUnit, {
					value: windowStart,
					unit: windowUnit
				}, {
					value: windowStop,
					unit: windowUnit
				});
				if (comparison > 0 || comparison === 0 && !closedStop) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_LATENCY_OUTSIDE_WINDOW",
						stage: "science",
						instancePath: require_errors.pointer("data", mode === "aggregates" ? "aggregates" : "observations", "response", "values", index),
						validatorId: "response_curve.estimator_declared",
						message: `first-spike latency ${latency} ${responseUnit} is referenced to the measurement-window start but does not lie inside the declared ${closedStop ? "closed" : "half-open"} window of exact duration (${windowStop} - ${windowStart}) ${windowUnit}.`
					}));
					break;
				}
			}
		}
	}
	if (mode === "aggregates" && values) {
		const sampleCounts = asArray(carrier?.sampleCounts);
		const excludedCounts = asArray(carrier?.excludedCounts);
		const trimmedCounts = asArray(carrier?.trimmedCounts);
		const estimator = asString(parameters.estimator);
		const trimFraction = asNumber(parameters.trimFraction);
		if (estimator === "trimmed_mean" && !trimmedCounts) errors.push(require_errors.makeError({
			code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
			stage: "science",
			instancePath: require_errors.pointer("data", "aggregates", "trimmedCounts"),
			validatorId: "response_curve.estimator_declared",
			message: "trimmed_mean aggregate input must declare how many defined observations were removed symmetrically from the two tails in each condition."
		}));
		else if (estimator !== "trimmed_mean" && carrier?.trimmedCounts !== void 0) errors.push(require_errors.makeError({
			code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
			stage: "science",
			instancePath: require_errors.pointer("data", "aggregates", "trimmedCounts"),
			validatorId: "response_curve.estimator_declared",
			message: "trimmedCounts is an unused scientific claim unless the estimator is trimmed_mean."
		}));
		for (const [field, entries] of [
			["sampleCounts", sampleCounts],
			["excludedCounts", excludedCounts],
			...trimmedCounts ? [["trimmedCounts", trimmedCounts]] : []
		]) if (entries && entries.length !== values.length) errors.push(require_errors.makeError({
			code: "SEMANTIC_LENGTH_MISMATCH",
			stage: "semantic",
			instancePath: require_errors.pointer("data", "aggregates", field),
			validatorId: "response_curve.estimator_declared",
			message: `aggregate response values and ${field} must have identical lengths.`
		}));
		if (sampleCounts && excludedCounts && sampleCounts.length === values.length && excludedCounts.length === values.length && (!trimmedCounts || trimmedCounts.length === values.length)) {
			let retainedTotal = 0n;
			let trimmedTotal = 0n;
			let excludedTotal = 0n;
			const maximum = BigInt(Number.MAX_SAFE_INTEGER);
			for (let index = 0; index < values.length; index++) {
				if (values[index] === null !== (sampleCounts[index] === null)) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
						stage: "science",
						instancePath: require_errors.pointer("data", "aggregates", "sampleCounts", index),
						validatorId: "response_curve.estimator_declared",
						message: `aggregate response and retained sample count must be present or missing together at condition index ${index}. A point cannot have n without an estimate, or an estimate without n.`
					}));
					break;
				}
				const rawSampleCount = sampleCounts[index];
				const sampleCount = rawSampleCount === null ? 0 : asNumber(rawSampleCount);
				const excludedCount = asNumber(excludedCounts[index]);
				const trimmedCount = trimmedCounts ? asNumber(trimmedCounts[index]) : 0;
				let invalidExactCount = false;
				for (const [field, value] of [
					["sampleCounts", sampleCount],
					["excludedCounts", excludedCount],
					["trimmedCounts", trimmedCount]
				]) if (value !== void 0 && (!Number.isSafeInteger(value) || value < 0)) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
						stage: "science",
						instancePath: require_errors.pointer("data", "aggregates", field, index),
						validatorId: "response_curve.estimator_declared",
						message: `${field}[${index}] must be an exact non-negative safe integer for artifact accounting; got ${value}.`
					}));
					invalidExactCount = true;
					break;
				}
				if (invalidExactCount) break;
				if (sampleCount === void 0 || excludedCount === void 0 || trimmedCount === void 0) continue;
				if (trimmedCount % 2 !== 0) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
						stage: "science",
						instancePath: require_errors.pointer("data", "aggregates", "trimmedCounts", index),
						validatorId: "response_curve.estimator_declared",
						message: "a symmetric two-tail trimmed count must be even."
					}));
					break;
				}
				if (rawSampleCount === null && trimmedCount !== 0) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
						stage: "science",
						instancePath: require_errors.pointer("data", "aggregates", "trimmedCounts", index),
						validatorId: "response_curve.estimator_declared",
						message: "a condition with no aggregate estimate cannot claim trimmed defined observations."
					}));
					break;
				}
				const pretrimDefined = sampleCount + trimmedCount;
				const attempted = pretrimDefined + excludedCount;
				if (!Number.isSafeInteger(pretrimDefined) || !Number.isSafeInteger(attempted)) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
						stage: "science",
						instancePath: require_errors.pointer("data", "aggregates"),
						validatorId: "response_curve.estimator_declared",
						message: `condition index ${index} has a pre-trim defined or attempted count outside the exact safe-integer range.`
					}));
					break;
				}
				if (asString(asRecord(parameters.uncertainty)?.reason) === "single_trial" && attempted > 1) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA",
						stage: "science",
						instancePath: require_errors.pointer("parameters", "uncertainty", "reason"),
						validatorId: "response_curve.estimator_declared",
						message: `uncertainty reason single_trial contradicts aggregate condition index ${index}, which declares ${attempted} attempted repeats.`
					}));
					break;
				}
				if (estimator === "trimmed_mean" && trimFraction !== void 0) {
					const expectedTrimmed = 2 * require_exact_binary64.floorExactBinary64TimesSafeInteger(trimFraction, pretrimDefined);
					if (trimmedCount !== expectedTrimmed) {
						errors.push(require_errors.makeError({
							code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
							stage: "science",
							instancePath: require_errors.pointer("data", "aggregates", "trimmedCounts", index),
							validatorId: "response_curve.estimator_declared",
							message: `trimmed count ${trimmedCount} does not equal 2 * floor_exact((${sampleCount} + ${trimmedCount}) * ${trimFraction}) = ${expectedTrimmed}.`
						}));
						break;
					}
				}
				if (responseMethod === "event_count" && values[index] !== null) {
					const estimate = asNumber(values[index]);
					const denominator = estimator === "median" ? sampleCount % 2 === 0 ? 2 : 1 : sampleCount;
					if (estimate !== void 0 && !require_exact_binary64.isRoundedMeanOfSafeNonnegativeIntegers(estimate, denominator)) {
						errors.push(require_errors.makeError({
							code: "SCIENCE_COUNT_ESTIMATOR_INCOHERENT",
							stage: "science",
							instancePath: require_errors.pointer("data", "aggregates", "response", "values", index),
							validatorId: "response_curve.estimator_declared",
							message: `event-count estimate ${estimate} cannot be the correctly rounded ${estimator ?? "declared estimator"} of ${sampleCount} retained exact non-negative safe-integer counts.`
						}));
						break;
					}
				}
				retainedTotal += BigInt(sampleCount);
				trimmedTotal += BigInt(trimmedCount);
				excludedTotal += BigInt(excludedCount);
				if (retainedTotal > maximum || trimmedTotal > maximum || excludedTotal > maximum || retainedTotal + trimmedTotal + excludedTotal > maximum) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
						stage: "science",
						instancePath: require_errors.pointer("data", "aggregates"),
						validatorId: "response_curve.estimator_declared",
						message: "response-curve retained, trimmed, excluded, or attempted totals exceed the exact safe-integer range."
					}));
					break;
				}
			}
		}
	}
	if (mode === "repeats" && values) {
		const audit = asRecord(response?.audit);
		if (responseMethod === "peak_firing_rate" && peakBasisVerification?.ok === true && peakBasisVerification.kind === "binned_count" && rateAuthority?.ok === true) {
			const peakBinCounts = asArray(audit?.peakBinCounts);
			const basis = asRecord(response?.basis);
			const binWidth = asRecord(basis?.binWidth);
			const binWidthValue = asNumber(binWidth?.value);
			const binWidthUnit = asString(binWidth?.unit);
			const rateUnit = asString(response?.unit);
			if (!peakBinCounts) errors.push(require_errors.makeError({
				code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
				stage: "science",
				instancePath: require_errors.pointer("data", "observations", "response", "audit", "peakBinCounts"),
				validatorId: "response_curve.estimator_declared",
				message: "raw binned-count peaks require exact parallel peakBinCounts so repeat rates and condition estimators can be re-derived without mode-dependent rounding."
			}));
			else if (peakBinCounts.length !== values.length) errors.push(require_errors.makeError({
				code: "SEMANTIC_LENGTH_MISMATCH",
				stage: "semantic",
				instancePath: require_errors.pointer("data", "observations", "response", "audit", "peakBinCounts"),
				validatorId: "response_curve.estimator_declared",
				message: "response.audit.peakBinCounts must be parallel to raw binned-peak response values."
			}));
			else if (binWidthValue !== void 0 && binWidthUnit !== void 0 && rateUnit !== void 0) for (let index = 0; index < peakBinCounts.length; index++) {
				const count = peakBinCounts[index];
				const rate = values[index];
				if (count === null !== (rate === null)) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
						stage: "science",
						instancePath: require_errors.pointer("data", "observations", "response", "audit", "peakBinCounts", index),
						validatorId: "response_curve.estimator_declared",
						message: "a peak-bin count must be null exactly where its raw binned-peak rate is null."
					}));
					break;
				}
				const numericCount = count === null ? void 0 : asNumber(count);
				if (numericCount !== void 0 && (!Number.isSafeInteger(numericCount) || numericCount < 0)) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_COUNT_NOT_INTEGER",
						stage: "science",
						instancePath: require_errors.pointer("data", "observations", "response", "audit", "peakBinCounts", index),
						validatorId: "response_curve.estimator_declared",
						message: `peak-bin count ${numericCount} is not an exact non-negative safe integer.`
					}));
					break;
				}
				const numericRate = rate === null ? void 0 : asNumber(rate);
				if (numericCount !== void 0 && numericRate !== void 0) {
					let expectedRate;
					try {
						expectedRate = require_response_curve_basis.deriveExactAggregateCountRateInUnit(BigInt(numericCount), rateAuthority.integerDivisor, 1, binWidthValue, binWidthUnit, rateUnit);
					} catch (error) {
						errors.push(require_errors.makeError({
							code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
							stage: "science",
							instancePath: require_errors.pointer("data", "observations", "response", "values", index),
							validatorId: "response_curve.estimator_declared",
							message: `raw binned-peak rate could not be re-derived from its exact max-bin count, divisor, typed bin width, and response unit (${error instanceof Error ? error.message : "numeric failure"}).`
						}));
						break;
					}
					if ((numericRate === 0 ? 0 : numericRate) !== expectedRate) {
						errors.push(require_errors.makeError({
							code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
							stage: "science",
							instancePath: require_errors.pointer("data", "observations", "response", "values", index),
							validatorId: "response_curve.estimator_declared",
							message: `raw binned-peak rate ${numericRate} ${rateUnit} does not equal the one-round exact rate ${expectedRate} ${rateUnit} derived from peak-bin count ${numericCount}, divisor ${rateAuthority.integerDivisor}, and bin width ${binWidthValue} ${binWidthUnit}.`
						}));
						break;
					}
				}
			}
		}
		if (audit) {
			const eventCounts = asArray(audit.eventCounts);
			const measurementWindow = asRecord(data.measurementWindow);
			const windowStart = asNumber(measurementWindow?.start);
			const windowStop = asNumber(measurementWindow?.stop);
			const windowUnit = asString(measurementWindow?.unit);
			const responseUnit = asString(response?.unit);
			if (eventCounts) if (eventCounts.length !== values.length) errors.push(require_errors.makeError({
				code: "SEMANTIC_LENGTH_MISMATCH",
				stage: "semantic",
				instancePath: require_errors.pointer("data", "observations", "response", "audit", "eventCounts"),
				validatorId: "response_curve.estimator_declared",
				message: "response.audit.eventCounts must be parallel to response.values."
			}));
			else for (let index = 0; index < eventCounts.length; index++) {
				const count = eventCounts[index];
				const numericCount = count === null ? void 0 : asNumber(count);
				if (count !== null) {
					if (numericCount !== void 0 && (!Number.isSafeInteger(numericCount) || numericCount < 0)) {
						errors.push(require_errors.makeError({
							code: "SCIENCE_COUNT_NOT_INTEGER",
							stage: "science",
							instancePath: require_errors.pointer("data", "observations", "response", "audit", "eventCounts", index),
							validatorId: "response_curve.estimator_declared",
							message: `audited event count ${numericCount} is not an exact non-negative safe integer.`
						}));
						break;
					}
				}
				if (count === null !== (values[index] === null)) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
						stage: "science",
						instancePath: require_errors.pointer("data", "observations", "response", "audit", "eventCounts", index),
						validatorId: "response_curve.estimator_declared",
						message: `audited event count and response value must be present or missing together at repeat index ${index}.`
					}));
					break;
				}
				const rate = values[index] === null ? void 0 : asNumber(values[index]);
				if (numericCount !== void 0 && Number.isSafeInteger(numericCount) && numericCount >= 0 && rate !== void 0 && rateAuthority?.ok === true && windowStart !== void 0 && windowStop !== void 0 && windowUnit !== void 0 && responseUnit !== void 0 && require_response_curve_basis.dimensionOf(windowUnit) === "time" && require_response_curve_basis.dimensionOf(responseUnit) === "frequency") {
					let expectedRate;
					try {
						expectedRate = require_response_curve_basis.deriveExactCountRateInUnit(numericCount, rateAuthority.integerDivisor, windowStart, windowStop, windowUnit, responseUnit);
					} catch (error) {
						const detail = error instanceof Error ? error.message : "numeric conversion failed";
						errors.push(require_errors.makeError({
							code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
							stage: "science",
							instancePath: require_errors.pointer("data", "observations", "response", "values", index),
							validatorId: "response_curve.estimator_declared",
							message: `mean-rate audit could not be re-derived from its exact count, ${rateAuthority.normalization} divisor, typed measurement window, and response unit (${detail}).`
						}));
						break;
					}
					if ((rate === 0 ? 0 : rate) !== expectedRate) {
						errors.push(require_errors.makeError({
							code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
							stage: "science",
							instancePath: require_errors.pointer("data", "observations", "response", "values", index),
							validatorId: "response_curve.estimator_declared",
							message: `supplied mean rate ${rate} ${responseUnit} does not equal the one-round exact ${rateAuthority.normalization} derived from audited count ${numericCount}, integer divisor ${rateAuthority.integerDivisor}, and exact window [${windowStart}, ${windowStop}] ${windowUnit}; the derived value is ${expectedRate} ${responseUnit}.`
						}));
						break;
					}
				}
			}
		}
	}
	if (mode === "repeats") {
		const conditionIds = asArray(asRecord(data.conditions)?.ids);
		const observationConditionIds = asArray(carrier?.conditionIds);
		const repeatIds = asArray(carrier?.repeatIds);
		const attemptedCounts = asArray(carrier?.attemptedCounts);
		if (conditionIds && conditionIds.length > 0 && observationConditionIds && repeatIds && observationConditionIds.length === repeatIds.length) {
			const declared = conditionIds.filter((value) => typeof value === "string");
			const declaredSet = new Set(declared);
			const repeatSets = new Map(declared.map((conditionId) => [conditionId, /* @__PURE__ */ new Set()]));
			const submittedCounts = new Map(declared.map((conditionId) => [conditionId, 0]));
			const definedValues = new Map(declared.map((conditionId) => [conditionId, []]));
			const rawBinnedPeakCounts = responseMethod === "peak_firing_rate" && peakBasisVerification?.ok === true && peakBasisVerification.kind === "binned_count" ? asArray(asRecord(response?.audit)?.peakBinCounts) : void 0;
			const definedPeakCountRows = new Map(declared.map((conditionId) => [conditionId, []]));
			for (let index = 0; index < observationConditionIds.length; index++) {
				const conditionId = asString(observationConditionIds[index]);
				const repeatId = asString(repeatIds[index]);
				if (conditionId !== void 0 && repeatId !== void 0) {
					if (!declaredSet.has(conditionId)) {
						errors.push(require_errors.makeError({
							code: "SEMANTIC_UNKNOWN_REFERENCE",
							stage: "semantic",
							instancePath: require_errors.pointer("data", "observations", "conditionIds", index),
							validatorId: "response_curve.estimator_declared",
							message: `observation condition ${JSON.stringify(conditionId)} is absent from the declared condition universe. Cortexel never extends that universe implicitly.`
						}));
						continue;
					}
					submittedCounts.set(conditionId, submittedCounts.get(conditionId) + 1);
					const responseValue = values?.[index];
					if (responseValue !== null) {
						const numericValue = asNumber(responseValue);
						if (numericValue !== void 0) definedValues.get(conditionId).push(numericValue);
						const peakBinCount = rawBinnedPeakCounts?.[index];
						const numericPeakBinCount = peakBinCount === null ? void 0 : asNumber(peakBinCount);
						if (numericPeakBinCount !== void 0 && Number.isSafeInteger(numericPeakBinCount) && numericPeakBinCount >= 0) definedPeakCountRows.get(conditionId).push({
							count: numericPeakBinCount,
							repeatId,
							sourceOrdinal: index
						});
					}
					const seen = repeatSets.get(conditionId);
					if (seen.has(repeatId)) {
						errors.push(require_errors.makeError({
							code: "SEMANTIC_DUPLICATE_ID",
							stage: "semantic",
							instancePath: require_errors.pointer("data", "observations", "repeatIds", index),
							validatorId: "response_curve.estimator_declared",
							message: `repeat ${JSON.stringify(repeatId)} appears more than once in condition ${JSON.stringify(conditionId)}. A duplicate composite identity would double-weight one measurement.`
						}));
						continue;
					}
					seen.add(repeatId);
				}
			}
			if (!attemptedCounts || attemptedCounts.length !== declared.length) errors.push(require_errors.makeError({
				code: "SEMANTIC_LENGTH_MISMATCH",
				stage: "semantic",
				instancePath: require_errors.pointer("data", "observations", "attemptedCounts"),
				validatorId: "response_curve.estimator_declared",
				message: "attemptedCounts must be parallel to the declared condition universe."
			}));
			else for (let ordinal = 0; ordinal < declared.length; ordinal++) {
				const declaredCount = asNumber(attemptedCounts[ordinal]);
				if (declaredCount === void 0 || !Number.isSafeInteger(declaredCount) || declaredCount < 0) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
						stage: "science",
						instancePath: require_errors.pointer("data", "observations", "attemptedCounts", ordinal),
						validatorId: "response_curve.estimator_declared",
						message: `attempted count must be an exact non-negative safe integer; got ${declaredCount}.`
					}));
					break;
				}
				const submitted = submittedCounts.get(declared[ordinal]) ?? 0;
				if (declaredCount !== submitted) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
						stage: "science",
						instancePath: require_errors.pointer("data", "observations", "attemptedCounts", ordinal),
						validatorId: "response_curve.estimator_declared",
						message: `condition ${JSON.stringify(declared[ordinal])} declares ${declaredCount} attempted repeats but supplies ${submitted} rows.`
					}));
					break;
				}
			}
			const estimator = asString(parameters.estimator);
			const trimFraction = asNumber(parameters.trimFraction);
			for (const conditionId of declared) {
				const conditionValues = definedValues.get(conditionId);
				if (conditionValues.length === 0) continue;
				try {
					const peakCountRows = definedPeakCountRows.get(conditionId);
					if (rawBinnedPeakCounts && peakCountRows.length === conditionValues.length && rateAuthority?.ok === true) {
						const ordered = [...peakCountRows].sort((left, right) => left.count - right.count || (left.repeatId < right.repeatId ? -1 : left.repeatId > right.repeatId ? 1 : 0) || left.sourceOrdinal - right.sourceOrdinal);
						let selected = ordered;
						if (estimator === "median") {
							const middle = Math.floor(ordered.length / 2);
							selected = ordered.length % 2 === 1 ? [ordered[middle]] : [ordered[middle - 1], ordered[middle]];
						} else if (estimator === "trimmed_mean" && trimFraction !== void 0) {
							const perTail = require_exact_binary64.floorExactBinary64TimesSafeInteger(trimFraction, ordered.length);
							selected = ordered.slice(perTail, ordered.length - perTail);
						}
						const basis = asRecord(response?.basis);
						const binWidth = asRecord(basis?.binWidth);
						const binWidthValue = asNumber(binWidth?.value);
						const binWidthUnit = asString(binWidth?.unit);
						const rateUnit = asString(response?.unit);
						if (selected.length > 0 && binWidthValue !== void 0 && binWidthUnit !== void 0 && rateUnit !== void 0) {
							const countTotal = selected.reduce((total, row) => total + BigInt(row.count), 0n);
							require_response_curve_basis.deriveExactAggregateCountRateInUnit(countTotal, rateAuthority.integerDivisor, selected.length, binWidthValue, binWidthUnit, rateUnit);
						}
					} else if (estimator === "mean") require_exact_binary64.exactBinary64Mean(conditionValues);
					else {
						const ordered = [...conditionValues].sort((left, right) => left - right);
						if (estimator === "median" && ordered.length % 2 === 0) {
							const middle = ordered.length / 2;
							require_exact_binary64.exactBinary64Mean([ordered[middle - 1], ordered[middle]]);
						} else if (estimator === "trimmed_mean" && trimFraction !== void 0) {
							const perTail = require_exact_binary64.floorExactBinary64TimesSafeInteger(trimFraction, ordered.length);
							require_exact_binary64.exactBinary64Mean(ordered.slice(perTail, ordered.length - perTail));
						}
					}
				} catch (error) {
					errors.push(require_errors.makeError({
						code: "SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE",
						stage: "science",
						instancePath: require_errors.pointer("data", "observations", "response", "values"),
						validatorId: "response_curve.estimator_declared",
						message: `condition ${JSON.stringify(conditionId)} cannot be estimated without collapsing a non-zero exact result (${error instanceof Error ? error.message : "numeric failure"}).`
					}));
					break;
				}
			}
			if (asString(parameters.repeatDesign) === "paired") {
				const reference = repeatSets.get(declared[0]) ?? /* @__PURE__ */ new Set();
				for (let ordinal = 1; ordinal < declared.length; ordinal++) {
					const conditionId = declared[ordinal];
					const candidate = repeatSets.get(conditionId) ?? /* @__PURE__ */ new Set();
					if (reference.size !== candidate.size || [...reference].some((repeatId) => !candidate.has(repeatId))) {
						errors.push(require_errors.makeError({
							code: "SCIENCE_PAIRED_REPEATS_INCOMPLETE",
							stage: "science",
							instancePath: require_errors.pointer("data", "observations", "repeatIds"),
							validatorId: "response_curve.estimator_declared",
							message: `repeatDesign is "paired", but condition ${JSON.stringify(conditionId)} does not carry the same repeat-id set as ${JSON.stringify(declared[0])}. Every paired replicate must have a row at every condition, including a null response when its measurement is undefined.`
						}));
						break;
					}
				}
			}
			if (asString(asRecord(parameters.uncertainty)?.reason) === "single_trial") {
				const contradictingCondition = declared.find((conditionId) => (submittedCounts.get(conditionId) ?? 0) > 1);
				if (contradictingCondition !== void 0) errors.push(require_errors.makeError({
					code: "SCIENCE_UNCERTAINTY_REASON_CONTRADICTS_DATA",
					stage: "science",
					instancePath: require_errors.pointer("parameters", "uncertainty", "reason"),
					validatorId: "response_curve.estimator_declared",
					message: `uncertainty reason single_trial contradicts condition ${JSON.stringify(contradictingCondition)}, which contains ${submittedCounts.get(contradictingCondition)} attempted repeats.`
				}));
			}
		}
	}
	if (responseMethod === "peak_firing_rate" && peakBasisVerification?.ok === true && peakBasisVerification.kind === "binned_count" && rateAuthority?.ok === true && values && mode === "aggregates" && values.every((value) => value === null || typeof value === "number" && Number.isFinite(value) && value >= 0)) {
		const lattice = require_response_curve_basis.verifyBinnedPeakValueLattice(values, response?.basis, response?.unit, rateAuthority.integerDivisor, mode, parameters.estimator, mode === "aggregates" ? carrier?.sampleCounts : void 0);
		if (!lattice.ok) {
			const responseBase = require_errors.pointer("data", mode === "aggregates" ? "aggregates" : "observations", "response");
			const instancePath = lattice.path.startsWith("/values/") ? `${responseBase}${lattice.path}` : lattice.path.startsWith("/sampleCounts") ? `${require_errors.pointer("data", "aggregates")}${lattice.path}` : lattice.path === "/estimator" ? require_errors.pointer("parameters", "estimator") : `${responseBase}${lattice.path}`;
			errors.push(require_errors.makeError({
				code: "SCIENCE_NORMALIZATION_UNVERIFIABLE",
				stage: "science",
				instancePath,
				validatorId: "response_curve.estimator_declared",
				message: lattice.message
			}));
		}
	}
	return errors;
};
const phasePlaneDerivativeDimension = (context) => {
	const field = asRecord(getData(context).vectorField);
	if (!field) return [];
	const errors = [];
	for (const axis of ["dx", "dy"]) {
		const unit = asString(asRecord(field[axis])?.unit);
		const kind = asString(asRecord(field[axis])?.kind);
		if (unit === void 0 || kind === void 0) continue;
		if (kind !== "derivative") errors.push(require_errors.makeError({
			code: "SCIENCE_UNIT_DIMENSION_MISMATCH",
			stage: "science",
			instancePath: require_errors.pointer("data", "vectorField", axis, "kind"),
			validatorId: "phase_plane.derivative_dimension",
			message: `a vector-field component is a rate of change over time and must have kind "derivative"; got "${kind}".`
		}));
	}
	return errors;
};

//#endregion
//#region src/core/semantics/weight-trace.ts
const VALIDATOR_ID$1 = "weight_trace.observation_kind_declared";
const EFFECT_RELATIVE_EPSILON_MULTIPLES = 8;
var BoundedWeightTraceErrors = class extends Array {
	push(...items) {
		const remaining = Math.max(0, 32 - this.length);
		if (remaining > 0) super.push(...items.slice(0, remaining));
		return this.length;
	}
};
function issue(code, stage, path, message) {
	return require_errors.makeError({
		code,
		stage,
		instancePath: require_errors.pointer(...path),
		validatorId: VALIDATOR_ID$1,
		message
	});
}
function records(value) {
	return (asArray(value) ?? []).flatMap((candidate) => {
		const record = asRecord(candidate);
		return record === void 0 ? [] : [record];
	});
}
function finiteNumbers(value) {
	return (asArray(value) ?? []).flatMap((candidate) => {
		const number = asNumber(candidate);
		return number === void 0 ? [] : [number];
	});
}
function quantityArrayWitnesses(values, unit, path) {
	if (unit === void 0) return [];
	return (asArray(values) ?? []).flatMap((candidate, index) => {
		const value = asNumber(candidate);
		return value === void 0 ? [] : [{
			value,
			unit,
			path: [...path, index]
		}];
	});
}
function quantityScalarWitness(quantity, path) {
	const value = asNumber(quantity?.value);
	const unit = asString(quantity?.unit);
	return value === void 0 || unit === void 0 ? [] : [{
		value,
		unit,
		path: [...path, "value"]
	}];
}
function convertScalar(value, unit, targetUnit, path, errors) {
	const sourceDimension = require_response_curve_basis.dimensionOf(unit);
	const targetDimension = require_response_curve_basis.dimensionOf(targetUnit);
	if (sourceDimension === void 0 || targetDimension === void 0) return void 0;
	if (unit === targetUnit) return value;
	if (sourceDimension !== targetDimension || sourceDimension === "simulator_defined") return;
	try {
		return require_response_curve_basis.convertExactUnitSum([{
			value,
			unit
		}], targetUnit);
	} catch {
		errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", path, `the declared ${unit} value cannot be converted once into ${targetUnit} as a finite nonzero binary64 value. Choose a better-scaled registered unit.`));
		return;
	}
}
function convertTimes(quantity, targetUnit, path, errors) {
	const unit = asString(quantity.unit);
	if (unit === void 0) return void 0;
	const values = finiteNumbers(quantity.values);
	const converted = [];
	for (let index = 0; index < values.length; index++) {
		const value = values[index];
		const result = convertScalar(value, unit, targetUnit, [...path, index], errors);
		if (result === void 0) return void 0;
		converted.push(result);
	}
	return converted;
}
function comparePhysicalTimes(left, right) {
	return require_response_curve_basis.compareExactUnitSumToValue([{
		value: left.value,
		unit: left.unit
	}], {
		value: right.value,
		unit: right.unit
	});
}
function compareDeclaredQuantities(left, leftUnit, right, rightUnit) {
	if (leftUnit === rightUnit) return left < right ? -1 : left > right ? 1 : 0;
	const dimension = require_response_curve_basis.dimensionOf(leftUnit);
	if (dimension === void 0 || dimension === "simulator_defined" || require_response_curve_basis.dimensionOf(rightUnit) !== dimension) return void 0;
	try {
		return require_response_curve_basis.compareExactUnitSumToValue([{
			value: left,
			unit: leftUnit
		}], {
			value: right,
			unit: rightUnit
		});
	} catch {
		return;
	}
}
/**
* Correctly rounded positive unit conversion is monotone. Therefore every exact ordering
* decision is preserved if and only if no two unequal decision-critical quantities collide
* at one displayed binary64 value. Grouping by the rounded value makes this check O(n log n)
* with only O(n) exact BigInt comparisons, including arbitrarily large equal-time groups.
*/
function validateDecisionTimeEmbedding(witnesses, targetUnit, errors) {
	const converted = [];
	for (const witness of witnesses) {
		const value = convertScalar(witness.value, witness.unit, targetUnit, witness.path, errors);
		if (value === void 0) return;
		converted.push({
			witness,
			value
		});
	}
	converted.sort((left, right) => left.value < right.value ? -1 : left.value > right.value ? 1 : 0);
	for (let start = 0; start < converted.length;) {
		let stop = start + 1;
		while (stop < converted.length && converted[stop].value === converted[start].value) stop++;
		const reference = converted[start].witness;
		for (let index = start + 1; index < stop; index++) {
			const candidate = converted[index].witness;
			let comparison;
			try {
				comparison = comparePhysicalTimes(reference, candidate);
			} catch {
				errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", candidate.path, `Cortexel could not compare this decision-critical time exactly with ${require_errors.pointer(...reference.path)} after registered-unit conversion. Membership, recording, or window inclusion must not proceed without an exact ordering witness.`));
				return;
			}
			if (comparison !== 0) {
				errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", candidate.path, `this decision-critical time is physically distinct from ${require_errors.pointer(...reference.path)}, but both round to ${converted[start].value} ${targetUnit}. Membership, recording, or window inclusion would become representation-dependent; choose a better-scaled registered time unit.`));
				return;
			}
		}
		start = stop;
	}
}
function validateTimeVectorFidelity(quantity, targetUnit, path, errors) {
	const sourceUnit = asString(quantity.unit);
	if (sourceUnit === void 0 || sourceUnit === targetUnit) return;
	const source = finiteNumbers(quantity.values);
	const pairs = [];
	for (let index = 0; index < source.length; index++) {
		const converted = convertScalar(source[index], sourceUnit, targetUnit, [...path, index], errors);
		if (converted === void 0) return;
		pairs.push({
			source: source[index],
			converted,
			index
		});
	}
	pairs.sort((left, right) => left.source - right.source || left.converted - right.converted);
	for (let index = 1; index < pairs.length; index++) {
		const previous = pairs[index - 1];
		const current = pairs[index];
		if (!(current.source > previous.source)) continue;
		let expected;
		try {
			expected = require_response_curve_basis.convertDifference(previous.source, current.source, sourceUnit, targetUnit);
		} catch {
			errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", [...path, current.index], `the spacing from ${require_errors.pointer(...path, previous.index)} cannot be represented exactly enough in ${targetUnit}. Choose a better-scaled registered time unit.`));
			return;
		}
		const actual = current.converted - previous.converted;
		if (!(current.converted > previous.converted) || !Number.isFinite(actual) || !require_exact_binary64.binary64RelativeDifferenceWithinEpsilons(expected, actual, EFFECT_RELATIVE_EPSILON_MULTIPLES)) {
			errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", [...path, current.index], `the distinct ${sourceUnit} times at ${require_errors.pointer(...path, previous.index)} and ${require_errors.pointer(...path, current.index)} are materially distorted after conversion to ${targetUnit}. Choose a better-scaled registered time unit.`));
			return;
		}
	}
}
function legalSynapticWeightUnit(unit) {
	if (unit === void 0 || !require_response_curve_basis.isKnownUnit(unit)) return void 0;
	const dimension = require_response_curve_basis.dimensionOf(unit);
	return dimension !== void 0 && require_response_curve_basis.kindAcceptsDimension("synaptic_weight", dimension) ? unit : void 0;
}
function validateQuantityArrayFidelity(quantity, targetUnit, path, carrierLabel, errors) {
	const sourceUnit = asString(quantity?.unit);
	if (quantity === void 0 || sourceUnit === void 0 || targetUnit === void 0) return;
	const sourceDimension = require_response_curve_basis.dimensionOf(sourceUnit);
	const targetDimension = require_response_curve_basis.dimensionOf(targetUnit);
	if (sourceDimension === void 0 || targetDimension === void 0) return;
	const sourceKind = asString(quantity.kind);
	if (sourceKind !== void 0 && !require_response_curve_basis.kindAcceptsDimension(sourceKind, sourceDimension)) return;
	if (sourceUnit !== targetUnit && (sourceDimension !== targetDimension || sourceDimension === "simulator_defined")) {
		errors.push(issue("SCIENCE_UNIT_DIMENSION_MISMATCH", "science", [...path.slice(0, -1), "unit"], `${carrierLabel} in ${sourceUnit} cannot be placed on the ${targetUnit} weight axis. Simulator-defined units are convertible only by exact code identity.`));
		return;
	}
	const pairs = [];
	const values = asArray(quantity.values) ?? [];
	for (let index = 0; index < values.length; index++) {
		const source = asNumber(values[index]);
		if (source === void 0) continue;
		const converted = convertScalar(source, sourceUnit, targetUnit, [...path, index], errors);
		if (converted === void 0) return;
		pairs.push({
			source,
			converted,
			index
		});
	}
	if (sourceUnit === targetUnit) return;
	pairs.sort((left, right) => left.source < right.source ? -1 : left.source > right.source ? 1 : 0);
	for (let index = 1; index < pairs.length; index++) {
		const previous = pairs[index - 1];
		const current = pairs[index];
		if (!(current.source > previous.source)) continue;
		let expected;
		try {
			expected = require_response_curve_basis.convertDifference(previous.source, current.source, sourceUnit, targetUnit);
		} catch {
			errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", [...path, current.index], `the ${carrierLabel} spacing from ${require_errors.pointer(...path, previous.index)} cannot be represented in ${targetUnit}. Choose a better-scaled registered weight unit.`));
			return;
		}
		const actual = current.converted - previous.converted;
		if (!(current.converted > previous.converted) || !Number.isFinite(actual) || !require_exact_binary64.binary64RelativeDifferenceWithinEpsilons(expected, actual, EFFECT_RELATIVE_EPSILON_MULTIPLES)) {
			errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", [...path, current.index], `distinct ${sourceUnit} ${carrierLabel} values at ${require_errors.pointer(...path, previous.index)} and ${require_errors.pointer(...path, current.index)} collapse or are materially distorted on the ${targetUnit} display axis. Choose a better-scaled registered weight unit.`));
			return;
		}
	}
}
function validateWeightScalarQuantity(quantity, targetUnit, path, carrierLabel, errors) {
	const value = asNumber(quantity?.value);
	const sourceUnit = asString(quantity?.unit);
	if (value === void 0 || sourceUnit === void 0 || targetUnit === void 0) return void 0;
	const sourceDimension = require_response_curve_basis.dimensionOf(sourceUnit);
	const targetDimension = require_response_curve_basis.dimensionOf(targetUnit);
	if (sourceDimension === void 0 || targetDimension === void 0) return void 0;
	const sourceKind = asString(quantity?.kind);
	if (sourceKind !== void 0 && !require_response_curve_basis.kindAcceptsDimension(sourceKind, sourceDimension)) return;
	if (sourceUnit !== targetUnit && (sourceDimension !== targetDimension || sourceDimension === "simulator_defined")) {
		errors.push(issue("SCIENCE_UNIT_DIMENSION_MISMATCH", "science", [...path, "unit"], `${carrierLabel} in ${sourceUnit} cannot be placed on the ${targetUnit} weight axis. Simulator-defined units are convertible only by exact code identity.`));
		return;
	}
	return convertScalar(value, sourceUnit, targetUnit, [...path, "value"], errors);
}
function validateUncertaintyAxisFidelity(uncertainty, targetUnit, path, errors) {
	const kind = asString(uncertainty?.kind);
	if (uncertainty === void 0 || kind === void 0 || kind === "none") return;
	const keys = kind === "standard_deviation" || kind === "standard_error" ? ["values"] : ["lower", "upper"];
	for (const key of keys) validateQuantityArrayFidelity({
		unit: uncertainty.unit,
		values: uncertainty[key]
	}, targetUnit, [...path, key], `uncertainty ${key}`, errors);
}
function validateWeightAxisEmbedding(witnesses, targetUnit, errors) {
	if (targetUnit === void 0 || witnesses.length < 2) return;
	const units = new Set(witnesses.map(({ unit }) => unit));
	if (units.size === 1 && units.has(targetUnit)) return;
	const converted = [];
	for (const witness of witnesses) {
		if (witness.unit !== targetUnit && (require_response_curve_basis.dimensionOf(witness.unit) !== require_response_curve_basis.dimensionOf(targetUnit) || require_response_curve_basis.dimensionOf(witness.unit) === "simulator_defined")) return;
		const value = convertScalar(witness.value, witness.unit, targetUnit, witness.path, errors);
		if (value === void 0) return;
		converted.push({
			witness,
			value
		});
	}
	converted.sort((left, right) => left.value < right.value ? -1 : left.value > right.value ? 1 : 0);
	for (let index = 1; index < converted.length; index++) {
		const left = converted[index - 1];
		const right = converted[index];
		let exactOrder;
		try {
			exactOrder = require_response_curve_basis.compareExactUnitSumToValue([{
				value: left.witness.value,
				unit: left.witness.unit
			}], {
				value: right.witness.value,
				unit: right.witness.unit
			});
		} catch {
			errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", right.witness.path, `Cortexel could not compare this weight-axis carrier exactly with ${require_errors.pointer(...left.witness.path)}. The shared display axis must preserve cross-carrier ordering.`));
			return;
		}
		if (exactOrder === 0) {
			if (right.value !== left.value) {
				errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", right.witness.path, `this carrier is physically equal to ${require_errors.pointer(...left.witness.path)} but the two convert to different ${targetUnit} values. The shared axis would be representation-dependent.`));
				return;
			}
			continue;
		}
		if (exactOrder > 0 || !(right.value > left.value)) {
			errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", right.witness.path, `this carrier and ${require_errors.pointer(...left.witness.path)} have a different exact physical order than their ${targetUnit} axis values. Choose a better-scaled registered weight unit.`));
			return;
		}
		let expected;
		try {
			expected = require_response_curve_basis.convertExactUnitSum([{
				value: right.witness.value,
				unit: right.witness.unit
			}, {
				value: -left.witness.value,
				unit: left.witness.unit
			}], targetUnit);
		} catch {
			errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", right.witness.path, `the exact physical spacing from ${require_errors.pointer(...left.witness.path)} cannot be represented as a finite nonzero ${targetUnit} difference. Choose a better-scaled registered weight unit.`));
			return;
		}
		const actual = right.value - left.value;
		if (!(expected > 0) || !Number.isFinite(actual) || !require_exact_binary64.binary64RelativeDifferenceWithinEpsilons(expected, actual, EFFECT_RELATIVE_EPSILON_MULTIPLES)) {
			errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", right.witness.path, `the cross-carrier spacing from ${require_errors.pointer(...left.witness.path)} is materially distorted on the ${targetUnit} axis. Choose a better-scaled registered weight unit.`));
			return;
		}
	}
}
function convertOrderedInterval(start, stop, sourceUnit, targetUnit, path, errors) {
	const convertedStart = convertScalar(start, sourceUnit, targetUnit, [...path, "start"], errors);
	const convertedStop = convertScalar(stop, sourceUnit, targetUnit, [...path, "stop"], errors);
	if (convertedStart === void 0 || convertedStop === void 0) return void 0;
	let expectedWidth;
	try {
		expectedWidth = require_response_curve_basis.convertDifference(start, stop, sourceUnit, targetUnit);
	} catch {
		errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", path, `the positive ${sourceUnit} interval cannot be represented as one finite binary64 interval in ${targetUnit}. Choose a better-scaled registered time unit.`));
		return;
	}
	const actualWidth = convertedStop - convertedStart;
	if (!(expectedWidth > 0) || !(convertedStop > convertedStart) || !Number.isFinite(actualWidth) || !require_exact_binary64.binary64RelativeDifferenceWithinEpsilons(expectedWidth, actualWidth, EFFECT_RELATIVE_EPSILON_MULTIPLES)) {
		errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", path, `the positive ${sourceUnit} interval collapses or is materially distorted after conversion to ${targetUnit}. Choose a better-scaled registered time unit.`));
		return;
	}
	return {
		start: convertedStart,
		stop: convertedStop
	};
}
function validateComparability(models, parameters, errors) {
	const comparability = asRecord(parameters.weightComparability) ?? {};
	const mode = asString(comparability.mode);
	const distinctModels = new Set(models);
	const declaredModels = (asArray(comparability.comparableModels) ?? []).flatMap((candidate) => typeof candidate === "string" ? [candidate] : []);
	const declaredSet = /* @__PURE__ */ new Set();
	for (let index = 0; index < declaredModels.length; index++) {
		if (declaredSet.has(declaredModels[index])) errors.push(issue("SEMANTIC_DUPLICATE_ID", "semantic", [
			"parameters",
			"weightComparability",
			"comparableModels",
			index
		], "comparableModels is an exact set claim and may name each synapse model only once."));
		declaredSet.add(declaredModels[index]);
	}
	if (!(models.length > 0 && (mode === "single_synapse_model" && distinctModels.size === 1 || mode === "declared_comparable_models" && declaredModels.length === declaredSet.size && declaredSet.size === distinctModels.size && [...distinctModels].every((model) => declaredSet.has(model))))) errors.push(issue("SCIENCE_WEIGHT_GROUP_INCOMPATIBLE", "science", ["parameters", "weightComparability"], "the comparability declaration must exactly match the distinct synapse models whose weights share this axis. Unit compatibility alone cannot establish model-level comparability."));
}
function validateNestedUncertainty(uncertainty, centralValues, path, errors) {
	if (uncertainty === void 0) return;
	errors.push(...validateUncertaintyNode(uncertainty, path, VALIDATOR_ID$1));
	const kind = asString(uncertainty.kind);
	if (kind === void 0 || kind === "none") return;
	if (kind === "credible_interval") errors.push(issue("SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL", "science", [...path, "kind"], "credible intervals are refused because this contract has no independently verified posterior-attestation input."));
	const keys = kind === "standard_deviation" || kind === "standard_error" ? ["values", "sampleCount"] : [
		"lower",
		"upper",
		"sampleCount"
	];
	for (const key of keys) {
		const values = asArray(uncertainty[key]);
		if (values !== void 0 && values.length !== centralValues.length) errors.push(issue("SEMANTIC_LENGTH_MISMATCH", "semantic", [...path, key], `uncertainty.${key} has ${values.length} entries for ${centralValues.length} central observations.`));
	}
	for (let index = 0; index < centralValues.length; index++) {
		if (centralValues[index] !== null) continue;
		for (const key of keys) {
			const values = asArray(uncertainty[key]);
			if (values !== void 0 && index < values.length && values[index] !== null) {
				errors.push(issue("SCIENCE_UNCERTAINTY_BOUNDS_INVALID", "science", [
					...path,
					key,
					index
				], `uncertainty.${key} cannot qualify a missing central observation; it must be null at the same index.`));
				break;
			}
		}
	}
}
function validatePreaggregatedAggregateUncertainty(aggregate, uncertainty, errors) {
	const kind = asString(uncertainty?.kind);
	if (kind !== "ensemble_range" && kind !== "quantile_interval") return;
	const central = asArray(asRecord(aggregate.values)?.values) ?? [];
	const centralUnit = asString(asRecord(aggregate.values)?.unit);
	const lower = asArray(uncertainty?.lower) ?? [];
	const upper = asArray(uncertainty?.upper) ?? [];
	const sampleCount = asArray(uncertainty?.sampleCount) ?? [];
	const uncertaintyUnit = asString(uncertainty?.unit);
	const method = asString(aggregate.method);
	const lowerQuantile = asNumber(uncertainty?.lowerQuantile);
	const upperQuantile = asNumber(uncertainty?.upperQuantile);
	if (centralUnit === void 0 || uncertaintyUnit === void 0 || method === void 0) return;
	const reject = (index, key, law) => {
		errors.push(issue("SCIENCE_UNCERTAINTY_BOUNDS_INVALID", "science", [
			"data",
			"aggregate",
			"uncertainty",
			key,
			index
		], `the caller-declared ${kind} contradicts the caller-declared ${method} aggregate at index ${index}: ${law}. Cortexel cannot re-derive omitted members, but mutually impossible summary claims must fail closed.`));
	};
	const length = Math.min(central.length, lower.length, upper.length);
	for (let index = 0; index < length; index++) {
		const value = asNumber(central[index]);
		const lo = asNumber(lower[index]);
		const hi = asNumber(upper[index]);
		if (value === void 0 || lo === void 0 || hi === void 0) continue;
		const toLower = compareDeclaredQuantities(value, centralUnit, lo, uncertaintyUnit);
		const toUpper = compareDeclaredQuantities(value, centralUnit, hi, uncertaintyUnit);
		if (toLower === void 0 || toUpper === void 0) continue;
		if (sampleCount[index] === 1) {
			if (toLower !== 0) {
				reject(index, "lower", "with one contributing member, every aggregate and every empirical interval endpoint must equal that one member");
				return;
			}
			if (toUpper !== 0) {
				reject(index, "upper", "with one contributing member, every aggregate and every empirical interval endpoint must equal that one member");
				return;
			}
			continue;
		}
		if (kind === "ensemble_range") {
			if (method === "min" && toLower !== 0) {
				reject(index, "lower", "an observed ensemble range must begin at the declared minimum");
				return;
			}
			if (method === "max" && toUpper !== 0) {
				reject(index, "upper", "an observed ensemble range must end at the declared maximum");
				return;
			}
			if ((method === "mean" || method === "median") && toLower < 0) {
				reject(index, "lower", `a finite-sample ${method} cannot lie below the observed minimum`);
				return;
			}
			if ((method === "mean" || method === "median") && toUpper > 0) {
				reject(index, "upper", `a finite-sample ${method} cannot lie above the observed maximum`);
				return;
			}
			continue;
		}
		if (method === "min") {
			if (toLower > 0) {
				reject(index, "lower", "an empirical quantile cannot lie below the declared minimum");
				return;
			}
			if (lowerQuantile === 0 && toLower !== 0) {
				reject(index, "lower", "the Type-7 zero quantile must equal the declared minimum");
				return;
			}
		} else if (method === "max") {
			if (toUpper < 0) {
				reject(index, "upper", "an empirical quantile cannot lie above the declared maximum");
				return;
			}
			if (upperQuantile === 1 && toUpper !== 0) {
				reject(index, "upper", "the Type-7 unit quantile must equal the declared maximum");
				return;
			}
		} else if (method === "median" && lowerQuantile !== void 0 && upperQuantile !== void 0) {
			if (lowerQuantile === .5 && toLower !== 0) {
				reject(index, "lower", "the Type-7 0.5 quantile must equal the declared Type-7 median");
				return;
			}
			if (upperQuantile === .5 && toUpper !== 0) {
				reject(index, "upper", "the Type-7 0.5 quantile must equal the declared Type-7 median");
				return;
			}
			if (lowerQuantile < .5 && upperQuantile > .5 && toLower < 0) {
				reject(index, "lower", "a quantile interval straddling 0.5 cannot begin above the declared median");
				return;
			}
			if (lowerQuantile < .5 && upperQuantile > .5 && toUpper > 0) {
				reject(index, "upper", "a quantile interval straddling 0.5 cannot end below the declared median");
				return;
			}
			if (upperQuantile < .5 && toUpper < 0) {
				reject(index, "upper", "a quantile below 0.5 cannot exceed the declared median");
				return;
			}
			if (lowerQuantile > .5 && toLower > 0) {
				reject(index, "lower", "a quantile above 0.5 cannot be below the declared median");
				return;
			}
		} else if (method === "mean") {
			if (lowerQuantile === 0 && toLower < 0) {
				reject(index, "lower", "the observed minimum cannot exceed the finite-sample mean");
				return;
			}
			if (upperQuantile === 1 && toUpper > 0) {
				reject(index, "upper", "the observed maximum cannot be below the finite-sample mean");
				return;
			}
		}
	}
}
function validateIncreasingWindowTimes(times, window, path, errors) {
	for (let index = 1; index < times.length; index++) if (!(times[index] > times[index - 1])) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [...path, index], "aggregate evaluation times must be strictly increasing after exact registered-unit conversion. Cortexel does not sort or deduplicate a caller-authored aggregate grid."));
	const start = asNumber(window.start);
	const stop = asNumber(window.stop);
	const closedStop = asString(window.boundary) === "[start,stop]";
	if (start === void 0 || stop === void 0) return;
	for (let index = 0; index < times.length; index++) {
		const time = times[index];
		if (time < start || time > stop || !closedStop && time === stop) errors.push(issue("SCIENCE_EVENT_OUT_OF_WINDOW", "science", [...path, index], "an aggregate evaluation time lies outside the declared analysis window. It must be rejected, not silently filtered from the figure."));
	}
}
/**
* The historical id is retained for compatibility, but revision 2 owns the complete
* observation/membership/denominator coherence boundary for this skill.
*/
const weightTraceObservationKindDeclared = (context) => {
	if (context.skillId !== "network.synaptic_weight_trace") return [];
	const data = getData(context);
	const parameters = getParameters(context);
	const mode = asString(data.mode);
	const display = asString(parameters.display);
	const window = asRecord(data.window) ?? {};
	const windowUnit = asString(window.unit);
	const errors = new BoundedWeightTraceErrors();
	if (mode === "preaggregated") {
		if (display !== "aggregate_declared") errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", ["parameters", "display"], "preaggregated input is accepted only with aggregate_declared display. It cannot be relabelled as a Cortexel-derived or individual view."));
		const aggregate = asRecord(data.aggregate) ?? {};
		const aggregateModel = asString(aggregate.synapseModel);
		if (aggregateModel !== void 0) validateComparability([aggregateModel], parameters, errors);
		const observation = asRecord(aggregate.observation) ?? {};
		if (observation.kind === "interpolated_trajectory" && asString(observation.interpolant) !== "linear") errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
			"data",
			"aggregate",
			"observation",
			"interpolant"
		], "revision 2 can render and authority-bind only a caller-supplied linear reconstruction. A non-linear interpolant must not be silently drawn as straight segments."));
		const intervalMethod = asString(aggregate.intervalMethod);
		if (intervalMethod === "hold_last_observed" && observation.kind !== "event_updated" || intervalMethod === "shared_sample_grid" && observation.kind !== "point_sample") errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
			"data",
			"aggregate",
			"intervalMethod"
		], "the preaggregated interval method contradicts the declared observation kind: holds require event-updated values and a shared grid requires point samples."));
		const time = asRecord(aggregate.time) ?? {};
		const rawTimeValues = asArray(time.values) ?? [];
		const rawAggregateValues = asArray(asRecord(aggregate.values)?.values) ?? [];
		const rawMemberCounts = asArray(aggregate.memberCounts) ?? [];
		const rawContributingCounts = asArray(aggregate.contributingCounts) ?? [];
		const aggregateLengths = [
			rawTimeValues.length,
			rawAggregateValues.length,
			rawMemberCounts.length,
			rawContributingCounts.length
		];
		if (aggregateLengths[0] === 0) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
			"data",
			"aggregate",
			"time",
			"values"
		], "a caller-declared aggregate must contain at least one evaluation carrier. An empty array cannot produce a renderable or auditable aggregate figure."));
		if (!rawAggregateValues.some((value) => asNumber(value) !== void 0)) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
			"data",
			"aggregate",
			"values",
			"values"
		], "a caller-declared aggregate must contain at least one finite displayed value. Revision 2 has no authority-bound empty-state figure for an all-missing aggregate."));
		if (aggregateLengths.some((length) => length !== aggregateLengths[0])) errors.push(issue("SEMANTIC_LENGTH_MISMATCH", "semantic", ["data", "aggregate"], "preaggregated time, value, member-count, and contributing-count arrays must have identical lengths."));
		const declaredUncertainty = asRecord(aggregate.uncertainty);
		validateNestedUncertainty(declaredUncertainty, rawAggregateValues, [
			"data",
			"aggregate",
			"uncertainty"
		], errors);
		validateUncertaintyAxisFidelity(declaredUncertainty, asString(asRecord(aggregate.values)?.unit), [
			"data",
			"aggregate",
			"uncertainty"
		], errors);
		const aggregateValueUnit = legalSynapticWeightUnit(asString(asRecord(aggregate.values)?.unit));
		const aggregateUncertaintyUnit = asString(declaredUncertainty?.unit);
		validateWeightAxisEmbedding([
			...quantityArrayWitnesses(rawAggregateValues, aggregateValueUnit, [
				"data",
				"aggregate",
				"values",
				"values"
			]),
			...quantityArrayWitnesses(declaredUncertainty?.values, aggregateUncertaintyUnit, [
				"data",
				"aggregate",
				"uncertainty",
				"values"
			]),
			...quantityArrayWitnesses(declaredUncertainty?.lower, aggregateUncertaintyUnit, [
				"data",
				"aggregate",
				"uncertainty",
				"lower"
			]),
			...quantityArrayWitnesses(declaredUncertainty?.upper, aggregateUncertaintyUnit, [
				"data",
				"aggregate",
				"uncertainty",
				"upper"
			])
		], aggregateValueUnit, errors);
		if (observation.kind === "interpolated_trajectory" && asString(declaredUncertainty?.kind) !== "none") errors.push(issue("SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL", "science", [
			"data",
			"aggregate",
			"uncertainty",
			"kind"
		], "revision 2 does not define how uncertainty bounds are reconstructed between caller-supplied trajectory vertices. An interpolated trajectory therefore requires uncertainty:none."));
		if (windowUnit !== void 0) {
			const timeErrorCount = errors.length;
			validateTimeVectorFidelity(time, windowUnit, [
				"data",
				"aggregate",
				"time",
				"values"
			], errors);
			if (errors.length === timeErrorCount) {
				const converted = convertTimes(time, windowUnit, [
					"data",
					"aggregate",
					"time",
					"values"
				], errors);
				if (converted !== void 0) validateIncreasingWindowTimes(converted, window, [
					"data",
					"aggregate",
					"time",
					"values"
				], errors);
				const aggregateTimeUnit = asString(time.unit);
				const windowStart = asNumber(window.start);
				const windowStop = asNumber(window.stop);
				if (aggregateTimeUnit !== void 0 && windowStart !== void 0 && windowStop !== void 0) validateDecisionTimeEmbedding([
					...finiteNumbers(time.values).map((value, index) => ({
						value,
						unit: aggregateTimeUnit,
						path: [
							"data",
							"aggregate",
							"time",
							"values",
							index
						]
					})),
					{
						value: windowStart,
						unit: windowUnit,
						path: [
							"data",
							"window",
							"start"
						]
					},
					{
						value: windowStop,
						unit: windowUnit,
						path: [
							"data",
							"window",
							"stop"
						]
					}
				], windowUnit, errors);
			}
		}
		const values = rawAggregateValues;
		const memberCounts = finiteNumbers(aggregate.memberCounts);
		const contributingCounts = finiteNumbers(aggregate.contributingCounts);
		const length = Math.min(values.length, memberCounts.length, contributingCounts.length);
		for (let index = 0; index < length; index++) {
			if (errors.length >= 32) break;
			const memberCount = memberCounts[index];
			const contributingCount = contributingCounts[index];
			if (!Number.isSafeInteger(memberCount) || memberCount < 0) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
				"data",
				"aggregate",
				"memberCounts",
				index
			], "memberCount must be a non-negative safe integer. A rounded binary64 cardinality is not an auditable synapse count."));
			if (!Number.isSafeInteger(contributingCount) || contributingCount < 0) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
				"data",
				"aggregate",
				"contributingCounts",
				index
			], "contributingCount must be a non-negative safe integer. A rounded binary64 cardinality cannot define an aggregate denominator."));
			if (contributingCount > memberCount) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
				"data",
				"aggregate",
				"contributingCounts",
				index
			], "contributingCount cannot exceed memberCount. A denominator cannot contain synapses outside the declared group at that time."));
			if (values[index] === null !== (contributingCount === 0)) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
				"data",
				"aggregate",
				"values",
				"values",
				index
			], "for the offered aggregate methods, an aggregate value is null exactly when contributingCount is zero. Zero contributors cannot yield a measured zero, and positive contributors cannot yield an unexplained missing aggregate."));
		}
		const uncertaintyKind = asString(declaredUncertainty?.kind);
		if (uncertaintyKind === "standard_error") errors.push(issue("SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL", "science", [
			"data",
			"aggregate",
			"uncertainty",
			"kind"
		], "standard error is inferential and is unsupported for an exact declared synapse ensemble. The request declares no sampling estimand, sampling design, exchangeability model, or repeat universe from which sampling variability could be derived."));
		if (uncertaintyKind === "confidence_interval") errors.push(issue("SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL", "science", [
			"data",
			"aggregate",
			"uncertainty",
			"kind"
		], "a confidence interval is unsupported because this request carries no sampling estimand, sampling design, repeat universe, or coverage-generating procedure. Dispersion across the exact declared members is descriptive evidence, not a confidence procedure."));
		if (uncertaintyKind === "standard_deviation" && asString(aggregate.method) !== "mean") errors.push(issue("SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL", "science", [
			"data",
			"aggregate",
			"uncertainty",
			"kind"
		], "standard deviation is dispersion about the mean and revision 2 renders it as mean plus or minus one SD. Centering that carrier on a median, minimum, or maximum would fabricate endpoints with no declared statistical meaning."));
		if (uncertaintyKind === "quantile_interval" && asString(declaredUncertainty?.method) !== "empirical_type_7_linear") errors.push(issue("SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL", "science", [
			"data",
			"aggregate",
			"uncertainty",
			"method"
		], "revision 2 validates and discloses only empirical Type-7 quantiles; uncertainty.method must be empirical_type_7_linear."));
		if (declaredUncertainty !== void 0 && uncertaintyKind !== void 0 && uncertaintyKind !== "none") {
			if (asString(declaredUncertainty.basis) !== "ensemble_members") errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
				"data",
				"aggregate",
				"uncertainty",
				"basis"
			], "a declared aggregate uncertainty is dispersion across its contributing member synapses and must use the registered `ensemble_members` basis. Calling distinct synapses replicates would add an exchangeability claim the request does not establish."));
			const sampleCounts = asArray(declaredUncertainty.sampleCount);
			if (sampleCounts === void 0) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
				"data",
				"aggregate",
				"uncertainty",
				"sampleCount"
			], "a declared aggregate uncertainty must carry sampleCount at every evaluation time so its dispersion denominator can be checked against contributingCounts."));
			else {
				if (sampleCounts.length !== rawAggregateValues.length) errors.push(issue("SEMANTIC_LENGTH_MISMATCH", "semantic", [
					"data",
					"aggregate",
					"uncertainty",
					"sampleCount"
				], `uncertainty.sampleCount has ${sampleCounts.length} entries for ${rawAggregateValues.length} aggregate observations.`));
				for (let index = 0; index < Math.min(sampleCounts.length, contributingCounts.length); index++) {
					if (errors.length >= 32) break;
					const minimumSampleCount = uncertaintyKind === "standard_deviation" ? 2 : 1;
					const expected = contributingCounts[index] < minimumSampleCount ? null : contributingCounts[index];
					if (sampleCounts[index] !== expected) {
						errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
							"data",
							"aggregate",
							"uncertainty",
							"sampleCount",
							index
						], `uncertainty.sampleCount must equal contributingCounts where the declared descriptive statistic is defined and be null otherwise; sample standard deviation requires at least two contributors, while empirical quantiles/ranges require one. Expected ${String(expected)} here.`));
						break;
					}
				}
			}
		}
		validatePreaggregatedAggregateUncertainty(aggregate, declaredUncertainty, errors);
		return errors;
	}
	if (mode !== "edges") return errors;
	if (display === "aggregate_declared") errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", ["parameters", "display"], "raw edge observations cannot use aggregate_declared display. Use a derived aggregate display or preaggregated input."));
	const series = records(data.series);
	validateComparability(series.flatMap((entry) => {
		const model = asString(entry.synapseModel);
		return model === void 0 ? [] : [model];
	}), parameters, errors);
	const edgeIds = /* @__PURE__ */ new Set();
	const timeGrids = /* @__PURE__ */ new Map();
	const decisionWitnessesByEdge = /* @__PURE__ */ new Map();
	const recordedIntervalsByEdge = /* @__PURE__ */ new Map();
	const duplicateTimeEdges = /* @__PURE__ */ new Set();
	const excludedSourceTimeEdges = /* @__PURE__ */ new Set();
	const targetValueUnit = legalSynapticWeightUnit(asString(asRecord(series[0]?.values)?.unit));
	const weightAxisWitnesses = [];
	for (let index = 0; index < series.length; index++) {
		if (errors.length >= 32) break;
		const edgeId = asString(series[index].edgeId);
		if (edgeId !== void 0 && edgeIds.has(edgeId)) errors.push(issue("SEMANTIC_DUPLICATE_ID", "semantic", [
			"data",
			"series",
			index,
			"edgeId"
		], "each synapse series must have one unique edgeId. Duplicate identity would make membership resolution order-dependent."));
		if (edgeId !== void 0) edgeIds.add(edgeId);
		const timeLength = asArray(asRecord(series[index].time)?.values)?.length;
		const valueLength = asArray(asRecord(series[index].values)?.values)?.length;
		if (timeLength !== void 0 && valueLength !== void 0 && timeLength !== valueLength) errors.push(issue("SEMANTIC_LENGTH_MISMATCH", "semantic", [
			"data",
			"series",
			index
		], "every synapse series must carry one weight entry for every time entry. This check applies to every series, not only the first catalog examples."));
		const eventKinds = asArray(series[index].eventKinds);
		if (eventKinds !== void 0 && timeLength !== void 0 && eventKinds.length !== timeLength) errors.push(issue("SEMANTIC_LENGTH_MISMATCH", "semantic", [
			"data",
			"series",
			index,
			"eventKinds"
		], `eventKinds has ${eventKinds.length} entries for ${timeLength} observation times. A missing event label cannot be shifted onto a different update.`));
		const valuesQuantity = asRecord(series[index].values);
		const valuesUnit = asString(valuesQuantity?.unit);
		const seriesUncertainty = asRecord(series[index].uncertainty);
		if (asString(seriesUncertainty?.kind) !== "none") errors.push(issue("SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL", "science", [
			"data",
			"series",
			index,
			"uncertainty",
			"kind"
		], "revision 2 requires uncertainty:none on every identified raw edge. The request carries one synapse from one run but no aligned repeat universe, central estimator, or repeat-level values from which an SD, SE, interval, or bootstrap distribution could be verified."));
		validateNestedUncertainty(seriesUncertainty, asArray(valuesQuantity?.values) ?? [], [
			"data",
			"series",
			index,
			"uncertainty"
		], errors);
		validateQuantityArrayFidelity(valuesQuantity, targetValueUnit, [
			"data",
			"series",
			index,
			"values",
			"values"
		], "weight observation", errors);
		validateUncertaintyAxisFidelity(seriesUncertainty, targetValueUnit, [
			"data",
			"series",
			index,
			"uncertainty"
		], errors);
		weightAxisWitnesses.push(...quantityArrayWitnesses(valuesQuantity?.values, valuesUnit, [
			"data",
			"series",
			index,
			"values",
			"values"
		]));
		const uncertaintyUnit = asString(seriesUncertainty?.unit);
		for (const key of [
			"values",
			"lower",
			"upper"
		]) weightAxisWitnesses.push(...quantityArrayWitnesses(seriesUncertainty?.[key], uncertaintyUnit, [
			"data",
			"series",
			index,
			"uncertainty",
			key
		]));
		const time = asRecord(series[index].time);
		const timeUnit = asString(time?.unit);
		const sourceTimes = finiteNumbers(time?.values);
		if (time !== void 0 && windowUnit !== void 0) validateTimeVectorFidelity(time, windowUnit, [
			"data",
			"series",
			index,
			"time",
			"values"
		], errors);
		if (edgeId !== void 0) {
			const seenTimes = /* @__PURE__ */ new Set();
			for (const sourceTime of sourceTimes) {
				if (seenTimes.has(sourceTime)) duplicateTimeEdges.add(edgeId);
				seenTimes.add(sourceTime);
			}
		}
		const recorded = asRecord(series[index].recordedInterval);
		const start = asNumber(recorded?.start);
		const stop = asNumber(recorded?.stop);
		if (start !== void 0 && stop !== void 0 && !(start < stop)) errors.push(issue("SCIENCE_WINDOW_INVALID", "science", [
			"data",
			"series",
			index,
			"recordedInterval"
		], "a recorded interval must have start < stop. A reversed or empty observation span cannot silently become an empty trace."));
		const recordedUnit = asString(recorded?.unit);
		const windowStart = asNumber(window.start);
		const windowStop = asNumber(window.stop);
		let convertedRecordedStart;
		let convertedRecordedStop;
		if (start !== void 0 && stop !== void 0 && recordedUnit !== void 0 && windowUnit !== void 0 && windowStart !== void 0 && windowStop !== void 0 && start < stop) {
			const convertedRecorded = convertOrderedInterval(start, stop, recordedUnit, windowUnit, [
				"data",
				"series",
				index,
				"recordedInterval"
			], errors);
			convertedRecordedStart = convertedRecorded?.start;
			convertedRecordedStop = convertedRecorded?.stop;
			if (convertedRecordedStart !== void 0 && convertedRecordedStop !== void 0 && !(Math.min(windowStop, convertedRecordedStop) > Math.max(windowStart, convertedRecordedStart))) errors.push(issue("SCIENCE_WINDOW_INVALID", "science", [
				"data",
				"series",
				index,
				"recordedInterval"
			], "the recorded interval must have a positive-duration intersection with the analysis window. A trace cannot be compiled from a disjoint observation span."));
			if (edgeId !== void 0 && convertedRecordedStart !== void 0 && convertedRecordedStop !== void 0) recordedIntervalsByEdge.set(edgeId, {
				start: convertedRecordedStart,
				stop: convertedRecordedStop
			});
		}
		if (edgeId !== void 0 && timeUnit !== void 0 && recordedUnit !== void 0 && start !== void 0 && stop !== void 0 && windowUnit !== void 0 && windowStart !== void 0 && windowStop !== void 0) validateDecisionTimeEmbedding([
			...sourceTimes.map((value, timeIndex) => ({
				value,
				unit: timeUnit,
				path: [
					"data",
					"series",
					index,
					"time",
					"values",
					timeIndex
				]
			})),
			{
				value: start,
				unit: recordedUnit,
				path: [
					"data",
					"series",
					index,
					"recordedInterval",
					"start"
				]
			},
			{
				value: stop,
				unit: recordedUnit,
				path: [
					"data",
					"series",
					index,
					"recordedInterval",
					"stop"
				]
			},
			{
				value: windowStart,
				unit: windowUnit,
				path: [
					"data",
					"window",
					"start"
				]
			},
			{
				value: windowStop,
				unit: windowUnit,
				path: [
					"data",
					"window",
					"stop"
				]
			}
		], windowUnit, errors);
		if (edgeId !== void 0 && time !== void 0 && windowUnit !== void 0 && windowStart !== void 0 && windowStop !== void 0 && convertedRecordedStart !== void 0 && convertedRecordedStop !== void 0) {
			const convertedTimes = convertTimes(time, windowUnit, [
				"data",
				"series",
				index,
				"time",
				"values"
			], errors);
			if (convertedTimes !== void 0) {
				const recordedClosed = asString(recorded?.boundary) === "[start,stop]";
				for (let timeIndex = 0; timeIndex < convertedTimes.length; timeIndex++) {
					const candidate = convertedTimes[timeIndex];
					if (candidate < convertedRecordedStart || candidate > convertedRecordedStop || !recordedClosed && candidate === convertedRecordedStop) {
						errors.push(issue("SCIENCE_EVENT_OUT_OF_WINDOW", "science", [
							"data",
							"series",
							index,
							"time",
							"values",
							timeIndex
						], "a source observation lies outside its declared recordedInterval. Analysis-window filtering cannot repair a contradiction about when this synapse was actually observed."));
						break;
					}
				}
				const lower = Math.max(windowStart, convertedRecordedStart);
				const upper = Math.min(windowStop, convertedRecordedStop);
				const windowClosed = asString(window.boundary) === "[start,stop]";
				const effectiveUpperClosed = (upper !== windowStop || windowClosed) && (upper !== convertedRecordedStop || recordedClosed);
				const acceptedAt = (candidate) => candidate >= lower && (candidate < upper || effectiveUpperClosed && candidate === upper);
				const accepted = convertedTimes.filter(acceptedAt).sort((left, right) => left - right).filter((candidate, candidateIndex, all) => candidateIndex === 0 || candidate !== all[candidateIndex - 1]);
				timeGrids.set(edgeId, {
					index,
					values: accepted
				});
				if (convertedTimes.some((candidate) => !acceptedAt(candidate))) excludedSourceTimeEdges.add(edgeId);
				const sourceWitnesses = sourceTimes.map((value, timeIndex) => ({
					value,
					unit: timeUnit,
					path: [
						"data",
						"series",
						index,
						"time",
						"values",
						timeIndex
					]
				}));
				decisionWitnessesByEdge.set(edgeId, [
					...sourceWitnesses,
					{
						value: start,
						unit: recordedUnit,
						path: [
							"data",
							"series",
							index,
							"recordedInterval",
							"start"
						]
					},
					{
						value: stop,
						unit: recordedUnit,
						path: [
							"data",
							"series",
							index,
							"recordedInterval",
							"stop"
						]
					},
					{
						value: windowStart,
						unit: windowUnit,
						path: [
							"data",
							"window",
							"start"
						]
					},
					{
						value: windowStop,
						unit: windowUnit,
						path: [
							"data",
							"window",
							"stop"
						]
					}
				]);
			}
		}
		const lower = asRecord(asRecord(series[index].bounds)?.lower);
		const upper = asRecord(asRecord(series[index].bounds)?.upper);
		const lowerValue = asNumber(lower?.value);
		const upperValue = asNumber(upper?.value);
		const lowerUnit = asString(lower?.unit);
		const upperUnit = asString(upper?.unit);
		const initialQuantity = asRecord(asRecord(series[index].initialWeight)?.quantity);
		weightAxisWitnesses.push(...quantityScalarWitness(initialQuantity, [
			"data",
			"series",
			index,
			"initialWeight",
			"quantity"
		]), ...quantityScalarWitness(lower, [
			"data",
			"series",
			index,
			"bounds",
			"lower"
		]), ...quantityScalarWitness(upper, [
			"data",
			"series",
			index,
			"bounds",
			"upper"
		]));
		validateWeightScalarQuantity(initialQuantity, targetValueUnit, [
			"data",
			"series",
			index,
			"initialWeight",
			"quantity"
		], "declared initial weight", errors);
		const convertedLower = validateWeightScalarQuantity(lower, targetValueUnit, [
			"data",
			"series",
			index,
			"bounds",
			"lower"
		], "declared lower weight bound", errors);
		const convertedUpper = validateWeightScalarQuantity(upper, targetValueUnit, [
			"data",
			"series",
			index,
			"bounds",
			"upper"
		], "declared upper weight bound", errors);
		if (valuesUnit !== void 0 && lowerValue !== void 0 && upperValue !== void 0 && lowerUnit !== void 0 && upperUnit !== void 0) {
			let exactOrder;
			if (lowerUnit === upperUnit) exactOrder = lowerValue < upperValue ? -1 : lowerValue > upperValue ? 1 : 0;
			else if (require_response_curve_basis.dimensionOf(lowerUnit) !== void 0 && require_response_curve_basis.dimensionOf(lowerUnit) !== "simulator_defined" && require_response_curve_basis.dimensionOf(lowerUnit) === require_response_curve_basis.dimensionOf(upperUnit)) try {
				exactOrder = require_response_curve_basis.compareExactUnitSumToValue([{
					value: lowerValue,
					unit: lowerUnit
				}], {
					value: upperValue,
					unit: upperUnit
				});
			} catch {
				exactOrder = void 0;
			}
			if (exactOrder === 1) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
				"data",
				"series",
				index,
				"bounds"
			], "the declared lower reference bound exceeds the upper bound under exact registered-unit comparison. Rounded display conversion cannot erase this contradiction."));
			else if (exactOrder === -1 && convertedLower !== void 0 && convertedUpper !== void 0) {
				const physicalAxis = require_response_curve_basis.dimensionOf(targetValueUnit ?? valuesUnit) !== "simulator_defined";
				let expectedWidth;
				if (physicalAxis) try {
					expectedWidth = require_response_curve_basis.convertExactUnitSum([{
						value: upperValue,
						unit: upperUnit
					}, {
						value: -lowerValue,
						unit: lowerUnit
					}], targetValueUnit ?? valuesUnit);
				} catch {
					expectedWidth = void 0;
				}
				const actualWidth = convertedUpper - convertedLower;
				if (!(convertedUpper > convertedLower) || !Number.isFinite(actualWidth) || physicalAxis && expectedWidth === void 0 || expectedWidth !== void 0 && (!(expectedWidth > 0) || !require_exact_binary64.binary64RelativeDifferenceWithinEpsilons(expectedWidth, actualWidth, EFFECT_RELATIVE_EPSILON_MULTIPLES))) errors.push(issue("SCIENCE_NUMERIC_RESOLUTION_UNREPRESENTABLE", "science", [
					"data",
					"series",
					index,
					"bounds"
				], `the exactly ordered reference bounds collapse or are materially distorted on the ${targetValueUnit ?? valuesUnit} display axis. Choose a better-scaled registered weight unit.`));
			}
		}
	}
	validateWeightAxisEmbedding(weightAxisWitnesses, targetValueUnit, errors);
	const observation = asRecord(data.observation) ?? {};
	const duplicatePolicy = asString(asRecord(parameters.duplicateTimePolicy)?.policy) ?? asString(parameters.duplicateTimePolicy);
	if (observation.kind === "interpolated_trajectory") {
		if (asString(observation.interpolant) !== "linear") errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
			"data",
			"observation",
			"interpolant"
		], "revision 2 can render and authority-bind only a caller-supplied linear reconstruction. A non-linear interpolant must not be silently drawn as straight segments."));
		const eventKindSeries = series.findIndex((entry) => asArray(entry.eventKinds) !== void 0);
		if (eventKindSeries >= 0) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
			"data",
			"series",
			eventKindSeries,
			"eventKinds"
		], "interpolated trajectory points are caller reconstructions, not source events or observations. Their reconstruction carrier records method, interpolant, and author; eventKinds is forbidden rather than misrepresenting a reconstruction vertex as a source event."));
		if (excludedSourceTimeEdges.size > 0) {
			const seriesIndex = series.findIndex((entry) => excludedSourceTimeEdges.has(asString(entry.edgeId) ?? ""));
			errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
				"data",
				"series",
				Math.max(0, seriesIndex),
				"time",
				"values"
			], "revision 2 refuses to filter reconstruction vertices outside the effective analysis/recording window: an excluded linear knot can determine geometry inside the window. Pre-clip the trajectory upstream and declare the exact retained vertices."));
		}
		if (duplicatePolicy === "keep_replicates" && duplicateTimeEdges.size > 0) errors.push(issue("SCIENCE_DUPLICATE_TIME_POLICY", "science", ["parameters", "duplicateTimePolicy"], "an interpolated trajectory must be a function of time. Two retained reconstruction vertices at one time cannot be kept as replicates; use a named duplicate aggregate or reject the request."));
	}
	if (duplicateTimeEdges.size > 0 && observation.kind === "event_updated") errors.push(issue("SCIENCE_DUPLICATE_TIME_POLICY", "science", ["parameters", "duplicateTimePolicy"], "revision 2 refuses every event-updated duplicate timestamp. A single global before/after discriminator cannot identify the side or sequential event represented by each same-time row, and stable array order alone is not a scientific event-order claim."));
	if (duplicateTimeEdges.size > 0 && observation.kind === "point_sample" && duplicatePolicy === "keep_replicates") errors.push(issue("SCIENCE_DUPLICATE_TIME_POLICY", "science", ["parameters", "duplicateTimePolicy"], "revision 2 cannot join repeated point samples at one time without inventing a within-time vertical trajectory or ordering. Collapse them by one named method or reject the figure; duplicate markers need a future explicit geometry carrier."));
	if (duplicatePolicy === "aggregate") for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
		const edgeId = asString(series[seriesIndex].edgeId);
		if (edgeId !== void 0 && duplicateTimeEdges.has(edgeId) && asString(asRecord(series[seriesIndex].uncertainty)?.kind) !== "none") {
			errors.push(issue("SCIENCE_DUPLICATE_TIME_POLICY", "science", [
				"data",
				"series",
				seriesIndex,
				"uncertainty"
			], "a duplicate-time point aggregate cannot carry per-observation uncertainty: Cortexel has no declared model for propagating uncertainty from several source rows into the collapsed value."));
			break;
		}
	}
	const derived = display === "aggregate_derived" || display === "aggregate_derived_with_members";
	if (derived && observation.kind === "event_updated" && observation.updateSemantics === "value_before_update") errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
		"parameters",
		"aggregate",
		"evaluation"
	], "revision 2 derives hold aggregates only for value_after_update. A value-before aggregate needs side-qualified terminal and denominator-transition carriers to bind its trailing interval without painting a future state backward; those carriers do not yet exist."));
	const membership = asRecord(data.membership);
	if (derived && membership === void 0) {
		errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", ["data", "membership"], "a derived aggregate requires the exact identified membership and its intervals."));
		return errors;
	}
	if (!derived && membership !== void 0) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", ["data", "membership"], "membership is meaningful only for a derived aggregate display. An individual view must not carry an unused denominator claim."));
	if (membership === void 0) return errors;
	const members = records(membership.members);
	const membershipUnit = asString(membership.unit);
	const groupId = asString(membership.groupId);
	if (groupId !== void 0 && edgeIds.has(groupId)) errors.push(issue("SEMANTIC_DUPLICATE_ID", "semantic", [
		"data",
		"membership",
		"groupId"
	], "the aggregate groupId must not equal any member edgeId. Series identity is global within the figure table and geometry authority."));
	const memberIds = /* @__PURE__ */ new Set();
	const convertedMembershipByEdge = /* @__PURE__ */ new Map();
	const membershipWitnessesByEdge = /* @__PURE__ */ new Map();
	for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
		if (errors.length >= 32) break;
		const edgeId = asString(members[memberIndex].edgeId);
		if (edgeId !== void 0 && memberIds.has(edgeId)) errors.push(issue("SEMANTIC_DUPLICATE_ID", "semantic", [
			"data",
			"membership",
			"members",
			memberIndex,
			"edgeId"
		], "each aggregate member edgeId must appear exactly once. A Map overwrite is not a membership policy."));
		if (edgeId !== void 0) memberIds.add(edgeId);
		if (edgeId !== void 0 && !edgeIds.has(edgeId)) errors.push(issue("SEMANTIC_UNKNOWN_REFERENCE", "semantic", [
			"data",
			"membership",
			"members",
			memberIndex,
			"edgeId"
		], "an aggregate member must resolve to exactly one declared edge series."));
		const intervals = records(members[memberIndex].intervals);
		const convertedIntervals = [];
		const intervalWitnesses = [];
		let previousStop;
		for (let intervalIndex = 0; intervalIndex < intervals.length; intervalIndex++) {
			if (errors.length >= 32) break;
			const start = asNumber(intervals[intervalIndex].start);
			const stop = asNumber(intervals[intervalIndex].stop);
			if (start === void 0 || stop === void 0) continue;
			if (!(start < stop)) errors.push(issue("SCIENCE_WINDOW_INVALID", "science", [
				"data",
				"membership",
				"members",
				memberIndex,
				"intervals",
				intervalIndex
			], "membership intervals are half-open and must have start < stop. A reversed or empty interval cannot silently erase a member."));
			if (previousStop !== void 0 && start < previousStop) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
				"data",
				"membership",
				"members",
				memberIndex,
				"intervals",
				intervalIndex
			], "membership intervals for one edge must be ordered and non-overlapping. Cortexel does not union or reorder caller-authored denominator spans."));
			if (membershipUnit !== void 0 && windowUnit !== void 0 && start < stop) {
				const intervalPath = [
					"data",
					"membership",
					"members",
					memberIndex,
					"intervals",
					intervalIndex
				];
				const converted = convertOrderedInterval(start, stop, membershipUnit, windowUnit, intervalPath, errors);
				if (converted !== void 0) convertedIntervals.push(converted);
				intervalWitnesses.push({
					value: start,
					unit: membershipUnit,
					path: [...intervalPath, "start"]
				}, {
					value: stop,
					unit: membershipUnit,
					path: [...intervalPath, "stop"]
				});
			}
			previousStop = stop;
		}
		if (edgeId !== void 0) {
			convertedMembershipByEdge.set(edgeId, convertedIntervals);
			membershipWitnessesByEdge.set(edgeId, intervalWitnesses);
		}
	}
	const unusedSeriesIds = [...edgeIds].filter((edgeId) => !memberIds.has(edgeId));
	if (unusedSeriesIds.length > 0 || memberIds.size !== edgeIds.size) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
		"data",
		"membership",
		"members"
	], `derived mode requires membership to select the exact data.series identity set. Unused raw series would enter the complete table and source-carrier counts without being drawn or influencing the aggregate${unusedSeriesIds.length > 0 ? `; unused ids: ${unusedSeriesIds.join(", ")}` : ""}.`));
	const aggregate = asRecord(parameters.aggregate) ?? {};
	const evaluation = asRecord(aggregate.evaluation) ?? {};
	const evaluationMode = asString(evaluation.mode);
	const selectedValueUnits = new Set(series.flatMap((entry) => {
		const edgeId = asString(entry.edgeId);
		const unit = asString(asRecord(entry.values)?.unit);
		return edgeId !== void 0 && memberIds.has(edgeId) && unit !== void 0 ? [unit] : [];
	}));
	if (selectedValueUnits.size > 1) errors.push(issue("SCIENCE_WEIGHT_GROUP_INCOMPATIBLE", "science", ["parameters", "weightComparability"], `a derived aggregate requires one exact weight unit code across every selected member; got ${[...selectedValueUnits].join(", ")}. Independently rounding heterogeneous units before pooling can erase real variation or double-round the statistic. Convert upstream under an explicit recorded transform.`));
	if (observation.kind === "event_updated" && (evaluationMode === "hold_last_observed_at_union_times" || evaluationMode === "hold_last_observed_at_declared_times")) for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
		const entry = series[seriesIndex];
		const edgeId = asString(entry.edgeId);
		if (edgeId === void 0 || !memberIds.has(edgeId)) continue;
		const valueUnit = asString(asRecord(entry.values)?.unit);
		const initialUnit = asString(asRecord(asRecord(entry.initialWeight)?.quantity)?.unit);
		if (valueUnit !== void 0 && initialUnit !== void 0 && initialUnit !== valueUnit) {
			errors.push(issue("SCIENCE_WEIGHT_GROUP_INCOMPATIBLE", "science", [
				"data",
				"series",
				seriesIndex,
				"initialWeight",
				"quantity",
				"unit"
			], `a derived hold requires the declared initial weight to use the member series' exact unit code ${valueUnit}; got ${initialUnit}. Independently rounding an initial state before pooling can erase real variation or double-round the aggregate.`));
			break;
		}
	}
	const selectedDuplicateTime = [...memberIds].some((edgeId) => duplicateTimeEdges.has(edgeId));
	if (evaluationMode === "shared_sample_grid" && selectedDuplicateTime && duplicatePolicy === "keep_replicates") errors.push(issue("SCIENCE_DUPLICATE_TIME_POLICY", "science", ["parameters", "duplicateTimePolicy"], "shared_sample_grid has no cross-synapse replicate identity with which to pair repeated samples at one timestamp. Aggregate the within-synapse point replicates by a named method first, or reject them; Cortexel will not pair them by array ordinal."));
	const dispersion = asRecord(aggregate.dispersion);
	const dispersionKind = asString(dispersion?.kind);
	if (dispersionKind === "standard_error" || dispersionKind === "confidence_interval" || dispersionKind === "credible_interval") errors.push(issue("SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL", "science", [
		"parameters",
		"aggregate",
		"dispersion",
		"kind"
	], `${dispersionKind} is inferential and is unsupported for an exact declared synapse ensemble. The request declares no sampling estimand, sampling design, exchangeability model, repeat universe, coverage procedure, or verified posterior from which that carrier could be derived.`));
	if (dispersionKind === "standard_deviation" && asString(aggregate.method) !== "mean") errors.push(issue("SCIENCE_UNCERTAINTY_UNSUPPORTED_FOR_SKILL", "science", [
		"parameters",
		"aggregate",
		"dispersion",
		"kind"
	], "standard deviation is dispersion about the mean and revision 2 renders it as mean plus or minus one SD. Centering that carrier on a median, minimum, or maximum would fabricate endpoints with no declared statistical meaning."));
	if (asString(dispersion?.kind) === "quantile_interval") {
		const lowerQuantile = asNumber(dispersion?.lowerQuantile);
		const upperQuantile = asNumber(dispersion?.upperQuantile);
		if (lowerQuantile !== void 0 && upperQuantile !== void 0 && !(lowerQuantile < upperQuantile)) errors.push(issue("SCIENCE_UNCERTAINTY_LEVEL_INVALID", "science", [
			"parameters",
			"aggregate",
			"dispersion",
			"upperQuantile"
		], `the lower aggregate quantile (${lowerQuantile}) must be strictly below the upper quantile (${upperQuantile}).`));
	}
	if ((evaluationMode === "hold_last_observed_at_union_times" || evaluationMode === "hold_last_observed_at_declared_times") && observation.kind !== "event_updated" || evaluationMode === "shared_sample_grid" && observation.kind !== "point_sample") errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
		"parameters",
		"aggregate",
		"evaluation",
		"mode"
	], "the aggregate evaluation contradicts the observation kind: holds require event-updated values and shared_sample_grid requires point samples."));
	for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
		const edgeId = asString(series[seriesIndex].edgeId);
		if (!memberIds.has(edgeId ?? "")) continue;
		if ((evaluationMode === "hold_last_observed_at_union_times" || evaluationMode === "hold_last_observed_at_declared_times") && asString(asRecord(series[seriesIndex].recordedInterval)?.boundary) !== "[start,stop)") errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
			"data",
			"series",
			seriesIndex,
			"recordedInterval",
			"boundary"
		], "a derived hold aggregate currently requires half-open recorded intervals. A closed recorded stop creates a left-sided availability transition that the aggregate step carrier cannot encode without drawing the post-boundary denominator backward."));
	}
	if (windowUnit !== void 0) {
		const declaredTime = asRecord(evaluation.times);
		const declaredTimeUnit = asString(declaredTime?.unit);
		const declaredTimeValues = finiteNumbers(declaredTime?.values);
		if (declaredTime !== void 0) validateTimeVectorFidelity(declaredTime, windowUnit, [
			"parameters",
			"aggregate",
			"evaluation",
			"times",
			"values"
		], errors);
		validateDecisionTimeEmbedding([
			...[...memberIds].flatMap((edgeId) => decisionWitnessesByEdge.get(edgeId) ?? []),
			...[...memberIds].flatMap((edgeId) => membershipWitnessesByEdge.get(edgeId) ?? []),
			...declaredTimeUnit === void 0 ? [] : declaredTimeValues.map((value, index) => ({
				value,
				unit: declaredTimeUnit,
				path: [
					"parameters",
					"aggregate",
					"evaluation",
					"times",
					"values",
					index
				]
			}))
		], windowUnit, errors);
	}
	const windowStart = asNumber(window.start);
	const windowStop = asNumber(window.stop);
	const windowClosed = asString(window.boundary) === "[start,stop]";
	const inAnalysisWindow = (value) => windowStart !== void 0 && windowStop !== void 0 && value >= windowStart && (value < windowStop || windowClosed && value === windowStop);
	const stateChangeTimes = [
		...windowStart === void 0 ? [] : [windowStart],
		...windowClosed && windowStop !== void 0 ? [windowStop] : [],
		...[...memberIds].flatMap((edgeId) => timeGrids.get(edgeId)?.values ?? []),
		...[...memberIds].flatMap((edgeId) => (convertedMembershipByEdge.get(edgeId) ?? []).flatMap((interval) => [interval.start, interval.stop])),
		...[...memberIds].flatMap((edgeId) => {
			const interval = recordedIntervalsByEdge.get(edgeId);
			return interval === void 0 ? [] : [interval.start, interval.stop];
		})
	].filter(inAnalysisWindow);
	const requiredStateChanges = [...new Set(stateChangeTimes)].sort((left, right) => left - right);
	if (evaluationMode === "shared_sample_grid" && edgeIds.size === series.length && memberIds.size > 0) {
		let reference;
		for (const member of members) {
			const edgeId = asString(member.edgeId);
			if (edgeId === void 0) continue;
			const grid = timeGrids.get(edgeId);
			if (grid === void 0) continue;
			if (reference === void 0) {
				reference = grid.values;
				continue;
			}
			if (grid.values.length !== reference.length || grid.values.some((value, index) => value !== reference?.[index])) {
				errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
					"data",
					"series",
					grid.index,
					"time",
					"values"
				], "shared_sample_grid requires every selected member to have an exact elementwise-identical accepted time grid after one registered-unit conversion and recorded/window filtering. Cortexel does not interpolate or align nearby samples."));
				break;
			}
		}
	}
	if (evaluationMode === "hold_last_observed_at_declared_times" && windowUnit !== void 0) {
		const converted = convertTimes(asRecord(evaluation.times) ?? {}, windowUnit, [
			"parameters",
			"aggregate",
			"evaluation",
			"times",
			"values"
		], errors);
		if (converted !== void 0) {
			validateIncreasingWindowTimes(converted, window, [
				"parameters",
				"aggregate",
				"evaluation",
				"times",
				"values"
			], errors);
			const declaredSet = new Set(converted);
			const missingStateChange = requiredStateChanges.find((time) => !declaredSet.has(time));
			if (missingStateChange !== void 0) errors.push(issue("SCIENCE_NORMALIZATION_UNVERIFIABLE", "science", [
				"parameters",
				"aggregate",
				"evaluation",
				"times",
				"values"
			], `a declared hold grid must contain every in-window observation, membership, recording, and initial-state transition so the derived step cannot be held across an omitted change. The converted grid is missing ${missingStateChange} ${windowUnit}.`));
		}
	}
	return errors;
};

//#endregion
//#region src/core/semantics/compartment-trace.ts
/**
* Scientific identity rules for a compartment trace.
*
* A series identity is the ordered pair (compartmentId, signalId). It is kept as
* two map levels rather than serialized with a delimiter: identifiers may contain
* every plausible delimiter, so `("a:b", "c")` and `("a", "b:c")` must remain
* distinct.
*/
const VALIDATOR_ID = "compartment_trace.series_identity_declared";
/**
* Bind every recorded series to the declared compartment universe and require one
* unambiguous record per exact (compartmentId, signalId) identity.
*/
const compartmentTraceSeriesIdentityDeclared = (context) => {
	if (context.skillId !== "neuro.compartment_trace") return [];
	const data = getData(context);
	const compartmentIds = asArray(data.compartmentIds);
	const series = asArray(data.series);
	if (compartmentIds === void 0 || series === void 0) return [];
	const universe = /* @__PURE__ */ new Set();
	for (const compartmentId of compartmentIds) if (typeof compartmentId === "string") universe.add(compartmentId);
	const firstOrdinalByIdentity = /* @__PURE__ */ new Map();
	const errors = [];
	for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
		const entry = asRecord(series[seriesIndex]);
		if (entry === void 0) continue;
		const compartmentId = entry.compartmentId;
		const signalId = entry.signalId;
		if (typeof compartmentId !== "string" || typeof signalId !== "string") continue;
		if (!universe.has(compartmentId)) errors.push(require_errors.makeError({
			code: "SEMANTIC_UNKNOWN_REFERENCE",
			stage: "semantic",
			instancePath: require_errors.pointer("data", "series", seriesIndex, "compartmentId"),
			validatorId: VALIDATOR_ID,
			message: "this series refers to a compartmentId absent from data.compartmentIds. Cortexel does not add a recorded compartment to the declared row universe implicitly."
		}));
		let firstOrdinalBySignal = firstOrdinalByIdentity.get(compartmentId);
		if (firstOrdinalBySignal === void 0) {
			firstOrdinalBySignal = /* @__PURE__ */ new Map();
			firstOrdinalByIdentity.set(compartmentId, firstOrdinalBySignal);
		}
		const firstOrdinal = firstOrdinalBySignal.get(signalId);
		if (firstOrdinal !== void 0) errors.push(require_errors.makeError({
			code: "SEMANTIC_DUPLICATE_ID",
			stage: "semantic",
			instancePath: require_errors.pointer("data", "series", seriesIndex, "signalId"),
			validatorId: VALIDATOR_ID,
			message: `this exact (compartmentId, signalId) identity already belongs to data.series/${firstOrdinal}. One scientific identity cannot name two recordings, because row, mark, and table binding would become ambiguous.`
		}));
		else firstOrdinalBySignal.set(signalId, seriesIndex);
	}
	return errors;
};

//#endregion
//#region src/core/semantics/index.ts
/**
* The semantic validator registry.
*
* Maps each id in `contract/registries/semantic-validators.v1.json` to a
* hand-written function. The registry wires ids to functions; it never generates
* algorithm code from a string, because a scientific rule that can be edited
* without review is not a rule.
*
* A startup assertion checks that every registered id has an implementation. A
* contract that references a validator nobody wrote would otherwise become a figure
* that silently skipped a check.
*/
const SEMANTIC_VALIDATORS = Object.freeze({
	"provenance.no_caller_assurance": require_provenance.provenanceNoCallerAssurance,
	"provenance.note_safe_display": require_provenance.provenanceNoteSafeDisplay,
	"unit.dimension_match": unitDimensionMatch,
	"unit.canonical_code": unitCanonicalCode,
	"series.equal_length": seriesEqualLength,
	"ids.unique": idsUnique,
	"bins.strictly_increasing": binsStrictlyIncreasing,
	"window.valid": windowValid,
	"events.source_clock_declared": eventsSourceClockDeclared,
	"events.within_window": eventsWithinWindow,
	"events.sender_universe_declared": eventsSenderUniverseDeclared,
	"events.trial_universe_declared": eventsTrialUniverseDeclared,
	"rate.denominator_positive": rateDenominatorPositive,
	"rate.verify_normalization": rateVerifyNormalization,
	"histogram.normalization_consistent": histogramNormalizationConsistent,
	"isi.within_train_only": isiWithinTrainOnly,
	"isi.zero_interval_policy": isiZeroIntervalPolicy,
	"psth.alignment_declared": psthAlignmentDeclared,
	"correlogram.event_trains_valid": correlogramEventTrainsValid,
	"correlogram.lag_range_valid": correlogramLagRangeValid,
	"correlogram.prebinned_axis_consistent": correlogramPrebinnedAxisConsistent,
	"correlogram.roles_disjoint": correlogramRolesDisjoint,
	"correlogram.statistic_denominator": correlogramStatisticDenominator,
	"topology.scope_declared": topologyScopeDeclared,
	"topology.scope_supports_claim": topologyScopeSupportsClaim,
	"topology.node_universe_declared": topologyNodeUniverseDeclared,
	"topology.edge_endpoints_in_universe": topologyEdgeEndpointsInUniverse,
	"topology.matrix_contract": topologyMatrixContract,
	"topology.multapse_aggregation_declared": topologyMultapseAggregationDeclared,
	"topology.delay_positive": topologyDelayPositive,
	"topology.weight_group_compatible": topologyWeightGroupCompatible,
	"degree.counting_policy_declared": degreeCountingPolicyDeclared,
	"spatial.position_coverage_complete": spatialPositionCoverageComplete,
	"spatial.equal_axis_units": spatialEqualAxisUnits,
	"uncertainty.valid": uncertaintyValid,
	"uncertainty.supported_variant": uncertaintySupportedVariant,
	"trace.duplicate_time_policy": traceDuplicateTimePolicy,
	"trace.axis_dimension_compatible": traceAxisDimensionCompatible,
	"compartment_trace.series_identity_declared": compartmentTraceSeriesIdentityDeclared,
	"phase_plane.derivative_dimension": phasePlaneDerivativeDimension,
	"weight_trace.observation_kind_declared": weightTraceObservationKindDeclared,
	"response_curve.estimator_declared": responseCurveEstimatorDeclared
});
/**
* Every id the contract registers must have an implementation.
*
* Without this, a skill could reference a validator that does not exist and the
* rule would simply never run — the figure would be produced, unvalidated, with no
* indication that anything was skipped. That is the worst possible failure mode, so
* it is a startup error rather than a silent no-op.
*/
function assertValidatorsImplemented() {
	const missing = require_registry.SEMANTIC_VALIDATOR_IDS.filter((id) => !Object.prototype.hasOwnProperty.call(SEMANTIC_VALIDATORS, id));
	if (missing.length > 0) throw new Error(`semantic validators registered in the contract but not implemented: ${missing.join(", ")}. A skill referencing one of these would skip the rule entirely.`);
}
assertValidatorsImplemented();
/** Run every semantic validator this skill's contract declares. */
function runSemanticValidators(request, skillId) {
	const catalog = require_catalog.SKILL_CATALOG[skillId];
	const errors = [];
	for (const declared of catalog.semanticValidators) {
		const validator = SEMANTIC_VALIDATORS[declared.id];
		if (!validator) continue;
		const context = {
			request,
			skillId,
			...declared.parameters ? { parameters: declared.parameters } : {}
		};
		errors.push(...validator(context));
	}
	return require_errors.finalizeErrors(errors);
}
/**
* The authority check, run BEFORE the schema.
*
* A closed schema would already reject these fields as unknown properties. That is
* not good enough: an agent told "unknown property: validation" concludes it made a
* typo and tries a different spelling. It needs to be told that authoring a
* conclusion is something the contract permits nobody to do.
*/
function checkCallerAuthority(request) {
	return require_errors.finalizeErrors([...require_provenance.provenanceNoCallerAssurance({
		request,
		skillId: "unknown"
	}), ...require_provenance.provenanceNoteSafeDisplay({
		request,
		skillId: "unknown"
	})]);
}

//#endregion
//#region src/core/request.ts
/**
* The validation pipeline.
*
* Stages, in this order, and the order is load-bearing:
*
*   1. BOUNDARY    — raw JSON text, or a safe snapshot of a JS value.
*   2. AUTHORITY   — did the caller try to author a conclusion? Checked FIRST, on
*                    the raw request, so a forbidden field cannot hide behind a
*                    schema error or be smuggled in through a default.
*   3. IDENTITY    — is this request written against a contract we implement?
*   4. STRUCTURAL  — JSON Schema. Does it have the right shape?
*   5. SEMANTIC    — the named rules. Does it MEAN anything?
*   6. CANONICAL   — materialize documented defaults and the resolved skill revision.
*
* A failure at any stage stops the pipeline. There is no partial success and no
* "valid enough": the output of this function is either a canonical request that
* every later stage may rely on, or a list of reasons it is not one.
*
* The returned success value is BRANDED. Rendering accepts only that brand, so a
* plain object that merely looks like a validated request cannot be rendered — the
* nominal type and private runtime WeakSet both refuse it. That is what makes "no
* renderer may bypass validation" a fact rather than a convention.
*/
const VALIDATED = Symbol("cortexel.validated");
const VALIDATED_REQUESTS = /* @__PURE__ */ new WeakSet();
function isValidatedRequest(value) {
	return typeof value === "object" && value !== null && VALIDATED_REQUESTS.has(value);
}
/** Finalize one fail-closed validation outcome under the captured input assurance. */
function fail(errors, assurance) {
	return {
		ok: false,
		errors: require_errors.finalizeErrors([...errors]),
		inputAssurance: assurance
	};
}
/** Read `skill.id` without trusting anything else about the value yet. */
function readSkillId(request) {
	const skill = request.skill;
	if (typeof skill !== "object" || skill === null || Array.isArray(skill)) return void 0;
	const id = skill.id;
	return typeof id === "string" ? id : void 0;
}
function checkIdentity(request) {
	const errors = [];
	const contract = request.contract;
	if (!Object.prototype.hasOwnProperty.call(request, "contract")) {
		const expectedContract = {
			name: require_contract_identity.REQUEST_CONTRACT_IDENTITY.name,
			version: require_contract_identity.REQUEST_CONTRACT_IDENTITY.version
		};
		errors.push(require_errors.makeError({
			code: "CONTRACT_MISSING",
			stage: "identity",
			instancePath: "/contract",
			message: `the request does not declare its contract. Add ${JSON.stringify({ contract: expectedContract })} — an undeclared contract is not a ${require_contract_identity.REQUEST_CONTRACT_IDENTITY.version} request.`,
			repair: {
				operation: "add",
				path: "/contract",
				value: expectedContract,
				reasonCode: "CONTRACT_MISSING"
			}
		}));
		return errors;
	}
	if (typeof contract !== "object" || contract === null || Array.isArray(contract)) {
		errors.push(require_errors.makeError({
			code: "CONTRACT_SHAPE_INVALID",
			stage: "identity",
			instancePath: "/contract",
			message: "the declared contract member is not an object. Cortexel will not overwrite it or infer which contract the caller intended."
		}));
		return errors;
	}
	const record = contract;
	if (record.name !== require_contract_identity.REQUEST_CONTRACT_IDENTITY.name || record.version !== require_contract_identity.REQUEST_CONTRACT_IDENTITY.version) errors.push(require_errors.makeError({
		code: "CONTRACT_UNSUPPORTED_VERSION",
		stage: "identity",
		instancePath: "/contract",
		message: `this build implements ${require_identity.REQUEST_CONTRACT}. Compare with getBuildIdentity(), then use migrateLegacyRequest() for a supported pre-1.0 request. The packaged CLI equivalents are \`cortexel identity --json\` and \`cortexel migrate ...\`; a repository checkout may run the same implementation through \`bun src/cli/main.ts ...\`.`
	}));
	const digest = request.contractDigest;
	if (typeof digest === "string" && digest !== "sha256:c5ae167f1d7f07650eb240750abd78bae7453940ae21d4d50e4ecb56b0c7681f") errors.push(require_errors.makeError({
		code: "CONTRACT_DIGEST_MISMATCH",
		stage: "identity",
		instancePath: "/contractDigest",
		message: `the pinned contract digest does not match this build's (${require_identity.CONTRACT_DIGEST}). The contract you validated against is not the contract in use; that is exactly what pinning is for.`
	}));
	return errors;
}
function checkSkill(skillId) {
	if (skillId === void 0) return [require_errors.makeError({
		code: "SCHEMA_REQUIRED_PROPERTY_MISSING",
		stage: "structural",
		instancePath: "/skill/id",
		message: "the request does not name a skill."
	})];
	const entry = require_catalog.lookupSkillCatalogEntry(skillId);
	if (entry && entry.status === "stable") return [];
	const legacy = require_catalog.LEGACY_SKILL_MAP[skillId];
	if (legacy) return [require_errors.makeError({
		code: "MIGRATION_LEGACY_ID_NOT_ACCEPTED",
		stage: "structural",
		instancePath: "/skill/id",
		message: `"${skillId}" is a pre-1.0 id. ${legacy.targetId ? `It maps to "${legacy.targetId}".` : ""} Use migrateLegacyRequest() or \`cortexel migrate\`. Legacy ids are never silently aliased: a silent alias would make the stored artifact ambiguous about which contract actually validated it.`,
		...legacy.targetId ? { repair: {
			operation: "migrate",
			path: "/skill/id",
			value: legacy.targetId,
			reasonCode: "MIGRATION_LEGACY_ID_NOT_ACCEPTED"
		} } : {}
	})];
	if (entry && entry.status === "experimental") return [require_errors.makeError({
		code: "CAPABILITY_EXPERIMENTAL",
		stage: "structural",
		instancePath: "/skill/id",
		message: `"${skillId}" is experimental and cannot be selected through the stable entry point. Inspect CAPABILITY_CATALOG from cortexel/figure or cortexel/authoring and its availability field; no experimental FigureRequestV1 skill is currently callable, and a legacy experimental package export is not a replacement.`
	})];
	return [require_errors.makeError({
		code: "SCHEMA_UNKNOWN_SKILL",
		stage: "structural",
		instancePath: "/skill/id",
		message: `"${skillId}" is not in the stable catalog. Read STABLE_SKILL_IDS or run \`cortexel catalog\`.`
	})];
}
/**
* Canonicalize.
*
* Deliberately conservative. It materializes documented defaults and orders
* map-like records — and that is ALL. It never sorts an event sequence, never
* deduplicates a sample, never infers a missing population, and never drops a field
* it does not recognize. Canonicalization makes a request comparable; it must not
* make it different.
*/
function canonicalizeRequest(request, resolvedSkillRevision) {
	const out = { ...request };
	out.skill = {
		...request.skill,
		revision: resolvedSkillRevision
	};
	out.presentation = {
		themeId: "light",
		width: 720,
		height: 440,
		budgetProfile: "standard",
		...out.presentation ?? {}
	};
	return out;
}
/** The core of both public entry points. */
function validateSnapshot(value, assurance) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return fail([require_errors.makeError({
		code: "SCHEMA_TYPE_MISMATCH",
		stage: "structural",
		message: "a figure request must be a JSON object."
	})], assurance);
	const request = value;
	const authorityErrors = checkCallerAuthority(request);
	if (authorityErrors.length > 0) return fail(authorityErrors, assurance);
	const identityErrors = checkIdentity(request);
	if (identityErrors.length > 0) return fail(identityErrors, assurance);
	const skillId = readSkillId(request);
	const skillErrors = checkSkill(skillId);
	if (skillErrors.length > 0) return fail(skillErrors, assurance);
	if (skillId === void 0 || !require_catalog.isStableSkillId(skillId)) return fail([require_errors.makeError({
		code: "INTERNAL_INVARIANT_VIOLATED",
		stage: "internal",
		instancePath: "/skill/id",
		message: "skill identity checking accepted an id outside the generated stable catalog. Cortexel refused to mint a validated request."
	})], assurance);
	const catalog = require_catalog.SKILL_CATALOG[skillId];
	const requestedRevision = request.skill.revision;
	if (typeof requestedRevision === "number" && requestedRevision !== catalog.revision) return fail([require_errors.makeError({
		code: "CONTRACT_SKILL_REVISION_UNSUPPORTED",
		stage: "identity",
		instancePath: "/skill/revision",
		message: `this build provides ${skillId} revision ${catalog.revision}, not ${requestedRevision}. Omit the field to accept the installed revision.`
	})], assurance);
	const structural = require_structural_validator.validateStructure(request, skillId);
	if (!structural.ok) return fail(structural.errors, assurance);
	const semanticErrors = runSemanticValidators(request, skillId);
	if (semanticErrors.filter((error) => error.severity === "error").length > 0) return fail(semanticErrors, assurance);
	const canonicalRequest = canonicalizeRequest(request, catalog.revision);
	const validated = require_deep_freeze.deepFreeze({
		[VALIDATED]: true,
		skillId,
		skillRevision: catalog.revision,
		canonicalRequest,
		inputAssurance: assurance,
		requestDigest: require_canonicalize.canonicalDigest(canonicalRequest),
		warnings: semanticErrors.filter((error) => error.severity === "warning"),
		checkedValidatorIds: [...new Set(catalog.semanticValidators.map((validator) => validator.id))]
	});
	VALIDATED_REQUESTS.add(validated);
	return {
		ok: true,
		request: validated
	};
}
/**
* Validate raw JSON TEXT.
*
* This is the strong boundary: it can certify that no object member appeared twice.
* `cortexel validate file.json` uses it, and the artifact records
* `duplicateKeys: "rejected_before_materialization"`.
*/
function parseAndValidateRequest(text, options = {}) {
	const captured = require_provenance.captureRawRequestInput(text, options);
	if (!captured.ok) return fail(captured.errors, captured.assurance);
	return validateSnapshot(captured.value, captured.assurance);
}
/**
* Validate an already-materialized JavaScript value.
*
* This boundary is WEAKER, and says so. By the time a JavaScript object exists,
* `JSON.parse` has already collapsed any duplicate member and one value silently
* won. No amount of inspection can recover which. So the assurance records
* `not_observable_after_materialization` rather than implying a check that did not
* happen — the honest answer, not the flattering one.
*/
function validateRequestValue(value, options = {}) {
	const captured = require_provenance.captureMaterializedRequestInput(value, options);
	if (!captured.ok) return fail(captured.errors, captured.assurance);
	return validateSnapshot(captured.value, captured.assurance);
}

//#endregion
exports.isValidatedRequest = isValidatedRequest;
exports.parseAndValidateRequest = parseAndValidateRequest;
exports.validateRequestValue = validateRequestValue;
//# sourceMappingURL=request-capability.cjs.map