"""Rank every demo tile centre by compliance priority. No model needed."""
import json, sys
sys.path.insert(0, "api")
from compliance import get_engine

manifest = json.load(open("model/tiles.json"))
manifest = manifest.get("regions", manifest)

rows = []
for region, tiles in manifest.items():
    engine = get_engine(region)
    if engine is None:
        print(f"!! no geolayer for {region}")
        continue
    for t in tiles:
        r = engine.evaluate(float(t["centerLat"]), float(t["centerLon"]), 0.82)
        rows.append((r["priorityScore"], region, t["id"], r["verdict"], r["violations"]))

rows.sort(reverse=True, key=lambda x: x[0])
print(f"{'PRI':>3}  {'REGION':13} {'TILE':26} VERDICT / nearest per kind")
print("-" * 100)
for pri, region, tid, verdict, vios in rows:
    tag = {"likely_non_compliant": "FLAGGED", "review_required": "review", "no_flag": "-"}[verdict]
    detail = ", ".join(f"{v['rule']}@{v['distanceM']}m" for v in vios) or "nothing within 1 km"
    print(f"{pri:>3}  {region:13} {tid:26} {tag:8} {detail}")

flagged = sum(1 for r in rows if r[3] == "likely_non_compliant")
print("-" * 100)
print(f"{flagged}/{len(rows)} tile centres would flag as likely non-compliant")
