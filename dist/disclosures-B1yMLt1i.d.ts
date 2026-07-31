import { D as DisclosureId } from './errors-DOfZeMp8.js';

/**
 * Disclosures — where honesty is mechanized.
 *
 * A disclosure is never something a caller writes, and never something a flag turns
 * off. Each one is DERIVED from a machine-checkable fact in the artifact, through the
 * closed rule registry. That is the whole design: the only way to remove a
 * disclosure is to remove the fact that causes it. A caller cannot suppress one by
 * omitting a field, weaken one by rewording it, or promote its data by setting a
 * boolean — because none of those change the facts these rules read.
 *
 * The exact same text is then written into four places — the artifact JSON, the
 * visible SVG footer, the programmatically referenced SVG description, and the table
 * metadata — and a test asserts all four agree. An omission from any one serialized
 * surface would violate that structural parity.
 */

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

export { type Disclosure as D, type DisclosureFacts as a, deriveDisclosures as d };
