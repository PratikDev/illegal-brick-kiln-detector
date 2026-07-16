import tileManifest from "@/model/tiles.json";

import { screenKilnCompliance, type ComplianceScreen } from "@/lib/compliance-screening";
import { ANALYSIS_MODEL_IDS, type AnalysisModelId, type AnalysisViewId } from "@/lib/demo-models";
import type { Prediction, PredictionClassName } from "@/lib/prediction-api";
import { SUPPORTED_REGIONS, type RegionSlug } from "@/lib/regions";

type ManifestTile = {
	id: string;
	url: string;
	centerLat: number;
	centerLon: number;
};

export type DemoDetection = Prediction & {
	regionSlug: RegionSlug;
	regionName: string;
	risk: "Critical" | "Elevated" | "Watch";
	nearbySettlementKm: number;
	estimatedAnnualCo2Tons: number;
	modelScores: Record<AnalysisModelId, number>;
	modelAgreement: number;
	mapPolygon: [number, number][];
	imagerySource: string;
	imageryDate: string;
	resolutionMeters: number;
	compliance: ComplianceScreen;
};

const confidenceSequence = [0.96, 0.92, 0.89, 0.86, 0.83, 0.78, 0.74, 0.68, 0.61, 0.55];
const classSequence: PredictionClassName[] = [
	"Zigzag",
	"FCBK",
	"Zigzag",
	"CFCBK",
	"FCBK",
];

const regionsBySlug = Object.fromEntries(
	SUPPORTED_REGIONS.map((region) => [region.slug, region]),
) as Record<RegionSlug, (typeof SUPPORTED_REGIONS)[number]>;

const manifest = tileManifest.regions as Record<RegionSlug, ManifestTile[]>;

export const DEMO_DETECTIONS: DemoDetection[] = Object.entries(manifest).flatMap(
	([slug, tiles], regionIndex) => {
		const regionSlug = slug as RegionSlug;
		const region = regionsBySlug[regionSlug];

		return tiles.map((tile, tileIndex) => {
			const baseConfidence = confidenceSequence[(tileIndex + regionIndex * 2) % confidenceSequence.length];
			const className = classSequence[(tileIndex + regionIndex) % classSequence.length];
			const modelScores = createModelScores(baseConfidence, tileIndex, regionIndex);
			const confidence = average(Object.values(modelScores));
			const angle = ((tileIndex * 19 + regionIndex * 11) % 130) - 65;
			const widthMeters = 190 + ((tileIndex * 31 + regionIndex * 17) % 170);
			const heightMeters = 82 + ((tileIndex * 13 + regionIndex * 7) % 84);
			const nearbySettlementKm = Number((0.4 + ((tileIndex * 7 + regionIndex) % 19) / 10).toFixed(1));

			return {
				id: tile.id,
				lat: tile.centerLat,
				lon: tile.centerLon,
				confidence,
				label: "kiln",
				tileUrl: tile.url,
				className,
				box: {
					type: "obb",
					imageSize: 256,
					points: rotatedRectangle(128, 128, 132 + (tileIndex % 4) * 14, 54 + (regionIndex % 3) * 9, angle),
				},
				regionSlug,
				regionName: region.name,
				risk: confidence >= 0.85 ? "Critical" : confidence >= 0.68 ? "Elevated" : "Watch",
				nearbySettlementKm,
				estimatedAnnualCo2Tons: 9_800 + ((tileIndex * 2_700 + regionIndex * 1_300) % 18_000),
				modelScores,
				modelAgreement: ANALYSIS_MODEL_IDS.filter((modelId) => modelScores[modelId] >= 0.68).length,
				mapPolygon: geographicRectangle(tile.centerLat, tile.centerLon, widthMeters, heightMeters, angle),
				imagerySource: "EOX Sentinel-2 Cloudless",
				imageryDate: "2024 annual composite",
				resolutionMeters: 10,
				compliance: screenKilnCompliance({
					nearbySettlementKm,
					className,
					registryStatus: "not-checked",
				}),
			};
		});
	},
);

export const DEMO_TOTALS = {
	districts: SUPPORTED_REGIONS.length,
	tiles: DEMO_DETECTIONS.length,
	critical: DEMO_DETECTIONS.filter(({ risk }) => risk === "Critical").length,
	highConcern: DEMO_DETECTIONS.filter(({ compliance }) =>
		["probable-non-compliance", "high-concern"].includes(compliance.tier),
	).length,
	registryGaps: DEMO_DETECTIONS.filter(({ compliance }) => compliance.registryStatus === "not-checked").length,
	annualCo2Tons: DEMO_DETECTIONS.reduce(
		(total, detection) => total + detection.estimatedAnnualCo2Tons,
		0,
	),
};

export function getDetectionConfidence(
	detection: DemoDetection,
	modelId: AnalysisViewId,
): number {
	return modelId === "ensemble" ? detection.confidence : detection.modelScores[modelId];
}

function createModelScores(
	baseConfidence: number,
	tileIndex: number,
	regionIndex: number,
): Record<AnalysisModelId, number> {
	const offsets = [
		((tileIndex * 7 + regionIndex) % 9) / 100 - 0.04,
		((tileIndex * 11 + regionIndex * 3) % 13) / 100 - 0.06,
		((tileIndex * 5 + regionIndex * 2) % 15) / 100 - 0.08,
	];

	return {
		"yolo-obb": clampConfidence(baseConfidence + offsets[0]),
		rtdetr: clampConfidence(baseConfidence + offsets[1]),
		"change-vit": clampConfidence(baseConfidence + offsets[2]),
	};
}

function rotatedRectangle(
	centerX: number,
	centerY: number,
	width: number,
	height: number,
	angleDegrees: number,
): [number, number][] {
	const angle = (angleDegrees * Math.PI) / 180;
	const corners: [number, number][] = [
		[-width / 2, -height / 2],
		[width / 2, -height / 2],
		[width / 2, height / 2],
		[-width / 2, height / 2],
	];

	return corners.map(([x, y]) => [
		Number((centerX + x * Math.cos(angle) - y * Math.sin(angle)).toFixed(1)),
		Number((centerY + x * Math.sin(angle) + y * Math.cos(angle)).toFixed(1)),
	]);
}

function geographicRectangle(
	latitude: number,
	longitude: number,
	widthMeters: number,
	heightMeters: number,
	angleDegrees: number,
): [number, number][] {
	const pixelCorners = rotatedRectangle(0, 0, widthMeters, heightMeters, angleDegrees);
	const latitudeScale = 1 / 111_320;
	const longitudeScale = 1 / (111_320 * Math.cos((latitude * Math.PI) / 180));
	const polygon = pixelCorners.map(([x, y]): [number, number] => [
		longitude + x * longitudeScale,
		latitude - y * latitudeScale,
	]);

	return [...polygon, polygon[0]];
}

function average(values: number[]): number {
	return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(2));
}

function clampConfidence(value: number): number {
	return Number(Math.min(0.98, Math.max(0.51, value)).toFixed(2));
}
