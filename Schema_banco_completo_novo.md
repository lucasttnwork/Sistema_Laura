# 🗄️ Schema Completo - Banco de Dados Sistema Laura

## 📋 **VISÃO GERAL DA ARQUITETURA**

O banco de dados segue uma arquitetura **centralizada** com fluxo de informações controlado, onde:
- **`contatos`** é a tabela mestre de identificação
- **`mensagens_agente`** mantém contexto completo das conversas  
- **`solicitacoes`** é o core business do sistema
- Demais tabelas orbitam em torno desses pilares

---

## 🏗️ **ESTRUTURA COMPLETA DAS TABELAS**

### **1. TABELA CENTRAL: `contatos`**
**Propósito**: Identificar e rotear cada pessoa que interage via WhatsApp

```sql
CREATE TABLE contatos (
    -- Identificação única
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    whatsapp          VARCHAR(20) UNIQUE NOT NULL,        -- +5511987654321 (chave de busca)
    nome              VARCHAR(255) NOT NULL,              -- "João Silva"
    
    -- Classificação para roteamento
    tipo              VARCHAR(20) NOT NULL,               -- 'fiscal', 'fornecedor', 'escritorio'
    ativo             BOOLEAN DEFAULT true,               -- Controle de ativo/inativo
    
    -- Controle temporal mínimo
    created_at        TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
-- UNIQUE(whatsapp) já garante índice; manter índice por tipo para roteamento
CREATE INDEX idx_contatos_tipo ON contatos(tipo);
```

**Como Preencher:**
- **whatsapp**: Formato internacional completo (+5511987654321)
- **tipo**: Define qual agente IA atenderá ('fiscal' → Laura-Fiscal, 'fornecedor' → Laura-Fornecedor)

**Relacionamentos:**
- `fiscais.contato_id` → `contatos.id` (1:1)
- `fornecedores.contato_id` → `contatos.id` (1:1)

---

### **2. CONTEXTO DE CONVERSAS: `mensagens_agente`**
**Propósito**: Manter histórico completo e contexto de todas as conversas

```sql
CREATE TABLE mensagens_agente (
    -- Identificação
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telefone          VARCHAR(20) NOT NULL,               -- Chave para agrupar conversas
    
    -- Conteúdo da mensagem
    direcao           VARCHAR(10) NOT NULL,               -- 'enviada' ou 'recebida'
    conteudo          TEXT NOT NULL,                      -- Texto completo da mensagem
    tipo_conteudo     VARCHAR(20) DEFAULT 'texto',        -- 'texto', 'imagem', 'documento'
    
    -- Inteligência do agente
    agente_tipo       VARCHAR(20),                        -- 'fiscal', 'fornecedor' (qual agente processou)
    intencao_detectada VARCHAR(50),                       -- 'nova_solicitacao', 'cotacao', 'consulta_status'
    entidades_extraidas JSONB,                           -- Dados estruturados extraídos pela IA
    
    -- Agrupamento de conversas
    sessao_id         VARCHAR(50),                        -- Agrupa mensagens de uma conversa
    thread_id         VARCHAR(50),                        -- Para conversas com múltiplos tópicos
    
    -- Controle de processamento
    processada        BOOLEAN DEFAULT false,              -- Se IA já processou
    requer_followup   BOOLEAN DEFAULT false,              -- Se precisa de follow-up
    
    created_at        TIMESTAMP DEFAULT NOW()
);

-- Índices para queries frequentes
CREATE INDEX idx_mensagens_telefone ON mensagens_agente(telefone);
CREATE INDEX idx_mensagens_sessao ON mensagens_agente(sessao_id);
CREATE INDEX idx_mensagens_agente_tipo ON mensagens_agente(agente_tipo);
```

**Como Preencher:**
- **direcao**: 'recebida' (fiscal/fornecedor → sistema), 'enviada' (sistema → fiscal/fornecedor)
- **entidades_extraidas**: JSON com dados extraídos, ex: `{"materiais": ["cimento", "ferro"], "urgencia": "normal"}`
- **sessao_id**: Gerado automaticamente para agrupar uma conversa contínua
- **intencao_detectada**: Classificação automática pela IA do propósito da mensagem

**Relacionamentos:**
- Não tem FK diretas, mas se relaciona com `contatos` via `telefone`

---

### **3. ESTRUTURA ORGANIZACIONAL: `obras`**
**Propósito**: Definir projetos/locais onde materiais são necessários

```sql
CREATE TABLE obras (
    -- Identificação
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome             VARCHAR(255) NOT NULL,               -- "Obra Residencial São Paulo"
    
    -- Localização
    endereco         TEXT,                                -- "Rua das Flores, 123, Vila Madalena"
    cep              VARCHAR(10),                         -- "01234-567"
    cidade           VARCHAR(100),                        -- "São Paulo"
    estado           VARCHAR(2),                          -- "SP"
    
    -- Controle do projeto
    status           VARCHAR(20) DEFAULT 'ativa',         -- 'ativa', 'pausada', 'finalizada'
    data_inicio      DATE,                                -- Data de início da obra
    data_prevista_fim DATE,                              -- Previsão de conclusão
    
    -- Timestamps
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);
```

**Como Preencher:**
- **nome**: Nome descritivo único para identificação fácil
- **status**: 'ativa' (recebe pedidos), 'pausada' (não recebe), 'finalizada' (concluída)
- **endereco**: Endereço completo para cálculo de proximidade de fornecedores

**Relacionamentos:**
- `obras.id` ← `fiscais.obra_id` (1:N - uma obra pode ter vários fiscais, mas sistema atual 1:1)

---

### **4. PESSOAS: `fiscais`**
**Propósito**: Responsáveis técnicos pelas obras (1 fiscal = 1 obra)

```sql
CREATE TABLE fiscais (
    -- Identificação
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome                VARCHAR(255) NOT NULL,           -- "João Silva"
    
    -- Relacionamento 1:1 com obra
    obra_id             UUID NOT NULL REFERENCES obras(id),  -- Uma obra por fiscal
    
    -- Relacionamento 1:1 com contato
    contato_id          UUID NOT NULL UNIQUE REFERENCES contatos(id),
    
    -- Controle
    ativo               BOOLEAN DEFAULT true,            -- Se pode fazer solicitações
    
    -- Timestamps
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);
```

**Como Preencher:**
- **obra_id**: OBRIGATÓRIO - define para qual obra o fiscal pode solicitar materiais
- **contato_id**: OBRIGATÓRIO - referencia o registro em `contatos` (1:1). Dados como WhatsApp, telefone e e-mail vêm exclusivamente de `contatos`.

**Relacionamentos:**
- `fiscais.obra_id` → `obras.id` (N:1)
- `fiscais.contato_id` → `contatos.id` (1:1)

---

### **5. PARCEIROS: `fornecedores`**
**Propósito**: Empresas que fornecem materiais de construção

```sql
CREATE TABLE fornecedores (
    -- Identificação básica
    id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome                   VARCHAR(255) NOT NULL,        -- "Materiais São Paulo Ltda"
    nome_fantasia          VARCHAR(255),                 -- "Materiais SP"
    
    -- Contato
    telefone_principal     VARCHAR(20),                  -- +5511888887777
    email                  VARCHAR(255),                 -- "vendas@materiaissp.com"
    contato_id             UUID NOT NULL UNIQUE REFERENCES contatos(id),
    endereco               TEXT,                         -- Endereço completo
    cep                    VARCHAR(10),                  -- Para cálculo de proximidade
    cidade                 VARCHAR(100),
    estado                 VARCHAR(2),
    
    -- Dados legais
    cnpj                   VARCHAR(18),                  -- 12.345.678/0001-90
    inscricao_estadual     VARCHAR(20),
    
    -- Sistema de scoring (atualizado automaticamente)
    categoria              VARCHAR(1) DEFAULT 'C',       -- A (premium), B (bom), C (regular), D (problemático)
    score_sla              INTEGER DEFAULT 50,           -- 0-100: Tempo de resposta
    score_pedidos          INTEGER DEFAULT 50,           -- 0-100: Taxa de conclusão
    score_total            INTEGER DEFAULT 50,           -- 0-100: Média ponderada
    
    -- Especialidades e cobertura
    tipos_material         TEXT[] DEFAULT '{}',          -- ['cimento', 'ferro', 'areia', 'tijolo']
    area_atendimento       TEXT[] DEFAULT '{}',          -- ['zona_sul', 'centro', 'abc']
    
    -- Dados financeiros
    dados_pagamento        JSONB,                        -- PIX, dados bancários
    condicoes_pagamento    TEXT,                         -- "À vista 5% desc, 30dd s/juros"
    
    -- Histórico e métricas
    tempo_resposta_medio   INTEGER DEFAULT 24,           -- Em horas
    historico_descontos    JSONB DEFAULT '[]',           -- [{data, percentual, motivo}]
    ultima_interacao       TIMESTAMP,
    
    -- Controle
    ativo                  BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at             TIMESTAMP DEFAULT NOW(),
    updated_at             TIMESTAMP DEFAULT NOW()
);
```

**Como Preencher:**
- **categoria**: Atualizada automaticamente baseada nos scores
- **tipos_material**: Array com especialidades ['cimento', 'ferro', 'areia']  
- **dados_pagamento**: JSON com chaves PIX, conta bancária, etc.
- **score_***: Calculados automaticamente pela IA baseado no histórico

**Relacionamentos:**
- `fornecedores.contato_id` → `contatos.id` (1:1)
- `fornecedores.id` ← `cotacoes.fornecedor_id` (1:N)

---

### **6. CORE BUSINESS: `solicitacoes`**
**Propósito**: Tabela central - cada registro é uma necessidade de materiais

```sql
CREATE TABLE solicitacoes (
    -- Identificação
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo                VARCHAR(50) UNIQUE NOT NULL,   -- PED-SP-2024-001 (gerado automaticamente)
    
    -- Relacionamentos obrigatórios
    fiscal_id             UUID NOT NULL REFERENCES fiscais(id),
    obra_id               UUID NOT NULL REFERENCES obras(id),
    
    -- CONTEÚDO PRINCIPAL (campo unificado)
    pedido                TEXT NOT NULL,                 -- Descrição completa formatada
    /*
    Exemplo de conteúdo:
    "Solicitação para Obra Residencial São Paulo:
    20 sacos de Cimento CP2 Portland (50kg cada)
    50 barras de Vergalhão 10mm CA-50 (12 metros cada)
    
    Especificações:
    Cimento: Portland comum, preferência Votorantim
    Vergalhão: aço CA-50, certificado ABNT"
    */
    
    -- Metadados
    urgencia              VARCHAR(20) DEFAULT 'normal',  -- 'normal', 'urgente', 'emergencial'
    valor_estimado        DECIMAL(10,2),                 -- Estimativa opcional
    observacoes           TEXT,                          -- Contextos especiais do fiscal
    /*
    Exemplo observações:
    "Fiscal disse que precisa pelo menos 2 sacos até amanhã 
    para não parar obra, resto pode chegar depois"
    */
    
    -- FLUXO DE STATUS
    status                VARCHAR(30) DEFAULT 'criada',
    /*
    Fluxo completo:
    'criada' → 'aguardando_fornecedores' → 'cotacoes_recebidas' → 
    'fornecedor_escolhido' → 'aguardando_pagamento' → 'pago' → 'finalizada'
    */
    
    -- Timestamps
    created_at            TIMESTAMP DEFAULT NOW(),
    updated_at            TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_solicitacoes_fiscal ON solicitacoes(fiscal_id);
CREATE INDEX idx_solicitacoes_obra ON solicitacoes(obra_id);
CREATE INDEX idx_solicitacoes_status ON solicitacoes(status);
CREATE INDEX idx_solicitacoes_codigo ON solicitacoes(codigo);
```

**Como Preencher:**
- **codigo**: Gerado automaticamente no formato PED-{SIGLA_CIDADE}-{ANO}-{SEQUENCE}
- **pedido**: Texto bem formatado pela IA com todos os materiais e especificações
- **urgencia**: Baseada no contexto temporal da solicitação do fiscal
- **observacoes**: Informações especiais que o fiscal mencionou

**Evolução de Status:**
1. **'criada'**: Solicitação registrada, pronta para buscar fornecedores
2. **'aguardando_fornecedores'**: Mensagens enviadas aos fornecedores
3. **'cotacoes_recebidas'**: Recebeu 3+ cotações, pronta para análise
4. **'fornecedor_escolhido'**: Escritório aprovou uma cotação
5. **'aguardando_pagamento'**: Dados coletados, aguardando transferência
6. **'pago'**: Pagamento realizado e comprovado
7. **'finalizada'**: Processo completo, materiais entregues

**Relacionamentos:**
- `solicitacoes.fiscal_id` → `fiscais.id` (N:1)
- `solicitacoes.obra_id` → `obras.id` (N:1)
- `solicitacoes.id` ← `cotacoes.solicitacao_id` (1:N)

---

### **7. PROPOSTAS COMERCIAIS: `cotacoes`**
**Propósito**: Todas as ofertas recebidas dos fornecedores

```sql
CREATE TABLE cotacoes (
    -- Identificação
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relacionamentos obrigatórios
    solicitacao_id        UUID NOT NULL REFERENCES solicitacoes(id),
    fornecedor_id         UUID NOT NULL REFERENCES fornecedores(id),
    
    -- Dados da cotação (estrutura flexível)
    itens_cotados         JSONB NOT NULL,                -- Detalhes por item
    /*
    Exemplo estrutura:
    [
      {
        "item": "Cimento CP2",
        "quantidade_cotada": "20 sacos",
        "valor_unitario": 28.50,
        "valor_total": 570.00,
        "disponibilidade": true,
        "prazo_item": "2 dias úteis",
        "marca": "Votorantim",
        "observacoes": "Pronta entrega"
      }
    ]
    */
    
    -- Totalizadores
    valor_total_geral     DECIMAL(10,2) NOT NULL,        -- Soma de todos os itens
    desconto_oferecido    DECIMAL(5,2) DEFAULT 0,        -- Percentual de desconto
    valor_com_desconto    DECIMAL(10,2),                 -- Valor final após desconto
    
    -- Condições comerciais
    prazo_entrega         VARCHAR(100),                  -- "3 dias úteis"
    condicoes_pagamento   TEXT,                          -- "30dd ou 5% desc à vista"
    validade_orcamento    INTEGER DEFAULT 15,            -- Dias de validade
    
    -- Rastreabilidade
    mensagem_original     TEXT,                          -- Mensagem completa do fornecedor
    origem_mensagem_id    UUID REFERENCES mensagens_agente(id),
    
    -- Controle e análise
    status                VARCHAR(20) DEFAULT 'recebida', -- 'recebida', 'aceita', 'rejeitada'
    score_calculado       DECIMAL(5,2),                   -- Score da IA (0-100)
    
    -- Timestamps
    created_at            TIMESTAMP DEFAULT NOW(),
    updated_at            TIMESTAMP DEFAULT NOW()
);

-- Índices para análises
CREATE INDEX idx_cotacoes_solicitacao ON cotacoes(solicitacao_id);
CREATE INDEX idx_cotacoes_fornecedor ON cotacoes(fornecedor_id);
CREATE INDEX idx_cotacoes_status ON cotacoes(status);
```

**Como Preencher:**
- **itens_cotados**: JSONB estruturado pela IA a partir da mensagem do fornecedor
- **valor_com_desconto**: Calculado automaticamente se desconto_oferecido > 0
- **score_calculado**: Gerado pela IA considerando preço, prazo, score do fornecedor
- **status**: 'aceita' para cotação escolhida, 'rejeitada' para as demais

**Relacionamentos:**
- `cotacoes.solicitacao_id` → `solicitacoes.id` (N:1)
- `cotacoes.fornecedor_id` → `fornecedores.id` (N:1)
- `cotacoes.origem_mensagem_id` → `mensagens_agente.id` (1:1)

---

### **8. PROCESSO DE DECISÃO: `aprovacoes`**
**Propósito**: Análise comparativa e processo de aprovação

```sql
CREATE TABLE aprovacoes (
    -- Identificação
    id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relacionamento principal
    solicitacao_id            UUID NOT NULL REFERENCES solicitacoes(id),
    
    -- Análise comparativa
    cotacoes_analisadas       UUID[] NOT NULL,           -- IDs das cotações comparadas
    cotacao_recomendada_id    UUID NOT NULL REFERENCES cotacoes(id),
    
    -- Resultado da análise IA
    analise_ia                JSONB NOT NULL,
    /*
    Estrutura da análise:
    {
      "score_vencedor": 87.5,
      "justificativa": "Melhor custo-benefício considerando prazo e categoria do fornecedor",
      "comparativo": [
        {
          "fornecedor_nome": "Materiais ABC",
          "score": 87.5,
          "pontos_fortes": ["Menor preço total", "Categoria A", "Prazo adequado"],
          "pontos_fracos": ["Localização mais distante"]
        }
      ],
      "economia_potencial": 245.80,
      "riscos": ["Fornecedor com poucos pedidos recentes"],
      "oportunidades_negociacao": "Solicitar desconto adicional por pagamento à vista"
    }
    */
    
    recomendacao_negociacao   TEXT,                      -- Sugestões específicas
    
    -- Fluxo de aprovação
    status                    VARCHAR(30) DEFAULT 'aguardando_aprovacao',
    /*
    Status: 'aguardando_aprovacao' → 'aprovada_escritorio' → 
            'dados_coletados' → 'aguardando_pagamento' → 'pago' → 'finalizada'
    */
    
    -- Dados da negociação
    dados_pagamento_final     JSONB,                     -- PIX/bancários confirmados
    valor_negociado_final     DECIMAL(10,2),             -- Após negociação com fornecedor
    condicoes_finais          TEXT,                      -- Condições finais acordadas
    
    -- Controle humano
    aprovado_por              VARCHAR(255),              -- Nome/ID do usuário do escritório
    observacoes_aprovacao     TEXT,                      -- Comentários da equipe
    data_aprovacao            TIMESTAMP,
    
    -- Comprovante de pagamento
    comprovante_arquivo_url   VARCHAR(500),              -- URL no storage (S3/Supabase)
    comprovante_enviado_em    TIMESTAMP,
    
    -- Timestamps
    created_at                TIMESTAMP DEFAULT NOW(),
    updated_at                TIMESTAMP DEFAULT NOW()
);
```

**Como Preencher:**
- **analise_ia**: JSON completo gerado pela IA com análise comparativa
- **cotacoes_analisadas**: Array com IDs de todas as cotações consideradas
- **dados_pagamento_final**: Coletado na negociação com fornecedor escolhido
- **valor_negociado_final**: Pode ser diferente do valor da cotação original

**Relacionamentos:**
- `aprovacoes.solicitacao_id` → `solicitacoes.id` (1:1)
- `aprovacoes.cotacao_recomendada_id` → `cotacoes.id` (1:1)

---

### **9. CONTROLE OPERACIONAL: `disparos_fornecedores`**
**Propósito**: Rastrear comunicações enviadas aos fornecedores

```sql
CREATE TABLE disparos_fornecedores (
    -- Identificação
    id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relacionamentos
    solicitacao_id     UUID NOT NULL REFERENCES solicitacoes(id),
    fornecedor_id      UUID NOT NULL REFERENCES fornecedores(id),
    
    -- Dados do disparo
    mensagem_enviada   TEXT NOT NULL,                   -- Texto exato da solicitação
    canal              VARCHAR(20) DEFAULT 'whatsapp',  -- 'whatsapp', 'email', 'sms'
    
    -- Controle de follow-up
    status             VARCHAR(20) DEFAULT 'enviado',   -- 'enviado', 'visualizado', 'respondido', 'timeout'
    followups_enviados INTEGER DEFAULT 0,               -- Contador de tentativas
    ultimo_followup    TIMESTAMP,
    
    -- Timestamps
    data_envio         TIMESTAMP DEFAULT NOW(),
    data_resposta      TIMESTAMP,                       -- Quando fornecedor respondeu
    created_at         TIMESTAMP DEFAULT NOW()
);
```

**Como Preencher:**
- **mensagem_enviada**: Texto completo enviado ao fornecedor
- **status**: Atualizado conforme resposta ('respondido' quando cotação chega)
- **followups_enviados**: Incrementado a cada follow-up automático

---

## 🔗 **MAPA DE RELACIONAMENTOS**

```
        contatos (central)
           ↑                 ↑
   contato_id           contato_id
        fiscais         fornecedores
              ↓
         obra_id → obras
              ↓
        solicitacoes (core business)
              ├── cotacoes (1:N)
              ├── aprovacoes (1:1)  
              └── disparos_fornecedores (1:N)
                      ↓
        mensagens_agente (contexto por telefone)
```

## 📊 **FLUXO DE INFORMAÇÕES E STATUS**

### **Fluxo Principal do Sistema:**

1. **Fiscal envia WhatsApp** → Registro em `mensagens_agente`
2. **Sistema consulta** `contatos` → Identifica como 'fiscal'  
3. **Laura-Fiscal processa** → Cria registro em `solicitacoes` (status: 'criada')
4. **Sistema busca fornecedores** → Cria registros em `disparos_fornecedores`
5. **Status atualiza** para 'aguardando_fornecedores'
6. **Fornecedores respondem** → Registros em `cotacoes`
7. **Ao chegar 3 cotações** → Status: 'cotacoes_recebidas' → Cria `aprovacoes`
8. **Escritório aprova** → Status: 'fornecedor_escolhido'
9. **Negociação finalizada** → Status: 'aguardando_pagamento'
10. **Pagamento feito** → Status: 'pago'
11. **Entrega confirmada** → Status: 'finalizada'

### **Triggers Automáticos:**

- **solicitacoes.status = 'criada'** → Dispara busca de fornecedores
- **cotacoes.count = 3** → Dispara análise IA  
- **aprovacoes.status = 'aprovada_escritorio'** → Dispara negociação
- **comprovante_arquivo_url preenchido** → Dispara envio ao fornecedor

Este schema garante **rastreabilidade completa**, **flexibilidade** e **escalabilidade** para o sistema Laura!