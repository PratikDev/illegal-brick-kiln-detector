# Model experiments

All metrics below were produced locally on the M5 Pro MPS backend. Candidate checkpoints remain in ignored `.ml-runs/` directories. No candidate is copied into `model/` unless it passes the relevant validation gate.

## Baselines

| Checkpoint | Validation set | Precision | Recall | mAP50 | mAP50-95 |
| --- | --- | ---: | ---: | ---: | ---: |
| `model/best.pt` | Full SentinelKilnDB validation (23,952 images) | 0.651 | 0.627 | 0.649 | 0.370 |
| `model/best.pt` | Bangladesh bounding region (3,929 images) | 0.356 | 0.439 | 0.400 | 0.208 |

The Bangladesh-region per-class mAP50 values are 0.020 CFCBK, 0.398 FCBK, and 0.783 Zigzag. Only 22 CFCBK instances occur in that validation region.

## Rejected candidates

| Candidate | Change | Validation set | mAP50 | Decision |
| --- | --- | --- | ---: | --- |
| `yolo11n-obb-mps-refine-v1` | Full-network restart, AdamW, no mosaic | Full validation | 0.488 | Rejected; catastrophic regression after one epoch |
| `yolo11n-obb-mps-head-tune-v2` | Backbone frozen, `1e-5` learning rate | Full validation | 0.623 | Rejected; below 0.649 baseline |
| `yolo11s-obb-bangladesh-hybrid-v1` | Fresh small model, 30 epochs, Bangladesh region plus repeated global CFCBK tiles | Bangladesh region | 0.342 | Rejected; below 0.400 regional baseline |

The final hybrid candidate reached regional per-class mAP50 values of 0.013 CFCBK, 0.368 FCBK, and 0.645 Zigzag. Larger capacity alone did not offset reduced geographic diversity and the very small Bangladesh CFCBK validation sample.

## Next experiment

Run a capacity bake-off with the current YOLO26 OBB family on the complete official training split. YOLO26 adds an updated OBB angle loss and DOTA-pretrained checkpoints. Use MPS smoke runs to determine safe batch sizes for `s`, `m`, and `l`, eliminate candidates that do not fit or train reliably, then compare surviving models at equal image exposure before a long run.

The six-way smoke run completed without an out-of-memory failure. At 256 pixels,
`26m` reached 0.122 mAP50 using 9.65 GiB peak Metal driver memory and `26l`
reached 0.207 using 7.63 GiB. The 128-pixel variants produced zero or near-zero
mAP after the same exposure, so they are eliminated. Smoke metrics are only a
learning-signal and hardware gate; they are not comparable with the full validation
baseline.

The `26l-256` screen was stopped after six completed epochs once it reached 0.635
mAP50 and 0.363 mAP50-95 on the 6,000-image stratified screen set. On the complete
official validation set, its best checkpoint scored 0.605 mAP50 and 0.368
mAP50-95. It is not promoted because it misses the production checkpoint's 0.649
mAP50 gate. The candidate's full-validation CFCBK scores were strong (0.695 mAP50,
0.486 mAP50-95), while FCBK and Zigzag coverage suffered from subset training.
This validates the architecture and rare-class sampling signal, but rejects a
subset-only training recipe.

```bash
.venv/bin/python ml/bakeoff_mps.py --stage smoke
.venv/bin/python ml/bakeoff_mps.py --stage screen --variants 26l-256 26m-256
```

The next long candidate should train `yolo26l-obb.pt` on the complete official
training split at 256 pixels, while oversampling CFCBK-positive images without
discarding geographic coverage. Promotion requires beating both 0.649 mAP50 and
0.370 mAP50-95 on the complete validation split.

Do not evaluate on the official test split until a checkpoint has been selected using validation data.
