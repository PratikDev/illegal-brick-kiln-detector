"use client";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";

import type { Prediction } from "@/lib/prediction-api";
import type { Region } from "@/lib/regions";
import { BufferOverlay } from "./BufferOverlay";
import { FocusSelection } from "./FocusSelection";
import { getPredictionMarkerClassName } from "./prediction-marker-style";
import { RecenterMap } from "./RecenterMap";

type KilnMapProps = {
	region: Region;
	predictions: Prediction[];
	selectedPredictionId: string | null;
	onSelectPrediction: (prediction: Prediction) => void;
};

export function KilnMap({
	region,
	predictions,
	selectedPredictionId,
	onSelectPrediction,
}: KilnMapProps) {
	// Only the selected detection gets a buffer ring. All of them at once is
	// noise, not insight.
	const selected = predictions.find(
		({ id }) => id === selectedPredictionId,
	);

	return (
		<MapContainer
			center={[region.centerLat, region.centerLon]}
			zoom={region.defaultZoom}
			scrollWheelZoom
			className="kiln-map"
			zoomControl
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			<RecenterMap
				lat={region.centerLat}
				lon={region.centerLon}
				zoom={region.defaultZoom}
			/>
			<FocusSelection
				lat={selected?.lat ?? null}
				lon={selected?.lon ?? null}
			/>
			{selected ? (
				<BufferOverlay
					kiln={[selected.lat, selected.lon]}
					compliance={selected.compliance}
				/>
			) : null}
			{predictions.map((prediction) => {
				const isSelected = prediction.id === selectedPredictionId;

				return (
					<CircleMarker
						key={prediction.id}
						center={[prediction.lat, prediction.lon]}
						radius={isSelected ? 9 : 6}
						pathOptions={{
							className: getPredictionMarkerClassName(prediction, isSelected),
							opacity: isSelected ? 1 : 0.85,
							fillOpacity: isSelected ? 0.42 : 0.28,
							weight: isSelected ? 3 : 2,
						}}
						eventHandlers={{
							click: () => onSelectPrediction(prediction),
						}}
					/>
				);
			})}
		</MapContainer>
	);
}
