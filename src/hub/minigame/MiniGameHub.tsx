import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave, MinigameId } from '../../shared/types'
import {
  MINIGAME_DAILY_ITEM_LIMIT,
  MINIGAME_REGISTRY,
  getMinigameDefinition,
  minigameItemsLeft
} from '../../shared/minigame'
import { ITEM_ICON_SRC } from '../../shared/itemIcons'
import { tItemLabel } from '../../i18n/labels'
import { DinoJumpGame } from './dino-jump/DinoJumpGame'

interface Props {
  save: GameSave
  onUpdated: () => void
  onOpenRanking: () => void
}

export function MiniGameHub({ save, onUpdated, onOpenRanking }: Props) {
  const { t } = useTranslation()
  const [activeGame, setActiveGame] = useState<MinigameId | null>(null)

  if (activeGame === 'dino_jump') {
    return (
      <DinoJumpGame save={save} onUpdated={onUpdated} onBack={() => setActiveGame(null)} />
    )
  }

  return (
    <div className="minigame-hub">
      <div className="card minigame-hub-header">
        <div>
          <h2>{t('minigame.title')}</h2>
          <p className="pixel-muted-text">{t('minigame.subtitle')}</p>
        </div>
        <button type="button" className="secondary" onClick={onOpenRanking}>
          {t('tabs.ranking')}
        </button>
      </div>

      <div className="minigame-grid">
        {MINIGAME_REGISTRY.map((game) => {
          const def = getMinigameDefinition(game.id)
          const itemsLeft = minigameItemsLeft(save, game.id)
          const best = save.minigame?.bestScores[game.id] ?? 0
          return (
            <article key={game.id} className="card minigame-card">
              <h3>{t(game.titleKey)}</h3>
              <p className="pixel-muted-text">{t(game.descriptionKey)}</p>
              <div className="minigame-card-reward">
                {(def?.rewardPool ?? []).map((type) => (
                  <img
                    key={type}
                    className="hud-icon minigame-card-reward-icon"
                    src={ITEM_ICON_SRC[type]}
                    alt={tItemLabel(type)}
                    title={tItemLabel(type)}
                    draggable={false}
                  />
                ))}
                <span>
                  {t('minigame.rewardItems', {
                    items: (def?.rewardPool ?? []).map((type) => tItemLabel(type)).join(', ')
                  })}
                </span>
              </div>
              <ul className="minigame-card-stats">
                <li>{t('minigame.itemsLeft', { left: itemsLeft, total: MINIGAME_DAILY_ITEM_LIMIT })}</li>
                <li>{t('minigame.scoreThreshold1000', { score: def?.scoreThreshold ?? 1000 })}</li>
                <li>{t('minigame.yourBest', { score: best })}</li>
              </ul>
              <button type="button" className="primary" onClick={() => setActiveGame(game.id)}>
                {t('minigame.start')}
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
