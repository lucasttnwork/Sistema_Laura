import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '../../lib/cn'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
export type HeadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type HeadingTag = `h${HeadingLevel}`
type HeadingElementProps = ComponentPropsWithoutRef<HeadingTag>

const sizeClasses: Record<HeadingSize, string> = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
}

export interface HeadingProps extends HeadingElementProps {
  level?: HeadingLevel
  size?: HeadingSize
  dataTestId?: string
}

export function Heading({
  children,
  className,
  level = 2,
  size = 'md',
  dataTestId,
  ...props
}: HeadingProps) {
  const Component = `h${level}` as HeadingTag

  return (
    <Component
      data-testid={dataTestId ?? `heading-${level}`}
      className={cn('font-display font-semibold text-foreground', sizeClasses[size], className)}
      {...props}
    >
      {children}
    </Component>
  )
}
