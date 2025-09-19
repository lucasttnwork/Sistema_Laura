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
  listContatos,
  createContatoSimples,
  updateContatoSimples,
  deleteContatoSimples,
  ContactRecord,
} from '../lib/contactService'
import { emptyToNull, emptyToUndefined, formatWhatsapp, normalizeWhatsapp } from '../lib/formatters'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../stores/authStore'

const contatoTipos = ['DESCONHECIDO', 'FISCAL', 'FORNECEDOR', 'GERENTE', 'ADMIN', 'CLIENTE'] as const

type ContatoTipo = (typeof contatoTipos)[number]

const contatoSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter ao menos 3 caracteres.').max(120, 'Nome muito longo.'),
  whatsapp: z
    .string()
    .min(10, 'Informe DDD e numero com 10 ou 11 digitos.')
    .max(11, 'Informe no maximo 11 digitos.')
    .regex(/^[0-9]+$/, 'Use apenas numeros para o WhatsApp.'),
  email: z
    .string()
    .trim()
    .max(120, 'E-mail excede o limite de 120 caracteres.')
    .email('E-mail invalido.')
    .or(z.literal('')),
  observacoes: z
    .string()
    .trim()
    .max(500, 'Observacoes limitadas a 500 caracteres.')
    .or(z.literal('')),
  tipo: z.enum(contatoTipos),
  ativo: z.boolean(),
})

type ContatoFormValues = z.infer<typeof contatoSchema>

type DeleteState = {
  open: boolean
  target: ContactRecord | null
  loading: boolean
}

const contatoDefaults: ContatoFormValues = {
  nome: '',
  whatsapp: '',
  email: '',
  observacoes: '',
  tipo: 'DESCONHECIDO',
  ativo: true,
}

const SELECT_CLASSES =
  'h-10 w-full rounded-md border border-outline bg-surface px-4 text-sm text-foreground transition-shadow placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
const TEXTAREA_CLASSES =
  'min-h-[120px] w-full rounded-md border border-outline bg-surface px-4 py-3 text-sm text-foreground transition-shadow placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
const CHECKBOX_CLASSES =
  'h-4 w-4 rounded border border-outline bg-surface text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'

function resolveTipo(value: string | null): ContatoTipo {
  if (!value) return 'DESCONHECIDO'
  return contatoTipos.includes(value as ContatoTipo) ? (value as ContatoTipo) : 'DESCONHECIDO'
}

function mapToneToVariant(tone: 'success' | 'error' | 'info'): 'positive' | 'danger' | 'info' {
  if (tone === 'success') return 'positive'
  if (tone === 'error') return 'danger'
  return 'info'
}

function ContatosPage() {
  const token = useAuthStore((state) => state.token)
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
  } = useCrudForm<ContatoFormValues, ContactRecord>({
    schema: contatoSchema,
    defaultValues: contatoDefaults,
    mapRecordToForm: (record) => ({
      nome: record.nome ?? '',
      whatsapp: normalizeWhatsapp(record.whatsapp),
      email: record.email ?? '',
      observacoes: record.observacoes ?? '',
      tipo: resolveTipo(record.tipo),
      ativo: record.ativo,
    }),
  })

  const deleteName = useMemo(
    () => deleteState.target?.nome ?? deleteState.target?.whatsapp ?? '',
    [deleteState.target],
  )

  const fetchContatos = async () => {
    if (!token) {
      setContatos([])
      setLoading(false)
      setListError(null)
      return
    }
    setLoading(true)
    try {
      const data = await listContatos()
      setContatos(data)
      setListError(null)
    } catch (err) {
      console.error('Falha ao carregar contatos', err)
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao carregar contatos.'
      setListError(message)
      setContatos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContatos()

    if (!token) return

    const channel = supabase
      .channel('contatos_crud')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contatos' }, () => {
        void fetchContatos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [token])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!token) return
    setSaving(true)
    try {
      if (editing) {
        const updated = await updateContatoSimples(editing.id, {
          nome: values.nome,
          whatsapp: values.whatsapp,
          email: emptyToNull(values.email),
          observacoes: emptyToNull(values.observacoes),
          tipo: values.tipo,
          ativo: values.ativo,
        })
        setContatos((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        setFeedback({ tone: 'success', message: 'Contato atualizado com sucesso.' })
      } else {
        const created = await createContatoSimples({
          nome: values.nome,
          whatsapp: values.whatsapp,
          email: emptyToUndefined(values.email),
          observacoes: emptyToUndefined(values.observacoes),
          tipo: values.tipo,
          ativo: values.ativo,
        })
        setContatos((current) => [created, ...current])
        setFeedback({ tone: 'success', message: 'Contato criado com sucesso.' })
      }
      closeForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao salvar o contato.'
      setFeedback({ tone: 'error', message: 'Nao foi possivel salvar o contato.', description: message })
    } finally {
      setSaving(false)
    }
  })

  const promptDelete = (record: ContactRecord) => {
    setDeleteState({ open: true, target: record, loading: false })
  }

  const handleDeleteConfirmation = async () => {
    const target = deleteState.target
    if (!target) return
    setDeleteState((prev) => ({ ...prev, loading: true }))
    try {
      await deleteContatoSimples(target.id)
      setContatos((current) => current.filter((item) => item.id !== target.id))
      setFeedback({ tone: 'success', message: 'Contato removido com sucesso.' })
      setDeleteState({ open: false, target: null, loading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao remover o contato.'
      setFeedback({ tone: 'error', message: 'Nao foi possivel remover o contato.', description: message })
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
    <section data-testid="contatos-page" className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Heading level={1} size="lg" dataTestId="page-heading-contatos">
            Contatos
          </Heading>
          <p className="text-sm text-muted-foreground">
            Gerencie contatos compartilhados entre fornecedores, fiscais e demais papeis operacionais.
          </p>
        </div>
        <Button
          type="button"
          dataTestId="btn-novo-contato"
          onClick={() => {
            resetFeedback()
            openCreate()
          }}
        >
          Novo contato
        </Button>
      </div>

      {feedback ? (
        <Alert variant={mapToneToVariant(feedback.tone)} dataTestId={`contatos-feedback-${feedback.tone}`}>
          <div className="flex w-full items-start justify-between gap-3">
            <div className="space-y-1">
              <AlertTitle>{feedback.message}</AlertTitle>
              {feedback.description ? <AlertDescription>{feedback.description}</AlertDescription> : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              dataTestId="btn-dismiss-contatos-feedback"
              onClick={resetFeedback}
            >
              Fechar
            </Button>
          </div>
        </Alert>
      ) : null}

      {listError ? (
        <Alert variant="danger" dataTestId="contatos-error">
          <div className="flex w-full items-start justify-between gap-3">
            <div className="space-y-1">
              <AlertTitle>Falha ao carregar contatos</AlertTitle>
              <AlertDescription>{listError}</AlertDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              dataTestId="btn-dismiss-contatos-error"
              onClick={() => setListError(null)}
            >
              Dispensar
            </Button>
          </div>
        </Alert>
      ) : null}

      <Card dataTestId="contatos-card" className="shadow-medium">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Contatos cadastrados
          </CardTitle>
          <CardDescription>Dados sincronizados com Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="px-6 py-6">
              <LoadingState rows={5} />
            </div>
          ) : contatos.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground" data-testid="contatos-empty-state">
              Nenhum contato registrado ate o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                data-testid="contatos-table"
                className="min-w-[720px] w-full divide-y divide-outline/60 text-left text-sm"
              >
                <thead className="bg-surface">
                  <tr className="text-xs uppercase text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Nome</th>
                    <th className="px-6 py-3 font-medium">WhatsApp</th>
                    <th className="px-6 py-3 font-medium">Tipo</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 text-right font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/40">
                  {contatos.map((contato) => (
                    <tr key={contato.id} className="transition hover:bg-muted/40">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {contato.nome ? contato.nome : 'Sem nome cadastrado'}
                          </span>
                          {contato.email ? (
                            <span className="text-xs text-muted-foreground">{contato.email}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {formatWhatsapp(contato.whatsapp)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" dataTestId={`badge-contato-tipo-${contato.id}`}>
                          {resolveTipo(contato.tipo)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={contato.ativo ? 'positive' : 'danger'}
                          dataTestId={`badge-contato-status-${contato.id}`}
                        >
                          {contato.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            dataTestId={`btn-contato-editar-${contato.id}`}
                            onClick={() => {
                              resetFeedback()
                              openEdit(contato)
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            dataTestId={`btn-contato-remover-${contato.id}`}
                            onClick={() => promptDelete(contato)}
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

      <Dialog open={isOpen} onClose={closeForm} dataTestId="contato-form-dialog">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar contato' : 'Novo contato'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Atualize os dados para manter os cadastros sincronizados.'
                : 'Preencha os dados basicos para criar um novo contato.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="contato-nome" className="text-sm font-medium text-foreground">
                Nome completo
              </label>
              <Input
                id="contato-nome"
                dataTestId="input-contato-nome"
                placeholder="Ex.: Maria Silva"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.nome)}
                aria-describedby={form.formState.errors.nome ? 'contato-nome-error' : undefined}
                {...form.register('nome')}
                className={cn(form.formState.errors.nome && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.nome ? (
                <span id="contato-nome-error" className="text-xs text-danger">
                  {form.formState.errors.nome.message}
                </span>
              ) : null}
            </div>

            <Controller
              control={form.control}
              name="whatsapp"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1">
                  <label htmlFor="contato-whatsapp" className="text-sm font-medium text-foreground">
                    WhatsApp
                  </label>
                  <Input
                    id="contato-whatsapp"
                    dataTestId="input-contato-whatsapp"
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
                    aria-describedby={fieldState.error ? 'contato-whatsapp-error' : undefined}
                    className={cn(fieldState.error && 'border-danger focus-visible:ring-danger')}
                  />
                  {fieldState.error ? (
                    <span id="contato-whatsapp-error" className="text-xs text-danger">
                      {fieldState.error.message}
                    </span>
                  ) : null}
                </div>
              )}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="contato-email" className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <Input
                id="contato-email"
                dataTestId="input-contato-email"
                placeholder="email@empresa.com"
                inputMode="email"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.email)}
                aria-describedby={form.formState.errors.email ? 'contato-email-error' : undefined}
                {...form.register('email')}
                className={cn(form.formState.errors.email && 'border-danger focus-visible:ring-danger')}
              />
              {form.formState.errors.email ? (
                <span id="contato-email-error" className="text-xs text-danger">
                  {form.formState.errors.email.message}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="contato-tipo" className="text-sm font-medium text-foreground">
                Tipo
              </label>
              <select
                id="contato-tipo"
                data-testid="select-contato-tipo"
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.tipo)}
                className={cn(
                  SELECT_CLASSES,
                  form.formState.errors.tipo && 'border-danger focus-visible:ring-danger',
                )}
                {...form.register('tipo')}
              >
                {contatoTipos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              {form.formState.errors.tipo ? (
                <span className="text-xs text-danger">{form.formState.errors.tipo.message}</span>
              ) : null}
            </div>

            <label className="flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                {...form.register('ativo')}
                className={CHECKBOX_CLASSES}
                disabled={saving}
              />
              <span>Contato ativo</span>
            </label>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="contato-observacoes" className="text-sm font-medium text-foreground">
                Observacoes
              </label>
              <textarea
                id="contato-observacoes"
                data-testid="textarea-contato-observacoes"
                rows={4}
                placeholder="Detalhes complementares, referencias, horarios, etc."
                disabled={saving}
                aria-invalid={Boolean(form.formState.errors.observacoes)}
                aria-describedby={form.formState.errors.observacoes ? 'contato-observacoes-error' : undefined}
                className={cn(
                  TEXTAREA_CLASSES,
                  form.formState.errors.observacoes && 'border-danger focus-visible:ring-danger',
                )}
                {...form.register('observacoes')}
              />
              {form.formState.errors.observacoes ? (
                <span id="contato-observacoes-error" className="text-xs text-danger">
                  {form.formState.errors.observacoes.message}
                </span>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              dataTestId="btn-cancelar-contato"
              onClick={closeForm}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" dataTestId="btn-salvar-contato" disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alteracoes' : 'Criar contato'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteState.open}
        onOpenChange={handleDeleteDialogChange}
        title="Remover contato"
        description={
          deleteName ? `Confirma remover o contato ${deleteName}? Esta acao nao pode ser desfeita.` : 'Confirma remover este contato?'
        }
        confirmLabel="Remover"
        tone="danger"
        loading={deleteState.loading}
        onConfirm={() => void handleDeleteConfirmation()}
      />
    </section>
  )
}

export default ContatosPage

