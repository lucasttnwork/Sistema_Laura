import { useCallback, useEffect, useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import { Heading } from '../components/ui/heading'
import { supabase } from '../lib/supabaseClient'

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

type CotacaoWithRelations = Cotacao & {
  solicitacoes?: (Cotacao['solicitacoes'] & {
    id?: string
    fiscais?: { nome?: string; contato?: { nome?: string } | null } | null
    obras?: { nome?: string } | null
  }) | null
  fornecedores?: (Cotacao['fornecedores'] & { id?: string; nome?: string }) | null
}

type CotacoesRecebidasItem = {
  id: string
  valor_total_geral: number | string
  status: string
  created_at: string
  fornecedores?: { nome?: string; contato?: { nome?: string } | null } | null
}

type DisparoFornecedorItem = {
  id: string
  data_envio: string
  status: string
  fornecedores?: { id?: string; nome?: string; contato?: { nome?: string } | null } | null
}

type CotacaoDetails = {
  cotacao: CotacaoWithRelations
  cotacoesRecebidas: CotacoesRecebidasItem[]
  disparos: DisparoFornecedorItem[]
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

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedCotacaoId, setSelectedCotacaoId] = useState<string | null>(null)
  const [details, setDetails] = useState<CotacaoDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  const fetchCotacoes = useCallback(async () => {
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('cotacoes')
      .select(
        `
        id,
        valor_total_geral,
        status,
        created_at,
        solicitacoes:solicitacoes!cotacoes_solicitacao_id_fkey ( codigo ),
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
  }, [])

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

  const loadDetails = useCallback(async (cotacaoId: string) => {
    setDetailsLoading(true)
    setDetailsError(null)
    setDetails(null)

    // 1) Buscar cotação com relações (solicitação, fiscal, obra, fornecedor)
    const { data: cotacaoRows, error: errCotacao } = await supabase
      .from('cotacoes')
      .select(
        `
        id,
        valor_total_geral,
        status,
        created_at,
        solicitacoes:solicitacoes!cotacoes_solicitacao_id_fkey (
          id,
          codigo,
          fiscais:fiscais ( nome, contato:contatos ( nome ) ),
          obras:obras ( nome )
        ),
        fornecedores:fornecedores ( id, nome, contato:contatos ( nome ) )
      `,
      )
      .eq('id', cotacaoId)
      .limit(1)

    if (errCotacao) {
      setDetailsError(errCotacao.message)
      setDetailsLoading(false)
      return
    }

    const cotacao = (cotacaoRows?.[0] as unknown as CotacaoWithRelations) || null
    if (!cotacao || !cotacao.solicitacoes?.id) {
      setDetailsError('Não foi possível carregar detalhes da cotação ou da solicitação relacionada.')
      setDetailsLoading(false)
      return
    }

    const solicitacaoId = cotacao.solicitacoes.id

    // 2) Buscar todas as cotações recebidas para a mesma solicitação
    const { data: recebidas, error: errRecebidas } = await supabase
      .from('cotacoes')
      .select(
        `
        id,
        valor_total_geral,
        status,
        created_at,
        fornecedores:fornecedores ( nome, contato:contatos ( nome ) )
      `,
      )
      .eq('solicitacao_id', solicitacaoId)
      .order('created_at', { ascending: false })

    if (errRecebidas) {
      setDetailsError(errRecebidas.message)
      setDetailsLoading(false)
      return
    }

    // 3) Buscar disparos/enviados aos fornecedores para esta solicitação
    const { data: disparos, error: errDisparos } = await supabase
      .from('dashboard_disparos_lista')
      .select(
        `
        id,
        data_envio,
        status,
        fornecedores:fornecedores ( id, nome, contato:contatos ( nome ) )
      `,
      )
      .eq('solicitacao_id', solicitacaoId)
      .order('data_envio', { ascending: false })
 
    let disparosProcessados: DisparoFornecedorItem[] = []
    if (errDisparos) {
      if (errDisparos.message?.includes('dashboard_disparos_lista')) {
        disparosProcessados = []
      } else {
        setDetailsError(errDisparos.message)
        setDetailsLoading(false)
        return
      }
    } else {
      disparosProcessados = (disparos as unknown as DisparoFornecedorItem[]) || []
    }
 
    setDetails({
      cotacao: cotacao,
      cotacoesRecebidas: (recebidas as unknown as CotacoesRecebidasItem[]) || [],
      disparos: disparosProcessados,
    })
    setDetailsLoading(false)
  }, [])

  const handleRowClick = (id: string) => {
    setSelectedCotacaoId(id)
    setDetailsOpen(true)
    loadDetails(id)
  }

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
                <tr
                  key={cot.id}
                  className="cursor-pointer transition hover:bg-muted/40"
                  onClick={() => handleRowClick(cot.id)}
                >
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

      {/* Modal de Detalhes da Cotação / Solicitação */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} dataTestId="cotacao-details-dialog">
        <DialogHeader>
          <DialogTitle>
            {details?.cotacao?.solicitacoes?.codigo
              ? `Solicitação ${details.cotacao.solicitacoes.codigo}`
              : 'Detalhes da Cotação'}
          </DialogTitle>
          <DialogDescription>
            {selectedCotacaoId ? `Cotação ${selectedCotacaoId}` : null}
          </DialogDescription>
        </DialogHeader>

        {detailsLoading && (
          <div className="py-4 text-sm text-muted-foreground">Carregando detalhes...</div>
        )}

        {detailsError && !detailsLoading && (
          <Alert variant="danger" dataTestId="cotacao-details-error">
            <div className="space-y-1">
              <AlertTitle>Erro ao carregar detalhes</AlertTitle>
              <AlertDescription>{detailsError}</AlertDescription>
            </div>
          </Alert>
        )}

        {!detailsLoading && !detailsError && details && (
          <div className="space-y-6">
            {/* Bloco: Solicitação / Fiscal / Obra */}
            <div className="grid gap-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Fiscal: </span>
                <span className="font-medium">
                  {details.cotacao.solicitacoes?.fiscais?.nome || details.cotacao.solicitacoes?.fiscais?.contato?.nome || 'N/A'}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Obra: </span>
                <span className="font-medium">{details.cotacao.solicitacoes?.obras?.nome || 'N/A'}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Fornecedor desta cotação: </span>
                <span className="font-medium">{details.cotacao.fornecedores?.nome || details.cotacao.fornecedores?.contato?.nome || 'N/A'}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Valor Total desta cotação: </span>
                <span className="font-medium">{CURRENCY_FORMATTER.format(Number(details.cotacao.valor_total_geral) || 0)}</span>
              </p>
            </div>

            {/* Bloco: Cotações Recebidas para esta Solicitação */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Cotações Recebidas ({details.cotacoesRecebidas.length})</h3>
              <div className="space-y-2">
                {details.cotacoesRecebidas.map((c) => (
                  <div key={c.id} className="rounded-md border border-outline/60 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {c.fornecedores?.nome || c.fornecedores?.contato?.nome || 'Fornecedor N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Recebida em: {DATE_FORMATTER.format(new Date(c.created_at))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{CURRENCY_FORMATTER.format(Number(c.valor_total_geral) || 0)}</p>
                        <Badge variant={getStatusVariant(c.status)}>{c.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {details.cotacoesRecebidas.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma cotação recebida para esta solicitação.</p>
                )}
              </div>
            </div>

            {/* Bloco: Pedidos enviados aos fornecedores (disparos) */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Pedidos Enviados a Fornecedores ({details.disparos.length})</h3>
              <div className="space-y-2">
                {details.disparos.map((d) => (
                  <div key={d.id} className="rounded-md border border-outline/60 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {d.fornecedores?.nome || d.fornecedores?.contato?.nome || 'Fornecedor N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Enviado em: {DATE_FORMATTER.format(new Date(d.data_envio))}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusVariant(d.status)}>{d.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {details.disparos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum pedido enviado registrado para esta solicitação.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </Dialog>
    </section>
  )
}

export default CotacoesPage
