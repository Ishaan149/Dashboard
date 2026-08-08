const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function addDays(date, count) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  next.setDate(next.getDate() + count)
  return next
}

export function toLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDateKey(daysAgo = 0, today = new Date()) {
  return toLocalDateKey(addDays(today, -daysAgo))
}

export function getMonday(date = new Date()) {
  const monday = addDays(date, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

export function getWeekStartKey(date = new Date()) {
  return toLocalDateKey(getMonday(date))
}

export function getMonthStartKey(date = new Date()) {
  return toLocalDateKey(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function parseLocalDateKey(dateKey) {
  const match = DATE_KEY_PATTERN.exec(dateKey)
  if (!match) return null

  const [, year, month, day] = match.map(Number)
  const date = new Date(year, month - 1, day, 12)
  return toLocalDateKey(date) === dateKey ? date : null
}
