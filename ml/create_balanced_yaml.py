from __future__ import annotations

import argparse
from pathlib import Path

import yaml


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Oversample training tiles containing CFCBK")
    parser.add_argument("--data", type=Path, default=Path(".ml-data/sentinel-kiln/sentinel-kiln.yaml"))
    parser.add_argument("--repeat", type=int, default=4)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.repeat < 1:
        raise ValueError("--repeat must be at least 1")

    config = yaml.safe_load(args.data.read_text(encoding="utf-8"))
    root = Path(config["path"])
    image_dir = root / "train" / "images"
    label_dir = root / "train" / "labels"
    entries: list[str] = []
    rare_tiles = 0

    for image_path in sorted(image_dir.glob("*.png")):
        entries.append(str(image_path.resolve()))
        label_path = label_dir / f"{image_path.stem}.txt"
        labels = label_path.read_text(encoding="utf-8").splitlines()
        if any(line.split()[0] == "0" for line in labels if line.strip()):
            entries.extend([str(image_path.resolve())] * (args.repeat - 1))
            rare_tiles += 1

    train_list = root / f"train-cfcbk-x{args.repeat}.txt"
    train_list.write_text("\n".join(entries) + "\n", encoding="utf-8")
    config["train"] = str(train_list.resolve())
    balanced_yaml = root / f"sentinel-kiln-cfcbk-x{args.repeat}.yaml"
    balanced_yaml.write_text(yaml.safe_dump(config, sort_keys=False), encoding="utf-8")
    print(f"CFCBK tiles: {rare_tiles}")
    print(f"Training entries: {len(entries)}")
    print(f"Balanced config: {balanced_yaml}")


if __name__ == "__main__":
    main()
