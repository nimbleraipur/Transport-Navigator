import { Platform } from 'react-native';

const LOCAL_IP = '192.168.29.102'; // Change this to your machine's IP if testing on device
const PORT = 5000;

export const API_BASE_URL = Platform.select({
    web: `http://localhost:${PORT}`,
    android: `http://10.0.2.2:${PORT}`, // Android Emulator
    ios: `http://localhost:${PORT}`, // iOS Simulator
    default: `http://${LOCAL_IP}:${PORT}`,
});

export const ADMIN_WEB_URL = Platform.select({
    web: `http://localhost:5173`, // Dev server
    default: `http://${LOCAL_IP}:5000/admin`, // Backend served
});
