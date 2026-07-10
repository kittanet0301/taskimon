export const DASH_BG_WIDTH = 1672
export const DASH_BG_HEIGHT = 941

/** Anchor points in source background pixels (1672x941). */
export const DASH_SCENE_ANCHORS = {
  /** Center of the warm hatch glow. */
  egg: { x: 836, y: 690 },
  /** Feet on the warm hatch glow. */
  pedestal: { x: 836, y: 700 }
} as const

export function coverImagePointToPercent(
  containerW: number,
  containerH: number,
  imgW: number,
  imgH: number,
  pointX: number,
  pointY: number,
  objectPositionX = 0.5,
  objectPositionY = 0.5
): { leftPct: number; topPct: number } {
  const scale = Math.max(containerW / imgW, containerH / imgH)
  const renderedW = imgW * scale
  const renderedH = imgH * scale
  const offsetX = (containerW - renderedW) * objectPositionX
  const offsetY = (containerH - renderedH) * objectPositionY
  return {
    leftPct: ((offsetX + pointX * scale) / containerW) * 100,
    topPct: ((offsetY + pointY * scale) / containerH) * 100
  }
}

export const DASH_SPRITE_SCALE = 2

export function dashSpriteSize(
  sceneWidth: number,
  isEgg: boolean,
  options?: { creature?: boolean }
): number {
  const creature = options?.creature ?? false
  const ratio = isEgg ? 0.085 : creature ? 0.16 : 0.13
  const min = (isEgg ? 72 : creature ? 120 : 96) * DASH_SPRITE_SCALE
  const max = (isEgg ? 112 : creature ? 200 : 168) * DASH_SPRITE_SCALE
  const base = Math.round(sceneWidth * ratio * DASH_SPRITE_SCALE)
  return Math.max(min, Math.min(max, base))
}
