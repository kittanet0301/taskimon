import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave } from '../shared/types'
import {
  formatDailyResetCountdown,
  getMissionDefinition,
  isEggRewardMission
} from '../shared/missions'
import { canAddPet } from '../shared/petCollection'
import { tMissionReward, tMissionTitle } from '../i18n/labels'

interface Props {
  save: GameSave
  onUpdated: () => void
}

export function Missions({ save, onUpdated }: Props) {
  const { t } = useTranslation()
  const [resetLabel, setResetLabel] = useState(() => formatDailyResetCountdown())
  const [claimMessage, setClaimMessage] = useState<string | null>(null)

  useEffect(() => {
    setResetLabel(formatDailyResetCountdown())
    const id = setInterval(() => setResetLabel(formatDailyResetCountdown()), 60_000)
    return () => clearInterval(id)
  }, [save.missions])

  useEffect(() => {
    if (!claimMessage) return
    const id = setTimeout(() => setClaimMessage(null), 4000)
    return () => clearTimeout(id)
  }, [claimMessage])

  const claim = async (missionId: string) => {
    const before = save.missions.find((m) => m.missionId === missionId)
    const next = await window.electronAPI.patchGame('claimMission', [missionId])
    const after = next.missions.find((m) => m.missionId === missionId)

    if (before?.completed && after && !after.completed && after.progress === 0) {
      const def = getMissionDefinition(missionId)
      if (def && 'newEgg' in def.reward) {
        setClaimMessage(t('missions.claimSuccessEgg'))
      } else if (def && 'slots' in def.reward) {
        setClaimMessage(t('missions.claimSuccessSlots', { count: def.reward.slots }))
      } else {
        setClaimMessage(t('missions.claimSuccess'))
      }
    } else if (isEggRewardMission(missionId) && !canAddPet(save)) {
      setClaimMessage(t('collection.noSlots'))
    } else {
      setClaimMessage(t('missions.claimFailed'))
    }

    onUpdated()
  }

  return (
    <div className="card">
      <h2>{t('missions.title')}</h2>
      <p className="dash-reset-hint">{resetLabel}</p>
      {claimMessage && <p className="mission-claim-toast">{claimMessage}</p>}
      {save.missions.map((mission) => {
        const def = getMissionDefinition(mission.missionId)
        if (!def) return null
        const slotsFull = isEggRewardMission(mission.missionId) && !canAddPet(save)
        const canClaim = mission.completed && !slotsFull
        return (
          <div key={mission.missionId} className="mission-item">
            <div>
              <strong>{tMissionTitle(def.id)}</strong>
              <div className="pixel-muted-text">
                {def.kind === 'daily' ? t('missions.kindDaily') : t('missions.kindWeekly')} · {mission.progress}/{def.target}
              </div>
              <div className="pixel-muted-text">
                {t('missions.rewardLabel', { reward: tMissionReward(def) })}
              </div>
              {slotsFull && mission.completed && (
                <div className="pixel-muted-text">{t('collection.noSlots')}</div>
              )}
            </div>
            <button
              className="primary"
              disabled={!canClaim}
              onClick={() => claim(mission.missionId)}
            >
              {mission.completed ? (slotsFull ? t('collection.noSlots') : t('missions.claimReward')) : t('missions.notCompleted')}
            </button>
          </div>
        )
      })}
    </div>
  )
}
