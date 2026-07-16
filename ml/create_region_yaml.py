from __future__ import annotations

import argparse
from pathlib import Path

import yaml


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create geographic train/validation lists")
    parser.add_argument("--data", type=Path, default=Path(".ml-data/sentinel-kiln/sentinel-kiln.yaml"))
    parser.add_argument("--name", default="bangladesh-region")
    parser.add_argument("--min-lat", type=float, default=20.5)
    parser.add_argument("--max-lat", type=float, default=26.7)
    parser.add_argument("--min-lon", type=float, default=88.0)
    parser.add_argument("--max-lon", type=float, default=92.7)
    parser.add_argument("--include-class", type=int, default=None)
    parser.add_argument("--class-repeat", type=int, default=1)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.class_repeat < 1:
        raise ValueError("--class-repeat must be at least 1")
    config = yaml.safe_load(args.data.read_text(encoding="utf-8"))
    root = Path(config["path"])
    for split in ("train", "val"):
        selected: list[str] = []
        for image_path in sorted((root / split / "images").glob("*.png")):
            latitude, longitude = map(float, image_path.stem.split("_"))
            if (
                args.min_lat <= latitude <= args.max_lat
                and args.min_lon <= longitude <= args.max_lon
            ):
                selected.append(str(image_path.resolve()))
        if split == "train" and args.include_class is not None:
            selected_set = set(selected)
            for label_path in sorted((root / split / "labels").glob("*.txt")):
                labels = label_path.read_text(encoding="utf-8").splitlines()
                if not any(
                    int(line.split()[0]) == args.include_class
                    for line in labels
                    if line.strip()
                ):
                    continue
                image_path = (root / split / "images" / f"{label_path.stem}.png").resolve()
                image = str(image_path)
                if image not in selected_set:
                    selected.extend([image] * args.class_repeat)
        list_path = root / f"{args.name}-{split}.txt"
        list_path.write_text("\n".join(selected) + "\n", encoding="utf-8")
        config[split] = str(list_path.resolve())
        print(f"{split}: {len(selected)} images")

    output = root / f"{args.name}.yaml"
    output.write_text(yaml.safe_dump(config, sort_keys=False), encoding="utf-8")
    print(f"Region config: {output}")


if __name__ == "__main__":
    main()
