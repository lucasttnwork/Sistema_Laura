import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Toast, ToastType } from '../../lib/hooks/use-toast';
import { cn } from '../../lib/utils';

interface ToastProps extends Toast {
  onRemove: (id: string) => void;
  className?: string;
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5" />,
  error: <AlertCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
};

const toastStyles: Record<ToastType, string> = {
  success: 'border-green-500 bg-green-50 text-green-800',
  error: 'border-red-500 bg-red-50 text-red-800',
  warning: 'border-yellow-500 bg-yellow-50 text-yellow-800',
  info: 'border-blue-500 bg-blue-50 text-blue-800',
};

export function ToastItem({ id, type, title, description, action, onRemove, className }: ToastProps) {
  useEffect(() => {
    // Focus management for accessibility
    const toastElement = document.getElementById(`toast-${id}`);
    if (toastElement) {
      toastElement.focus();
    }
  }, [id]);

  return (
    <div
      id={`toast-${id}`}
      role="alert"
      aria-live="polite"
      tabIndex={-1}
      className={cn(
        'relative w-full max-w-sm rounded-lg border p-4 shadow-lg transition-all',
        toastStyles[type],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {toastIcons[type]}
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between">
            <h4 className="text-sm font-semibold">{title}</h4>
            <button
              onClick={() => onRemove(id)}
              className="flex-shrink-0 ml-2 text-current opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none"
              aria-label="Fechar notificação"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {description && (
            <p className="text-sm opacity-90">{description}</p>
          )}

          {action && (
            <div className="mt-2">
              <button
                onClick={() => {
                  action.onClick();
                  onRemove(id);
                }}
                className="text-sm font-medium underline hover:no-underline focus:outline-none focus:underline"
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Toast container component
interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  className?: string;
}

export function ToastContainer({
  toasts,
  onRemove,
  position = 'top-right',
  className
}: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 pointer-events-none',
        positionClasses[position],
        className
      )}
      aria-live="polite"
      aria-label="Notificações"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem {...toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

// Context provider for global toast management
import { createContext, useContext, ReactNode } from 'react';
import { UseToastReturn, useToast } from '../../lib/hooks/use-toast';

const ToastContext = createContext<UseToastReturn | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer
        toasts={toast.toasts}
        onRemove={toast.removeToast}
        position="top-right"
      />
    </ToastContext.Provider>
  );
}

export function useToastContext(): UseToastReturn {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}
