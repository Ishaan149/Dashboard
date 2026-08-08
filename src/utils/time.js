const MINUTES_PER_DAY = 24 * 60

export function formatMinutes(minutes, { compact = false, markNextDay = false } = {}) {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hour = Math.floor(normalized / 60)
  const minute = normalized % 60
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  const time = compact && minute === 0
    ? `${hour12} ${period}`
    : `${hour12}:${String(minute).padStart(2, '0')} ${period}`

  return markNextDay && minutes >= MINUTES_PER_DAY ? `${time} +` : time
}

export function getScheduleMinutes(endHour, date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes()
  const nextDayCutoff = (endHour - 24) * 60
  return endHour > 24 && minutes < nextDayCutoff ? minutes + MINUTES_PER_DAY : minutes
}
