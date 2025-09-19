import { useEffect, useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Heading } from '../components/ui/heading'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../stores/authStore'

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

type Solicitacao = {
  id: string
  codigo: string
  urgencia: string | null
  status: string
  created_at: string
}

function getStatusVariant(status: string) {
  const normalized = status.toLowerCase()
  if (['aprovado', 'concluido', 'finalizado'].some((value) => normalized.includes(value))) {
    return 'positive' as const
  }
  if (['pendente', 'aguardando', 'analise'].some((value) => normalized.includes(value))) {
    return 'warning' as const
  }
  if (['cancelado', 'rejeitado'].some((value) => normalized.includes(value))) {
    return 'danger' as const
  }
  return 'outline' as const
}

function SolicitacoesPage() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    const fetchSolicitacoes = async () => {
      setLoading(true)
      if (!token) {
        setSolicitacoes([])
        setError(null)
        setLoading(false)
        return
      }

      const { data, error: queryError } = await supabase
        .from('solicitacoes')
        .select('id, codigo, urgencia, status, created_at')
        .order('created_at', { ascending: false })

      if (queryError) {
        console.error('Erro ao buscar solicitacoes:', queryError)
        const message = (queryError.message || '').toLowerCase()
        if (message.includes('permission denied') || message.includes('schema public')) {
          setError('Sem permissao para listar solicitacoes no momento.')
          setSolicitacoes([])
        } else {
          setError(queryError.message)
          setSolicitacoes([])
        }
      } else {
        setError(null)
        setSolicitacoes((data as Solicitacao[]) ?? [])
      }
      setLoading(false)
    }

    fetchSolicitacoes()

    const channel = supabase
      .channel('solicitacoes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitacoes' },
        () => {
          fetchSolicitacoes()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [token])

  const content = useMemo(() => {
    if (loading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <p data-testid="solicitacoes-loading">Carregando solicitacoes...</p>
          </CardContent>
        </Card>
      )
    }

    if (error) {
      return (
        <Alert dataTestId="solicitacoes-error" variant="danger" className="max-w-2xl">
          <div className="space-y-1">
            <AlertTitle>Erro ao carregar dados</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      )
    }

    if (solicitacoes.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <p data-testid="solicitacoes-empty-state">Nenhuma solicitacao encontrada.</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card dataTestId="solicitacoes-card" className="shadow-medium">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Solicitacoes recentes
          </CardTitle>
          <CardDescription>Atualizacao em tempo real</CardDescription>
        </CardHeader>
        <CardContent data-testid="solicitacoes-table-container" className="overflow-x-auto px-0">
          <table data-testid="solicitacoes-table" className="min-w-full divide-y divide-outline/60 text-left text-sm">
            <thead className="bg-surface">
              <tr className="text-xs uppercase text-muted-foreground">
                <th scope="col" className="px-6 py-3 font-medium">
                  Codigo
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Urgencia
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Criada em
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/40">
              {solicitacoes.map((sol) => (
                <tr key={sol.id} className="transition hover:bg-muted/40">
                  <td className="px-6 py-4 font-medium text-foreground">{sol.codigo}</td>
                  <td className="px-6 py-4 text-muted-foreground">{sol.urgencia ?? 'normal'}</td>
                  <td className="px-6 py-4">
                    <Badge variant={getStatusVariant(sol.status)} dataTestId={`badge-status-${sol.id}`}>
                      {sol.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {DATE_FORMATTER.format(new Date(sol.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    )
  }, [loading, error, solicitacoes])

  return (
    <section data-testid="solicitacoes-page" className="space-y-6">
      <Heading level={1} size="lg" dataTestId="page-heading-solicitacoes">
        Lista de Solicitacoes (Tempo Real)
      </Heading>
      {content}
    </section>
  )
}

export default SolicitacoesPage

