"use client";

import * as React from "react";
import { useMap } from "react-leaflet";

type RecenterMapProps = {
	center: [number, number];
	zoom: number;
};

export function RecenterMap({ center, zoom }: RecenterMapProps) {
	const map = useMap();

	React.useEffect(() => {
		map.setView(center, zoom);
	}, [center, map, zoom]);

	return null;
}
