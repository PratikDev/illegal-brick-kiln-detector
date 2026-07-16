import { RiArrowRightUpLine, RiMapPin2Line, RiRadarLine } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDetectionConfidence, type DemoDetection } from "@/lib/demo-data";
import { getModelLabel, type AnalysisViewId } from "@/lib/demo-models";
import { formatConfidence } from "@/lib/prediction-api";

export function SignalFeed({
	detections,
	activeModel,
	onSelect,
}: {
	detections: DemoDetection[];
	activeModel: AnalysisViewId;
	onSelect: (detection: DemoDetection) => void;
}) {
	const latestDetections = detections.slice(-8).reverse();

	return (
		<Card className="border-command-border bg-command-surface/92 text-command-foreground shadow-2xl backdrop-blur-xl">
			<CardHeader className="border-b border-command-border">
				<div className="flex items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2 font-heading text-base">
						<RiRadarLine aria-hidden="true" />
						National replay feed
					</CardTitle>
					<Badge variant="secondary">{detections.length} found · {getModelLabel(activeModel)}</Badge>
				</div>
			</CardHeader>
			<CardContent className="p-0">
				{latestDetections.length ? (
					<ScrollArea className="h-72">
						<div className="flex flex-col p-2">
							{latestDetections.map((detection) => (
								<Button
									key={detection.id}
									variant="ghost"
									className="h-auto justify-start gap-3 rounded-lg px-3 py-3 text-left"
									onClick={() => onSelect(detection)}
								>
									<span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
										<RiMapPin2Line aria-hidden="true" />
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium">{detection.regionName} · {detection.className}</span>
										<span className="block text-xs text-command-muted">
											{formatConfidence(getDetectionConfidence(detection, activeModel))} confidence · {detection.modelAgreement}/3 agree
										</span>
									</span>
									<RiArrowRightUpLine className="shrink-0 text-command-muted" aria-hidden="true" />
								</Button>
							))}
						</div>
					</ScrollArea>
				) : (
					<div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-command-muted">
						<RiRadarLine className="size-6" aria-hidden="true" />
						<p>Start the scan to stream georeferenced signals.</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
