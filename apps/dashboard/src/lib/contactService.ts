import { supabase } from './supabaseClient'
import { mapSupabaseError, throwSupabaseError } from './supabaseErrors'


export type ContactRecord = {
  id: string
  nome: string | null
  whatsapp: string
  tipo: string
  ativo: boolean
  email: string | null
  observacoes: string | null
}

export type ObraSummary = {
  id: string
  nome: string
}

export type FornecedorRecord = {
  id: string
  contatoId: string
  categoria: string
  razaoSocial: string | null
  cnpj: string | null
  cidade: string | null
  estado: string | null
  observacoes: string | null
  ativo: boolean
  created_at?: string
  updated_at?: string
  contato: ContactRecord
}

export type FiscalRecord = {
  id: string
  contatoId: string
  obraId: string | null
  cargo: string
  registroProfissional: string | null
  especialidade: string | null
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
  categoria: string
  razaoSocial?: string | null
  cnpj?: string | null
  cidade?: string | null
  estado?: string | null
  observacoes?: string | null
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
    email: data?.email ?? null,
    observacoes: data?.observacoes ?? null,
  }
}

function normalizeFornecedor(row: any): FornecedorRecord {
  return {
    id: row?.id,
    contatoId: row?.contatoId,
    categoria: row?.categoria,
    razaoSocial: row?.razaoSocial ?? null,
    cnpj: row?.cnpj ?? null,
    cidade: row?.cidade ?? null,
    estado: row?.estado ?? null,
    observacoes: row?.observacoes ?? null,
    ativo: Boolean(row?.ativo),
    created_at: row?.created_at,
    updated_at: row?.updated_at,
    contato: normalizeContact(row?.contato),
  }
}

function normalizeFiscal(row: any): FiscalRecord {
  return {
    id: row?.id,
    contatoId: row?.contatoId,
    obraId: row?.obraId ?? null,
    cargo: row?.cargo ?? '',
    registroProfissional: row?.registroProfissional ?? null,
    especialidade: row?.especialidade ?? null,
    contato: normalizeContact(row?.contato),
    obra: row?.obra ? { id: row?.obra?.id, nome: row?.obra?.nome } : null,
  }
}

export async function listFornecedores(): Promise<FornecedorRecord[]> {
  const { data, error } = await supabase
    .from('fornecedores')
    .select(
      `id, contatoId:contato_id, categoria, razaoSocial:razao_social, cnpj, cidade, estado, observacoes, ativo, created_at, updated_at,
       contato:contatos ( id, nome, whatsapp, tipo, ativo, email, observacoes )`
    )
    .order('created_at', { ascending: false })

  if (error) throwSupabaseError(error, 'Nao foi possivel carregar fornecedores.')
  return (data ?? []).map(normalizeFornecedor)
}

export async function listFiscais(): Promise<FiscalRecord[]> {
  const { data, error } = await supabase
    .from('fiscais')
    .select(
      `id, contatoId:contato_id, obraId:obra_id, cargo, registroProfissional:registro_profissional, especialidade,
       contato:contatos ( id, nome, whatsapp, tipo, ativo, email, observacoes ),
       obra:obras ( id, nome )`
    )
    .order('created_at', { ascending: false })

  if (error) throwSupabaseError(error, 'Nao foi possivel carregar fiscais.')
  return (data ?? []).map(normalizeFiscal)
}

export async function listContatos(): Promise<ContactRecord[]> {
  const { data, error } = await supabase
    .from('contatos')
    .select('id, nome, whatsapp, tipo, ativo, email, observacoes, created_at')
    .order('created_at', { ascending: false })

  if (error) throwSupabaseError(error, 'Nao foi possivel carregar contatos.')
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
    tipo: payload.tipo ?? 'DESCONHECIDO',
    ativo: payload.ativo ?? true,
    email: payload.email ?? null,
    observacoes: payload.observacoes ?? null,
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
  if (payload.email !== undefined) updates.email = payload.email
  if (payload.observacoes !== undefined) updates.observacoes = payload.observacoes
  if (Object.keys(updates).length === 0) {
    const { data, error } = await supabase.from('contatos').select('id, nome, whatsapp, tipo, ativo, email, observacoes').eq('id', id).single()
    if (error) throwSupabaseError(error, 'Nao foi possivel carregar contato.')
    return normalizeContact(data)
  }
  const { data, error } = await supabase
    .from('contatos')
    .update(updates)
    .eq('id', id)
    .select('id, nome, whatsapp, tipo, ativo, email, observacoes')
    .single()
  if (error) throwSupabaseError(error, 'Nao foi possivel atualizar contato.')
  return normalizeContact(data)
}

export async function deleteContato(id: string): Promise<void> {
  const { error } = await supabase.from('contatos').delete().eq('id', id)
  if (error) throwSupabaseError(error, 'Nao foi possivel remover contato.')
}

export async function createFornecedor(input: { contato: ContactInput; fornecedor: FornecedorInput }): Promise<FornecedorRecord> {
  const contato = await createContato({ ...input.contato, tipo: 'FORNECEDOR' })
  const insert = {
    contato_id: contato.id,
    categoria: input.fornecedor.categoria,
    razao_social: input.fornecedor.razaoSocial ?? null,
    cnpj: input.fornecedor.cnpj ?? null,
    cidade: input.fornecedor.cidade ?? null,
    estado: input.fornecedor.estado ?? null,
    observacoes: input.fornecedor.observacoes ?? null,
    ativo: input.fornecedor.ativo ?? true,
  }

  let inserted: any
  try {
    const { data, error } = await supabase
      .from('fornecedores')
      .insert(insert)
      .select(`
        id, contatoId:contato_id, categoria, razaoSocial:razao_social, cnpj, cidade, estado, observacoes, ativo, created_at, updated_at,
        contato:contatos ( id, nome, whatsapp, tipo, ativo, email, observacoes )
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
  await updateContato(contatoId, { ...input.contato, tipo: input.contato.tipo ?? 'FORNECEDOR' })
  const updates: Record<string, unknown> = {
    categoria: input.fornecedor.categoria,
    ativo: input.fornecedor.ativo ?? true,
  }
  updates.razao_social = input.fornecedor.razaoSocial ?? null
  updates.cnpj = input.fornecedor.cnpj ?? null
  updates.cidade = input.fornecedor.cidade ?? null
  updates.estado = input.fornecedor.estado ?? null
  updates.observacoes = input.fornecedor.observacoes ?? null

  const { data, error } = await supabase
    .from('fornecedores')
    .update(updates)
    .eq('id', id)
    .select(`
      id, contatoId:contato_id, categoria, razaoSocial:razao_social, cnpj, cidade, estado, observacoes, ativo, created_at, updated_at,
      contato:contatos ( id, nome, whatsapp, tipo, ativo, email, observacoes )
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

export async function createFiscal(input: { contato: ContactInput; fiscal: FiscalInput }): Promise<FiscalRecord> {
  const contato = await createContato({ ...input.contato, tipo: 'FISCAL' })
  const insert = {
    contato_id: contato.id,
    cargo: input.fiscal.cargo,
    obra_id: input.fiscal.obraId ?? null,
    registro_profissional: input.fiscal.registroProfissional ?? null,
    especialidade: input.fiscal.especialidade ?? null,
  }

  let inserted: any
  try {
    const { data, error } = await supabase
      .from('fiscais')
      .insert(insert)
      .select(`
        id, contatoId:contato_id, obraId:obra_id, cargo, registroProfissional:registro_profissional, especialidade,
        contato:contatos ( id, nome, whatsapp, tipo, ativo, email, observacoes ),
        obra:obras ( id, nome )
      `)
      .single()
    if (error) throwSupabaseError(error, 'Nao foi possivel criar fiscal.')
    inserted = data
  } catch (err) {
    await deleteContato(contato.id).catch(() => undefined)
    throw mapSupabaseError(err, 'Nao foi possivel criar fiscal.')
  }

  return normalizeFiscal(inserted)
}

export async function updateFiscal(id: string, contatoId: string, input: { contato: ContactUpdate; fiscal: FiscalInput }): Promise<FiscalRecord> {
  await updateContato(contatoId, { ...input.contato, tipo: input.contato.tipo ?? 'FISCAL' })
  const updates: Record<string, unknown> = {
    cargo: input.fiscal.cargo,
    obra_id: input.fiscal.obraId ?? null,
    registro_profissional: input.fiscal.registroProfissional ?? null,
    especialidade: input.fiscal.especialidade ?? null,
  }

  const { data, error } = await supabase
    .from('fiscais')
    .update(updates)
    .eq('id', id)
    .select(`
      id, contatoId:contato_id, obraId:obra_id, cargo, registroProfissional:registro_profissional, especialidade,
      contato:contatos ( id, nome, whatsapp, tipo, ativo, email, observacoes ),
      obra:obras ( id, nome )
    `)
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






























