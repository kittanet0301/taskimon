#!/usr/bin/env python3
"""Normalize every frame in a species stage to one reference height + shared width clamp."""

from __future__ import annotations

import argparse
import json
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


def load_jobs(config_path: Path) -> list[dict[str, str]]:
    data = json.loads(config_path.read_text(encoding="utf-8"))
    return data["clips"]


def normalize_species(
    reference_frame: Path,
    clips: list[dict[str, str]],
    *,
    pad: int = 12,
    height_only: bool = False,
    height_multiplier: float = 1.0,
) -> None:
    ref_im = Image.open(reference_frame).convert("RGBA")
    _, ref_bbox = extract_content(ref_im)
    ref_h = ref_bbox[3] - ref_bbox[1]
    target_h = max(1, int(round(ref_h * height_multiplier)))
    ref_feet_y = ref_bbox[3]
    if target_h <= 0:
        raise ValueError(f"Reference has no content: {reference_frame}")

    max_w = ref_im.width - pad * 2
    max_h = ref_im.height - pad * 2

    entries: list[tuple[dict[str, str], int, Path, Image.Image]] = []

    for job in clips:
        input_dir = Path(job["inputDir"])
        prefix = job["prefix"]
        align = job.get("align", "feet")
        for index, path in collect_frames(input_dir, prefix):
            im = Image.open(path).convert("RGBA")
            content, bbox = extract_content(im)
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            if h <= 0 or w <= 0:
                continue
            scale = min(target_h / h, max_w / w)
            scaled = scale_content(content, scale)
            entries.append((job, index, path, scaled, align))

    for job, index, path, scaled, align in entries:
        canvas = Image.new("RGBA", ref_im.size, (0, 0, 0, 0))
        paste_aligned(
            canvas,
            scaled,
            align=align,
            pad=pad,
            feet_y=ref_feet_y if align in {"bottom", "feet"} else None,
        )
        canvas.save(path)
        print(f"Wrote {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference-frame", required=True, type=Path)
    parser.add_argument("--config", required=True, type=Path, help="JSON with clips[] from batch script")
    parser.add_argument("--pad", type=int, default=12)
    parser.add_argument(
        "--height-only",
        action="store_true",
        help="Match reference height exactly; ignore width clamp",
    )
    parser.add_argument(
        "--height-multiplier",
        type=float,
        default=1.0,
        help="Scale target height relative to reference content height (e.g. 1.4 for adult)",
    )
    args = parser.parse_args()

    clips = load_jobs(args.config)
    normalize_species(
        args.reference_frame,
        clips,
        pad=args.pad,
        height_only=args.height_only,
        height_multiplier=args.height_multiplier,
    )


if __name__ == "__main__":
    main()
