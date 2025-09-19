import type { PostgrestError } from '@supabase/supabase-js'

type SupabaseErrorLike = {
  message?: string
  code?: string
  details?: string
  hint?: string | null
}

function isPostgrestError(value: unknown): value is PostgrestError {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'message' in value &&
      'code' in value &&
      typeof (value as Record<string, unknown>).code === 'string'
  )
}

function messageFromDuplicate(details: string | undefined, fallback: string) {
  if (!details) return fallback
  const normalized = details.toLowerCase()
  if (normalized.includes('whatsapp')) {
    return 'WhatsApp ja cadastrado para outro registro.'
  }
  if (normalized.includes('cnpj')) {
    return 'CNPJ ja cadastrado. Verifique os dados informados.'
  }
  if (normalized.includes('email')) {
    return 'E-mail ja cadastrado.'
  }
  return fallback
}

export function mapSupabaseError(error: unknown, fallback = 'Falha ao processar solicitacao. Tente novamente.'): Error {
  if (isPostgrestError(error)) {
    const duplicateFallback = 'Registro duplicado identificado. Revise os dados e tente novamente.'
    if (error.code === '23505') {
      return new Error(messageFromDuplicate(error.details, duplicateFallback))
    }
    if (error.code === '23503') {
      return new Error('Acao bloqueada por dependencia de dados relacionada.')
    }
    if (error.code === '22P02') {
      return new Error('Formato de dado invalido enviado ao Supabase.')
    }
    const message = error.message || fallback
    return new Error(message)
  }

  if (error && typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
    const generic = (error as SupabaseErrorLike).message
    return new Error(generic || fallback)
  }

  if (typeof error === 'string') {
    return new Error(error)
  }

  return new Error(fallback)
}

export function throwSupabaseError(error: unknown, fallback: string): never {
  throw mapSupabaseError(error, fallback)
}
