### Fluxo de Negócio: Solicitação → Cotação → Aprovação

Este documento mapeia o fluxo de negócio atual para o schema Prisma, identifica lacunas e propõe ajustes (models, relações, índices), além de um plano de migração reversível.

---

## 1) Mapeamento do fluxo para o schema atual

- **Solicitação (`Solicitacao`)**
  - Campos: `obraId`, `item`, `quantidade (String)`, `especificacoes?`, `status (String)`
  - Relações: `obra: Obra`, `cotações: Cotacao[]`
  - Observação: `status` e `quantidade` usam `String`.

- **Cotação (`Cotacao`)**
  - Campos: `solicitacaoId`, `fornecedorId`, `userId`, `obraId`, `valorUnitario (Float)`, `valorTotal (Float)`, `prazo (String)`, `pagamento (String)`, `status (String)`
  - Relações: `solicitacao`, `fornecedor`, `user`, `obra`, `historicos: Historico[]`, `aprovacoes: Aprovacao[]`
  - Observação: `obraId` é redundante (derivável de `solicitacao.obraId`). Valores monetários como `Float`.

- **Aprovação (`Aprovacao`)**
  - Campos: `userId`, `cotacaoId`, `status (String)`, `comentario?`
  - Relações: `user`, `cotacao`
  - Observação: não há restrição de unicidade por (`cotacaoId`,`userId`).

- Entidades de apoio
  - `Obra`: relação com `Solicitacao[]` e `Cotacao[]`
  - `Fornecedor`: relação com `Cotacao[]`
  - `Historico`: trilha de ações por `cotacaoId` (campo `acao` é `String`)
  - `Arquivo`: ligação polimórfica por (`entidadeTipo`,`entidadeId`) sem índices

---

## 2) Problemas/Lacunas identificados

- **Tipos numéricos e monetários**
  - `Solicitacao.quantidade` é `String` → deveria ser numérico (p.ex. `Decimal` com 2 casas) para permitir cálculos.
  - `Cotacao.valorUnitario` e `valorTotal` são `Float` → suscetíveis a erro de ponto flutuante; usar `Decimal`.

- **Enums de status e termos**
  - `status` como `String` em `Solicitacao`, `Cotacao`, `Aprovacao` → padronizar com `enum`.
  - `prazo` e `pagamento` como `String` → padronizar em campos estruturados (`prazoDias` ou `dataValidade`, e `pagamento` como `enum`).

- **Redundância e integridade referencial**
  - `Cotacao.obraId` duplicado e potencialmente inconsistente com `Solicitacao.obraId`.

- **Índices e unicidade**
  - Ausência de `@@index` nos FKs mais consultados.
  - Falta `@@unique([cotacaoId, userId])` em `Aprovacao` (evitar múltiplas aprovações do mesmo usuário para a mesma cotação).
  - `Arquivo` sem índice composto em (`entidadeTipo`,`entidadeId`).

- **Eventos/Histórico**
  - `Historico.acao` é `String` → ideal como `enum` para consistência.

- **Regras de deleção**
  - Não há políticas de `onDelete`/`onUpdate` explícitas nas relações.

---

## 3) Propostas de ajustes no schema (Prisma)

- **Enums**
```prisma
enum SolicitacaoStatus { PENDENTE EM_COTACAO AGUARDANDO_APROVACAO APROVADA REPROVADA CANCELADA }
enum CotacaoStatus { ENVIADA RECEBIDA EM_ANALISE APROVADA REPROVADA EXPIRADA CANCELADA }
enum AprovacaoStatus { PENDENTE APROVADA REPROVADA }
enum HistoricoAcao { COTACAO_CRIADA COTACAO_ATUALIZADA COTACAO_ENVIADA COTACAO_APROVADA COTACAO_REPROVADA }
enum PagamentoTermo { AVISTA 30DD 45DD 60DD 28_DIAS 2X 3X PERSONALIZADO }
```

- **Tipos e campos**
  - `Solicitacao.quantidade: Decimal @db.Decimal(12,2)` (substituir `String`).
  - `Cotacao.valorUnitario, valorTotal: Decimal @db.Decimal(12,2)` (substituir `Float`).
  - `Cotacao.prazo`: substituir por `prazoDias Int` ou adicionar `dataValidade DateTime?` (preferir `prazoDias`).
  - `Cotacao.pagamento`: `PagamentoTermo` ou split em campos (`forma`, `condicao`) conforme necessidade futura.
  - `Solicitacao.status: SolicitacaoStatus`, `Cotacao.status: CotacaoStatus`, `Aprovacao.status: AprovacaoStatus`.
  - `Historico.acao: HistoricoAcao`.

- **Relações/Normalização**
  - Remover `Cotacao.obraId` e acessar `obra` via `cotacao.solicitacao.obra` (evita inconsistência).
  - Adicionar política `onDelete`/`onUpdate` explícita:
    - `Solicitacao.obra` → `onDelete: Restrict`
    - `Cotacao.solicitacao` → `onDelete: Cascade`
    - `Cotacao.fornecedor` → `onDelete: Restrict`
    - `Aprovacao.cotacao` → `onDelete: Cascade`
    - `Historico.cotacao` → `onDelete: Cascade`

- **Índices e unicidades**
```prisma
model Aprovacao {
  // ...
  @@unique([cotacaoId, userId])
}

model Cotacao {
  // ...
  @@index([solicitacaoId])
  @@index([fornecedorId])
  @@index([userId])
  // obraId será removido
}

model Solicitacao {
  // ...
  @@index([obraId])
}

model Historico {
  // ...
  @@index([cotacaoId])
  @@index([createdAt])
}

model Arquivo {
  // ...
  @@index([entidadeTipo, entidadeId])
}
```

---

## 4) Plano de migração reversível (duas fases)

> Estratégia: adicionar novos campos/estruturas, realizar backfill, migrar código, validar, depois remover campos antigos. Assim o rollback é simples até a remoção final.

### Fase 1 — Adições e Backfill (safe)
1. Criar enums (`SolicitacaoStatus`, `CotacaoStatus`, `AprovacaoStatus`, `HistoricoAcao`, `PagamentoTermo`).
2. Adicionar colunas novas mantendo as antigas:
   - `Solicitacao.quantidadeDec Decimal(12,2)`
   - `Cotacao.valorUnitarioDec Decimal(12,2)`
   - `Cotacao.valorTotalDec Decimal(12,2)`
   - `Cotacao.prazoDias Int?`
   - `Cotacao.pagamentoTermo PagamentoTermo?`
3. Adicionar índices e `@@unique([cotacaoId, userId])` em `Aprovacao`.
4. Backfill de dados (SQL/Prisma):
   - `quantidadeDec = try_cast(quantidade)`
   - `valorUnitarioDec = valorUnitario`, `valorTotalDec = valorTotal`
   - `prazoDias = try_parse(prazo)` quando aplicável
5. Ajustar app para ler/gravar preferencialmente os novos campos e enums.
6. Garantir que `obraId` não é mais usado no código via `Cotacao`.

### Rollback até aqui
- Reverter o app para ler os campos antigos.
- Dropar colunas novas se necessário (sem perda de dados originais).

### Fase 2 — Limpeza e Normalização (breaking)
1. Migrar `Solicitacao.quantidade` → substituir pela coluna `quantidadeDec` e renomear para `quantidade`.
2. Migrar `Cotacao.valorUnitario/valorTotal` → substituir por decimais e renomear.
3. Migrar `Cotacao.prazo`/`pagamento` → usar `prazoDias` e `pagamentoTermo`.
4. Remover `Cotacao.obraId`.
5. Tornar `status` enums e dropar colunas `String` antigas.
6. Ajustar `Historico.acao` para enum e dropar coluna antiga se foi duplicada.

### Rollback após fase 2
- Exige migração compensatória: recriar colunas antigas e copiar de volta dos novos campos (perda de formatação original pode ocorrer). Por isso recomenda-se janela de validação entre as fases.

---

## 5) Impactos no código e consultas

- Atualizar DTOs/validators para `Decimal`/enums.
- Garantir cálculos de `valorTotal` a partir de `quantidade * valorUnitario` (server-side) para consistência.
- Consultas comuns e índices cobertos:
  - Listar cotações por `solicitacaoId`, `fornecedorId`, `status`.
  - Listar solicitações por `obraId` e `status`.
  - Auditar histórico por `cotacaoId` e ordenação por `createdAt`.
  - Buscar arquivos por (`entidadeTipo`,`entidadeId`).

---

## 6) Próximos passos sugeridos

1. Implementar Fase 1 das migrações e ajustar o app para novos campos.
2. Validar e estabilizar (monitorar logs/consultas). 
3. Executar Fase 2 e remover legados.
4. Adicionar testes e scripts de verificação de consistência.
