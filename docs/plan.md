# Illegal Brick Kiln Detector Plan

## Current Architecture

The app is a map-first review dashboard for AI-assisted illegal brick kiln
detection in Bangladesh.

Runtime pieces:

- Next.js App Router for the dashboard UI.
- Static region metadata loaded from `seed-data/regions.json` through
  `lib/regions.ts`.
- `/predict` for model responses, served by the Python API in `api/predict.py`.
- Leaflet / React Leaflet for map rendering.
- shadcn/ui components for dashboard controls, empty states, cards, lists, and
  the detection detail sheet.

No durable prediction persistence is currently used. Prediction runs are
transient and API-only.

## Prediction API Contract

```http
GET /predict?region={region_slug}
```

Success response:

```ts
type PredictResponse = {
  region: string;
  generatedAt: string;
  predictions: Array<{
    id: string;
    lat: number;
    lon: number;
    confidence: number;
    label: "kiln" | "no_kiln";
    tileUrl: string;
    className?: "CFCBK" | "FCBK" | "Zigzag";
    box?: {
      type: "obb";
      imageSize: number;
      points: [number, number][];
    };
  }>;
};
```

The UI also supports:

```http
POST /predict
```

with:

```ts
{
  region: string;
  imageDataUrl: string;
}
```

Uploads are transient and are not saved.

## Region Data

Supported districts:

- Brahmanbaria
- Jessore
- Manikganj
- Mymensingh
- Tangail

Region metadata fields:

```ts
type Region = {
  id: `local_${RegionSlug}`;
  slug: RegionSlug;
  name: string;
  centerLat: number;
  centerLon: number;
  defaultZoom: number;
  lastUpdated: number;
};
```

Source files:

- `seed-data/regions.json`
- `lib/regions.ts`

## Dashboard Behavior

- User selects a district.
- Map centers on the district immediately.
- User manually runs seeded-tile prediction.
- Returned predictions render as map markers and list rows.
- Marker/list selection opens the shadcn `Sheet` detail view.
- Detail view shows tile evidence, OBB overlay, class, label, confidence,
  coordinates, and tile source.
- User may upload a satellite crop for transient prediction.

## Validation

Use:

```bash
bun run lint
bun run build
```

Manual smoke:

1. Open `/`.
2. Select each supported district.
3. Confirm map recentering.
4. Run seeded tiles.
5. Confirm markers, summary stats, list rows, and detail sheet.
6. Upload an image and confirm transient prediction results render.
