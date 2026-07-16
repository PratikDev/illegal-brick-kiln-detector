export type ViolationRule =
	| "school"
	| "healthcare"
	| "residential"
	| "waterbody"
	| "forest"
	| "agricultural"
	| "railway";

export type ComplianceVerdict =
	| "likely_non_compliant"
	| "review_required"
	| "no_flag";

export type ComplianceSeverity = "high" | "medium";
export type CompliancePriorityBand = "high" | "medium" | "low";

export type Violation = {
	rule: ViolationRule;
	label: string;
	featureName: string | null;
	featureId: string;
	/** [lat, lon], already ordered for Leaflet by the API. */
	featureLatLon: [number, number];
	distanceM: number;
	thresholdM: number;
	severity: ComplianceSeverity;
	legalRef: string;
	legalRefVerified: boolean;
};

export type ComplianceSource = {
	name: string;
	license: string;
	url: string;
};

export type ComplianceResult = {
	verdict: ComplianceVerdict;
	violations: Violation[];
	populationWithin1km: number | null;
	priorityScore: number;
	priorityBand: CompliancePriorityBand;
	layersUsed: ViolationRule[];
	sources: ComplianceSource[];
	caveats: string[];
};

export type VerdictCopy = {
	title: string;
	note: string;
};

/**
 * Interface copy. The tool never asserts guilt: it recommends verification.
 * Keep these strings here so every surface says the same thing (DRY).
 */
export const VERDICT_COPY: Record<ComplianceVerdict, VerdictCopy> = {
	likely_non_compliant: {
		title: "Likely non-compliant",
		note: "Inside a statutory 1 km buffer. Verify on site before any action.",
	},
	review_required: {
		title: "Needs review",
		note: "Close to a protected area. A reviewer should look at this.",
	},
	no_flag: {
		title: "No flag from available layers",
		note: "Nothing found nearby in our map data. This is not proof of compliance.",
	},
};

const violationRules: readonly ViolationRule[] = [
	"school",
	"healthcare",
	"residential",
	"waterbody",
	"forest",
	"agricultural",
	"railway",
];

const verdicts: readonly ComplianceVerdict[] = [
	"likely_non_compliant",
	"review_required",
	"no_flag",
];

const priorityBands: readonly CompliancePriorityBand[] = ["high", "medium", "low"];

export function formatDistance(meters: number): string {
	return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters} m`;
}

export function formatPopulation(people: number): string {
	return people.toLocaleString("en-US");
}

/**
 * Tolerant on purpose. The prediction parser throws on bad data because a
 * malformed detection is unusable; compliance is an enhancement, so a malformed
 * block degrades to null and the detection still renders.
 */
export function parseCompliance(value: unknown): ComplianceResult | null {
	if (!isRecord(value)) {
		return null;
	}

	const verdict = pickFrom(value.verdict, verdicts);
	if (verdict === null || !Array.isArray(value.violations)) {
		return null;
	}

	const priorityScore = isFiniteNumber(value.priorityScore)
		? clamp(value.priorityScore, 0, 100)
		: 0;

	return {
		verdict,
		violations: value.violations
			.map(parseViolation)
			.filter((violation): violation is Violation => violation !== null),
		populationWithin1km: isFiniteNumber(value.populationWithin1km)
			? value.populationWithin1km
			: null,
		priorityScore,
		priorityBand:
			pickFrom(value.priorityBand, priorityBands) ?? bandFor(priorityScore),
		layersUsed: Array.isArray(value.layersUsed)
			? value.layersUsed
					.map((layer) => pickFrom(layer, violationRules))
					.filter((layer): layer is ViolationRule => layer !== null)
			: [],
		sources: Array.isArray(value.sources)
			? value.sources
					.map(parseSource)
					.filter((source): source is ComplianceSource => source !== null)
			: [],
		caveats: Array.isArray(value.caveats)
			? value.caveats.filter((caveat): caveat is string => typeof caveat === "string")
			: [],
	};
}

function parseViolation(value: unknown): Violation | null {
	if (!isRecord(value)) {
		return null;
	}

	const rule = pickFrom(value.rule, violationRules);
	const severity = pickFrom<ComplianceSeverity>(value.severity, ["high", "medium"]);
	const featureLatLon = parseLatLon(value.featureLatLon);

	if (
		rule === null ||
		severity === null ||
		featureLatLon === null ||
		!isFiniteNumber(value.distanceM) ||
		!isFiniteNumber(value.thresholdM) ||
		typeof value.featureId !== "string" ||
		typeof value.label !== "string" ||
		typeof value.legalRef !== "string"
	) {
		return null;
	}

	return {
		rule,
		label: value.label,
		featureName: typeof value.featureName === "string" ? value.featureName : null,
		featureId: value.featureId,
		featureLatLon,
		distanceM: Math.round(value.distanceM),
		thresholdM: Math.round(value.thresholdM),
		severity,
		legalRef: value.legalRef,
		legalRefVerified: value.legalRefVerified === true,
	};
}

function parseSource(value: unknown): ComplianceSource | null {
	if (
		!isRecord(value) ||
		typeof value.name !== "string" ||
		typeof value.license !== "string" ||
		typeof value.url !== "string"
	) {
		return null;
	}

	return { name: value.name, license: value.license, url: value.url };
}

function parseLatLon(value: unknown): [number, number] | null {
	if (!Array.isArray(value) || value.length !== 2) {
		return null;
	}

	const [lat, lon] = value;
	if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) {
		return null;
	}

	return [lat, lon];
}

function bandFor(score: number): CompliancePriorityBand {
	if (score >= 65) {
		return "high";
	}

	return score >= 35 ? "medium" : "low";
}

function pickFrom<T extends string>(value: unknown, allowed: readonly T[]): T | null {
	return typeof value === "string" && allowed.includes(value as T)
		? (value as T)
		: null;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
