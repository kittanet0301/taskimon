#!/usr/bin/env python3
"""Chroma-key background removal for creature sprite sheets."""

from __future__ import annotations

import math
from collections import deque

from PIL import Image

CHROMA_KEYS = {
    "magenta": (255, 0, 255),
    "green": (0, 255, 0),
}


def chroma_distance(r: int, g: int, b: int, key: tuple[int, int, int]) -> float:
    kr, kg, kb = key
    return math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)


def resolve_chroma_key(name: str) -> tuple[int, int, int]:
    key = CHROMA_KEYS.get(name.lower())
    if key is None:
        raise ValueError(f"Unknown chroma key '{name}'. Use: {', '.join(CHROMA_KEYS)}")
    return key


def remove_bg_chroma(
    img: Image.Image,
    key: tuple[int, int, int],
    threshold: int = 100,
    edge_threshold: int = 150,
) -> Image.Image:
    pixels = img.load()
    width, height = img.size

    def dist(r: int, g: int, b: int) -> float:
        return chroma_distance(r, g, b, key)

    for x in range(width):
        for y in range(height):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if dist(r, g, b) < threshold:
                pixels[x, y] = (0, 0, 0, 0)

    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or x < 0 or x >= width or y < 0 or y >= height:
            continue
        visited.add((x, y))
        r, g, b, a = pixels[x, y]
        if a == 0:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    if (x + dx, y + dy) not in visited:
                        queue.append((x + dx, y + dy))
        elif dist(r, g, b) < edge_threshold:
            pixels[x, y] = (0, 0, 0, 0)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    if (x + dx, y + dy) not in visited:
                        queue.append((x + dx, y + dy))
    return img
