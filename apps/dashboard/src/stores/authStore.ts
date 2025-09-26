import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { supabase } from '../lib/supabaseClient';

type User = {
  id: string;
  nome?: string;
  cargo?: string;
  whatsapp?: string;
  email?: string;
  permissions?: any;
};

type AuthState = {
  user: User | null;
  token: string | null;
  login: (whatsapp: string, senha_login: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      
      login: async (whatsapp, senha_login) => {
        try {
          // 2) Normalizar telefone para formato internacional com +55
          const onlyDigits = (whatsapp || '').replace(/\D+/g, '');
          let normalizedPhone = onlyDigits;
          if (normalizedPhone.startsWith('55')) {
            normalizedPhone = `+${normalizedPhone}`;
          } else if (!normalizedPhone.startsWith('+55')) {
            normalizedPhone = `+55${normalizedPhone}`;
          }

          // 3) Consultar/Upsert na tabela de usuários do dashboard
          //   Tabela: usuarios_dashboard (whatsapp UNIQUE, senha_hash, ativo)
          const { data: existing, error: queryError } = await supabase
            .from('usuarios_dashboard')
            .select('id, whatsapp, ativo, senha')
            .eq('whatsapp', normalizedPhone)
            .maybeSingle();

          if (queryError && queryError.code !== 'PGRST116') {
            // Erro inesperado ao consultar
            throw new Error(queryError.message || 'Falha ao consultar usuário');
          }

          let usuario = existing as any | null;

          if (!usuario) {
            throw new Error('Usuário não encontrado. Solicite acesso ao administrador.');
          }

          if (usuario && usuario.ativo === false) {
            throw new Error('Usuário inativo. Contate o administrador.');
          }

          // 4) Verificar senha simples
          if (!usuario || typeof usuario.senha !== 'string' || usuario.senha !== senha_login) {
            throw new Error('Credenciais inválidas. Verifique WhatsApp e senha.');
          }

          // 5) Criar sessão simples no client
          const mappedUser: User = {
            id: usuario.id,
            nome: undefined,
            cargo: 'usuario_dashboard',
            whatsapp: usuario.whatsapp,
            email: undefined,
            permissions: undefined,
          };

          set({ user: mappedUser, token: 'simple-session' });
        } catch (error) {
          console.error('Erro no login:', error);
          set({ user: null, token: null });
          const message = error instanceof Error ? error.message : 'Erro desconhecido ao autenticar';
          throw new Error(message);
        }
      },
      
      logout: () => {
        supabase.auth.signOut().catch((e) => console.error('Erro no logout Supabase:', e));
        set({ user: null, token: null });
      },
      
      isAuthenticated: () => {
        return !!get().token;
      },
    }),
    {
      name: 'auth-storage', // Nome do item no localStorage
    }
  )
);
