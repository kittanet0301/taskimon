import { useEffect, useRef } from 'react'
import type { GameSave } from '../../../shared/types'
import { DINO_FRAMES_PER_SPRITE_FRAME } from '../../../shared/dinoTiming'
import {
  drawPetSpriteFrame,
  loadPetSprite,
  petSpriteUrl,
  pixelScaleForPet,
  setupCrispCanvas
} from '../../../shared/petSprites'
import {
  CANVAS_H,
  CANVAS_W,
  createJumpState,
  DINO_H,
  DINO_W,
  DINO_X,
  GROUND_Y,
  getScore,
  tickJumpState,
  type JumpState
} from './dinoJumpPhysics'

interface Props {
  save: GameSave
  running: boolean
  onDistanceChange: (distanceRan: number, score: number) => void
  onGameOver: (score: number) => void
}

export function DinoJumpCanvas({ save, running, onDistanceChange, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<JumpState>(createJumpState())
  const jumpQueuedRef = useRef(false)
  const frameRef = useRef(0)
  const reportedOverRef = useRef(false)
  const onDistanceChangeRef = useRef(onDistanceChange)
  const onGameOverRef = useRef(onGameOver)

  onDistanceChangeRef.current = onDistanceChange
  onGameOverRef.current = onGameOver

  useEffect(() => {
    if (running) {
      stateRef.current = createJumpState()
      jumpQueuedRef.current = false
      frameRef.current = 0
      reportedOverRef.current = false
    }
  }, [running])

  useEffect(() => {
    if (!running) return

    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      if (e.key === ' ' || e.key === 'ArrowUp') {
        jumpQueuedRef.current = true
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [running])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !running) return

    const pet = save.pet
    const ctx = setupCrispCanvas(canvas, CANVAS_W, CANVAS_H, false)
    ctx.imageSmoothingEnabled = false

    const spriteUrl = pet ? petSpriteUrl(pet, pet.stage === 'egg' ? 'egg' : 'base', 'move') : ''
    let spriteImg: HTMLImageElement | null = null
    void loadPetSprite(spriteUrl)
      .then((img) => {
        spriteImg = img
      })
      .catch(() => {
        spriteImg = null
      })

    let raf = 0
    const tick = () => {
      frameRef.current += 1
      const jump = jumpQueuedRef.current
      jumpQueuedRef.current = false

      stateRef.current = tickJumpState(stateRef.current, jump)
      const state = stateRef.current
      const score = getScore(state.distanceRan)
      onDistanceChangeRef.current(state.distanceRan, score)

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      sky.addColorStop(0, '#8fd3ff')
      sky.addColorStop(1, '#dff6ff')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      const groundScroll = state.distanceRan % 48
      ctx.fillStyle = '#6db04f'
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y)
      ctx.fillStyle = '#4f8f38'
      for (let x = -groundScroll; x < CANVAS_W; x += 48) {
        ctx.fillRect(x, GROUND_Y + 18, 24, 6)
      }

      ctx.fillStyle = '#5a3824'
      for (const obstacle of state.obstacles) {
        const top = GROUND_Y - obstacle.h
        ctx.fillRect(obstacle.x, top, obstacle.w, obstacle.h)
        ctx.fillStyle = '#7a4f2f'
        ctx.fillRect(obstacle.x + 4, top + 4, obstacle.w - 8, 8)
        ctx.fillStyle = '#5a3824'
      }

      if (pet && spriteImg) {
        const scale = pixelScaleForPet(pet)
        drawPetSpriteFrame(ctx, spriteImg, Math.floor(frameRef.current / DINO_FRAMES_PER_SPRITE_FRAME), pet.character, {
          x: DINO_X,
          y: Math.round(state.dinoY),
          pixelScale: Math.max(3, Math.round((DINO_H / 24) * (scale / 4))),
          flipX: false
        })
      } else {
        ctx.fillStyle = '#e8789a'
        ctx.fillRect(DINO_X, state.dinoY, DINO_W, DINO_H)
      }

      ctx.fillStyle = '#535353'
      ctx.font = 'bold 14px "Press Start 2P", "Mali", monospace'
      ctx.textAlign = 'right'
      const scoreText = String(score).padStart(5, '0')
      ctx.fillText(scoreText, CANVAS_W - 16, 28)

      if (state.dead && !reportedOverRef.current) {
        reportedOverRef.current = true
        onGameOverRef.current(score)
      }

      raf = requestAnimationFrame(tick)
    }

    tick()
    return () => cancelAnimationFrame(raf)
  }, [running, save.pet])

  return (
    <canvas
      ref={canvasRef}
      className="minigame-canvas dino-sprite-canvas"
      width={CANVAS_W}
      height={CANVAS_H}
      onPointerDown={() => {
        if (running) jumpQueuedRef.current = true
      }}
      aria-label="Dino jump mini-game"
    />
  )
}
