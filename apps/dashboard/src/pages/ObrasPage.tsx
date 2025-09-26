import { useEffect, useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { LoadingState } from '../components/LoadingState'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Heading } from '../components/ui/heading'
import { Input } from '../components/ui/input'
import { useCrudForm } from '../hooks/useCrudForm'
import { cn } from '../lib/cn'
import { supabase } from '../lib/supabaseClient'

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const obraStatusOptions = ['ativa', 'pausada', 'finalizada'] as const

type ObraStatus = (typeof obraStatusOptions)[number]

type Obra = {
  id: string
  nome: string
  endereco?: string
  cep?: string
  cidade?: string
  estado?: string
  status: string
  data_inicio?: string
  data_prevista_fim?: string
  created_at: string
  updated_at?: string
}

const obraSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter ao menos 3 caracteres.').max(255, 'Nome muito longo.'),
  endereco: z.string().trim().max(500, 'Endereço muito longo.').optional().or(z.literal('')),
  cep: z.string().trim().regex(/^\d{5}-?\d{3}$/, 'CEP deve ter formato 12345-678 ou 12345678').optional().or(z.literal('')),
  cidade: z.string().trim().max(100, 'Cidade muito longa.').optional().or(z.literal('')),
  estado: z.string().trim().length(2, 'Estado deve ter 2 caracteres (ex: SP)').optional().or(z.literal('')),
  status: z.enum(obraStatusOptions),
  data_inicio: z.string().optional().or(z.literal('')),
  data_prevista_fim: z.string().optional().or(z.literal('')),
})

type ObraFormValues = z.infer<typeof obraSchema>

type DeleteState = {
  open: boolean
  target: Obra | null
  loading: boolean
}

const obraDefaults: ObraFormValues = {
  nome: '',
  endereco: '',
  cep: '',
  cidade: '',
  estado: '',
  status: 'ativa',
  data_inicio: '',
  data_prevista_fim: '',
}

function getStatusVariant(status: string) {
  const normalized = status.toLowerCase()
  if (['ativa', 'andamento', 'em andamento', 'executando'].some((value) => normalized.includes(value))) {
    return 'positive' as const
  }
  if (['pausada', 'aguardando'].some((value) => normalized.includes(value))) {
    return 'warning' as const
  }
  if (['cancelada', 'encerrada', 'finalizada'].some((value) => normalized.includes(value))) {
    return 'danger' as const
  }
  return 'outline' as const
}

function mapToneToVariant(tone: 'success' | 'error' | 'info'): 'positive' | 'danger' | 'info' {
  if (tone === 'success') return 'positive'
  if (tone === 'error') return 'danger'
  return 'info'
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('pt-BR')
  } catch {
    return '-'
  }
}

function formatCep(cep?: string): string {
  if (!cep) return ''
  const digits = cep.replace(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  return cep
}

const SELECT_CLASSES =
  'h-10 w-full rounded-md border border-outline bg-surface px-4 text-sm text-foreground transition-shadow placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'

function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false, target: null, loading: false })

  const {
    form,
    isOpen,
    openCreate,
    openEdit,
    closeForm,
    editing,
    saving,
    setSaving,
    feedback,
    setFeedback,
    resetFeedback,
  } = useCrudForm<ObraFormValues, Obra>({
    schema: obraSchema,
    defaultValues: obraDefaults,
    mapRecordToForm: (record) => ({
      nome: record.nome ?? '',
      endereco: record.endereco ?? '',
      cep: record.cep ?? '',
      cidade: record.cidade ?? '',
      estado: record.estado ?? '',
      status: (record.status as ObraStatus) ?? 'ativa',
      data_inicio: record.data_inicio ? record.data_inicio.split('T')[0] : '',
      data_prevista_fim: record.data_prevista_fim ? record.data_prevista_fim.split('T')[0] : '',
    }),
  })

  const deleteName = useMemo(() => {
    return deleteState.target?.nome ?? ''
  }, [deleteState.target])

  const fetchObras = async () => {
    setLoading(true)
    try {
      const { data, error: queryError } = await supabase
        .from('obras')
        .select('id, nome, endereco, cep, cidade, estado, status, data_inicio, data_prevista_fim, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (queryError) {
        console.error('Erro ao buscar obras:', queryError)
        const message = (queryError.message || '').toLowerCase()
        if (message.includes('permission denied') || message.includes('schema public')) {
          setListError('Sem permissao para listar obras no momento.')
        } else {
          setListError(queryError.message)
        }
        setObras([])
      } else {
        setListError(null)
        setObras((data as Obra[]) ?? [])
      }
    } catch (err) {
      console.error('Falha ao carregar obras', err)
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao carregar obras.'
      setListError(message)
      setObras([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchObras()

    const channel = supabase
      .channel('obras_crud')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'obras' }, () => {
        void fetchObras()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSubmit = form.handleSubmit(async (values) => {
    setSaving(true)
    
    const payload = {
      nome: values.nome.trim(),
      endereco: values.endereco?.trim() || null,
      cep: values.cep?.trim() || null,
      cidade: values.cidade?.trim() || null,
      estado: values.estado?.trim() || null,
      status: values.status,
      data_inicio: values.data_inicio || null,
      data_prevista_fim: values.data_prevista_fim || null,
    }
    
    try {
      if (editing) {
        const { data, error } = await supabase
          .from('obras')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editing.id)
          .select()
          .single()
        
        if (error) throw error
        
        setObras((current) => current.map((item) => (item.id === data.id ? data : item)))
        setFeedback({ tone: 'success', message: 'Obra atualizada com sucesso.' })
      } else {
        const { data, error } = await supabase
          .from('obras')
          .insert(payload)
          .select()
          .single()
        
        if (error) throw error
        
        setObras((current) => [data, ...current])
        setFeedback({ tone: 'success', message: 'Obra criada com sucesso.' })
      }
      closeForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao salvar a obra.'
      setFeedback({ tone: 'error', message: 'Nao foi possivel salvar a obra.', description: message })
    } finally {
      setSaving(false)
    }
  })

  const promptDelete = (record: Obra) => {
    setDeleteState({ open: true, target: record, loading: false })
  }

  const handleDeleteConfirmation = async () => {
    const target = deleteState.target
    if (!target) return
    setDeleteState((prev) => ({ ...prev, loading: true }))
    try {
      const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', target.id)
      
      if (error) throw error
      
      setObras((current) => current.filter((item) => item.id !== target.id))
      setFeedback({ tone: 'success', message: 'Obra removida com sucesso.' })
      setDeleteState({ open: false, target: null, loading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao remover a obra.'
      setFeedback({ tone: 'error', message: 'Nao foi possivel remover a obra.', description: message })
      setDeleteState((prev) => ({ ...prev, loading: false }))
    }
  }

  const handleDeleteDialogChange = (open: boolean) => {
    setDeleteState((prev) => {
      if (prev.loading && !open) {
        return prev
      }
      return { open, target: open ? prev.target : null, loading: prev.loading && open }
    })
  }

  const content = useMemo(() => {
    if (loading) {
      return (
        <Card>
          <CardContent className="px-6 py-6">
            <LoadingState rows={5} />
          </CardContent>
        </Card>
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
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Obras cadastradas</CardTitle>
          <CardDescription>Dados sincronizados com Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table
              data-testid="obras-table"
              className="min-w-[900px] w-full divide-y divide-outline/60 text-left text-sm"
            >
              <thead className="bg-surface">
                <tr className="text-xs uppercase text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Nome</th>
                  <th className="px-6 py-3 font-medium">Endereço</th>
                  <th className="px-6 py-3 font-medium">Cidade/Estado</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Início</th>
                  <th className="px-6 py-3 font-medium">Previsão Fim</th>
                  <th className="px-6 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/40">
                {obras.map((obra) => (
                  <tr key={obra.id} className="transition hover:bg-muted/40">
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">{obra.nome}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {obra.endereco ? (
                        <div className="space-y-1">
                          <div>{obra.endereco}</div>
                          {obra.cep && <div className="text-xs">{formatCep(obra.cep)}</div>}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {obra.cidade || obra.estado ? `${obra.cidade || ''} ${obra.estado || ''}`.trim() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusVariant(obra.status)} dataTestId={`badge-obra-status-${obra.id}`}>
                        {obra.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(obra.data_inicio)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(obra.data_prevista_fim)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          dataTestId={`btn-obra-editar-${obra.id}`}
                          onClick={() => {
                            resetFeedback()
                            openEdit(obra)
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          dataTestId={`btn-obra-remover-${obra.id}`}
                          onClick={() => promptDelete(obra)}
                        >
                          Remover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }, [loading, obras, resetFeedback, openEdit])

  return (
    <section data-testid="obras-page" className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Heading level={1} size="lg" dataTestId="page-heading-obras">
            Obras
          </Heading>
          <p className="text-sm text-muted-foreground">
            Gerencie obras e projetos em andamento.
          </p>
        </div>
        <Button
          type="button"
          dataTestId="btn-nova-obra"
          onClick={() => {
            resetFeedback()
            openCreate()
          }}
        >
          Nova obra
        </Button>
      </div>

      {feedback ? (
        <Alert variant={mapToneToVariant(feedback.tone)} dataTestId={`obras-feedback-${feedback.tone}`}>
          <div className="flex w-full items-start justify-between gap-3">
            <div className="space-y-1">
              <AlertTitle>{feedback.message}</AlertTitle>
              {feedback.description ? <AlertDescription>{feedback.description}</AlertDescription> : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              dataTestId="btn-dismiss-obras-feedback"
              onClick={resetFeedback}
            >
              Fechar
            </Button>
          </div>
        </Alert>
      ) : null}

      {listError ? (
        <Alert variant="danger" dataTestId="obras-error">
          <div className="flex w-full items-start justify-between gap-3">
            <div className="space-y-1">
              <AlertTitle>Falha ao carregar obras</AlertTitle>
              <AlertDescription>{listError}</AlertDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              dataTestId="btn-dismiss-obras-error"
              onClick={() => setListError(null)}
            >
              Dispensar
            </Button>
          </div>
        </Alert>
      ) : null}

      {content}

      <Dialog open={isOpen} onClose={closeForm} dataTestId="obra-form-dialog">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar obra' : 'Nova obra'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Atualize os dados para manter os cadastros sincronizados.'
                : 'Preencha os dados básicos para criar uma nova obra.'}
            </DialogDescription>
            {editing?.created_at ? (
              <p className="text-xs text-muted-foreground">
                Criado em {DATE_FORMATTER.format(new Date(editing.created_at))}
              </p>
            ) : null}
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="obra-nome" className="text-sm font-medium text-foreground">
                Nome da obra *
              </label>
              <Input
                id="obra-nome"
                dataTestId="input-obra-nome"
                placeholder="Ex.: Residencial São Paulo"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.nome)}
                aria-describedby={form.formState.errors.nome ? 'obra-nome-error' : undefined}
                {...form.register('nome')}
                className={cn(form.formState.errors.nome && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.nome ? (
                <span id="obra-nome-error" className="text-xs text-danger">
                  {form.formState.errors.nome.message}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="obra-endereco" className="text-sm font-medium text-foreground">
                Endereço
              </label>
              <Input
                id="obra-endereco"
                dataTestId="input-obra-endereco"
                placeholder="Ex.: Rua das Flores, 123, Vila Madalena"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.endereco)}
                {...form.register('endereco')}
                className={cn(form.formState.errors.endereco && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.endereco ? (
                <span className="text-xs text-danger">{form.formState.errors.endereco.message}</span>
              ) : null}
            </div>

            <Controller
              control={form.control}
              name="cep"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1">
                  <label htmlFor="obra-cep" className="text-sm font-medium text-foreground">
                    CEP
                  </label>
                  <Input
                    id="obra-cep"
                    dataTestId="input-obra-cep"
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    onChange={(event) => {
                      const value = event.target.value.replace(/\D/g, '').slice(0, 8)
                      field.onChange(value ? formatCep(value) : '')
                    }}
                    onBlur={field.onBlur}
                    placeholder="12345-678"
                    inputMode="numeric"
                    maxLength={9}
                    disabled={saving}
                    aria-invalid={Boolean(fieldState.error)}
                    className={cn(fieldState.error && 'border-danger focus-visible:ring-danger')}
                  />
                  {fieldState.error ? (
                    <span className="text-xs text-danger">{fieldState.error.message}</span>
                  ) : null}
                </div>
              )}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="obra-cidade" className="text-sm font-medium text-foreground">
                Cidade
              </label>
              <Input
                id="obra-cidade"
                dataTestId="input-obra-cidade"
                placeholder="Ex.: São Paulo"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.cidade)}
                {...form.register('cidade')}
                className={cn(form.formState.errors.cidade && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.cidade ? (
                <span className="text-xs text-danger">{form.formState.errors.cidade.message}</span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="obra-estado" className="text-sm font-medium text-foreground">
                Estado
              </label>
              <Input
                id="obra-estado"
                dataTestId="input-obra-estado"
                placeholder="Ex.: SP"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.estado)}
                {...form.register('estado')}
                className={cn(form.formState.errors.estado && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.estado ? (
                <span className="text-xs text-danger">{form.formState.errors.estado.message}</span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="obra-status" className="text-sm font-medium text-foreground">
                Status
              </label>
              <select
                id="obra-status"
                data-testid="select-obra-status"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.status)}
                className={cn(
                  SELECT_CLASSES,
                  form.formState.errors.status && 'border-danger focus-visible:ring-danger',
                )}
                {...form.register('status')}
              >
                {obraStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {form.formState.errors.status ? (
                <span className="text-xs text-danger">{form.formState.errors.status.message}</span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="obra-data-inicio" className="text-sm font-medium text-foreground">
                Data de início
              </label>
              <Input
                id="obra-data-inicio"
                dataTestId="input-obra-data-inicio"
                type="date"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.data_inicio)}
                {...form.register('data_inicio')}
                className={cn(form.formState.errors.data_inicio && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.data_inicio ? (
                <span className="text-xs text-danger">{form.formState.errors.data_inicio.message}</span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="obra-data-prevista-fim" className="text-sm font-medium text-foreground">
                Previsão de conclusão
              </label>
              <Input
                id="obra-data-prevista-fim"
                dataTestId="input-obra-data-prevista-fim"
                type="date"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.data_prevista_fim)}
                {...form.register('data_prevista_fim')}
                className={cn(form.formState.errors.data_prevista_fim && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.data_prevista_fim ? (
                <span className="text-xs text-danger">{form.formState.errors.data_prevista_fim.message}</span>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              dataTestId="btn-cancelar-obra"
              onClick={closeForm}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" dataTestId="btn-salvar-obra" disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar obra'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteState.open}
        onOpenChange={handleDeleteDialogChange}
        title="Remover obra"
        description={
          deleteName ? `Confirma remover a obra ${deleteName}? Esta ação não pode ser desfeita.` : 'Confirma remover esta obra?'
        }
        confirmLabel="Remover"
        tone="danger"
        loading={deleteState.loading}
        onConfirm={() => void handleDeleteConfirmation()}
      />
    </section>
  )
}

export default ObrasPage
