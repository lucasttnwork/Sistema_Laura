import { cn } from '../lib/cn'

type LoadingStateProps = {
  rows?: number
  className?: string
}

export function LoadingState({ rows = 3, className }: LoadingStateProps) {
  return (
    <div className={cn('space-y-2 rounded-md border border-outline bg-surface/70 p-4', className)}>
      <div className="animate-pulse space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-4 w-full rounded bg-muted/60" />
        ))}
      </div>
    </div>
  )
}
