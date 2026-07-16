export type PreparedInferenceImage = {
	dataUrl: string;
	fileName: string;
	originalWidth: number;
	originalHeight: number;
	originalBytes: number;
	uploadBytes: number;
};

const TARGET_SIZE = 256;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function prepareInferenceImage(file: File): Promise<PreparedInferenceImage> {
	if (!SUPPORTED_TYPES.has(file.type)) {
		throw new Error("Choose a PNG, JPEG, or WebP satellite image.");
	}

	if (file.size > MAX_SOURCE_BYTES) {
		throw new Error("Choose an image smaller than 15 MB.");
	}

	const bitmap = await createImageBitmap(file);
	try {
		const canvas = document.createElement("canvas");
		canvas.width = TARGET_SIZE;
		canvas.height = TARGET_SIZE;
		const context = canvas.getContext("2d");

		if (!context) {
			throw new Error("This browser cannot prepare the satellite image.");
		}

		context.fillStyle = "rgb(114, 114, 114)";
		context.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

		const scale = Math.min(TARGET_SIZE / bitmap.width, TARGET_SIZE / bitmap.height);
		const width = bitmap.width * scale;
		const height = bitmap.height * scale;
		context.drawImage(
			bitmap,
			(TARGET_SIZE - width) / 2,
			(TARGET_SIZE - height) / 2,
			width,
			height,
		);

		const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
		return {
			dataUrl,
			fileName: file.name,
			originalWidth: bitmap.width,
			originalHeight: bitmap.height,
			originalBytes: file.size,
			uploadBytes: estimateDataUrlBytes(dataUrl),
		};
	} finally {
		bitmap.close();
	}
}

function estimateDataUrlBytes(dataUrl: string): number {
	const encoded = dataUrl.split(",", 2)[1] ?? "";
	return Math.floor((encoded.length * 3) / 4);
}
