# MPS model pipeline

This directory replaces the ad-hoc training notebooks with reproducible command-line tools. Training data and run artifacts stay outside Git in `.ml-data/` and `.ml-runs/`.

See [`EXPERIMENTS.md`](./EXPERIMENTS.md) for measured baselines, rejected candidates, and the next full-dataset experiment.

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r ml/requirements-mps.txt

.venv/bin/python ml/prepare_dataset.py --splits train val
.venv/bin/python ml/evaluate.py model/best.pt --split val
.venv/bin/python ml/bakeoff_mps.py --stage smoke
.venv/bin/python ml/bakeoff_mps.py --stage screen --variants 26m-256 26l-256
.venv/bin/python ml/train_mps.py --model yolo26m-obb.pt --imgsz 256 --batch 48 --epochs 60
.venv/bin/python ml/create_balanced_yaml.py --repeat 4
.venv/bin/python ml/create_region_yaml.py
.venv/bin/python ml/prepare_dataset.py --splits test
.venv/bin/python ml/evaluate.py .ml-runs/yolo11s-obb-mps/weights/best.pt --split test
```

Class indices are verified row-by-row against the paired DOTA labels during extraction:

- `0`: CFCBK
- `1`: FCBK
- `2`: Zigzag

Model selection must use validation metrics. Run the test evaluation only after choosing a final checkpoint.

The smoke stage compares YOLO26 `s`, `m`, and `l` at 128 and 256 pixels on the same
class-stratified subset. It records duration, peak Metal driver memory, metrics, and
checkpoint paths in `.ml-runs/bakeoff/smoke/leaderboard.json`. The screen stage uses
a larger geographically shuffled subset and should only run variants that fit and
train cleanly in the smoke stage.
