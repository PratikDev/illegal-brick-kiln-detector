"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { EmptyRegionsState } from "./EmptyRegionsState";
import { PredictionWorkspace } from "./PredictionWorkspace";
import { RegionStatus } from "./RegionStatus";
import { RegionSwitcher } from "./RegionSwitcher";
import { SUPPORTED_REGIONS, type Region, type RegionId } from "@/lib/regions";

export function KilnDashboard() {
	return <KilnDashboardView regions={SUPPORTED_REGIONS} />;
}

function KilnDashboardView({ regions }: { regions: Region[] }) {
	const [selectedRegionId, setSelectedRegionId] =
		React.useState<RegionId | null>(null);

	if (regions.length === 0) {
		return <EmptyRegionsState />;
	}

	const selectedRegion =
		regions.find((region) => region.id === selectedRegionId) ?? regions[0];

	return (
		<main className="flex min-h-full flex-1 bg-background">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
				<header className="flex flex-col gap-1">
					<h1 className="font-heading text-3xl font-medium leading-tight">
						Illegal Brick Kiln Detector
					</h1>
					<p className="text-sm text-muted-foreground">
						Bangladesh district monitoring
					</p>
				</header>

				<Card>
					<CardHeader>
						<CardTitle>District overview</CardTitle>
						<CardDescription>
							District metadata and update status
						</CardDescription>
						<CardAction className="w-full sm:w-auto">
							<RegionSwitcher
								regions={regions}
								selectedRegionId={selectedRegion.id}
								onSelectedRegionIdChange={setSelectedRegionId}
							/>
						</CardAction>
					</CardHeader>
					<CardContent>
						<RegionStatus region={selectedRegion} />
					</CardContent>
					<CardFooter className="justify-between gap-3">
						<p className="text-sm text-muted-foreground">
							{regions.length} supported districts
						</p>
						<Badge variant="outline">Connected</Badge>
					</CardFooter>
				</Card>

				<PredictionWorkspace region={selectedRegion} />
			</div>
		</main>
	);
}
