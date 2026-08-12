import { useCallback, useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export function useSyncedStorage(key, initialValue) {
  const instanceId = useRef(Symbol(key))
  // Seed from localStorage synchronously — instant render, no flicker
  const [value, setValueState] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  // Tracks latest value for snapshot comparison without causing resubscription
  const valueRef = useRef(value)

  // Tracks the last remote payload so snapshot-driven updates are not echoed
  // back to Firestore. Unlike a boolean flag, this still handles a local edit
  // that lands immediately after a remote update.
  const remoteValueRef = useRef(null)

  // Blocks writes until the first Firestore snapshot has been received,
  // preventing local stale data from overwriting newer remote data on load
  const hydrated = useRef(false)

  // Keep valueRef in sync so the snapshot handler always compares against current value
  useEffect(() => { valueRef.current = value }, [value])

  // The browser's native storage event does not fire in the tab that made the
  // write. Broadcast local changes so two mounted consumers of the same key
  // (for example the command palette and Brain Dump) cannot drift apart.
  const setValue = useCallback((nextValue) => {
    const resolved = typeof nextValue === 'function' ? nextValue(valueRef.current) : nextValue
    valueRef.current = resolved
    try {
      localStorage.setItem(key, JSON.stringify(resolved))
    } catch {}
    setValueState(resolved)
    window.dispatchEvent(new CustomEvent('dashboard:storage-change', {
      detail: { key, value: resolved, source: instanceId.current },
    }))
  }, [key])

  useEffect(() => {
    function handleLocalChange(event) {
      if (event.detail?.key !== key || event.detail.source === instanceId.current) return
      const nextValue = event.detail.value
      if (JSON.stringify(nextValue) === JSON.stringify(valueRef.current)) return
      valueRef.current = nextValue
      setValueState(nextValue)
    }

    window.addEventListener('dashboard:storage-change', handleLocalChange)
    return () => window.removeEventListener('dashboard:storage-change', handleLocalChange)
  }, [key])

  // Mirror every state change to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key, value])

  // Mirror every state change to Firestore.
  // Skip values that match the latest Firestore snapshot, or if the initial
  // snapshot hasn't arrived yet (which could overwrite newer remote data).
  // Debounced to avoid a write per keystroke in text-heavy fields.
  useEffect(() => {
    if (!hydrated.current) return
    const serializedValue = JSON.stringify(value)
    if (serializedValue === remoteValueRef.current) return

    const ref = doc(db, 'dashboard', key)
    const timer = setTimeout(() => {
      setDoc(ref, { value, _secret: import.meta.env.VITE_FIRESTORE_SECRET }).catch((err) =>
        console.error(`useSyncedStorage: failed to write "${key}" to Firestore`, err)
      )
    }, 1000)
    return () => clearTimeout(timer)
  }, [key, value])

  // Subscribe to real-time Firestore updates for cross-device sync
  // `valueRef` gives the snapshot handler current state without resubscribing
  // on every local edit.
  useEffect(() => {
    hydrated.current = false
    remoteValueRef.current = null
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
        const data = snap.data()
        if (!Object.hasOwn(data, 'value')) {
          hydrated.current = true
          return
        }

        const remote = data.value
        const serializedRemote = JSON.stringify(remote)
        remoteValueRef.current = serializedRemote
        if (serializedRemote !== JSON.stringify(valueRef.current)) {
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
  }, [key])

  return [value, setValue]
}
