const ERROR_REPORT_URL = import.meta.env.VITE_ERROR_REPORT_URL ?? ''
const EXPLICIT_OPT_IN = import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true'
const EXPLICIT_OPT_OUT = import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'false'
const SHOULD_REPORT_REMOTE = Boolean(ERROR_REPORT_URL) && (EXPLICIT_OPT_IN || (!import.meta.env.DEV && !EXPLICIT_OPT_OUT))

const GLOBAL_THROTTLE_MS = 5000
const MAX_CACHE_SIZE = 50

export type ErrorContext = {
  source?: string
  componentStack?: string
  metadata?: Record<string, unknown>
}

export type ErrorReport = {
  name: string
  message: string
  stack?: string
  context?: ErrorContext
  timestamp: string
  url?: string
}

const throttleTimestamps = new Map<string, number>()
const throttleQueue: string[] = []
let globalHandlersRegistered = false

function normalizeError(error: unknown): Pick<ErrorReport, 'name' | 'message' | 'stack'> {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack ?? undefined,
    }
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
    }
  }

  if (typeof error === 'object' && error !== null) {
    try {
      return {
        name: 'Error',
        message: JSON.stringify(error),
      }
    } catch (stringifyError) {
      return {
        name: 'Error',
        message: `Non-serializable error: ${String(stringifyError)}`,
      }
    }
  }

  return {
    name: 'Error',
    message: String(error),
  }
}

function shouldThrottle(key: string): boolean {
  const now = Date.now()
  const last = throttleTimestamps.get(key)
  if (last && now - last < GLOBAL_THROTTLE_MS) {
    return true
  }

  throttleTimestamps.set(key, now)
  throttleQueue.push(key)
  if (throttleQueue.length > MAX_CACHE_SIZE) {
    const oldest = throttleQueue.shift()
    if (oldest) {
      throttleTimestamps.delete(oldest)
    }
  }

  return false
}

function sendRemoteReport(report: ErrorReport) {
  if (!SHOULD_REPORT_REMOTE) {
    return
  }

  try {
    const body = JSON.stringify(report)

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      const delivered = navigator.sendBeacon(ERROR_REPORT_URL, blob)
      if (delivered) {
        return
      }
    }

    if (typeof fetch === 'function') {
      fetch(ERROR_REPORT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        keepalive: true,
      }).catch((err) => {
        console.warn('[observability] Failed to send remote error report', err)
      })
    }
  } catch (err) {
    console.warn('[observability] Unexpected failure while reporting error', err)
  }
}

export function reportError(error: unknown, context: ErrorContext = {}): void {
  const base = normalizeError(error)
  const payload: ErrorReport = {
    ...base,
    context: Object.keys(context).length > 0 ? context : undefined,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  }

  console.error('[observability]', payload)

  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => sendRemoteReport(payload))
  } else {
    setTimeout(() => sendRemoteReport(payload), 0)
  }
}

function handleWindowError(event: ErrorEvent) {
  const key = `${event.message ?? 'unknown'}::${event.filename ?? 'no-file'}`
  if (shouldThrottle(key)) {
    return
  }

  reportError(event.error ?? event.message ?? 'Unknown window error', {
    source: 'window.onerror',
    metadata: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
  })
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const reason = event.reason ?? 'Unknown rejection'
  const key = typeof reason === 'string' ? reason : normalizeError(reason).message
  if (shouldThrottle(`unhandledrejection::${key}`)) {
    return
  }

  reportError(reason, {
    source: 'unhandledrejection',
  })
}

export function initializeObservability(): void {
  if (typeof window === 'undefined' || globalHandlersRegistered) {
    return
  }

  window.addEventListener('error', handleWindowError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  globalHandlersRegistered = true
}
