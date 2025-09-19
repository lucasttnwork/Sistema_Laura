import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

type AlertVariant = 'info' | 'positive' | 'warning' | 'danger'

const variantClasses: Record<AlertVariant, string> = {
  info: 'border-primary/40 bg-primary/10 text-foreground',
  positive: 'border-positive/40 bg-positive/10 text-positive',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  danger: 'border-danger/40 bg-danger/10 text-danger',
}

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  dataTestId?: string
}

export function Alert({ className, variant = 'info', dataTestId, role, ...props }: AlertProps) {
  const computedRole = role ?? (variant === 'danger' ? 'alert' : 'status')

  return (
    <div
      role={computedRole}
      data-testid={dataTestId ?? `alert-${variant}`}
      className={cn(
        'flex w-full items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-soft',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('font-semibold leading-6 text-inherit', className)} {...props} />
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm opacity-90', className)} {...props} />
}
