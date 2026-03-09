import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
  Linking,
  Animated,
  Modal,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/contexts/BookingContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';

import RouteMap from '@/components/RouteMap';
import * as Location from 'expo-location';

const STEPS = ['Accepted', 'OTP Verification', 'In Transit', 'Completed'];

const CANCEL_REASONS = [
  'Customer not at location',
  'Vehicle issue',
  'Personal emergency',
  'Other',
];

function AnimatedCard({ children, index, className }: { children: React.ReactNode; index: number; className?: string }) {
  // Bypassing Animated for native wind stability on state updates
  return (
    <View className={className}>
      {children}
    </View>
  );
}

function AnimatedStepIndicator({ step, index, currentStep }: { step: string; index: number; currentStep: number }) {
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
          {step}
        </Text>
        {isActive && (
          <View style={{ backgroundColor: 'rgba(27, 110, 243, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 8, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1 }}>Active Progress</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function PulsingCallButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="call" size={20} color="#FFF" />
    </TouchableOpacity>
  );
}

function PulsingNavigateButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="navigate" size={20} color="#FFF" />
    </TouchableOpacity>
  );
}

export default function DriverActiveRideScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuth();
  const { fetchBookings, getBookingById, startTrip, completeTrip, cancelBooking } = useBookings();
  const { addNotification } = useNotifications();
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [driverLoc, setDriverLoc] = useState<{ latitude: number, longitude: number } | null>(null);
  const [eta, setEta] = useState<{ distance: number, duration: number } | null>(null);
  const hasNavigatedAfterCompletion = useRef(false);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const booking = getBookingById(bookingId || '');

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(() => { fetchBookings(); }, 5000);

    let socket: any;
    try {
      const apiUrl = getApiUrl();
      socket = io(apiUrl, { transports: ['websocket', 'polling'], path: '/socket.io' });
    } catch (e) {
      console.error('[ACTIVE-RIDE] Socket connection error:', e);
    }

    let locationSubscription: any;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 }, // Increased accuracy & frequency
        (loc) => {
          const newLocation = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          };
          setDriverLoc(newLocation);

          if (socket && booking?.driverId) {
            socket.emit('driver:location', {
              driverId: booking.driverId,
              lat: newLocation.latitude,
              lng: newLocation.longitude
            });
          }
        }
      );
    })();

    return () => {
      clearInterval(interval);
      if (locationSubscription) locationSubscription.remove();
      if (socket) socket.disconnect();
    };
  }, [booking?.driverId]);

  const getCurrentStep = () => {
    if (!booking) return 0;
    switch (booking.status) {
      case 'accepted': return 1;
      case 'in_progress': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  const currentStep = getCurrentStep();

  const handleVerifyOtp = async () => {
    Keyboard.dismiss(); // Prevent unmounting a focused input from crashing the app

    if (otp.length !== 4) {
      Alert.alert('Incomplete OTP', 'Please enter the 4-digit verification code.');
      return;
    }
    setVerifying(true);
    try {
      const result = await startTrip(bookingId!, otp);
      if (!result.success) {
        Alert.alert('Verification Failed', result.error || 'The OTP entered is incorrect.');
        setOtp('');
      } else {
        console.log('[ACTIVE-RIDE] OTP Verified successfully. Status is now in_progress.');
      }
    } catch (e: any) {
      console.error('[ACTIVE-RIDE] Verification Error:', e);
      Alert.alert('Error', 'Communication error. Please try again.');
    } finally {
      // Only set verifying false if we didn't unmount (but react handles the warning, so it's okay)
      setVerifying(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (completing || !bookingId || hasNavigatedAfterCompletion.current) return; // Add check here
    setCompleting(true);
    try {
      const result = await completeTrip(bookingId);
      if (result.success) {
        console.log('[ACTIVE-RIDE] Trip completed successfully. Navigating to dashboard...');
        hasNavigatedAfterCompletion.current = true; // Set ref to true
        setTimeout(() => {
          console.log('[ACTIVE-RIDE] Executing router.replace to dashboard.');
          router.replace('/driver/dashboard' as any);
        }, 600);
      } else {
        Alert.alert('Unable to Complete', result.error || 'Server rejected the request.');
      }
    } catch (e: any) {
      console.error('Complete Trip Error:', e);
      Alert.alert('Network Error', 'Failed to communicate with the server.');
    } finally {
      setTimeout(() => setCompleting(false), 1000);
    }
  };

  const handleCallCustomer = () => {
    if (booking?.customerPhone) Linking.openURL(`tel:${booking.customerPhone}`);
  };

  const handleOpenNavigation = () => {
    if (!booking) return;
    const dest = booking.status === 'accepted' ? booking.pickup : booking.delivery;
    const lat = dest.lat;
    const lng = dest.lng;
    const label = dest.name;

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      web: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    }) || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    Linking.openURL(url);
  };

  const handleCancelRide = async (reason: string) => {
    setCancelling(true);
    try {
      const result = await cancelBooking(bookingId!, reason);
      if (result.success) {
        setCancelModalVisible(false);
        // Short delay to let state updates settle
        setTimeout(() => {
          router.replace('/driver/dashboard' as any);
        }, 300); // Added 300ms delay as per instruction
      } else {
        Alert.alert('Error', result.error || 'Failed to cancel');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to cancel ride');
    } finally {
      setCancelling(false);
    }
  };

  if (!booking) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        style={{ paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingTop: topInset + 12 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 }}>
          <TouchableOpacity
            onPress={() => router.replace('/driver/dashboard' as any)}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.surface, marginRight: 40 }}>Job Terminal</Text>
        </View>

        <View style={{ marginTop: 24, paddingHorizontal: 24, height: 240 }}>
          <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <RouteMap
              pickup={booking.pickup}
              delivery={booking.delivery}
              driverLocation={driverLoc}
              showDriverToPickup={booking.status === 'accepted'}
              onRoutingUpdate={(data) => setEta(data)}
            />

            {eta && (
              <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1D26' }}>
                  {Math.round(eta.duration)} min
                </Text>
                <View style={{ width: 1, height: 12, backgroundColor: '#E5E7EB', marginHorizontal: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280' }}>
                  {eta.distance.toFixed(1)} km
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ marginTop: 24, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Current Job ID</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.surface }}>#{bookingId?.slice(-6).toUpperCase() || 'TRAP-01'}</Text>
          </View>
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(27, 212, 184, 0.2)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(27, 212, 184, 0.2)' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>{booking.status.replace('_', ' ')}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 -mt-5"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedCard index={0} className="bg-white rounded-2xl p-6 mb-5 shadow-2xl shadow-black/5 border border-gray-50">
          <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-6">Mission Progress</Text>
          <View>
            {STEPS.map((step, index) => (
              <AnimatedStepIndicator key={step} step={step} index={index} currentStep={currentStep} />
            ))}
          </View>
        </AnimatedCard>

        <AnimatedCard index={1} className="bg-white rounded-[24px] p-5 mb-5 shadow-xl shadow-black/5 border border-gray-100">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px]">Route Navigation</Text>
            <TouchableOpacity
              onPress={handleOpenNavigation}
              className="bg-primary/10 px-3 py-1.5 rounded-lg flex-row items-center"
            >
              <Ionicons name="navigate" size={14} color={Colors.primary} />
              <Text className="ml-1.5 text-[10px] font-inter-bold text-primary uppercase">Open GPS</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-start">
            <View className="items-center mr-4 pt-1">
              <View className="w-3.5 h-3.5 rounded-full bg-success/20 items-center justify-center">
                <View className="w-1.5 h-1.5 rounded-full bg-success" />
              </View>
              <View className="w-[1px] h-10 bg-gray-100 my-1 border-dashed border-l border-gray-300" />
              <View className="w-3.5 h-3.5 rounded-full bg-danger/20 items-center justify-center">
                <View className="w-1.5 h-1.5 rounded-full bg-danger" />
              </View>
            </View>
            <View className="flex-1 space-y-4">
              <View>
                <Text className="text-[14px] font-inter-bold text-text leading-5" numberOfLines={1}>{booking.pickup.name}</Text>
                <Text className="text-[10px] font-inter-semibold text-text-tertiary uppercase mt-0.5 tracking-wider">{booking.pickup.area}</Text>
              </View>
              <View className="mt-4">
                <Text className="text-[14px] font-inter-bold text-text leading-5" numberOfLines={1}>{booking.delivery.name}</Text>
                <Text className="text-[10px] font-inter-semibold text-text-tertiary uppercase mt-0.5 tracking-wider">{booking.delivery.area}</Text>
              </View>
            </View>
          </View>
        </AnimatedCard>

        <AnimatedCard index={2} className="bg-white rounded-2xl p-6 mb-5 shadow-2xl shadow-black/5 border border-gray-50">
          <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-5">Customer Contact</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-[#F9FAFB] items-center justify-center mr-3.5 border border-gray-50">
                <FontAwesome5 name="user-alt" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text className="text-base font-inter-bold text-text">{booking.customerName}</Text>
                <Text className="text-[13px] font-inter-bold text-primary tracking-wider uppercase mt-0.5">{booking.customerPhone}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <PulsingNavigateButton onPress={handleOpenNavigation} />
              <PulsingCallButton onPress={handleCallCustomer} />
            </View>
          </View>
        </AnimatedCard>

        {booking.status === 'accepted' && (
          <AnimatedCard index={3} className="bg-primary/5 rounded-[32px] p-6 border border-primary/10 mb-5">
            <View className="flex-row items-center mb-5">
              <View className="w-9 h-9 rounded-xl bg-primary items-center justify-center mr-3.5 shadow-lg shadow-primary/20">
                <Feather name="shield" size={18} color="#FFF" />
              </View>
              <View>
                <Text className="text-base font-inter-bold text-text">Verify Identity</Text>
                <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-widest mt-0.5">Enter customer OTP</Text>
              </View>
            </View>

            <View className="h-16 rounded-2xl bg-white border border-gray-100 flex-row items-center px-4 mb-5 shadow-sm overflow-hidden">
              <TextInput
                style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}}
                className="flex-1 text-center text-2xl font-inter-bold text-text"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="0000"
                placeholderTextColor="rgba(0,0,0,0.1)"
              />
            </View>

            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={verifying}
              activeOpacity={0.85}
              className="h-14 rounded-xl overflow-hidden shadow-2xl shadow-primary/20"
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="flex-1 flex-row items-center justify-center"
              >
                {verifying ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text className="text-base font-inter-bold text-white mr-2.5">Authorize Trip</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCancelModalVisible(true)}
              className="mt-5 py-1 items-center"
            >
              <Text className="text-[11px] font-inter-bold text-danger/60 uppercase tracking-widest">Abort Journey</Text>
            </TouchableOpacity>
          </AnimatedCard>
        )}

        {booking.status === 'in_progress' && (
          <AnimatedCard index={3} className="mb-5">
            <TouchableOpacity
              onPress={handleCompleteDelivery}
              disabled={completing}
              activeOpacity={0.85}
              className="h-16 rounded-2xl overflow-hidden shadow-2xl shadow-success/20"
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="flex-1 flex-row items-center justify-center"
              >
                {completing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text className="text-lg font-inter-bold text-white mr-3.5">Mission Complete</Text>
                    <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                      <Ionicons name="checkmark-done" size={18} color="#FFF" />
                    </View>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </AnimatedCard>
        )}

        <AnimatedCard index={4} className="bg-white rounded-2xl p-6 border border-gray-50 shadow-sm">
          <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-5">Financials</Text>
          <View className="flex-row items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 mb-5">
            <View>
              <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-widest mb-0.5">Total Payout</Text>
              <Text className="text-2xl font-inter-bold text-text">₹{booking.totalPrice}</Text>
            </View>
            <View className="w-11 h-11 rounded-xl bg-white items-center justify-center shadow-sm">
              <MaterialCommunityIcons name="wallet" size={24} color={Colors.success} />
            </View>
          </View>
          <View className="flex-row items-center space-x-3 px-1">
            <View className={`w-7 h-7 rounded-lg items-center justify-center ${booking.paymentMethod === 'cash' ? 'bg-orange-50' : 'bg-blue-50'}`}>
              <Ionicons name={booking.paymentMethod === 'cash' ? 'cash' : 'card'} size={14} color={booking.paymentMethod === 'cash' ? '#F59E0B' : '#1B6EF3'} />
            </View>
            <Text className="text-xs font-inter-bold text-text-secondary uppercase tracking-widest">
              {booking.paymentMethod === 'cash' ? 'Collect Cash' : 'UPI Verified'}
            </Text>
          </View>
        </AnimatedCard>
      </ScrollView>

      <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setCancelModalVisible(false)} />
          <View className="bg-white rounded-t-[32px] p-7 shadow-2xl" style={{ paddingBottom: bottomInset + 20 }}>
            <Text className="text-xl font-inter-bold text-text mb-1.5">Cancel Service?</Text>
            <Text className="text-[13px] font-inter-medium text-text-tertiary mb-6">Aborting a journey may affect your driver rating.</Text>

            {CANCEL_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl mb-2.5 border border-gray-100"
                onPress={() => handleCancelRide(reason)}
              >
                <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                <Text className="ml-3 text-sm font-inter-bold text-text">{reason}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              className="mt-4 h-14 rounded-xl bg-gray-100 items-center justify-center"
              onPress={() => setCancelModalVisible(false)}
            >
              <Text className="text-base font-inter-bold text-text-secondary">Keep Working</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({});
