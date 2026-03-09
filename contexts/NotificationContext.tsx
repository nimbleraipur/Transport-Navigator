import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'system' | 'promo' | 'safety';
  read: boolean;
  createdAt: string;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (title: string, message: string, type: NotificationItem['type']) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = 'tg_notifications';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  async function loadNotifications() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else if (user) {
        const defaults: NotificationItem[] = [
          {
            id: Date.now().toString() + '1',
            title: 'Welcome to My Load 24',
            message: 'Your account is ready. Book your first ride now!',
            type: 'system',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ];
        setNotifications(defaults);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      }
    } catch (e) {}
  }

  async function persist(items: NotificationItem[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
  }

  const addNotification = useCallback((title: string, message: string, type: NotificationItem['type']) => {
    setNotifications(prev => {
      const item: NotificationItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        title,
        message,
        type,
        read: false,
        createdAt: new Date().toISOString(),
      };
      const updated = [item, ...prev].slice(0, 50);
      persist(updated);
      return updated;
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      persist(updated);
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persist(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    persist([]);
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  }), [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
