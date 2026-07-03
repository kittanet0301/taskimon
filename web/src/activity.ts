import { recordClick, recordKey, registerPlaytimeTick } from './gameStore'

export function startActivityTracking(): () => void {
  const onClick = () => recordClick()
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return
    if (e.repeat) return
    recordKey()
  }

  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKey, true)
  const stopPlaytime = registerPlaytimeTick()

  return () => {
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('keydown', onKey, true)
    stopPlaytime()
  }
}
