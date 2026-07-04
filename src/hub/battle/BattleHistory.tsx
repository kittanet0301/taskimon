import { useEffect, useState } from 'react'
import type { BattleSession } from '../../shared/battle/types'
import { mapBattleSession } from '../../shared/battle/mappers'

export function BattleHistory() {
  const [battles, setBattles] = useState<BattleSession[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
      if (!session?.user?.id) return
      setUserId(session.user.id)
      const rows = (await window.electronAPI.listBattles()) as Record<string, unknown>[]
      setBattles(
        rows
          .map(mapBattleSession)
          .filter((s) => ['completed', 'fled', 'declined', 'expired'].includes(s.status))
      )
    })()
  }, [])

  if (!userId) return null

  return (
    <div className="card">
      <h3>ประวัติการต่อสู้</h3>
      {battles.length === 0 ? (
        <p>ยังไม่มีประวัติ</p>
      ) : (
        <ul className="room-list">
          {battles.map((b) => {
            const won = b.winnerUserId === userId
            const fled = b.status === 'fled'
            const label =
              b.status === 'declined'
                ? 'ปฏิเสธ'
                : b.status === 'expired'
                  ? 'หมดเวลา'
                  : fled
                    ? b.fledUserId === userId
                      ? 'หลบหนี'
                      : 'คู่ต่อสู้หลบหนี'
                    : won
                      ? 'ชนะ'
                      : 'แพ้'
            return (
              <li key={b.id} className="room-list-item">
                <span>
                  <span className="tag">{label}</span>
                  {new Date(b.createdAt).toLocaleString('th-TH')}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  HP สุดท้าย {b.challengerHp} - {b.defenderHp}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
