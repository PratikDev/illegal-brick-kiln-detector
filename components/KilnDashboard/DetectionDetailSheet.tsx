import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	formatConfidence,
	type Prediction,
} from "@/lib/prediction-api";
import { PredictionTilePreview } from "./PredictionTilePreview";
import { VerdictCard } from "./VerdictCard";

type DetectionDetailSheetProps = {
	prediction: Prediction | null;
	onOpenChange: (open: boolean) => void;
};

export function DetectionDetailSheet({
	prediction,
	onOpenChange,
}: DetectionDetailSheetProps) {
	const boxLabel = prediction?.box
		? `${prediction.box.type.toUpperCase()} / ${prediction.box.imageSize}px`
		: "Unavailable";

	return (
		<Sheet open={prediction !== null} onOpenChange={onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Detection evidence</SheetTitle>
					<SheetDescription>
						Model output, location, and tile-level visual evidence.
					</SheetDescription>
				</SheetHeader>

				{prediction ? (
					<div className="flex flex-col gap-4 px-4 pb-4">
						<PredictionTilePreview prediction={prediction} />

						<VerdictCard compliance={prediction.compliance} />

						<div className="flex flex-wrap gap-2">
							<Badge>{formatConfidence(prediction.confidence)}</Badge>
							<Badge variant="outline">
								{prediction.className ?? prediction.label}
							</Badge>
							<Badge variant={prediction.box ? "secondary" : "outline"}>
								{prediction.box ? "OBB available" : "No box"}
							</Badge>
						</div>

						<Separator />

						<dl className="grid gap-3 text-sm">
							<DetailRow label="Detection ID" value={prediction.id} />
							<DetailRow
								label="Class"
								value={prediction.className ?? "Unclassified"}
							/>
							<DetailRow label="Label" value={prediction.label} />
							<DetailRow
								label="Confidence"
								value={formatConfidence(prediction.confidence)}
							/>
							<DetailRow
								label="Coordinates"
								value={`${prediction.lat.toFixed(6)}, ${prediction.lon.toFixed(6)}`}
							/>
							<DetailRow
								label="Tile source"
								value={prediction.tileUrl || "Unavailable"}
							/>
							<DetailRow label="Box" value={boxLabel} />
						</dl>
					</div>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="break-words font-medium">{value}</dd>
		</div>
	);
}
