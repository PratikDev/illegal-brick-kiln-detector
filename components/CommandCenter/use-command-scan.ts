import * as React from "react";

import { DEMO_DETECTIONS, type DemoDetection } from "@/lib/demo-data";
import type { AnalysisViewId } from "@/lib/demo-models";
import type { RegionSlug } from "@/lib/regions";

export type ScanStatus = "ready" | "scanning" | "complete";
export type JudgeStage = "overview" | "scan" | "triage" | "evidence" | "ready";

const judgeTarget =
	DEMO_DETECTIONS.find(
		({ regionSlug, compliance, modelAgreement }) =>
			regionSlug === "tangail" && compliance.tier === "high-concern" && modelAgreement === 3,
	) ?? DEMO_DETECTIONS[0];

export function useCommandScan() {
	const [status, setStatus] = React.useState<ScanStatus>("ready");
	const [visibleCount, setVisibleCount] = React.useState(0);
	const [selectedRegion, setSelectedRegion] = React.useState<RegionSlug | "all">("all");
	const [selectedDetection, setSelectedDetection] = React.useState<DemoDetection | null>(null);
	const [activeModel, setActiveModel] = React.useState<AnalysisViewId>("ensemble");
	const [isJudgeMode, setIsJudgeMode] = React.useState(false);
	const [judgeStage, setJudgeStage] = React.useState<JudgeStage>("overview");

	const scopedDetections = React.useMemo(
		() =>
			selectedRegion === "all"
				? DEMO_DETECTIONS
				: DEMO_DETECTIONS.filter(({ regionSlug }) => regionSlug === selectedRegion),
		[selectedRegion],
	);
	const visibleDetections = scopedDetections.slice(0, visibleCount);
	const progress = Math.round((visibleCount / scopedDetections.length) * 100) || 0;

	React.useEffect(() => {
		if (status !== "scanning") {
			return;
		}

		const interval = window.setInterval(() => {
			setVisibleCount((current) => {
				if (current >= scopedDetections.length) {
					window.clearInterval(interval);
					setStatus("complete");
					return current;
				}
				return current + 1;
			});
		}, 110);

		return () => window.clearInterval(interval);
	}, [scopedDetections.length, status]);

	React.useEffect(() => {
		if (!isJudgeMode) {
			return;
		}

		const timers = [
			window.setTimeout(() => setJudgeStage("scan"), 650),
			window.setTimeout(() => {
				setVisibleCount(DEMO_DETECTIONS.length);
				setStatus("complete");
				setJudgeStage("triage");
			}, 3_400),
			window.setTimeout(() => {
				setSelectedDetection(judgeTarget);
				setJudgeStage("evidence");
			}, 4_500),
			window.setTimeout(() => setJudgeStage("ready"), 7_000),
		];

		return () => timers.forEach(window.clearTimeout);
	}, [isJudgeMode]);

	const startScan = React.useCallback(() => {
		setIsJudgeMode(false);
		setSelectedDetection(null);
		setVisibleCount(0);
		setStatus("scanning");
	}, []);

	const changeRegion = React.useCallback((region: RegionSlug | "all") => {
		setIsJudgeMode(false);
		setSelectedRegion(region);
		setSelectedDetection(null);
		setVisibleCount(0);
		setStatus("ready");
	}, []);

	const startJudgeMode = React.useCallback(() => {
		setSelectedRegion("all");
		setActiveModel("ensemble");
		setSelectedDetection(null);
		setVisibleCount(0);
		setStatus("scanning");
		setJudgeStage("overview");
		setIsJudgeMode(true);
	}, []);

	const stopJudgeMode = React.useCallback(() => {
		setIsJudgeMode(false);
		setJudgeStage("overview");
	}, []);

	const clearSelection = React.useCallback(() => setSelectedDetection(null), []);
	const resetDemo = React.useCallback(() => {
		setIsJudgeMode(false);
		setJudgeStage("overview");
		setSelectedRegion("all");
		setActiveModel("ensemble");
		setSelectedDetection(null);
		setVisibleCount(0);
		setStatus("ready");
	}, []);

	return {
		status,
		progress,
		selectedRegion,
		selectedDetection,
		activeModel,
		isJudgeMode,
		judgeStage,
		scopedDetections,
		visibleDetections,
		startScan,
		changeRegion,
		setActiveModel,
		startJudgeMode,
		stopJudgeMode,
		resetDemo,
		selectDetection: setSelectedDetection,
		clearSelection,
	};
}
