import { describe, expect, test } from "bun:test";

import { screenKilnCompliance } from "@/lib/compliance-screening";

describe("screenKilnCompliance", () => {
	test("prioritizes multiple replay flags without declaring illegality", () => {
		const screen = screenKilnCompliance({
			nearbySettlementKm: 0.6,
			className: "FCBK",
			registryStatus: "not-checked",
		});

		expect(screen.tier).toBe("high-concern");
		expect(screen.flaggedRuleCount).toBe(2);
		expect(screen.missingEvidenceCount).toBe(2);
		expect(screen.isLegalDetermination).toBe(false);
	});

	test("requires an authority-record problem for probable non-compliance", () => {
		const screen = screenKilnCompliance({
			nearbySettlementKm: 1.5,
			className: "Zigzag",
			registryStatus: "expired",
		});

		expect(screen.tier).toBe("probable-non-compliance");
		expect(screen.rules.find(({ id }) => id === "licence")?.evidence).toBe("authority-record");
	});

	test("does not treat a clear image screen as proof of compliance", () => {
		const screen = screenKilnCompliance({
			nearbySettlementKm: 1.5,
			className: "Zigzag",
			registryStatus: "verified-valid",
		});

		expect(screen.tier).toBe("insufficient-evidence");
		expect(screen.missingEvidenceCount).toBe(1);
		expect(screen.isLegalDetermination).toBe(false);
	});
});
