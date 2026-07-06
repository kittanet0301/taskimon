import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import { formatApiError } from '../../src/shared/formatError'

function rpcError(error: unknown): never {
  throw new Error(formatApiError(error))
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (client) return client
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key =
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  client = createClient(url, key, {
    realtime: {
      transport: WebSocket as unknown as typeof globalThis.WebSocket
    }
  })
  return client
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null
}

function generateFriendCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function signUp(email: string, password: string, username: string, birthDate: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, birth_date: birthDate } }
  })
  if (error) throw error
  if (!data.user) throw new Error('No user returned')
  // profile created by DB trigger; fallback insert if trigger missing
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    username,
    friend_code: generateFriendCode(),
    birth_date: birthDate
  })
  if (profileError) console.warn('[auth] profile upsert:', profileError.message)
  return data
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = getSupabase()
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function updatePassword(password: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function resetPasswordByBirthdate(email: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('reset_password_by_birthdate', { p_email: email.trim() })
  if (error) rpcError(error)
}

export async function getSession() {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getProfile(userId: string) {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function syncPetToCloud(userId: string, pet: Record<string, unknown>) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('pets')
    .upsert({ ...pet, owner_id: userId, is_active: true }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getActivePet(userId: string) {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function searchProfileByFriendCode(friendCode: string) {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('friend_code', friendCode.toUpperCase())
    .maybeSingle()
  if (error) throw error
  return data
}

export async function sendFriendRequest(userId: string, friendId: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')

  const { data: rows, error: findError } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status')
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
    )
  if (findError) throw findError

  const existing = rows ?? []
  if (existing.some((row) => row.status === 'accepted')) throw new Error('Already friends')

  const pendingFromThem = existing.find(
    (row) => row.status === 'pending' && row.friend_id === userId
  )
  if (pendingFromThem) {
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', pendingFromThem.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const pendingFromMe = existing.find(
    (row) => row.status === 'pending' && row.user_id === userId
  )
  if (pendingFromMe) throw new Error('Request already sent')

  const rejected = existing.find((row) => row.status === 'rejected')
  if (rejected) {
    const { data, error } = await supabase
      .from('friendships')
      .update({ user_id: userId, friend_id: friendId, status: 'pending' })
      .eq('id', rejected.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: friendId, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function respondFriendRequest(requestId: string, accept: boolean) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: accept ? 'accepted' : 'rejected' })
    .eq('id', requestId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listFriends(userId: string) {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
  if (error) throw error
  const rows = data ?? []
  const byFriend = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    const otherId = row.user_id === userId ? row.friend_id : row.user_id
    if (!byFriend.has(otherId)) byFriend.set(otherId, row)
  }
  const enriched = await Promise.all(
    [...byFriend.entries()].map(async ([otherId, row]) => {
      const profile = await getProfile(otherId)
      return { ...row, friend_id: otherId, profiles: profile }
    })
  )
  return enriched
}

export async function listPendingRequests(userId: string) {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status')
    .eq('friend_id', userId)
    .eq('status', 'pending')
  if (error) throw error
  const rows = data ?? []
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const profile = await getProfile(row.user_id)
      return { ...row, profiles: profile }
    })
  )
  return enriched
}

export async function getFriendPet(ownerId: string) {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createBattleRoom(name?: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('room_create', { p_name: name ?? null })
  if (error) rpcError(error)
  return data
}

export async function joinBattleRoom(roomCode: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('room_join', { p_room_code: roomCode })
  if (error) rpcError(error)
  return data
}

export async function leaveBattleRoom(roomId: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('room_leave', { p_room_id: roomId })
  if (error) rpcError(error)
}

export async function forfeitBattleRoom(roomId: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('room_forfeit', { p_room_id: roomId })
  if (error) rpcError(error)
}

export async function listPublicRooms() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('room_list_public')
  if (error) rpcError(error)
  return data ?? []
}

export async function getRoomMembers(roomId: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('room_get_members', { p_room_id: roomId })
  if (error) rpcError(error)
  return data ?? []
}

export async function startRoomDuel(roomId: string, opponentUserId: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('room_start_duel', {
    p_room_id: roomId,
    p_opponent_user_id: opponentUserId
  })
  if (error) rpcError(error)
  return data
}

export async function submitBattleAction(sessionId: string, action: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('battle_submit_action', {
    p_session_id: sessionId,
    p_action: action
  })
  if (error) rpcError(error)
  return data
}

export async function listBattles() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('battle_list_for_user')
  if (error) rpcError(error)
  return data ?? []
}

export async function getBattleTurns(sessionId: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('battle_get_turns', { p_session_id: sessionId })
  if (error) rpcError(error)
  return data ?? []
}

function isUserBattleSession(row: Record<string, unknown> | undefined, userId: string): boolean {
  if (!row) return false
  return row.challenger_user_id === userId || row.defender_user_id === userId
}

export function subscribeToBattles(userId: string, onUpdate: (payload: unknown) => void) {
  const supabase = getSupabase()
  if (!supabase) return () => undefined
  const channel = supabase
    .channel(`battles:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'battle_sessions' },
      (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown> | undefined
        if (isUserBattleSession(row, userId)) onUpdate(payload)
      }
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToBattleRoom(roomId: string, onUpdate: (payload: unknown) => void) {
  const supabase = getSupabase()
  if (!supabase) return () => undefined
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${roomId}` },
      onUpdate
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'battle_room_members', filter: `room_id=eq.${roomId}` },
      onUpdate
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'battle_sessions', filter: `room_id=eq.${roomId}` },
      onUpdate
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

export async function listChatRooms() {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('chat_room_list')
  if (error) throw error
  return data ?? []
}

export async function joinChatRoom(roomId: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('chat_room_join', { p_room_id: roomId })
  if (error) throw error
  return data
}

export async function leaveChatRoom(roomId: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('chat_room_leave', { p_room_id: roomId })
  if (error) throw error
}

export async function getChatRoomMembers(roomId: string) {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('chat_room_get_members', { p_room_id: roomId })
  if (error) throw error
  return data ?? []
}

export async function sendChatRoomMessage(roomId: string, content: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('chat_room_send', {
    p_room_id: roomId,
    p_content: content
  })
  if (error) throw error
  return data
}

export async function updateChatRoomPosition(
  roomId: string,
  pos: { x: number; y: number; facing: string; anim: string }
) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('chat_room_update_position', {
    p_room_id: roomId,
    p_x: pos.x,
    p_y: pos.y,
    p_facing: pos.facing,
    p_anim: pos.anim
  })
  if (error) throw error
  return data
}

export function subscribeToChatRoom(roomId: string, onUpdate: (payload: unknown) => void) {
  const supabase = getSupabase()
  if (!supabase) return () => undefined
  const channel = supabase
    .channel(`chat-room:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_room_members', filter: `room_id=eq.${roomId}` },
      onUpdate
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_room_messages', filter: `room_id=eq.${roomId}` },
      onUpdate
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_room_positions', filter: `room_id=eq.${roomId}` },
      onUpdate
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

export async function syncInventory(userId: string, inventory: { item_type: string; quantity: number }[]) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  await supabase.from('inventory').delete().eq('user_id', userId)
  if (inventory.length === 0) return []
  const { data, error } = await supabase.from('inventory').insert(
    inventory.map((item) => ({ user_id: userId, item_type: item.item_type, quantity: item.quantity }))
  )
  if (error) throw error
  return data
}

export async function syncMissions(
  userId: string,
  missions: { mission_id: string; progress: number; completed: boolean; reset_at: string }[]
) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  for (const mission of missions) {
    await supabase.from('mission_progress').upsert(
      {
        user_id: userId,
        mission_id: mission.mission_id,
        progress: mission.progress,
        completed: mission.completed,
        reset_at: mission.reset_at
      },
      { onConflict: 'user_id,mission_id' }
    )
  }
}
