import { useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export function useSyncedStorage(key, initialValue) {
  // Seed from localStorage synchronously — instant render, no flicker
  const [value, setValueState] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  const { user } = useAuth()

  // Prevents write-echo loop: Firestore → state → Firestore → ...
  const fromFirestore = useRef(false)

  // Mirror every state change to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key, value])

  // Mirror every state change to Firestore (when signed in)
  // Skip if the change originated from a Firestore snapshot
  useEffect(() => {
    if (!user) return
    if (fromFirestore.current) {
      fromFirestore.current = false
      return
    }
    const ref = doc(db, 'users', user.uid, 'dashboard', key)
    setDoc(ref, { value }).catch(() => {})
  }, [key, value, user])

  // Subscribe to real-time Firestore updates for cross-device sync
  // Intentionally omits 'value' from deps — resubscribing on every keystroke
  // would be catastrophic for BrainDump. The snapshot handler closes over
  // 'value' at subscribe time but JSON comparison still works correctly.
  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid, 'dashboard', key)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return
        const remote = snap.data().value
        if (JSON.stringify(remote) !== JSON.stringify(value)) {
          fromFirestore.current = true
          setValueState(remote)
        }
      },
      () => {} // silent — offline falls back to localStorage
    )
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user])

  return [value, setValueState]
}
