from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
import random

import yaml

from kiln_data import CLASS_NAMES


@dataclass(frozen=True)
class SubsetSize:
    train: dict[str, int]
    val: dict[str, int]


SUBSET_SIZES = {
    "smoke": SubsetSize(
        train={"CFCBK": 128, "FCBK": 320, "Zigzag": 320, "background": 256},
        val={"CFCBK": 64, "FCBK": 160, "Zigzag": 160, "background": 128},
    ),
    "screen": SubsetSize(
        train={"CFCBK": 1_800, "FCBK": 5_000, "Zigzag": 5_000, "background": 4_200},
        val={"CFCBK": 512, "FCBK": 1_800, "Zigzag": 1_800, "background": 1_888},
    ),
}


def prepare_bakeoff_yaml(data_root: Path, stage: str, seed: int = 42) -> Path:
    subset_size = SUBSET_SIZES[stage]
    output_dir = data_root / "bakeoff" / stage
    output_dir.mkdir(parents=True, exist_ok=True)

    counts: dict[str, dict[str, int]] = {}
    for index, split in enumerate(("train", "val")):
        quotas = getattr(subset_size, split)
        selected, split_counts = _select_images(data_root, split, quotas, seed + index)
        list_path = output_dir / f"{split}.txt"
        list_path.write_text(
            "\n".join(str(path.resolve()) for path in selected) + "\n",
            encoding="utf-8",
        )
        counts[split] = split_counts

    config = {
        "path": str(data_root.resolve()),
        "train": str((output_dir / "train.txt").resolve()),
        "val": str((output_dir / "val.txt").resolve()),
        "names": dict(enumerate(CLASS_NAMES)),
    }
    yaml_path = output_dir / "dataset.yaml"
    yaml_path.write_text(yaml.safe_dump(config, sort_keys=False), encoding="utf-8")
    print(f"Prepared {stage} subset: {counts}")
    return yaml_path


def _select_images(
    data_root: Path,
    split: str,
    quotas: dict[str, int],
    seed: int,
) -> tuple[list[Path], dict[str, int]]:
    image_dir = data_root / split / "images"
    label_dir = data_root / split / "labels"
    if not image_dir.exists() or not label_dir.exists():
        raise FileNotFoundError(f"Prepared {split} split not found under {data_root}")

    buckets: dict[str, list[Path]] = defaultdict(list)
    for image_path in sorted(image_dir.glob("*.png")):
        label_path = label_dir / f"{image_path.stem}.txt"
        classes = _read_classes(label_path)
        buckets[_primary_category(classes)].append(image_path)

    rng = random.Random(seed)
    selected: list[Path] = []
    counts: dict[str, int] = {}
    for category, quota in quotas.items():
        candidates = buckets[category]
        rng.shuffle(candidates)
        chosen = candidates[:quota]
        selected.extend(chosen)
        counts[category] = len(chosen)
        if len(chosen) < quota:
            print(f"Warning: requested {quota} {category} {split} images, found {len(chosen)}")
    rng.shuffle(selected)
    return selected, counts


def _read_classes(label_path: Path) -> set[int]:
    if not label_path.exists():
        return set()
    return {
        int(line.split()[0])
        for line in label_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }


def _primary_category(classes: set[int]) -> str:
    if 0 in classes:
        return "CFCBK"
    if 1 in classes:
        return "FCBK"
    if 2 in classes:
        return "Zigzag"
    return "background"
