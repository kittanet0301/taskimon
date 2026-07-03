import { useEffect, useState } from 'react'
import type { GameSave, ItemType, PetData } from '../shared/types'
import { ELEMENT_COLORS, ELEMENT_NAMES, SPECIES_NAMES } from '../shared/constants'
import { getActivityScore, getPetLevel, getStageLabel } from '../shared/activityScore'
import { canEvolveToAdult } from '../shared/stats'
import { formatDailyResetCountdown, getMissionDefinition } from '../shared/missions'
import { ITEMS, QUICK_CARE_ITEMS } from '../shared/items'
import { EggHatch } from './EggHatch'

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
  const evolve = async () => {
    await window.electronAPI.patchGame('evolve')
    onUpdated()
  }

  return (
    <div className="card dash-pet-card">
      <div className="dash-pet-header">
        <div>
          <h2 style={{ margin: 0 }}>{pet.name}</h2>
          <p className="dash-pet-meta">
            Lv.{getPetLevel(pet.stage, pet.stats.devPoints)} · {getStageLabel(pet.stage)} ·{' '}
            {SPECIES_NAMES[pet.species]}
          </p>
        </div>
        <span className="tag" style={{ background: ELEMENT_COLORS[pet.element], color: '#fff' }}>
          {ELEMENT_NAMES[pet.element]}
        </span>
      </div>
      <div
        className="pet-preview dash-pet-sprite"
        style={{ background: ELEMENT_COLORS[pet.element] }}
      >
        {pet.stage === 'egg' ? '🥚' : pet.stage === 'baby' ? '🐣' : '🐉'}
      </div>
      <StatBar label="Health" value={pet.stats.hp} color="#22c55e" />
      <StatBar label="Emotion" value={pet.stats.mood} color="#6366f1" />
      <StatBar
        label="Evolution"
        value={pet.stats.devPoints}
        max={500}
        color="#f59e0b"
      />
      {pet.stage === 'baby' && (
        <button
          className="primary"
          style={{ width: '100%', marginTop: 12 }}
          onClick={evolve}
          disabled={!canEvolveToAdult(pet)}
        >
          {canEvolveToAdult(pet) ? 'วิวัฒนาการ → Adult' : 'วิวัฒนาการ (ต้องการพัฒนาร่าง 500+)'}
        </button>
      )}
    </div>
  )
}

function ActivityCard({ save }: { save: GameSave }) {
  const score = getActivityScore(save.activity)
  return (
    <div className="card dash-activity-card">
      <h3 className="dash-section-title">Today&apos;s Activity</h3>
      <div className="dash-activity-grid">
        <div className="dash-activity-stat">
          <span className="dash-activity-icon">🖱️</span>
          <div>
            <div className="dash-activity-value">{save.activity.clicks}</div>
            <div className="dash-activity-label">Mouse Clicks</div>
          </div>
        </div>
        <div className="dash-activity-stat">
          <span className="dash-activity-icon">⌨️</span>
          <div>
            <div className="dash-activity-value">{save.activity.keystrokes}</div>
            <div className="dash-activity-label">Words Typed</div>
          </div>
        </div>
        <div className="dash-activity-stat dash-activity-score">
          <span className="dash-activity-icon">⚡</span>
          <div>
            <div className="dash-activity-value">{score}</div>
            <div className="dash-activity-label">Activity Score</div>
          </div>
        </div>
      </div>
      <p className="dash-activity-hint">
        คะแนน = คลิก + พิมพ์÷10 · สูงสุด {save.activity.devPointsThisHour}/10 พัฒนาร่าง/ชม.
      </p>
    </div>
  )
}

function DailyMissionsPanel({ save, onUpdated }: { save: GameSave; onUpdated: () => void }) {
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
      <h3 className="dash-section-title">Daily Missions</h3>
      <p className="dash-reset-hint">{resetLabel}</p>
      {daily.length === 0 && <p>ไม่มีภารกิจ</p>}
      {daily.map((mission) => {
        const def = getMissionDefinition(mission.missionId)
        if (!def) return null
        const pct = Math.min(100, Math.round((mission.progress / def.target) * 100))
        return (
          <div key={mission.missionId} className="dash-mission-row">
            <div className="dash-mission-info">
              <strong>{def.title}</strong>
              <div className="bar" style={{ marginTop: 6 }}>
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
              {mission.completed ? 'Claim' : '...'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function QuickCare({ save, onUpdated }: { save: GameSave; onUpdated: () => void }) {
  const use = async (type: ItemType) => {
    const qty = save.inventory.find((i) => i.type === type)?.quantity ?? 0
    if (qty <= 0) return
    await window.electronAPI.patchGame('useItem', [type])
    onUpdated()
  }

  if (!save.pet || save.pet.stage === 'egg') return null

  return (
    <div className="card">
      <h3 className="dash-section-title">Quick Care</h3>
      <div className="quick-care-grid">
        {QUICK_CARE_ITEMS.map((item) => {
          const def = ITEMS[item.type]
          const qty = save.inventory.find((i) => i.type === item.type)?.quantity ?? 0
          return (
            <button
              key={item.type}
              className="quick-care-btn"
              disabled={qty <= 0}
              title={`${def.label} — ${def.description} · x${qty}`}
              onClick={() => use(item.type)}
            >
              <span className="quick-care-emoji">{item.emoji}</span>
              <span className="quick-care-label">{def.label}</span>
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
    return <EggHatch pet={save.pet} onHatched={onUpdated} />
  }

  return (
    <div className="dashboard">
      <div className="dashboard-top">
        <PetStatusCard pet={save.pet} onUpdated={onUpdated} />
        <ActivityCard save={save} />
      </div>
      <DailyMissionsPanel save={save} onUpdated={onUpdated} />
      <QuickCare save={save} onUpdated={onUpdated} />
    </div>
  )
}
