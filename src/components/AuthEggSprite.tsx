import { useEffect, useRef } from 'react'
import { DINO_PREVIEW_COLORS } from '../shared/constants'
import { DINO_BOB_PERIOD_EGG, DINO_FRAMES_PER_SPRITE_FRAME } from '../shared/dinoTiming'
import {
  drawDinoSpriteFrame,
  dinoSpriteUrl,
  loadDinoSprite,
  preloadDinoSprites,
  setupCrispCanvas
} from '../shared/dinoSprites'

const EGG_URL = dinoSpriteUrl('male', 'doux', 'egg', 'move')
const PIXEL_SCALE = 3

interface Props {
  size?: number
  className?: string
}

export function AuthEggSprite({ size = 72, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    void preloadDinoSprites([EGG_URL])
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = setupCrispCanvas(canvas, size)

    let raf = 0
    let img: HTMLImageElement | null = null
    let cancelled = false

    void loadDinoSprite(EGG_URL).then((loaded) => {
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
        drawDinoSpriteFrame(ctx, img, Math.floor(frame / DINO_FRAMES_PER_SPRITE_FRAME), {
          x: cx,
          y: cy,
          pixelScale: PIXEL_SCALE,
          flipX: false
        })
      } else {
        const fallback = PIXEL_SCALE * 24
        ctx.fillStyle = DINO_PREVIEW_COLORS.doux
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
