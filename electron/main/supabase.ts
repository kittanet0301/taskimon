import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

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

export async function signUp(email: string, password: string, username: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  })
  if (error) throw error
  if (!data.user) throw new Error('No user returned')
  // profile created by DB trigger; fallback insert if trigger missing
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    username,
    friend_code: generateFriendCode()
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

  const { data: existing, error: findError } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status')
    .or(
      `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
    )
    .maybeSingle()
  if (findError) throw findError

  if (existing) {
    if (existing.status === 'accepted') throw new Error('Already friends')
    if (existing.status === 'pending') {
      if (existing.user_id === userId) throw new Error('Request already sent')
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return data
    }
    if (existing.status === 'rejected') {
      const { data, error } = await supabase
        .from('friendships')
        .update({ user_id: userId, friend_id: friendId, status: 'pending' })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return data
    }
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
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const otherId = row.user_id === userId ? row.friend_id : row.user_id
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

export async function saveBattleLog(battle: Record<string, unknown>) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.from('battles').insert(battle).select().single()
  if (error) throw error
  return data
}

export async function sendChatMessage(senderId: string, receiverId: string, content: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getChatMessages(userId: string, friendId: string) {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
    )
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export function subscribeToChat(userId: string, onMessage: (payload: unknown) => void) {
  const supabase = getSupabase()
  if (!supabase) return () => undefined
  const channel = supabase
    .channel(`chat:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
      onMessage
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
