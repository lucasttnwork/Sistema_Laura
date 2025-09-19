import { useEffect } from 'react';

import { useAuthStore } from '../stores/auth-store';

/**
 * Hook para inicializar autenticação na montagem da aplicação
 * Verifica se existe um usuário autenticado e tenta refresh se necessário
 */
export function useAuthInit() {
  const { isAuthenticated, refreshToken } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      // Se já está autenticado, não precisa fazer nada
      if (isAuthenticated) {
        return;
      }

      // Tentar refresh do token se não estiver autenticado
      // Isso cobre o caso onde o usuário recarrega a página
      try {
        const refreshSuccess = await refreshToken();

        if (refreshSuccess) {
          console.log('✅ Sessão restaurada com sucesso');
        } else {
          console.log('ℹ️ Nenhuma sessão ativa encontrada');
        }
      } catch (error) {
        console.warn('Erro ao inicializar autenticação:', error);
      }
    };

    initializeAuth();
  }, [isAuthenticated, refreshToken]);
}
