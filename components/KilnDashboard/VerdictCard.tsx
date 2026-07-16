import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	formatDistance,
	formatPopulation,
	VERDICT_COPY,
	type ComplianceResult,
	type Violation,
} from "@/lib/compliance";
import { cn } from "@/lib/utils";

type VerdictCardProps = {
	compliance?: ComplianceResult;
	onFocusFeature?: (latLon: [number, number]) => void;
};

export function VerdictCard({ compliance, onFocusFeature }: VerdictCardProps) {
	if (!compliance) {
		return (
			<p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
				Compliance check needs a georeferenced tile. Run seeded district tiles to
				see a legal assessment.
			</p>
		);
	}

	const copy = VERDICT_COPY[compliance.verdict];
	const flagged = compliance.verdict === "likely_non_compliant";

	return (
		<section
			className={cn(
				"flex flex-col gap-3 rounded-lg border p-4",
				flagged && "border-compliance-flagged/50 bg-compliance-buffer-fill",
			)}
		>
			<header className="flex items-start justify-between gap-3">
				<div>
					<h3 className="font-medium">{copy.title}</h3>
					<p className="mt-1 text-xs text-muted-foreground">{copy.note}</p>
				</div>
				<Badge variant={flagged ? "destructive" : "secondary"}>
					Priority {compliance.priorityScore}
				</Badge>
			</header>

			{compliance.violations.length > 0 ? (
				<ul className="flex flex-col gap-2">
					{compliance.violations.map((violation) => (
						<ViolationRow
							key={violation.featureId}
							violation={violation}
							onFocusFeature={onFocusFeature}
						/>
					))}
				</ul>
			) : null}

			{compliance.populationWithin1km !== null ? (
				<>
					<Separator />
					<p className="text-sm">
						<span className="font-medium tabular-nums">
							~{formatPopulation(compliance.populationWithin1km)}
						</span>{" "}
						<span className="text-muted-foreground">
							people live within 1 km (estimate)
						</span>
					</p>
				</>
			) : null}

			<Separator />

			<details className="text-xs text-muted-foreground">
				<summary className="cursor-pointer select-none">
					How this was assessed
				</summary>
				<ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
					{compliance.caveats.map((caveat) => (
						<li key={caveat}>{caveat}</li>
					))}
				</ul>
			</details>
		</section>
	);
}

function ViolationRow({
	violation,
	onFocusFeature,
}: {
	violation: Violation;
	onFocusFeature?: (latLon: [number, number]) => void;
}) {
	return (
		<li className="flex items-baseline justify-between gap-3 text-sm">
			<button
				type="button"
				onClick={() => onFocusFeature?.(violation.featureLatLon)}
				disabled={!onFocusFeature}
				className="text-left underline-offset-4 hover:underline disabled:cursor-default disabled:no-underline"
			>
				<span className="font-medium">
					{violation.featureName ?? violation.label}
				</span>
				<span className="block text-xs text-muted-foreground">
					{violation.legalRef}
					{violation.legalRefVerified ? null : " · citation unverified"}
				</span>
			</button>
			<span className="shrink-0 font-mono text-xs tabular-nums">
				{formatDistance(violation.distanceM)}
				<span className="text-muted-foreground">
					{" / "}
					{formatDistance(violation.thresholdM)}
				</span>
			</span>
		</li>
	);
}
