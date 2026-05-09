import { ExpoConfig, ConfigContext } from 'expo/config';

const APP_MODE = process.env.EXPO_PUBLIC_APP_MODE || 'customer';
const IS_DRIVER = APP_MODE === 'driver';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DRIVER ? 'My Load Driver' : 'My Load 24',
  slug: 'md-raza-chouhan', // Must match the project ID on Expo dashboard
  version: '1.0.0',
  orientation: 'portrait',
  icon: IS_DRIVER ? './assets/images/Myload_Driver.png' : './assets/images/icon.png',
  scheme: IS_DRIVER ? 'myload24driver' : 'myload24',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/logo.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: IS_DRIVER ? 'com.nimble.myload24.driver' : 'com.nimble.myload24',
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyD-VnFv88AltoKA26oOvMfIWouWL_-JQEc"
    }
  },
  android: {
    package: IS_DRIVER ? 'com.nimble.myload24.driver' : 'com.nimble.myload24',
    versionCode: 2,
    softwareKeyboardLayoutMode: 'pan',
    adaptiveIcon: {
      backgroundColor: '#0A1628',
      foregroundImage: IS_DRIVER ? './assets/images/Myload_Driver.png' : './assets/images/icon.png',
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
      projectId: "b59bcbe1-1876-4a8a-a87e-6684317f62b4"
    }
  }
});
