import * as React from "react";

import {
	fetchRegionPredictions,
	predictUploadedImage,
	type PredictResponse,
	type Prediction,
	summarizePredictions,
} from "@/lib/prediction-api";
import type { Region } from "@/lib/regions";

type PredictionStatus = "idle" | "loading" | "success" | "error";

type UsePredictionWorkspaceResult = {
	status: PredictionStatus;
	response: PredictResponse | null;
	errorMessage: string | null;
	selectedPredictionId: string | null;
	selectedPrediction: Prediction | null;
	predictions: Prediction[];
	summary: ReturnType<typeof summarizePredictions>;
	runPrediction: () => Promise<void>;
	runUploadPrediction: (file: File) => Promise<void>;
	selectPrediction: (prediction: Prediction) => void;
	clearSelectedPrediction: () => void;
};

type RequestState = {
	regionId: string | null;
	status: PredictionStatus;
	response: PredictResponse | null;
	errorMessage: string | null;
};

const initialRequestState: RequestState = {
	regionId: null,
	status: "idle",
	response: null,
	errorMessage: null,
};

export function usePredictionWorkspace(
	region: Region | null,
): UsePredictionWorkspaceResult {
	const [requestState, setRequestState] =
		React.useState<RequestState>(initialRequestState);
	const [selectedPredictionId, setSelectedPredictionId] = React.useState<
		string | null
	>(null);

	const isCurrentRegion = requestState.regionId === (region?.id ?? null);
	const status = isCurrentRegion ? requestState.status : "idle";
	const response = isCurrentRegion ? requestState.response : null;
	const errorMessage = isCurrentRegion ? requestState.errorMessage : null;
	const predictions = React.useMemo(
		() => response?.predictions ?? [],
		[response],
	);
	const selectedPrediction =
		predictions.find((prediction) => prediction.id === selectedPredictionId) ??
		null;
	const summary = React.useMemo(
		() => summarizePredictions(predictions),
		[predictions],
	);

	const runPrediction = React.useCallback(async () => {
		if (!region) {
			return;
		}

		setRequestState({
			regionId: region.id,
			status: "loading",
			response: null,
			errorMessage: null,
		});
		setSelectedPredictionId(null);

		try {
			const result = await fetchRegionPredictions(region.slug);
			setRequestState({
				regionId: region.id,
				status: "success",
				response: result,
				errorMessage: null,
			});
		} catch (error) {
			setRequestState({
				regionId: region.id,
				status: "error",
				response: null,
				errorMessage:
					error instanceof Error ? error.message : "Prediction request failed",
			});
		}
	}, [region]);

	const runUploadPrediction = React.useCallback(
		async (file: File) => {
			if (!region) {
				return;
			}

			setRequestState({
				regionId: region.id,
				status: "loading",
				response: null,
				errorMessage: null,
			});
			setSelectedPredictionId(null);

			try {
				const imageDataUrl = await fileToDataUrl(file);
				const result = await predictUploadedImage({
					regionSlug: region.slug,
					imageDataUrl,
				});
				setRequestState({
					regionId: region.id,
					status: "success",
					response: result,
					errorMessage: null,
				});
			} catch (error) {
				setRequestState({
					regionId: region.id,
					status: "error",
					response: null,
					errorMessage:
						error instanceof Error ? error.message : "Upload prediction failed",
				});
			}
		},
		[region],
	);

	return {
		status,
		response,
		errorMessage,
		selectedPredictionId,
		selectedPrediction,
		predictions,
		summary,
		runPrediction,
		runUploadPrediction,
		selectPrediction: (prediction) => setSelectedPredictionId(prediction.id),
		clearSelectedPrediction: () => setSelectedPredictionId(null),
	};
}

function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener("load", () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
				return;
			}

			reject(new Error("Could not read uploaded image"));
		});
		reader.addEventListener("error", () => reject(reader.error));
		reader.readAsDataURL(file);
	});
}
