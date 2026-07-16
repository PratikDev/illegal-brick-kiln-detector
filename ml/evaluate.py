from __future__ import annotations

import argparse
import json
from pathlib import Path

from ultralytics import YOLO


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate an OBB checkpoint")
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("--data", type=Path, default=Path(".ml-data/sentinel-kiln/sentinel-kiln.yaml"))
    parser.add_argument("--split", choices=("val", "test"), default="val")
    parser.add_argument("--imgsz", type=int, default=128)
    parser.add_argument("--batch", type=int, default=64)
    parser.add_argument("--device", default="mps")
    parser.add_argument("--name", default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    model = YOLO(str(args.checkpoint))
    run_name = args.name or f"eval-{args.checkpoint.stem}-{args.split}"
    metrics = model.val(
        data=str(args.data),
        split=args.split,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        workers=8,
        project=str(Path(".ml-runs").resolve()),
        name=run_name,
        plots=True,
    )
    serializable = {key: float(value) for key, value in metrics.results_dict.items()}
    output = Path(metrics.save_dir) / "metrics.json"
    output.write_text(json.dumps(serializable, indent=2), encoding="utf-8")
    per_class = {
        metrics.names[index]: {
            "precision": float(metrics.box.p[index]),
            "recall": float(metrics.box.r[index]),
            "mAP50": float(metrics.box.ap50[index]),
            "mAP50-95": float(metrics.box.maps[index]),
        }
        for index in range(len(metrics.names))
    }
    class_output = Path(metrics.save_dir) / "per-class-metrics.json"
    class_output.write_text(json.dumps(per_class, indent=2), encoding="utf-8")
    print(json.dumps(serializable, indent=2))
    print(f"Metrics: {output}")
    print(f"Per-class metrics: {class_output}")


if __name__ == "__main__":
    main()
