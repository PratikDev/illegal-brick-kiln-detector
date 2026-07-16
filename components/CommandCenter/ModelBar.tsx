import { RiMovie2Line, RiSparkling2Line } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ANALYSIS_MODELS, type AnalysisViewId } from "@/lib/demo-models";
import { LiveInferenceDialog } from "./LiveInferenceDialog";
import { MethodologyDialog } from "./MethodologyDialog";

export function ModelBar({
	activeModel,
	onChangeModel,
	onStartJudgeMode,
}: {
	activeModel: AnalysisViewId;
	onChangeModel: (model: AnalysisViewId) => void;
	onStartJudgeMode: () => void;
}) {
	return (
		<Card className="border-command-border bg-command-surface/92 py-2 text-command-foreground shadow-2xl backdrop-blur-xl">
			<CardContent className="flex items-center gap-2 px-2">
				<Badge variant="secondary" className="hidden sm:inline-flex">
					<RiSparkling2Line data-icon="inline-start" />
					Replay views
				</Badge>
				<ToggleGroup
					type="single"
					value={activeModel}
					variant="outline"
					size="sm"
					aria-label="Select analysis model"
					onValueChange={(value) => value && onChangeModel(value as AnalysisViewId)}
				>
					<ToggleGroupItem value="ensemble" aria-label="Ensemble model view">Ensemble</ToggleGroupItem>
					{ANALYSIS_MODELS.map((model) => (
						<ToggleGroupItem key={model.id} value={model.id} aria-label={`${model.name} view`}>
							{model.shortName}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<LiveInferenceDialog />
				<MethodologyDialog />
				<Button size="sm" onClick={onStartJudgeMode}>
					<RiMovie2Line data-icon="inline-start" />
					<span className="hidden sm:inline">Judge mode</span>
				</Button>
			</CardContent>
		</Card>
	);
}
