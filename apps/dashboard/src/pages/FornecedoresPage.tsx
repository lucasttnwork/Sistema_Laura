import { useEffect, useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { LoadingState } from '../components/LoadingState'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Heading } from '../components/ui/heading'
import { Input } from '../components/ui/input'
import { useCrudForm } from '../hooks/useCrudForm'
import {
  listFornecedores,
  createFornecedor,
  updateFornecedor,
  deleteFornecedor,
  FornecedorRecord,
} from '../lib/contactService'
import {
  emptyToNull,
  emptyToUndefined,
  formatCnpj,
  formatWhatsapp,
  normalizeCnpj,
  normalizeWhatsapp,
} from '../lib/formatters'
import { supabase } from '../lib/supabaseClient'

const fornecedorSchema = z.object({
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
  categoria: z
    .string()
    .trim()
    .length(1, 'Categoria deve conter uma unica letra (A, B, C ou D).')
    .regex(/^[ABCD]$/i, 'Categoria deve ser A, B, C ou D.'),
  razaoSocial: z
    .string()
    .trim()
    .min(3, 'Razao social deve ter ao menos 3 caracteres.')
    .max(140, 'Razao social excede o limite.'),
  cnpj: z
    .string()
    .trim()
    .max(14, 'CNPJ possui no maximo 14 digitos.')
    .refine((value) => value.length === 0 || /^[0-9]{14}$/.test(value), 'CNPJ deve conter 14 digitos numericos.')
    .or(z.literal('')),
  cidade: z.string().trim().max(80, 'Cidade excede o limite.').or(z.literal('')),
  estado: z
    .string()
    .trim()
    .max(2, 'Use a sigla do estado (ate 2 letras).')
    .refine((value) => value.length === 0 || /^[A-Za-z]{2}$/.test(value), 'Utilize apenas letras para o estado.')
    .or(z.literal('')),
  observacoes: z.string().trim().max(600, 'Observacoes limitadas a 600 caracteres.').or(z.literal('')),
  ativo: z.boolean(),
})

type FornecedorFormValues = z.infer<typeof fornecedorSchema>

type DeleteState = {
  open: boolean
  target: FornecedorRecord | null
  loading: boolean
}

const fornecedorDefaults: FornecedorFormValues = {
  nome: '',
  whatsapp: '',
  email: '',
  categoria: '',
  razaoSocial: '',
  cnpj: '',
  cidade: '',
  estado: '',
  observacoes: '',
  ativo: true,
}

function resolveEstado(value: string | null): string {
  if (!value) return ''
  return value.toUpperCase()
}

function mapToneToVariant(tone: 'success' | 'error' | 'info'): 'positive' | 'danger' | 'info' {
  if (tone === 'success') return 'positive'
  if (tone === 'error') return 'danger'
  return 'info'
}

function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<FornecedorRecord[]>([])
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
  } = useCrudForm<FornecedorFormValues, FornecedorRecord>({
    schema: fornecedorSchema,
    defaultValues: fornecedorDefaults,
    mapRecordToForm: (record) => ({
      nome: record.contato.nome ?? '',
      whatsapp: normalizeWhatsapp(record.contato.whatsapp),
      email: record.email ?? '',
      categoria: (record.categoria ?? 'C').toUpperCase(),
      razaoSocial: record.nome ?? '',
      cnpj: record.cnpj ? normalizeCnpj(record.cnpj) : '',
      cidade: record.cidade ?? '',
      estado: resolveEstado(record.estado ?? ''),
      observacoes: record.condicoesPagamento ?? '',
      ativo: Boolean(record.ativo && record.contato.ativo),
    }),
  })

  const deleteName = useMemo(() => {
    const alvo = deleteState.target
    if (!alvo) return ''
    if (alvo.nome) return alvo.nome
    if (alvo.contato.nome) return alvo.contato.nome
    if (alvo.telefonePrincipal) return alvo.telefonePrincipal
    return alvo.contato.whatsapp
  }, [deleteState.target])

  const fieldClasses = 'rounded-md border border-outline bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
  const textareaClasses = 'min-h-[120px] rounded-md border border-outline bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
  const checkboxClasses = 'h-4 w-4 rounded border-outline bg-surface text-primary focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
  const labelClasses = 'text-sm font-medium text-muted-foreground'
  const errorClasses = 'text-xs text-danger'

  const fetchFornecedores = async () => {
    setLoading(true)
    try {
      const data = await listFornecedores()
      setFornecedores(data)
      setListError(null)
    } catch (err) {
      console.error('Falha ao carregar fornecedores', err)
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao carregar fornecedores.'
      setListError(message)
      setFornecedores([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFornecedores()

    const channel = supabase
      .channel('fornecedores_crud')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fornecedores' }, () => fetchFornecedores())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSubmit = form.handleSubmit(async (values) => {
    setSaving(true)
    const contatoPayload = {
      nome: values.nome,
      whatsapp: normalizeWhatsapp(values.whatsapp),
      email: emptyToUndefined(values.email),
      observacoes: emptyToUndefined(values.observacoes),
      tipo: 'fornecedor' as const,
      ativo: values.ativo,
    }
    const fornecedorPayload = {
      nome: values.razaoSocial.trim(),
      categoria: values.categoria ? values.categoria.trim().charAt(0).toUpperCase() : undefined,
      telefonePrincipal: normalizeWhatsapp(values.whatsapp),
      email: emptyToUndefined(values.email),
      cnpj: values.cnpj ? normalizeCnpj(values.cnpj) : undefined,
      cidade: emptyToUndefined(values.cidade),
      estado: emptyToUndefined(values.estado ? values.estado.trim().toUpperCase() : undefined),
      condicoesPagamento: emptyToUndefined(values.observacoes),
      ativo: values.ativo,
    }

    try {
      if (editing) {
        const updated = await updateFornecedor(editing.id, editing.contatoId, {
          contato: {
            nome: contatoPayload.nome,
            whatsapp: contatoPayload.whatsapp,
            email: emptyToNull(values.email),
            observacoes: emptyToNull(values.observacoes),
            tipo: 'fornecedor',
            ativo: contatoPayload.ativo,
          },
          fornecedor: {
            nome: fornecedorPayload.nome,
            categoria: fornecedorPayload.categoria ?? null,
            telefonePrincipal: fornecedorPayload.telefonePrincipal ?? null,
            email: fornecedorPayload.email ?? null,
            cnpj: fornecedorPayload.cnpj ?? null,
            cidade: fornecedorPayload.cidade ?? null,
            estado: fornecedorPayload.estado ?? null,
            condicoesPagamento: fornecedorPayload.condicoesPagamento ?? null,
            ativo: fornecedorPayload.ativo,
          },
        })
        setFornecedores((current) => current.map((item) => (item.id === updated.id ? updated : item)))
        setFeedback({ tone: 'success', message: 'Fornecedor atualizado com sucesso.' })
      } else {
        const created = await createFornecedor({
          contato: contatoPayload,
          fornecedor: fornecedorPayload,
        })
        setFornecedores((current) => [created, ...current])
        setFeedback({ tone: 'success', message: 'Fornecedor cadastrado com sucesso.' })
      }
      closeForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao salvar fornecedor.'
      setFeedback({ tone: 'error', message: 'Nao foi possivel salvar o fornecedor.', description: message })
    } finally {
      setSaving(false)
    }
  })

  const promptDelete = (record: FornecedorRecord) => {
    setDeleteState({ open: true, target: record, loading: false })
  }

  const handleDeleteConfirmation = async () => {
    const target = deleteState.target
    if (!target) return
    setDeleteState((prev) => ({ ...prev, loading: true }))
    try {
      await deleteFornecedor(target.id, target.contatoId)
      setFornecedores((current) => current.filter((item) => item.id !== target.id))
      setFeedback({ tone: 'success', message: 'Fornecedor removido com sucesso.' })
      setDeleteState({ open: false, target: null, loading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha desconhecida ao remover fornecedor.'
      setFeedback({ tone: 'error', message: 'Nao foi possivel remover o fornecedor.', description: message })
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
    <section data-testid="fornecedores-page" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Heading level={1} size="lg" dataTestId="page-heading-fornecedores">
          Gestao de Fornecedores
        </Heading>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            dataTestId="btn-novo-fornecedor"
            onClick={() => {
              resetFeedback()
              openCreate()
            }}
          >
            Novo fornecedor
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            dataTestId="btn-atualizar-fornecedores"
            onClick={() => {
              resetFeedback()
              void fetchFornecedores()
            }}
          >
            Atualizar lista
          </Button>
        </div>
      </div>

      {feedback ? (
        <Alert
          variant={mapToneToVariant(feedback.tone)}
          dataTestId={`fornecedores-feedback-${feedback.tone}`}
          className="items-start gap-4"
        >
          <div className="space-y-1">
            <AlertTitle>{feedback.message}</AlertTitle>
            {feedback.description ? <AlertDescription>{feedback.description}</AlertDescription> : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            dataTestId="btn-dismiss-fornecedores-feedback"
            onClick={resetFeedback}
          >
            Dispensar
          </Button>
        </Alert>
      ) : null}

      {listError ? (
        <Alert dataTestId="fornecedores-error" variant="danger" className="items-start gap-4">
          <div className="space-y-1">
            <AlertTitle>Falha ao carregar fornecedores.</AlertTitle>
            <AlertDescription>{listError}</AlertDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            dataTestId="btn-dismiss-fornecedores-error"
            onClick={() => setListError(null)}
          >
            Dispensar
          </Button>
        </Alert>
      ) : null}

      {isOpen ? (
        <Card dataTestId="fornecedor-form-card" className="shadow-medium">
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{editing ? 'Editar fornecedor' : 'Cadastrar fornecedor'}</CardTitle>
              <CardDescription>Preencha os dados principais de contato e faturamento.</CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              dataTestId="btn-close-fornecedor-form"
              onClick={closeForm}
              disabled={saving}
            >
              Fechar
            </Button>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="fornecedor-nome" className={labelClasses}>
                    Nome do contato
                  </label>
                  <Input
                    id="fornecedor-nome"
                    dataTestId="input-fornecedor-nome"
                    className={fieldClasses}
                    placeholder="Responsavel pelo fornecedor"
                    disabled={saving}
                    aria-invalid={Boolean(form.formState.errors.nome)}
                    aria-describedby={form.formState.errors.nome ? 'fornecedor-nome-error' : undefined}
                    {...form.register('nome')}
                  />
                  {form.formState.errors.nome ? (
                    <span id="fornecedor-nome-error" className={errorClasses}>
                      {form.formState.errors.nome.message}
                    </span>
                  ) : null}
                </div>
                <Controller
                  control={form.control}
                  name="whatsapp"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1">
                      <label htmlFor="fornecedor-whatsapp" className={labelClasses}>
                        WhatsApp
                      </label>
                      <Input
                        id="fornecedor-whatsapp"
                        dataTestId="input-fornecedor-whatsapp"
                        ref={field.ref}
                        value={formatWhatsapp(field.value)}
                        onChange={(event) => field.onChange(normalizeWhatsapp(event.target.value))}
                        onBlur={field.onBlur}
                        inputMode="tel"
                        maxLength={20}
                        placeholder="(11) 90000-0000"
                        disabled={saving}
                        className={fieldClasses}
                        aria-invalid={Boolean(fieldState.error)}
                        aria-describedby={fieldState.error ? 'fornecedor-whatsapp-error' : undefined}
                      />
                      {fieldState.error ? (
                        <span id="fornecedor-whatsapp-error" className={errorClasses}>
                          {fieldState.error.message}
                        </span>
                      ) : null}
                    </div>
                  )}
                />
                <div className="flex flex-col gap-1">
                  <label htmlFor="fornecedor-email" className={labelClasses}>
                    E-mail
                  </label>
                  <Input
                    id="fornecedor-email"
                    type="email"
                    dataTestId="input-fornecedor-email"
                    className={fieldClasses}
                    placeholder="contato@empresa.com"
                    disabled={saving}
                    aria-invalid={Boolean(form.formState.errors.email)}
                    aria-describedby={form.formState.errors.email ? 'fornecedor-email-error' : undefined}
                    {...form.register('email')}
                  />
                  {form.formState.errors.email ? (
                    <span id="fornecedor-email-error" className={errorClasses}>
                      {form.formState.errors.email.message}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="fornecedor-categoria" className={labelClasses}>
                    Categoria
                  </label>
                  <Input
                    id="fornecedor-categoria"
                    dataTestId="input-fornecedor-categoria"
                    className={fieldClasses}
                    placeholder="Materiais eletricos, servicos, etc."
                    disabled={saving}
                    aria-invalid={Boolean(form.formState.errors.categoria)}
                    aria-describedby={form.formState.errors.categoria ? 'fornecedor-categoria-error' : undefined}
                    {...form.register('categoria')}
                  />
                  {form.formState.errors.categoria ? (
                    <span id="fornecedor-categoria-error" className={errorClasses}>
                      {form.formState.errors.categoria.message}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="fornecedor-razao" className={labelClasses}>
                    Razao social
                  </label>
                  <Input
                    id="fornecedor-razao"
                    dataTestId="input-fornecedor-razao"
                    className={fieldClasses}
                    placeholder="Nome empresarial"
                    disabled={saving}
                    aria-invalid={Boolean(form.formState.errors.razaoSocial)}
                    aria-describedby={form.formState.errors.razaoSocial ? 'fornecedor-razao-error' : undefined}
                    {...form.register('razaoSocial')}
                  />
                  {form.formState.errors.razaoSocial ? (
                    <span id="fornecedor-razao-error" className={errorClasses}>
                      {form.formState.errors.razaoSocial.message}
                    </span>
                  ) : null}
                </div>
                <Controller
                  control={form.control}
                  name="cnpj"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1">
                      <label htmlFor="fornecedor-cnpj" className={labelClasses}>
                        CNPJ
                      </label>
                      <Input
                        id="fornecedor-cnpj"
                        dataTestId="input-fornecedor-cnpj"
                        ref={field.ref}
                        value={formatCnpj(field.value)}
                        onChange={(event) => field.onChange(normalizeCnpj(event.target.value))}
                        onBlur={field.onBlur}
                        inputMode="numeric"
                        maxLength={20}
                        placeholder="00.000.000/0000-00"
                        disabled={saving}
                        className={fieldClasses}
                        aria-invalid={Boolean(fieldState.error)}
                        aria-describedby={fieldState.error ? 'fornecedor-cnpj-error' : undefined}
                      />
                      {fieldState.error ? (
                        <span id="fornecedor-cnpj-error" className={errorClasses}>
                          {fieldState.error.message}
                        </span>
                      ) : null}
                    </div>
                  )}
                />
                <div className="flex flex-col gap-1">
                  <label htmlFor="fornecedor-cidade" className={labelClasses}>
                    Cidade
                  </label>
                  <Input
                    id="fornecedor-cidade"
                    dataTestId="input-fornecedor-cidade"
                    className={fieldClasses}
                    placeholder="Cidade"
                    disabled={saving}
                    aria-invalid={Boolean(form.formState.errors.cidade)}
                    aria-describedby={form.formState.errors.cidade ? 'fornecedor-cidade-error' : undefined}
                    {...form.register('cidade')}
                  />
                  {form.formState.errors.cidade ? (
                    <span id="fornecedor-cidade-error" className={errorClasses}>
                      {form.formState.errors.cidade.message}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="fornecedor-estado" className={labelClasses}>
                    Estado (UF)
                  </label>
                  <Input
                    id="fornecedor-estado"
                    dataTestId="input-fornecedor-estado"
                    className={fieldClasses}
                    placeholder="UF"
                    maxLength={2}
                    disabled={saving}
                    aria-invalid={Boolean(form.formState.errors.estado)}
                    aria-describedby={form.formState.errors.estado ? 'fornecedor-estado-error' : undefined}
                    {...form.register('estado', { setValueAs: (value) => (value ? String(value).trim().toUpperCase() : '') })}
                  />
                  {form.formState.errors.estado ? (
                    <span id="fornecedor-estado-error" className={errorClasses}>
                      {form.formState.errors.estado.message}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="fornecedor-observacoes" className={labelClasses}>
                  Observacoes
                </label>
                <textarea
                  id="fornecedor-observacoes"
                  data-testid="input-fornecedor-observacoes"
                  className={textareaClasses}
                  rows={4}
                  placeholder="Informacoes adicionais, acordos comerciais, horarios, etc."
                  disabled={saving}
                  aria-invalid={Boolean(form.formState.errors.observacoes)}
                  aria-describedby={form.formState.errors.observacoes ? 'fornecedor-observacoes-error' : undefined}
                  {...form.register('observacoes')}
                />
                {form.formState.errors.observacoes ? (
                  <span id="fornecedor-observacoes-error" className={errorClasses}>
                    {form.formState.errors.observacoes.message}
                  </span>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className={checkboxClasses} disabled={saving} {...form.register('ativo')} />
                <span>Fornecedor ativo</span>
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  variant="primary"
                  dataTestId="btn-salvar-fornecedor"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : editing ? 'Salvar alteracoes' : 'Criar fornecedor'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  dataTestId="btn-cancelar-fornecedor"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card dataTestId="fornecedor-list-card" className="shadow-medium">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Fornecedores cadastrados
          </CardTitle>
          <CardDescription>Dados sincronizados com Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="px-6 py-6">
              <LoadingState rows={5} />
            </div>
          ) : fornecedores.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Nenhum fornecedor cadastrado ate o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                data-testid="fornecedores-table"
                className="min-w-[820px] w-full divide-y divide-outline/60 text-left text-sm"
              >
                <thead className="bg-surface">
                  <tr className="text-xs uppercase text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Fornecedor</th>
                    <th className="px-6 py-3 font-medium">WhatsApp</th>
                    <th className="px-6 py-3 font-medium">Categoria</th>
                    <th className="px-6 py-3 font-medium">CNPJ</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 text-right font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/40">
                  {fornecedores.map((fornecedor) => {
                    const companyName = fornecedor.nome || fornecedor.contato.nome || 'Sem nome cadastrado'
                    const secondaryLabel =
                      fornecedor.nomeFantasia ??
                      (fornecedor.contato.nome && fornecedor.contato.nome !== companyName ? fornecedor.contato.nome : null)
                    const telefone = fornecedor.telefonePrincipal ?? fornecedor.contato.whatsapp
                    return (
                      <tr key={fornecedor.id} className="transition hover:bg-muted/40">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{companyName}</span>
                            {secondaryLabel ? (
                              <span className="text-xs text-muted-foreground">{secondaryLabel}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {telefone ? formatWhatsapp(telefone) : '--'}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {fornecedor.categoria ? fornecedor.categoria.toUpperCase() : '--'}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {fornecedor.cnpj ? formatCnpj(fornecedor.cnpj) : '--'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={fornecedor.ativo ? 'positive' : 'danger'}
                            dataTestId={`badge-fornecedor-status-${fornecedor.id}`}
                          >
                            {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              dataTestId={`btn-editar-fornecedor-${fornecedor.id}`}
                              onClick={() => {
                                resetFeedback()
                                openEdit(fornecedor)
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              dataTestId={`btn-remover-fornecedor-${fornecedor.id}`}
                              onClick={() => promptDelete(fornecedor)}
                            >
                              Remover
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteState.open}
        onOpenChange={handleDeleteDialogChange}
        title="Remover fornecedor"
        description={
          deleteName
            ? `Confirma remover o fornecedor ${deleteName}? Esta acao nao pode ser desfeita.`
            : 'Confirma remover este fornecedor?'
        }
        confirmLabel="Remover"
        tone="danger"
        loading={deleteState.loading}
        confirmDataTestId="btn-deletar-fornecedor"
        onConfirm={() => void handleDeleteConfirmation()}
      />
    </section>
  )
}

export default FornecedoresPage



