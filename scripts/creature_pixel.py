#!/usr/bin/env python3
"""Shared pixel-art resize helpers — NEAREST only, no soft interpolation."""

from __future__ import annotations

from PIL import Image

PIXEL_RESAMPLE = Image.Resampling.NEAREST


def scale_content(content: Image.Image, scale: float) -> Image.Image:
    if scale == 1.0:
        return content.copy()
    new_w = max(1, int(round(content.width * scale)))
    new_h = max(1, int(round(content.height * scale)))
    if new_w == content.width and new_h == content.height:
        return content.copy()
    return content.resize((new_w, new_h), PIXEL_RESAMPLE)


def resize_to(content: Image.Image, size: tuple[int, int]) -> Image.Image:
    if content.size == size:
        return content.copy()
    return content.resize(size, PIXEL_RESAMPLE)
