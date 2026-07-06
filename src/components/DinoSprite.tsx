import { useEffect, useRef } from 'react'
import type { AnimationState, PetData } from '../shared/types'
import { DINO_PREVIEW_COLORS } from '../shared/constants'
import { hubPreviewClip, resolveDinoClip } from '../shared/dinoAnim'
import {
  DINO_BOB_PERIOD,
  DINO_BOB_PERIOD_EGG,
  DINO_FRAMES_PER_SPRITE_FRAME
} from '../shared/dinoTiming'
import {
  drawDinoSpriteFrame,
  dinoSpriteUrl,
  loadDinoSprite,
  pixelScaleForStage,
  preloadDinoSprites,
  setupCrispCanvas
} from '../shared/dinoSprites'

interface Props {
  pet: PetData
  size?: number
  className?: string
  hatching?: boolean
  movementAnim?: AnimationState
}

function preloadUrlsForPet(pet: PetData): string[] {
  const base = ['idle', 'move', 'hurt', 'bite', 'jump'] as const
  const egg = ['move', 'crack', 'hatch'] as const
  const urls = base.map((clip) => dinoSpriteUrl(pet.gender, pet.character, 'base', clip))
  if (pet.stage === 'egg') {
    urls.push(...egg.map((clip) => dinoSpriteUrl(pet.gender, pet.character, 'egg', clip)))
  }
  return urls
}

export function DinoSprite({
  pet,
  size = 96,
  className,
  hatching = false,
  movementAnim
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const pixelScale = pixelScaleForStage(pet.stage)
  const hubMode = movementAnim === undefined

  useEffect(() => {
    void preloadDinoSprites(preloadUrlsForPet(pet))
  }, [pet.gender, pet.character, pet.stage])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = setupCrispCanvas(canvas, size)

    let raf = 0
    let currentImg: HTMLImageElement | null = null
    let currentUrl = ''

    const tick = async () => {
      frameRef.current++
      const frame = frameRef.current
      const clip = hubMode
        ? hubPreviewClip(pet, hatching)
        : resolveDinoClip(pet, frame, movementAnim!, hatching)

      const url = dinoSpriteUrl(pet.gender, pet.character, clip.folder, clip.clip)
      if (url !== currentUrl) {
        currentUrl = url
        try {
          currentImg = await loadDinoSprite(url)
        } catch {
          currentImg = null
        }
      }

      ctx.clearRect(0, 0, size, size)
      const bob = pet.stage === 'egg'
        ? Math.round(Math.sin(frame / DINO_BOB_PERIOD_EGG) * 2)
        : Math.round(Math.sin(frame / DINO_BOB_PERIOD) * 2)
      const cx = Math.round(size / 2)
      const cy = Math.round(size / 2 + bob)

      if (currentImg) {
        drawDinoSpriteFrame(ctx, currentImg, Math.floor(frame / DINO_FRAMES_PER_SPRITE_FRAME), {
          x: cx,
          y: cy,
          pixelScale,
          flipX: clip.flipX
        })
      } else {
        const fallback = pixelScale * 24
        ctx.fillStyle = DINO_PREVIEW_COLORS[pet.character]
        ctx.beginPath()
        ctx.arc(cx, cy, fallback / 3, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }

    tick()
    return () => cancelAnimationFrame(raf)
  }, [pet, size, pixelScale, hatching, hubMode, movementAnim])

  return (
    <canvas
      ref={canvasRef}
      className={`dino-sprite-canvas${className ? ` ${className}` : ''}`}
      aria-hidden
    />
  )
}
