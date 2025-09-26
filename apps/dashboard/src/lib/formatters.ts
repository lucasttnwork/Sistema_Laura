const BRAZIL_COUNTRY_CODE = '55'

export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, '')
}

type FormatWhatsappOptions = {
  includeCountryCode?: boolean
}

type WhatsappParts = {
  countryCode: string
  nationalNumber: string
}

function formatNationalWhatsapp(value: string): string {
  const digits = onlyDigits(value).slice(-11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return digits
  const ddd = digits.slice(0, 2)
  const subscriber = digits.slice(2)
  if (subscriber.length <= 4) {
    return `(${ddd}) ${subscriber}`
  }
  const prefix = subscriber.slice(0, subscriber.length - 4)
  const suffix = subscriber.slice(-4)
  return `(${ddd}) ${prefix}${prefix ? '-' : ''}${suffix}`
}

export function splitWhatsapp(value: string): WhatsappParts {
  const digits = onlyDigits(value)
  if (!digits) {
    return { countryCode: BRAZIL_COUNTRY_CODE, nationalNumber: '' }
  }

  if (digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length >= 12) {
    return {
      countryCode: BRAZIL_COUNTRY_CODE,
      nationalNumber: digits.slice(-11),
    }
  }

  if (digits.length > 11) {
    const nationalNumber = digits.slice(-11)
    const countryDigits = digits.slice(0, digits.length - nationalNumber.length) || BRAZIL_COUNTRY_CODE
    return { countryCode: countryDigits, nationalNumber }
  }

  if (digits.length === 11) {
    return { countryCode: BRAZIL_COUNTRY_CODE, nationalNumber: digits }
  }

  return { countryCode: BRAZIL_COUNTRY_CODE, nationalNumber: digits }
}

export function formatWhatsapp(value: string, options?: FormatWhatsappOptions): string {
  const { countryCode, nationalNumber } = splitWhatsapp(value)
  const formattedNational = formatNationalWhatsapp(nationalNumber)
  if (options?.includeCountryCode && countryCode) {
    if (formattedNational) {
      return `+${countryCode} ${formattedNational}`
    }
    return `+${countryCode}`
  }
  return formattedNational
}

export function extractWhatsappCountryCode(value: string): string {
  const { countryCode } = splitWhatsapp(value)
  return countryCode
}

export function normalizeWhatsapp(value: string): string {
  const { nationalNumber } = splitWhatsapp(value)
  return nationalNumber
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
