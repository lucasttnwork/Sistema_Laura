import { useCallback } from 'react'

import { reportError, type ErrorContext } from '../lib/observability'

type Reporter = (error: unknown, context?: ErrorContext) => void

export function useErrorReporter(baseContext: ErrorContext = {}): Reporter {
  return useCallback<Reporter>(
    (error, context = {}) => {
      const mergedContext: ErrorContext = {
        ...baseContext,
        ...context,
        metadata: {
          ...baseContext.metadata,
          ...context.metadata,
        },
      }

      reportError(error, mergedContext)
    },
    [baseContext],
  )
}
