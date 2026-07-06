import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave } from '../shared/types'
import { formatDailyResetCountdown, getMissionDefinition } from '../shared/missions'
import { tMissionTitle } from '../i18n/labels'

interface Props {
  save: GameSave
  onUpdated: () => void
}

export function Missions({ save, onUpdated }: Props) {
  const { t } = useTranslation()
  const [resetLabel, setResetLabel] = useState(() => formatDailyResetCountdown())

  useEffect(() => {
    setResetLabel(formatDailyResetCountdown())
    const id = setInterval(() => setResetLabel(formatDailyResetCountdown()), 60_000)
    return () => clearInterval(id)
  }, [save.missions])

  const claim = async (missionId: string) => {
    await window.electronAPI.patchGame('claimMission', [missionId])
    onUpdated()
  }

  return (
    <div className="card">
      <h2>{t('missions.title')}</h2>
      <p className="dash-reset-hint">{resetLabel}</p>
      {save.missions.map((mission) => {
        const def = getMissionDefinition(mission.missionId)
        if (!def) return null
        return (
          <div key={mission.missionId} className="mission-item">
            <div>
              <strong>{tMissionTitle(def.id)}</strong>
              <div className="pixel-muted-text">
                {def.kind === 'daily' ? t('missions.kindDaily') : t('missions.kindWeekly')} · {mission.progress}/{def.target}
              </div>
            </div>
            <button
              className="primary"
              disabled={!mission.completed}
              onClick={() => claim(mission.missionId)}
            >
              {mission.completed ? t('missions.claimReward') : t('missions.notCompleted')}
            </button>
          </div>
        )
      })}
    </div>
  )
}
