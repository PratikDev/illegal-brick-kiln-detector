export const ANALYSIS_MODEL_IDS = ["yolo-obb", "rtdetr", "change-vit"] as const;

export type AnalysisModelId = (typeof ANALYSIS_MODEL_IDS)[number];
export type AnalysisViewId = AnalysisModelId | "ensemble";

export type AnalysisModel = {
	id: AnalysisModelId;
	shortName: string;
	name: string;
	role: string;
	status: "Replayed";
};

export const ANALYSIS_MODELS: AnalysisModel[] = [
	{
		id: "yolo-obb",
		shortName: "OBB",
		name: "YOLO11-OBB",
		role: "Rotated kiln localization",
		status: "Replayed",
	},
	{
		id: "rtdetr",
		shortName: "DETR",
		name: "RT-DETR validator",
		role: "Independent object validation",
		status: "Replayed",
	},
	{
		id: "change-vit",
		shortName: "ViT",
		name: "ViT context reviewer",
		role: "Scene-level kiln context",
		status: "Replayed",
	},
];

export function getModelLabel(modelId: AnalysisViewId): string {
	if (modelId === "ensemble") {
		return "Ensemble";
	}

	return ANALYSIS_MODELS.find(({ id }) => id === modelId)?.name ?? modelId;
}
