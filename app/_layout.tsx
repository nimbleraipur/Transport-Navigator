import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/contexts/AuthContext';
import { BookingProvider } from '@/contexts/BookingContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Image } from 'expo-image';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    // 2 second timer for logo
    const logoTimer = setTimeout(() => {
      setShowGif(true);
    }, 2000);

    // 5 second timer for total splash sequence
    const finishTimer = setTimeout(() => {
      setSplashFinished(true);
    }, 5000);

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
    return () => {
      clearTimeout(logoTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  useEffect(() => {
    if (ready && showGif) {
      // Hide native splash ONLY when fonts are ready AND it's time to show the GIF
      const hideTimer = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 50);
      return () => clearTimeout(hideTimer);
    }
  }, [ready, showGif]);

  if (!ready || !splashFinished) {
    return (
      <View style={styles.splashContainer}>
        {!showGif ? (
          <View style={{ position: 'absolute', top: '42%', alignItems: 'center' }}>
            <Image
              source={require('../assets/images/logo.png')}
              style={{ width: 220, height: 220 }}
              contentFit="contain"
              priority="high"
            />
          </View>
        ) : (
          <Image
            source={require('../assets/images/splash.gif')}
            style={styles.splashImage}
            contentFit="cover"
            priority="high"
          />
        )}
      </View>
    );
  }

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

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
