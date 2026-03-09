import { ExpoConfig, ConfigContext } from 'expo/config';

const APP_MODE = process.env.EXPO_PUBLIC_APP_MODE || 'customer';
const IS_DRIVER = APP_MODE === 'driver';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DRIVER ? 'My Load 24 Driver' : 'My Load 24',
  slug: IS_DRIVER ? 'my-load-24-driver' : 'my-load-24',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: IS_DRIVER ? 'myload24driver' : 'myload24',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0A1628',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: IS_DRIVER ? 'com.myload24.driver' : 'com.myload24',
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyD-VnFv88AltoKA26oOvMfIWouWL_-JQEc"
    }
  },
  android: {
    package: IS_DRIVER ? 'com.myload24.driver' : 'com.myload24',
    adaptiveIcon: {
      backgroundColor: '#0A1628',
      foregroundImage: './assets/images/icon.png',
    },
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyD-VnFv88AltoKA26oOvMfIWouWL_-JQEc"
      }
    }
  },
  web: {
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-router',
      {
        origin: 'https://api.myloadnimble.in',
      },
    ],
    'expo-font',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
  extra: {
    eas: {
      projectId: "55d64891-0c59-4b08-bd13-9b26f4269fac"
    }
  }
});
