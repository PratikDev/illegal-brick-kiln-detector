"use client";

import { Fragment } from "react";
import { Circle, CircleMarker, Polyline, Tooltip } from "react-leaflet";

import { formatDistance, type ComplianceResult } from "@/lib/compliance";
import { cn } from "@/lib/utils";

const BUFFER_RADIUS_METERS = 1000;

type BufferOverlayProps = {
	kiln: [number, number];
	compliance?: ComplianceResult;
};

export function BufferOverlay({ kiln, compliance }: BufferOverlayProps) {
	if (!compliance) {
		return null;
	}

	const breached = compliance.violations.length > 0;

	return (
		<>
			{/* Leaflet radius is in metres, so this is a true 1 km statutory buffer. */}
			<Circle
				center={kiln}
				radius={BUFFER_RADIUS_METERS}
				pathOptions={{
					className: cn(
						"kiln-map-buffer",
						breached && "kiln-map-buffer-flagged",
					),
					weight: 1.5,
					opacity: 0.7,
					fillOpacity: breached ? 1 : 0,
					dashArray: "4 4",
					interactive: false,
				}}
			/>

			{compliance.violations.map((violation) => {
				const className = `kiln-map-violation-${violation.severity}`;

				return (
					<Fragment key={violation.featureId}>
						<Polyline
							positions={[kiln, violation.featureLatLon]}
							pathOptions={{ className, weight: 2, opacity: 0.9 }}
						>
							<Tooltip permanent direction="center">
								{formatDistance(violation.distanceM)}
							</Tooltip>
						</Polyline>

						<CircleMarker
							center={violation.featureLatLon}
							radius={5}
							pathOptions={{ className, weight: 2, fillOpacity: 1 }}
						>
							<Tooltip>{violation.featureName ?? violation.label}</Tooltip>
						</CircleMarker>
					</Fragment>
				);
			})}
		</>
	);
}
