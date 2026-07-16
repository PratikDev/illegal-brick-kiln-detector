import seedRegions from "@/seed-data/regions.json";

export const REGION_SLUGS = [
	"brahmanbaria",
	"jessore",
	"manikganj",
	"tangail",
	"mymensingh",
] as const;

export type RegionSlug = (typeof REGION_SLUGS)[number];
/** Demo lands here: richest OSM coverage (194 schools) of the five. */
export const DEFAULT_REGION_SLUG: RegionSlug = "tangail";
export type RegionId = `local_${RegionSlug}`;

export type Region = {
	id: RegionId;
	slug: RegionSlug;
	name: string;
	centerLat: number;
	centerLon: number;
	defaultZoom: number;
	lastUpdated: number;
};

type SeedRegion = {
	slug: string;
	name: string;
	centerLat: number;
	centerLon: number;
	defaultZoom: number;
	lastUpdated: number;
};

const regionSlugs = new Set<string>(REGION_SLUGS);

export const SUPPORTED_REGIONS: Region[] = (seedRegions as SeedRegion[])
	.map(toRegion)
	.toSorted((a, b) => a.name.localeCompare(b.name));

function toRegion(region: SeedRegion): Region {
	if (!isRegionSlug(region.slug)) {
		throw new Error(`Unsupported region slug: ${region.slug}`);
	}

	return {
		id: `local_${region.slug}`,
		slug: region.slug,
		name: region.name,
		centerLat: region.centerLat,
		centerLon: region.centerLon,
		defaultZoom: region.defaultZoom,
		lastUpdated: region.lastUpdated,
	};
}

function isRegionSlug(value: string): value is RegionSlug {
	return regionSlugs.has(value);
}
