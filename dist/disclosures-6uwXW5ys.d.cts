import { m as DisclosureId } from "./errors-DLTGhSm-.cjs";
//#region src/core/disclosures.d.ts
interface Disclosure {
  readonly id: DisclosureId;
  readonly severity: 'critical' | 'important' | 'informational';
  readonly text: string;
}
/** The facts a disclosure rule may examine. All library-generated; none caller-set. */
interface DisclosureFacts {
  readonly sourceKind: string;
  readonly sourceAuthenticityVerified: boolean;
  readonly referenceComparisonRun: boolean;
  readonly scopeKind?: string;
  readonly rank?: number;
  readonly worldSize?: number;
  readonly nodeUniverseComplete?: boolean;
  readonly excludedOutOfWindow?: number;
  readonly nestSerializedClock?: boolean;
  readonly nestCaptureBoundedPositiveInfinity?: boolean;
  readonly missingValueCount?: number;
  readonly unitConversions?: readonly string[];
  readonly duplicateTimeAggregateMethod?: string;
  readonly uncertaintyKind?: string;
  readonly uncertaintyReason?: string;
  readonly uncertaintySeriesDeclared?: number;
  readonly uncertaintySeriesShown?: number;
  readonly uncertaintySeriesTotal?: number;
  readonly missingAggregateReplicateCount?: number;
  readonly kernelSmoothed?: boolean;
  readonly preBinned?: boolean;
  readonly rectangularSenderExposureAsserted?: boolean;
  readonly aggregateEstimator?: string;
  readonly aggregateSampleCount?: string;
  readonly eventScopeMembershipCardinalityOnly?: boolean;
  readonly eventScopeExternalAuthorityDeclared?: boolean;
  readonly callerNotePresent?: boolean;
  readonly nonStandardBudgetProfile?: boolean;
  readonly budgetProfileId?: string;
  readonly sampledRetained?: number;
  readonly sampledSource?: number;
  readonly retainedConnectionCount?: number;
  readonly sourceConnectionCount?: number;
  readonly multapseAggregation?: string;
  readonly multapseAggregated?: boolean;
  readonly schematicLayout?: boolean;
  readonly positionsMissing?: number;
  readonly positionsTotal?: number;
}
/**
 * Derive the disclosures for a figure.
 *
 * The list is deterministic: sorted by severity, then by rule id. The compiler may
 * additionally FORCE a rule that depends on facts only it knows (a correlogram always
 * discloses its lag orientation; a matrix discloses that absent is not zero) by
 * passing its id in `forced`. A forced rule still uses the registry text — the
 * compiler decides IF it fires, never WHAT it says.
 */
declare function deriveDisclosures(facts: DisclosureFacts, allowedIds: readonly string[], forced?: readonly string[]): Disclosure[];
//#endregion
export { DisclosureFacts as n, deriveDisclosures as r, Disclosure as t };
