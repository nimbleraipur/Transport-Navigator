import { Stack, Redirect } from 'expo-router';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="new-booking" />
      <Stack.Screen name="track-ride" />
      <Stack.Screen name="history" />
      <Stack.Screen name="rate-ride" />
      <Stack.Screen name="menu" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="safety" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="help" />
      <Stack.Screen name="support" />
    </Stack>
  );
}
