import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FieldValues, UseFormReturn, useForm } from 'react-hook-form'
import { ZodTypeAny } from 'zod'

export type FeedbackMessage = {
  tone: 'success' | 'error' | 'info'
  message: string
  description?: string
}

export type CrudFormOptions<TFormValues extends FieldValues, TRecord> = {
  schema: ZodTypeAny
  defaultValues: TFormValues
  mapRecordToForm: (record: TRecord) => TFormValues
}

export type CrudFormHandlers<TFormValues extends FieldValues, TRecord> = {
  form: UseFormReturn<TFormValues>
  isOpen: boolean
  openCreate: () => void
  openEdit: (record: TRecord) => void
  closeForm: () => void
  editing: TRecord | null
  saving: boolean
  setSaving: (value: boolean) => void
  feedback: FeedbackMessage | null
  setFeedback: (feedback: FeedbackMessage | null) => void
  resetFeedback: () => void
}

export function useCrudForm<TFormValues extends FieldValues, TRecord>(
  options: CrudFormOptions<TFormValues, TRecord>
): CrudFormHandlers<TFormValues, TRecord> {
  const [editing, setEditing] = useState<TRecord | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)

  const form = useForm<TFormValues>({
    resolver: zodResolver(options.schema as any) as any,
    defaultValues: options.defaultValues as any,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  }) as UseFormReturn<TFormValues>

  const resetFeedback = () => setFeedback(null)

  const openCreate = () => {
    setEditing(null)
    setIsOpen(true)
    resetFeedback()
    form.reset(options.defaultValues)
  }

  const openEdit = (record: TRecord) => {
    setEditing(record)
    setIsOpen(true)
    resetFeedback()
    form.reset(options.mapRecordToForm(record))
  }

  const closeForm = () => {
    if (saving) return
    setIsOpen(false)
    setEditing(null)
    form.reset(options.defaultValues)
  }

  return {
    form,
    isOpen,
    openCreate,
    openEdit,
    closeForm,
    editing,
    saving,
    setSaving,
    feedback,
    setFeedback,
    resetFeedback,
  }
}
