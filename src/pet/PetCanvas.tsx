import { useEffect, useRef, useState } from 'react'
import type { AnimationState, GameSave } from '../shared/types'
import { DINO_PREVIEW_COLORS } from '../shared/constants'
import { resolveDinoClip } from '../shared/dinoAnim'
import {
  DINO_BOB_PERIOD,
  DINO_BOB_PERIOD_EGG,
  DINO_FRAMES_PER_SPRITE_FRAME,
  DINO_WALK_SPEED
} from '../shared/dinoTiming'

import {
  drawDinoSpriteFrame,
  dinoSpriteUrl,
  loadDinoSprite,
  pixelScaleForStage,
  preloadDinoSprites,
  setupCrispCanvas
} from '../shared/dinoSprites'

const SIZE = 96

const PET_CLIPS = [
  { folder: 'base' as const, clip: 'idle' },
  { folder: 'base' as const, clip: 'move' },
  { folder: 'base' as const, clip: 'hurt' },
  { folder: 'base' as const, clip: 'bite' },
  { folder: 'base' as const, clip: 'jump' },
  { folder: 'egg' as const, clip: 'move' },
  { folder: 'egg' as const, clip: 'crack' },
  { folder: 'egg' as const, clip: 'hatch' }
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

  useEffect(() => {
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'

    window.petAPI.getGame().then((data) => {
      setSave(data)
      stateRef.current.posX = window.screen.availWidth / 2 - SIZE / 2
      stateRef.current.posY = window.screen.availHeight - SIZE - 48
    })
    return window.petAPI.onGameUpdated(setSave)
  }, [])

  useEffect(() => {
    const pet = save?.pet
    if (!pet) return
    const urls = PET_CLIPS.map(({ folder, clip }) =>
      dinoSpriteUrl(pet.gender, pet.character, folder, clip)
    )
    void preloadDinoSprites(urls)
    stateRef.current.spriteUrl = ''
    stateRef.current.spriteImg = null
  }, [save?.pet?.gender, save?.pet?.character])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = setupCrispCanvas(canvas, SIZE)

    let raf = 0
    const tick = async () => {
      const s = stateRef.current
      s.frame++
      const pet = save?.pet

      if (pet && pet.stage !== 'egg' && !s.dragging) {
        s.posX += s.velocityX
        const left = 8
        const right = window.screen.availWidth - SIZE - 8
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

      if (pet) {
        const clip = resolveDinoClip(pet, s.frame, s.animState)
        const url = dinoSpriteUrl(pet.gender, pet.character, clip.folder, clip.clip)
        if (url !== s.spriteUrl) {
          s.spriteUrl = url
          try {
            s.spriteImg = await loadDinoSprite(url)
          } catch {
            s.spriteImg = null
          }
        }

        ctx.clearRect(0, 0, SIZE, SIZE)
        const bob =
          pet.stage === 'egg'
            ? Math.round(Math.sin(s.frame / DINO_BOB_PERIOD_EGG) * 2)
            : s.animState.includes('walk')
              ? Math.round(Math.sin(s.frame / DINO_BOB_PERIOD) * 2)
              : Math.round(Math.sin(s.frame / DINO_BOB_PERIOD) * 3)
        const cx = Math.round(SIZE / 2)
        const cy = Math.round(SIZE / 2 + bob)
        const pixelScale = pixelScaleForStage(pet.stage)

        if (s.spriteImg) {
          drawDinoSpriteFrame(ctx, s.spriteImg, Math.floor(s.frame / DINO_FRAMES_PER_SPRITE_FRAME), {
            x: cx,
            y: cy,
            pixelScale,
            flipX: clip.flipX
          })
        } else {
          ctx.fillStyle = DINO_PREVIEW_COLORS[pet.character]
          ctx.beginPath()
          ctx.arc(cx, cy, pixelScale * 8, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [save])

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
