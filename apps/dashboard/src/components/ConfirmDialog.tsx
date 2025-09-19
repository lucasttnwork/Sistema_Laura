import { ReactNode, useCallback } from 'react'

import { Button } from './ui/button'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'

export type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  tone?: 'danger' | 'primary'
  dialogDataTestId?: string
  confirmDataTestId?: string
  cancelDataTestId?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  tone = 'danger',
  dialogDataTestId,
  confirmDataTestId,
  cancelDataTestId,
}: ConfirmDialogProps) {
  const handleClose = useCallback(() => {
    if (!loading) {
      onOpenChange(false)
    }
  }, [loading, onOpenChange])

  const confirmVariant = tone === 'danger' ? 'danger' : 'primary'

  return (
    <Dialog open={open} onClose={handleClose} dataTestId={dialogDataTestId ?? 'confirm-dialog'}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          dataTestId={cancelDataTestId ?? 'btn-dialog-cancel'}
          onClick={handleClose}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          dataTestId={confirmDataTestId ?? 'btn-dialog-confirm'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Aguarde...' : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
