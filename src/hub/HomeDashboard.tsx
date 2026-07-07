import { useEffect, useRef, useState } from 'react'
import type { GameSave } from '../shared/types'
import { DinoSprite } from '../components/DinoSprite'
import {
  coverImagePointToPercent,
  DASH_BG_HEIGHT,
  DASH_BG_WIDTH,
  DASH_SCENE_ANCHORS,
  dashSpriteSize
} from './dashSceneLayout'

interface Props {
  save: GameSave
  onUpdated: () => void
}

export function HomeDashboard({ save }: Props) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const pet = save.pet
  const isEgg = pet?.stage === 'egg'
  const sceneKey = isEgg ? 'egg' : 'pedestal'
  const [layout, setLayout] = useState({ leftPct: 50, topPct: 50, spriteSize: 96 })

  useEffect(() => {
    const el = sceneRef.current
    if (!el || !pet) return

    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width === 0 || height === 0) return
      const anchor = DASH_SCENE_ANCHORS[sceneKey]
      const pos = coverImagePointToPercent(
        width,
        height,
        DASH_BG_WIDTH,
        DASH_BG_HEIGHT,
        anchor.x,
        anchor.y
      )
      setLayout({
        leftPct: pos.leftPct,
        topPct: pos.topPct,
        spriteSize: dashSpriteSize(width, isEgg)
      })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sceneKey, isEgg, pet])

  if (!pet) return null

  return (
    <div className="dash-scene-wrap">
      <div ref={sceneRef} className={`dash-scene dash-scene--${sceneKey}`}>
        <img
          src={isEgg ? '/ui/dash-bg-egg.png' : '/ui/dash-bg-pedestal.png'}
          alt=""
          className="dash-scene-bg"
          width={DASH_BG_WIDTH}
          height={DASH_BG_HEIGHT}
          draggable={false}
        />
        <div
          className={`dash-scene-pet dash-scene-pet--${sceneKey}`}
          style={{ left: `${layout.leftPct}%`, top: `${layout.topPct}%` }}
        >
          <DinoSprite pet={pet} size={layout.spriteSize} />
        </div>
      </div>
    </div>
  )
}
