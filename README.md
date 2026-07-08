# Illegal Brick Kiln Detector

Dashboard for AI-assisted illegal brick kiln detection in Bangladesh. The app uses:

- Next.js App Router for the UI
- Local static region metadata from `seed-data/regions.json`
- A Python `/predict` endpoint with a LiteRT YOLO OBB model for prediction
- Bundled demo SentinelKilnDB tiles in `public/demo-tiles/`

## Prerequisites

- Bun
- Python support for local model/API runs

Install dependencies:

```bash
bun install
```

## Local Development

Start the Python prediction API:

```bash
KILN_CONFIDENCE_THRESHOLD=0.01 PORT=8765 \
  python api/predict.py
```

If your system Python does not have the runtime dependencies installed, use the
same Python environment used for LiteRT export, or install:

```bash
python -m pip install -r requirements.txt
```

Start Next.js in another terminal:

```bash
bun run dev
```

Open:

```txt
http://localhost:3000
```

## Using The UI

1. Select one of the five districts.
2. Click `Run seeded tiles`.
3. Click a map marker or detection row to inspect the satellite tile and OBB overlay.
4. Use `Upload image` to run transient prediction on a local image.

Uploads are processed in memory and are not saved.

## Region Data

Supported district metadata lives in:

```txt
seed-data/regions.json
```

The app exposes that data through `lib/regions.ts`.

## Production Deployment

Deploy the Next/Vercel app normally.

No `KILN_TILE_MANIFEST_URL` is required for the bundled demo. The Python
prediction API reads `model/tiles.json`, which points to preseeded images in
`public/demo-tiles/`.

## Useful Commands

```bash
bun run lint
bun run build
```

Test the Python prediction API locally:

```bash
curl -sS "http://127.0.0.1:8765/predict?region=brahmanbaria&confidence=0.01"
```

## Model Notes

- `model/best.tflite` is the deployed LiteRT model.
- `model/tiles.json` lists bundled demo tile images for all five supported
  districts.
- `model/best.pt` and the training notebook are local training artifacts and are
  not required for the deployed demo path.
