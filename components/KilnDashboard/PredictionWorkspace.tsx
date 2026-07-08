"use client";

import { RiImageAddLine, RiPlayLine, RiRefreshLine } from "@remixicon/react";
import dynamic from "next/dynamic";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type {
	Prediction,
	PredictionSummary as PredictionSummaryData,
} from "@/lib/prediction-api";
import type { Region } from "@/lib/regions";
import { DetectionDetailSheet } from "./DetectionDetailSheet";
import { PredictionList } from "./PredictionList";
import { PredictionSummary } from "./PredictionSummary";
import { usePredictionWorkspace } from "./use-prediction-workspace";

const KilnMap = dynamic(
	() => import("@/components/KilnMap").then((module) => module.KilnMap),
	{
		ssr: false,
		loading: () => <MapSkeleton />,
	},
);

type PredictionWorkspaceProps = {
	region: Region;
};

export function PredictionWorkspace({ region }: PredictionWorkspaceProps) {
	const workspace = usePredictionWorkspace(region);
	const uploadInputId = React.useId();
	const hasPredictions = workspace.predictions.length > 0;
	const isLoading = workspace.status === "loading";

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Prediction evidence</CardTitle>
					<CardDescription>
						Live model response for {region.name}
					</CardDescription>
					<CardAction className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
						<Button
							variant="outline"
							disabled={isLoading}
							onClick={() => document.getElementById(uploadInputId)?.click()}
						>
							<RiImageAddLine data-icon="inline-start" />
							Upload image
						</Button>
						<input
							id={uploadInputId}
							type="file"
							accept="image/png,image/jpeg,image/webp"
							className="sr-only"
							onChange={(event) => {
								const file = event.target.files?.[0];
								event.target.value = "";
								if (file) {
									void workspace.runUploadPrediction(file);
								}
							}}
						/>
						<Button
							onClick={workspace.runPrediction}
							disabled={isLoading}
						>
							{isLoading ? (
								<RiRefreshLine data-icon="inline-start" />
							) : (
								<RiPlayLine data-icon="inline-start" />
							)}
							{workspace.response ? "Seeded tiles" : "Run seeded tiles"}
						</Button>
					</CardAction>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{workspace.response ? (
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">{workspace.response.region}</Badge>
							<p className="text-sm text-muted-foreground">
								Generated{" "}
								{new Date(workspace.response.generatedAt).toLocaleString()}
							</p>
						</div>
					) : null}

					<div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
						<div className="min-h-96 overflow-hidden rounded-lg border bg-muted xl:min-h-140">
							{isLoading ? (
								<MapSkeleton />
							) : (
								<KilnMap
									region={region}
									predictions={workspace.predictions}
									selectedPredictionId={workspace.selectedPredictionId}
									onSelectPrediction={workspace.selectPrediction}
								/>
							)}
						</div>
						<div className="flex min-w-0 flex-col gap-4">
							{isLoading ? <PredictionLoadingState /> : null}
							{workspace.status === "error" ? (
								<PredictionErrorState message={workspace.errorMessage} />
							) : null}
							{workspace.status === "idle" ? <PredictionIdleState /> : null}
							{workspace.status === "success" && !hasPredictions ? (
								<PredictionEmptyState />
							) : null}
							{hasPredictions ? (
								<PredictionReviewPanel
									predictions={workspace.predictions}
									selectedPredictionId={workspace.selectedPredictionId}
									summary={workspace.summary}
									onSelectPrediction={workspace.selectPrediction}
								/>
							) : null}
						</div>
					</div>
				</CardContent>
			</Card>

			<DetectionDetailSheet
				prediction={workspace.selectedPrediction}
				onOpenChange={(open) => {
					if (!open) {
						workspace.clearSelectedPrediction();
					}
				}}
			/>
		</>
	);
}

function MapSkeleton() {
	return <Skeleton className="h-full min-h-96 w-full xl:min-h-140" />;
}

function PredictionReviewPanel({
	predictions,
	selectedPredictionId,
	summary,
	onSelectPrediction,
}: {
	predictions: Prediction[];
	selectedPredictionId: string | null;
	summary: PredictionSummaryData;
	onSelectPrediction: (prediction: Prediction) => void;
}) {
	return (
		<>
			<PredictionSummary summary={summary} />
			<div className="flex flex-col gap-3">
				<div>
					<h3 className="font-heading text-base font-medium">Detections</h3>
					<p className="text-sm text-muted-foreground">
						Select a detection to inspect tile evidence.
					</p>
				</div>
				<PredictionList
					predictions={predictions}
					selectedPredictionId={selectedPredictionId}
					onSelectPrediction={onSelectPrediction}
				/>
			</div>
		</>
	);
}

function PredictionLoadingState() {
	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
			</div>
			<Skeleton className="h-80 w-full" />
		</div>
	);
}

function PredictionIdleState() {
	return (
		<Empty className="min-h-64">
			<EmptyHeader>
				<EmptyTitle>No prediction run yet</EmptyTitle>
				<EmptyDescription>
					Run seeded district tiles or upload a satellite crop.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function PredictionEmptyState() {
	return (
		<Empty className="min-h-64">
			<EmptyHeader>
				<EmptyTitle>No detections returned</EmptyTitle>
				<EmptyDescription>
					The API is responding, but no kiln detections were returned.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Separator />
				<p className="text-muted-foreground">
					The model returned an empty prediction set for this district.
				</p>
			</EmptyContent>
		</Empty>
	);
}

function PredictionErrorState({ message }: { message: string | null }) {
	return (
		<Empty className="min-h-64">
			<EmptyHeader>
				<EmptyTitle>Prediction failed</EmptyTitle>
				<EmptyDescription>
					{message ?? "The prediction API returned an unexpected error."}
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
