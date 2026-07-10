#!/usr/bin/env python3
"""Crop per-clip regions from a mega creature atlas into individual raw sheets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def slice_mega_sheet(
    input_path: Path,
    layout: list[dict[str, object]],
    output_dir: Path,
    *,
    cell_size: int = 512,
) -> list[Path]:
    sheet = Image.open(input_path).convert("RGBA")
    sheet_w, sheet_h = sheet.size
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    for entry in layout:
        stage = str(entry["stage"])
        clip = str(entry["clip"])
        x = int(entry["x"])
        y = int(entry["y"])
        rows = int(entry["rows"])
        cols = int(entry["cols"])
        block_w = cols * cell_size
        block_h = rows * cell_size

        if x + block_w > sheet_w or y + block_h > sheet_h:
            raise ValueError(
                f"Clip {stage}/{clip} block ({x},{y},{block_w}x{block_h}) "
                f"exceeds sheet size {sheet_w}x{sheet_h}"
            )

        cropped = sheet.crop((x, y, x + block_w, y + block_h))
        out_path = output_dir / f"{stage}-{clip}.png"
        cropped.save(out_path)
        written.append(out_path)
        print(f"Wrote {out_path} ({block_w}x{block_h})")

    return written


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Mega atlas PNG")
    parser.add_argument("--layout-json", required=True, type=Path, help="Layout JSON from plan-mega")
    parser.add_argument("--output-dir", required=True, type=Path, help="Per-clip raw output directory")
    parser.add_argument("--cell-size", type=int, default=512)
    args = parser.parse_args()

    if not args.input.exists():
        raise FileNotFoundError(f"Mega sheet not found: {args.input}")

    data = json.loads(args.layout_json.read_text(encoding="utf-8"))
    layout = data.get("layout") or data.get("clips")
    if not layout:
        raise ValueError(f"No layout array in {args.layout_json}")

    written = slice_mega_sheet(args.input, layout, args.output_dir, cell_size=args.cell_size)
    print(f"\nSliced {len(written)} clips from {args.input}")


if __name__ == "__main__":
    main()
