/** Session flags shared by main process and renderer (via imports of this module). */

let sessionIsAdmin = false

export function setSessionIsAdmin(isAdmin: boolean): void {
  sessionIsAdmin = Boolean(isAdmin)
}

export function getSessionIsAdmin(): boolean {
  return sessionIsAdmin
}
