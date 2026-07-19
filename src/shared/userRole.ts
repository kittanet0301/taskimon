import type { UserRole } from './types'

export function normalizeUserRole(role: unknown): UserRole {
  return role === 'admin' ? 'admin' : 'user'
}

export function isAdminRole(role: unknown): boolean {
  return normalizeUserRole(role) === 'admin'
}
