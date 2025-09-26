import { supabase } from './supabaseClient'
import { mapSupabaseError, throwSupabaseError } from './supabaseErrors'


export type ContactRecord = {
  id: string
  nome: string | null
  whatsapp: string
  tipo: string
  ativo: boolean
}

export type ObraSummary = {
  id: string
  nome: string
}

export type FornecedorRecord = {
  id: string
  contatoId: string
  nome: string
  nomeFantasia: string | null
  categoria: string | null
  telefonePrincipal: string | null
  email: string | null
  cnpj: string | null
  inscricaoEstadual: string | null
  cidade: string | null
  estado: string | null
  condicoesPagamento: string | null
  ativo: boolean
  createdAt?: string
  updatedAt?: string
  contato: ContactRecord
}

export type FiscalRecord = {
  id: string
  contatoId: string
  obraId: string | null
  nome: string | null
  ativo: boolean
  contato: ContactRecord
  obra: ObraSummary | null
}

export type ContactInput = {
  nome: string
  whatsapp: string
  email?: string
  observacoes?: string
  tipo?: string
  ativo?: boolean
}

export type ContactUpdate = {
  nome?: string
  whatsapp?: string
  email?: string | null
  observacoes?: string | null
  tipo?: string
  ativo?: boolean
}

export type FornecedorInput = {
  nome: string
  categoria?: string | null
  nomeFantasia?: string | null
  telefonePrincipal?: string | null
  email?: string | null
  cnpj?: string | null
  inscricaoEstadual?: string | null
  cidade?: string | null
  estado?: string | null
  condicoesPagamento?: string | null
  ativo?: boolean
}

export type FiscalInput = {
  cargo: string
  obraId?: string | null
  registroProfissional?: string | null
  especialidade?: string | null
}

function normalizeContact(data: any): ContactRecord {
  return {
    id: data?.id,
    nome: data?.nome ?? null,
    whatsapp: data?.whatsapp ?? '',
    tipo: data?.tipo ?? '',
    ativo: Boolean(data?.ativo),
  }
}

function normalizeFornecedor(row: any): FornecedorRecord {
  return {
    id: row?.id,
    contatoId: row?.contatoId,
    nome: row?.nome ?? '',
    nomeFantasia: row?.nomeFantasia ?? null,
    categoria: row?.categoria ?? null,
    telefonePrincipal: row?.telefonePrincipal ?? null,
    email: row?.email ?? null,
    cnpj: row?.cnpj ?? null,
    inscricaoEstadual: row?.inscricaoEstadual ?? null,
    cidade: row?.cidade ?? null,
    estado: row?.estado ?? null,
    condicoesPagamento: row?.condicoesPagamento ?? null,
    ativo: Boolean(row?.ativo),
    createdAt: row?.created_at,
    updatedAt: row?.updated_at,
    contato: normalizeContact(row?.contato),
  }
}

function normalizeFiscal(row: any): FiscalRecord {
  return {
    id: row?.id,
    contatoId: row?.contatoId,
    obraId: row?.obraId ?? null,
    nome: row?.nome ?? null,
    ativo: Boolean(row?.ativo),
    contato: normalizeContact(row?.contato),
    obra: row?.obra ? { id: row?.obra?.id, nome: row?.obra?.nome } : null,
  }
}

export async function listFornecedores(): Promise<FornecedorRecord[]> {
  const { data, error } = await supabase
    .from('fornecedores')
    .select(
      `id, contatoId:contato_id, nome, nomeFantasia:nome_fantasia, categoria, telefonePrincipal:telefone_principal, email, cnpj, inscricaoEstadual:inscricao_estadual, cidade, estado, condicoesPagamento:condicoes_pagamento, ativo, created_at, updated_at,
       contato:contatos ( id, nome, whatsapp, tipo, ativo )`
    )
    .order('created_at', { ascending: false })

  if (error) throwSupabaseError(error, 'Nao foi possivel carregar fornecedores.')
  return (data ?? []).map(normalizeFornecedor)
}

export async function listFiscais(): Promise<FiscalRecord[]> {
  const { data, error } = await supabase
    .from('fiscais')
    .select(
      `id, contatoId:contato_id, obraId:obra_id, nome, ativo,
       contato:contatos ( id, nome, whatsapp, tipo, ativo ),
       obra:obras ( id, nome )`
    )
    .order('created_at', { ascending: false })

  if (error) throwSupabaseError(error, 'Nao foi possivel carregar fiscais.')
  return (data ?? []).map(normalizeFiscal)
}

export async function listContatos(): Promise<ContactRecord[]> {
  const { data, error } = await supabase
    .from('contatos')
    .select('id, nome, whatsapp, tipo, ativo, created_at')
    .order('created_at', { ascending: false })

  if (error) throwSupabaseError(error, 'Nao foi possivel carregar contatos.')
  return (data ?? []).map(normalizeContact)
}

export async function listContatosByTipo(tipo: string): Promise<ContactRecord[]> {
  const normalized = (tipo ?? '').toLowerCase()
  const { data, error } = await supabase
    .from('contatos')
    .select('id, nome, whatsapp, tipo, ativo, created_at')
    .eq('tipo', normalized)
    .order('created_at', { ascending: false })

  if (error) throwSupabaseError(error, 'Nao foi possivel carregar contatos por tipo.')
  return (data ?? []).map(normalizeContact)
}

export async function listObras(): Promise<ObraSummary[]> {
  const { data, error } = await supabase.from('obras').select('id, nome').order('nome', { ascending: true })
  if (error) throwSupabaseError(error, 'Nao foi possivel carregar obras disponiveis.')
  return (data ?? []).map((obra: any) => ({ id: obra.id, nome: obra.nome }))
}

export async function createContato(payload: ContactInput): Promise<ContactRecord> {
  const insert = {
    nome: payload.nome,
    whatsapp: payload.whatsapp,
    tipo: payload.tipo ?? 'desconhecido',
    ativo: payload.ativo ?? true,
  }
  const { data, error } = await supabase.from('contatos').insert(insert).select().single()
  if (error) throwSupabaseError(error, 'Nao foi possivel criar contato.')
  return normalizeContact(data)
}

export async function updateContato(id: string, payload: ContactUpdate): Promise<ContactRecord> {
  const updates: Record<string, unknown> = {}
  if (payload.nome !== undefined) updates.nome = payload.nome
  if (payload.whatsapp !== undefined) updates.whatsapp = payload.whatsapp
  if (payload.tipo !== undefined) updates.tipo = payload.tipo
  if (payload.ativo !== undefined) updates.ativo = payload.ativo
  if (Object.keys(updates).length === 0) {
    const { data, error } = await supabase.from('contatos').select('id, nome, whatsapp, tipo, ativo').eq('id', id).single()
    if (error) throwSupabaseError(error, 'Nao foi possivel carregar contato.')
    return normalizeContact(data)
  }
  const { data, error } = await supabase
    .from('contatos')
    .update(updates)
    .eq('id', id)
    .select('id, nome, whatsapp, tipo, ativo')
    .single()
  if (error) throwSupabaseError(error, 'Nao foi possivel atualizar contato.')
  return normalizeContact(data)
}

export async function deleteContato(id: string): Promise<void> {
  const { error } = await supabase.from('contatos').delete().eq('id', id)
  if (error) throwSupabaseError(error, 'Nao foi possivel remover contato.')
}

export async function createFornecedor(input: { contato: ContactInput; fornecedor: FornecedorInput }): Promise<FornecedorRecord> {
  const contato = await createContato({ ...input.contato, tipo: 'fornecedor' })
  const insert = {
    contato_id: contato.id,
    nome: input.fornecedor.nome,
    categoria: input.fornecedor.categoria ?? null,
    nome_fantasia: input.fornecedor.nomeFantasia ?? null,
    telefone_principal: input.fornecedor.telefonePrincipal ?? null,
    email: input.fornecedor.email ?? null,
    cnpj: input.fornecedor.cnpj ?? null,
    inscricao_estadual: input.fornecedor.inscricaoEstadual ?? null,
    cidade: input.fornecedor.cidade ?? null,
    estado: input.fornecedor.estado ?? null,
    condicoes_pagamento: input.fornecedor.condicoesPagamento ?? null,
    ativo: input.fornecedor.ativo ?? true,
  }

  let inserted: any
  try {
    const { data, error } = await supabase
      .from('fornecedores')
      .insert(insert)
      .select(`
        id, contatoId:contato_id, nome, nomeFantasia:nome_fantasia, categoria, telefonePrincipal:telefone_principal, email, cnpj, inscricaoEstadual:inscricao_estadual, cidade, estado, condicoesPagamento:condicoes_pagamento, ativo, created_at, updated_at,
        contato:contatos ( id, nome, whatsapp, tipo, ativo )
      `)
      .single()
    if (error) throwSupabaseError(error, 'Nao foi possivel criar fornecedor.')
    inserted = data
  } catch (err) {
    await deleteContato(contato.id).catch(() => undefined)
    throw mapSupabaseError(err, 'Nao foi possivel criar fornecedor.')
  }

  return normalizeFornecedor(inserted)
}

export async function updateFornecedor(id: string, contatoId: string, input: { contato: ContactUpdate; fornecedor: FornecedorInput }): Promise<FornecedorRecord> {
  await updateContato(contatoId, { ...input.contato, tipo: input.contato.tipo ?? 'fornecedor' })
  const updates: Record<string, unknown> = {
    nome: input.fornecedor.nome,
    categoria: input.fornecedor.categoria ?? null,
    nome_fantasia: input.fornecedor.nomeFantasia ?? null,
    telefone_principal: input.fornecedor.telefonePrincipal ?? null,
    email: input.fornecedor.email ?? null,
    ativo: input.fornecedor.ativo ?? true,
  }
  updates.cnpj = input.fornecedor.cnpj ?? null
  updates.inscricao_estadual = input.fornecedor.inscricaoEstadual ?? null
  updates.cidade = input.fornecedor.cidade ?? null
  updates.estado = input.fornecedor.estado ?? null
  updates.condicoes_pagamento = input.fornecedor.condicoesPagamento ?? null

  const { data, error } = await supabase
    .from('fornecedores')
    .update(updates)
    .eq('id', id)
    .select(`
      id, contatoId:contato_id, nome, nomeFantasia:nome_fantasia, categoria, telefonePrincipal:telefone_principal, email, cnpj, inscricaoEstadual:inscricao_estadual, cidade, estado, condicoesPagamento:condicoes_pagamento, ativo, created_at, updated_at,
      contato:contatos ( id, nome, whatsapp, tipo, ativo )
    `)
    .single()
  if (error) throwSupabaseError(error, 'Nao foi possivel atualizar fornecedor.')
  return normalizeFornecedor(data)
}

export async function deleteFornecedor(id: string, contatoId: string): Promise<void> {
  const { error } = await supabase.from('fornecedores').delete().eq('id', id)
  if (error) throwSupabaseError(error, 'Nao foi possivel remover fornecedor.')
  await deleteContato(contatoId)
}

export async function createFiscal(input: { contatoId: string; fiscal: { nome: string; obraId?: string | null; ativo?: boolean } }): Promise<FiscalRecord> {
  const insert = {
    contato_id: input.contatoId,
    nome: input.fiscal.nome,
    obra_id: input.fiscal.obraId ?? null,
    ativo: input.fiscal.ativo ?? true,
  }

  const { data, error } = await supabase
    .from('fiscais')
    .insert(insert)
    .select(
      `id, contatoId:contato_id, obraId:obra_id, nome, ativo,
       contato:contatos ( id, nome, whatsapp, tipo, ativo ),
       obra:obras ( id, nome )`
    )
    .single()
  if (error) throwSupabaseError(error, 'Nao foi possivel criar fiscal.')
  return normalizeFiscal(data)
}

export async function updateFiscal(id: string, contatoId: string, input: { contato: ContactUpdate; fiscal: FiscalInput }): Promise<FiscalRecord> {
  await updateContato(contatoId, { ...input.contato, tipo: input.contato.tipo ?? 'fiscal' })
  const updates: Record<string, unknown> = {
    nome: (input as any).fiscal?.nome,
    obra_id: (input as any).fiscal?.obraId ?? null,
    ativo: (input as any).fiscal?.ativo ?? true,
  }

  const { data, error } = await supabase
    .from('fiscais')
    .update(updates)
    .eq('id', id)
    .select(
      `id, contatoId:contato_id, obraId:obra_id, nome, ativo,
       contato:contatos ( id, nome, whatsapp, tipo, ativo ),
       obra:obras ( id, nome )`
    )
    .single()
  if (error) throwSupabaseError(error, 'Nao foi possivel atualizar fiscal.')
  return normalizeFiscal(data)
}

export async function deleteFiscal(id: string, contatoId: string): Promise<void> {
  const { error } = await supabase.from('fiscais').delete().eq('id', id)
  if (error) throwSupabaseError(error, 'Nao foi possivel remover fiscal.')
  await deleteContato(contatoId)
}
export async function createContatoSimples(payload: ContactInput): Promise<ContactRecord> {
  return createContato(payload)
}

export async function updateContatoSimples(id: string, payload: ContactUpdate): Promise<ContactRecord> {
  return updateContato(id, payload)
}

export async function deleteContatoSimples(id: string): Promise<void> {
  await deleteContato(id)
}






























