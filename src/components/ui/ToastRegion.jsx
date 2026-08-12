import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { IconButton } from './Button'
import styles from './ToastRegion.module.css'

const ToastContext = createContext(null)
let nextToastId = 0

function Toast({ toast, onDismiss }) {
  const { id, message, tone = 'info', duration = tone === 'error' ? null : 4000 } = toast

  useEffect(() => {
    if (!duration) return undefined
    const timeout = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timeout)
  }, [duration, id, onDismiss])

  return (
    <div className={`${styles.toast} ${styles[tone] ?? styles.info}`}>
      <span>{message}</span>
      <IconButton className={styles.dismiss} label="Dismiss notification" onClick={() => onDismiss(id)}>×</IconButton>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismissToast = useCallback(id => setToasts(current => current.filter(toast => toast.id !== id)), [])
  const showToast = useCallback((message, options = {}) => {
    const id = ++nextToastId
    setToasts(current => [...current, { id, message, ...options }])
    return id
  }, [])
  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used within ToastProvider')
  return value
}

export default function ToastRegion({ toasts = [], onDismiss = () => {} }) {
  return (
    <section className={styles.region} aria-label="Notifications" aria-live="polite" aria-atomic="false">
      {toasts.map(toast => <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />)}
    </section>
  )
}
