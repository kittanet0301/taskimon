import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import type { BattleRoomMemberStatus } from '../../shared/battle/types'
import { LeaveRoomDialog } from './LeaveRoomDialog'

export interface BattleContextValue {
  userId: string | null
  syncUserId: (id: string | null) => void
  roomId: string | null
  setRoomId: (id: string | null) => void
  hostUserId: string | null
  setHostUserId: (id: string | null) => void
  myRole: 'host' | 'member' | null
  setMyRole: (role: 'host' | 'member' | null) => void
  memberStatus: BattleRoomMemberStatus | null
  setMemberStatus: (status: BattleRoomMemberStatus | null) => void
  activeSessionId: string | null
  setActiveSessionId: (id: string | null) => void
  requestLeave: () => Promise<boolean>
}

export const BattleContext = createContext<BattleContextValue | null>(null)

interface Props {
  children: ReactNode
}

export function BattleProvider({ children }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [hostUserId, setHostUserId] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<'host' | 'member' | null>(null)
  const [memberStatus, setMemberStatus] = useState<BattleRoomMemberStatus | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const pendingLeaveRef = useRef<{ resolve: (value: boolean) => void } | null>(null)

  useEffect(() => {
    ;(async () => {
      const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
      if (session?.user?.id) setUserId(session.user.id)
    })()
  }, [])

  const requestLeave = useCallback(async () => {
    if (!roomId || memberStatus === 'left') return true
    return new Promise<boolean>((resolve) => {
      pendingLeaveRef.current = { resolve }
      setLeaveDialogOpen(true)
    })
  }, [roomId, memberStatus])

  const handleConfirmLeave = useCallback(async () => {
    setLeaveDialogOpen(false)
    let ok = true
    try {
      if (roomId) {
        if (memberStatus === 'in_battle') {
          await window.electronAPI.forfeitBattleRoom(roomId)
        } else {
          await window.electronAPI.leaveBattleRoom(roomId)
        }
      }
      setRoomId(null)
      setHostUserId(null)
      setMyRole(null)
      setMemberStatus(null)
      setActiveSessionId(null)
    } catch {
      ok = false
    }
    pendingLeaveRef.current?.resolve(ok)
    pendingLeaveRef.current = null
  }, [roomId, memberStatus])

  const handleCancelLeave = useCallback(() => {
    setLeaveDialogOpen(false)
    pendingLeaveRef.current?.resolve(false)
    pendingLeaveRef.current = null
  }, [])

  return (
    <BattleContext.Provider
      value={{
        userId,
        syncUserId: setUserId,
        roomId,
        setRoomId,
        hostUserId,
        setHostUserId,
        myRole,
        setMyRole,
        memberStatus,
        setMemberStatus,
        activeSessionId,
        setActiveSessionId,
        requestLeave
      }}
    >
      {children}
      <LeaveRoomDialog
        open={leaveDialogOpen}
        onConfirm={() => void handleConfirmLeave()}
        onCancel={handleCancelLeave}
      />
    </BattleContext.Provider>
  )
}
