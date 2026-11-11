import { useEffect, useReducer } from 'react'

const STORAGE_KEY = 'dashboard-clock-v1'
const DEFAULT_DURATION = 30 * 60_000
export const TIMER_DURATION_LIMITS = { minutes: 99, seconds: 59 }
const MAX_TIMER_DURATION = (TIMER_DURATION_LIMITS.minutes * 60 + TIMER_DURATION_LIMITS.seconds) * 1000

const EMPTY_CLOCK = { elapsed: 0, startedAt: null }
const INITIAL_STATE = {
  mode: 'timer',
  timer: { ...EMPTY_CLOCK, duration: DEFAULT_DURATION },
  stopwatch: EMPTY_CLOCK,
}

function validClock(clock) {
  return Number.isSafeInteger(clock?.elapsed) && clock.elapsed >= 0 &&
    (clock.startedAt === null || (Number.isSafeInteger(clock.startedAt) && clock.startedAt >= 0))
}

function loadClock() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    if (validClock(saved?.timer) && validClock(saved.stopwatch) &&
        Number.isInteger(saved.timer.duration) && saved.timer.duration >= 1000 &&
        saved.timer.duration <= MAX_TIMER_DURATION && saved.timer.elapsed <= saved.timer.duration) {
      return { ...saved, mode: saved.mode === 'stopwatch' ? 'stopwatch' : 'timer' }
    }
  } catch {}
  return INITIAL_STATE
}

export function elapsedAt(clock, now) {
  return clock.elapsed + (clock.startedAt === null ? 0 : Math.max(0, now - clock.startedAt))
}

export function timerDeadline(timer) {
  return timer.startedAt === null ? null : timer.startedAt + timer.duration - timer.elapsed
}

function updateClock(state, action) {
  const { mode } = state
  const clock = state[mode]
  switch (action.type) {
    case 'select':
      return { ...state, mode: action.mode }
    case 'duration':
      return { ...state, timer: { ...EMPTY_CLOCK, duration: action.duration } }
    case 'reset':
      return { ...state, [mode]: { ...clock, ...EMPTY_CLOCK } }
    case 'toggle': {
      const elapsed = elapsedAt(clock, action.now)
      if (mode === 'timer' && elapsed >= clock.duration) {
        if (clock.startedAt !== null) return state
        return { ...state, timer: { ...clock, elapsed: 0, startedAt: action.now } }
      }
      const next = clock.startedAt === null
        ? { ...clock, startedAt: action.now }
        : { ...clock, elapsed, startedAt: null }
      return { ...state, [mode]: next }
    }
    case 'finish': {
      const deadline = timerDeadline(state.timer)
      if (deadline === null || deadline > action.now) return state
      return { ...state, timer: { ...state.timer, elapsed: state.timer.duration, startedAt: null } }
    }
    default:
      return state
  }
}

export function useDashboardClock() {
  const [state, dispatch] = useReducer(updateClock, null, loadClock)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {}
  }, [state])

  return { state, dispatch }
}
