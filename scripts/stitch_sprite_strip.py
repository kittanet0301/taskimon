#!/usr/bin/env python3
"""Stitch numbered frame PNGs into a horizontal sprite strip."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image


def collect_frames(input_dir: Path, prefix: str) -> list[Image.Image]:
    pattern = re.compile(rf"^{re.escape(prefix)}-(\d+)\.png$")
    numbered: list[tuple[int, Path]] = []
    for path in input_dir.glob("*.png"):
        match = pattern.match(path.name)
        if match:
            numbered.append((int(match.group(1)), path))
    if not numbered:
        raise FileNotFoundError(f"No frames matching {prefix}-N.png in {input_dir}")
    numbered.sort(key=lambda item: item[0])
    return [Image.open(path).convert("RGBA") for _, path in numbered]


def stitch_frames(frames: list[Image.Image], frame_size: int | None = None) -> Image.Image:
    if not frames:
        raise ValueError("No frames to stitch.")
    height = frame_size or frames[0].height
    width = frame_size or frames[0].width
    strip = Image.new("RGBA", (width * len(frames), height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        if frame.size != (width, height):
            frame = frame.resize((width, height), Image.Resampling.NEAREST)
        strip.paste(frame, (index * width, 0), frame)
    return strip


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--prefix", required=True, help="Frame prefix, e.g. idle for idle-1.png")
    parser.add_argument("--frame-size", type=int, default=128)
    args = parser.parse_args()

    frames = collect_frames(args.input_dir, args.prefix)
    strip = stitch_frames(frames, args.frame_size)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    strip.save(args.output)
    print(f"Wrote {args.output} ({strip.size[0]}x{strip.size[1]}, {len(frames)} frames)")


if __name__ == "__main__":
    main()
