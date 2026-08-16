import { useMemo, useState } from 'react'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { addDays, getMonthStartKey, getWeekStartKey, parseLocalDateKey, toLocalDateKey } from '../utils/date'
import {
  APPLICATION_CATEGORIES,
  adjustCategory,
  adjustOutreach,
  getAllTimeApplicationTotal,
  getJobRecord,
  getOverallApplicationCount,
  getPeriodApplicationTotal,
  normalizeJobRecords,
} from '../domain/jobActivity'
import styles from './JobTracker.module.css'

function formatDate(dateKey) {
  return parseLocalDateKey(dateKey)?.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }) ?? dateKey
}

function formatHistoryDate(dateKey) {
  return parseLocalDateKey(dateKey)?.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }) ?? dateKey
}

function formatNavigationDate(dateKey) {
  return parseLocalDateKey(dateKey)?.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }) ?? dateKey
}

function EmptyRecord({ date }) {
  return { date, count: 0, categories: {}, emails: 0, linkedin: 0 }
}

function CounterGlyph({ increase = false }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12" />
      {increase && <path d="M10 4v12" />}
    </svg>
  )
}

function Counter({ label, value, noun, onAdjust, dateLabel, compact = false }) {
  return (
    <li className={`${styles.counter} ${compact ? styles.counterCompact : ''}`}>
      <div className={styles.counterHead}>
        <h3>{label}</h3>
      </div>
      <div className={styles.counterControls}>
        <button
          type="button"
          className={styles.countButton}
          onClick={() => onAdjust(-1)}
          disabled={value === 0}
          aria-label={`Decrease ${label} ${noun} for ${dateLabel}`}
        ><CounterGlyph /></button>
        <span className={styles.counterValue} aria-live="polite">{value}</span>
        <button
          type="button"
          className={styles.countButton}
          onClick={() => onAdjust(1)}
          aria-label={`Increase ${label} ${noun} for ${dateLabel}`}
        ><CounterGlyph increase /></button>
      </div>
    </li>
  )
}

function DateNavigation({ selectedDate, selectedDateLabel, onMove, isToday }) {
  return (
    <div className={styles.dateNavigation} role="group" aria-label="Activity date navigation">
      <button
        type="button"
        className={styles.dateNavButton}
        onClick={() => onMove(-1)}
        aria-label={`Previous activity date from ${selectedDateLabel}`}
      >‹</button>
      <time className={styles.dateNavText} dateTime={selectedDate} aria-label="Selected activity date">
        {isToday ? 'Today' : formatNavigationDate(selectedDate)}
      </time>
      <button
        type="button"
        className={styles.dateNavButton}
        onClick={() => onMove(1)}
        aria-label={`Next activity date from ${selectedDateLabel}`}
      >›</button>
    </div>
  )
}

function Summary({ week, month, allTime }) {
  return (
    <section className={styles.summary} aria-labelledby="job-summary-heading">
      <h2 id="job-summary-heading" className={styles.sectionEyebrow}>Application summary</h2>
      <div className={styles.summaryGrid}>
        <div className={styles.stat}><strong>{week}</strong><span>this week</span></div>
        <div className={styles.stat}><strong>{month}</strong><span>this month</span></div>
        <div className={styles.stat}><strong>{allTime}</strong><span>all time</span></div>
      </div>
    </section>
  )
}

export default function JobTracker() {
  const [records, setRecords] = useSyncedStorage('job_applications', [])
  const [note, setNote] = useSyncedStorage('job_note', '')
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()))

  const selectedRecord = getJobRecord(records, selectedDate) ?? EmptyRecord({ date: selectedDate })
  const selectedDateLabel = formatDate(selectedDate)
  const normalizedRecords = useMemo(() => normalizeJobRecords(records), [records])
  const history = normalizedRecords
    .filter(record => record.date !== selectedDate)
    .sort((a, b) => b.date.localeCompare(a.date))

  const week = getPeriodApplicationTotal(records, getWeekStartKey())
  const month = getPeriodApplicationTotal(records, getMonthStartKey())
  const allTime = getAllTimeApplicationTotal(records)

  function moveSelectedDate(delta) {
    setSelectedDate(current => {
      const parsed = parseLocalDateKey(current) ?? new Date()
      return toLocalDateKey(addDays(parsed, delta))
    })
  }

  function adjustApplicationCategory(categoryKey, delta) {
    setRecords(previous => adjustCategory(previous, selectedDate, categoryKey, delta))
  }

  function adjustOutreachCounter(field, delta) {
    setRecords(previous => adjustOutreach(previous, selectedDate, field, delta))
  }

  return (
    <div className={styles.page}>
      <Summary week={week} month={month} allTime={allTime} />

      <section className={styles.logging} aria-label="Job activity logging">
        <div className={styles.activityGroup}>
          <div className={styles.groupHeader}>
            <h3 className={styles.groupHeading}>Applications</h3>
            <DateNavigation
              selectedDate={selectedDate}
              selectedDateLabel={selectedDateLabel}
              onMove={moveSelectedDate}
              isToday={selectedDate === toLocalDateKey(new Date())}
            />
          </div>
          <ul className={styles.counterGrid}>
            {APPLICATION_CATEGORIES.map(category => (
              <Counter
                key={category.key}
                label={category.label}
                noun="applications"
                value={selectedRecord.categories?.[category.key] ?? 0}
                onAdjust={delta => adjustApplicationCategory(category.key, delta)}
                dateLabel={selectedDateLabel}
              />
            ))}
          </ul>
        </div>

        <div className={styles.activityGroup}>
          <h3 className={styles.groupHeading}>Outreach</h3>
          <ul className={`${styles.counterGrid} ${styles.outreachGrid}`}>
            <Counter
              label="Emails"
              noun="sent"
              compact
              value={selectedRecord.emails ?? 0}
              onAdjust={delta => adjustOutreachCounter('emails', delta)}
              dateLabel={selectedDateLabel}
            />
            <Counter
              label="LinkedIn"
              noun="messages"
              compact
              value={selectedRecord.linkedin ?? 0}
              onAdjust={delta => adjustOutreachCounter('linkedin', delta)}
              dateLabel={selectedDateLabel}
            />
          </ul>
        </div>
      </section>

      <div className={styles.lowerGrid}>
        <section className={styles.panel} aria-labelledby="notes-heading">
          <h2 id="notes-heading" className={styles.panelHeading}>Notes</h2>
          <textarea
            className={styles.noteArea}
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="Links, notes, anything job-search related…"
          />
        </section>

        <section className={styles.panel} aria-labelledby="history-heading">
          <h2 id="history-heading" className={styles.panelHeading}>History</h2>
          {history.length === 0 ? (
            <p className={styles.empty}>No history yet — start applying!</p>
          ) : (
            <ul className={styles.historyList}>
              {history.map(record => (
                <li key={record.date} className={styles.historyItem}>
                  <span>{formatHistoryDate(record.date)}</span>
                  <strong>{getOverallApplicationCount(record)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
