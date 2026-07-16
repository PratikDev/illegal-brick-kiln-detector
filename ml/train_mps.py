from __future__ import annotations

import argparse
from pathlib import Path

import torch
from ultralytics import YOLO


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a SentinelKilnDB OBB model on MPS")
    parser.add_argument("--data", type=Path, default=Path(".ml-data/sentinel-kiln/sentinel-kiln.yaml"))
    parser.add_argument("--model", default="yolo26m-obb.pt")
    parser.add_argument("--name", default="yolo26m-obb-mps")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--imgsz", type=int, default=256)
    parser.add_argument("--batch", type=int, default=48)
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--mosaic", type=float, default=0.0)
    parser.add_argument("--patience", type=int, default=8)
    parser.add_argument("--lr0", type=float, default=0.001)
    parser.add_argument("--fraction", type=float, default=1.0)
    parser.add_argument("--optimizer", default="auto")
    parser.add_argument("--warmup-epochs", type=float, default=0.0)
    parser.add_argument("--freeze", type=int, default=None)
    parser.add_argument("--no-val", action="store_true")
    parser.add_argument("--resume", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not torch.backends.mps.is_available():
        raise RuntimeError("PyTorch MPS is unavailable on this machine")
    if not args.data.exists():
        raise FileNotFoundError(f"Prepare the dataset first: {args.data}")

    model = YOLO(args.model)
    results = model.train(
        data=str(args.data),
        device="mps",
        project=".ml-runs",
        name=args.name,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        workers=args.workers,
        patience=args.patience,
        fraction=args.fraction,
        freeze=args.freeze,
        val=not args.no_val,
        resume=args.resume,
        seed=42,
        deterministic=True,
        optimizer=args.optimizer,
        lr0=args.lr0,
        lrf=0.1,
        warmup_epochs=args.warmup_epochs,
        warmup_bias_lr=args.lr0,
        cos_lr=True,
        close_mosaic=0,
        degrees=90.0,
        fliplr=0.5,
        flipud=0.5,
        scale=0.25,
        translate=0.1,
        mosaic=args.mosaic,
        amp=False,
        cache=False,
        plots=True,
    )
    print(f"Training artifacts: {results.save_dir}")


if __name__ == "__main__":
    main()
