import { useEffect, useRef, useState } from 'react'
import type { AnimationState, GameSave } from '../shared/types'
import { petPreviewColor } from '../shared/constants'
import { resolvePetClip } from '../shared/dinoAnim'
import {
  DINO_BOB_PERIOD,
  DINO_BOB_PERIOD_EGG,
  DINO_WALK_SPEED
} from '../shared/dinoTiming'
import {
  displaySizeForPet,
  drawPetSpriteFrame,
  frameSizeForPet,
  loadPetSprite,
  petSpriteUrl,
  preloadPetSprites,
  setupCrispCanvas,
  spriteFrameIndexForClip
} from '../shared/petSprites'
import type { PetSpriteFolder } from '../shared/petSprites'

const DEFAULT_SIZE = 96

const PET_CLIPS: Array<{ folder: PetSpriteFolder; clip: string }> = [
  { folder: 'base', clip: 'idle' },
  { folder: 'base', clip: 'move' },
  { folder: 'base', clip: 'hurt' },
  { folder: 'base', clip: 'bite' },
  { folder: 'base', clip: 'jump' },
  { folder: 'egg', clip: 'move' },
  { folder: 'egg', clip: 'hatch' }
]

export function PetCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [save, setSave] = useState<GameSave | null>(null)
  const stateRef = useRef({
    frame: 0,
    posX: 200,
    posY: 200,
    velocityX: DINO_WALK_SPEED,
    animState: 'idle' as AnimationState,
    dragging: false,
    spriteUrl: '',
    spriteImg: null as HTMLImageElement | null
  })

  const pet = save?.pet
  const canvasSize = pet ? displaySizeForPet(pet) : DEFAULT_SIZE

  useEffect(() => {
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'

    window.petAPI.getGame().then((data) => {
      setSave(data)
      const size = data.pet ? displaySizeForPet(data.pet) : DEFAULT_SIZE
      stateRef.current.posX = window.screen.availWidth / 2 - size / 2
      stateRef.current.posY = window.screen.availHeight - size - 48
    })
    return window.petAPI.onGameUpdated(setSave)
  }, [])

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
    const tick = async () => {
      const s = stateRef.current
      s.frame++
      const activePet = save?.pet

      if (activePet && activePet.stage !== 'egg' && !s.dragging) {
        s.posX += s.velocityX
        const left = 8
        const right = window.screen.availWidth - canvasSize - 8
        if (s.posX <= left) {
          s.posX = left
          s.velocityX = Math.abs(s.velocityX)
          s.animState = 'walk_right'
        } else if (s.posX >= right) {
          s.posX = right
          s.velocityX = -Math.abs(s.velocityX)
          s.animState = 'walk_left'
        } else {
          s.animState = s.velocityX > 0 ? 'walk_right' : 'walk_left'
        }
      }

      if (activePet) {
        const clip = resolvePetClip(activePet, s.frame, s.animState)
        const url = petSpriteUrl(activePet, clip.folder, clip.clip)
        if (url !== s.spriteUrl) {
          s.spriteUrl = url
          try {
            s.spriteImg = await loadPetSprite(url)
          } catch {
            s.spriteImg = null
          }
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
        const drawSize = displaySizeForPet(activePet)
        const pixelScale = drawSize / frameSizeForPet(activePet)

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
      }

      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [save, canvasSize])

  useEffect(() => {
    const setIgnore = (ignore: boolean) => window.petAPI.setIgnoreMouse(ignore)
    setIgnore(true)
    const onDblClick = () => {
      if (save?.pet && save.pet.stage !== 'egg') window.petAPI.patchGame('useItem', ['toy'])
    }
    const onContext = (e: MouseEvent) => {
      e.preventDefault()
      window.petAPI.openHub()
    }
    window.addEventListener('dblclick', onDblClick)
    window.addEventListener('contextmenu', onContext)
    return () => {
      window.removeEventListener('dblclick', onDblClick)
      window.removeEventListener('contextmenu', onContext)
    }
  }, [save])

  return (
    <canvas
      ref={canvasRef}
      className="dino-sprite-canvas"
      style={{ display: 'block', background: 'transparent' }}
      onMouseEnter={() => window.petAPI.setIgnoreMouse(false)}
      onMouseLeave={() => window.petAPI.setIgnoreMouse(true)}
    />
  )
}
