import { Stack, Redirect } from 'expo-router';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function DriverLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="active-ride" />
      <Stack.Screen name="menu" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="history" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="safety" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="help" />
      <Stack.Screen name="support" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="pending-approval" />
      <Stack.Screen name="wallet" />
    </Stack>
  );
}
