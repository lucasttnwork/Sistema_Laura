import { useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Heading } from '../components/ui/heading'
import { Input } from '../components/ui/input'
import { useAuthStore } from '../stores/authStore'

type LoginFormInputs = {
  whatsapp: string
  senha_login: string
}

const LoginPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>()
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const [loginError, setLoginError] = useState<string | null>(null)

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setLoginError(null)
    try {
      await login(data.whatsapp, data.senha_login)
      navigate('/solicitacoes')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setLoginError(errorMessage)
      console.error('Falha no login:', errorMessage)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Heading level={1} size="lg" dataTestId="login-heading">
            Login - Sistema Laura
          </Heading>
          <p className="text-sm text-muted-foreground">Informe suas credenciais para acessar o dashboard.</p>
        </div>
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">Acesso restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1">
                <label htmlFor="whatsapp" className="text-sm font-medium text-muted-foreground">
                  WhatsApp
                </label>
                <Input
                  id="whatsapp"
                  type="tel"
                  dataTestId="input-login-whatsapp"
                  placeholder="(11) 90000-0000"
                  {...register('whatsapp', { required: 'Numero do WhatsApp e obrigatorio' })}
                />
                {errors.whatsapp ? (
                  <span className="text-xs text-danger">{errors.whatsapp.message}</span>
                ) : null}
              </div>

              <div className="space-y-1">
                <label htmlFor="senha_login" className="text-sm font-medium text-muted-foreground">
                  Senha
                </label>
                <Input
                  id="senha_login"
                  type="password"
                  dataTestId="input-login-senha"
                  placeholder="Sua senha"
                  {...register('senha_login', { required: 'Senha e obrigatoria' })}
                />
                {errors.senha_login ? (
                  <span className="text-xs text-danger">{errors.senha_login.message}</span>
                ) : null}
              </div>

              {loginError ? (
                <Alert dataTestId="login-error" variant="danger">
                  <div className="space-y-1">
                    <AlertTitle>Falha no login</AlertTitle>
                    <AlertDescription>{loginError}</AlertDescription>
                  </div>
                </Alert>
              ) : null}

              <Button type="submit" dataTestId="btn-login-submit" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
