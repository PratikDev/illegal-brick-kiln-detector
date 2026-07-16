import * as React from "react";

import {
	filterPredictions,
	matchesFilter,
	sortByPriority,
	summarizeCompliance,
	WORKLIST_FILTERS,
	type ComplianceSummary,
	type WorklistFilter,
} from "@/lib/compliance-summary";
import type { Prediction } from "@/lib/prediction-api";

type WorklistFilterOption = {
	id: WorklistFilter;
	label: string;
	count: number;
};

type UseWorklistResult = {
	filter: WorklistFilter;
	setFilter: (filter: WorklistFilter) => void;
	/** Sorted by priority, then filtered. This is the order a reviewer works. */
	visiblePredictions: Prediction[];
	filterOptions: WorklistFilterOption[];
	summary: ComplianceSummary;
};

export function useWorklist(predictions: Prediction[]): UseWorklistResult {
	const [filter, setFilter] = React.useState<WorklistFilter>("all");

	const ranked = React.useMemo(
		() => sortByPriority(predictions),
		[predictions],
	);
	const visiblePredictions = React.useMemo(
		() => filterPredictions(ranked, filter),
		[ranked, filter],
	);
	const summary = React.useMemo(
		() => summarizeCompliance(predictions),
		[predictions],
	);
	const filterOptions = React.useMemo(
		() =>
			WORKLIST_FILTERS.map(({ id, label }) => ({
				id,
				label,
				count: predictions.filter((prediction) =>
					matchesFilter(prediction, id),
				).length,
			})),
		[predictions],
	);

	return { filter, setFilter, visiblePredictions, filterOptions, summary };
}
