import { RiCpuLine, RiFlaskLine, RiInformationLine, RiShieldCheckLine } from "@remixicon/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COMPLIANCE_POLICY } from "@/lib/compliance-screening";
import { ANALYSIS_MODELS } from "@/lib/demo-models";

export function MethodologyDialog() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon-sm" aria-label="About this analysis">
					<RiInformationLine />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-dvh overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>About this analysis</DialogTitle>
					<DialogDescription>
						How kiln detection becomes a transparent compliance screen—and why it is not a legal verdict.
					</DialogDescription>
				</DialogHeader>
				<Alert>
					<RiFlaskLine />
					<AlertTitle>Deterministic competition replay</AlertTitle>
					<AlertDescription>
						The national scan replays prepared georeferenced outputs. RT-DETR and ViT remain replayed model views and are not presented as live inference.
					</AlertDescription>
				</Alert>
				<Alert>
					<RiCpuLine />
					<AlertTitle>Live YOLO11-OBB proof</AlertTitle>
					<AlertDescription>
						The Live AI action sends a resized image to the Vercel Python Function and displays the actual LiteRT response, including server processing time.
					</AlertDescription>
				</Alert>
				<Tabs defaultValue="compliance">
					<TabsList className="w-full">
						<TabsTrigger value="pipeline">Pipeline</TabsTrigger>
						<TabsTrigger value="compliance">Compliance</TabsTrigger>
						<TabsTrigger value="evidence">Evidence</TabsTrigger>
						<TabsTrigger value="limits">Limits</TabsTrigger>
					</TabsList>
					<TabsContent value="pipeline" className="flex flex-col gap-3 pt-3">
						{ANALYSIS_MODELS.map((model, index) => (
							<div key={model.id} className="flex items-start gap-3 rounded-lg border p-3">
								<Badge variant="secondary">0{index + 1}</Badge>
								<div className="flex flex-col gap-1">
									<p className="font-medium">{model.name}</p>
									<p className="text-sm text-muted-foreground">{model.role}</p>
								</div>
							</div>
						))}
						<p className="text-sm text-muted-foreground">
							The ensemble score is the mean of the three replayed confidence scores. Agreement counts models above the 68% review threshold.
						</p>
						<p className="text-sm text-muted-foreground">
							Live uploads use only the deployed YOLO11-OBB TFLite checkpoint and never inherit replayed ensemble scores.
						</p>
					</TabsContent>
					<TabsContent value="compliance" className="flex flex-col gap-3 pt-3 text-sm">
						<p><strong>Stage 1 — detect:</strong> identify and localize a kiln-like structure from satellite imagery.</p>
						<p><strong>Stage 2 — screen:</strong> evaluate potential residential-buffer and technology flags, then expose missing land-use, licence, clearance, and field evidence.</p>
						<p><strong>Stage 3 — verify:</strong> match authority records, inspect the site, confirm household counts and straight-line distances, and review applicable exceptions.</p>
						<p>
							The current rule set is anchored to {COMPLIANCE_POLICY.section}. The bundled national experience replays proximity and technology values; it does not contain a government registry or cadastral layers.
						</p>
						<div className="flex flex-wrap gap-2">
							<Badge asChild variant="outline"><a href={COMPLIANCE_POLICY.actUrl} target="_blank" rel="noreferrer">Official Act</a></Badge>
							<Badge asChild variant="outline"><a href={COMPLIANCE_POLICY.enforcementGuideUrl} target="_blank" rel="noreferrer">Enforcement inspection guide</a></Badge>
						</div>
					</TabsContent>
					<TabsContent value="evidence" className="flex flex-col gap-3 pt-3 text-sm">
						<p><strong>Model output:</strong> rotated geometry, kiln class, confidence, and model agreement.</p>
						<p><strong>Source imagery:</strong> georeferenced Sentinel-2 Cloudless 2024 annual composite at approximately 10 m resolution.</p>
						<p><strong>Derived demo estimates:</strong> settlement proximity, compliance flags, and annual CO2 values are illustrative prioritization metadata.</p>
						<p><strong>Human review:</strong> every exported brief is marked for field verification before enforcement.</p>
					</TabsContent>
					<TabsContent value="limits" className="flex flex-col gap-3 pt-3">
						<Alert variant="destructive">
							<RiShieldCheckLine />
							<AlertTitle>Not an enforcement decision</AlertTitle>
							<AlertDescription>
								Cloud cover, seasonal appearance, mixed industrial sites, outdated imagery, domain shift, and incomplete legal records can produce false detections or incorrect compliance flags.
							</AlertDescription>
						</Alert>
						<p className="text-sm text-muted-foreground">
							A production deployment needs independently measured validation data, calibrated thresholds, temporal imagery, field observations, and documented reviewer sign-off.
						</p>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
