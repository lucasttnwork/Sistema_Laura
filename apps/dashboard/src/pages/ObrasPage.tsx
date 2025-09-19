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

type Obra = {
  id: string
  nome: string
  status: string
  created_at: string
}

function getStatusVariant(status: string) {
  const normalized = status.toLowerCase()
  if (['ativa', 'andamento', 'em andamento', 'executando'].some((value) => normalized.includes(value))) {
    return 'positive' as const
  }
  if (['pausada', 'aguardando'].some((value) => normalized.includes(value))) {
    return 'warning' as const
  }
  if (['cancelada', 'encerrada'].some((value) => normalized.includes(value))) {
    return 'danger' as const
  }
  return 'outline' as const
}

function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    const fetchObras = async () => {
      setLoading(true)
      if (!token) {
        setObras([])
        setError(null)
        setLoading(false)
        return
      }

      const { data, error: queryError } = await supabase
        .from('obras')
        .select('id, nome, status, created_at')
        .order('created_at', { ascending: false })

      if (queryError) {
        console.error('Erro ao buscar obras:', queryError)
        const message = (queryError.message || '').toLowerCase()
        if (message.includes('permission denied') || message.includes('schema public')) {
          setError('Sem permissao para listar obras no momento.')
          setObras([])
        } else {
          setError(queryError.message)
          setObras([])
        }
      } else {
        setError(null)
        setObras((data as Obra[]) ?? [])
      }
      setLoading(false)
    }

    fetchObras()

    const channel = supabase
      .channel('obras_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'obras' }, () => {
        fetchObras()
      })
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
            <p data-testid="obras-loading">Carregando obras...</p>
          </CardContent>
        </Card>
      )
    }

    if (error) {
      return (
        <Alert dataTestId="obras-error" variant="danger" className="max-w-2xl">
          <div className="space-y-1">
            <AlertTitle>Erro ao carregar dados</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      )
    }

    if (obras.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <p data-testid="obras-empty-state">Nenhuma obra encontrada.</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card dataTestId="obras-card" className="shadow-medium">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Obras em acompanhamento</CardTitle>
          <CardDescription>Atualizacao em tempo real</CardDescription>
        </CardHeader>
        <CardContent data-testid="obras-table-container" className="overflow-x-auto px-0">
          <table data-testid="obras-table" className="min-w-full divide-y divide-outline/60 text-left text-sm">
            <thead className="bg-surface">
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="px-6 py-3 font-medium">Nome</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Data de Criacao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/40">
              {obras.map((obra) => (
                <tr key={obra.id} className="transition hover:bg-muted/40">
                  <td className="px-6 py-4 font-medium text-foreground">{obra.nome}</td>
                  <td className="px-6 py-4">
                    <Badge variant={getStatusVariant(obra.status)} dataTestId={`badge-obra-status-${obra.id}`}>
                      {obra.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {DATE_FORMATTER.format(new Date(obra.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    )
  }, [loading, error, obras])

  return (
    <section data-testid="obras-page" className="space-y-6">
      <Heading level={1} size="lg" dataTestId="page-heading-obras">
        Lista de Obras (Tempo Real)
      </Heading>
      {content}
    </section>
  )
}

export default ObrasPage
