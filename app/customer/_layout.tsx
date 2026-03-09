import { Stack } from 'expo-router';
import React from 'react';

export default function CustomerLayout() {
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
