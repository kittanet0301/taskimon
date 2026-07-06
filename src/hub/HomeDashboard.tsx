import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave, ItemType, PetData } from '../shared/types'
import { DINO_PREVIEW_COLORS, DEV_POINTS_ADULT, ADULT_MIN_HOURS } from '../shared/constants'
import { DinoSprite } from '../components/DinoSprite'
import { GenderTag } from '../components/GenderTag'
import { getActivityScore, getPetLevel, getStageLabel } from '../shared/activityScore'
import { canEvolveToAdult } from '../shared/stats'
import { formatDailyResetCountdown, getMissionDefinition } from '../shared/missions'
import { QUICK_CARE_ITEMS } from '../shared/items'
import { EggHatch } from './EggHatch'
import { tCharacter, tItemDescription, tItemLabel, tMissionTitle } from '../i18n/labels'

interface Props {
  save: GameSave
  onUpdated: () => void
}

function StatBar({
  label,
  value,
  max = 100,
  color
}: {
  label: string
  value: number
  max?: number
  color: string
}) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="dash-stat">
      <div className="dash-stat-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="bar">
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function PetStatusCard({ pet, onUpdated }: { pet: PetData; onUpdated: () => void }) {
  const { t } = useTranslation()
  const evolve = async () => {
    await window.electronAPI.patchGame('evolve')
    onUpdated()
  }

  return (
    <div className="card dash-pet-card">
      <div className="dash-pet-header">
        <div>
          <h2 className="dash-pet-name">{pet.name}</h2>
          <p className="dash-pet-meta">
            Lv.{getPetLevel(pet.stage, pet.stats.devPoints)} · {getStageLabel(pet.stage)} ·{' '}
            {tCharacter(pet.character)}
          </p>
        </div>
        <GenderTag gender={pet.gender} />
      </div>
      <div
        className="pet-preview dash-pet-sprite"
        style={{ background: DINO_PREVIEW_COLORS[pet.character] }}
      >
        <DinoSprite pet={pet} size={96} />
      </div>
      <StatBar label={t('home.health')} value={pet.stats.hp} color="#22c55e" />
      <StatBar label={t('home.emotion')} value={pet.stats.mood} color="#6366f1" />
      <StatBar
        label={t('home.evolution')}
        value={pet.stats.devPoints}
        max={DEV_POINTS_ADULT}
        color="#f59e0b"
      />
      {pet.stage === 'baby' && (
        <button
          className="primary dash-evolve-btn"
          onClick={evolve}
          disabled={!canEvolveToAdult(pet)}
        >
          {canEvolveToAdult(pet)
            ? t('home.evolveAdult')
            : t('home.evolveLocked', { points: DEV_POINTS_ADULT, hours: ADULT_MIN_HOURS })}
        </button>
      )}
    </div>
  )
}

function ActivityCard({ save }: { save: GameSave }) {
  const { t } = useTranslation()
  const score = getActivityScore(save.activity)
  return (
    <div className="card dash-activity-card">
      <h3 className="dash-section-title">{t('home.todayActivity')}</h3>
      <div className="dash-activity-grid">
        <div className="dash-activity-stat">
          <span className="dash-activity-icon">🖱️</span>
          <div>
            <div className="dash-activity-value">{save.activity.clicks}</div>
            <div className="dash-activity-label">{t('home.clicks')}</div>
          </div>
        </div>
        <div className="dash-activity-stat">
          <span className="dash-activity-icon">⌨️</span>
          <div>
            <div className="dash-activity-value">{save.activity.keystrokes}</div>
            <div className="dash-activity-label">{t('home.typing')}</div>
          </div>
        </div>
        <div className="dash-activity-stat dash-activity-score">
          <span className="dash-activity-icon">⚡</span>
          <div>
            <div className="dash-activity-value">{score}</div>
            <div className="dash-activity-label">{t('home.activityScore')}</div>
          </div>
        </div>
      </div>
      <p className="dash-activity-hint">
        {t('home.activityFormula', { maxPerHour: save.activity.devPointsThisHour })}
      </p>
    </div>
  )
}

function DailyMissionsPanel({ save, onUpdated }: { save: GameSave; onUpdated: () => void }) {
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

  const daily = save.missions.filter((m) => getMissionDefinition(m.missionId)?.kind === 'daily')

  return (
    <div className="card">
      <h3 className="dash-section-title">{t('home.dailyMissions')}</h3>
      <p className="dash-reset-hint">{resetLabel}</p>
      {daily.length === 0 && <p>{t('home.noMissions')}</p>}
      {daily.map((mission) => {
        const def = getMissionDefinition(mission.missionId)
        if (!def) return null
        const pct = Math.min(100, Math.round((mission.progress / def.target) * 100))
        return (
          <div key={mission.missionId} className="dash-mission-row">
            <div className="dash-mission-info">
              <strong>{tMissionTitle(def.id)}</strong>
              <div className="bar dash-mission-bar">
                <span
                  style={{
                    width: `${pct}%`,
                    background: mission.completed ? '#22c55e' : '#6366f1'
                  }}
                />
              </div>
              <span className="dash-mission-progress">
                {mission.progress}/{def.target}
              </span>
            </div>
            <button
              className={mission.completed ? 'primary' : 'secondary'}
              disabled={!mission.completed}
              onClick={() => claim(mission.missionId)}
            >
              {mission.completed ? t('home.claim') : t('missions.notCompleted')}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function QuickCare({ save, onUpdated }: { save: GameSave; onUpdated: () => void }) {
  const { t } = useTranslation()
  const use = async (type: ItemType) => {
    const qty = save.inventory.find((i) => i.type === type)?.quantity ?? 0
    if (qty <= 0) return
    await window.electronAPI.patchGame('useItem', [type])
    onUpdated()
  }

  if (!save.pet || save.pet.stage === 'egg') return null

  return (
    <div className="card">
      <h3 className="dash-section-title">{t('home.quickCare')}</h3>
      <div className="quick-care-grid">
        {QUICK_CARE_ITEMS.map((item) => {
          const qty = save.inventory.find((i) => i.type === item.type)?.quantity ?? 0
          return (
            <button
              key={item.type}
              className="quick-care-btn"
              disabled={qty <= 0}
              title={`${tItemLabel(item.type)} - ${tItemDescription(item.type)} x${qty}`}
              onClick={() => use(item.type)}
            >
              <span className="quick-care-emoji">{item.emoji}</span>
              <span className="quick-care-label">{tItemLabel(item.type)}</span>
              <span className="quick-care-qty">x{qty}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function HomeDashboard({ save, onUpdated }: Props) {
  if (!save.pet) return null

  if (save.pet.stage === 'egg') {
    return (
      <div className="dashboard">
        <div className="dashboard-top">
          <EggHatch pet={save.pet} onHatched={onUpdated} />
          <ActivityCard save={save} />
        </div>
        <DailyMissionsPanel save={save} onUpdated={onUpdated} />
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-top">
        <PetStatusCard pet={save.pet} onUpdated={onUpdated} />
        <ActivityCard save={save} />
      </div>
      <QuickCare save={save} onUpdated={onUpdated} />
      <DailyMissionsPanel save={save} onUpdated={onUpdated} />
    </div>
  )
}
