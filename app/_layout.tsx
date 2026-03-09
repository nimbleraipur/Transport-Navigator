import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/contexts/AuthContext';
import { BookingProvider } from '@/contexts/BookingContext';
import { NotificationProvider } from '@/contexts/NotificationContext';



SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      const fontPromise = Font.loadAsync({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
      });
      fontPromise.catch(() => { });
      try {
        await Promise.race([
          fontPromise,
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      } catch (e) {
      }
      setReady(true);
    }
    loadFonts();

    if (Platform.OS === 'web') {
      const errorHandler = (event: ErrorEvent) => {
        if (event.message?.includes('timeout exceeded')) {
          event.preventDefault();
        }
      };
      const rejectionHandler = (event: PromiseRejectionEvent) => {
        if (event.reason?.message?.includes('timeout exceeded')) {
          event.preventDefault();
        }
      };
      window.addEventListener('error', errorHandler);
      window.addEventListener('unhandledrejection', rejectionHandler);
      return () => {
        window.removeEventListener('error', errorHandler);
        window.removeEventListener('unhandledrejection', rejectionHandler);
      };
    }
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AuthProvider>
              <BookingProvider>
                <NotificationProvider>
                  <RootLayoutNav />
                </NotificationProvider>
              </BookingProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
