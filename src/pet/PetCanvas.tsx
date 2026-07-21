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

function desktopRenderSize(pet: NonNullable<GameSave['pet']>) {
  const full = resolveSpriteRenderSize(pet)
  return {
    canvasSize: Math.max(32, Math.round(full.canvasSize * DESKTOP_PET_SCALE)),
    drawSize: Math.max(24, Math.round(full.drawSize * DESKTOP_PET_SCALE)),
    pixelScale: full.pixelScale * DESKTOP_PET_SCALE
  }
}

function clampPetPos(
  x: number,
  y: number,
  size: number,
  area: { x: number; y: number; width: number; height: number },
  round = true
) {
  const maxX = area.x + area.width - size
  const maxY = area.y + area.height - size
  const cx = Math.min(Math.max(x, area.x), Math.max(area.x, maxX))
  const cy = Math.min(Math.max(y, area.y), Math.max(area.y, maxY))
  if (!round) return { x: cx, y: cy }
  return { x: Math.round(cx), y: Math.round(cy) }
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
    posX: 200,
    posY: 200,
    velocityX: 2.5,
    animState: 'idle' as AnimationState,
    dragging: false,
    spriteUrl: '',
    spriteImg: null as HTMLImageElement | null,
    workArea: { x: 0, y: 0, width: 1920, height: 1080 }
  })

  const pet = save?.pet
  const renderSize = pet ? desktopRenderSize(pet) : null
  const canvasSize = renderSize?.canvasSize ?? DEFAULT_SIZE
  const drawSize = renderSize?.drawSize ?? DEFAULT_SIZE
  const pixelScale = renderSize?.pixelScale ?? 4
  canvasSizeRef.current = canvasSize

  const applyBounds = (bounds: { x: number; y: number } | null | undefined) => {
    if (!bounds) return
    stateRef.current.posX = bounds.x
    stateRef.current.posY = bounds.y
  }

  const finishDrag = async () => {
    if (!stateRef.current.dragging) return
    stateRef.current.dragging = false
    document.body.style.cursor = 'grab'
    const bounds = await window.petAPI.endDrag()
    applyBounds(bounds)
    // Resume walking from the dropped spot.
    if (bounds) {
      stateRef.current.posX = bounds.x
      stateRef.current.posY = bounds.y
    }
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

    void (async () => {
      const [data, bounds, workArea] = await Promise.all([
        window.petAPI.getGame(),
        window.petAPI.getBounds(),
        window.petAPI.getWorkArea()
      ])
      stateRef.current.workArea = workArea
      if (bounds) {
        applyBounds(bounds)
      } else {
        const size = data.pet ? desktopRenderSize(data.pet).canvasSize : DEFAULT_SIZE
        stateRef.current.posX = workArea.x + workArea.width / 2 - size / 2
        stateRef.current.posY = workArea.y + workArea.height - size - 48
      }
      setSave(data)
    })()

    const unsubGame = window.petAPI.onGameUpdated(setSave)
    const unsubDrag = window.petAPI.onDragEnded((bounds) => {
      stateRef.current.dragging = false
      document.body.style.cursor = 'grab'
      applyBounds(bounds)
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

    const WALK_SPEED = 2.5

    let raf = 0
    let moveInFlight = false
    let lastSentX = Number.NaN
    let lastSentY = Number.NaN
    const tick = () => {
      const s = stateRef.current
      s.frame++
      const activePet = save?.pet

      if (activePet && activePet.stage !== 'egg' && !s.dragging) {
        s.posX += s.velocityX > 0 ? WALK_SPEED : -WALK_SPEED
        const left = s.workArea.x + 8
        const right = s.workArea.x + s.workArea.width - canvasSize - 8
        if (s.posX <= left) {
          s.posX = left
          s.velocityX = Math.abs(WALK_SPEED)
          s.animState = 'walk_right'
        } else if (s.posX >= right) {
          s.posX = right
          s.velocityX = -Math.abs(WALK_SPEED)
          s.animState = 'walk_left'
        } else {
          s.animState = s.velocityX > 0 ? 'walk_right' : 'walk_left'
        }
        const soft = clampPetPos(s.posX, s.posY, canvasSize, s.workArea, false)
        s.posX = soft.x
        s.posY = soft.y
        const pixel = clampPetPos(s.posX, s.posY, canvasSize, s.workArea, true)
        if (!moveInFlight && (pixel.x !== lastSentX || pixel.y !== lastSentY)) {
          moveInFlight = true
          lastSentX = pixel.x
          lastSentY = pixel.y
          void window.petAPI.move(pixel.x, pixel.y).then(() => {
            moveInFlight = false
          })
        }
      } else if (s.dragging) {
        s.animState = 'idle'
      }

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
        const cy = Math.round(canvasSize / 2 + bob)

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
    tick()
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
