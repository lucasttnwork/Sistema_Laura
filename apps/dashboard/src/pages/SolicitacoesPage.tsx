import { useEffect, useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContentSmall, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Heading } from '../components/ui/heading'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../stores/authStore'
import { cn } from '../lib/cn'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

type Fiscal = {
  id: string
  nome: string | null
  contato: {
    id: string
    nome: string
    whatsapp: string
  } | null
}

type Obra = {
  id: string
  nome: string
  endereco: string | null
  cidade: string | null
  estado: string | null
}

type Cotacao = {
  id: string
  fornecedor_id: string
  valor_total_geral: number
  status: string
  created_at: string
  fornecedor: {
    id: string
    nome: string | null
    contato: {
      nome: string
    } | null
  } | null
}

type Aprovacao = {
  id: string
  status: string
  valor_negociado_final: number | null
  aprovado_por: string | null
  data_aprovacao: string | null
}

type Solicitacao = {
  id: string
  codigo: string
  pedido: string
  urgencia: string | null
  status: string
  cotacao_escolhida: string | null
  valor_estimado: number | null
  observacoes: string | null
  created_at: string
  updated_at: string
  fiscal: Fiscal | null
  obra: Obra | null
  cotacoes: Cotacao[]
  cotacao_escolhida_rel: (Cotacao & { id: string }) | null
  aprovacoes: Aprovacao | null
}

function getStatusVariant(status: string) {
  const normalized = (status || '').toLowerCase()
  if (['finalizada', 'pago'].some((value) => normalized.includes(value))) {
    return 'positive' as const
  }
  if (['aguardando_fornecedores', 'cotacoes_recebidas', 'aguardando_pagamento'].some((value) => normalized.includes(value))) {
    return 'warning' as const
  }
  if (['cancelada', 'rejeitada'].some((value) => normalized.includes(value))) {
    return 'danger' as const
  }
  return 'outline' as const
}

function getUrgenciaVariant(urgencia: string | null) {
  if (!urgencia) return 'outline' as const
  const normalized = urgencia.toLowerCase()
  if (normalized === 'emergencial') return 'danger' as const
  if (normalized === 'urgente') return 'warning' as const
  return 'outline' as const
}

const formatCurrency = (value: number | null) => {
  if (!value) return 'N/A'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

function SolicitacoesPage() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<Solicitacao | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapaCotacao, setMapaCotacao] = useState<string | null>(null)
  const [selectingCotacao, setSelectingCotacao] = useState(false)
  const [selectedCotacaoId, setSelectedCotacaoId] = useState<string | null>(null)
  const [updatingCotacao, setUpdatingCotacao] = useState(false)
  const [confirmSelectOpen, setConfirmSelectOpen] = useState(false)
  const token = useAuthStore((state) => state.token)

  const SELECTED_COTACAO_STATUSES = useMemo(() => ['escolhida', 'aguardando_pagamento', 'pago', 'finalizada', 'aprovada'], [])

  const cotacaoSelecionada = useMemo(() => {
    if (!selectedSolicitacao) {
      return null
    }

    if (selectedSolicitacao.cotacao_escolhida) {
      const fromList = selectedSolicitacao.cotacoes.find((cotacao) => cotacao.id === selectedSolicitacao.cotacao_escolhida)
      if (fromList) {
        return fromList
      }
      if (selectedSolicitacao.cotacao_escolhida_rel) {
        return selectedSolicitacao.cotacao_escolhida_rel
      }
    }

    if (selectedCotacaoId) {
      const inMemory = selectedSolicitacao.cotacoes.find((cotacao) => cotacao.id === selectedCotacaoId)
      if (inMemory) {
        return inMemory
      }
    }

    const fallback = selectedSolicitacao.cotacoes.find((cotacao) =>
      SELECTED_COTACAO_STATUSES.includes((cotacao.status || '').toLowerCase())
    )
    return fallback ?? null
  }, [selectedSolicitacao, selectedCotacaoId, SELECTED_COTACAO_STATUSES])

  const solicitationHasChosen = Boolean(selectedSolicitacao?.cotacao_escolhida)

  useEffect(() => {
    const fetchSolicitacoes = async () => {
      setLoading(true)

      const { data, error: queryError } = await supabase
        .from('solicitacoes')
        .select(
          `
            id,
            codigo,
            pedido,
            urgencia,
            status,
            cotacao_escolhida,
            valor_estimado,
            observacoes,
            created_at,
            updated_at,
            fiscal:fiscais(
              id,
              nome,
              contato:contatos(
                id,
                nome,
                whatsapp
              )
            ),
            obra:obras(
              id,
              nome,
              endereco,
              cidade,
              estado
            ),
            cotacoes:cotacoes!cotacoes_solicitacao_id_fkey(
              id,
              solicitacao_id,
              fornecedor_id,
              valor_total_geral,
              status,
              condicoes_pagamento,
              created_at,
              fornecedor:fornecedores(
                id,
                nome,
                contato:contatos(
                  nome
                )
              )
            ),
            cotacao_escolhida_rel:cotacoes!solicitacoes_cotacao_escolhida_fkey(
              id,
              condicoes_pagamento,
              status,
              valor_total_geral,
              created_at,
              fornecedor:fornecedores(
                id,
                nome,
                contato:contatos(
                  nome
                )
              )
            ),
            aprovacoes(
              id,
              status,
              valor_negociado_final,
              aprovado_por,
              data_aprovacao
            )
          `,
        )
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
        setSolicitacoes((data as any[])?.map(item => ({
          id: item.id,
          codigo: item.codigo,
          pedido: item.pedido,
          urgencia: item.urgencia,
          status: item.status,
          cotacao_escolhida: item.cotacao_escolhida,
          valor_estimado: item.valor_estimado,
          observacoes: item.observacoes,
          created_at: item.created_at,
          updated_at: item.updated_at,
          fiscal: item.fiscal ? {
            id: item.fiscal.id,
            nome: item.fiscal.nome,
            contato: item.fiscal.contato
          } : null,
          obra: item.obra ? {
            id: item.obra.id,
            nome: item.obra.nome,
            endereco: item.obra.endereco,
            cidade: item.obra.cidade,
            estado: item.obra.estado
          } : null,
          cotacoes: item.cotacoes || [],
          cotacao_escolhida_rel: item.cotacao_escolhida_rel || null,
          aprovacoes: item.aprovacoes || null
        })) ?? [])
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cotacoes' },
        () => {
          fetchSolicitacoes()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aprovacoes' },
        () => {
          fetchSolicitacoes()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [token])

  useEffect(() => {
    if (!selectedSolicitacao?.id) {
      setMapaCotacao(null)
      return
    }

    let isMounted = true
    setMapaCotacao(null)

    const fetchMapaCotacao = async () => {
      const { data, error: mapaError } = await supabase
        .from('Mapa_cotacao')
        .select('mapa_cotacao')
        .eq('solicitacao_id', selectedSolicitacao.id)
        .maybeSingle()

      if (!isMounted) {
        return
      }

      if (mapaError) {
        if (mapaError.code !== 'PGRST116') {
          console.error('Erro ao buscar mapa de cotação:', mapaError)
        }
        setMapaCotacao(null)
        return
      }

      setMapaCotacao(data?.mapa_cotacao ?? null)
    }

    fetchMapaCotacao()

    const channel = supabase
      .channel(`mapa_cotacao_${selectedSolicitacao.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Mapa_cotacao',
          filter: `solicitacao_id=eq.${selectedSolicitacao.id}`,
        },
        () => {
          fetchMapaCotacao()
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [selectedSolicitacao?.id])

  useEffect(() => {
    if (!isModalOpen) {
      setSelectingCotacao(false)
      setSelectedCotacaoId(null)
      setUpdatingCotacao(false)
    }
  }, [isModalOpen])

  useEffect(() => {
    setSelectedCotacaoId(null)
    setSelectingCotacao(false)
  }, [selectedSolicitacao?.id])

  useEffect(() => {
    if (!selectedSolicitacao?.cotacao_escolhida) {
      return
    }

    const alreadyLoaded = selectedSolicitacao.cotacoes.some(
      (cotacao) => cotacao.id === selectedSolicitacao.cotacao_escolhida,
    )

    if (alreadyLoaded) {
      return
    }

    let isMounted = true

    supabase
      .from('cotacoes')
      .select('id, condicoes_pagamento, status, created_at, valor_total_geral, fornecedor_id, solicitacao_id, fornecedor:fornecedores(id, nome, contato:contatos(nome))')
      .eq('id', selectedSolicitacao.cotacao_escolhida)
      .maybeSingle()
      .then(({ data }) => {
        if (!isMounted || !data) {
          return
        }

        setSolicitacoes((prev) =>
          prev.map((sol) => {
            if (sol.id !== selectedSolicitacao.id) {
              return sol
            }
            const alreadyExists = sol.cotacoes.some((cot) => cot.id === data.id)
            if (alreadyExists) {
              return sol
            }
            return {
              ...sol,
              cotacoes: [...sol.cotacoes, data as Cotacao],
            }
          }),
        )
      })

    return () => {
      isMounted = false
    }
  }, [selectedSolicitacao, setSolicitacoes])

  const handleSelectCotacao = async () => {
    if (!selectedSolicitacao || !selectedCotacaoId) {
      return
    }

    setUpdatingCotacao(true)

    try {
      const { error: updateChosenError } = await supabase
        .from('cotacoes')
        .update({ status: 'escolhida' })
        .eq('id', selectedCotacaoId)

      if (updateChosenError) {
        throw updateChosenError
      }

      const { error: updateOthersError } = await supabase
        .from('cotacoes')
        .update({ status: 'rejeitada' })
        .eq('solicitacao_id', selectedSolicitacao.id)
        .neq('id', selectedCotacaoId)

      if (updateOthersError) {
        throw updateOthersError
      }

      const { error: updateSolicitacaoError } = await supabase
        .from('solicitacoes')
        .update({ status: 'Cotação Escolhida', cotacao_escolhida: selectedCotacaoId })
        .eq('id', selectedSolicitacao.id)

      if (updateSolicitacaoError) {
        throw updateSolicitacaoError
      }

      await fetch('https://primary-production-3fbb3.up.railway.app/webhook/6eefa1fa-b036-469d-ab9a-f63e45a7bba9', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cotacaoId: selectedCotacaoId }),
      })

      setSelectingCotacao(false)
      setSelectedCotacaoId(null)
      setIsModalOpen(false)
    } catch (err) {
      console.error('Erro ao definir cotação escolhida:', err)
    } finally {
      setUpdatingCotacao(false)
    }
  }

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
                  Código
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Fiscal
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Obra
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Urgência
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Valor Estimado
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Cotações
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Criada em
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/40">
              {solicitacoes.map((sol) => (
                <tr
                  key={sol.id}
                  className="transition hover:bg-muted/40 cursor-pointer"
                  onClick={() => {
                    setSelectedSolicitacao(sol)
                    setIsModalOpen(true)
                  }}
                >
                  <td className="px-6 py-4 font-medium text-foreground">{sol.codigo}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {sol.fiscal?.contato?.nome || sol.fiscal?.nome || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {sol.obra?.nome || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getStatusVariant(sol.status)} dataTestId={`badge-status-${sol.id}`}>
                      {(sol.status || '').replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getUrgenciaVariant(sol.urgencia)} dataTestId={`badge-urgencia-${sol.id}`}>
                      {sol.urgencia ?? 'normal'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatCurrency(sol.valor_estimado)}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {sol.cotacoes?.length || 0} cotação(ões)
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
        Lista de Solicitações (Tempo Real)
      </Heading>
      {content}
      
      {/* Modal de Detalhes */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} dataTestId="solicitacao-details-dialog">
        {selectedSolicitacao && (
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle>Solicitação {selectedSolicitacao.codigo}</DialogTitle>
              <DialogDescription>
                Status: {(selectedSolicitacao.status || '').replace('_', ' ')} | 
                Urgência: {selectedSolicitacao.urgencia || 'normal'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground">Informações Básicas</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Fiscal Responsável</label>
                      <p className="text-sm font-medium">
                        {selectedSolicitacao.fiscal?.contato?.nome || selectedSolicitacao.fiscal?.nome || 'N/A'}
                      </p>
                      {selectedSolicitacao.fiscal?.contato?.whatsapp && (
                        <p className="text-xs text-muted-foreground">
                          WhatsApp: {selectedSolicitacao.fiscal.contato.whatsapp}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Obra</label>
                      <p className="text-sm font-medium">{selectedSolicitacao.obra?.nome || 'N/A'}</p>
                      {selectedSolicitacao.obra?.endereco && (
                        <p className="text-xs text-muted-foreground">
                          {selectedSolicitacao.obra.endereco}
                          {selectedSolicitacao.obra.cidade && `, ${selectedSolicitacao.obra.cidade}`}
                          {selectedSolicitacao.obra.estado && `/${selectedSolicitacao.obra.estado}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pedido */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Descrição do Pedido</label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{selectedSolicitacao.pedido}</p>
                  </div>
                </div>

                {/* Observações */}
                {selectedSolicitacao.observacoes && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Observações</label>
                    <div className="p-3 bg-muted/50 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{selectedSolicitacao.observacoes}</p>
                    </div>
                  </div>
                )}

                {/* Cotações */}
                {selectedSolicitacao.cotacoes && selectedSolicitacao.cotacoes.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3 justify-between">
                      <h3 className="text-sm font-medium text-foreground">
                        Cotações Recebidas ({selectedSolicitacao.cotacoes.length})
                      </h3>
                      <div className="flex items-center gap-2">
                        {selectingCotacao && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (!updatingCotacao) {
                                setSelectingCotacao(false)
                                setSelectedCotacaoId(null)
                              }
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant={selectingCotacao ? 'default' : 'secondary'}
                          onClick={() => {
                            if (solicitationHasChosen) {
                              return
                            }
                            if (selectingCotacao) {
                              if (selectedCotacaoId) {
                                setConfirmSelectOpen(true)
                              }
                            } else {
                              setSelectingCotacao(true)
                            }
                          }}
                          disabled={
                            solicitationHasChosen ||
                            (selectingCotacao && !selectedCotacaoId) ||
                            updatingCotacao
                          }
                          className={cn(
                            selectingCotacao ? 'gap-2' : '',
                            updatingCotacao ? 'opacity-70' : '',
                          )}
                        >
                          {solicitationHasChosen
                            ? 'Cotação já escolhida'
                            : updatingCotacao
                              ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processando...
                                  </>
                                )
                              : selectingCotacao
                                ? 'Selecionar'
                                : 'Escolher Cotação'}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {selectedSolicitacao.cotacoes.map((cotacao) => {
                        const isSelected = selectedCotacaoId === cotacao.id
                        const isDisabled = selectingCotacao && (updatingCotacao || solicitationHasChosen)
                        const alreadyChosen = cotacao.status === 'escolhida'
                        return (
                          <button
                            key={cotacao.id}
                            type="button"
                            disabled={selectingCotacao ? isDisabled : solicitationHasChosen || alreadyChosen}
                            onClick={() => {
                              if (!selectingCotacao || updatingCotacao || solicitationHasChosen) {
                                return
                              }
                              setSelectedCotacaoId(cotacao.id === selectedCotacaoId ? null : cotacao.id)
                            }}
                            className={cn(
                              'w-full text-left rounded-md border border-outline/40 bg-muted/30 p-3 transition flex items-start justify-between gap-4',
                              selectingCotacao ? 'cursor-pointer hover:border-primary/60' : 'cursor-default',
                              isSelected ? 'border-primary bg-primary/5' : '',
                              selectingCotacao && !isSelected ? 'opacity-80' : '',
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {selectingCotacao ? (
                                isSelected ? (
                                  <CheckCircle2 className="mt-1 h-4 w-4 text-primary" />
                                ) : (
                                  <Circle className="mt-1 h-4 w-4 text-muted-foreground" />
                                )
                              ) : null}
                              <div>
                                <p className="text-sm font-medium">
                                  {cotacao.fornecedor?.contato?.nome || cotacao.fornecedor?.nome || 'Fornecedor N/A'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Recebida em: {DATE_FORMATTER.format(new Date(cotacao.created_at))}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatCurrency(cotacao.valor_total_geral)}</p>
                              <Badge variant={getStatusVariant(cotacao.status)}>
                                {cotacao.status}
                              </Badge>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Aprovação */}
                {selectedSolicitacao.aprovacoes && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-foreground">Informações de Aprovação</h3>
                    <div className="p-3 bg-muted/30 rounded-md space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Status da Aprovação:</span>
                        <Badge variant={getStatusVariant(selectedSolicitacao.aprovacoes.status)}>
                          {(selectedSolicitacao.aprovacoes.status || '').replace('_', ' ')}
                        </Badge>
                      </div>
                      {selectedSolicitacao.aprovacoes.valor_negociado_final && (
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Valor Final Negociado:</span>
                          <span className="text-sm font-medium">
                            {formatCurrency(selectedSolicitacao.aprovacoes.valor_negociado_final)}
                          </span>
                        </div>
                      )}
                      {selectedSolicitacao.aprovacoes.aprovado_por && (
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Aprovado por:</span>
                          <span className="text-sm">{selectedSolicitacao.aprovacoes.aprovado_por}</span>
                        </div>
                      )}
                      {selectedSolicitacao.aprovacoes.data_aprovacao && (
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Data da Aprovação:</span>
                          <span className="text-sm">
                            {DATE_FORMATTER.format(new Date(selectedSolicitacao.aprovacoes.data_aprovacao))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Mapa de Cotação */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Mapa de Cotação</h3>
                  <div className="rounded-md border border-outline/60 bg-muted/20 p-3">
                    {mapaCotacao ? (
                      <pre className="whitespace-pre-wrap break-words text-sm text-foreground">{mapaCotacao}</pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum mapa de cotação disponível.</p>
                    )}
                  </div>
                </div>

                {/* Condições de Pagamento da Cotação Selecionada */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Condições de Pagamento</h3>
                  <div className="rounded-md border border-outline/60 bg-muted/20 p-3">
                    {cotacaoSelecionada?.condicoes_pagamento ? (
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {cotacaoSelecionada.condicoes_pagamento}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Defina uma cotação para visualizar as condições de pagamento.
                      </p>
                    )}
                  </div>
                </div>

                {/* Histórico */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Histórico</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Criada em:</span>
                      <p className="text-sm">{DATE_FORMATTER.format(new Date(selectedSolicitacao.created_at))}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Última atualização:</span>
                      <p className="text-sm">{DATE_FORMATTER.format(new Date(selectedSolicitacao.updated_at))}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      <Dialog open={confirmSelectOpen} onClose={() => !updatingCotacao && setConfirmSelectOpen(false)}>
        <DialogContentSmall>
          <DialogHeader>
            <DialogTitle>Confirmar escolha da cotação</DialogTitle>
            <DialogDescription>
              Esta ação não poderá ser desfeita. Tem certeza de que deseja prosseguir?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmSelectOpen(false)}
              disabled={updatingCotacao}
            >
              Não
            </Button>
            <Button
              type="button"
              onClick={() => {
                setConfirmSelectOpen(false)
                handleSelectCotacao()
              }}
              disabled={updatingCotacao}
            >
              Sim, confirmar
            </Button>
          </DialogFooter>
        </DialogContentSmall>
      </Dialog>
    </section>
  )
}

export default SolicitacoesPage

