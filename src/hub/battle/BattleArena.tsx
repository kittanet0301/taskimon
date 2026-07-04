import { useState } from 'react'
import type { BattleActionType, BattleSession } from '../../shared/battle/types'
import type { BattleTurn } from '../../shared/battle/types'
import { ULTIMATE_ENERGY_MAX } from '../../shared/battle/constants'

interface Props {
  session: BattleSession
  turns: BattleTurn[]
  userId: string
  challengerName?: string
  defenderName?: string
  onAction: (action: BattleActionType) => Promise<void>
}

function HpBar({ label, hp, hpStart, color }: { label: string; hp: number; hpStart: number; color: string }) {
  const pct = hpStart > 0 ? Math.max(0, Math.min(100, (hp / hpStart) * 100)) : 0
  return (
    <div className="hp-bar">
      <div className="hp-bar-label">
        <span>{label}</span>
        <span>{hp} / {hpStart}</span>
      </div>
      <div className="hp-bar-track">
        <div className="hp-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function EnergyBar({ energy }: { energy: number }) {
  const pct = Math.max(0, Math.min(100, energy))
  const ready = pct >= ULTIMATE_ENERGY_MAX
  return (
    <div className="energy-bar">
      <div className="hp-bar-label">
        <span>พลังท่าไม้ตาย</span>
        <span>{pct}% {ready ? '· พร้อมใช้!' : ''}</span>
      </div>
      <div className="hp-bar-track energy-bar-track">
        <div
          className={`hp-bar-fill energy-bar-fill ${ready ? 'ready' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function BattleArena({ session, turns, userId, challengerName, defenderName, onAction }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const isChallenger = session.challengerUserId === userId
  const myTurn = session.turnUserId === userId && session.status === 'active'
  const myEnergy = isChallenger ? session.challengerEnergy : session.defenderEnergy
  const ultimateReady = myEnergy >= ULTIMATE_ENERGY_MAX

  const act = async (action: BattleActionType) => {
    if (!myTurn || submitting) return
    if (action === 'ultimate' && !ultimateReady) return
    setSubmitting(true)
    try {
      await onAction(action)
    } finally {
      setSubmitting(false)
    }
  }

  const statusLabel =
    session.status === 'active'
      ? myTurn
        ? 'ถึงตาคุณ!'
        : 'รอคู่ต่อสู้...'
      : session.status === 'completed'
        ? 'จบการต่อสู้'
        : session.status === 'fled'
          ? 'มีคนหลบหนี'
          : session.status

  return (
    <div className="battle-arena card">
      <h3>สนามต่อสู้</h3>
      <p><strong>{statusLabel}</strong></p>

      <HpBar
        label={challengerName ?? 'ผู้ท้า'}
        hp={session.challengerHp}
        hpStart={session.challengerHpStart}
        color="#6366f1"
      />
      <HpBar
        label={defenderName ?? 'ผู้รับท้า'}
        hp={session.defenderHp}
        hpStart={session.defenderHpStart}
        color="#ef4444"
      />

      {session.status === 'active' && (
        <>
          <EnergyBar energy={myEnergy} />
          <div className="battle-actions">
            <button type="button" className="primary" disabled={!myTurn || submitting} onClick={() => void act('attack')}>
              โจมตี
            </button>
            <button
              type="button"
              className={`primary ${ultimateReady ? 'ultimate-ready' : ''}`}
              disabled={!myTurn || submitting || !ultimateReady}
              onClick={() => void act('ultimate')}
              title={ultimateReady ? 'ใช้ท่าไม้ตาย' : `ต้องการพลัง ${ULTIMATE_ENERGY_MAX}% (ตอนนี้ ${myEnergy}%)`}
            >
              ท่าไม้ตาย
            </button>
            <button type="button" className="secondary" disabled={!myTurn || submitting} onClick={() => void act('defend')}>
              ป้องกัน
            </button>
            <button type="button" className="secondary" disabled={!myTurn || submitting} onClick={() => void act('flee')}>
              หลบหนี
            </button>
          </div>
          {!ultimateReady && myTurn && (
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
              โจมตีหรือป้องกันเพื่อสะสมพลังท่าไม้ตาย
            </p>
          )}
        </>
      )}

      {turns.length > 0 && (
        <div className="battle-log" style={{ marginTop: 12 }}>
          {turns.map((t) => (
            <div key={t.id}>{t.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
