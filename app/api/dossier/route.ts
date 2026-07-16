import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import type { DossierFacts, DossierMemo } from "@/lib/dossier";

export const runtime = "nodejs";
export const maxDuration = 30;

const MEMO_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		subjectLine: { type: "string", description: "One line, under 100 chars" },
		summary: { type: "string", description: "2-3 sentences, neutral register" },
		observedFindings: {
			type: "array",
			items: { type: "string" },
			description: "One entry per violation, each stating its exact distance",
		},
		recommendedActions: {
			type: "array",
			items: { type: "string" },
			description: "Verification steps only. Never penalties.",
		},
		limitations: {
			type: "array",
			items: { type: "string" },
			description: "Restate every caveat supplied. Omit none.",
		},
	},
	required: [
		"subjectLine",
		"summary",
		"observedFindings",
		"recommendedActions",
		"limitations",
	],
};

const SYSTEM = `You draft site-inspection referral memoranda for environmental
reviewers in Bangladesh, in the register of an official government record.

HARD RULES:
- Use ONLY facts in the supplied JSON. Invent no names, dates, distances, owners,
  case numbers, or statutes. If a fact is absent, omit it.
- Never assert that an offence has occurred. This satellite pipeline produces
  INDICATIVE findings only. Write "recommended for verification", never "guilty",
  "illegal", or "confirmed".
- recommendedActions contains verification steps only, never fines, arrests,
  closures, or penalties.
- limitations must restate every caveat supplied, in full. Never soften them.
- Neutral, factual, unemotional. No advocacy, no adjectives that imply blame.`;

/**
 * Deterministic per detection, so the same site always yields the same
 * reference. Never derived from the LLM: a case number is an identifier, not
 * prose, and the system prompt forbids inventing one.
 */
function referenceCode(facts: DossierFacts): string {
	let hash = 0;
	for (const char of facts.id) {
		hash = (hash * 31 + char.charCodeAt(0)) | 0;
	}
	const suffix = Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
	return `IBKD-${facts.district.toUpperCase()}-${suffix.padStart(6, "0")}`;
}

export async function POST(request: Request) {
	const facts = (await request.json()) as DossierFacts;

	// Demo insurance: a live API call is a single point of failure on stage.
	if (process.env.DOSSIER_MOCK === "1" || !process.env.ANTHROPIC_API_KEY) {
		return NextResponse.json(mockMemo(facts));
	}

	try {
		const client = new Anthropic();
		const message = await client.messages.create({
			model: "claude-sonnet-5",
			max_tokens: 2000,
			system: SYSTEM,
			// Structured outputs are GA: no beta header. Note output_config.format,
			// not the legacy top-level output_format.
			output_config: { format: { type: "json_schema", schema: MEMO_SCHEMA } },
			messages: [{ role: "user", content: JSON.stringify(facts, null, 2) }],
			// No temperature: Sonnet 5 rejects non-default sampling parameters.
		});

		// Sonnet 5 runs adaptive thinking by default, so content[0] may be a
		// thinking block. Always find the text block by type, never by index.
		const block = message.content.find(
			(item): item is Anthropic.TextBlock => item.type === "text",
		);
		if (!block) {
			throw new Error("no text block in response");
		}

		const drafted = JSON.parse(block.text) as Omit<DossierMemo, "referenceCode">;
		return NextResponse.json({
			...drafted,
			referenceCode: referenceCode(facts),
		} satisfies DossierMemo);
	} catch (error) {
		console.error("dossier generation failed:", error);
		return NextResponse.json(mockMemo(facts)); // degrade, never 500
	}
}

function mockMemo(facts: DossierFacts): DossierMemo {
	const violations = facts.compliance.violations;

	return {
		referenceCode: referenceCode(facts),
		subjectLine: `Site inspection referral - suspected brick kiln, ${facts.district}`,
		summary:
			`An automated satellite review identified a probable ${facts.className} kiln at ` +
			`${facts.lat.toFixed(5)}, ${facts.lon.toFixed(5)} with model confidence ` +
			`${Math.round(facts.confidence * 100)}%. ${violations.length} proximity finding(s) ` +
			`are recommended for field verification.`,
		observedFindings: violations.map(
			(violation) =>
				`${violation.featureName ?? violation.label} at approximately ` +
				`${violation.distanceM} m (statutory buffer ${violation.thresholdM} m). ` +
				`Reference: ${violation.legalRef}.`,
		),
		recommendedActions: [
			"Conduct a field visit to confirm the presence, type, and operational status of the kiln.",
			"Verify licensing and environmental clearance status against the district register.",
			"Re-measure distances to protected features using survey-grade instruments.",
		],
		limitations: facts.compliance.caveats,
	};
}
