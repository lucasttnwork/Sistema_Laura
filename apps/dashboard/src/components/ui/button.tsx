import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-medium hover:bg-primary/90 focus-visible:ring-primary',
  secondary:
    'bg-surface text-foreground border border-outline hover:border-primary focus-visible:ring-outline',
  ghost:
    'text-foreground hover:bg-muted/70 focus-visible:ring-muted',
  danger:
    'bg-danger text-background shadow-medium hover:bg-danger/90 focus-visible:ring-danger',
  outline:
    'border border-outline text-foreground hover:border-primary focus-visible:ring-primary',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  dataTestId?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', dataTestId, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        data-testid={dataTestId ?? `btn-${variant}`}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
