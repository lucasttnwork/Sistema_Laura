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
          const isEmail = whatsapp.includes('@');
          const isDigits = /^[0-9]+$/.test(whatsapp);

          // Função auxiliar para mapear sessão/usuário
          const applySession = (session: any, authUser: any) => {
            if (!session || !authUser) {
              throw new Error('Sessão inválida após login');
            }
            const mappedUser: User = {
              id: authUser.id,
              nome: (authUser.user_metadata as any)?.nome,
              cargo: (authUser.user_metadata as any)?.cargo,
              whatsapp: authUser.phone ?? whatsapp,
              email: authUser.email ?? undefined,
              permissions: (authUser.user_metadata as any)?.permissions,
            };
            set({ user: mappedUser, token: session.access_token });
          };

          if (isEmail) {
            const { data, error } = await supabase.auth.signInWithPassword({ email: whatsapp, password: senha_login });
            if (error) throw new Error(error.message || 'Falha no login (email)');
            applySession(data.session, data.user);
            return;
          }

          // Se for apenas dígitos, tratamos como username => email pseudo "<login>@login.local"
          if (isDigits) {
            const pseudoEmail = `${whatsapp}@login.local`;
            const { data, error } = await supabase.auth.signInWithPassword({ email: pseudoEmail, password: senha_login });
            if (error) throw new Error(error.message || 'Falha no login (username)');
            applySession(data.session, data.user);
            return;
          }

          // Caso contrário, como fallback final tenta email com o valor bruto
          const { data, error } = await supabase.auth.signInWithPassword({ email: whatsapp, password: senha_login });
          if (error) throw new Error(error.message || 'Falha no login (fallback geral)');
          applySession(data.session, data.user);
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
