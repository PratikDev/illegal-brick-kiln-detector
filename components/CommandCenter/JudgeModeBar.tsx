import { RiCloseLine, RiMovie2Line } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { JudgeStage } from "./use-command-scan";

const stageDetails: Record<JudgeStage, { label: string; description: string; progress: number }> = {
	overview: { label: "01 · National overview", description: "Five priority districts come online.", progress: 12 },
	scan: { label: "02 · Kiln detection", description: "Three replayed model views localize kiln structures.", progress: 42 },
	triage: { label: "03 · Compliance screen", description: "Location, technology, and evidence rules prioritize review.", progress: 68 },
	evidence: { label: "04 · Rule inspection", description: "The camera enters a high-concern Tangail screen.", progress: 88 },
	ready: { label: "05 · Investigation brief", description: "Review flags and evidence gaps before field verification.", progress: 100 },
};

export function JudgeModeBar({ stage, onStop }: { stage: JudgeStage; onStop: () => void }) {
	const detail = stageDetails[stage];

	return (
		<Card className="w-[min(38rem,calc(100vw-2rem))] border-command-border bg-command-surface/95 py-2 text-command-foreground shadow-2xl backdrop-blur-xl">
			<CardContent className="flex items-center gap-3 px-3">
				<Badge>
					<RiMovie2Line data-icon="inline-start" />
					Judge mode
				</Badge>
				<div className="min-w-0 flex-1">
					<div className="mb-1 flex items-center justify-between gap-3 text-xs">
						<span className="truncate font-medium">{detail.label}</span>
						<span className="hidden text-command-muted sm:inline">{detail.description}</span>
					</div>
					<Progress value={detail.progress} aria-label={`Judge mode ${detail.progress}% complete`} />
				</div>
				<Button variant="ghost" size="icon-sm" onClick={onStop} aria-label="Exit judge mode">
					<RiCloseLine />
				</Button>
			</CardContent>
		</Card>
	);
}
