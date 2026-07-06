const MIN_AGE = 18

export function daysInMonth(month: number, year: number): number {
  if (!month || !year) return 31
  return new Date(year, month, 0).getDate()
}

export function isValidBirthDate(day: number, month: number, year: number): boolean {
  if (!day || !month || !year) return false
  if (month < 1 || month > 12 || day < 1) return false
  if (day > daysInMonth(month, year)) return false
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function getAge(day: number, month: number, year: number): number {
  const today = new Date()
  let age = today.getFullYear() - year
  const hadBirthday =
    today.getMonth() > month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() >= day)
  if (!hadBirthday) age--
  return age
}

export function isAtLeast18(day: number, month: number, year: number): boolean {
  if (!isValidBirthDate(day, month, year)) return false
  return getAge(day, month, year) >= MIN_AGE
}

export function toBirthDateIso(day: number, month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatBirthDatePassword(day: number, month: number, year: number): string {
  return `${String(day).padStart(2, '0')}${String(month).padStart(2, '0')}${year}`
}

export function birthYearOptions(): number[] {
  const maxYear = new Date().getFullYear() - MIN_AGE
  const minYear = maxYear - 82
  const years: number[] = []
  for (let y = maxYear; y >= minYear; y--) years.push(y)
  return years
}
