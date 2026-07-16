import {
	RiAlertLine,
	RiCheckboxCircleLine,
	RiExternalLinkLine,
	RiQuestionLine,
	RiShieldCheckLine,
} from "@remixicon/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	COMPLIANCE_POLICY,
	type ComplianceRule,
	type ComplianceRuleStatus,
	type ComplianceScreen,
} from "@/lib/compliance-screening";

export function ComplianceScreeningPanel({ screen }: { screen: ComplianceScreen }) {
	return (
		<div className="flex flex-col gap-4">
			<Alert variant={screen.tier === "probable-non-compliance" ? "destructive" : "default"}>
				<RiShieldCheckLine />
				<AlertTitle>{screen.label}</AlertTitle>
				<AlertDescription>{screen.summary}</AlertDescription>
			</Alert>

			<div className="flex flex-wrap items-center gap-2">
				<Badge variant="secondary">{screen.flaggedRuleCount} rules flagged</Badge>
				<Badge variant="outline">{screen.missingEvidenceCount} evidence gaps</Badge>
				<Badge asChild variant="outline">
					<a href={COMPLIANCE_POLICY.actUrl} target="_blank" rel="noreferrer">
						Official Act
						<RiExternalLinkLine data-icon="inline-end" />
					</a>
				</Badge>
				<Badge asChild variant="outline">
					<a href={COMPLIANCE_POLICY.enforcementGuideUrl} target="_blank" rel="noreferrer">
						Inspection guide
						<RiExternalLinkLine data-icon="inline-end" />
					</a>
				</Badge>
			</div>

			<div className="flex flex-col rounded-lg border">
				{screen.rules.map((rule, index) => (
					<div key={rule.id}>
						<ComplianceRuleRow rule={rule} />
						{index < screen.rules.length - 1 ? <Separator /> : null}
					</div>
				))}
			</div>

			<p className="text-xs text-muted-foreground">
				The bundled values are a prepared screening replay. They demonstrate the rule engine but are not government registry, cadastral, household-count, or field-inspection evidence.
			</p>
		</div>
	);
}

function ComplianceRuleRow({ rule }: { rule: ComplianceRule }) {
	const Icon = RULE_ICONS[rule.status];
	return (
		<div className="flex items-start gap-3 p-3">
			<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
				<Icon aria-hidden="true" />
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="font-medium">{rule.label}</p>
					<RuleStatusBadge status={rule.status} />
				</div>
				<p className="text-xs font-medium text-muted-foreground">{rule.legalBasis}</p>
				<p className="text-sm text-muted-foreground">{rule.detail}</p>
			</div>
		</div>
	);
}

function RuleStatusBadge({ status }: { status: ComplianceRuleStatus }) {
	const content: Record<ComplianceRuleStatus, { label: string; variant: "destructive" | "secondary" | "outline" }> = {
		flagged: { label: "Flagged", variant: "destructive" },
		clear: { label: "No flag", variant: "secondary" },
		unknown: { label: "Evidence missing", variant: "outline" },
	};
	return <Badge variant={content[status].variant}>{content[status].label}</Badge>;
}

const RULE_ICONS = {
	flagged: RiAlertLine,
	clear: RiCheckboxCircleLine,
	unknown: RiQuestionLine,
} satisfies Record<ComplianceRuleStatus, typeof RiAlertLine>;
