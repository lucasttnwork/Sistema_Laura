import { useEffect } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '../../lib/cn'

export interface DialogProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  dataTestId?: string
  contentClassName?: string
}

export function Dialog({ open, onClose, children, dataTestId, contentClassName }: DialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-overlay flex items-start justify-center overflow-y-auto px-4 py-8">
      <div
        data-testid={(dataTestId ?? 'dialog') + '-backdrop'}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onClose?.()}
      />
      <div
        role="dialog"
        aria-modal="true"
        data-testid={dataTestId ?? 'dialog'}
        className={cn(
          'relative z-modal w-full max-w-5xl max-h-[calc(100vh-4rem)] overflow-y-auto rounded-lg border border-outline bg-surface p-6 shadow-strong',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 space-y-1', className)} {...props} />
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('font-display text-xl font-semibold text-foreground', className)} {...props} />
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-6 flex items-center justify-end gap-3', className)} {...props} />
}

export function DialogContentSmall({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        'relative z-modal w-full max-w-md max-h-[calc(100vh-4rem)] overflow-y-auto rounded-lg border border-outline bg-surface p-5 shadow-strong',
        className,
      )}
      {...props}
    />
  )
}
