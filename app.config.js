const APP_MODE = process.env.EXPO_PUBLIC_APP_MODE || 'customer';
const IS_DRIVER = APP_MODE === 'driver';

module.exports = ({ config }) => ({
  ...config,
  owner: "nimbleraipur",
  name: IS_DRIVER ? 'My Load Driver' : 'My Load 24',
  slug: 'md-raza-chouhan', // Must match the project ID on Expo dashboard
  version: '1.0.8',
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
    },
    infoPlist: {}
  },
  android: {
    package: IS_DRIVER ? 'com.nimble.myload24.driver' : 'com.nimble.myload24',
    googleServicesFile: IS_DRIVER ? './google-services-driver.json' : './google-services-customer.json',
    versionCode: 15,
    permissions: [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "RECORD_AUDIO",
      "com.google.android.gms.permission.AD_ID",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "POST_NOTIFICATIONS",
      "USE_FULL_SCREEN_INTENT",
      "SYSTEM_ALERT_WINDOW",
      "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"
    ],
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
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow $(PRODUCT_NAME) to access your photos to upload documents.',
        cameraPermission: 'Allow $(PRODUCT_NAME) to use the camera to capture documents.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#1B6EF3',
        sounds: [
          './assets/sounds/new_booking.mp3'
        ]
      }
    ]
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
