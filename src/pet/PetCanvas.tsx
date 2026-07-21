import { useEffect, useRef, useState } from 'react'
import type { AnimationState, GameSave } from '../shared/types'
import { petPreviewColor } from '../shared/constants'
import { resolvePetClip } from '../shared/dinoAnim'
import {
  DINO_BOB_PERIOD,
  DINO_BOB_PERIOD_EGG
} from '../shared/dinoTiming'
import {
  drawPetSpriteFrame,
  frameSizeForPet,
  loadPetSprite,
  petSpriteUrl,
  preloadPetSprites,
  resolveSpriteRenderSize,
  setupCrispCanvas,
  spriteFrameIndexForClip
} from '../shared/petSprites'
import type { PetSpriteFolder } from '../shared/petSprites'

const DEFAULT_SIZE = 96
/** Desktop overlay pet is half the hub/collection display size. */
const DESKTOP_PET_SCALE = 0.5
/** Compensate for transparent padding below the feet inside sprite frames. */
const DESKTOP_SPRITE_GROUND_OFFSET_RATIO = 1 / 8

function desktopRenderSize(pet: NonNullable<GameSave['pet']>) {
  const full = resolveSpriteRenderSize(pet)
  return {
    canvasSize: Math.max(32, Math.round(full.canvasSize * DESKTOP_PET_SCALE)),
    drawSize: Math.max(24, Math.round(full.drawSize * DESKTOP_PET_SCALE)),
    pixelScale: full.pixelScale * DESKTOP_PET_SCALE
  }
}

const PET_CLIPS: Array<{ folder: PetSpriteFolder; clip: string }> = [
  { folder: 'base', clip: 'idle' },
  { folder: 'base', clip: 'move' },
  { folder: 'base', clip: 'hurt' },
  { folder: 'base', clip: 'bite' },
  { folder: 'base', clip: 'jump' },
  { folder: 'egg', clip: 'move' },
  { folder: 'egg', clip: 'hatch' },
  { folder: 'baby', clip: 'idle' },
  { folder: 'baby', clip: 'move' },
  { folder: 'baby', clip: 'hurt' },
  { folder: 'baby', clip: 'bite' },
  { folder: 'baby', clip: 'jump' },
  { folder: 'adult', clip: 'idle' },
  { folder: 'adult', clip: 'move' },
  { folder: 'adult', clip: 'hurt' },
  { folder: 'adult', clip: 'bite' },
  { folder: 'adult', clip: 'jump' }
]

export function PetCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [save, setSave] = useState<GameSave | null>(null)
  const canvasSizeRef = useRef(DEFAULT_SIZE)
  const stateRef = useRef({
    frame: 0,
    animState: 'idle' as AnimationState,
    dragging: false,
    spriteUrl: '',
    spriteImg: null as HTMLImageElement | null
  })

  const pet = save?.pet
  const renderSize = pet ? desktopRenderSize(pet) : null
  const canvasSize = renderSize?.canvasSize ?? DEFAULT_SIZE
  const drawSize = renderSize?.drawSize ?? DEFAULT_SIZE
  const pixelScale = renderSize?.pixelScale ?? 4
  canvasSizeRef.current = canvasSize

  const finishDrag = async () => {
    if (!stateRef.current.dragging) return
    stateRef.current.dragging = false
    document.body.style.cursor = 'grab'
    await window.petAPI.endDrag()
  }

  useEffect(() => {
    document.documentElement.style.cssText =
      'background:transparent!important;overflow:hidden!important;margin:0;width:100%;height:100%;cursor:grab'
    document.body.style.cssText =
      'background:transparent!important;overflow:hidden!important;margin:0;width:100%;height:100%;cursor:grab'
    const root = document.getElementById('root')
    if (root) {
      root.style.cssText =
        'background:transparent;overflow:hidden;margin:0;width:100%;height:100%;display:block;cursor:grab'
    }

    // Always receive mouse — click-through made drag unreliable.
    void window.petAPI.setIgnoreMouse(false)

    void window.petAPI.getGame().then(setSave)

    const unsubGame = window.petAPI.onGameUpdated(setSave)
    const unsubDrag = window.petAPI.onDragEnded(() => {
      stateRef.current.dragging = false
      document.body.style.cursor = 'grab'
    })
    return () => {
      unsubGame()
      unsubDrag()
      void window.petAPI.endDrag()
    }
  }, [])

  useEffect(() => {
    void window.petAPI.resize(canvasSize)
  }, [canvasSize])

  useEffect(() => {
    if (!pet) return
    const urls = PET_CLIPS.map(({ folder, clip }) => petSpriteUrl(pet, folder, clip))
    void preloadPetSprites(urls)
    stateRef.current.spriteUrl = ''
    stateRef.current.spriteImg = null
  }, [pet?.gender, pet?.character, pet?.stage])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = setupCrispCanvas(canvas, canvasSize)

    let raf = 0
    const tick = () => {
      const s = stateRef.current
      s.frame++
      const activePet = save?.pet
      s.animState = 'idle'

      if (activePet) {
        const clip = resolvePetClip(activePet, s.frame, s.animState)
        const url = petSpriteUrl(activePet, clip.folder, clip.clip)
        if (url !== s.spriteUrl) {
          s.spriteUrl = url
          void loadPetSprite(url)
            .then((img) => {
              if (s.spriteUrl === url) s.spriteImg = img
            })
            .catch(() => {
              if (s.spriteUrl === url) s.spriteImg = null
            })
        }

        ctx.clearRect(0, 0, canvasSize, canvasSize)
        const bob =
          activePet.stage === 'egg'
            ? Math.round(Math.sin(s.frame / DINO_BOB_PERIOD_EGG) * 2)
            : s.animState.includes('walk')
              ? Math.round(Math.sin(s.frame / DINO_BOB_PERIOD) * 2)
              : Math.round(Math.sin(s.frame / DINO_BOB_PERIOD) * 3)
        const cx = Math.round(canvasSize / 2)
        const groundOffset = drawSize * DESKTOP_SPRITE_GROUND_OFFSET_RATIO
        const cy = Math.round(canvasSize / 2 + groundOffset + bob)

        if (s.spriteImg) {
          const spriteFrame = spriteFrameIndexForClip(clip.clip, s.frame, s.spriteImg, activePet.character)
          drawPetSpriteFrame(ctx, s.spriteImg, spriteFrame, activePet.character, {
            x: cx,
            y: cy,
            pixelScale,
            drawSize,
            flipX: clip.flipX
          })
        } else {
          ctx.fillStyle = petPreviewColor(activePet.character)
          ctx.beginPath()
          ctx.arc(cx, cy, Math.max(12, frameSizeForPet(activePet) / 4), 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        ctx.clearRect(0, 0, canvasSize, canvasSize)
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [save, canvasSize, drawSize, pixelScale])

  useEffect(() => {
    const onDblClick = () => {
      if (save?.pet && save.pet.stage !== 'egg') window.petAPI.patchGame('useItem', ['toy'])
    }
    const onContext = (e: MouseEvent) => {
      e.preventDefault()
      window.petAPI.openHub()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void finishDrag()
    }
    window.addEventListener('dblclick', onDblClick)
    window.addEventListener('contextmenu', onContext)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('dblclick', onDblClick)
      window.removeEventListener('contextmenu', onContext)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [save])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    stateRef.current.dragging = true
    stateRef.current.animState = 'idle'
    document.body.style.cursor = 'grabbing'
    void window.petAPI.startDrag()
  }

  return (
    <canvas
      ref={canvasRef}
      className="dino-sprite-canvas"
      style={{
        display: 'block',
        background: 'transparent',
        overflow: 'hidden',
        cursor: 'grab'
      }}
      onPointerDown={onPointerDown}
      onPointerUp={() => void finishDrag()}
      onPointerCancel={() => void finishDrag()}
    />
  )
}
