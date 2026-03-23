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
  KeyboardAvoidingView,
  Image,
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
  const { fetchBookings, getBookingById, startTrip, completeTrip, cancelBooking, confirmPayment } = useBookings();
  const { addNotification } = useNotifications();
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [driverLoc, setDriverLoc] = useState<{ latitude: number, longitude: number } | null>(null);
  const [eta, setEta] = useState<{ distance: number, duration: number } | null>(null);
  const hasNavigatedAfterCompletion = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const otpCardRef = useRef<View>(null);

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
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
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

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Auto-scroll to OTP section when keyboard opens
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const kbHeight = e.endCoordinates.height;
      setKeyboardHeight(kbHeight);
      if (booking?.status === 'accepted') {
        // OTP card is ~400px from top (after map 350 + info bar ~70)
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 380, animated: true });
        }, 100);
      }
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [booking?.status]);

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
    Keyboard.dismiss();

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
      }
    } catch (e: any) {
      Alert.alert('Error', 'Communication error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (completing || !bookingId || hasNavigatedAfterCompletion.current) return;
    setCompleting(true);
    try {
      const result = await completeTrip(bookingId);
      if (result.success) {
        hasNavigatedAfterCompletion.current = true;
        setTimeout(() => {
          router.replace('/driver/dashboard' as any);
        }, 600);
      } else {
        Alert.alert('Unable to Complete', result.error || 'Server rejected the request.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', 'Failed to communicate with the server.');
    } finally {
      setTimeout(() => setCompleting(false), 1000);
    }
  };

  const handleConfirmPayment = async () => {
    if (!bookingId || confirmingPayment) return;
    setConfirmingPayment(true);
    try {
      const result = await confirmPayment(bookingId);
      if (result.success) {
        Alert.alert('Success', 'Payment confirmed! The customer has been notified.');
      } else {
        Alert.alert('Error', result.error || 'Failed to confirm payment');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setConfirmingPayment(false);
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
        setTimeout(() => {
          router.replace('/driver/dashboard' as any);
        }, 300);
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
    <KeyboardAvoidingView
      className="flex-1 bg-[#F8FAFC]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={topInset}
    >
      {/* 1. Slim Header */}
      <View style={{ paddingTop: topInset, backgroundColor: Colors.navyDark }}>
        <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
          <TouchableOpacity
            onPress={() => router.replace('/driver/dashboard' as any)}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.surface, marginRight: 40 }}>Active Journey</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: bottomInset + 40 + keyboardHeight }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. Expansive Map Section */}
        <View style={{ height: 350, width: '100%', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
          <RouteMap
            pickup={booking.pickup}
            delivery={booking.delivery}
            driverLocation={driverLoc}
            showDriverToPickup={booking.status === 'accepted'}
            onRoutingUpdate={(data) => setEta(data)}
          />

          {/* Overlay Info on Map */}
          {eta && (
            <View style={{ position: 'absolute', bottom: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
              <MaterialCommunityIcons name="clock-check" size={18} color={Colors.primary} />
              <View className="ml-2">
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B' }}>{Math.round(eta.duration)} MIN</Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748B' }}>{eta.distance.toFixed(1)} KM AWAY</Text>
              </View>
            </View>
          )}

          <View style={{ position: 'absolute', top: 16, left: 16 }}>
            <View style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 8 }} />
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>GPS TRACKING ACTIVE</Text>
            </View>
          </View>
        </View>

        {/* 3. Job Quick Info Bar */}
        <View className="flex-row items-center justify-between px-6 py-5 bg-white border-b border-slate-100">
          <View>
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Reference</Text>
            <Text className="text-lg font-extrabold text-slate-800">#{bookingId?.slice(-6).toUpperCase()}</Text>
          </View>
          <View className="flex-row items-center">
            <View className="bg-primary/10 px-4 py-2 rounded-2xl mr-3">
              <Text className="text-[11px] font-bold text-primary uppercase tracking-wider">{booking.status.replace('_', ' ')}</Text>
            </View>
            <TouchableOpacity
              onPress={handleCallCustomer}
              className="w-11 h-11 bg-success rounded-full items-center justify-center shadow-lg shadow-success/30"
            >
              <Ionicons name="call" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* Step-specific Priority Actions (OTP) */}
          {booking.status === 'accepted' && (
            <View ref={otpCardRef}>
              <AnimatedCard index={0} className="bg-white rounded-[32px] p-7 shadow-xl shadow-slate-200 border border-slate-100 mb-6">
                <View className="flex-row items-center mb-6">
                  <View className="w-11 h-11 rounded-2xl bg-primary/10 items-center justify-center mr-4">
                    <Feather name="shield" size={22} color={Colors.primary} />
                  </View>
                  <View>
                    <Text className="text-lg font-bold text-slate-800">Verify OTP</Text>
                    <Text className="text-xs font-semibold text-slate-400">Ask the customer for the code</Text>
                  </View>
                </View>

                <View className="h-20 rounded-2xl bg-slate-50 border-2 border-slate-100 flex-row items-center px-6 mb-6">
                  <TextInput
                    style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}}
                    className="flex-1 text-center text-4xl font-extrabold text-slate-800"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="0000"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={verifying}
                  activeOpacity={0.8}
                  className="h-16 rounded-2xl overflow-hidden shadow-lg shadow-primary/25 mb-4"
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
                        <Text className="text-lg font-bold text-white mr-3">Start Journey</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCancelModalVisible(true)}
                  disabled={cancelling}
                  activeOpacity={0.8}
                  className="h-14 rounded-2xl border border-red-500/30 bg-red-50 items-center justify-center flex-row"
                >
                  <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                  <Text className="text-sm font-bold text-red-500 ml-2">Cancel Ride</Text>
                </TouchableOpacity>

              </AnimatedCard>
            </View>
          )}


          <AnimatedCard index={booking.status === 'accepted' ? 1 : 0} className="bg-white rounded-[24px] p-6 mb-6 shadow-xl shadow-slate-200 border border-slate-50">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-6">Mission Progress</Text>
            <View>
              {STEPS.map((step, index) => (
                <AnimatedStepIndicator key={step} step={step} index={index} currentStep={currentStep} />
              ))}
            </View>
          </AnimatedCard>

          <AnimatedCard index={2} className="bg-white rounded-[24px] p-6 mb-6 shadow-xl shadow-slate-200 border border-slate-50">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Route Details</Text>
              <TouchableOpacity
                onPress={handleOpenNavigation}
                className="bg-primary/10 px-4 py-2 rounded-xl flex-row items-center"
              >
                <Ionicons name="navigate" size={14} color={Colors.primary} />
                <Text className="ml-2 text-[10px] font-bold text-primary uppercase">Maps</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-start">
              <View className="items-center mr-4 pt-1">
                <View className="w-4 h-4 rounded-full bg-success/10 items-center justify-center">
                  <View className="w-2 h-2 rounded-full bg-success" />
                </View>
                <View className="w-[1px] h-12 bg-slate-100 my-1 border-dashed border-l-2 border-slate-200" />
                <View className="w-4 h-4 rounded-full bg-danger/10 items-center justify-center">
                  <View className="w-2 h-2 rounded-full bg-danger" />
                </View>
              </View>
              <View className="flex-1">
                <View>
                  <Text className="text-[15px] font-bold text-slate-800 leading-5" numberOfLines={1}>{booking.pickup.name}</Text>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">{booking.pickup.area}</Text>
                </View>
                <View className="mt-6">
                  <Text className="text-[15px] font-bold text-slate-800 leading-5" numberOfLines={1}>{booking.delivery.name}</Text>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">{booking.delivery.area}</Text>
                </View>
              </View>
            </View>
          </AnimatedCard>

          <AnimatedCard index={2} className="bg-white rounded-2xl p-6 mb-5 shadow-2xl shadow-black/5 border border-gray-50">
            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-5">Customer Contact</Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-xl bg-[#F9FAFB] items-center justify-center mr-3.5 border border-gray-50 overflow-hidden">
                  {booking.customerProfileSelfie ? (
                    <Image source={{ uri: booking.customerProfileSelfie }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <FontAwesome5 name="user-alt" size={20} color={Colors.primary} />
                  )}
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
            {/* <View className="flex-row items-center space-x-3 px-1">
              <View className={`w-7 h-7 rounded-lg items-center justify-center ${booking.paymentMethod === 'cash' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                <Ionicons name={booking.paymentMethod === 'cash' ? 'cash' : 'card'} size={14} color={booking.paymentMethod === 'cash' ? '#F59E0B' : '#1B6EF3'} />
              </View>
              <Text className="text-xs font-inter-bold text-text-secondary uppercase tracking-widest">
                {booking.paymentMethod === 'cash' ? 'Collect Cash' : 'UPI Verified'}
              </Text>
            </View> */}

            {booking.paymentMethod === 'upi' && booking.status !== 'pending' && booking.paymentStatus !== 'confirmed' && (
              <TouchableOpacity
                onPress={handleConfirmPayment}
                disabled={confirmingPayment}
                className="mt-6 h-12 rounded-xl bg-primary/10 items-center justify-center border border-primary/20"
                activeOpacity={0.7}
              >
                {confirmingPayment ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-done-circle" size={18} color={Colors.primary} />
                    <Text className="ml-2.5 text-[12px] font-inter-bold text-primary uppercase">Confirm Payment Receipt</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {booking.paymentStatus === 'confirmed' && (
              <View className="mt-6 p-4 bg-success/5 rounded-xl border border-success/10 flex-row items-center justify-center">
                <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
                <Text className="ml-2 text-[10px] font-bold text-success uppercase">Payment Finalized & Verified</Text>
              </View>
            )}
          </AnimatedCard>
        </View>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({});
