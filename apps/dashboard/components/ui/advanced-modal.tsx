import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from './dialog';
import { Button } from './button';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalType = 'default' | 'confirm' | 'info' | 'success' | 'warning' | 'error';

interface AdvancedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  size?: ModalSize;
  type?: ModalType;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  footer?: React.ReactNode;
  actions?: ModalAction[];
}

interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
  loading?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

const typeIcons: Record<ModalType, React.ReactNode> = {
  default: null,
  confirm: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
  info: <Info className="h-6 w-6 text-blue-500" />,
  success: <CheckCircle className="h-6 w-6 text-green-500" />,
  warning: <AlertTriangle className="h-6 w-6 text-orange-500" />,
  error: <XCircle className="h-6 w-6 text-red-500" />,
};

export function AdvancedModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  type = 'default',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  footer,
  actions,
}: AdvancedModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const focusableElements = contentRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement?.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement?.focus();
              e.preventDefault();
            }
          }
        }
      };

      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleTabKey);
      document.addEventListener('keydown', handleEscapeKey);
      firstElement?.focus();

      return () => {
        document.removeEventListener('keydown', handleTabKey);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, closeOnEscape, onClose]);

  const defaultFooter = actions && actions.length > 0 && (
    <div className="flex justify-end gap-2">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || 'default'}
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
        >
          {action.loading ? 'Carregando...' : action.label}
        </Button>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={closeOnBackdrop ? onClose : undefined}>
      <DialogContent
        ref={contentRef}
        className={cn(
          'max-h-[90vh] overflow-y-auto',
          sizeClasses[size],
          className
        )}
        showCloseButton={showCloseButton}
      >
        {(title || type !== 'default') && (
          <DialogHeader>
            <div className="flex items-center gap-3">
              {typeIcons[type]}
              <div>
                <DialogTitle>{title}</DialogTitle>
                {description && (
                  <DialogDescription className="mt-1">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
        )}

        {children && (
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        )}

        {(footer || defaultFooter) && (
          <DialogFooter>
            {footer || defaultFooter}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Specialized modal components
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'warning' | 'danger';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  type = 'warning',
  loading = false,
}: ConfirmModalProps) {
  const actions: ModalAction[] = [
    {
      label: cancelLabel,
      onClick: onClose,
      variant: 'outline',
      disabled: loading,
    },
    {
      label: confirmLabel,
      onClick: onConfirm,
      variant: type === 'danger' ? 'destructive' : 'default',
      loading,
    },
  ];

  return (
    <AdvancedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      type={type === 'danger' ? 'error' : 'confirm'}
      size="sm"
      actions={actions}
    />
  );
}

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  size?: ModalSize;
}

export function FormModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  loading = false,
  size = 'md',
}: FormModalProps) {
  const actions: ModalAction[] = [
    {
      label: cancelLabel,
      onClick: onClose,
      variant: 'outline',
      disabled: loading,
    },
    {
      label: submitLabel,
      onClick: onSubmit,
      loading,
    },
  ];

  return (
    <AdvancedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      actions={actions}
    >
      {children}
    </AdvancedModal>
  );
}

// Success/Error modal for quick feedback
interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error';
  title: string;
  description?: string;
  autoCloseDelay?: number;
}

export function FeedbackModal({
  isOpen,
  onClose,
  type,
  title,
  description,
  autoCloseDelay = 3000,
}: FeedbackModalProps) {
  useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, autoCloseDelay]);

  return (
    <AdvancedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      type={type}
      size="sm"
      showCloseButton={false}
      closeOnBackdrop={false}
      closeOnEscape={false}
    />
  );
}
