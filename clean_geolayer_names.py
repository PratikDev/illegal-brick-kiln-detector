"""One-off: clean already-built geolayers in place. No network needed.

Run once from the repo root, then delete. Future rebuilds are clean because the
same clean_name() now runs at ingest inside build_geolayers.py.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, "scripts")
from build_geolayers import clean_name  # noqa: E402

changed_total = 0
for path in sorted(Path("model/geolayers").glob("*.json")):
    payload = json.loads(path.read_text())
    changed = []
    for feature in payload["features"]:
        before = feature.get("name")
        after = clean_name(before)
        if after != before:
            feature["name"] = after
            changed.append((before, after))
    if changed:
        path.write_text(json.dumps(payload, separators=(",", ":")))
    changed_total += len(changed)
    print(f"{path.name:22} {len(changed):4} names cleaned")
    for before, after in changed[:3]:
        print(f"    {before!r}\n      -> {after!r}")

print(f"\n{changed_total} total. Re-run scan_tiles.py to see them in the queue.")
