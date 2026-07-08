import { Badge } from "@/components/ui/badge";
import type { PredictionSummary as PredictionSummaryData } from "@/lib/prediction-api";
import { formatConfidence } from "@/lib/prediction-api";

type PredictionSummaryProps = {
	summary: PredictionSummaryData;
};

export function PredictionSummary({ summary }: PredictionSummaryProps) {
	const stats = [
		{ label: "Detections", value: summary.total.toString() },
		{ label: "High confidence", value: summary.highConfidence.toString() },
		{ label: "Medium confidence", value: summary.mediumConfidence.toString() },
		{
			label: "Avg. confidence",
			value: formatConfidence(summary.averageConfidence),
		},
	];

	return (
		<div className="flex flex-col gap-3">
			<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
				{stats.map((stat) => (
					<div key={stat.label} className="rounded-lg border bg-background p-3">
						<p className="text-xs text-muted-foreground">{stat.label}</p>
						<p className="font-heading text-xl font-medium">{stat.value}</p>
					</div>
				))}
			</div>
			<div className="flex flex-wrap gap-2">
				<Badge variant="outline">CFCBK {summary.classes.CFCBK}</Badge>
				<Badge variant="outline">FCBK {summary.classes.FCBK}</Badge>
				<Badge variant="outline">Zigzag {summary.classes.Zigzag}</Badge>
			</div>
		</div>
	);
}
