from __future__ import annotations

import argparse
import json
from pathlib import Path

from kiln_data import VALID_SPLITS, download_split, prepare_split, write_dataset_yaml


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare SentinelKilnDB for YOLO OBB")
    parser.add_argument(
        "--splits",
        nargs="+",
        choices=VALID_SPLITS,
        default=["train", "val"],
    )
    parser.add_argument("--output", type=Path, default=Path(".ml-data/sentinel-kiln"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    summary_path = args.output / "summary.json"
    summary: dict[str, dict[str, int]] = (
        json.loads(summary_path.read_text(encoding="utf-8"))
        if summary_path.exists()
        else {}
    )
    for split in args.splits:
        print(f"Preparing {split} split...", flush=True)
        summary[split] = prepare_split(download_split(split), args.output, split)
        print(json.dumps(summary[split], indent=2), flush=True)

    prepared_splits = [
        split for split in VALID_SPLITS if (args.output / split / "images").is_dir()
    ]
    yaml_path = write_dataset_yaml(args.output, prepared_splits)
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Dataset config: {yaml_path}")
    print(f"Dataset summary: {summary_path}")


if __name__ == "__main__":
    main()
