#!/usr/bin/env python3
"""Scale baby clips to match post-hatch reference (hatch-6)."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image


from creature_pixel import scale_content


def content_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    return im.convert("RGBA").getchannel("A").getbbox()


def extract_content(im: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    bbox = content_bbox(im)
    if not bbox:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0)), (0, 0, 1, 1)
    return im.crop(bbox), bbox


def paste_feet_aligned_fit(
    canvas: Image.Image,
    content: Image.Image,
    feet_y: int,
    *,
    pad: int,
) -> None:
    x = max(pad, min((canvas.width - content.width) // 2, canvas.width - pad - content.width))
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


def clamp_scale_to_canvas(
    contents: list[Image.Image],
    scale: float,
    canvas_size: tuple[int, int],
    *,
    pad: int,
) -> float:
    max_w = canvas_size[0] - pad * 2
    max_h = canvas_size[1] - pad * 2
    peak_w = 0.0
    peak_h = 0.0
    for content in contents:
        peak_w = max(peak_w, content.width * scale)
        peak_h = max(peak_h, content.height * scale)
    if peak_w <= 0 or peak_h <= 0:
        return scale
    fit = min(max_w / peak_w, max_h / peak_h, 1.0)
    return scale * fit


def normalize_clip_to_reference(
    reference_frame: Path,
    input_dir: Path,
    prefix: str,
    *,
    pad: int = 12,
    scale_from_frame: int = 1,
) -> list[Image.Image]:
    ref_im = Image.open(reference_frame).convert("RGBA")
    _, ref_bbox = extract_content(ref_im)
    ref_h = ref_bbox[3] - ref_bbox[1]
    ref_feet_y = ref_bbox[3]

    numbered = collect_frames(input_dir, prefix)
    contents: list[Image.Image] = []
    scale_h = 0
    for index, path in numbered:
        im = Image.open(path).convert("RGBA")
        content, bbox = extract_content(im)
        contents.append(content)
        if index == scale_from_frame:
            scale_h = bbox[3] - bbox[1]

    if scale_h <= 0:
        raise ValueError(
            f"Frame {scale_from_frame} has no visible content in {input_dir} "
            f"(scale-from-frame)"
        )

    scale = clamp_scale_to_canvas(contents, ref_h / scale_h, ref_im.size, pad=pad)

    out: list[Image.Image] = []
    for content in contents:
        scaled = scale_content(content, scale)
        canvas = Image.new("RGBA", ref_im.size, (0, 0, 0, 0))
        paste_feet_aligned_fit(canvas, scaled, ref_feet_y, pad=pad)
        out.append(canvas)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference-frame", required=True, type=Path)
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--prefix", required=True)
    parser.add_argument(
        "--scale-from-frame",
        type=int,
        default=1,
        help="Match reference height to this frame index (e.g. 6 for baby idle)",
    )
    parser.add_argument("--pad", type=int, default=12)
    parser.add_argument("--in-place", action="store_true")
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()

    frames = normalize_clip_to_reference(
        args.reference_frame,
        args.input_dir,
        args.prefix,
        pad=args.pad,
        scale_from_frame=args.scale_from_frame,
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
