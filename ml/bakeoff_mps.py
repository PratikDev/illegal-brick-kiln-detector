from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
from pathlib import Path
import time

import torch
from ultralytics import YOLO

from bakeoff_data import prepare_bakeoff_yaml


@dataclass(frozen=True)
class Variant:
    name: str
    weights: str
    imgsz: int
    batch: int


VARIANTS = {
    variant.name: variant
    for variant in (
        Variant("26s-128", "yolo26s-obb.pt", 128, 256),
        Variant("26s-256", "yolo26s-obb.pt", 256, 96),
        Variant("26m-128", "yolo26m-obb.pt", 128, 128),
        Variant("26m-256", "yolo26m-obb.pt", 256, 48),
        Variant("26l-128", "yolo26l-obb.pt", 128, 96),
        Variant("26l-256", "yolo26l-obb.pt", 256, 32),
    )
}

STAGE_EPOCHS = {"smoke": 1, "screen": 6}
DEFAULT_SCREEN_VARIANTS = ("26s-256", "26m-256", "26l-256")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark YOLO26 OBB variants on Apple MPS")
    parser.add_argument("--stage", choices=STAGE_EPOCHS, required=True)
    parser.add_argument(
        "--variants",
        nargs="+",
        choices=VARIANTS,
        help="Variant names; smoke defaults to all and screen defaults to 256px models",
    )
    parser.add_argument("--data-root", type=Path, default=Path(".ml-data/sentinel-kiln"))
    parser.add_argument("--epochs", type=int, help="Override the stage epoch count")
    parser.add_argument("--workers", type=int, default=0)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    _validate_mps()
    data_yaml = prepare_bakeoff_yaml(args.data_root, args.stage)
    names = args.variants or _default_variants(args.stage)
    epochs = args.epochs or STAGE_EPOCHS[args.stage]
    results_path = Path(".ml-runs/bakeoff") / args.stage / "leaderboard.json"
    previous = _read_results(results_path)

    for name in names:
        variant = VARIANTS[name]
        print(f"\nStarting {name}: {variant.weights}, imgsz={variant.imgsz}, batch={variant.batch}")
        try:
            row = _train_variant(variant, args.stage, data_yaml, epochs, args.workers)
        except RuntimeError as error:
            if "out of memory" not in str(error).lower():
                raise
            row = {**asdict(variant), "status": "oom", "error": str(error)}
            torch.mps.empty_cache()
        previous[name] = row
        _write_results(results_path, previous)

    print(f"\nLeaderboard: {results_path.resolve()}")


def _train_variant(
    variant: Variant,
    stage: str,
    data_yaml: Path,
    epochs: int,
    workers: int,
) -> dict[str, object]:
    peak_driver_bytes = 0
    model = YOLO(variant.weights)

    def track_memory(_trainer: object) -> None:
        nonlocal peak_driver_bytes
        peak_driver_bytes = max(peak_driver_bytes, torch.mps.driver_allocated_memory())

    model.add_callback("on_train_batch_end", track_memory)
    started = time.perf_counter()
    result = model.train(
        data=str(data_yaml),
        device="mps",
        project=str((Path(".ml-runs/bakeoff") / stage).resolve()),
        name=variant.name,
        exist_ok=True,
        epochs=epochs,
        imgsz=variant.imgsz,
        batch=variant.batch,
        workers=workers,
        patience=0,
        seed=42,
        deterministic=True,
        optimizer="auto",
        cos_lr=True,
        degrees=90.0,
        fliplr=0.5,
        flipud=0.5,
        scale=0.25,
        translate=0.1,
        mosaic=0.0,
        close_mosaic=0,
        amp=False,
        cache=False,
        plots=False,
        val=True,
    )
    metrics = {
        key: float(value)
        for key, value in result.results_dict.items()
        if isinstance(value, (int, float))
    }
    return {
        **asdict(variant),
        "status": "complete",
        "epochs": epochs,
        "duration_seconds": round(time.perf_counter() - started, 2),
        "peak_driver_memory_gib": round(peak_driver_bytes / 1024**3, 2),
        "checkpoint": str((Path(result.save_dir) / "weights/best.pt").resolve()),
        "metrics": metrics,
    }


def _validate_mps() -> None:
    if not torch.backends.mps.is_available():
        raise RuntimeError("PyTorch MPS is unavailable on this machine")
    print(f"PyTorch {torch.__version__}; MPS available; Metal memory limit is system-managed")


def _default_variants(stage: str) -> list[str]:
    return list(VARIANTS) if stage == "smoke" else list(DEFAULT_SCREEN_VARIANTS)


def _read_results(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def _write_results(path: Path, results: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
