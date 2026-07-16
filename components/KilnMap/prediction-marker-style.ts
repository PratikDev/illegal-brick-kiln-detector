import { cn } from "@/lib/utils";
import type { Prediction } from "@/lib/prediction-api";
import { getConfidenceTone } from "@/lib/prediction-api";

export type PredictionMarkerTone = "high" | "medium" | "low";

/**
 * Priority band when compliance is available, confidence otherwise. Class is
 * what the model saw; priority is what the reviewer needs. Both vocabularies are
 * high/medium/low, so the existing marker CSS carries over unchanged.
 */
export function getPredictionMarkerTone(
	prediction: Prediction,
): PredictionMarkerTone {
	if (prediction.label === "no_kiln") {
		return "low";
	}

	if (prediction.compliance) {
		return prediction.compliance.priorityBand;
	}

	return getConfidenceTone(prediction.confidence);
}

export function getPredictionMarkerClassName(
	prediction: Prediction,
	isSelected: boolean,
): string {
	return cn(
		`kiln-map-marker-${getPredictionMarkerTone(prediction)}`,
		isSelected && "kiln-map-marker-selected",
	);
}
