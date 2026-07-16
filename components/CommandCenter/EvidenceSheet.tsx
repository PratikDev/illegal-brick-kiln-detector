"use client";

import { RiFileTextLine, RiMapPinLine, RiShieldCheckLine } from "@remixicon/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDetectionConfidence, type DemoDetection } from "@/lib/demo-data";
import { ANALYSIS_MODELS, getModelLabel, type AnalysisViewId } from "@/lib/demo-models";
import { downloadEvidenceReport } from "@/lib/evidence-report";
import { formatConfidence } from "@/lib/prediction-api";
import { EvidenceComparison } from "./EvidenceComparison";
import { ComplianceScreeningPanel } from "./ComplianceScreeningPanel";

export function EvidenceSheet({
	detection,
	activeModel,
	onOpenChange,
}: {
	detection: DemoDetection | null;
	activeModel: AnalysisViewId;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Sheet open={detection !== null} onOpenChange={onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>Signal intelligence</SheetTitle>
					<SheetDescription>Kiln detection followed by auditable non-compliance screening.</SheetDescription>
				</SheetHeader>
				{detection ? (
					<div className="flex flex-col gap-5 px-4 pb-6">
						<div className="flex flex-wrap gap-2">
							<Badge variant={complianceBadgeVariant(detection.compliance.tier)}>{detection.compliance.label}</Badge>
							<Badge>{formatConfidence(getDetectionConfidence(detection, activeModel))} {getModelLabel(activeModel)}</Badge>
							<Badge variant="secondary">{detection.className}</Badge>
							<Badge variant="outline">{detection.modelAgreement}/3 models agree</Badge>
							<Badge variant={detection.risk === "Critical" ? "destructive" : "outline"}>{detection.risk} risk</Badge>
						</div>
						<Tabs defaultValue="compliance">
							<TabsList className="w-full">
								<TabsTrigger value="compliance">Compliance</TabsTrigger>
								<TabsTrigger value="evidence">Imagery</TabsTrigger>
								<TabsTrigger value="models">Models</TabsTrigger>
							</TabsList>
							<TabsContent value="compliance" className="pt-3">
								<ComplianceScreeningPanel screen={detection.compliance} />
							</TabsContent>
							<TabsContent value="evidence" className="pt-3">
								<EvidenceComparison detection={detection} />
							</TabsContent>
							<TabsContent value="models" className="flex flex-col gap-2 pt-3">
								{ANALYSIS_MODELS.map((model) => (
									<div key={model.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
										<div>
											<p className="font-medium">{model.name}</p>
											<p className="text-xs text-muted-foreground">{model.role} · {model.status}</p>
										</div>
										<Badge variant={detection.modelScores[model.id] >= 0.68 ? "default" : "secondary"}>
											{formatConfidence(detection.modelScores[model.id])}
										</Badge>
									</div>
								))}
							</TabsContent>
						</Tabs>
						<Separator />
						<dl className="grid grid-cols-2 gap-4 text-sm">
							<Detail label="District" value={detection.regionName} />
							<Detail label="Kiln type" value={detection.className ?? "Unclassified"} />
							<Detail label="Settlement proximity" value={`${detection.nearbySettlementKm} km`} />
							<Detail label="Estimated CO₂ / year" value={`${detection.estimatedAnnualCo2Tons.toLocaleString()} t`} />
						</dl>
						<Separator />
						<div className="flex items-start gap-3 text-sm">
							<RiMapPinLine className="mt-0.5" aria-hidden="true" />
							<div>
								<p className="font-medium">Tile-center coordinates</p>
								<p className="text-muted-foreground">{detection.lat.toFixed(5)}, {detection.lon.toFixed(5)}</p>
							</div>
						</div>
						<div className="flex items-start gap-3 text-sm">
							<RiShieldCheckLine className="mt-0.5" aria-hidden="true" />
							<div>
								<p className="font-medium">Legal determination</p>
								<p className="text-muted-foreground">Not determined — authority records and field verification are required.</p>
							</div>
						</div>
						<p className="text-xs text-muted-foreground">
							Proximity and emissions values are illustrative demo estimates, not enforcement-grade measurements.
						</p>
						<Button
							onClick={() => toast.promise(downloadEvidenceReport(detection), {
								loading: "Building evidence brief...",
								success: "Evidence PDF downloaded",
								error: "Could not generate the evidence brief",
							})}
						>
							<RiFileTextLine data-icon="inline-start" />
							Download evidence PDF
						</Button>
					</div>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function complianceBadgeVariant(tier: DemoDetection["compliance"]["tier"]): "destructive" | "secondary" | "outline" {
	if (tier === "probable-non-compliance" || tier === "high-concern") return "destructive";
	if (tier === "review") return "secondary";
	return "outline";
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="font-medium">{value}</dd>
		</div>
	);
}
