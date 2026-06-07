import { useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

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

  // Prevents write-echo loop: Firestore → state → Firestore → ...
  const fromFirestore = useRef(false)

  // Tracks latest value for snapshot comparison without causing resubscription
  const valueRef = useRef(value)

  // Blocks writes until the first Firestore snapshot has been received,
  // preventing local stale data from overwriting newer remote data on load
  const hydrated = useRef(false)

  // Keep valueRef in sync so the snapshot handler always compares against current value
  useEffect(() => { valueRef.current = value }, [value])

  // Mirror every state change to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key, value])

  // Mirror every state change to Firestore.
  // Skip if the change originated from a Firestore snapshot, or if the
  // initial snapshot hasn't arrived yet (would overwrite newer remote data).
  // Debounced to avoid a write per keystroke in text-heavy fields.
  useEffect(() => {
    if (!hydrated.current) return
    if (fromFirestore.current) {
      fromFirestore.current = false
      return
    }
    const ref = doc(db, 'dashboard', key)
    const timer = setTimeout(() => {
      setDoc(ref, { value, _secret: import.meta.env.VITE_FIRESTORE_SECRET }).catch((err) =>
        console.error(`useSyncedStorage: failed to write "${key}" to Firestore`, err)
      )
    }, 1000)
    return () => clearTimeout(timer)
  }, [key, value])

  // Subscribe to real-time Firestore updates for cross-device sync
  // Intentionally omits 'value' from deps — resubscribing on every keystroke
  // would be catastrophic for BrainDump. The snapshot handler closes over
  // 'value' at subscribe time but JSON comparison still works correctly.
  useEffect(() => {
    hydrated.current = false
    const ref = doc(db, 'dashboard', key)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          // No remote document yet — seed Firestore from local state and unblock writes
          setDoc(ref, { value: valueRef.current, _secret: import.meta.env.VITE_FIRESTORE_SECRET }).catch((err) =>
            console.error(`useSyncedStorage: failed to seed "${key}" to Firestore`, err)
          )
          hydrated.current = true
          return
        }
        const remote = snap.data().value
        if (JSON.stringify(remote) !== JSON.stringify(valueRef.current)) {
          fromFirestore.current = true
          setValueState(remote)
        }
        hydrated.current = true
      },
      () => {
        // On error (e.g. offline), unblock writes so local changes still persist next time
        hydrated.current = true
      }
    )
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return [value, setValueState]
}
