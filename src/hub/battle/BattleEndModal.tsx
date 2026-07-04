import type { BattleSession, BattleTurn } from '../../shared/battle/types'

interface Props {
  session: BattleSession
  turns: BattleTurn[]
  userId: string
  onClose: () => void
}

function getWinnerName(turns: BattleTurn[]): string | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const msg = turns[i].message
    if (msg.startsWith('ผู้ชนะ:')) return msg.replace('ผู้ชนะ:', '').trim()
  }
  return null
}

export function BattleEndModal({ session, turns, userId, onClose }: Props) {
  const winnerName = getWinnerName(turns)
  const isWinner = session.winnerUserId === userId
  const fledSelf = session.status === 'fled' && session.fledUserId === userId

  let title: string
  let subtitle: string

  if (session.status === 'fled') {
    if (fledSelf) {
      title = 'คุณหลบหนี'
      subtitle = 'ถือว่าแพ้การต่อสู้'
    } else {
      title = 'คุณชนะ!'
      subtitle = 'คู่ต่อสู้หลบหนีจากการต่อสู้'
    }
  } else if (isWinner) {
    title = 'คุณชนะ!'
    subtitle = 'ชนะการดวลนี้'
  } else {
    title = 'คุณแพ้'
    subtitle = winnerName ? `ผู้ชนะ: ${winnerName}` : 'ลองใหม่ในดวลถัดไป'
  }

  return (
    <div className="battle-end-overlay" role="dialog" aria-modal="true">
      <div className="battle-end-modal card">
        <h3 className={`battle-end-title ${isWinner && !fledSelf ? 'win' : fledSelf || !isWinner ? 'lose' : ''}`}>
          {title}
        </h3>
        <p className="battle-end-subtitle">{subtitle}</p>

        {turns.length > 0 && (
          <div className="battle-log battle-end-log">
            {turns.slice(-5).map((t) => (
              <div key={t.id}>{t.message}</div>
            ))}
          </div>
        )}

        <button type="button" className="primary" onClick={onClose} style={{ marginTop: 16, width: '100%' }}>
          กลับไปห้อง
        </button>
      </div>
    </div>
  )
}
