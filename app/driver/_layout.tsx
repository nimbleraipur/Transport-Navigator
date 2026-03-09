import { Stack } from 'expo-router';
import React from 'react';

export default function DriverLayout() {
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
    </Stack>
  );
}
