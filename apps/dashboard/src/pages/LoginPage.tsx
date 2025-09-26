import { useNavigate } from 'react-router-dom'

import { Button } from '../components/ui/button'
import { Heading } from '../components/ui/heading'

const LoginPage = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <Heading level={1} size="lg" dataTestId="login-heading">
          Acesso Livre - Sistema Laura
        </Heading>
        <p className="text-sm text-muted-foreground">
          As rotas do dashboard agora estão liberadas sem autenticação.
        </p>
        <div className="grid gap-3">
          <Button onClick={() => navigate('/solicitacoes')} dataTestId="btn-ir-solicitacoes">
            Ir para Solicitações
          </Button>
          <Button onClick={() => navigate('/cotacoes')} dataTestId="btn-ir-cotacoes" variant="secondary">
            Ir para Cotações
          </Button>
          <Button onClick={() => navigate('/fornecedores')} dataTestId="btn-ir-fornecedores" variant="outline">
            Ir para Fornecedores
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
