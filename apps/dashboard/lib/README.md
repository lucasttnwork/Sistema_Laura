# Sistema de Autenticacao com Zustand

Este documento descreve a implementacao do sistema de autenticacao usando Zustand no dashboard.

## Funcionalidades Implementadas

### Tokens em Memoria (Sem localStorage)
- Access tokens e refresh tokens sao armazenados apenas em memoria
- Nao ha exposicao de tokens no localStorage
- Evita vazamentos via XSS

### Fluxo de Refresh Automatico
- Axios interceptors identificam tokens expirados (401)
- Refresh automatico e transparente para o usuario
- Retentativa automatica das requests apos refresh
- Fila de requisicoes durante o refresh para evitar perdas

### Rotas Protegidas
- Componente ProtectedRoute baseado em React Router
- Verificacao automatica de autenticacao
- Redirecionamento automatico para login
- Suporte a verificacao de permissoes

### Logout Completo
- Limpeza completa do estado de autenticacao
- Logout na API (quando disponivel)
- Limpeza de residuos em storages do navegador
- Redirecionamento seguro para login

## Estrutura dos Arquivos

```
lib/
|- stores/
|  \__ auth-store.ts          # Store principal de autenticacao
|- http/
|  \__ client.ts              # Cliente HTTP com interceptors
|- hooks/
|  \__ use-auth-init.ts       # Hook de inicializacao
\- types/
   \__ auth.ts                # Tipos TypeScript
```
- Guard atual: src/components/ProtectedRoute.tsx (React Router)

## Como Usar

### 1. Usar o Store de Autenticacao

```tsx
import { useAuth } from '../lib/stores/auth-store';

function MyComponent() {
  const { user, login, logout, isAuthenticated, isLoading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ whatsapp: '+5511999999999', password: 'senha123' });
    } catch (err) {
      console.error('Erro no login:', err);
    }
  };

  if (isLoading) return <div>Carregando...</div>;
  if (!isAuthenticated) return <div>Nao autenticado</div>;

  return (
    <div>
      <p>Ola, {user?.nome}!</p>
      <button onClick={logout}>Sair</button>
    </div>
  );
}
```

### 2. Proteger uma Rota

```tsx
import ProtectedRoute from '../../src/components/ProtectedRoute';

function Dashboard() {
  return <div>Dashboard Protegido</div>;
}

export function DashboardRoute() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
```

### 3. Verificar Permissoes

```tsx
import { usePermissions } from '../lib/stores/auth-store';

function AdminPanel() {
  const { hasPermission, hasAnyPermission } = usePermissions();

  if (!hasPermission('admin.panel')) {
    return <div>Acesso negado</div>;
  }

  return <div>Painel Administrativo</div>;
}
```

### 4. Fazer Requisicoes Autenticadas

```tsx
import { api } from '../lib/http/client';

const response = await api.get('/protected-endpoint');
```

## Seguranca

### Tokens em Memoria
- Tokens ficam apenas no estado do Zustand
- Nao persistem entre sessoes do navegador
- Sao descartados quando a aba e fechada
- Improbabilita ataques XSS

### Refresh Automatico
- Tokens sao renovados automaticamente
- Usuario nao percebe interrupcoes
- Sistema robusto de fila para multiplas requisicoes
- Logout automatico se o refresh falhar

### Logout Seguro
- Limpeza completa de todos os dados de autenticacao
- Logout na API para invalidar tokens server-side
- Limpeza de residuos em storage
- Redirecionamento forçado para login

## Estados do Store

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;      // Em memoria apenas
  refreshToken: string | null;     // Em memoria apenas
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

## Fluxo de Autenticacao

1. Login: credenciais -> API -> tokens em memoria -> estado atualizado
2. Requisicoes: token automatico -> API -> resposta
3. Token expirado: 401 -> refresh automatico -> retentativa
4. Logout: API logout -> limpeza completa -> redirecionamento

## Tratamento de Erros

- Login falha: mostra erro, mantem formulario
- Token expirado: refresh automatico, transparente
- Refresh falha: logout automatico e redirecionamento
- API indisponivel: logout gracioso e redirecionamento

## Configuracao

### Variaveis de Ambiente
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Dependencias
```json
{
  "zustand": "^5.0.8",
  "axios": "^1.6.0"
}
```

## Testes

Para testar o sistema:

1. Login: use credenciais de teste
2. Sessao: recarregue a pagina (deve manter login)
3. Refresh: aguarde expirar o token (30 min)
4. Logout: deve limpar tudo e redirecionar

## Notas Tecnicas

- Zustand Persist: apenas `user` e estado basico persistem
- Axios Interceptors: refresh automatico e retentativas
- ProtectedRoute: reutilizavel com React Router
- TypeScript: totalmente tipado para seguranca
- Vite: stack atual para desenvolvimento e build
