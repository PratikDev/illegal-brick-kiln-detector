"use client";

import {
	RiAlertLine,
	RiCpuLine,
	RiImageAddLine,
	RiRadarLine,
	RiShieldCheckLine,
} from "@remixicon/react";
import Image from "next/image";

import { PredictionTilePreview } from "@/components/KilnDashboard/PredictionTilePreview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { formatConfidence, type Prediction } from "@/lib/prediction-api";
import { SUPPORTED_REGIONS, type RegionSlug } from "@/lib/regions";
import { useLiveInference } from "./use-live-inference";

export function LiveInferenceDialog({ compact = false }: { compact?: boolean }) {
	const inference = useLiveInference();
	const isBusy = inference.status === "preparing" || inference.status === "running";
	const inputId = compact ? "live-inference-file-mobile" : "live-inference-file";

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant={compact ? "ghost" : "secondary"}
					size={compact ? "icon-sm" : "sm"}
					aria-label={compact ? "Run live LiteRT inference" : undefined}
				>
					<RiCpuLine data-icon={compact ? undefined : "inline-start"} />
					{compact ? null : "Live AI"}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-dvh overflow-y-auto sm:max-w-4xl">
				<DialogHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge>Live LiteRT</Badge>
						<Badge variant="outline">YOLO11-OBB</Badge>
					</div>
					<DialogTitle>Run real kiln inference</DialogTitle>
					<DialogDescription>
						Upload a satellite crop or run a bundled tile through the deployed TFLite model. These results come from the Python Function, not the replay dataset.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-5 px-4 pb-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
					<div className="flex flex-col gap-4">
						<Alert>
							<RiShieldCheckLine />
							<AlertTitle>Real server inference</AlertTitle>
							<AlertDescription>
								The browser letterboxes the image to 256 × 256, then sends it to the Vercel Python Function. The upload is processed in memory and is not stored.
							</AlertDescription>
						</Alert>
						<Alert variant="destructive">
							<RiAlertLine />
							<AlertTitle>Detection is not a legality result</AlertTitle>
							<AlertDescription>
								An uploaded crop has no verified coordinates, prohibited-area layers, licence record, or field evidence. Live AI can detect a kiln candidate but cannot classify it as illegal.
							</AlertDescription>
						</Alert>

						<FieldGroup>
							<Field>
								<FieldLabel htmlFor={`${inputId}-region`}>Reference district</FieldLabel>
								<Select
									value={inference.region}
									onValueChange={(value) => inference.setRegion(value as RegionSlug)}
									disabled={isBusy}
								>
									<SelectTrigger id={`${inputId}-region`} className="w-full">
										<SelectValue placeholder="Select district" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectLabel>Coordinate reference</SelectLabel>
											{SUPPORTED_REGIONS.map((region) => (
												<SelectItem key={region.id} value={region.slug}>{region.name}</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								<FieldDescription>
									Uploads do not contain map coordinates, so the selected district provides a demonstration map anchor.
								</FieldDescription>
							</Field>

							<Field data-invalid={inference.status === "error"}>
								<FieldLabel htmlFor={inputId}>Satellite image</FieldLabel>
								<Input
									id={inputId}
									type="file"
									accept="image/png,image/jpeg,image/webp"
									disabled={isBusy}
									aria-invalid={inference.status === "error"}
									onChange={(event) => {
										const file = event.target.files?.[0];
										if (file) void inference.prepareFile(file);
									}}
								/>
								<FieldDescription>PNG, JPEG, or WebP up to 15 MB. Only the resized crop is transmitted.</FieldDescription>
								{inference.errorMessage ? <FieldError>{inference.errorMessage}</FieldError> : null}
							</Field>

							<Field>
								<FieldLabel>Confidence threshold · {formatConfidence(inference.confidence[0])}</FieldLabel>
								<Slider
									value={inference.confidence}
									onValueChange={inference.setConfidence}
									min={0.15}
									max={0.75}
									step={0.05}
									disabled={isBusy}
									aria-label="Live model confidence threshold"
								/>
								<FieldDescription>Lower values reveal more candidates but may increase false positives.</FieldDescription>
							</Field>
						</FieldGroup>

						<div className="flex flex-wrap gap-2">
							<Button onClick={() => void inference.runInference()} disabled={!inference.preparedImage || isBusy}>
								{inference.status === "running" ? <Spinner data-icon="inline-start" /> : <RiRadarLine data-icon="inline-start" />}
								{inference.status === "running" ? "Running LiteRT…" : "Analyze image"}
							</Button>
							<Button variant="outline" onClick={() => void inference.runSample()} disabled={isBusy}>
								{inference.status === "preparing" ? <Spinner data-icon="inline-start" /> : <RiImageAddLine data-icon="inline-start" />}
								Run bundled sample
							</Button>
						</div>
						{inference.preparedImage ? (
							<p className="text-xs text-muted-foreground">
								{inference.preparedImage.fileName} · {inference.preparedImage.originalWidth} × {inference.preparedImage.originalHeight} · {formatBytes(inference.preparedImage.uploadBytes)} transmitted
							</p>
						) : null}
					</div>

					<LiveInferenceResult inference={inference} />
				</div>
			</DialogContent>
		</Dialog>
	);
}

function LiveInferenceResult({ inference }: { inference: ReturnType<typeof useLiveInference> }) {
	if (!inference.preparedImage) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Inference evidence</CardTitle>
					<CardDescription>Select an image or run the bundled sample to prove the deployed model path.</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div>
						<CardTitle>Inference evidence</CardTitle>
						<CardDescription>
							{inference.response ? `${inference.response.predictions.length} returned detection${inference.response.predictions.length === 1 ? "" : "s"}` : "Prepared locally and ready for inference"}
						</CardDescription>
					</div>
					{inference.response?.inference ? (
						<Badge variant="secondary">{inference.response.inference.processingMs} ms server processing</Badge>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
					{inference.selectedPrediction ? (
						<PredictionTilePreview prediction={inference.selectedPrediction} priority />
					) : (
						<Image
							src={inference.preparedImage.dataUrl}
							alt="Prepared satellite crop for live inference"
							fill
							unoptimized
							className="object-cover satellite-evidence-enhanced"
							sizes="(max-width: 1024px) 100vw, 448px"
						/>
					)}
				</div>

				{inference.status === "running" ? (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Spinner />
						Loading the server model and analyzing the crop…
					</div>
				) : null}

				{inference.response ? (
					<>
						<Alert>
							<RiCpuLine />
							<AlertTitle>{inference.response.inference?.model ?? "YOLO11-OBB"} completed</AlertTitle>
							<AlertDescription>
								{inference.response.inference?.runtime ?? "LiteRT"} returned this response at {new Date(inference.response.generatedAt).toLocaleTimeString()}.
							</AlertDescription>
						</Alert>
						{inference.response.predictions.length ? (
							<div className="flex flex-col gap-2">
								{inference.response.predictions.map((prediction) => (
									<PredictionButton
										key={prediction.id}
										prediction={prediction}
										selected={prediction.id === inference.selectedPrediction?.id}
										onSelect={() => inference.selectPrediction(prediction)}
									/>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">No kiln candidate exceeded the selected confidence threshold.</p>
						)}
					</>
				) : null}
			</CardContent>
		</Card>
	);
}

function PredictionButton({
	prediction,
	selected,
	onSelect,
}: {
	prediction: Prediction;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<Button variant={selected ? "secondary" : "outline"} className="h-auto justify-between py-2" onClick={onSelect}>
			<span>{prediction.className ?? "Kiln candidate"}</span>
			<Badge variant={prediction.confidence > 0.8 ? "default" : "secondary"}>{formatConfidence(prediction.confidence)}</Badge>
		</Button>
	);
}

function formatBytes(bytes: number): string {
	return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;
}
