from pathlib import Path

path = Path(r"apps/dashboard/src/lib/contactService.ts")
text = path.read_text(encoding="utf-8")
old = "export type FornecedorInput = {\n  categoria: string\n  razaoSocial?: string | null\n  cnpj?: string | null\n  cidade?: string | null\n  estado?: string | null\n  observacoes?: string | null\n  ativo?: boolean\n}\n"
new = "export type FornecedorInput = {\n  nome: string\n  nomeFantasia?: string | null\n  categoria?: string | null\n  telefonePrincipal?: string | null\n  email?: string | null\n  cnpj?: string | null\n  inscricaoEstadual?: string | null\n  cidade?: string | null\n  estado?: string | null\n  condicoesPagamento?: string | null\n  ativo?: boolean\n}\n"
if old not in text:
    raise SystemExit("FornecedorInput block not found")
text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
