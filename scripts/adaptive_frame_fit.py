#!/usr/bin/env python3
"""Fit per-clip frames to a content-adaptive square canvas and write adaptive-meta.json."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image


def content_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    return im.convert("RGBA").getchannel("A").getbbox()


def extract_content(im: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    bbox = content_bbox(im)
    if not bbox:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0)), (0, 0, 1, 1)
    return im.crop(bbox), bbox


def snap_up(value: int, snap: int) -> int:
    if snap <= 1:
        return value
    return ((value + snap - 1) // snap) * snap


def paste_aligned(
    canvas: Image.Image,
    content: Image.Image,
    *,
    align: str,
    pad: int,
    feet_y: int | None = None,
) -> None:
    x = max(pad, min((canvas.width - content.width) // 2, canvas.width - pad - content.width))
    if align in {"bottom", "feet"} and feet_y is not None:
        y = feet_y - content.height
    else:
        y = max(pad, min((canvas.height - content.height) // 2, canvas.height - pad - content.height))
    canvas.paste(content, (x, y), content)


def collect_frames(input_dir: Path, prefix: str) -> list[tuple[int, Path]]:
    pattern = re.compile(rf"^{re.escape(prefix)}-(\d+)\.png$")
    numbered: list[tuple[int, Path]] = []
    for path in input_dir.glob("*.png"):
        match = pattern.match(path.name)
        if match:
            numbered.append((int(match.group(1)), path))
    numbered.sort(key=lambda item: item[0])
    if not numbered:
        raise FileNotFoundError(f"No frames matching {prefix}-N.png in {input_dir}")
    return numbered


def adaptive_cell_size(
    contents: list[Image.Image],
    *,
    pad: int,
    min_size: int,
    max_size: int,
    snap: int,
) -> int:
    peak_w = 0
    peak_h = 0
    for content in contents:
        peak_w = max(peak_w, content.width)
        peak_h = max(peak_h, content.height)
    raw = max(peak_w, peak_h) + pad * 2
    cell = snap_up(raw, snap)
    return max(min_size, min(max_size, cell))


def adaptive_fit_clip(
    input_dir: Path,
    prefix: str,
    *,
    align: str = "feet",
    pad: int = 8,
    min_size: int = 64,
    max_size: int = 256,
    snap: int = 8,
) -> dict[str, object]:
    numbered = collect_frames(input_dir, prefix)
    entries: list[tuple[int, Path, Image.Image]] = []
    for index, path in numbered:
        im = Image.open(path).convert("RGBA")
        content, _ = extract_content(im)
        entries.append((index, path, content))

    contents = [content for _, _, content in entries]
    cell_size = adaptive_cell_size(
        contents,
        pad=pad,
        min_size=min_size,
        max_size=max_size,
        snap=snap,
    )
    feet_y = cell_size - pad if align in {"bottom", "feet"} else None

    for index, path, content in entries:
        canvas = Image.new("RGBA", (cell_size, cell_size), (0, 0, 0, 0))
        paste_aligned(canvas, content, align=align, pad=pad, feet_y=feet_y)
        canvas.save(path)
        print(f"Wrote {path} ({cell_size}x{cell_size})")

    meta = {
        "frameSize": cell_size,
        "frames": len(entries),
        "align": align,
        "prefix": prefix,
    }
    meta_path = input_dir / "adaptive-meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Wrote {meta_path}")
    return meta


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--prefix", required=True, help="Frame prefix, e.g. idle for idle-1.png")
    parser.add_argument("--align", choices=["center", "bottom", "feet"], default="feet")
    parser.add_argument("--pad", type=int, default=8)
    parser.add_argument("--min-size", type=int, default=64)
    parser.add_argument("--max-size", type=int, default=256)
    parser.add_argument("--snap", type=int, default=8)
    args = parser.parse_args()

    adaptive_fit_clip(
        args.input_dir,
        args.prefix,
        align=args.align,
        pad=args.pad,
        min_size=args.min_size,
        max_size=args.max_size,
        snap=args.snap,
    )


if __name__ == "__main__":
    main()
