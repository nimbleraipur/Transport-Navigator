export type AppMode = 'customer' | 'driver';

export function getAppMode(): AppMode {
  const mode = process.env.EXPO_PUBLIC_APP_MODE;
  if (mode === 'driver') return 'driver';
  return 'customer';
}

export function getAppName(): string {
  return getAppMode() === 'driver' ? 'My Load 24 Driver' : 'My Load 24';
}

export function getAppSubtitle(): string {
  return getAppMode() === 'driver' ? 'Earn with every delivery' : 'Fast & reliable goods delivery';
}
