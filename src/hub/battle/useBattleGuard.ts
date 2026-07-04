import { useContext } from 'react'
import { BattleContext } from './BattleContext'

export function useBattleGuard() {
  const ctx = useContext(BattleContext)
  if (!ctx) {
    throw new Error('useBattleGuard must be used within BattleProvider')
  }

  const isInRoom = ctx.roomId != null && ctx.memberStatus !== 'left'

  return {
    isInRoom,
    confirmLeave: ctx.requestLeave,
    requestLeave: ctx.requestLeave
  }
}
