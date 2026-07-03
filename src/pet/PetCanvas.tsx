import { useEffect, useRef, useState } from 'react'
import type { AnimationState, GameSave, PetData } from '../shared/types'
import { ELEMENT_COLORS } from '../shared/constants'
import { getMoodLabel, shouldBeSick } from '../shared/stats'

const SIZE = 96
const PET_BODY = 48

function resolveAnimation(pet: PetData, frame: number, animState: AnimationState): AnimationState {
  if (pet.stage === 'egg') return pet.animationState === 'egg_hatch' ? 'egg_hatch' : 'egg_idle'
  if (pet.animationState === 'eat' || pet.animationState === 'sleep' || pet.animationState === 'evolve') {
    return pet.animationState
  }
  if (shouldBeSick(pet.stats)) return 'sick'
  const mood = getMoodLabel(pet.stats.mood)
  if (mood === 'happy') return frame % 120 < 30 ? 'happy' : animState.includes('walk') ? animState : 'idle'
  if (mood === 'sad') return 'sad'
  return animState
}

function drawPet(
  ctx: CanvasRenderingContext2D,
  pet: PetData,
  frame: number,
  animState: AnimationState
): void {
  ctx.clearRect(0, 0, SIZE, SIZE)
  const state = resolveAnimation(pet, frame, animState)
  const color = ELEMENT_COLORS[pet.element]
  const cx = SIZE / 2
  const cy = SIZE / 2 + Math.sin(frame / 10) * (state === 'walk_left' || state === 'walk_right' ? 2 : 4)
  const scale = pet.stage === 'baby' ? 0.85 : pet.stage === 'egg' ? 0.7 : 1

  if (pet.stage === 'egg') {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(cx, cy, 18 * scale, 22 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  const bodyW = PET_BODY * scale
  const bodyH = PET_BODY * scale
  const x = cx - bodyW / 2
  const y = cy - bodyH / 2
  ctx.fillStyle = color
  ctx.fillRect(x, y, bodyW, bodyH)
  ctx.fillStyle = '#fff'
  ctx.fillRect(x + 10, y + 14, 6, 6)
  ctx.fillRect(x + bodyW - 16, y + 14, 6, 6)

  if (state === 'eat') {
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(x + bodyW + 4, y + 18, 8, 8)
  }
  if (state === 'sleep') {
    ctx.fillStyle = '#fff'
    ctx.font = '12px sans-serif'
    ctx.fillText('z', x + bodyW + 2, y + 4)
  }
}

export function PetCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [save, setSave] = useState<GameSave | null>(null)
  const stateRef = useRef({
    frame: 0,
    posX: 200,
    posY: 200,
    velocityX: 1.2,
    animState: 'idle' as AnimationState,
    dragging: false
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
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const tick = () => {
      const s = stateRef.current
      s.frame++
      if (save?.pet && save.pet.stage !== 'egg' && !s.dragging) {
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
      if (save?.pet) drawPet(ctx, save.pet, s.frame, s.animState)
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
      width={SIZE}
      height={SIZE}
      style={{ display: 'block', background: 'transparent' }}
      onMouseEnter={() => window.petAPI.setIgnoreMouse(false)}
      onMouseLeave={() => window.petAPI.setIgnoreMouse(true)}
    />
  )
}
