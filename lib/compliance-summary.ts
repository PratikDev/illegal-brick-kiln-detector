import type { Prediction } from "@/lib/prediction-api";

export type WorklistFilter = "all" | "flagged" | "school";

export type ComplianceSummary = {
	total: number;
	likelyNonCompliant: number;
	needsReview: number;
	nearSchool: number;
	highPriority: number;
	/**
	 * Sum of per-kiln 1 km populations. Buffers overlap, so this is NOT a unique
	 * headcount and must never be labelled as one. Null when no district has a
	 * population grid.
	 */
	populationExposedSum: number | null;
};

export const WORKLIST_FILTERS: readonly {
	id: WorklistFilter;
	label: string;
}[] = [
	{ id: "all", label: "All" },
	{ id: "flagged", label: "Likely non-compliant" },
	{ id: "school", label: "Within 1 km of a school" },
];

export function getPriorityScore(prediction: Prediction): number {
	return prediction.compliance?.priorityScore ?? 0;
}

export function isNearSchool(prediction: Prediction): boolean {
	return (
		prediction.compliance?.violations.some(({ rule }) => rule === "school") ??
		false
	);
}

export function isFlagged(prediction: Prediction): boolean {
	return prediction.compliance?.verdict === "likely_non_compliant";
}

export function matchesFilter(
	prediction: Prediction,
	filter: WorklistFilter,
): boolean {
	if (filter === "flagged") {
		return isFlagged(prediction);
	}

	if (filter === "school") {
		return isNearSchool(prediction);
	}

	return true;
}

export function filterPredictions(
	predictions: Prediction[],
	filter: WorklistFilter,
): Prediction[] {
	return predictions.filter((prediction) => matchesFilter(prediction, filter));
}

/** Priority first, then confidence. An inspector works down this order. */
export function sortByPriority(predictions: Prediction[]): Prediction[] {
	return predictions.toSorted((a, b) => {
		const byPriority = getPriorityScore(b) - getPriorityScore(a);
		return byPriority !== 0 ? byPriority : b.confidence - a.confidence;
	});
}

export function summarizeCompliance(
	predictions: Prediction[],
): ComplianceSummary {
	let likelyNonCompliant = 0;
	let needsReview = 0;
	let nearSchool = 0;
	let highPriority = 0;
	let populationExposedSum: number | null = null;

	for (const prediction of predictions) {
		const compliance = prediction.compliance;
		if (!compliance) {
			continue;
		}

		if (compliance.verdict === "likely_non_compliant") {
			likelyNonCompliant += 1;
		}

		if (compliance.verdict === "review_required") {
			needsReview += 1;
		}

		if (isNearSchool(prediction)) {
			nearSchool += 1;
		}

		if (compliance.priorityBand === "high") {
			highPriority += 1;
		}

		if (compliance.populationWithin1km !== null) {
			populationExposedSum =
				(populationExposedSum ?? 0) + compliance.populationWithin1km;
		}
	}

	return {
		total: predictions.length,
		likelyNonCompliant,
		needsReview,
		nearSchool,
		highPriority,
		populationExposedSum,
	};
}
