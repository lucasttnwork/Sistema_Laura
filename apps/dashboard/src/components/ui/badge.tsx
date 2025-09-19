import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

type BadgeVariant = 'neutral' | 'positive' | 'warning' | 'danger' | 'outline'

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-muted/70 text-foreground',
  positive: 'bg-positive/20 text-positive border border-positive/40',
  warning: 'bg-warning/20 text-warning border border-warning/40',
  danger: 'bg-danger/20 text-danger border border-danger/40',
  outline: 'border border-outline text-foreground',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dataTestId?: string
}

export function Badge({ className, variant = 'neutral', dataTestId, ...props }: BadgeProps) {
  return (
    <span
      data-testid={dataTestId ?? `badge-${variant}`}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
