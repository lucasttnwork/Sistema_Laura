import { useCallback, useEffect, useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Heading } from '../components/ui/heading'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../stores/authStore'

const CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

type Cotacao = {
  id: string
  valor_total_geral: number | string
  status: string
  created_at: string
  solicitacoes?: {
    codigo?: string
  } | null
  fornecedores?: {
    contato?: {
      nome?: string
    } | null
  } | null
}

function getStatusVariant(status: string) {
  const normalized = status.toLowerCase()
  if (['aprovada', 'fechada', 'finalizada'].some((value) => normalized.includes(value))) {
    return 'positive' as const
  }
  if (['pendente', 'aguardando', 'aberta'].some((value) => normalized.includes(value))) {
    return 'warning' as const
  }
  if (['recusada', 'cancelada'].some((value) => normalized.includes(value))) {
    return 'danger' as const
  }
  return 'outline' as const
}

function CotacoesPage() {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const token = useAuthStore((state) => state.token)

  const fetchCotacoes = useCallback(async () => {
    setLoading(true)
    if (!token) {
      setCotacoes([])
      setError(null)
      setLoading(false)
      return
    }

    const { data, error: queryError } = await supabase
      .from('cotacoes')
      .select(
        `
        id,
        valor_total_geral,
        status,
        created_at,
        solicitacoes ( codigo ),
        fornecedores ( contato:contatos ( nome ) )
      `,
      )
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('Erro ao buscar cotacoes:', queryError)
      const message = (queryError.message || '').toLowerCase()
      if (message.includes('permission denied') || message.includes('schema public')) {
        setError('Sem permissao para listar cotacoes no momento.')
        setCotacoes([])
      } else {
        setError(queryError.message)
        setCotacoes([])
      }
    } else {
      setError(null)
      setCotacoes((data as Cotacao[]) ?? [])
    }
    setLoading(false)
  }, [token])

  useEffect(() => {
    fetchCotacoes()

    const channel = supabase
      .channel('cotacoes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotacoes' }, () => {
        fetchCotacoes()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchCotacoes])

  const content = useMemo(() => {
    if (loading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <p data-testid="cotacoes-loading">Carregando cotacoes...</p>
          </CardContent>
        </Card>
      )
    }

    if (error) {
      return (
        <Alert dataTestId="cotacoes-error" variant="danger" className="max-w-2xl">
          <div className="space-y-1">
            <AlertTitle>Erro ao carregar dados</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      )
    }

    if (cotacoes.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <p data-testid="cotacoes-empty-state">Nenhuma cotacao encontrada.</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card dataTestId="cotacoes-card" className="shadow-medium">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Cotacoes recentes
          </CardTitle>
          <CardDescription>Resumo das ultimas negociacoes</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <table data-testid="cotacoes-table" className="min-w-full divide-y divide-outline/60 text-left text-sm">
            <thead className="bg-surface">
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="px-6 py-3 font-medium">Solicitacao</th>
                <th className="px-6 py-3 font-medium">Fornecedor</th>
                <th className="px-6 py-3 font-medium">Valor Total</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/40">
              {cotacoes.map((cot) => (
                <tr key={cot.id} className="transition hover:bg-muted/40">
                  <td className="px-6 py-4 font-medium text-foreground">{cot.solicitacoes?.codigo || 'N/A'}</td>
                  <td className="px-6 py-4 text-muted-foreground">{cot.fornecedores?.contato?.nome || 'N/A'}</td>
                  <td className="px-6 py-4 text-muted-foreground">{CURRENCY_FORMATTER.format(Number(cot.valor_total_geral) || 0)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={getStatusVariant(cot.status)} dataTestId={`badge-status-${cot.id}`}>
                      {cot.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {DATE_FORMATTER.format(new Date(cot.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    )
  }, [loading, error, cotacoes])

  return (
    <section data-testid="cotacoes-page" className="space-y-6">
      <Heading level={1} size="lg" dataTestId="page-heading-cotacoes">
        Lista de Cotacoes (Tempo Real)
      </Heading>
      {content}
    </section>
  )
}

export default CotacoesPage
