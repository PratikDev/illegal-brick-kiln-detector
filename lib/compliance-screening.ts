import type { PredictionClassName } from "@/lib/prediction-api";

export type RegistryStatus = "verified-valid" | "expired" | "not-found" | "not-checked";
export type ComplianceRuleStatus = "flagged" | "clear" | "unknown";
export type ComplianceTier =
	| "probable-non-compliance"
	| "high-concern"
	| "review"
	| "insufficient-evidence";

export type ComplianceRule = {
	id: "residential-buffer" | "technology" | "licence" | "land-use";
	label: string;
	status: ComplianceRuleStatus;
	legalBasis: string;
	detail: string;
	evidence: "screening-replay" | "authority-record" | "missing";
};

export type ComplianceScreen = {
	tier: ComplianceTier;
	label: string;
	summary: string;
	flaggedRuleCount: number;
	missingEvidenceCount: number;
	rules: ComplianceRule[];
	registryStatus: RegistryStatus;
	isLegalDetermination: false;
};

type ComplianceInput = {
	nearbySettlementKm: number;
	className: PredictionClassName | null;
	registryStatus?: RegistryStatus;
};

export const COMPLIANCE_POLICY = {
	name: "Brick Manufacturing and Brick Kilns Establishment (Control) Act, 2013 (amended 2019)",
	section: "Section 8 location screening",
	residentialBufferKm: 1,
	actUrl:
		"https://bangladesh.gov.bd/sites/default/files/files/bangladesh.gov.bd/gurd_files/2e08b992_2223_44a9_ae59_28b805e606bc/%E0%A6%93%20%E0%A6%AD%E0%A6%BE%E0%A6%9F%E0%A6%BE%20%E0%A6%B8%E0%A7%8D%E0%A6%A5%E0%A6%BE%E0%A6%AA%E0%A6%A8%20%28%E0%A6%A8%E0%A6%BF%E0%A7%9F%E0%A6%A8%E0%A7%8D%E0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A6%A3%29%20%E0%A6%86%E0%A6%87%E0%A6%A8%2C%20%E0%A7%A8%E0%A7%A6%E0%A7%A7%E0%A7%A9.pdf",
	enforcementGuideUrl: "https://faolex.fao.org/docs/pdf/BGD234326.pdf",
} as const;

export function screenKilnCompliance({
	nearbySettlementKm,
	className,
	registryStatus = "not-checked",
}: ComplianceInput): ComplianceScreen {
	const rules: ComplianceRule[] = [
		createResidentialRule(nearbySettlementKm),
		createTechnologyRule(className),
		createLicenceRule(registryStatus),
		{
			id: "land-use",
			label: "Prohibited land-use check",
			status: "unknown",
			legalBasis: "Section 8(1)",
			detail: "Agricultural land, wetlands, forests, protected areas, and other prohibited-area layers are not bundled in this demo.",
			evidence: "missing",
		},
	];
	const flaggedRuleCount = rules.filter(({ status }) => status === "flagged").length;
	const missingEvidenceCount = rules.filter(({ status }) => status === "unknown").length;
	const tier = getTier(registryStatus, flaggedRuleCount);

	return {
		tier,
		label: TIER_CONTENT[tier].label,
		summary: TIER_CONTENT[tier].summary,
		flaggedRuleCount,
		missingEvidenceCount,
		rules,
		registryStatus,
		isLegalDetermination: false,
	};
}

export function getComplianceRank(tier: ComplianceTier): number {
	return {
		"probable-non-compliance": 4,
		"high-concern": 3,
		review: 2,
		"insufficient-evidence": 1,
	}[tier];
}

function createResidentialRule(distanceKm: number): ComplianceRule {
	const flagged = distanceKm < COMPLIANCE_POLICY.residentialBufferKm;
	return {
		id: "residential-buffer",
		label: "Potential residential buffer conflict",
		status: flagged ? "flagged" : "clear",
		legalBasis: "Section 8(3)(a)",
		detail: flagged
			? `Prepared proximity estimate is ${distanceKm.toFixed(1)} km, inside the 1 km screening buffer. Household count and the prohibited-area boundary still require verification.`
			: `Prepared proximity estimate is ${distanceKm.toFixed(1)} km, outside the 1 km screening buffer. This does not clear other location restrictions.`,
		evidence: "screening-replay",
	};
}

function createTechnologyRule(className: PredictionClassName | null): ComplianceRule {
	if (!className) {
		return {
			id: "technology",
			label: "Kiln technology screen",
			status: "unknown",
			legalBasis: "DoE cleaner-technology guidance",
			detail: "The model did not return a kiln technology class. Confirm technology during field inspection.",
			evidence: "missing",
		};
	}

	const isListedCleanerType = className === "Zigzag";
	return {
		id: "technology",
		label: "Kiln technology screen",
		status: isListedCleanerType ? "clear" : "flagged",
		legalBasis: "DoE cleaner-technology guidance",
		detail: isListedCleanerType
			? "The replay class is Zigzag, a listed cleaner technology. Field inspection must confirm the actual design and operation."
			: `The replay class is ${className}, outside the cleaner-technology types represented by this demo. Model classification alone cannot establish a violation.`,
		evidence: "screening-replay",
	};
}

function createLicenceRule(registryStatus: RegistryStatus): ComplianceRule {
	const content: Record<RegistryStatus, Pick<ComplianceRule, "status" | "detail" | "evidence">> = {
		"verified-valid": {
			status: "clear",
			detail: "A current authority record was matched. Licence conditions and environmental clearance still require review.",
			evidence: "authority-record",
		},
		expired: {
			status: "flagged",
			detail: "The connected authority record is expired. Confirm renewal or enforcement status with the issuing authority.",
			evidence: "authority-record",
		},
		"not-found": {
			status: "flagged",
			detail: "No current record was found in the connected authority snapshot. Confirm aliases and records before action.",
			evidence: "authority-record",
		},
		"not-checked": {
			status: "unknown",
			detail: "No government licence or environmental-clearance registry is connected to this database-free demo.",
			evidence: "missing",
		},
	};

	return {
		id: "licence",
		label: "Licence and clearance record",
		legalBasis: "Authority licence and environmental-clearance records",
		...content[registryStatus],
	};
}

function getTier(registryStatus: RegistryStatus, flaggedRuleCount: number): ComplianceTier {
	if (registryStatus === "expired" || registryStatus === "not-found") {
		return "probable-non-compliance";
	}
	if (flaggedRuleCount >= 2) return "high-concern";
	if (flaggedRuleCount === 1) return "review";
	return "insufficient-evidence";
}

const TIER_CONTENT: Record<ComplianceTier, { label: string; summary: string }> = {
	"probable-non-compliance": {
		label: "Probable non-compliance",
		summary: "An authority-record problem was found. Confirm identity, current status, and applicable exceptions before enforcement.",
	},
	"high-concern": {
		label: "High-concern screen",
		summary: "Multiple screening rules were flagged, but authoritative registry and field evidence are still missing.",
	},
	review: {
		label: "Compliance review",
		summary: "One screening rule was flagged. Complete the missing legal and field checks before drawing a conclusion.",
	},
	"insufficient-evidence": {
		label: "Insufficient evidence",
		summary: "No current screening flag establishes legality. Required registry, land-use, and field evidence remains incomplete.",
	},
};
