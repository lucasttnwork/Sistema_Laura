import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationHook {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// Hook para gerenciar notificações
export function useNotifications(): NotificationHook {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Carregar notificações do localStorage na inicialização
  useEffect(() => {
    // Não executar durante SSR
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('workflow-notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Converter timestamps de string para Date
        const notificationsWithDates = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(notificationsWithDates);
      } catch (error) {
        console.error('Erro ao carregar notificações:', error);
      }
    }
  }, []);

  // Salvar notificações no localStorage sempre que mudar
  useEffect(() => {
    // Não executar durante SSR
    if (typeof window === 'undefined') return;

    localStorage.setItem('workflow-notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-remover notificações antigas (manter apenas as últimas 50)
    setNotifications(prev => prev.slice(0, 50));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };
}

// Funções utilitárias para criar notificações específicas
export const createWorkflowNotification = {
  statusTransition: (
    entityType: 'solicitacao' | 'cotacao',
    entityName: string,
    oldStatus: string,
    newStatus: string
  ): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'info',
    title: `${entityType === 'solicitacao' ? 'Solicitação' : 'Cotação'} Atualizada`,
    message: `${entityName} mudou de ${oldStatus} para ${newStatus}`,
    actionUrl: entityType === 'solicitacao' ? '/solicitacoes' : '/cotacoes',
    actionLabel: 'Ver Detalhes'
  }),

  approvalNeeded: (
    solicitacaoName: string,
    cotacaoCount: number
  ): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'warning',
    title: 'Aprovação Necessária',
    message: `${solicitacaoName} tem ${cotacaoCount} cotação(ões) aguardando aprovação`,
    actionUrl: '/solicitacoes',
    actionLabel: 'Revisar'
  }),

  cotacaoReceived: (
    solicitacaoName: string,
    fornecedorName: string
  ): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'success',
    title: 'Cotação Recebida',
    message: `Nova cotação de ${fornecedorName} para ${solicitacaoName}`,
    actionUrl: '/cotacoes',
    actionLabel: 'Ver Cotação'
  }),

  deadlineWarning: (
    entityName: string,
    daysLeft: number
  ): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'warning',
    title: 'Prazo se Aproximando',
    message: `${entityName} vence em ${daysLeft} dia(s)`,
    actionUrl: '/solicitacoes',
    actionLabel: 'Ver Detalhes'
  }),

  error: (
    title: string,
    message: string
  ): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'error',
    title,
    message
  }),

  success: (
    title: string,
    message: string
  ): Omit<Notification, 'id' | 'timestamp' | 'read'> => ({
    type: 'success',
    title,
    message
  })
};
