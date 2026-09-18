import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/query-client';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  // Configure how notifications are handled when the app is foregrounded
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (error) {
  console.warn('Expo Notifications module failed to load:', error);
}

let TaskManager: any = null;
try {
  TaskManager = require('expo-task-manager');
} catch (error) {
  console.warn('Expo Task Manager module failed to load:', error);
}

let notifee: any = null;
try {
  notifee = require('@notifee/react-native').default;
} catch (error) {
  console.warn('Notifee module failed to load:', error);
}

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

if (TaskManager && Notifications) {
  try {
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }: any) => {
      if (error) {
        console.error('[BACKGROUND-TASK] Error in background task:', error);
        return;
      }
      if (data) {
        const { notification } = data;
        console.log('[BACKGROUND-TASK] Received notification in background:', notification);
        const payload = notification?.request?.content?.data;
        if (payload?.type === 'new_booking' && payload?.bookingId) {
          console.log('[BACKGROUND-TASK] Intercepted new_booking background push. Launching full screen intent.');
          
          try {
            if (notifee) {
              const soundName = (payload.sound || 'new_booking').replace(/\.mp3$/, '');
              const titleText = payload.title || notification?.request?.content?.title || 'New Ride Request! 🚚';
              const bodyText = payload.body || notification?.request?.content?.body || 'A customer is looking for a ride nearby.';

              const channelId = await notifee.createChannel({
                id: payload.channelId || 'new-booking-channel',
                name: 'New Booking Requests',
                importance: 4, // AndroidImportance.HIGH
                sound: soundName,
              });

              await notifee.displayNotification({
                title: titleText,
                body: bodyText,
                data: payload,
                android: {
                  channelId,
                  importance: 4, // AndroidImportance.HIGH
                  sound: soundName,
                  pressAction: {
                    id: 'default',
                    launchActivity: 'default',
                  },
                  fullScreenAction: {
                    id: 'default',
                    launchActivity: 'default',
                  },
                },
              });
            }
          } catch (err) {
            console.error('[BACKGROUND-TASK] Failed to display full screen intent:', err);
          }
        }
      }
    });
  } catch (err) {
    console.error('Failed to define BACKGROUND-NOTIFICATION-TASK:', err);
  }
}

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
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Run on mount AND whenever user/token changes — ensures push token is always registered
  useEffect(() => {
    if (token && user?.id) {
      registerForPushNotificationsAsync();
    }
    loadNotifications();
  }, [user?.id, token]);

  // Listen for incoming push notifications to dynamically populate the in-app notification inbox
  useEffect(() => {
    if (Platform.OS === 'web' || !Notifications) return;

    const subscription = Notifications.addNotificationReceivedListener((notification: any) => {
      const { title, body, data } = notification.request.content;
      console.log('[PUSH-RECEIVED] Incoming notification:', title, body, data);
      
      setNotifications(prev => {
        const id = notification.request.identifier || (Date.now().toString() + Math.random().toString(36).substr(2, 5));
        if (prev.some(n => n.id === id)) return prev; // Avoid duplicates

        const item: NotificationItem = {
          id,
          title: title || 'Notification',
          message: body || '',
          type: data?.type || 'system',
          read: false,
          createdAt: new Date().toISOString(),
        };
        const updated = [item, ...prev].slice(0, 50);
        persist(updated);
        return updated;
      });
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const { title, body, data } = response.notification.request.content;
      console.log('[PUSH-CLICKED] User clicked notification:', title, data);
      
      try {
        if (data?.type === 'new_booking' || data?.bookingId) {
          if (user?.role === 'driver') {
            router.push('/driver/requests');
          } else if (data?.bookingId) {
            router.push(`/customer/track-ride?bookingId=${data.bookingId}`);
          }
        }
      } catch (err) {
        console.error('Error navigating on notification tap:', err);
      }
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'web' || !Notifications) return;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || "b59bcbe1-1876-4a8a-a87e-6684317f62b4";
      let pushToken = '';
      let expoPushToken = '';
      let nativeDeviceToken = '';

      try {
        const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
        expoPushToken = tokenResult?.data || '';
        console.log('[PUSH-TOKEN] Acquired Expo Push Token:', expoPushToken);
      } catch (expoErr) {
        console.warn('[PUSH-TOKEN] ExpoPushToken error:', expoErr);
      }

      try {
        const deviceResult = await Notifications.getDevicePushTokenAsync();
        nativeDeviceToken = typeof deviceResult?.data === 'string' ? deviceResult.data : '';
        console.log('[PUSH-TOKEN] Acquired Native Device Token (FCM):', nativeDeviceToken);
      } catch (deviceErr) {
        console.warn('[PUSH-TOKEN] Native getDevicePushTokenAsync error:', deviceErr);
      }

      pushToken = nativeDeviceToken || expoPushToken;
      const combinedTokens = Array.from(new Set([expoPushToken, nativeDeviceToken].filter(Boolean)));

      if (!pushToken && combinedTokens.length === 0) {
        console.warn('[PUSH-TOKEN] Could not get push token — notifications will not work.');
        return;
      }

      // Save locally
      await AsyncStorage.setItem('expo_push_token', pushToken);

      // Register background notification task
      if (TaskManager) {
        try {
          const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
          if (!isRegistered) {
            await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
            console.log('[BACKGROUND-TASK] Registered background task successfully');
          }
        } catch (e) {
          console.warn('[BACKGROUND-TASK] Failed to register background task:', e);
        }
      }

      // Initialize Notifee permissions
      if (notifee) {
        try {
          await notifee.requestPermission();
        } catch (e) {
          console.warn('[NOTIFEE] Failed to request permission:', e);
        }
      }

      // Always sync tokens to backend on every app open
      if (token && combinedTokens.length > 0) {
        const baseUrl = getApiUrl();
        try {
          const res = await fetch(new URL('/api/users/profile', baseUrl).toString(), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              pushToken: pushToken || combinedTokens[0],
              pushTokens: combinedTokens
            })
          });
          if (res.ok) {
            console.log('[PUSH-TOKEN] ✅ Push tokens (FCM & Expo) synced to backend for user:', user?.id);
          } else {
            console.error('[PUSH-TOKEN] ❌ Failed to sync push token to backend. Status:', res.status);
          }
        } catch (syncErr: any) {
          console.error('[PUSH-TOKEN] ❌ Network error while syncing push token:', syncErr.message);
        }
      } else if (!token) {
        console.warn('[PUSH-TOKEN] No auth token available — cannot sync push token to backend.');
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('new-booking-channel', {
          name: 'New Booking Requests',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF231F7C',
          sound: 'default', // Fallback to system default sound for reliable background alerting
        });
      }
    } catch (e) {
      console.warn('Notification permission or token registration error', e);
    }
  }

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
    } catch (e) { }
  }

  async function persist(items: NotificationItem[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) { }
  }

  const addNotification = useCallback(async (title: string, message: string, type: NotificationItem['type']) => {
    // Show local system notification
    if (Platform.OS !== 'web' && Notifications) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: title,
            body: message,
            data: { type },
          },
          trigger: null, // show immediately
        });
      } catch (e) {}
    }

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
