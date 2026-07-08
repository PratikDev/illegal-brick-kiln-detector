import { cn } from "@/lib/utils";
import type { Prediction } from "@/lib/prediction-api";
import { getConfidenceTone } from "@/lib/prediction-api";

export type PredictionMarkerTone = "high" | "medium" | "low";

export function getPredictionMarkerTone(
	prediction: Prediction,
): PredictionMarkerTone {
	if (prediction.label === "no_kiln") {
		return "low";
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
