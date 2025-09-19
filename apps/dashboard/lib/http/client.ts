import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../stores/auth-store';

// Configuração da API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

// Variável para controlar se estamos fazendo refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

// Processar fila de requisições que falharam durante refresh
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });

  failedQueue = [];
};

// Criar instância do Axios
const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para cookies HTTP-only
});

// Interceptor de requisição - adicionar access token
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta - tratar refresh automático
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Se já estamos fazendo refresh, adicionar à fila
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return httpClient(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Tentar fazer refresh do token
        const { refreshToken: refresh } = useAuthStore.getState();

        if (!refresh) {
          throw new Error('No refresh token available');
        }

        const refreshSuccess = await useAuthStore.getState().refreshToken();

        if (refreshSuccess) {
          // Pegar novo access token
          const { accessToken } = useAuthStore.getState();

          // Processar fila de requisições pendentes
          processQueue(null, accessToken);

          // Retry da requisição original
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return httpClient(originalRequest);
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        // Refresh falhou - limpar autenticação
        useAuthStore.getState().clearAuth();
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default httpClient;

// Funções utilitárias para API
export const api = {
  get: <T = any>(url: string, config?: any) =>
    httpClient.get<T>(url, config).then(res => res.data),

  post: <T = any>(url: string, data?: any, config?: any) =>
    httpClient.post<T>(url, data, config).then(res => res.data),

  put: <T = any>(url: string, data?: any, config?: any) =>
    httpClient.put<T>(url, data, config).then(res => res.data),

  patch: <T = any>(url: string, data?: any, config?: any) =>
    httpClient.patch<T>(url, data, config).then(res => res.data),

  delete: <T = any>(url: string, config?: any) =>
    httpClient.delete<T>(url, config).then(res => res.data),
};
