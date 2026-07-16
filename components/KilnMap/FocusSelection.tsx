"use client";

import * as React from "react";
import { useMap } from "react-leaflet";

/**
 * A 1 km buffer is only ~29 px across at the region default zoom of 11, and
 * ~230 px at 14. Selecting a detection has to close that gap or the statutory
 * ring is invisible.
 */
const FOCUS_ZOOM = 14;

type FocusSelectionProps = {
	lat: number | null;
	lon: number | null;
};

export function FocusSelection({ lat, lon }: FocusSelectionProps) {
	const map = useMap();

	React.useEffect(() => {
		if (lat === null || lon === null) {
			return;
		}

		map.flyTo([lat, lon], Math.max(map.getZoom(), FOCUS_ZOOM), {
			duration: 0.6,
		});
	}, [lat, lon, map]);

	return null;
}
