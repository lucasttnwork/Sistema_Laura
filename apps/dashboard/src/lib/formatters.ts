export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '')
}

export function formatWhatsapp(value: string): string {
  const digits = onlyDigits(value)
  if (digits.length === 0) return ''
  const country = digits.length > 11 ? digits.slice(0, digits.length - 11) : '55'
  const baseDigits = digits.length > 11 ? digits.slice(-11) : digits
  const ddd = baseDigits.slice(0, 2)
  const firstPart = baseDigits.length > 6 ? baseDigits.slice(2, baseDigits.length - 4) : baseDigits.slice(2)
  const lastPart = baseDigits.slice(-4)
  if (!ddd) return baseDigits
  const prefix = country && country !== '55' ? `+${country} ` : ''
  if (firstPart.length === 0) {
    return `${prefix}(${ddd}`.trim()
  }
  return `${prefix}(${ddd}) ${firstPart}${firstPart.length ? '-' : ''}${lastPart}`.trim()
}

export function normalizeWhatsapp(value: string): string {
  const digits = onlyDigits(value)
  if (digits.length === 13 && digits.startsWith('55')) {
    return digits.slice(-11)
  }
  if (digits.length > 11) {
    return digits.slice(-11)
  }
  return digits
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export function normalizeCnpj(value: string): string {
  return onlyDigits(value).slice(0, 14)
}

export function emptyToNull(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}
