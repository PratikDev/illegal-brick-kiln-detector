"use client";

import { RiDownload2Line, RiFileTextLine, RiRefreshLine } from "@remixicon/react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { buildDossierFacts, isDossierMemo, type DossierMemo } from "@/lib/dossier";
import type { Prediction } from "@/lib/prediction-api";
import { renderEvidencePng } from "./render-evidence";

type DossierPanelProps = {
	prediction: Prediction;
	district: string;
	generatedAt: string;
};

type DossierState =
	| { status: "idle" }
	| { status: "drafting" }
	| { status: "ready"; memo: DossierMemo; evidencePng: string | null }
	| { status: "downloading"; memo: DossierMemo; evidencePng: string | null };

export function DossierPanel({
	prediction,
	district,
	generatedAt,
}: DossierPanelProps) {
	// Reset on a new detection is handled by the caller keying this component on
	// prediction.id, which remounts it. Cheaper and simpler than a reset effect.
	const [state, setState] = React.useState<DossierState>({ status: "idle" });

	const facts = buildDossierFacts(prediction, district, generatedAt);
	if (!facts) {
		return null;
	}

	async function draft() {
		if (!facts) {
			return;
		}

		setState({ status: "drafting" });
		try {
			const [response, evidencePng] = await Promise.all([
				fetch("/api/dossier", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(facts),
				}),
				renderEvidencePng(prediction),
			]);

			const memo: unknown = await response.json();
			if (!isDossierMemo(memo)) {
				throw new Error("Dossier response was malformed");
			}

			setState({ status: "ready", memo, evidencePng });
		} catch (error) {
			setState({ status: "idle" });
			toast.error(
				error instanceof Error ? error.message : "Could not draft the dossier",
			);
		}
	}

	async function download(memo: DossierMemo, evidencePng: string | null) {
		setState({ status: "downloading", memo, evidencePng });
		try {
			// Imported lazily: @react-pdf/renderer is large and only needed on click.
			const [{ pdf }, { DossierDocument }] = await Promise.all([
				import("@react-pdf/renderer"),
				import("./DossierDocument"),
			]);
			const blob = await pdf(
				<DossierDocument memo={memo} facts={facts!} evidencePng={evidencePng} />,
			).toBlob();

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${memo.referenceCode}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			toast.error("Could not build the PDF");
		} finally {
			setState({ status: "ready", memo, evidencePng });
		}
	}

	if (state.status === "idle" || state.status === "drafting") {
		const drafting = state.status === "drafting";
		return (
			<Button variant="outline" onClick={draft} disabled={drafting}>
				{drafting ? (
					<RiRefreshLine data-icon="inline-start" />
				) : (
					<RiFileTextLine data-icon="inline-start" />
				)}
				{drafting ? "Drafting referral…" : "Draft inspection referral"}
			</Button>
		);
	}

	const { memo, evidencePng } = state;

	return (
		<section className="flex flex-col gap-3 rounded-lg border p-4">
			<header>
				<h3 className="font-medium">{memo.subjectLine}</h3>
				<p className="mt-1 font-mono text-xs text-muted-foreground">
					{memo.referenceCode}
				</p>
			</header>

			<p className="text-sm">{memo.summary}</p>

			<MemoList title="Observed findings" items={memo.observedFindings} />
			<MemoList title="Recommended actions" items={memo.recommendedActions} />
			<MemoList title="Limitations" items={memo.limitations} />

			<Separator />

			<Button
				onClick={() => download(memo, evidencePng)}
				disabled={state.status === "downloading"}
			>
				<RiDownload2Line data-icon="inline-start" />
				{state.status === "downloading" ? "Building PDF…" : "Download PDF"}
			</Button>
		</section>
	);
}

function MemoList({ title, items }: { title: string; items: string[] }) {
	if (items.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-1">
			<h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{title}
			</h4>
			<ul className="flex list-disc flex-col gap-1 pl-4 text-xs">
				{items.map((item) => (
					<li key={item}>{item}</li>
				))}
			</ul>
		</div>
	);
}
