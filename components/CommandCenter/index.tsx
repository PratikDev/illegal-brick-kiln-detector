"use client";

import { RiGovernmentLine, RiLiveLine, RiRestartLine } from "@remixicon/react";
import dynamic from "next/dynamic";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EvidenceSheet } from "./EvidenceSheet";
import { JudgeModeBar } from "./JudgeModeBar";
import { MissionPanel } from "./MissionPanel";
import { ModelBar } from "./ModelBar";
import { SignalFeed } from "./SignalFeed";
import { StatsRail } from "./StatsRail";
import { useCommandScan } from "./use-command-scan";

const SatelliteMap = dynamic(
	() => import("./SatelliteMap").then((module) => module.SatelliteMap),
	{ ssr: false, loading: () => <Skeleton className="size-full rounded-none" /> },
);

export function CommandCenter() {
	const scan = useCommandScan();

	return (
		<main className="relative h-dvh min-h-160 overflow-hidden bg-command-canvas text-command-foreground">
			<svg className="absolute size-0" aria-hidden="true">
				<defs>
					<filter id="satellite-evidence-sharpen" colorInterpolationFilters="sRGB">
						<feConvolveMatrix
							order="3"
							kernelMatrix="0 -0.28 0 -0.28 2.12 -0.28 0 -0.28 0"
							divisor="1"
							edgeMode="duplicate"
							preserveAlpha="true"
						/>
					</filter>
				</defs>
			</svg>
			<SatelliteMap
				detections={scan.visibleDetections}
				selectedDetectionId={scan.selectedDetection?.id ?? null}
				activeModel={scan.activeModel}
				selectedRegion={scan.selectedRegion}
				judgeStage={scan.isJudgeMode ? scan.judgeStage : null}
				onSelectDetection={scan.selectDetection}
			/>
			<div className="pointer-events-none absolute inset-0 bg-command-vignette" />
			{scan.status === "scanning" ? <div className="command-scan-line" aria-hidden="true" /> : null}

			<header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-4 p-4 sm:p-6">
				<div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-command-border bg-command-surface/88 px-3 py-2 shadow-xl backdrop-blur-xl">
					<div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<RiGovernmentLine aria-hidden="true" />
					</div>
					<div>
						<p className="font-heading text-sm font-semibold sm:text-base">KilnWatch Bangladesh</p>
						<p className="hidden text-xs text-command-muted sm:block">Earth observation intelligence</p>
					</div>
				</div>
				<div className="pointer-events-auto flex items-center gap-2">
					<Badge variant="secondary">
						<RiLiveLine data-icon="inline-start" />
						<span className="hidden sm:inline">Illegal-kiln screening</span>
						<span className="sm:hidden">Screening</span>
					</Badge>
					<Button variant="secondary" size="icon-sm" onClick={scan.resetDemo} aria-label="Reset demo">
						<RiRestartLine />
					</Button>
				</div>
			</header>

			{scan.isJudgeMode ? (
				<div className="pointer-events-auto absolute left-1/2 top-20 -translate-x-1/2 sm:top-4">
					<JudgeModeBar stage={scan.judgeStage} onStop={scan.stopJudgeMode} />
				</div>
			) : (
				<div className="pointer-events-auto absolute left-1/2 top-4 hidden -translate-x-1/2 xl:block">
					<ModelBar
						activeModel={scan.activeModel}
						onChangeModel={scan.setActiveModel}
						onStartJudgeMode={scan.startJudgeMode}
					/>
				</div>
			)}

			<section className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:p-6 lg:inset-y-0 lg:left-0 lg:right-auto lg:w-96 lg:justify-center">
				<div className="pointer-events-auto">
					<MissionPanel
						status={scan.status}
						progress={scan.progress}
						selectedRegion={scan.selectedRegion}
						visibleCount={scan.visibleDetections.length}
						totalCount={scan.scopedDetections.length}
						onStartScan={scan.startScan}
						onStartJudgeMode={scan.startJudgeMode}
						onChangeRegion={scan.changeRegion}
					/>
				</div>
				<div className="pointer-events-auto hidden sm:block">
					<StatsRail />
				</div>
			</section>

			<aside className="pointer-events-none absolute bottom-6 right-6 hidden w-88 xl:block">
				<div className="pointer-events-auto">
					<SignalFeed detections={scan.visibleDetections} activeModel={scan.activeModel} onSelect={scan.selectDetection} />
				</div>
			</aside>

			<EvidenceSheet
				detection={scan.selectedDetection}
				activeModel={scan.activeModel}
				onOpenChange={(open) => !open && scan.clearSelection()}
			/>
		</main>
	);
}
