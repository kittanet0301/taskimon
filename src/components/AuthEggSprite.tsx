import { useEffect, useRef } from 'react'
import { CREATURE_PREVIEW_COLORS, DEFAULT_CREATURE_SPECIES } from '../shared/creatureCharacters'
import { DINO_BOB_PERIOD_EGG, DINO_FRAMES_PER_SPRITE_FRAME } from '../shared/dinoTiming'
import {
  drawPetSpriteFrame,
  loadPetSprite,
  petSpriteUrl,
  pixelScaleForStage,
  preloadPetSprites,
  setupCrispCanvas
} from '../shared/petSprites'

const AUTH_EGG_PET = {
  character: DEFAULT_CREATURE_SPECIES,
  gender: 'male' as const,
  stage: 'egg' as const
}
const EGG_URL = petSpriteUrl(AUTH_EGG_PET, 'egg', 'move')
const PIXEL_SCALE = 3

interface Props {
  size?: number
  className?: string
}

export function AuthEggSprite({ size = 72, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    void preloadPetSprites([EGG_URL])
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = setupCrispCanvas(canvas, size)

    let raf = 0
    let img: HTMLImageElement | null = null
    let cancelled = false

    void loadPetSprite(EGG_URL).then((loaded) => {
      if (!cancelled) img = loaded
    })

    const tick = () => {
      frameRef.current++
      const frame = frameRef.current

      ctx.clearRect(0, 0, size, size)
      const bob = Math.round(Math.sin(frame / DINO_BOB_PERIOD_EGG) * 2)
      const cx = Math.round(size / 2)
      const cy = Math.round(size / 2 + bob)

      if (img) {
        drawPetSpriteFrame(ctx, img, Math.floor(frame / DINO_FRAMES_PER_SPRITE_FRAME), AUTH_EGG_PET.character, {
          x: cx,
          y: cy,
          pixelScale: pixelScaleForStage(AUTH_EGG_PET.stage, AUTH_EGG_PET.character),
          flipX: false
        })
      } else {
        const fallback = PIXEL_SCALE * 24
        ctx.fillStyle = CREATURE_PREVIEW_COLORS[DEFAULT_CREATURE_SPECIES]
        ctx.beginPath()
        ctx.arc(cx, cy, fallback / 3, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }

    tick()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      className={`dino-sprite-canvas auth-egg-sprite${className ? ` ${className}` : ''}`}
      aria-hidden
    />
  )
}
