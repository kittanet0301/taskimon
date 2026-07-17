import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave } from '../shared/types'
import { getMissionDefinition, isEggRewardMission, type MissionKind } from '../shared/missions'
import { canAddPet } from '../shared/petCollection'
import { tMissionReward, tMissionTitle } from '../i18n/labels'

interface Props {
  save: GameSave
  onUpdated: () => void | Promise<void>
}

export function HomeMissionsPanel({ save, onUpdated }: Props) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<MissionKind>('daily')

  const claim = async (missionId: string) => {
    await window.electronAPI.patchGame('claimMission', [missionId])
    onUpdated()
  }

  const entries = save.missions
    .map((progress) => ({ progress, def: getMissionDefinition(progress.missionId) }))
    .filter((entry) => entry.def?.kind === kind)

  return (
    <section className="dash-hud-missions" aria-label={t('home.dailyMissions')}>
      <div className="dash-hud-missions-tabs">
        <button
          type="button"
          className={kind === 'daily' ? 'active' : ''}
          onClick={() => setKind('daily')}
        >
          {t('missions.kindDaily')}
        </button>
        <button
          type="button"
          className={kind === 'weekly' ? 'active' : ''}
          onClick={() => setKind('weekly')}
        >
          {t('missions.kindWeekly')}
        </button>
      </div>
      <div className="dash-hud-missions-body">
        {entries.length === 0 && <p className="dash-hud-missions-empty">{t('home.noMissions')}</p>}
        {entries.map(({ progress, def }) => {
          if (!def) return null
          const slotsFull = isEggRewardMission(def.id) && !canAddPet(save)
          const canClaim = progress.completed && !slotsFull
          return (
            <div key={def.id} className="dash-hud-mission-item">
              <div className="dash-hud-mission-info">
                <strong>{tMissionTitle(def.id)}</strong>
                <span>
                  {progress.progress}/{def.target} · {tMissionReward(def)}
                </span>
              </div>
              <button
                type="button"
                className="dash-hud-mission-claim"
                disabled={!canClaim}
                onClick={() => claim(def.id)}
              >
                {progress.completed ? (slotsFull ? t('collection.noSlots') : t('home.claim')) : t('missions.notCompleted')}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
