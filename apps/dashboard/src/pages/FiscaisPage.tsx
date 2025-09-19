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
import {
  listFiscais,
  createFiscal,
  updateFiscal,
  deleteFiscal,
  listObras,
  FiscalRecord,
  ObraSummary,
} from '../lib/contactService'
import { emptyToNull, emptyToUndefined, formatWhatsapp, normalizeWhatsapp } from '../lib/formatters'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../stores/authStore'

const fiscalSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter ao menos 3 caracteres.').max(120, 'Nome muito longo.'),
  whatsapp: z
    .string()
    .min(10, 'Informe DDD e numero com 10 ou 11 digitos.')
    .max(11, 'Informe no maximo 11 digitos.')
    .regex(/^[0-9]+$/, 'Use apenas numeros no WhatsApp.'),
  email: z
    .string()
    .trim()
    .max(120, 'E-mail excede o limite de 120 caracteres.')
    .email('E-mail invalido.')
    .or(z.literal('')),
  observacoes: z.string().trim().max(600, 'Observacoes limitadas a 600 caracteres.').or(z.literal('')),
  ativo: z.boolean(),
  cargo: z.string().trim().min(2, 'Informe o cargo do fiscal.').max(80, 'Cargo excede o limite.'),
  obraId: z.string().trim().max(36, 'Identificador de obra invalido.').or(z.literal('')),
  registroProfissional: z.string().trim().max(80, 'Registro excede o limite.').or(z.literal('')),
  especialidade: z.string().trim().max(80, 'Especialidade excede o limite.').or(z.literal('')),
})

type FiscalFormValues = z.infer<typeof fiscalSchema>

type DeleteState = {
  open: boolean
  target: FiscalRecord | null
  loading: boolean
}

const fiscalDefaults: FiscalFormValues = {
  nome: '',
  whatsapp: '',
  email: '',
  observacoes: '',
  ativo: true,
  cargo: 'Fiscal de Obra',
  obraId: '',
  registroProfissional: '',
  especialidade: '',
}

const SELECT_CLASSES =
  'h-10 w-full rounded-md border border-outline bg-surface px-4 text-sm text-foreground transition-shadow placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
const TEXTAREA_CLASSES =
  'min-h-[120px] w-full rounded-md border border-outline bg-surface px-4 py-3 text-sm text-foreground transition-shadow placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
const CHECKBOX_CLASSES =
  'h-4 w-4 rounded border border-outline bg-surface text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'

function mapToneToVariant(tone: 'success' | 'error' | 'info'): 'positive' | 'danger' | 'info' {
  if (tone === 'success') return 'positive'
  if (tone === 'error') return 'danger'
  return 'info'
}

function FiscaisPage() {
  const token = useAuthStore((state) => state.token)
  const [fiscais, setFiscais] = useState<FiscalRecord[]>([])
  const [obras, setObras] = useState<ObraSummary[]>([])
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
      nome: record.contato.nome ?? '',
      whatsapp: normalizeWhatsapp(record.contato.whatsapp),
      email: record.contato.email ?? '',
      observacoes: record.contato.observacoes ?? '',
      ativo: record.contato.ativo,
      cargo: record.cargo ?? 'Fiscal de Obra',
      obraId: record.obraId ?? '',
      registroProfissional: record.registroProfissional ?? '',
      especialidade: record.especialidade ?? '',
    }),
  })

  const deleteName = useMemo(
    () => deleteState.target?.contato.nome ?? deleteState.target?.contato.whatsapp ?? '',
    [deleteState.target],
  )

  const fetchData = async () => {
    if (!token) {
      setFiscais([])
      setObras([])
      setLoading(false)
      setListError(null)
      return
    }
    setLoading(true)
    try {
      const [fiscaisData, obrasData] = await Promise.all([listFiscais(), listObras()])
      setFiscais(fiscaisData)
      setObras(obrasData)
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

    if (!token) return

    const channel = supabase
      .channel('fiscais_crud')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiscais' }, () => {
        void fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [token])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!token) return
    setSaving(true)
    const contatoPayload = {
      nome: values.nome,
      whatsapp: values.whatsapp,
      email: emptyToUndefined(values.email),
      observacoes: emptyToUndefined(values.observacoes),
      tipo: 'FISCAL' as const,
      ativo: values.ativo,
    }
    const fiscalPayload = {
      cargo: values.cargo,
      obraId: values.obraId ? values.obraId : undefined,
      registroProfissional: emptyToUndefined(values.registroProfissional),
      especialidade: emptyToUndefined(values.especialidade),
    }
    try {
      if (editing) {
        const updated = await updateFiscal(editing.id, editing.contatoId, {
          contato: {
            nome: contatoPayload.nome,
            whatsapp: contatoPayload.whatsapp,
            email: emptyToNull(values.email),
            observacoes: emptyToNull(values.observacoes),
            tipo: 'FISCAL',
            ativo: contatoPayload.ativo,
          },
          fiscal: {
            cargo: fiscalPayload.cargo,
            obraId: values.obraId ? values.obraId : null,
            registroProfissional: emptyToNull(values.registroProfissional),
            especialidade: emptyToNull(values.especialidade),
          },
        })
        setFiscais((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        setFeedback({ tone: 'success', message: 'Fiscal atualizado com sucesso.' })
      } else {
        const created = await createFiscal({ contato: contatoPayload, fiscal: fiscalPayload })
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
      await deleteFiscal(target.id, target.contatoId)
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
                    <th className="px-6 py-3 font-medium">Cargo</th>
                    <th className="px-6 py-3 font-medium">Obra</th>
                    <th className="px-6 py-3 font-medium">Especialidade</th>
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
                            {fiscal.contato.nome ?? 'Sem nome cadastrado'}
                          </span>
                          {fiscal.contato.email ? (
                            <span className="text-xs text-muted-foreground">{fiscal.contato.email}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {formatWhatsapp(fiscal.contato.whatsapp)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{fiscal.cargo}</td>
                      <td className="px-6 py-4 text-muted-foreground">{fiscal.obra ? fiscal.obra.nome : '--'}</td>
                      <td className="px-6 py-4 text-muted-foreground">{fiscal.especialidade ?? '--'}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={fiscal.contato.ativo ? 'positive' : 'danger'}
                          dataTestId={`badge-fiscal-status-${fiscal.id}`}
                        >
                          {fiscal.contato.ativo ? 'Ativo' : 'Inativo'}
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
                Nome completo
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

            <Controller
              control={form.control}
              name="whatsapp"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1">
                  <label htmlFor="fiscal-whatsapp" className="text-sm font-medium text-foreground">
                    WhatsApp
                  </label>
                  <Input
                    id="fiscal-whatsapp"
                    dataTestId="input-fiscal-whatsapp"
                    name={field.name}
                    ref={field.ref}
                    value={formatWhatsapp(field.value)}
                    onChange={(event) => field.onChange(normalizeWhatsapp(event.target.value))}
                    onBlur={field.onBlur}
                    placeholder="(11) 99999-0000"
                    inputMode="tel"
                    maxLength={20}
                    disabled={saving}
                    aria-invalid={Boolean(fieldState.error)}
                    aria-describedby={fieldState.error ? 'fiscal-whatsapp-error' : undefined}
                    className={cn(fieldState.error && 'border-danger focus-visible:ring-danger')}
                  />
                  {fieldState.error ? (
                    <span id="fiscal-whatsapp-error" className="text-xs text-danger">
                      {fieldState.error.message}
                    </span>
                  ) : null}
                </div>
              )}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="fiscal-email" className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <Input
                id="fiscal-email"
                dataTestId="input-fiscal-email"
                placeholder="fiscal@empresa.com"
                inputMode="email"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.email)}
                aria-describedby={form.formState.errors.email ? 'fiscal-email-error' : undefined}
                {...form.register('email')}
                className={cn(form.formState.errors.email && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.email ? (
                <span id="fiscal-email-error" className="text-xs text-danger">
                  {form.formState.errors.email.message}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="fiscal-cargo" className="text-sm font-medium text-foreground">
                Cargo
              </label>
              <Input
                id="fiscal-cargo"
                dataTestId="input-fiscal-cargo"
                placeholder="Ex.: Fiscal de Campo"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.cargo)}
                aria-describedby={form.formState.errors.cargo ? 'fiscal-cargo-error' : undefined}
                {...form.register('cargo')}
                className={cn(form.formState.errors.cargo && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.cargo ? (
                <span id="fiscal-cargo-error" className="text-xs text-danger">
                  {form.formState.errors.cargo.message}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="fiscal-obra" className="text-sm font-medium text-foreground">
                Obra vinculada
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
                <option value="">Sem obra</option>
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

            <div className="flex flex-col gap-1">
              <label htmlFor="fiscal-registro" className="text-sm font-medium text-foreground">
                Registro profissional
              </label>
              <Input
                id="fiscal-registro"
                dataTestId="input-fiscal-registro"
                placeholder="CREA/CAU ou similar"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.registroProfissional)}
                aria-describedby={
                  form.formState.errors.registroProfissional ? 'fiscal-registro-error' : undefined
                }
                {...form.register('registroProfissional')}
                className={cn(
                  form.formState.errors.registroProfissional && 'border-danger focus-visible:ring-danger',
                )}
              />
              {form.formState.errors.registroProfissional ? (
                <span id="fiscal-registro-error" className="text-xs text-danger">
                  {form.formState.errors.registroProfissional.message}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="fiscal-especialidade" className="text-sm font-medium text-foreground">
                Especialidade
              </label>
              <Input
                id="fiscal-especialidade"
                dataTestId="input-fiscal-especialidade"
                placeholder="Eletrica, civil, mecanica..."
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.especialidade)}
                aria-describedby={form.formState.errors.especialidade ? 'fiscal-especialidade-error' : undefined}
                {...form.register('especialidade')}
                className={cn(form.formState.errors.especialidade && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.especialidade ? (
                <span id="fiscal-especialidade-error" className="text-xs text-danger">
                  {form.formState.errors.especialidade.message}
                </span>
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

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="fiscal-observacoes" className="text-sm font-medium text-foreground">
                Observacoes
              </label>
              <textarea
                id="fiscal-observacoes"
                data-testid="textarea-fiscal-observacoes"
                rows={4}
                placeholder="Detalhes adicionais sobre o fiscal"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.observacoes)}
                aria-describedby={form.formState.errors.observacoes ? 'fiscal-observacoes-error' : undefined}
                className={cn(
                  TEXTAREA_CLASSES,
                  form.formState.errors.observacoes && 'border-danger focus-visible:ring-danger',
                )}
                {...form.register('observacoes')}
              />
              {form.formState.errors.observacoes ? (
                <span id="fiscal-observacoes-error" className="text-xs text-danger">
                  {form.formState.errors.observacoes.message}
                </span>
              ) : null}
            </div>
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

