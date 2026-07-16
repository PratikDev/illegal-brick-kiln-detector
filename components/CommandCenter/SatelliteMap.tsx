"use client";

import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import * as React from "react";

import { getDetectionConfidence, type DemoDetection } from "@/lib/demo-data";
import type { AnalysisViewId } from "@/lib/demo-models";
import { SUPPORTED_REGIONS, type RegionSlug } from "@/lib/regions";
import type { JudgeStage } from "./use-command-scan";

type SatelliteMapProps = {
	detections: DemoDetection[];
	selectedDetectionId: string | null;
	activeModel: AnalysisViewId;
	selectedRegion: RegionSlug | "all";
	judgeStage: JudgeStage | null;
	onSelectDetection: (detection: DemoDetection) => void;
};

const SATELLITE_TILES =
	"https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg";

export function SatelliteMap({
	detections,
	selectedDetectionId,
	activeModel,
	selectedRegion,
	judgeStage,
	onSelectDetection,
}: SatelliteMapProps) {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const mapRef = React.useRef<MapLibreMap | null>(null);
	const detectionsRef = React.useRef(detections);
	const activeModelRef = React.useRef(activeModel);
	const onSelectDetectionRef = React.useRef(onSelectDetection);

	React.useEffect(() => {
		detectionsRef.current = detections;
	}, [detections]);

	React.useEffect(() => {
		activeModelRef.current = activeModel;
	}, [activeModel]);

	React.useEffect(() => {
		onSelectDetectionRef.current = onSelectDetection;
	}, [onSelectDetection]);

	React.useEffect(() => {
		if (!containerRef.current || mapRef.current) {
			return;
		}

		const map = new maplibregl.Map({
			container: containerRef.current,
			center: [90.3563, 23.685],
			zoom: 6.35,
			pitch: 34,
			bearing: -7,
			attributionControl: false,
			style: {
				version: 8,
				sources: {
					satellite: {
						type: "raster",
						tiles: [SATELLITE_TILES],
						tileSize: 256,
						attribution:
							'EOxCloudless © EOX IT Services GmbH · Contains modified Copernicus Sentinel data 2024',
					},
				},
				layers: [{ id: "satellite", type: "raster", source: "satellite" }],
			},
		});

		map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
		map.addControl(
			new maplibregl.AttributionControl({ compact: true }),
			"bottom-right",
		);

		const resizeObserver = new ResizeObserver(() => map.resize());
		resizeObserver.observe(containerRef.current);

		map.on("load", () => {
			map.addSource("detections", {
				type: "geojson",
				data: toPointFeatureCollection(detectionsRef.current, null, activeModelRef.current),
			});
			map.addSource("detection-polygons", {
				type: "geojson",
				data: toPolygonFeatureCollection(detectionsRef.current, null, activeModelRef.current),
			});
			map.addLayer({
				id: "detection-polygons-fill",
				type: "fill",
				source: "detection-polygons",
				paint: {
					"fill-color": [
						"case",
						[">=", ["get", "confidence"], 0.85],
						"#ff4d2e",
						[">=", ["get", "confidence"], 0.68],
						"#ffb020",
						"#d7f45b",
					],
					"fill-opacity": ["case", ["get", "selected"], 0.34, 0.16],
				},
			});
			map.addLayer({
				id: "detection-polygons-line",
				type: "line",
				source: "detection-polygons",
				paint: {
					"line-color": "#fffaf1",
					"line-width": ["case", ["get", "selected"], 3, 1.4],
					"line-opacity": 0.92,
				},
			});
			map.addLayer({
				id: "detection-halo",
				type: "circle",
				source: "detections",
				paint: {
					"circle-radius": ["case", ["get", "selected"], 18, 12],
					"circle-color": "#ff4d2e",
					"circle-opacity": ["case", ["get", "selected"], 0.3, 0.14],
					"circle-blur": 0.35,
				},
			});
			map.addLayer({
				id: "detections",
				type: "circle",
				source: "detections",
				paint: {
					"circle-radius": ["case", ["get", "selected"], 7, 5],
					"circle-color": [
						"case",
						[">=", ["get", "confidence"], 0.85],
						"#ff4d2e",
						[">=", ["get", "confidence"], 0.68],
						"#ffb020",
						"#d7f45b",
					],
					"circle-stroke-width": 1.5,
					"circle-stroke-color": "#fffaf1",
				},
			});
			map.on("click", "detections", (event) => {
				const id = event.features?.[0]?.properties?.id;
				const detection = detectionsRef.current.find((item) => item.id === id);
				if (detection) {
					onSelectDetectionRef.current(detection);
				}
			});
			map.on("mouseenter", "detections", () => {
				map.getCanvas().style.cursor = "pointer";
			});
			map.on("mouseleave", "detections", () => {
				map.getCanvas().style.cursor = "";
			});
		});

		mapRef.current = map;
		return () => {
			resizeObserver.disconnect();
			map.remove();
			mapRef.current = null;
		};
	}, []);

	React.useEffect(() => {
		const pointSource = mapRef.current?.getSource("detections") as GeoJSONSource | undefined;
		const polygonSource = mapRef.current?.getSource("detection-polygons") as GeoJSONSource | undefined;
		pointSource?.setData(toPointFeatureCollection(detections, selectedDetectionId, activeModel));
		polygonSource?.setData(toPolygonFeatureCollection(detections, selectedDetectionId, activeModel));
	}, [activeModel, detections, selectedDetectionId]);

	React.useEffect(() => {
		const selected = detections.find(({ id }) => id === selectedDetectionId);
		if (selected) {
			mapRef.current?.flyTo({ center: [selected.lon, selected.lat], zoom: 13.2, pitch: 48 });
		}
	}, [detections, selectedDetectionId]);

	React.useEffect(() => {
		if (selectedDetectionId) {
			return;
		}

		if (selectedRegion === "all") {
			mapRef.current?.flyTo({ center: [90.3563, 23.685], zoom: 6.35, pitch: 34, bearing: -7 });
			return;
		}

		const region = SUPPORTED_REGIONS.find(({ slug }) => slug === selectedRegion);
		if (region) {
			mapRef.current?.flyTo({
				center: [region.centerLon, region.centerLat],
				zoom: Math.max(9, region.defaultZoom),
				pitch: 42,
			});
		}
	}, [selectedDetectionId, selectedRegion]);

	React.useEffect(() => {
		if (judgeStage === "overview" || judgeStage === "scan") {
			mapRef.current?.flyTo({ center: [90.3563, 23.685], zoom: 6.35, pitch: 34, bearing: -7 });
		}
	}, [judgeStage]);

	return <div ref={containerRef} className="satellite-map" aria-label="Sentinel-2 kiln detection map" />;
}

function toPointFeatureCollection(
	detections: DemoDetection[],
	selectedId: string | null,
	activeModel: AnalysisViewId,
): GeoJSON.FeatureCollection {
	return {
		type: "FeatureCollection",
		features: detections.map((detection) => ({
			type: "Feature",
			geometry: { type: "Point", coordinates: [detection.lon, detection.lat] },
			properties: {
				id: detection.id,
				confidence: getDetectionConfidence(detection, activeModel),
				selected: detection.id === selectedId,
			},
		})),
	};
}

function toPolygonFeatureCollection(
	detections: DemoDetection[],
	selectedId: string | null,
	activeModel: AnalysisViewId,
): GeoJSON.FeatureCollection {
	return {
		type: "FeatureCollection",
		features: detections.map((detection) => ({
			type: "Feature",
			geometry: { type: "Polygon", coordinates: [detection.mapPolygon] },
			properties: {
				id: detection.id,
				confidence: getDetectionConfidence(detection, activeModel),
				selected: detection.id === selectedId,
			},
		})),
	};
}
