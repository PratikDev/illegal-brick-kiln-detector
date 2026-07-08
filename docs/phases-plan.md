# Phased Implementation Plan

## Phase 1: Static Regions And Prediction Contract

Purpose: keep the app runnable without an external app data backend.

- Load district metadata from `seed-data/regions.json`.
- Expose typed region objects from `lib/regions.ts`.
- Keep `/predict` as the only prediction boundary.
- Serve `/predict` from the Python API in `api/predict.py`.
- Keep the Python `api/predict.py` contract compatible with the frontend parser.

Validation:

- `bun run lint`
- `bun run build`
- `GET /predict?region=brahmanbaria` returns prediction data.

## Phase 2: Map-First Prediction Review

Purpose: make the primary workflow map-based inspection.

- Render selected district on a Leaflet map.
- Manually run seeded-tile predictions.
- Render predictions as confidence-colored markers.
- Show summary stats and a detection list beside the map.
- Share selection state between markers, list rows, and the detail sheet.
- Keep upload prediction as a transient API-only flow.

Validation:

- Select every supported district and confirm map recentering.
- Run seeded tiles and confirm markers/list/summary.
- Select markers and rows and confirm the detail sheet opens.
- Upload an image and confirm results render.

## Phase 3: Detail Review Polish

Purpose: make selected detections inspectable.

- Show satellite tile evidence.
- Render OBB polygon overlays when `box` is present.
- Show confidence, class, label, coordinates, and tile source.
- Keep feedback controls out of scope until durable persistence is introduced.

Validation:

- Select detections with and without OBB data.
- Confirm fallback state for unavailable tile URLs.
- Confirm sheet is usable on mobile and desktop.

## Possible Future Phase: Durable Review State

Only add a data backend if the product needs durable state such as:

- persisted prediction runs
- user feedback counts
- review history
- audit trails
- saved exports

Until then, predictions remain transient API responses and the frontend remains
API-only.
