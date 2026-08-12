import { forwardRef } from 'react'
import styles from './Button.module.css'

export const Button = forwardRef(function Button(
  { variant = 'secondary', className = '', type = 'button', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${styles.button} ${styles[variant] ?? styles.secondary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})

export const IconButton = forwardRef(function IconButton(
  { label, tooltip = label, className = '', children, ...props },
  ref,
) {
  if (!label) throw new Error('IconButton requires an accessible label')
  return (
    <Button
      ref={ref}
      variant="icon"
      className={`${styles.iconButton} ${className}`}
      aria-label={label}
      title={tooltip}
      {...props}
    >
      {children}
    </Button>
  )
})
