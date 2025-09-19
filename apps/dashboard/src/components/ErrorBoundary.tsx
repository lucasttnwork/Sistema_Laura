import { Component, type ErrorInfo, type ReactNode } from 'react'

import { reportError } from '../lib/observability'

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, {
      source: 'ErrorBoundary',
      componentStack: info.componentStack ?? undefined,
    })
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center"
          data-testid="error-boundary"
          role="alert"
        >
          <h1 className="text-lg font-semibold">Algo deu errado</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Atualize a pagina ou tente novamente em alguns instantes. Se o erro persistir, contate o suporte.
          </p>
          <button
            className="rounded-md border border-border px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
            onClick={this.handleReload}
            type="button"
          >
            Recarregar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
