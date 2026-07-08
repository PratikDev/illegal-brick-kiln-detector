"use client";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";

import type { Prediction } from "@/lib/prediction-api";
import type { Region } from "@/lib/regions";
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
	const center: [number, number] = [region.centerLat, region.centerLon];

	return (
		<MapContainer
			center={center}
			zoom={region.defaultZoom}
			scrollWheelZoom
			className="kiln-map"
			zoomControl
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			<RecenterMap center={center} zoom={region.defaultZoom} />
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
