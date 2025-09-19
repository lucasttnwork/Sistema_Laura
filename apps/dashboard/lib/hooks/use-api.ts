import { useState, useEffect, useCallback, useRef } from 'react';
import httpClient from '../http/client';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: number;
}

interface ApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  cacheTime?: number; // tempo em ms para manter cache
}

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useApi<T = any>(
  endpoint: string,
  options: ApiOptions = {}
) {
  // Detectar se está rodando no servidor (SSR)
  const isServer = typeof window === 'undefined';

  const cacheTime = options.cacheTime || 30000; // 30 segundos por padrão
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  
  // Estabilizar as funções de callback para evitar loops infinitos
  const onSuccessRef = useRef(options.onSuccess);
  const onErrorRef = useRef(options.onError);
  
  // Atualizar refs quando as funções mudarem
  useEffect(() => {
    onSuccessRef.current = options.onSuccess;
    onErrorRef.current = options.onError;
  });

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    lastFetch: 0,
  });

  const execute = useCallback(async (params?: any, forceRefresh = false) => {
    const isWriteOperation = params && typeof params === 'object' && params.method &&
                             ['POST', 'PUT', 'PATCH', 'DELETE'].includes(params.method.toUpperCase());

    // Para operações de escrita, não usar cache
    if (isWriteOperation || forceRefresh) {
      return await performRequest(params);
    }

    // Verificar cache para operações de leitura
    const cacheKey = `${endpoint}:${JSON.stringify(params || {})}`;
    const cached = cacheRef.current.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < cacheTime) {
      setState(prev => ({
        ...prev,
        data: cached.data,
        loading: false,
        error: null,
        lastFetch: cached.timestamp,
      }));

      if (onSuccessRef.current) {
        onSuccessRef.current(cached.data);
      }

      return cached.data;
    }

    return await performRequest(params, cacheKey);
  }, [endpoint, cacheTime]);

  const performRequest = useCallback(async (params?: any, cacheKey?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let url = endpoint;
      let config: any = {};

      if (params) {
        if (typeof params === 'object' && params.method) {
          // É uma requisição completa (POST, PUT, etc.)
          config = params;
        } else {
          // São parâmetros de query
          const queryParams = new URLSearchParams(params).toString();
          if (queryParams) {
            url += `?${queryParams}`;
          }
        }
      }

      const response = await httpClient(url, config);
      const data = response.data || response;
      const now = Date.now();

      // Cache apenas operações GET bem-sucedidas
      if (cacheKey && (!config.method || config.method.toUpperCase() === 'GET')) {
        cacheRef.current.set(cacheKey, { data, timestamp: now });
      }

      setState({
        data,
        loading: false,
        error: null,
        lastFetch: now,
      });

      if (onSuccessRef.current) {
        onSuccessRef.current(data);
      }

      return data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message ||
                          error?.message ||
                          'Erro desconhecido';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        lastFetch: Date.now(),
      }));

      if (onErrorRef.current) {
        onErrorRef.current(errorMessage);
      }

      throw error;
    }
  }, [endpoint, cacheTime]);

  // Usar um ref para controlar se já foi executado
  const hasExecutedRef = useRef(false);
  
  useEffect(() => {
    // Não executar requisições automáticas durante SSR
    if (isServer) return;

    if (options.immediate && !hasExecutedRef.current) {
      hasExecutedRef.current = true;
      execute();
    }
  }, [execute, options.immediate, isServer]);

  return {
    ...state,
    execute,
    refetch: () => execute(undefined, true), // Força refresh ignorando cache
  };
}

// Hooks específicos para cada entidade com cache otimizado
export function useSolicitacoes(params?: ApiOptions) {
  return useApi('/protected/solicitacoes', {
    immediate: true,
    cacheTime: 15000, // 15 segundos para dados dinâmicos
    ...params
  });
}

export function useCotacoes(params?: ApiOptions) {
  return useApi('/protected/cotacoes', {
    immediate: true,
    cacheTime: 10000, // 10 segundos para cotações
    ...params
  });
}

export function useAprovacoes(params?: ApiOptions) {
  return useApi('/protected/aprovacoes', {
    immediate: true,
    cacheTime: 20000, // 20 segundos para aprovações
    ...params
  });
}

export function useObras(params?: ApiOptions) {
  return useApi('/protected/obras', {
    immediate: true,
    cacheTime: 30000, // 30 segundos para obras (dados mais estáticos)
    ...params
  });
}

export function useFornecedores(params?: ApiOptions) {
  return useApi('/protected/fornecedores', {
    immediate: true,
    cacheTime: 30000, // 30 segundos para fornecedores (dados mais estáticos)
    ...params
  });
}

// Hook para operações CRUD com endpoint protegido
export function useCrud(endpoint: string) {
  const [loading, setLoading] = useState(false);

  // Garantir que o endpoint tenha o prefixo correto
  const protectedEndpoint = endpoint.startsWith('/protected/')
    ? endpoint
    : `/protected/${endpoint.replace(/^\//, '')}`;

  const create = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const response = await httpClient.post(protectedEndpoint, data);
      return response.data || response;
    } finally {
      setLoading(false);
    }
  }, [protectedEndpoint]);

  const update = useCallback(async (id: string, data: any) => {
    setLoading(true);
    try {
      const response = await httpClient.put(`${protectedEndpoint}/${id}`, data);
      return response.data || response;
    } finally {
      setLoading(false);
    }
  }, [protectedEndpoint]);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await httpClient.delete(`${protectedEndpoint}/${id}`);
      return response.data || response;
    } finally {
      setLoading(false);
    }
  }, [protectedEndpoint]);

  return {
    loading,
    create,
    update,
    remove,
  };
}
