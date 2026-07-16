import { RiCrosshair2Line } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistance } from "@/lib/compliance";
import { cn } from "@/lib/utils";
import type { Prediction } from "@/lib/prediction-api";
import { formatConfidence, getConfidenceTone } from "@/lib/prediction-api";
import { PriorityBadge } from "./PriorityBadge";

type PredictionListProps = {
	predictions: Prediction[];
	selectedPredictionId: string | null;
	onSelectPrediction: (prediction: Prediction) => void;
};

export function PredictionList({
	predictions,
	selectedPredictionId,
	onSelectPrediction,
}: PredictionListProps) {
	return (
		<ScrollArea className="h-80 rounded-lg border xl:h-[21rem]">
			<div className="flex flex-col">
				{predictions.map((prediction) => {
					const isSelected = prediction.id === selectedPredictionId;

					return (
						<button
							key={prediction.id}
							type="button"
							aria-pressed={isSelected}
							data-selected={isSelected}
							className={cn(
								"flex items-start justify-between gap-3 border-b p-3 text-left transition-colors last:border-b-0 hover:bg-muted",
								isSelected && "bg-muted ring-1 ring-inset ring-ring",
							)}
							onClick={() => onSelectPrediction(prediction)}
						>
							<div className="flex min-w-0 flex-col gap-1">
								<div className="flex flex-wrap items-center gap-2">
									{prediction.compliance ? (
										<PriorityBadge
											score={prediction.compliance.priorityScore}
											band={prediction.compliance.priorityBand}
										/>
									) : null}
									<Badge variant={getBadgeVariant(prediction.confidence)}>
										{formatConfidence(prediction.confidence)}
									</Badge>
									<Badge variant="outline">
										{prediction.className ?? prediction.label}
									</Badge>
								</div>
								<p className="truncate font-medium">{prediction.id}</p>
								{prediction.compliance &&
								prediction.compliance.violations.length > 0 ? (
									<p className="truncate text-xs text-muted-foreground">
										{prediction.compliance.violations
											.map(
												(violation) =>
													`${violation.rule} ${formatDistance(violation.distanceM)}`,
											)
											.join(" · ")}
									</p>
								) : (
									<p className="text-xs text-muted-foreground">
										{prediction.lat.toFixed(5)}, {prediction.lon.toFixed(5)}
									</p>
								)}
							</div>
							<RiCrosshair2Line
								className="mt-1 shrink-0 text-muted-foreground"
								aria-hidden="true"
							/>
						</button>
					);
				})}
			</div>
		</ScrollArea>
	);
}

function getBadgeVariant(
	confidence: number,
): "default" | "secondary" | "outline" {
	const tone = getConfidenceTone(confidence);

	if (tone === "high") {
		return "default";
	}

	if (tone === "medium") {
		return "secondary";
	}

	return "outline";
}
