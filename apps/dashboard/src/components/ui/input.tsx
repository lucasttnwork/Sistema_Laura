import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  dataTestId?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, dataTestId, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-testid={dataTestId ?? `input-${type}`}
        className={cn(
          'flex h-10 w-full rounded-md border border-outline bg-surface px-4 text-sm text-foreground transition-shadow placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'
