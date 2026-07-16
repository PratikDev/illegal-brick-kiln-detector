"use client";

import Image from "next/image";
import * as React from "react";

import { PredictionTilePreview } from "@/components/KilnDashboard/PredictionTilePreview";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DemoDetection } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type RasterMode = "source" | "enhanced";

export function EvidenceComparison({ detection }: { detection: DemoDetection }) {
	const [position, setPosition] = React.useState([48]);
	const [rasterMode, setRasterMode] = React.useState<RasterMode>("enhanced");
	const enhanced = rasterMode === "enhanced";

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Badge variant="outline">128 × 128 source</Badge>
					{enhanced ? <Badge variant="secondary">Display enhanced</Badge> : null}
				</div>
				<ToggleGroup
					type="single"
					value={rasterMode}
					onValueChange={(value) => {
						if (value === "source" || value === "enhanced") setRasterMode(value);
					}}
					variant="outline"
					size="sm"
					spacing={0}
					aria-label="Satellite evidence rendering"
				>
					<ToggleGroupItem value="source">Source</ToggleGroupItem>
					<ToggleGroupItem value="enhanced">Clarity</ToggleGroupItem>
				</ToggleGroup>
			</div>
			<div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
				<PredictionTilePreview prediction={detection} priority enhanced={enhanced} />
				<div
					className="absolute inset-0"
					style={{ clipPath: `inset(0 ${100 - position[0]}% 0 0)` }}
					aria-hidden="true"
				>
					<Image
						src={detection.tileUrl}
						alt=""
						fill
						priority
						unoptimized
						sizes="(max-width: 768px) 100vw, 448px"
						className={cn("object-cover", enhanced && "satellite-evidence-enhanced")}
					/>
				</div>
				<div
					className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-primary shadow-lg"
					style={{ left: `${position[0]}%` }}
					aria-hidden="true"
				/>
				<Badge className="absolute left-3 top-3" variant="secondary">Raw tile</Badge>
				<Badge className="absolute right-3 top-3">AI geometry</Badge>
			</div>
			<Slider
				value={position}
				onValueChange={setPosition}
				min={8}
				max={92}
				step={1}
				aria-label="Compare raw satellite tile with AI interpretation"
			/>
			<p className="text-xs text-muted-foreground">
				Same {detection.imageryDate} source tile: imagery on the left, replayed model geometry on the right.
				 Clarity mode applies a display-only sharpen and contrast pass; model inference and exported evidence retain the original pixels.
			</p>
		</div>
	);
}
