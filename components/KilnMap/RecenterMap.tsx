"use client";

import * as React from "react";
import { useMap } from "react-leaflet";

type RecenterMapProps = {
	lat: number;
	lon: number;
	zoom: number;
};

/**
 * Resets the view when the region changes. Takes primitives, not a tuple: an
 * array prop is a fresh reference on every parent render, which re-fired this
 * effect and snapped the map back to the region centre whenever a detection was
 * selected.
 */
export function RecenterMap({ lat, lon, zoom }: RecenterMapProps) {
	const map = useMap();

	React.useEffect(() => {
		map.setView([lat, lon], zoom);
	}, [lat, lon, map, zoom]);

	return null;
}
