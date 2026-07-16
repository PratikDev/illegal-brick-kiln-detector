from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
import os
from pathlib import Path

import pyarrow.parquet as parquet
import yaml

# The native Xet downloader has stalled on this Apple Silicon setup. Plain HTTP
# is slower but resumable and reliable for the three large parquet files.
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

from huggingface_hub import hf_hub_download


HF_REPO = "SustainabilityLabIITGN/SentinelKilnDB"
CLASS_NAMES = ("CFCBK", "FCBK", "Zigzag")
VALID_SPLITS = ("train", "val", "test")


def download_split(split: str) -> Path:
    _validate_split(split)
    return Path(
        hf_hub_download(
            repo_id=HF_REPO,
            repo_type="dataset",
            filename=f"{split}/{split}.parquet",
        )
    )


def prepare_split(parquet_path: Path, output_root: Path, split: str) -> dict[str, int]:
    _validate_split(split)
    image_dir = output_root / split / "images"
    label_dir = output_root / split / "labels"
    image_dir.mkdir(parents=True, exist_ok=True)
    label_dir.mkdir(parents=True, exist_ok=True)

    counts: Counter[str] = Counter()
    source = parquet.ParquetFile(parquet_path)
    columns = ["image_name", "image", "dota_label", "yolo_obb_label"]
    for batch in source.iter_batches(batch_size=512, columns=columns):
        rows = zip(
            batch["image_name"].to_pylist(),
            batch["image"].to_pylist(),
            batch["dota_label"].to_pylist(),
            batch["yolo_obb_label"].to_pylist(),
            strict=True,
        )
        for image_name, image_bytes, dota_labels, yolo_labels in rows:
            _validate_label_mapping(dota_labels, yolo_labels)
            stem = Path(image_name).stem
            (image_dir / f"{stem}.png").write_bytes(image_bytes)
            lines = [line.strip() for line in yolo_labels if line.strip()]
            (label_dir / f"{stem}.txt").write_text("\n".join(lines), encoding="utf-8")
            counts["images"] += 1
            counts["boxes"] += len(lines)
            for line in lines:
                counts[CLASS_NAMES[int(line.split()[0])]] += 1
    return dict(counts)


def write_dataset_yaml(output_root: Path, splits: Iterable[str]) -> Path:
    available = set(splits)
    if not available:
        raise ValueError("At least one prepared split is required")
    fallback = "val" if "val" in available else sorted(available)[0]
    config: dict[str, object] = {
        "path": str(output_root.resolve()),
        "names": dict(enumerate(CLASS_NAMES)),
        # Ultralytics requires both keys even for validation-only datasets.
        "train": f"{'train' if 'train' in available else fallback}/images",
        "val": f"{'val' if 'val' in available else fallback}/images",
    }
    if "test" in available:
        config["test"] = "test/images"
    path = output_root / "sentinel-kiln.yaml"
    path.write_text(yaml.safe_dump(config, sort_keys=False), encoding="utf-8")
    return path


def _validate_label_mapping(dota_labels: list[str], yolo_labels: list[str]) -> None:
    if len(dota_labels) != len(yolo_labels):
        raise ValueError("DOTA and YOLO label counts differ")
    for dota_label, yolo_label in zip(dota_labels, yolo_labels, strict=True):
        class_name = dota_label.split()[-2]
        class_index = int(yolo_label.split()[0])
        if class_index >= len(CLASS_NAMES) or CLASS_NAMES[class_index] != class_name:
            raise ValueError(
                f"Unexpected class mapping: index {class_index!r}, name {class_name!r}"
            )


def _validate_split(split: str) -> None:
    if split not in VALID_SPLITS:
        raise ValueError(f"Unknown split {split!r}; expected one of {VALID_SPLITS}")
