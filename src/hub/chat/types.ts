import type { PetSpecies, Gender, Stage } from '../../shared/types'

export interface ChatRoomRow {
  id: string
  slug: string
  name: string
  max_members: number
  member_count: number
}

export interface ChatRoomMember {
  user_id: string
  username: string
  pet_character: string
  gender: string
  stage: string
  x: number
  y: number
  facing: 'left' | 'right'
  anim: LobbyAnim
}

export interface ChatRoomMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
}

export type LobbyAnim = 'idle' | 'walk' | 'dash' | 'jump' | 'bite'

export function parseLobbyAnim(value: unknown): LobbyAnim {
  if (value === 'walk' || value === 'dash' || value === 'jump' || value === 'bite') {
    return value
  }
  return 'idle'
}

export interface LobbyEntity {
  userId: string
  username: string
  character: PetSpecies
  gender: Gender
  stage: Stage
  x: number
  y: number
  facing: 'left' | 'right'
  anim: LobbyAnim
  isSelf: boolean
}

export interface SpeechBubble {
  userId: string
  content: string
  expiresAt: number
}
