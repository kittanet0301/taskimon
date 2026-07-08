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

export function dashSpriteSize(sceneWidth: number, isEgg: boolean): number {
  const base = Math.round(sceneWidth * (isEgg ? 0.085 : 0.13))
  return Math.max(isEgg ? 72 : 96, Math.min(isEgg ? 112 : 168, base))
}
