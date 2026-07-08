const regions = {
	brahmanbaria: { lat: 23.9571, lon: 91.1119 },
	jessore: { lat: 23.1634, lon: 89.2182 },
	manikganj: { lat: 23.8617, lon: 90.0003 },
	tangail: { lat: 24.2513, lon: 89.9167 },
	mymensingh: { lat: 24.7471, lon: 90.4203 },
} as const;

type RegionSlug = keyof typeof regions;

const offsets = [
	[0.0024, -0.0032, 0.93, "CFCBK"],
	[-0.0041, 0.0028, 0.86, "FCBK"],
	[0.0063, 0.0019, 0.74, "Zigzag"],
	[-0.0018, -0.0061, 0.62, "CFCBK"],
	[0.0055, -0.0047, 0.49, "FCBK"],
	[-0.0069, 0.0062, 0.38, "Zigzag"],
] as const;

export async function GET(request: Request) {
	const region = new URL(request.url).searchParams.get("region");

	if (!region || !isRegionSlug(region)) {
		return Response.json(
			{ error: "unsupported_region", supportedRegions: Object.keys(regions) },
			{ status: 400 },
		);
	}

	return Response.json(createResponse(region));
}

export async function POST(request: Request) {
	const body: unknown = await request.json().catch(() => null);
	const region =
		body && typeof body === "object" && "region" in body
			? String(body.region)
			: "";

	if (!isRegionSlug(region)) {
		return Response.json(
			{ error: "unsupported_region", supportedRegions: Object.keys(regions) },
			{ status: 400 },
		);
	}

	return Response.json(createResponse(region, true));
}

function createResponse(region: RegionSlug, isUpload = false) {
	const center = regions[region];

	return {
		region,
		generatedAt: new Date().toISOString(),
		predictions: offsets.map(([latOffset, lonOffset, confidence, className], index) => {
			const id = `${region}_${isUpload ? "upload" : "seeded"}_${String(index + 1).padStart(2, "0")}`;

			return {
				id,
				lat: round(center.lat + latOffset),
				lon: round(center.lon + lonOffset),
				confidence,
				label: "kiln",
				tileUrl: `/demo-tiles/${region}_demo_tile_${String((index % 10) + 1).padStart(2, "0")}.png`,
				className,
				box: {
					type: "obb",
					imageSize: 256,
					points: [
						[72, 76],
						[178, 62],
						[190, 168],
						[84, 182],
					],
				},
			};
		}),
	};
}

function isRegionSlug(value: string): value is RegionSlug {
	return value in regions;
}

function round(value: number): number {
	return Number(value.toFixed(6));
}
