import type { DinoCharacter, Gender, Stage } from './types'
import { dinoAssetBase } from './dinoCharacters'

export const DINO_FRAME_SIZE = 24

export type DinoSpriteFolder = 'base' | 'egg' | 'ghost'

const imageCache = new Map<string, HTMLImageElement | Promise<HTMLImageElement>>()

export function dinoSpriteUrl(
  gender: Gender,
  character: DinoCharacter,
  folder: DinoSpriteFolder,
  clip: string
): string {
  return `${dinoAssetBase(gender, character, folder)}/${clip}.png`
}

export function frameCountFromImage(img: HTMLImageElement): number {
  return Math.max(1, Math.floor(img.width / DINO_FRAME_SIZE))
}

/** Integer scale only — pixel art must land on whole pixels (3×=72px, 4×=96px, …). */
export function pixelScaleForStage(stage: Stage): number {
  return stage === 'baby' ? 3 : 4
}

export function displaySizeFromPixelScale(pixelScale: number): number {
  return pixelScale * DINO_FRAME_SIZE
}

export function setupCrispCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight?: number,
  cssSized = true
): CanvasRenderingContext2D {
  const logicalH = logicalHeight ?? logicalWidth
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(logicalWidth * dpr)
  canvas.height = Math.round(logicalH * dpr)
  if (cssSized) {
    canvas.style.width = `${logicalWidth}px`
    canvas.style.height = `${logicalH}px`
  } else {
    canvas.style.width = ''
    canvas.style.height = ''
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false
  return ctx
}

export function loadDinoSprite(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url)
  if (cached instanceof HTMLImageElement) return Promise.resolve(cached)
  if (cached) return cached

  const loading = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      imageCache.set(url, img)
      resolve(img)
    }
    img.onerror = () => reject(new Error(`Failed to load sprite: ${url}`))
    img.src = url
  })
  imageCache.set(url, loading)
  return loading
}

export function preloadDinoSprites(urls: string[]): Promise<void> {
  return Promise.all(urls.map(loadDinoSprite)).then(() => undefined)
}

export function drawDinoSpriteFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frameIndex: number,
  options: {
    x: number
    y: number
    pixelScale: number
    flipX?: boolean
  }
): void {
  const frameCount = frameCountFromImage(img)
  const frame = ((frameIndex % frameCount) + frameCount) % frameCount
  const size = displaySizeFromPixelScale(options.pixelScale)
  const dx = Math.round(options.x - size / 2)
  const dy = Math.round(options.y - size / 2)
  const sx = frame * DINO_FRAME_SIZE

  ctx.imageSmoothingEnabled = false

  if (options.flipX) {
    ctx.save()
    ctx.translate(dx + size, dy)
    ctx.scale(-options.pixelScale, options.pixelScale)
    ctx.drawImage(img, sx, 0, DINO_FRAME_SIZE, DINO_FRAME_SIZE, 0, 0, DINO_FRAME_SIZE, DINO_FRAME_SIZE)
    ctx.restore()
  } else {
    ctx.drawImage(img, sx, 0, DINO_FRAME_SIZE, DINO_FRAME_SIZE, dx, dy, size, size)
  }
}
