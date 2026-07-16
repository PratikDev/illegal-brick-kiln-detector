import type { jsPDF as JsPdfDocument } from "jspdf";

import type { DemoDetection } from "@/lib/demo-data";
import { ANALYSIS_MODELS } from "@/lib/demo-models";
import { formatConfidence } from "@/lib/prediction-api";

export async function downloadEvidenceReport(detection: DemoDetection): Promise<void> {
	const [{ jsPDF }, evidenceImage] = await Promise.all([
		import("jspdf"),
		createEvidenceImage(detection),
	]);
	const document = new jsPDF({ unit: "mm", format: "a4", compress: true });

	drawReport(document, detection, evidenceImage);
	document.save(`kilnwatch-${sanitizeFilename(detection.id)}-evidence.pdf`);
}

function drawReport(document: JsPdfDocument, detection: DemoDetection, evidenceImage: string) {
	document.setFillColor(18, 47, 31);
	document.rect(0, 0, 210, 34, "F");
	document.setTextColor(245, 248, 238);
	document.setFont("helvetica", "bold");
	document.setFontSize(19);
	document.text("KilnWatch Bangladesh", 16, 15);
	document.setFont("helvetica", "normal");
	document.setFontSize(9);
	document.text("MODEL-ASSISTED FIELD VERIFICATION BRIEF", 16, 23);
	document.text(`Signal ${detection.id}`, 194, 15, { align: "right" });
	document.text("Competition replay", 194, 23, { align: "right" });

	document.addImage(evidenceImage, "PNG", 16, 44, 82, 82);
	document.setDrawColor(35, 92, 56);
	document.setLineWidth(0.6);
	document.rect(16, 44, 82, 82);

	document.setTextColor(27, 34, 29);
	document.setFont("helvetica", "bold");
	document.setFontSize(15);
	document.text(`${detection.regionName} kiln signal`, 108, 50);
	document.setFontSize(9);
	document.setFont("helvetica", "normal");
	let y = 60;
	for (const [label, value] of [
		["Ensemble confidence", formatConfidence(detection.confidence)],
		["Model agreement", `${detection.modelAgreement} of 3`],
		["Risk triage", detection.risk],
		["Kiln class", detection.className ?? "Unclassified"],
		["Coordinates", `${detection.lat.toFixed(5)}, ${detection.lon.toFixed(5)}`],
		["Imagery", `${detection.imagerySource}, ${detection.imageryDate}`],
		["Ground resolution", `Approx. ${detection.resolutionMeters} m`],
	] as const) {
		document.setFont("helvetica", "bold");
		document.text(label.toUpperCase(), 108, y);
		document.setFont("helvetica", "normal");
		document.text(value, 108, y + 4.5);
		y += 11;
	}

	document.setFont("helvetica", "bold");
	document.setFontSize(12);
	document.text("Model replay", 16, 142);
	document.setFillColor(242, 245, 241);
	document.roundedRect(16, 148, 178, 34, 2, 2, "F");
	document.setFontSize(9);
	ANALYSIS_MODELS.forEach((model, index) => {
		const columnX = 22 + index * 58;
		document.setFont("helvetica", "bold");
		document.text(model.name, columnX, 157);
		document.setFontSize(16);
		document.text(formatConfidence(detection.modelScores[model.id]), columnX, 169);
		document.setFontSize(8);
		document.setFont("helvetica", "normal");
		document.text(model.role, columnX, 176, { maxWidth: 52 });
		document.setFontSize(9);
	});

	document.setFont("helvetica", "bold");
	document.setFontSize(12);
	document.text("Prioritization context", 16, 198);
	document.setFont("helvetica", "normal");
	document.setFontSize(9);
	document.text(`Illustrative settlement proximity: ${detection.nearbySettlementKm} km`, 16, 207);
	document.text(`Illustrative annual CO2 estimate: ${detection.estimatedAnnualCo2Tons.toLocaleString()} tonnes`, 16, 213);

	document.setFillColor(255, 245, 228);
	document.setDrawColor(201, 129, 38);
	document.roundedRect(16, 224, 178, 36, 2, 2, "FD");
	document.setFont("helvetica", "bold");
	document.text("FIELD VERIFICATION REQUIRED", 22, 233);
	document.setFont("helvetica", "normal");
	document.text(
		"This brief contains replayed model outputs and illustrative derived estimates. It is not an enforcement decision. Verify the site, imagery date, ownership, operating status, and applicable law before action.",
		22,
		240,
		{ maxWidth: 164 },
	);

	document.setDrawColor(215, 220, 216);
	document.line(16, 273, 194, 273);
	document.setFontSize(8);
	document.setTextColor(92, 99, 94);
	document.text("Prepared by KilnWatch Bangladesh - deterministic competition replay", 16, 280);
	document.text("Page 1 of 1", 194, 280, { align: "right" });
}

async function createEvidenceImage(detection: DemoDetection): Promise<string> {
	const image = await loadImage(detection.tileUrl);
	const canvas = document.createElement("canvas");
	canvas.width = 768;
	canvas.height = 768;
	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Unable to create evidence canvas");
	}

	context.drawImage(image, 0, 0, canvas.width, canvas.height);
	const points = detection.box?.points;
	if (points?.length) {
		const scale = canvas.width / (detection.box?.imageSize ?? 256);
		context.beginPath();
		points.forEach(([x, y], index) => {
			const method = index === 0 ? "moveTo" : "lineTo";
			context[method](x * scale, y * scale);
		});
		context.closePath();
		context.fillStyle = "rgba(255, 77, 46, 0.18)";
		context.strokeStyle = "#ff4d2e";
		context.lineWidth = 8;
		context.fill();
		context.stroke();
	}

	return canvas.toDataURL("image/png");
}

function loadImage(source: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Unable to load the evidence tile"));
		image.src = source;
	});
}

function sanitizeFilename(value: string): string {
	return value.replaceAll(/[^a-zA-Z0-9-_]/g, "-");
}
