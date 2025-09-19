import { useForm, UseFormProps, UseFormReturn, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useCallback } from 'react';

export interface SmartFormOptions<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  schema?: z.ZodSchema<T>;
  onSubmit?: (data: T) => Promise<void> | void;
  onError?: (errors: any) => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onAutoSave?: (data: Partial<T>) => void;
}

export interface SmartFormReturn<T extends FieldValues> extends UseFormReturn<T> {
  isSubmitting: boolean;
  isAutoSaving: boolean;
  submitCount: number;
  handleSmartSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  resetForm: () => void;
  lastSubmittedData: T | null;
}

export function useSmartForm<T extends FieldValues>({
  schema,
  onSubmit,
  onError,
  autoSave = false,
  autoSaveDelay = 2000,
  ...formOptions
}: SmartFormOptions<T>): SmartFormReturn<T> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [lastSubmittedData, setLastSubmittedData] = useState<T | null>(null);

  const form = useForm<T>({
    ...formOptions,
    resolver: schema ? zodResolver(schema) : undefined,
  });

  // Auto-save functionality
  const handleAutoSave = useCallback(
    async (data: Partial<T>) => {
      if (!autoSave || !onAutoSave) return;

      try {
        setIsAutoSaving(true);
        await onAutoSave(data);
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsAutoSaving(false);
      }
    },
    [autoSave, onAutoSave]
  );

  // Debounced auto-save
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const triggerAutoSave = useCallback(
    (data: Partial<T>) => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }

      const timeout = setTimeout(() => {
        handleAutoSave(data);
      }, autoSaveDelay);

      setAutoSaveTimeout(timeout);
    },
    [autoSaveTimeout, autoSaveDelay, handleAutoSave]
  );

  // Smart submit handler
  const handleSmartSubmit = useCallback(
    async (e?: React.BaseSyntheticEvent) => {
      if (e) {
        e.preventDefault();
      }

      const isValid = await form.trigger();

      if (!isValid) {
        onError?.(form.formState.errors);
        return;
      }

      const data = form.getValues();

      try {
        setIsSubmitting(true);
        await onSubmit?.(data);
        setLastSubmittedData(data);
        setSubmitCount(prev => prev + 1);
      } catch (error) {
        onError?.(error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, onSubmit, onError]
  );

  // Reset form
  const resetForm = useCallback(() => {
    form.reset();
    setLastSubmittedData(null);
    setSubmitCount(0);
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      setAutoSaveTimeout(null);
    }
  }, [form, autoSaveTimeout]);

  // Watch for changes to trigger auto-save
  if (autoSave) {
    form.watch((data) => {
      triggerAutoSave(data as Partial<T>);
    });
  }

  return {
    ...form,
    isSubmitting,
    isAutoSaving,
    submitCount,
    handleSmartSubmit,
    resetForm,
    lastSubmittedData,
  };
}
