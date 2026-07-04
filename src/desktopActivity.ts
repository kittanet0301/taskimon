/** In-app click/keyboard tracking when global uiohook is unavailable (e.g. packaged exe). */
export async function startDesktopActivityTracking(): Promise<() => void> {
  if (!window.electronAPI?.getActivityStatus) return () => {}

  let status = await window.electronAPI.getActivityStatus()
  for (let i = 0; i < 50 && !status.ready; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    status = await window.electronAPI.getActivityStatus()
  }

  if (status.global || !status.fallback) return () => {}

  const onClick = () => {
    void window.electronAPI.reportActivityClick()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.repeat) return
    void window.electronAPI.reportActivityKey()
  }

  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKey, true)
  console.log('[activity] Renderer fallback tracking started')

  return () => {
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('keydown', onKey, true)
  }
}
