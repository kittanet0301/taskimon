import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  if (!url || !key) return null
  client = createClient(url, key)
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
    .eq('user_id', userId)
    .eq('status', 'accepted')
  if (error) throw error
  const rows = data ?? []
  return Promise.all(
    rows.map(async (row) => {
      const profile = await getProfile(row.friend_id)
      return { ...row, profiles: profile }
    })
  )
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
  return Promise.all(
    rows.map(async (row) => {
      const profile = await getProfile(row.user_id)
      return { ...row, profiles: profile }
    })
  )
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
