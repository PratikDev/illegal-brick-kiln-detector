import type { ComplianceResult } from "@/lib/compliance";
import type { Prediction } from "@/lib/prediction-api";

/** Verified facts sent to the model. It writes prose; it never decides anything. */
export type DossierFacts = {
	id: string;
	district: string;
	lat: number;
	lon: number;
	confidence: number;
	className: string;
	tileUrl: string;
	generatedAt: string;
	compliance: ComplianceResult;
};

export type DossierMemo = {
	referenceCode: string;
	subjectLine: string;
	summary: string;
	observedFindings: string[];
	recommendedActions: string[];
	limitations: string[];
};

export function buildDossierFacts(
	prediction: Prediction,
	district: string,
	generatedAt: string,
): DossierFacts | null {
	if (!prediction.compliance) {
		return null;
	}

	return {
		id: prediction.id,
		district,
		lat: prediction.lat,
		lon: prediction.lon,
		confidence: prediction.confidence,
		className: prediction.className ?? prediction.label,
		tileUrl: prediction.tileUrl,
		generatedAt,
		compliance: prediction.compliance,
	};
}

export function isDossierMemo(value: unknown): value is DossierMemo {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const memo = value as Record<string, unknown>;
	return (
		typeof memo.referenceCode === "string" &&
		typeof memo.subjectLine === "string" &&
		typeof memo.summary === "string" &&
		isStringArray(memo.observedFindings) &&
		isStringArray(memo.recommendedActions) &&
		isStringArray(memo.limitations)
	);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((x) => typeof x === "string");
}
