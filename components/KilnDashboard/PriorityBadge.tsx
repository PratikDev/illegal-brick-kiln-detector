import { Badge } from "@/components/ui/badge";
import type { CompliancePriorityBand } from "@/lib/compliance";

type PriorityBadgeProps = {
	score: number;
	band: CompliancePriorityBand;
};

const BAND_VARIANT: Record<
	CompliancePriorityBand,
	"destructive" | "secondary" | "outline"
> = {
	high: "destructive",
	medium: "secondary",
	low: "outline",
};

export function PriorityBadge({ score, band }: PriorityBadgeProps) {
	return <Badge variant={BAND_VARIANT[band]}>Priority {score}</Badge>;
}
