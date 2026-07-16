import { RiAlertLine, RiMap2Line, RiScan2Line } from "@remixicon/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_TOTALS } from "@/lib/demo-data";

const stats = [
	{ label: "Priority districts", value: DEMO_TOTALS.districts, icon: RiMap2Line },
	{ label: "Tiles reviewed", value: DEMO_TOTALS.tiles, icon: RiScan2Line },
	{ label: "Critical signals", value: DEMO_TOTALS.critical, icon: RiAlertLine },
];

export function StatsRail() {
	return (
		<div className="grid grid-cols-3 gap-2">
			{stats.map(({ label, value, icon: Icon }) => (
				<Card key={label} size="sm" className="border-command-border bg-command-surface/88 text-command-foreground backdrop-blur-xl">
					<CardHeader className="flex flex-row items-center justify-between gap-2">
						<CardTitle className="text-[0.65rem] font-medium uppercase tracking-wide text-command-muted">{label}</CardTitle>
						<Icon aria-hidden="true" />
					</CardHeader>
					<CardContent>
						<p className="font-heading text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
