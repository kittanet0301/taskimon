#!/usr/bin/env python3
"""Compose per-clip raw sheets into a mega atlas (inverse of slice_mega_creature_sheet)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

from creature_pixel import resize_to


def compose_mega_sheet(
    layout: list[dict[str, object]],
    input_dir: Path,
    output_path: Path,
    *,
    canvas_size: tuple[int, int],
    cell_size: int = 512,
) -> None:
    canvas = Image.new("RGBA", canvas_size, (255, 0, 255, 255))

    for entry in layout:
        stage = str(entry["stage"])
        clip = str(entry["clip"])
        x = int(entry["x"])
        y = int(entry["y"])
        rows = int(entry["rows"])
        cols = int(entry["cols"])
        block_w = cols * cell_size
        block_h = rows * cell_size

        clip_path = input_dir / f"{stage}-{clip}.png"
        if not clip_path.exists():
            raise FileNotFoundError(f"Missing clip raw: {clip_path}")

        block = Image.open(clip_path).convert("RGBA")
        if block.size != (block_w, block_h):
            block = resize_to(block, (block_w, block_h))

        canvas.paste(block, (x, y), block)
        print(f"Pasted {clip_path.name} at ({x},{y})")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path)
    print(f"Wrote {output_path} ({canvas.size[0]}x{canvas.size[1]})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--layout-json", required=True, type=Path)
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--width", type=int, default=4608)
    parser.add_argument("--height", type=int, default=4096)
    parser.add_argument("--cell-size", type=int, default=512)
    args = parser.parse_args()

    data = json.loads(args.layout_json.read_text(encoding="utf-8"))
    layout = data.get("layout") or data.get("clips")
    if not layout:
        raise ValueError(f"No layout in {args.layout_json}")

    compose_mega_sheet(
        layout,
        args.input_dir,
        args.output,
        canvas_size=(args.width, args.height),
        cell_size=args.cell_size,
    )


if __name__ == "__main__":
    main()
