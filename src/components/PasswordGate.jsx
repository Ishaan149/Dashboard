import { useState } from 'react'
import styles from './PasswordGate.module.css'

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function PasswordGate({ onUnlock }) {
  const [input, setInput]     = useState('')
  const [error, setError]     = useState(false)
  const [shaking, setShaking] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const hash = await sha256hex(input)
    if (hash === import.meta.env.VITE_PASSWORD_HASH) {
      onUnlock()
    } else {
      setInput('')
      setError(true)
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={`${styles.card} ${shaking ? styles.shake : ''}`}>
        <div className={styles.icon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Enter your password to continue</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            type="password"
            placeholder="Password"
            value={input}
            autoFocus
            onChange={e => { setInput(e.target.value); setError(false) }}
          />
          {error && <p className={styles.errorMsg}>Incorrect password</p>}
          <button className={styles.btn} type="submit">Unlock</button>
        </form>
      </div>
    </div>
  )
}
