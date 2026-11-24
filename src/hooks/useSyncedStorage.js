import { useCallback, useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export function useSyncedStorage(key, initialValue) {
  const instanceId = useRef(Symbol(key))
  const [value, setValueState] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  const valueRef = useRef(value)

  const remoteValueRef = useRef(null)

  const hydrated = useRef(false)

  useEffect(() => { valueRef.current = value }, [value])

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

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key, value])

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

  useEffect(() => {
    hydrated.current = false
    remoteValueRef.current = null
    const ref = doc(db, 'dashboard', key)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
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
        hydrated.current = true
      }
    )
    return unsub
  }, [key])

  return [value, setValue]
}
