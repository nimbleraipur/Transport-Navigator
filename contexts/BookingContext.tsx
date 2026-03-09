import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { getApiUrl } from '@/lib/query-client';
import { useAuth } from '@/contexts/AuthContext';

export interface BookingData {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicleNumber?: string;
  pickup: { name: string; area: string; lat: number; lng: number };
  delivery: { name: string; area: string; lat: number; lng: number };
  vehicleType: string;
  distance: number;
  basePrice: number;
  distanceCharge: number;
  totalPrice: number;
  estimatedTime: number;
  paymentMethod: 'cash' | 'upi';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  otp: string;
  rating?: number;
  ratingComment?: string;
  cancelReason?: string;
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

interface BookingContextValue {
  bookings: BookingData[];
  loading: boolean;
  fetchBookings: () => Promise<void>;
  fetchPendingBookings: () => Promise<BookingData[]>;
  createBooking: (data: { pickup: any; delivery: any; vehicleType: string; totalPrice: number; distance: number; paymentMethod?: string }) => Promise<{ success: boolean; booking?: BookingData; error?: string }>;
  acceptBooking: (bookingId: string) => Promise<{ success: boolean; error?: string }>;
  startTrip: (bookingId: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  completeTrip: (bookingId: string) => Promise<{ success: boolean; error?: string }>;
  cancelBooking: (bookingId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  rateBooking: (bookingId: string, rating: number, comment?: string) => Promise<{ success: boolean; error?: string }>;
  getBookingById: (id: string) => BookingData | undefined;
  getActiveBooking: () => BookingData | undefined;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(false);

  const apiCall = useCallback(async (path: string, method: string = 'GET', body?: any) => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL(path, baseUrl);
      const headers: any = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      if (body) headers['Content-Type'] = 'application/json';
      const res = await fetch(url.toString(), {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      return await res.json();
    } catch (e: any) {
      return { error: e.message || 'Network error' };
    }
  }, [token]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    console.log('[BOOKING] Fetching bookings...');
    const data = await apiCall('/api/bookings');
    if (data.bookings) {
      console.log(`[BOOKING] Received ${data.bookings.length} bookings`);
      setBookings(data.bookings);
    } else if (data.error) {
      console.error('[BOOKING] Fetch error:', data.error);
    }
    setLoading(false);
  }, [apiCall]);

  const fetchPendingBookings = useCallback(async () => {
    const data = await apiCall('/api/bookings/pending');
    return data.bookings || [];
  }, [apiCall]);

  const createBooking = useCallback(async (params: { pickup: any; delivery: any; vehicleType: string; totalPrice: number; distance: number; paymentMethod?: string }) => {
    const data = await apiCall('/api/bookings', 'POST', params);
    if (data.booking) {
      setBookings(prev => [data.booking, ...prev]);
      return { success: true, booking: data.booking };
    }
    return { success: false, error: data.error };
  }, [apiCall]);

  const acceptBooking = useCallback(async (bookingId: string) => {
    const data = await apiCall(`/api/bookings/${bookingId}/accept`, 'PUT');
    if (data.booking) {
      setBookings(prev => prev.map(b => b.id === bookingId ? data.booking : b));
      return { success: true };
    }
    return { success: false, error: data.error };
  }, [apiCall]);

  const startTrip = useCallback(async (bookingId: string, otp: string) => {
    const data = await apiCall(`/api/bookings/${bookingId}/start`, 'PUT', { otp });
    if (data.booking) {
      setBookings(prev => prev.map(b => b.id === bookingId ? data.booking : b));
      return { success: true };
    }
    return { success: false, error: data.error };
  }, [apiCall]);

  const completeTrip = useCallback(async (bookingId: string) => {
    const data = await apiCall(`/api/bookings/${bookingId}/complete`, 'PUT');
    if (data.booking) {
      setBookings(prev => prev.map(b => b.id === bookingId ? data.booking : b));
      return { success: true };
    }
    return { success: false, error: data.error };
  }, [apiCall]);

  const cancelBooking = useCallback(async (bookingId: string, reason?: string) => {
    const data = await apiCall(`/api/bookings/${bookingId}/cancel`, 'PUT', { reason });
    if (data.booking) {
      setBookings(prev => prev.map(b => b.id === bookingId ? data.booking : b));
      return { success: true };
    }
    return { success: false, error: data.error };
  }, [apiCall]);

  const rateBooking = useCallback(async (bookingId: string, rating: number, comment?: string) => {
    const data = await apiCall(`/api/bookings/${bookingId}/rate`, 'PUT', { rating, comment });
    if (data.booking) {
      setBookings(prev => prev.map(b => b.id === bookingId ? data.booking : b));
      return { success: true };
    }
    return { success: false, error: data.error };
  }, [apiCall]);

  const getBookingById = useCallback((id: string) => bookings.find(b => b.id === id), [bookings]);

  const getActiveBooking = useCallback(() =>
    bookings.find(b => ['pending', 'accepted', 'in_progress'].includes(b.status)),
    [bookings]);

  const value = useMemo(() => ({
    bookings, loading, fetchBookings, fetchPendingBookings, createBooking,
    acceptBooking, startTrip, completeTrip, cancelBooking, rateBooking,
    getBookingById, getActiveBooking,
  }), [bookings, loading, fetchBookings, fetchPendingBookings, createBooking, acceptBooking, startTrip, completeTrip, cancelBooking, rateBooking, getBookingById, getActiveBooking]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBookings must be used within BookingProvider');
  return ctx;
}
