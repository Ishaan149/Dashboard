import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useModalFocus({ open, containerRef, initialFocusRef, onClose, dismissible = true, focusContainerFirst = false }) {
  const returnFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    returnFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusInitial = () => {
      const target = focusContainerFirst
        ? containerRef.current
        : (initialFocusRef?.current ?? containerRef.current?.querySelector(FOCUSABLE) ?? containerRef.current)
      target?.focus()
    }
    const frame = requestAnimationFrame(focusInitial)

    function handleKeyDown(event) {
      if (event.key === 'Escape' && dismissible) {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !containerRef.current) return

      const focusable = [...containerRef.current.querySelectorAll(FOCUSABLE)]
      if (focusable.length === 0) {
        event.preventDefault()
        containerRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (document.activeElement === containerRef.current || !containerRef.current.contains(document.activeElement)) {
        event.preventDefault()
        const wrapTarget = event.shiftKey ? last : first
        wrapTarget.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      const returnTarget = returnFocusRef.current
      requestAnimationFrame(() => {
        if (returnTarget instanceof HTMLElement && returnTarget.isConnected) returnTarget.focus()
      })
    }
  }, [containerRef, dismissible, focusContainerFirst, initialFocusRef, open])
}
