import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '@/lib/query-client';

export interface UserData {
  id: string;
  name: string;
  phone: string;
  role: 'customer' | 'driver' | 'admin';
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  isOnline?: boolean;
  isApproved?: boolean;
  rating?: number;
  totalTrips?: number;
  totalEarnings?: number;
  location?: { lat: number; lng: number };
  createdAt?: string;
}

interface AuthContextValue {
  user: UserData | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  sendOtp: (phone: string) => Promise<{ success: boolean; otp?: string; error?: string }>;
  verifyOtp: (phone: string, otp: string, role: string) => Promise<{ success: boolean; isNew?: boolean; error?: string }>;
  register: (data: { phone: string; name: string; role: string; vehicleType?: string; vehicleNumber?: string; licenseNumber?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserData>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    try {
      const savedToken = await AsyncStorage.getItem('auth_token');
      const savedUser = await AsyncStorage.getItem('auth_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setLoading(false);
    }
  }

  async function apiCall(path: string, body: any) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const baseUrl = getApiUrl();
      const url = new URL(path, baseUrl);
      console.log(`[API] ${path} -> ${url.toString()}`);
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      console.log(`[API] ${path} response:`, JSON.stringify(data).substring(0, 200));
      return data;
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.error(`[API] ${path} error:`, e.name === 'AbortError' ? 'Timeout' : e.message);
      return { success: false, error: e.name === 'AbortError' ? 'Connection timeout. Is the server running?' : 'Connection failed. Please check your internet and try again.' };
    }
  }

  async function sendOtp(phone: string) {
    const result = await apiCall('/api/auth/send-otp', { phone });
    if (result.success) return { success: true, otp: result.otp };
    return { success: false, error: result.error };
  }

  async function verifyOtp(phone: string, otp: string, role: string) {
    const result = await apiCall('/api/auth/verify-otp', { phone, otp, role });
    if (result.success) {
      await AsyncStorage.setItem('auth_token', result.token);
      await AsyncStorage.setItem('auth_user', JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      return { success: true, isNew: result.isNew };
    }
    return { success: false, error: result.error };
  }

  async function register(data: { phone: string; name: string; role: string; vehicleType?: string; vehicleNumber?: string; licenseNumber?: string }) {
    const result = await apiCall('/api/auth/register', data);
    if (result.success) {
      await AsyncStorage.setItem('auth_token', result.token);
      await AsyncStorage.setItem('auth_user', JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  }

  async function logout() {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  }

  function updateUser(updates: Partial<UserData>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    AsyncStorage.setItem('auth_user', JSON.stringify(updated));
  }

  async function refreshUser() {
    if (!token) return;
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/users/me', baseUrl);
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
      }
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  }

  const value = useMemo(() => ({
    user, token, loading, isAuthenticated: !!user && !!token,
    sendOtp, verifyOtp, register, logout, updateUser, refreshUser,
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
