import type { Prediction } from "@/lib/prediction-api";
import { getDisplayTileUrl } from "@/lib/prediction-api";

const OUTPUT_SIZE = 512;

/**
 * Rasterises the tile with its oriented box burned in, for embedding in the PDF.
 * PredictionTilePreview overlays an SVG polygon instead, which cannot be handed
 * to a PDF. Same geometry, different output.
 *
 * Returns null rather than throwing: a missing image must not block the memo.
 */
export async function renderEvidencePng(
	prediction: Prediction,
): Promise<string | null> {
	const tileUrl = getDisplayTileUrl(prediction.tileUrl);
	if (!tileUrl) {
		return null;
	}

	try {
		const image = await loadImage(tileUrl);
		const canvas = document.createElement("canvas");
		canvas.width = OUTPUT_SIZE;
		canvas.height = OUTPUT_SIZE;

		const context = canvas.getContext("2d");
		if (!context) {
			return null;
		}

		context.drawImage(image, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

		const box = prediction.box;
		if (box && box.points.length > 0) {
			// Points are in tile pixel space of box.imageSize, not the source image.
			const scale = OUTPUT_SIZE / box.imageSize;
			context.strokeStyle = "#dc2626";
			context.lineWidth = 3;
			context.beginPath();
			box.points.forEach(([x, y], index) => {
				const px = x * scale;
				const py = y * scale;
				if (index === 0) {
					context.moveTo(px, py);
				} else {
					context.lineTo(px, py);
				}
			});
			context.closePath();
			context.stroke();
		}

		return canvas.toDataURL("image/png");
	} catch {
		return null;
	}
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new window.Image();
		image.crossOrigin = "anonymous";
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error(`could not load ${src}`));
		image.src = src;
	});
}
