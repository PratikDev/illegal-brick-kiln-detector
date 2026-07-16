"""Offline geolayer builder. Run once, commit the output. NOT deployed.

Vercel excludes `scripts/**` from the function bundle, so nothing here ships.

Usage:
    python scripts/build_geolayers.py                  # all regions
    python scripts/build_geolayers.py tangail          # one region
    python scripts/build_geolayers.py --dry-run        # print bboxes, no network
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REGIONS_PATH = PROJECT_ROOT / "seed-data" / "regions.json"
MANIFEST_PATH = PROJECT_ROOT / "model" / "tiles.json"
OUT_DIR = PROJECT_ROOT / "model" / "geolayers"
# Overpass rejects the default "Python-urllib/x.y" User-Agent with HTTP 406, and
# the OSM usage policy asks callers to identify themselves. Override with the
# OVERPASS_URL env var to force a single endpoint.
OVERPASS_MIRRORS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.osm.jp/api/interpreter",
)
USER_AGENT = (
    "illegal-brick-kiln-detector/1.0 "
    "(SciBlitz 2026 research; https://github.com/PratikDev/illegal-brick-kiln-detector)"
)

# Detections land within centerLat +/- latDelta/2 of a tile, and compliance looks
# 1 km beyond that. 1500 m of padding covers the buffer plus margin.
PAD_METERS = 1500.0
M_PER_DEG_LAT = 110_574.0

OSM_SELECTORS: list[tuple[str, str, str]] = [
    ("amenity", "school", "school"),
    ("amenity", "college", "school"),
    ("amenity", "university", "school"),
    ("amenity", "kindergarten", "school"),
    ("amenity", "hospital", "healthcare"),
    ("amenity", "clinic", "healthcare"),
    ("amenity", "doctors", "healthcare"),
    ("waterway", "river", "waterbody"),
    ("waterway", "canal", "waterbody"),
    ("natural", "water", "waterbody"),
    ("landuse", "residential", "residential"),
    ("place", "town", "residential"),
    ("place", "village", "residential"),
    ("landuse", "forest", "forest"),
    ("natural", "wood", "forest"),
    ("landuse", "farmland", "agricultural"),
    ("landuse", "orchard", "agricultural"),
    ("railway", "rail", "railway"),
]


def _m_per_deg_lon(lat_deg: float) -> float:
    return 111_320.0 * math.cos(math.radians(lat_deg))


def load_region_bboxes() -> dict[str, dict[str, Any]]:
    """Derive each region bbox from the REAL tile extents in model/tiles.json."""
    regions = {r["slug"]: r for r in json.loads(REGIONS_PATH.read_text())}
    manifest = json.loads(MANIFEST_PATH.read_text())
    manifest = manifest.get("regions", manifest)

    out: dict[str, dict[str, Any]] = {}
    for slug, tiles in manifest.items():
        if slug not in regions or not tiles:
            continue
        lats = [float(t["centerLat"]) for t in tiles]
        lons = [float(t["centerLon"]) for t in tiles]
        half_lat = max(float(t.get("latDelta", 0.0128)) for t in tiles) / 2
        half_lon = max(float(t.get("lonDelta", 0.0128)) for t in tiles) / 2
        mid_lat = (min(lats) + max(lats)) / 2

        pad_lat = PAD_METERS / M_PER_DEG_LAT
        pad_lon = PAD_METERS / _m_per_deg_lon(mid_lat)

        bbox = [
            min(lats) - half_lat - pad_lat,   # south
            min(lons) - half_lon - pad_lon,   # west
            max(lats) + half_lat + pad_lat,   # north
            max(lons) + half_lon + pad_lon,   # east
        ]
        out[slug] = {
            "bbox": [round(v, 6) for v in bbox],
            # Projection origin = bbox centre, NOT the region marker centre.
            # It is written into the JSON so the runtime can never disagree.
            "origin": {
                "lat": round((bbox[0] + bbox[2]) / 2, 6),
                "lng": round((bbox[1] + bbox[3]) / 2, 6),
            },
            "tileCount": len(tiles),
        }
    return out


def build_query(bbox: list[float]) -> str:
    south, west, north, east = bbox
    box = f"({south},{west},{north},{east})"
    body = "\n  ".join(f'nwr["{k}"="{v}"]{box};' for k, v, _ in OSM_SELECTORS)
    return f"[out:json][timeout:180];\n(\n  {body}\n);\nout geom;"


def kind_for(tags: dict[str, str]) -> str | None:
    for key, value, kind in OSM_SELECTORS:
        if tags.get(key) == value:
            return kind
    return None


def element_to_geometry(element: dict[str, Any]) -> dict[str, Any] | None:
    """Overpass `out geom;` -> GeoJSON. Coordinates are [lon, lat]. LNGLAT."""
    kind = element["type"]

    if kind == "node":
        return {"type": "Point", "coordinates": [element["lon"], element["lat"]]}

    if kind == "way":
        geometry = element.get("geometry")
        if not geometry or len(geometry) < 2:
            return None
        coords = [[p["lon"], p["lat"]] for p in geometry]
        closed = len(coords) >= 4 and coords[0] == coords[-1]
        if closed:
            return {"type": "Polygon", "coordinates": [coords]}
        return {"type": "LineString", "coordinates": coords}

    if kind == "relation":
        # Outer rings only. Enough for a 1 km proximity test; noted as a limitation.
        rings = []
        for member in element.get("members", []):
            if member.get("role") != "outer" or not member.get("geometry"):
                continue
            pts = [[p["lon"], p["lat"]] for p in member["geometry"]]
            if len(pts) >= 4 and pts[0] == pts[-1]:
                rings.append([pts])
        return {"type": "MultiPolygon", "coordinates": rings} if rings else None

    return None


def fetch_features(bbox: list[float]) -> list[dict[str, Any]]:
    import urllib.error
    import urllib.parse
    import urllib.request

    query = build_query(bbox)
    payload = urllib.parse.urlencode({"data": query}).encode()
    forced = os.environ.get("OVERPASS_URL")
    mirrors = (forced,) if forced else OVERPASS_MIRRORS

    raw: dict[str, Any] | None = None
    for mirror in mirrors:
        for attempt in range(1, 4):
            try:
                request = urllib.request.Request(
                    mirror,
                    data=payload,
                    headers={
                        "User-Agent": USER_AGENT,
                        "Accept": "application/json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                )
                with urllib.request.urlopen(request, timeout=300) as response:
                    raw = json.loads(response.read().decode("utf-8"))
                break
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", "replace").strip()[:200]
                print(f"  {_host(mirror)} attempt {attempt}: HTTP {exc.code} {detail}")
            except (urllib.error.URLError, TimeoutError) as exc:
                print(f"  {_host(mirror)} attempt {attempt}: {exc}")
            if attempt < 3:
                time.sleep(20)
        if raw is not None:
            break
        print(f"  {_host(mirror)} exhausted; trying next mirror")

    if raw is None:
        raise RuntimeError(
            "Every Overpass mirror failed. Check your connection, or pin one with:\n"
            "  OVERPASS_URL=https://overpass.kumi.systems/api/interpreter "
            "python scripts/build_geolayers.py"
        )

    if "remark" in raw:
        print(f"  overpass remark: {raw['remark']}")

    features: list[dict[str, Any]] = []
    seen: set[str] = set()
    for element in raw.get("elements", []):
        tags = element.get("tags") or {}
        kind = kind_for(tags)
        if kind is None:
            continue
        geometry = element_to_geometry(element)
        if geometry is None:
            continue
        feature_id = f"osm:{element['type']}/{element['id']}"
        if feature_id in seen:
            continue
        seen.add(feature_id)
        features.append(
            {
                "id": feature_id,
                "kind": kind,
                "name": tags.get("name") or tags.get("name:en"),
                "geometry": geometry,
            }
        )
    return features


def _host(url: str) -> str:
    import urllib.parse

    return urllib.parse.urlparse(url).netloc


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry_run = "--dry-run" in sys.argv
    bboxes = load_region_bboxes()
    targets = args or sorted(bboxes)

    if dry_run:
        for slug in targets:
            info = bboxes[slug]
            s, w, n, e = info["bbox"]
            km_h = (n - s) * M_PER_DEG_LAT / 1000
            km_w = (e - w) * _m_per_deg_lon(info["origin"]["lat"]) / 1000
            print(
                f"{slug:14} {info['tileCount']:2d} tiles | bbox {s:.4f},{w:.4f},{n:.4f},{e:.4f}"
                f" | {km_w:.1f} x {km_h:.1f} km | origin {info['origin']['lat']},{info['origin']['lng']}"
            )
        return

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for slug in targets:
        info = bboxes[slug]
        print(f"-> {slug}")
        features = fetch_features(info["bbox"])
        counts: dict[str, int] = {}
        for f in features:
            counts[f["kind"]] = counts.get(f["kind"], 0) + 1
        print(f"   {len(features)} features {counts}")

        payload = {
            "district": slug,
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "bbox": info["bbox"],
            "origin": info["origin"],
            "sources": [
                {
                    "name": "OpenStreetMap contributors",
                    "license": "ODbL 1.0",
                    "url": "https://www.openstreetmap.org/copyright",
                }
            ],
            "features": features,
            "population": None,
        }
        path = OUT_DIR / f"{slug}.json"
        path.write_text(json.dumps(payload, separators=(",", ":")))
        print(f"   wrote {path.relative_to(PROJECT_ROOT)} ({path.stat().st_size / 1024:.0f} KB)\n")
        time.sleep(5)


if __name__ == "__main__":
    main()