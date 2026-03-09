import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Animated,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from 'socket.io-client';
import { useBookings } from '@/contexts/BookingContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';
import RouteMap from '@/components/RouteMap';

const CANCEL_REASONS = [
  'Changed mind',
  'Found another service',
  'Driver taking too long',
  'Other',
];

const STEPS = [
  { label: 'Confirmed', icon: 'checkmark-circle' },
  { label: 'Driver Assigned', icon: 'person' },
  { label: 'On the Way', icon: 'location' },
  { label: 'Delivered', icon: 'flag' },
];

const getVehicleIcon = (type: string) => {
  if (!type) return 'truck';
  switch (type.toLowerCase()) {
    case 'auto': return 'rickshaw';
    case 'tempo': return 'van-utility';
    case 'truck': return 'truck';
    default: return 'truck';
  }
};

function getStepIndex(status: string): number {
  switch (status) {
    case 'pending': return 0;
    case 'accepted': return 1;
    case 'in_progress': return 2;
    case 'completed': return 3;
    default: return -1;
  }
}

function AnimatedCard({ delay, children, className }: { delay: number; children: React.ReactNode; className?: string }) {
  // Bypassing Animated for native wind stability on state updates
  return (
    <View className={className}>
      {children}
    </View>
  );
}

function StepIndicator({ label, index, currentStep }: { label: string; index: number; currentStep: number }) {
  const isActive = index === currentStep;
  const isDone = index < currentStep;

  const getCircleStyle = () => {
    if (isDone) return { backgroundColor: Colors.success, borderColor: Colors.success };
    if (isActive) return { backgroundColor: Colors.primary, borderColor: Colors.primary };
    return { backgroundColor: 'white', borderColor: '#F3F4F6' };
  };

  const getLineStyle = () => {
    return { backgroundColor: isDone ? Colors.success : '#F3F4F6' };
  };

  const getTextStyle = () => {
    if (isActive) return { color: '#1A1D26', fontWeight: '700' as any };
    if (isDone) return { color: '#6B7280', opacity: 0.6, fontWeight: '700' as any };
    return { color: '#9CA3AF', fontWeight: '700' as any };
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: index === STEPS.length - 1 ? 0 : 24 }}>
      <View style={{ alignItems: 'center', marginRight: 16 }}>
        <View style={[
          { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
          getCircleStyle()
        ]}>
          {isDone ? (
            <Ionicons name="checkmark-done" size={18} color="#FFF" />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#FFF' : '#9CA3AF' }}>{index + 1}</Text>
          )}
        </View>
        {index < STEPS.length - 1 && (
          <View style={[{ width: 2, height: 28, marginVertical: 4 }, getLineStyle()]} />
        )}
      </View>
      <View style={{ flex: 1, paddingBottom: 4 }}>
        <Text style={[{ fontSize: 14 }, getTextStyle()]}>
          {label}
        </Text>
        {isActive && (
          <View style={{ backgroundColor: 'rgba(27, 110, 243, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 8, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1 }}>Live Radar</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function TrackRideScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const insets = useSafeAreaInsets();
  const { fetchBookings, cancelBooking, getBookingById } = useBookings();
  const { addNotification } = useNotifications();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const hasNavigated = useRef(false);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const booking = getBookingById(bookingId as string);
  const prevStatusRef = useRef<string | undefined>(undefined);
  const isMounted = useRef(true);

  // Fallback booking to prevent flashing empty state during re-fetches
  const lastValidBooking = useRef<any>(null);
  if (booking) {
    lastValidBooking.current = booking;
  }
  const displayBooking = booking || lastValidBooking.current;

  const [driverLocation, setDriverLocation] = useState<{ latitude: number, longitude: number } | null>(null);

  const [eta, setEta] = useState<{ distance: number, duration: number } | null>(null);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(() => { fetchBookings(); }, 5000);

    let socket: any;
    try {
      const apiUrl = getApiUrl();
      socket = io(apiUrl, { transports: ['websocket', 'polling'], path: '/socket.io' });

      socket.on('booking:updated', (data: any) => {
        if (data.booking?.id === bookingId) {
          fetchBookings();
        }
      });

      socket.on('driver:location:update', (data: { driverId: string; lat: number; lng: number }) => {
        if (displayBooking?.driverId === data.driverId) {
          setDriverLocation({
            latitude: data.lat,
            longitude: data.lng
          });
        }
      });
    } catch (e) { }

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [bookingId, displayBooking?.driverId]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Effect for Notifications
  useEffect(() => {
    if (!displayBooking || !isMounted.current) return;

    if (displayBooking.status !== prevStatusRef.current) {
      console.log(`[TRACK-NOTIF] Status changed: ${prevStatusRef.current} -> ${displayBooking.status}`);

      if (displayBooking.status === 'in_progress' && prevStatusRef.current === 'accepted') {
        addNotification('Trip Started', 'Your transportation partner is now on the move.', 'booking');
      } else if (displayBooking.status === 'accepted' && prevStatusRef.current === 'pending') {
        console.log('[TRACK-NOTIF] Acceptance confirmed, showing notification');
        addNotification('Driver Found', 'A transportation partner has accepted your request.', 'booking');
      } else if (displayBooking.status === 'completed' && prevStatusRef.current && prevStatusRef.current !== 'completed') {
        addNotification('Job Finalized', `The delivery job has been successfully closed.`, 'booking');
      }
    }
  }, [displayBooking?.status, displayBooking?.id]);

  // Effect for Navigation
  useEffect(() => {
    if (!displayBooking || !isMounted.current || !router) return;

    if (displayBooking.status === 'completed' && !hasNavigated.current) {
      console.log('[TRACK-NAV] Status is COMPLETED, initiating navigation guard');
      hasNavigated.current = true;

      const timeoutId = setTimeout(() => {
        if (isMounted.current && router) {
          console.log('[TRACK-NAV] Executing deferred navigation to rate-ride');
          try {
            // Use .replace with a check
            router.replace(`/customer/rate-ride?bookingId=${displayBooking.id}` as any);
          } catch (e) {
            console.error('[TRACK-NAV] Replace failed:', e);
          }
        }
      }, 1500); // Slightly longer delay to allow screen to settle
      return () => clearTimeout(timeoutId);
    }
  }, [displayBooking?.status, displayBooking?.id, router]);

  // Update ref at the very end of sync logic to avoid premature state comparison
  useEffect(() => {
    if (displayBooking?.status) {
      prevStatusRef.current = displayBooking.status;
    }
  }, [displayBooking?.status]);

  const handleCancel = useCallback(async (reason: string) => {
    if (!bookingId) return;
    setCancelling(true);
    await cancelBooking(bookingId as string, reason);
    setCancelling(false);
    setCancelModalVisible(false);
    router.replace('/customer/home' as any);
  }, [bookingId]);

  if (!displayBooking) {
    console.log('[TRACK] No booking to display, showing loading');
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="mt-4 text-gray-500 font-inter-medium">Initializing Trip Intel...</Text>
      </View>
    );
  }

  const currentStep = getStepIndex(displayBooking.status);
  const isCancelled = displayBooking.status === 'cancelled';

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        style={{ paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: topInset + 12 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 }}>
          <TouchableOpacity
            onPress={() => router.replace('/customer/home' as any)}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.surface, marginRight: 40 }}>Trip Radar</Text>
        </View>

        <View style={{ marginTop: 24, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Reference ID</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.surface }}>#{String(bookingId || '').slice(-6).toUpperCase()}</Text>
          </View>
          <View style={{ width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <MaterialCommunityIcons name="radar" size={24} color={Colors.accent} />
          </View>
        </View>

        <View style={{ marginTop: 20, paddingHorizontal: 24, height: 220 }}>
          <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <RouteMap
              pickup={displayBooking.pickup}
              delivery={displayBooking.delivery}
              driverLocation={driverLocation}
              showDriverToPickup={displayBooking.status === 'accepted'}
              onRoutingUpdate={(data) => setEta(data)}
            />

            {eta && (
              <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="map-marker-path" size={16} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1D26' }}>
                  {Math.round(eta.duration)} min away
                </Text>
                <View style={{ width: 1, height: 12, backgroundColor: '#E5E7EB', marginHorizontal: 8 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280' }}>
                  {eta.distance.toFixed(1)} km
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 -mt-4"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: bottomInset + 30 }}
        showsVerticalScrollIndicator={false}
      >
        {isCancelled ? (
          <AnimatedCard delay={0} className="bg-red-50 rounded-3xl p-8 items-center border border-red-100 shadow-xl shadow-red-500/5">
            <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center mb-5 shadow-sm">
              <Ionicons name="close-circle" size={40} color={Colors.danger} />
            </View>
            <Text className="text-xl font-inter-bold text-danger mb-1.5">Job Cancelled</Text>
            <Text className="text-[13px] font-inter-medium text-danger/60 text-center leading-5 px-4">This journey was aborted. Check your notification logs for details.</Text>
          </AnimatedCard>
        ) : (
          <>
            <AnimatedCard delay={0} className="bg-white rounded-2xl p-6 mb-4 shadow-2xl shadow-black/5 border border-gray-50">
              <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-6">Journey Status</Text>
              <View>
                {STEPS.map((step, index) => (
                  <StepIndicator key={step.label} label={step.label} index={index} currentStep={currentStep} />
                ))}
              </View>
            </AnimatedCard>

            {displayBooking.driverName && (
              <AnimatedCard delay={100} className="bg-white rounded-2xl p-6 mb-4 shadow-2xl shadow-black/5 border border-gray-50">
                <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-5">Partner Details</Text>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 rounded-xl bg-primary/5 items-center justify-center mr-3.5 border border-primary/10">
                      <FontAwesome5 name="user-tie" size={20} color={Colors.primary} />
                    </View>
                    <View>
                      <View className="flex-row items-center">
                        <Text className="text-base font-inter-bold text-text mr-2">{displayBooking.driverName}</Text>
                        <View className="bg-success/10 px-1.5 py-0.5 rounded-md">
                          <Text className="text-[7px] font-inter-black text-success uppercase">Verified</Text>
                        </View>
                      </View>
                      <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-widest mt-0.5">{displayBooking.driverVehicleNumber || 'Truck Alpha'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => displayBooking.driverPhone && Linking.openURL(`tel:${displayBooking.driverPhone}`)}
                    className="w-10 h-10 rounded-xl bg-success items-center justify-center shadow-lg shadow-success/20"
                  >
                    <Ionicons name="call" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </AnimatedCard>
            )}

            {displayBooking.status === 'accepted' && displayBooking.otp && (
              <AnimatedCard delay={200} className="bg-primary/5 rounded-3xl p-8 items-center border border-primary/10 mb-5">
                <Text className="text-[9px] font-inter-bold text-primary uppercase tracking-[3px] mb-5">Security Token</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  {(displayBooking.otp || '').toString().split('').map((digit: string, i: number) => (
                    <View key={i} style={{ width: 40, height: 56, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(27, 110, 243, 0.1)', marginHorizontal: 6 }}>
                      <Text style={{ fontSize: 24, fontWeight: '700', color: Colors.primary }}>{digit}</Text>
                    </View>
                  ))}
                </View>
                <Text className="text-[11px] font-inter-medium text-text-tertiary text-center mt-6 leading-5 px-6">
                  Please provide this 4-digit token to your transport partner to authorize the job.
                </Text>
              </AnimatedCard>
            )}

            <AnimatedCard delay={300} className="bg-white rounded-2xl p-6 mb-4 shadow-2xl shadow-black/5 border border-gray-50">
              <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-5">Transit Log</Text>
              <View className="flex-row items-start mb-5">
                <View className="w-9 h-9 rounded-lg bg-gray-50 items-center justify-center mr-3.5">
                  <MaterialCommunityIcons name="map-marker-distance" size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-widest mb-0.5">Total Distance</Text>
                  <Text className="text-xl font-inter-bold text-text">{displayBooking.distance} km trip</Text>
                </View>
              </View>

              <View className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex-row items-center">
                <View
                  className="w-9 h-9 rounded-lg items-center justify-center mr-3.5"
                  style={{ backgroundColor: displayBooking.paymentMethod === 'cash' ? '#FFF7ED' : '#EFF6FF' }}
                >
                  <Ionicons
                    name={displayBooking.paymentMethod === 'cash' ? 'cash' : 'card'}
                    size={18}
                    color={displayBooking.paymentMethod === 'cash' ? Colors.warning : Colors.primary}
                  />
                </View>
                <View>
                  <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-widest">Payment Strategy</Text>
                  <Text className="text-[13px] font-inter-bold text-text mt-0.5">{displayBooking.paymentMethod === 'cash' ? 'Physical Cash' : 'UPI Verified'}</Text>
                </View>
              </View>
            </AnimatedCard>

            {(displayBooking.status === 'pending' || displayBooking.status === 'accepted') && (
              <TouchableOpacity
                onPress={() => setCancelModalVisible(true)}
                className="mt-2 h-14 rounded-2xl bg-red-50 items-center justify-center border border-red-100"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  <Text className="ml-2.5 text-sm font-inter-bold text-danger">Cancel Journey</Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setCancelModalVisible(false)} />
          <View className="bg-white rounded-t-3xl p-6 shadow-2xl" style={{ paddingBottom: bottomInset + 10 }}>
            <Text className="text-xl font-inter-bold text-text mb-1.5">Abort Service?</Text>
            <Text className="text-[13px] font-inter-medium text-text-tertiary mb-6">Are you sure you want to end this transportation job?</Text>

            {CANCEL_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                className="flex-row items-center p-4 bg-gray-50 rounded-2xl mb-2.5 border border-gray-100"
                onPress={() => handleCancel(reason)}
                disabled={cancelling}
              >
                <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                <Text className="ml-3.5 text-sm font-inter-bold text-text">{reason}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              className="mt-4 h-14 rounded-2xl bg-gray-100 items-center justify-center"
              onPress={() => setCancelModalVisible(false)}
            >
              <Text className="text-sm font-inter-bold text-text-secondary">Keep Tracking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({});
