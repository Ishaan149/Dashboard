import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button'
import { useModalFocus } from './useModalFocus'
import styles from './Modal.module.css'

function CloseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
}

export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  destructive = false,
  initialFocusRef,
}) {
  const panelRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  useModalFocus({
    open,
    containerRef: panelRef,
    initialFocusRef,
    onClose,
    dismissible: !destructive,
    focusContainerFirst: destructive && !initialFocusRef,
  })

  if (!open) return null

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={event => {
        if (!destructive && event.target === event.currentTarget) onClose?.()
      }}
    >
      <section
        ref={panelRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex="-1"
      >
        <div className={styles.header}>
          <div>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            {description && <p id={descriptionId} className={styles.description}>{description}</p>}
          </div>
          {!destructive && <IconButton label="Close dialog" onClick={onClose}><CloseIcon /></IconButton>}
        </div>
        {children && <div className={styles.body}>{children}</div>}
        {footer && <div className={styles.footer}>{footer}</div>}
      </section>
    </div>,
    document.body,
  )
}
