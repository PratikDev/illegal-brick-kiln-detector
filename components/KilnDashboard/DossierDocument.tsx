import {
	Document,
	Image as PdfImage,
	Page,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";

import { VERDICT_COPY } from "@/lib/compliance";
import type { DossierFacts, DossierMemo } from "@/lib/dossier";

// @react-pdf does not read the app stylesheet, so these are literals by
// necessity rather than an exception to the globals.css rule.
const styles = StyleSheet.create({
	page: { padding: 44, fontSize: 10, fontFamily: "Helvetica", lineHeight: 1.5 },
	eyebrow: { fontSize: 7, letterSpacing: 1.4, color: "#64748b", marginBottom: 6 },
	title: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 4 },
	reference: { fontSize: 8, color: "#64748b", marginBottom: 18 },
	heading: {
		fontSize: 9,
		fontFamily: "Helvetica-Bold",
		letterSpacing: 0.8,
		marginTop: 16,
		marginBottom: 6,
		color: "#334155",
	},
	bullet: { flexDirection: "row", marginBottom: 3 },
	dash: { width: 10 },
	row: {
		flexDirection: "row",
		borderBottomWidth: 0.5,
		borderBottomColor: "#e2e8f0",
		paddingVertical: 3,
	},
	key: { width: 140, color: "#64748b" },
	image: {
		width: 220,
		height: 220,
		marginTop: 8,
		borderWidth: 0.5,
		borderColor: "#cbd5e1",
	},
	warning: {
		marginTop: 18,
		padding: 9,
		backgroundColor: "#fef2f2",
		borderLeftWidth: 2,
		borderLeftColor: "#dc2626",
		fontSize: 8,
		color: "#7f1d1d",
	},
	footer: {
		position: "absolute",
		bottom: 26,
		left: 44,
		right: 44,
		fontSize: 7,
		color: "#94a3b8",
		borderTopWidth: 0.5,
		borderTopColor: "#e2e8f0",
		paddingTop: 6,
	},
});

function Bullets({ items }: { items: string[] }) {
	return (
		<>
			{items.map((item, index) => (
				<View style={styles.bullet} key={index}>
					<Text style={styles.dash}>—</Text>
					<Text>{item}</Text>
				</View>
			))}
		</>
	);
}

type DossierDocumentProps = {
	memo: DossierMemo;
	facts: DossierFacts;
	evidencePng: string | null;
};

export function DossierDocument({
	memo,
	facts,
	evidencePng,
}: DossierDocumentProps) {
	const compliance = facts.compliance;
	const rows: [string, string][] = [
		["Coordinates", `${facts.lat.toFixed(5)}, ${facts.lon.toFixed(5)}`],
		["District", facts.district],
		["Kiln class (model)", facts.className],
		["Model confidence", `${(facts.confidence * 100).toFixed(1)}%`],
		["Assessment", VERDICT_COPY[compliance.verdict].title],
		["Triage priority", `${compliance.priorityScore} / 100`],
		[
			"Population within 1 km",
			compliance.populationWithin1km === null
				? "Not available"
				: `~${compliance.populationWithin1km.toLocaleString("en-US")} (estimate)`,
		],
	];

	return (
		<Document title={memo.referenceCode}>
			<Page size="A4" style={styles.page}>
				<Text style={styles.eyebrow}>
					ILLEGAL BRICK KILN DETECTOR · SITE INSPECTION REFERRAL
				</Text>
				<Text style={styles.title}>{memo.subjectLine}</Text>
				<Text style={styles.reference}>
					Ref {memo.referenceCode} · detection {facts.id} · generated{" "}
					{new Date().toISOString().slice(0, 16).replace("T", " ")} UTC
				</Text>

				<Text style={styles.heading}>SUMMARY</Text>
				<Text>{memo.summary}</Text>

				<Text style={styles.heading}>SITE</Text>
				{rows.map(([key, value]) => (
					<View style={styles.row} key={key}>
						<Text style={styles.key}>{key}</Text>
						<Text>{value}</Text>
					</View>
				))}

				<Text style={styles.heading}>OBSERVED FINDINGS</Text>
				<Bullets items={memo.observedFindings} />

				{evidencePng ? (
					<>
						<Text style={styles.heading}>IMAGE EVIDENCE</Text>
						<Text style={{ fontSize: 8, color: "#64748b" }}>
							Source tile with model-predicted oriented bounding box.
						</Text>
						<PdfImage src={evidencePng} style={styles.image} />
					</>
				) : null}

				<Text style={styles.heading}>RECOMMENDED ACTIONS</Text>
				<Bullets items={memo.recommendedActions} />

				<Text style={styles.heading}>LIMITATIONS</Text>
				<Bullets items={memo.limitations} />

				<View style={styles.warning}>
					<Text>
						This document is an automated screening output, not a legal finding.
						It must not be used for enforcement, public accusation, or
						site-level publication without human review and field verification.
					</Text>
				</View>

				<Text style={styles.footer} fixed>
					Team PTSD · SciBlitz AI Challenge 2026 · Narrative drafted by Claude
					from verified structured findings · Map data © OpenStreetMap
					contributors (ODbL)
				</Text>
			</Page>
		</Document>
	);
}
