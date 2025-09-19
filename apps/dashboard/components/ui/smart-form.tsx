import React, { ReactNode } from 'react';
import { useSmartForm, SmartFormOptions, SmartFormReturn } from '../../lib/hooks/use-smart-form';
import { FieldValues } from 'react-hook-form';
import { Button } from './button';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './alert';

export interface SmartFormProps<T extends FieldValues> extends SmartFormOptions<T> {
  children: (form: SmartFormReturn<T>) => ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  showAutoSave?: boolean;
  showSubmitCount?: boolean;
  className?: string;
  submitButtonClassName?: string;
  errorMessage?: string;
}

export function SmartForm<T extends FieldValues>({
  children,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  onCancel,
  showAutoSave = true,
  showSubmitCount = false,
  className = '',
  submitButtonClassName = '',
  errorMessage,
  ...formOptions
}: SmartFormProps<T>) {
  const form = useSmartForm(formOptions);
  const {
    handleSubmit,
    formState: { errors, isDirty },
    isSubmitting,
    isAutoSaving,
    submitCount,
    handleSmartSubmit,
  } = form;

  const hasErrors = Object.keys(errors).length > 0;
  const canSubmit = !isSubmitting && !hasErrors;

  return (
    <form onSubmit={handleSmartSubmit} className={`space-y-6 ${className}`}>
      {/* Auto-save indicator */}
      {showAutoSave && formOptions.autoSave && (
        <div className="flex items-center justify-end space-x-2 text-sm text-gray-500">
          {isAutoSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Salvando automaticamente...</span>
            </>
          ) : isDirty ? (
            <>
              <Save className="h-4 w-4" />
              <span>Alterações não salvas</span>
            </>
          ) : (
            <span>Todas as alterações salvas</span>
          )}
        </div>
      )}

      {/* Submit count indicator */}
      {showSubmitCount && submitCount > 0 && (
        <div className="flex items-center justify-end space-x-2 text-sm text-gray-500">
          <span>Enviado {submitCount} vez(es)</span>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Form fields */}
      {children(form)}

      {/* Form actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          className={submitButtonClassName}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}

// Form field components
export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FormField({ label, error, required, className = '', children }: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

// Input field with validation
export interface SmartInputProps {
  form: SmartFormReturn<any>;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  className?: string;
}

export function SmartInput({
  form,
  name,
  label,
  placeholder,
  required,
  type = 'text',
  className = '',
}: SmartInputProps) {
  const { register, formState: { errors } } = form;
  const error = errors[name]?.message as string;

  return (
    <FormField label={label} error={error} required={required}>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
        } ${className}`}
      />
    </FormField>
  );
}

// Textarea field with validation
export interface SmartTextareaProps {
  form: SmartFormReturn<any>;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  className?: string;
}

export function SmartTextarea({
  form,
  name,
  label,
  placeholder,
  required,
  rows = 3,
  className = '',
}: SmartTextareaProps) {
  const { register, formState: { errors } } = form;
  const error = errors[name]?.message as string;

  return (
    <FormField label={label} error={error} required={required}>
      <textarea
        {...register(name)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
        } ${className}`}
      />
    </FormField>
  );
}

// Select field with validation
export interface SmartSelectProps {
  form: SmartFormReturn<any>;
  name: string;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function SmartSelect({
  form,
  name,
  label,
  options,
  placeholder,
  required,
  className = '',
}: SmartSelectProps) {
  const { register, formState: { errors } } = form;
  const error = errors[name]?.message as string;

  return (
    <FormField label={label} error={error} required={required}>
      <select
        {...register(name)}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
        } ${className}`}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
