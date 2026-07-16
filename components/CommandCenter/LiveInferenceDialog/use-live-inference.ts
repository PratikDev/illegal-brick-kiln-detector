import * as React from "react";

import { DEMO_DETECTIONS } from "@/lib/demo-data";
import {
	prepareInferenceImage,
	type PreparedInferenceImage,
} from "@/lib/image-preprocess";
import {
	predictUploadedImage,
	type PredictResponse,
	type Prediction,
} from "@/lib/prediction-api";
import type { RegionSlug } from "@/lib/regions";

export type LiveInferenceStatus = "idle" | "preparing" | "ready" | "running" | "success" | "error";

export function useLiveInference() {
	const [status, setStatus] = React.useState<LiveInferenceStatus>("idle");
	const [region, setRegionState] = React.useState<RegionSlug>("tangail");
	const [confidence, setConfidence] = React.useState([0.35]);
	const [preparedImage, setPreparedImage] = React.useState<PreparedInferenceImage | null>(null);
	const [response, setResponse] = React.useState<PredictResponse | null>(null);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const [selectedPredictionId, setSelectedPredictionId] = React.useState<string | null>(null);

	const selectedPrediction = React.useMemo(
		() => response?.predictions.find(({ id }) => id === selectedPredictionId) ?? response?.predictions[0] ?? null,
		[response, selectedPredictionId],
	);

	const analyzePreparedImage = React.useCallback(
		async (image: PreparedInferenceImage) => {
			setStatus("running");
			setResponse(null);
			setErrorMessage(null);
			setSelectedPredictionId(null);

			try {
				const result = await predictUploadedImage({
					regionSlug: region,
					imageDataUrl: image.dataUrl,
					confidence: confidence[0],
				});
				setResponse(result);
				setSelectedPredictionId(result.predictions[0]?.id ?? null);
				setStatus("success");
			} catch (error) {
				setErrorMessage(error instanceof Error ? error.message : "Live inference failed.");
				setStatus("error");
			}
		},
		[confidence, region],
	);

	const prepareFile = React.useCallback(async (file: File) => {
		setStatus("preparing");
		setResponse(null);
		setErrorMessage(null);
		setSelectedPredictionId(null);

		try {
			const image = await prepareInferenceImage(file);
			setPreparedImage(image);
			setStatus("ready");
		} catch (error) {
			setPreparedImage(null);
			setErrorMessage(error instanceof Error ? error.message : "Could not prepare the image.");
			setStatus("error");
		}
	}, []);

	const runSample = React.useCallback(async () => {
		setStatus("preparing");
		setResponse(null);
		setErrorMessage(null);
		setSelectedPredictionId(null);

		try {
			const sample = DEMO_DETECTIONS.find((detection) => detection.regionSlug === region);
			if (!sample) {
				throw new Error("No bundled sample is available for this district.");
			}

			const sampleResponse = await fetch(sample.tileUrl);
			if (!sampleResponse.ok) {
				throw new Error("Could not load the bundled satellite sample.");
			}

			const blob = await sampleResponse.blob();
			const image = await prepareInferenceImage(
				new File([blob], `${region}-sample.png`, { type: blob.type || "image/png" }),
			);
			setPreparedImage(image);
			await analyzePreparedImage(image);
		} catch (error) {
			setPreparedImage(null);
			setErrorMessage(error instanceof Error ? error.message : "Could not run the sample.");
			setStatus("error");
		}
	}, [analyzePreparedImage, region]);

	const setRegion = React.useCallback((nextRegion: RegionSlug) => {
		setRegionState(nextRegion);
		setResponse(null);
		setSelectedPredictionId(null);
		setStatus((currentStatus) => (currentStatus === "running" ? currentStatus : preparedImage ? "ready" : "idle"));
	}, [preparedImage]);

	return {
		status,
		region,
		confidence,
		preparedImage,
		response,
		errorMessage,
		selectedPrediction,
		setRegion,
		setConfidence,
		prepareFile,
		runInference: () => preparedImage ? analyzePreparedImage(preparedImage) : Promise.resolve(),
		runSample,
		selectPrediction: (prediction: Prediction) => setSelectedPredictionId(prediction.id),
	};
}
