"""In-memory geospatial compliance engine.

Loads a precomputed geolayer built by scripts/build_geolayers.py and answers
proximity questions in ~10 ms. No network calls, no rasters. shapely only.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any

import numpy as np
from shapely import transform as shapely_transform
from shapely.geometry import Point, shape
from shapely.geometry.base import BaseGeometry
from shapely.strtree import STRtree

from legal_rules import (
    RULE_KINDS,
    RULES,
    SEVERITY_WEIGHT,
    STANDING_CAVEATS,
    RuleKind,
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
GEOLAYER_DIR = Path(
    os.environ.get("KILN_GEOLAYER_DIR", PROJECT_ROOT / "model" / "geolayers")
)

M_PER_DEG_LAT = 110_574.0
BUFFER_RADIUS_M = 1000.0

# Calibrated against all 50 demo tiles, not guessed.
#
# _PRESENCE_FLOOR is the share of a violation's weight awarded for existing at
# all, with the remainder scaled by how deep inside the buffer it sits. Without
# it, pure proximity scaling ranked a kiln 11 m from a pond above one 950 m from
# a school -- backwards for triage. The Act prohibits siting "within 1 km"; it
# does not grade by metres, so presence has to carry most of the weight.
_PRESENCE_FLOOR = 0.45
_VIOLATION_SATURATION = 2.0
_EXPOSURE_SATURATION = 50_000


def _m_per_deg_lon(lat_deg: float) -> float:
    return 111_320.0 * math.cos(math.radians(lat_deg))


class _LocalProjection:
    """Equirectangular projection about a district origin: degrees -> metres.

    Keeps distance work as plain Euclidean geometry (fast, no pyproj, no GDAL).
    Measured against haversine across a full district the error stays under 0.5%,
    about 5 m on a 1000 m threshold. Re-origin per district; never reuse
    nationally.
    """

    def __init__(self, origin_lat: float, origin_lon: float) -> None:
        self._origin_lat = origin_lat
        self._origin_lon = origin_lon
        self._m_per_deg_lon = _m_per_deg_lon(origin_lat)

    def point(self, lat: float, lon: float) -> Point:
        return Point(
            (lon - self._origin_lon) * self._m_per_deg_lon,
            (lat - self._origin_lat) * M_PER_DEG_LAT,
        )

    def geometry(self, geometry: BaseGeometry) -> BaseGeometry:
        # shapely.transform hands the callable an (N, 2) array of [x, y] pairs,
        # i.e. [lon, lat], and expects (N, 2) back. Unambiguous about order,
        # unlike shapely.ops.transform. LNGLAT.
        return shapely_transform(
            geometry,
            lambda coords: np.column_stack(
                [
                    (coords[:, 0] - self._origin_lon) * self._m_per_deg_lon,
                    (coords[:, 1] - self._origin_lat) * M_PER_DEG_LAT,
                ]
            ),
        )


class ComplianceEngine:
    def __init__(self, payload: dict[str, Any]) -> None:
        self.district: str = payload["district"]
        self.sources: list[dict[str, str]] = payload.get("sources", [])
        self._population: dict[str, Any] | None = payload.get("population")
        self._projection = _LocalProjection(
            float(payload["origin"]["lat"]), float(payload["origin"]["lng"])
        )

        self._geometries: dict[RuleKind, list[BaseGeometry]] = {}
        self._features: dict[RuleKind, list[dict[str, Any]]] = {}
        self._trees: dict[RuleKind, STRtree | None] = {}

        buckets: dict[RuleKind, list[dict[str, Any]]] = {k: [] for k in RULE_KINDS}
        for feature in payload.get("features", []):
            kind = feature.get("kind")
            if kind in buckets:
                buckets[kind].append(feature)

        for kind, features in buckets.items():
            geometries: list[BaseGeometry] = []
            kept: list[dict[str, Any]] = []
            for feature in features:
                geometry = self._prepare(feature)
                if geometry is None:
                    continue
                geometries.append(geometry)
                kept.append(feature)
            self._geometries[kind] = geometries
            self._features[kind] = kept
            self._trees[kind] = STRtree(geometries) if geometries else None

    def _prepare(self, feature: dict[str, Any]) -> BaseGeometry | None:
        try:
            geometry = self._projection.geometry(shape(feature["geometry"]))
        except Exception:
            return None
        if geometry.is_empty:
            return None
        if not geometry.is_valid:
            geometry = geometry.buffer(0)  # repair self-intersecting OSM rings
            if geometry.is_empty:
                return None
        return geometry

    def population_within(
        self, lat: float, lon: float, radius_m: float = BUFFER_RADIUS_M
    ) -> int | None:
        grid = self._population
        if not grid:
            return None

        cell = float(grid["cellSizeDeg"])
        d_lat = radius_m / M_PER_DEG_LAT
        d_lon = radius_m / _m_per_deg_lon(lat)
        rows = int(grid["rows"])
        cols = int(grid["cols"])
        origin_lat = float(grid["originLat"])
        origin_lon = float(grid["originLng"])

        # Row 0 is the NORTH edge; the index grows southward.
        first_row = max(0, int((origin_lat - (lat + d_lat)) / cell))
        last_row = min(rows - 1, int((origin_lat - (lat - d_lat)) / cell))
        first_col = max(0, int(((lon - d_lon) - origin_lon) / cell))
        last_col = min(cols - 1, int(((lon + d_lon) - origin_lon) / cell))

        total = 0
        m_per_lon = _m_per_deg_lon(lat)
        for row in range(first_row, last_row + 1):
            cell_lat = origin_lat - (row + 0.5) * cell
            dy = (cell_lat - lat) * M_PER_DEG_LAT
            for col in range(first_col, last_col + 1):
                cell_lon = origin_lon + (col + 0.5) * cell
                dx = (cell_lon - lon) * m_per_lon
                if dx * dx + dy * dy <= radius_m * radius_m:
                    total += int(grid["values"][row * cols + col])
        return int(round(total, -2))  # an estimate; round to 100 and say so

    def _nearest(
        self, kind: RuleKind, point: Point, max_distance_m: float
    ) -> tuple[dict[str, Any], float] | None:
        tree = self._trees.get(kind)
        if tree is None:
            return None

        # STRtree.query is a bounding-box filter, so it returns a superset.
        # shapely 2.x yields INDICES (1.8 yielded geometries): requires >=2.0.
        candidates = tree.query(point.buffer(max_distance_m))
        best_index: int | None = None
        best_distance: float | None = None
        for index in candidates:
            distance = point.distance(self._geometries[kind][int(index)])
            if best_distance is None or distance < best_distance:
                best_index, best_distance = int(index), distance

        if best_index is None or best_distance is None or best_distance > max_distance_m:
            return None
        return self._features[kind][best_index], best_distance

    @staticmethod
    def _feature_lat_lon(feature: dict[str, Any]) -> list[float]:
        point = shape(feature["geometry"]).representative_point()
        return [point.y, point.x]  # LNGLAT -> [lat, lon] for Leaflet

    def evaluate(self, lat: float, lon: float, confidence: float) -> dict[str, Any]:
        point = self._projection.point(lat, lon)
        violations: list[dict[str, Any]] = []

        for kind in RULE_KINDS:
            rule = RULES[kind]
            found = self._nearest(kind, point, float(rule["threshold_m"]))
            if found is None:
                continue
            feature, distance = found
            violations.append(
                {
                    "rule": kind,
                    "label": rule["label"],
                    "featureName": feature.get("name"),
                    "featureId": feature["id"],
                    "featureLatLon": self._feature_lat_lon(feature),
                    "distanceM": int(round(distance)),
                    "thresholdM": rule["threshold_m"],
                    "severity": rule["severity"],
                    "legalRef": rule["legal_ref"],
                    "legalRefVerified": rule["verified"],
                }
            )

        violations.sort(key=lambda v: (v["severity"] != "high", v["distanceM"]))
        population = self.population_within(lat, lon)
        score = _priority_score(violations, population, confidence)

        if any(v["severity"] == "high" for v in violations):
            verdict = "likely_non_compliant"
        elif violations:
            verdict = "review_required"
        else:
            verdict = "no_flag"  # NOT "compliant" -- see caveats

        return {
            "verdict": verdict,
            "violations": violations,
            "populationWithin1km": population,
            "priorityScore": score,
            "priorityBand": "high" if score >= 65 else "medium" if score >= 35 else "low",
            "layersUsed": [k for k in RULE_KINDS if self._geometries.get(k)],
            "sources": self.sources,
            "caveats": list(STANDING_CAVEATS),
        }


def _priority_score(
    violations: list[dict[str, Any]], population: int | None, confidence: float
) -> int:
    """0-100 triage score. Heuristic, documented, tunable. Not a legal finding.

    50% violation pressure (severity x depth inside the buffer)
    30% population exposure (log-scaled)
    20% model confidence

    When population is unavailable its weight is redistributed proportionally so
    districts without a raster are not silently penalised.
    """
    if violations:
        raw = 0.0
        for violation in violations:
            proximity = 1 - violation["distanceM"] / violation["thresholdM"]
            depth = _PRESENCE_FLOOR + (1 - _PRESENCE_FLOOR) * proximity
            raw += SEVERITY_WEIGHT[violation["rule"]] * depth
        violation_term = min(raw / _VIOLATION_SATURATION, 1.0)
    else:
        violation_term = 0.0

    if population is None:
        score = (0.50 * violation_term + 0.20 * confidence) / 0.70
    else:
        exposure = min(math.log1p(population) / math.log1p(_EXPOSURE_SATURATION), 1.0)
        score = 0.50 * violation_term + 0.30 * exposure + 0.20 * confidence

    return int(round(100 * max(0.0, min(score, 1.0))))


_ENGINES: dict[str, ComplianceEngine | None] = {}


def get_engine(district: str) -> ComplianceEngine | None:
    """Cached per warm lambda. Returns None when a district has no geolayer."""
    key = (district or "").lower()
    if key in _ENGINES:
        return _ENGINES[key]

    path = GEOLAYER_DIR / f"{key}.json"
    if not path.exists():
        _ENGINES[key] = None
        return None

    _ENGINES[key] = ComplianceEngine(json.loads(path.read_text()))
    return _ENGINES[key]