import { useEffect, useRef } from 'react'
import type { AnimationState, PetData } from '../shared/types'
import { petPreviewColor } from '../shared/constants'
import { resolvePetClip } from '../shared/dinoAnim'
import {
  DINO_BOB_PERIOD,
  DINO_BOB_PERIOD_EGG
} from '../shared/dinoTiming'
import {
  drawPetSpriteFrame,
  frameCountFromImage,
  frameSizeForPet,
  isCreaturePet,
  isHatchAnimationComplete,
  loadPetSprite,
  petSpriteUrl,
  preloadPetSprites,
  resolveSpriteRenderSize,
  setupCrispCanvas,
  spriteFrameIndexForClip
} from '../shared/petSprites'

interface Props {
  pet: PetData
  size?: number
  className?: string
  hatching?: boolean
  /** Temporary care clip on the hub (eat / happy); ignored while hatching or for eggs. */
  careAnim?: AnimationState | null
  movementAnim?: AnimationState
  onHatchComplete?: () => void
}

function preloadUrlsForPet(pet: PetData): string[] {
  const base = ['idle', 'move', 'hurt', 'bite', 'jump'] as const
  const egg = ['move', 'hatch'] as const
  const baby = ['idle', 'move', 'hurt', 'bite', 'jump'] as const
  const urls = base.map((clip) => petSpriteUrl(pet, 'base', clip))
  if (pet.stage === 'egg') {
    urls.push(...egg.map((clip) => petSpriteUrl(pet, 'egg', clip)))
    urls.push(...baby.map((clip) => petSpriteUrl(pet, 'baby', clip)))
  }
  return urls
}

export function DinoSprite({
  pet,
  size,
  className,
  hatching = false,
  careAnim = null,
  movementAnim,
  onHatchComplete
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const hatchCompleteFiredRef = useRef(false)
  const onHatchCompleteRef = useRef(onHatchComplete)
  const { canvasSize, drawSize } = resolveSpriteRenderSize(pet, size)
  const hubMode = movementAnim === undefined
  const feetAnchored = hubMode && isCreaturePet(pet)
  const activeCareAnim =
    careAnim && pet.stage !== 'egg' && !hatching ? careAnim : null

  useEffect(() => {
    onHatchCompleteRef.current = onHatchComplete
  }, [onHatchComplete])

  useEffect(() => {
    if (hatching) {
      frameRef.current = 0
      hatchCompleteFiredRef.current = false
    }
  }, [hatching])

  useEffect(() => {
    if (activeCareAnim) frameRef.current = 0
  }, [activeCareAnim])

  useEffect(() => {
    void preloadPetSprites(preloadUrlsForPet(pet))
  }, [pet.gender, pet.character, pet.stage])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = setupCrispCanvas(canvas, canvasSize)

    let raf = 0
    let currentImg: HTMLImageElement | null = null
    let currentUrl = ''
    let ticking = false

    const tick = () => {
      if (ticking) return
      ticking = true
      void (async () => {
        frameRef.current++
        const frame = frameRef.current
        const carePet = activeCareAnim
          ? { ...pet, animationState: activeCareAnim }
          : pet
        const clip =
          hatching || !hubMode
            ? resolvePetClip(carePet, frame, movementAnim ?? 'idle', hatching)
            : resolvePetClip(carePet, frame, 'idle', false)

        const url = petSpriteUrl(pet, clip.folder, clip.clip)
        if (url !== currentUrl) {
          currentUrl = url
          try {
            currentImg = await loadPetSprite(url)
          } catch {
            currentImg = null
          }
        }

        ctx.clearRect(0, 0, canvasSize, canvasSize)
        const bob = pet.stage === 'egg'
          ? Math.round(Math.sin(frame / DINO_BOB_PERIOD_EGG) * 2)
          : Math.round(Math.sin(frame / DINO_BOB_PERIOD) * 2)
        const cx = Math.round(canvasSize / 2)
        const cy = feetAnchored
          ? Math.round(canvasSize - 4 - drawSize / 2 + bob)
          : Math.round(canvasSize / 2 + bob)

        if (currentImg) {
          const spriteFrame = spriteFrameIndexForClip(clip.clip, frame, currentImg, pet.character)
          drawPetSpriteFrame(ctx, currentImg, spriteFrame, pet.character, {
            x: cx,
            y: cy,
            pixelScale: drawSize / frameSizeForPet(pet),
            drawSize,
            flipX: clip.flipX
          })

          if (
            hatching &&
            clip.clip === 'hatch' &&
            !hatchCompleteFiredRef.current
          ) {
            const frameCount = frameCountFromImage(currentImg, pet.character)
            if (isHatchAnimationComplete(frame, frameCount)) {
              hatchCompleteFiredRef.current = true
              onHatchCompleteRef.current?.()
            }
          }
        } else {
          const fallback = Math.max(12, frameSizeForPet(pet) / 4)
          ctx.fillStyle = petPreviewColor(pet.character)
          ctx.beginPath()
          ctx.arc(cx, cy, fallback, 0, Math.PI * 2)
          ctx.fill()
        }

        ticking = false
        raf = requestAnimationFrame(tick)
      })()
    }

    tick()
    return () => cancelAnimationFrame(raf)
  }, [pet, canvasSize, drawSize, feetAnchored, hatching, hubMode, movementAnim, activeCareAnim])

  return (
    <canvas
      ref={canvasRef}
      className={`dino-sprite-canvas${className ? ` ${className}` : ''}`}
      aria-hidden
    />
  )
}
