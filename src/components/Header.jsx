import { useState, useEffect } from 'react'
import { getDailyQuote } from '../data/quotes'
import styles from './Header.module.css'

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const pad    = n => String(n).padStart(2, '0')

function getTimeOfDay(h) {
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function Header() {
  const [now, setNow] = useState(new Date())
  const quote = getDailyQuote()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const h    = now.getHours()
  const m    = now.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <p className={styles.greeting}>
          Good <span>{getTimeOfDay(h)}</span>, Ishaan
        </p>
        <div className={styles.clock}>
          {h12}:{pad(m)} <span className={styles.ampm}>{ampm}</span>
        </div>
        <p className={styles.date}>
          {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}, {now.getFullYear()}
        </p>
      </div>

      <div className={styles.quote}>
        <blockquote>"{quote.text}"</blockquote>
        <cite>— {quote.author}</cite>
      </div>
    </header>
  )
}
