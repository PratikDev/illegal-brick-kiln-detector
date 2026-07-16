import { RiEarthLine, RiMovie2Line, RiPlayLine, RiRadarLine, RiRestartLine } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_REGIONS, type RegionSlug } from "@/lib/regions";
import { LiveInferenceDialog } from "./LiveInferenceDialog";
import type { ScanStatus } from "./use-command-scan";
import { MethodologyDialog } from "./MethodologyDialog";

type MissionPanelProps = {
	status: ScanStatus;
	progress: number;
	selectedRegion: RegionSlug | "all";
	visibleCount: number;
	totalCount: number;
	onStartScan: () => void;
	onStartJudgeMode: () => void;
	onChangeRegion: (region: RegionSlug | "all") => void;
};

export function MissionPanel({
	status,
	progress,
	selectedRegion,
	visibleCount,
	totalCount,
	onStartScan,
	onStartJudgeMode,
	onChangeRegion,
}: MissionPanelProps) {
	return (
		<Card className="border-command-border bg-command-surface/92 text-command-foreground shadow-2xl backdrop-blur-xl">
			<CardHeader>
				<div className="mb-2 flex items-center justify-between gap-3">
					<Badge variant="outline" className="border-command-border text-command-foreground">
						<RiEarthLine data-icon="inline-start" />
						Sentinel-2 / 2024
					</Badge>
					<div className="flex items-center gap-1">
						<StatusBadge status={status} />
						<div className="xl:hidden"><LiveInferenceDialog compact /></div>
						<div className="xl:hidden"><MethodologyDialog /></div>
					</div>
				</div>
				<CardTitle className="font-heading text-2xl">National kiln watch</CardTitle>
				<CardDescription className="text-command-muted">
					Replay national coverage or run Live AI on a satellite crop. Select any signal to inspect its evidence.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Select value={selectedRegion} onValueChange={(value) => onChangeRegion(value as RegionSlug | "all")}>
					<SelectTrigger className="w-full border-command-border bg-command-elevated text-command-foreground">
						<SelectValue placeholder="Select coverage" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>Scan coverage</SelectLabel>
							<SelectItem value="all">National priority scan</SelectItem>
							{SUPPORTED_REGIONS.map((region) => (
								<SelectItem key={region.id} value={region.slug}>
									{region.name}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>

				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between text-xs text-command-muted">
						<span>{status === "scanning" ? "Analyzing tiles" : "Analysis replay"}</span>
						<span>{visibleCount} / {totalCount}</span>
					</div>
					<Progress value={progress} aria-label={`${progress}% scan complete`} />
				</div>
			</CardContent>
			<CardFooter className="gap-2">
				<Button className="w-full" size="lg" disabled={status === "scanning"} onClick={onStartScan}>
					{status === "complete" ? (
						<RiRestartLine data-icon="inline-start" />
					) : status === "scanning" ? (
						<RiRadarLine data-icon="inline-start" />
					) : (
						<RiPlayLine data-icon="inline-start" />
					)}
					{status === "complete" ? "Replay scan" : status === "scanning" ? "Scanning…" : "Start intelligence scan"}
				</Button>
				<Button className="xl:hidden" size="icon-lg" variant="outline" onClick={onStartJudgeMode} aria-label="Start judge mode">
					<RiMovie2Line />
				</Button>
			</CardFooter>
		</Card>
	);
}

function StatusBadge({ status }: { status: ScanStatus }) {
	const labels: Record<ScanStatus, string> = {
		ready: "System ready",
		scanning: "Scanning",
		complete: "Scan complete",
	};
	return <Badge variant={status === "complete" ? "default" : "secondary"}>{labels[status]}</Badge>;
}
