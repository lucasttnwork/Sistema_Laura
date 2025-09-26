import { useEffect, useMemo, useState } from 'react'
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
import {
  listFiscais,
  createFiscal,
  updateFiscal,
  deleteFiscal,
  listObras,
  listContatosByTipo,
  FiscalRecord,
  ObraSummary,
  ContactRecord,
} from '../lib/contactService'
import { extractWhatsappCountryCode, formatWhatsapp } from '../lib/formatters'
import { supabase } from '../lib/supabaseClient'

const fiscalSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter ao menos 3 caracteres.').max(255, 'Nome muito longo.'),
  contatoId: z.string().trim().min(1, 'Contato é obrigatório.').max(36, 'Identificador de contato invalido.'),
  ativo: z.boolean(),
  obraId: z.string().trim().min(1, 'Obra é obrigatória.').max(36, 'Identificador de obra invalido.'),
})

type FiscalFormValues = z.infer<typeof fiscalSchema>

type DeleteState = {
  open: boolean
  target: FiscalRecord | null
  loading: boolean
}

const fiscalDefaults: FiscalFormValues = {
  nome: '',
  contatoId: '',
  ativo: true,
  obraId: '',
}

const SELECT_CLASSES =
  'h-10 w-full rounded-md border border-outline bg-surface px-4 text-sm text-foreground transition-shadow placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
const CHECKBOX_CLASSES =
  'h-4 w-4 rounded border border-outline bg-surface text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'

function mapToneToVariant(tone: 'success' | 'error' | 'info'): 'positive' | 'danger' | 'info' {
  if (tone === 'success') return 'positive'
  if (tone === 'error') return 'danger'
  return 'info'
}

function FiscaisPage() {
  const [fiscais, setFiscais] = useState<FiscalRecord[]>([])
  const [obras, setObras] = useState<ObraSummary[]>([])
  const [contatos, setContatos] = useState<ContactRecord[]>([])
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
  } = useCrudForm<FiscalFormValues, FiscalRecord>({
    schema: fiscalSchema,
    defaultValues: fiscalDefaults,
    mapRecordToForm: (record) => ({
      nome: record.nome ?? record.contato.nome ?? '',
      contatoId: record.contatoId,
      ativo: record.ativo,
      obraId: record.obraId ?? '',
    }),
  })

  const deleteName = useMemo(
    () => deleteState.target?.nome ?? deleteState.target?.contato.whatsapp ?? '',
    [deleteState.target],
  )

  const renderWhatsapp = (value: string | null | undefined) => {
    const formatted = formatWhatsapp(value ?? '')
    if (!formatted) return '-'
    const countryCode = extractWhatsappCountryCode(value ?? '')
    return (
      <div className="flex items-center gap-2">
        {countryCode ? (
          <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
            +{countryCode}
          </Badge>
        ) : null}
        <span>{formatted}</span>
      </div>
    )
  }

  const fetchData = async () => {
    console.log('🚀 Iniciando carregamento de dados para fiscais...')
    setLoading(true)
    try {
      const [fiscaisData, obrasData, contatosData] = await Promise.all([
        listFiscais(),
        listObras(),
        listContatosByTipo('fiscal'),
      ])
      console.log('📊 Resultados finais:')
      console.log('  - Fiscais:', fiscaisData)
      console.log('  - Obras:', obrasData)
      console.log('  - Contatos fiscais:', contatosData)
      setFiscais(fiscaisData)
      setObras(obrasData)
      setContatos(contatosData)
      setListError(null)
    } catch (err) {
      console.error('Falha ao carregar fiscais', err)
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao carregar fiscais.'
      setListError(message)
      setFiscais([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('fiscais_crud')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiscais' }, () => {
        void fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSubmit = form.handleSubmit(async (values) => {
    setSaving(true)
    const selectedContact = contatos.find((c) => c.id === values.contatoId)
    const fiscalPayload = {
      nome: values.nome,
      obraId: values.obraId,
      ativo: values.ativo,
    }
    try {
      if (editing) {
        const updated = await updateFiscal(editing.id, editing.contatoId, {
          contato: {
            nome: selectedContact?.nome || values.nome,
            tipo: 'fiscal',
            ativo: values.ativo,
          },
          fiscal: fiscalPayload as any,
        })
        setFiscais((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        setFeedback({ tone: 'success', message: 'Fiscal atualizado com sucesso.' })
      } else {
        const created = await createFiscal({ contatoId: values.contatoId, fiscal: fiscalPayload })
        setFiscais((current) => [created, ...current])
        setFeedback({ tone: 'success', message: 'Fiscal cadastrado com sucesso.' })
      }
      closeForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao salvar o fiscal.'
      setFeedback({ tone: 'error', message: 'Nao foi possivel salvar o fiscal.', description: message })
    } finally {
      setSaving(false)
    }
  })

  const promptDelete = (record: FiscalRecord) => {
    setDeleteState({ open: true, target: record, loading: false })
  }

  const handleDeleteConfirmation = async () => {
    const target = deleteState.target
    if (!target) return
    setDeleteState((prev) => ({ ...prev, loading: true }))
    try {
      await deleteFiscal(target.id)
      setFiscais((current) => current.filter((item) => item.id !== target.id))
      setFeedback({ tone: 'success', message: 'Fiscal removido com sucesso.' })
      setDeleteState({ open: false, target: null, loading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao remover o fiscal.'
      setFeedback({ tone: 'error', message: 'Nao foi possivel remover o fiscal.', description: message })
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

  return (
    <section data-testid="fiscais-page" className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Heading level={1} size="lg" dataTestId="page-heading-fiscais">
            Fiscais
          </Heading>
          <p className="text-sm text-muted-foreground">
            Controle os fiscais responsáveis pelas obras e mantenha dados sincronizados com o Supabase.
          </p>
        </div>
        <Button
          type="button"
          dataTestId="btn-novo-fiscal"
          onClick={() => {
            resetFeedback()
            openCreate()
          }}
        >
          Novo fiscal
        </Button>
      </div>

      {feedback ? (
        <Alert variant={mapToneToVariant(feedback.tone)} dataTestId={`fiscais-feedback-${feedback.tone}`}>
          <div className="flex w-full items-start justify-between gap-3">
            <div className="space-y-1">
              <AlertTitle>{feedback.message}</AlertTitle>
              {feedback.description ? <AlertDescription>{feedback.description}</AlertDescription> : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              dataTestId="btn-dismiss-fiscais-feedback"
              onClick={resetFeedback}
            >
              Fechar
            </Button>
          </div>
        </Alert>
      ) : null}

      {listError ? (
        <Alert variant="danger" dataTestId="fiscais-error">
          <div className="flex w-full items-start justify-between gap-3">
            <div className="space-y-1">
              <AlertTitle>Falha ao carregar fiscais</AlertTitle>
              <AlertDescription>{listError}</AlertDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              dataTestId="btn-dismiss-fiscais-error"
              onClick={() => setListError(null)}
            >
              Dispensar
            </Button>
          </div>
        </Alert>
      ) : null}

      <Card dataTestId="fiscais-card" className="shadow-medium">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Fiscais cadastrados
          </CardTitle>
          <CardDescription>Dados integrados com a base de contatos e obras.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="px-6 py-6">
              <LoadingState rows={5} />
            </div>
          ) : fiscais.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground" data-testid="fiscais-empty-state">
              Nenhum fiscal cadastrado ate o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                data-testid="fiscais-table"
                className="min-w-[880px] w-full divide-y divide-outline/60 text-left text-sm"
              >
                <thead className="bg-surface">
                  <tr className="text-xs uppercase text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Nome</th>
                    <th className="px-6 py-3 font-medium">WhatsApp</th>
                    <th className="px-6 py-3 font-medium">E-mail</th>
                    <th className="px-6 py-3 font-medium">Obra</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 text-right font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/40">
                  {fiscais.map((fiscal) => (
                    <tr key={fiscal.id} className="transition hover:bg-muted/40">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {fiscal.nome ?? fiscal.contato.nome ?? 'Sem nome cadastrado'}
                          </span>
                          {fiscal.contato.observacoes ? (
                            <span className="text-xs text-muted-foreground">{fiscal.contato.observacoes}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {renderWhatsapp(fiscal.contato.whatsapp)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {fiscal.contato.email || '-'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{fiscal.obra?.nome ?? 'Sem obra'}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={fiscal.ativo ? 'positive' : 'danger'}
                          dataTestId={`badge-fiscal-status-${fiscal.id}`}
                        >
                          {fiscal.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            dataTestId={`btn-fiscal-editar-${fiscal.id}`}
                            onClick={() => {
                              resetFeedback()
                              openEdit(fiscal)
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            dataTestId={`btn-fiscal-remover-${fiscal.id}`}
                            onClick={() => promptDelete(fiscal)}
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
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onClose={closeForm} dataTestId="fiscal-form-dialog">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar fiscal' : 'Novo fiscal'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Atualize os dados do fiscal para manter o acompanhamento das obras em dia.'
                : 'Preencha os dados basicos do fiscal e vincule a uma obra quando necessario.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="fiscal-nome" className="text-sm font-medium text-foreground">
                Nome do fiscal
              </label>
              <Input
                id="fiscal-nome"
                dataTestId="input-fiscal-nome"
                placeholder="Ex.: Joao Pereira"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.nome)}
                aria-describedby={form.formState.errors.nome ? 'fiscal-nome-error' : undefined}
                {...form.register('nome')}
                className={cn(form.formState.errors.nome && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.nome ? (
                <span id="fiscal-nome-error" className="text-xs text-danger">
                  {form.formState.errors.nome.message}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="fiscal-contato" className="text-sm font-medium text-foreground">
                Contato vinculado *
              </label>
              <select
                id="fiscal-contato"
                data-testid="select-fiscal-contato"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.contatoId)}
                className={cn(
                  SELECT_CLASSES,
                  form.formState.errors.contatoId && 'border-danger focus-visible:ring-danger',
                )}
                {...form.register('contatoId')}
              >
                <option value="">Selecione um contato</option>
                {contatos.map((contato) => {
                  const formatted = formatWhatsapp(contato.whatsapp, { includeCountryCode: true })
                  const label = formatted ? `${contato.nome} - ${formatted}` : `${contato.nome} - -`
                  return (
                    <option key={contato.id} value={contato.id}>
                      {label}
                    </option>
                  )
                })}
              </select>
              {form.formState.errors.contatoId ? (
                <span className="text-xs text-danger">{form.formState.errors.contatoId.message}</span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                Apenas contatos do tipo 'fiscal' são exibidos. Se não há contatos disponíveis, você precisa criar contatos do tipo 'fiscal' primeiro na aba Contatos.
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="fiscal-obra" className="text-sm font-medium text-foreground">
                Obra vinculada *
              </label>
              <select
                id="fiscal-obra"
                data-testid="select-fiscal-obra"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.obraId)}
                className={cn(
                  SELECT_CLASSES,
                  form.formState.errors.obraId && 'border-danger focus-visible:ring-danger',
                )}
                {...form.register('obraId')}
              >
                <option value="">Selecione uma obra</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>
                ))}
              </select>
              {form.formState.errors.obraId ? (
                <span className="text-xs text-danger">{form.formState.errors.obraId.message}</span>
              ) : null}
            </div>

            <label className="flex items-center gap-3 text-sm text-foreground sm:col-span-2">
              <input
                type="checkbox"
                {...form.register('ativo')}
                className={CHECKBOX_CLASSES}
                disabled={saving}
              />
              <span>Fiscal ativo</span>
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              dataTestId="btn-cancelar-fiscal"
              onClick={closeForm}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" dataTestId="btn-salvar-fiscal" disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alteracoes' : 'Criar fiscal'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteState.open}
        onOpenChange={handleDeleteDialogChange}
        title="Remover fiscal"
        description={
          deleteName ? `Confirma remover o fiscal ${deleteName}? Esta acao nao pode ser desfeita.` : 'Confirma remover este fiscal?'
        }
        confirmLabel="Remover"
        tone="danger"
        loading={deleteState.loading}
        onConfirm={() => void handleDeleteConfirmation()}
      />
    </section>
  )
}

export default FiscaisPage

