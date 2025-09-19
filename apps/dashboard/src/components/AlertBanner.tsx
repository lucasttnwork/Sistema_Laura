import { FeedbackMessage } from '../hooks/useCrudForm'

import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'

const toneToVariant: Record<FeedbackMessage['tone'], 'positive' | 'danger' | 'info'> = {
  success: 'positive',
  error: 'danger',
  info: 'info',
}

export type AlertBannerProps = FeedbackMessage & {
  onClose?: () => void
  className?: string
}

export function AlertBanner({ tone, message, description, onClose, className }: AlertBannerProps) {
  return (
    <Alert dataTestId={`alert-banner-${tone}`} variant={toneToVariant[tone]} className={className}>
      <div className="flex-1 space-y-1">
        <AlertTitle>{message}</AlertTitle>
        {description ? <AlertDescription>{description}</AlertDescription> : null}
      </div>
      {onClose ? (
        <Button
          variant="ghost"
          size="sm"
          dataTestId={`alert-banner-${tone}-close`}
          onClick={onClose}
          className="shrink-0"
        >
          Fechar
        </Button>
      ) : null}
    </Alert>
  )
}
