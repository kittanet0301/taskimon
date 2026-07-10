#!/usr/bin/env python3
"""Normalize sprite clip frames to a reference scale (egg move, hatch sequence, etc.)."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from creature_pixel import resize_to, scale_content


def content_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    return im.convert("RGBA").getchannel("A").getbbox()


def extract_content(im: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    bbox = content_bbox(im)
    if not bbox:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0)), (0, 0, 1, 1)
    return im.crop(bbox), bbox


def paste_feet_aligned(canvas: Image.Image, content: Image.Image, feet_y: int) -> None:
    x = (canvas.width - content.width) // 2
    y = feet_y - content.height
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


def scale_content_to_canvas(
    content: Image.Image,
    *,
    scale: float,
    canvas_size: tuple[int, int],
    feet_y: int,
    pad: int,
) -> Image.Image:
    new_w = max(1, int(round(content.width * scale)))
    new_h = max(1, int(round(content.height * scale)))
    scaled = scale_content(content, scale)

    max_w = canvas_size[0] - pad * 2
    max_h = canvas_size[1] - pad * 2
    if scaled.width > max_w or scaled.height > max_h:
        fit = min(max_w / scaled.width, max_h / scaled.height)
        new_w = max(1, int(round(scaled.width * fit)))
        new_h = max(1, int(round(scaled.height * fit)))
        scaled = resize_to(scaled, (new_w, new_h))

    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    paste_feet_aligned(canvas, scaled, feet_y)
    return canvas


def normalize_frames(
    reference_frame: Path,
    input_dir: Path,
    prefix: str,
    *,
    only_first_n: int | None = None,
    uniform_from_first: bool = False,
    pad: int = 4,
) -> list[Image.Image]:
    ref_im = Image.open(reference_frame).convert("RGBA")
    _, ref_bbox = extract_content(ref_im)
    ref_h = ref_bbox[3] - ref_bbox[1]
    ref_feet_y = ref_bbox[3]
    if ref_h <= 0:
        raise ValueError(f"Reference frame has no visible content: {reference_frame}")

    numbered = collect_frames(input_dir, prefix)
    first_im = Image.open(numbered[0][1]).convert("RGBA")
    first_content, first_bbox = extract_content(first_im)
    first_w = first_bbox[2] - first_bbox[0]
    first_h = first_bbox[3] - first_bbox[1]
    ref_w = ref_bbox[2] - ref_bbox[0]
    if first_h <= 0 or first_w <= 0:
        raise ValueError(f"First frame has no visible content: {numbered[0][1]}")

    uniform_scale = min(ref_w / first_w, ref_h / first_h) if uniform_from_first else None

    out: list[Image.Image] = []
    for index, path in numbered:
        im = Image.open(path).convert("RGBA")
        if only_first_n is not None and index > only_first_n and not uniform_from_first:
            out.append(im)
            continue

        content, bbox = extract_content(im)
        h = bbox[3] - bbox[1]
        if h <= 0:
            out.append(im)
            continue

        if uniform_scale is not None:
            scale = uniform_scale
        else:
            scale = ref_h / h

        out.append(
            scale_content_to_canvas(
                content,
                scale=scale,
                canvas_size=ref_im.size,
                feet_y=ref_feet_y,
                pad=pad,
            )
        )
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference-frame", required=True, type=Path)
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--only-first-n", type=int, default=0, help="Only rescale first N frames (0 = all)")
    parser.add_argument(
        "--uniform-from-first",
        action="store_true",
        help="Use one scale from frame 1 -> reference height, apply to every frame",
    )
    parser.add_argument("--in-place", action="store_true")
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()

    only_first_n = args.only_first_n if args.only_first_n > 0 else None
    frames = normalize_frames(
        args.reference_frame,
        args.input_dir,
        args.prefix,
        only_first_n=only_first_n,
        uniform_from_first=args.uniform_from_first,
    )

    output_dir = args.input_dir if args.in_place else args.output_dir
    if output_dir is None:
        raise SystemExit("Provide --in-place or --output-dir")

    output_dir.mkdir(parents=True, exist_ok=True)
    for (index, _), frame in zip(collect_frames(args.input_dir, args.prefix), frames):
        target = output_dir / f"{args.prefix}-{index}.png"
        frame.save(target)
        print(f"Wrote {target}")


if __name__ == "__main__":
    main()
