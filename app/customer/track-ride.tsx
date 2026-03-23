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
  Image,
  Clipboard,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5, AntDesign } from '@expo/vector-icons';
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


function AnimatedCard({ delay, children, className }: { delay: number; children: React.ReactNode; className?: string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      className={className}
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function SearchingAnimation({ timeLeft }: { timeLeft: number }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <View className="items-center justify-center p-8 bg-white rounded-3xl shadow-xl border border-gray-50">
      <View className="relative items-center justify-center mb-6">
        <Animated.View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 4,
            borderColor: Colors.primary,
            borderTopColor: 'transparent',
            transform: [{ rotate: spin }],
          }}
        />
        <View className="absolute items-center justify-center">
          <MaterialCommunityIcons name="radar" size={40} color={Colors.primary} />
          <Text className="text-2xl font-inter-black text-text mt-2">
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </Text>
        </View>
      </View>
      <Text className="text-xl font-inter-bold text-text text-center">Searching Nearby Drivers</Text>
      <Text className="text-sm font-inter-medium text-text-tertiary text-center mt-2">
        Please wait while we connect you with a transportation partner.
      </Text>
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
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const hasNavigated = useRef(false);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const booking = getBookingById(bookingId as string);
  const prevStatusRef = useRef<string | undefined>(undefined);
  const isMounted = useRef(true);

  const lastValidBooking = useRef<any>(null);
  if (booking) {
    lastValidBooking.current = booking;
  }
  const displayBooking = booking || lastValidBooking.current;

  const [driverLocation, setDriverLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [eta, setEta] = useState<{ distance: number, duration: number } | null>(null);

  // Countdown timer for pending status
  useEffect(() => {
    if (displayBooking?.status === 'pending') {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleCancel('No driver found within time limit');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [displayBooking?.status]);

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

  useEffect(() => {
    if (!displayBooking || !isMounted.current) return;

    if (displayBooking.status !== prevStatusRef.current) {
      if (displayBooking.status === 'in_progress' && prevStatusRef.current === 'accepted') {
        addNotification('Trip Started', 'Your transportation partner is now on the move.', 'booking');
      } else if (displayBooking.status === 'accepted' && prevStatusRef.current === 'pending') {
        addNotification('Driver Found', 'A transportation partner has accepted your request.', 'booking');
      } else if (displayBooking.status === 'completed' && prevStatusRef.current && prevStatusRef.current !== 'completed') {
        addNotification('Job Finalized', `The delivery job has been successfully closed.`, 'booking');
        setShowPaymentModal(true);
      }
    }
  }, [displayBooking?.status, displayBooking?.id]);

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

  const handleFinishRide = () => {
    setShowPaymentModal(false);
    router.replace(`/customer/rate-ride?bookingId=${displayBooking.id}` as any);
  };

  if (!displayBooking) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="mt-4 text-gray-500 font-inter-medium">Initializing Trip Intel...</Text>
      </View>
    );
  }

  const isCancelled = displayBooking.status === 'cancelled';

  // Full-screen searching view when pending — map is irrelevant while finding a driver
  if (displayBooking.status === 'pending') {
    return (
      <View className="flex-1 bg-[#FDFDFD]">
        {/* Header */}
        <LinearGradient
          colors={[Colors.navyDark, Colors.primary]}
          style={{ paddingTop: topInset + 12, paddingBottom: 24, paddingHorizontal: 20 }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.replace('/customer/home' as any)}
              style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="text-white font-inter-bold text-lg">Finding Driver</Text>
              <View className="flex-row items-center mt-0.5">
                <View className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5" />
                <Text className="text-[9px] font-inter-bold text-green-300 uppercase tracking-wider">Searching Nearby</Text>
              </View>
            </View>
            <View style={{ width: 44 }} />
          </View>
        </LinearGradient>

        {/* Searching Content */}
        <View className="flex-1 px-6 justify-center" style={{ paddingBottom: bottomInset + 20 }}>
          <SearchingAnimation timeLeft={timeLeft} />

          {/* Route Summary */}
          <View className="mt-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center mb-3">
              <View className="w-2.5 h-2.5 rounded-full bg-success mr-3" />
              <Text className="text-sm font-inter-semibold text-text flex-1" numberOfLines={1}>{displayBooking.pickup.name}</Text>
            </View>
            <View className="w-px h-4 bg-gray-200 ml-1 mb-3" />
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-danger mr-3" />
              <Text className="text-sm font-inter-semibold text-text flex-1" numberOfLines={1}>{displayBooking.delivery.name}</Text>
            </View>
          </View>

          {/* Price row */}
          <View className="mt-3 flex-row items-center justify-between bg-primary/5 rounded-2xl px-5 py-3 border border-primary/10">
            <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-wider">Estimated Fare</Text>
            <Text className="text-xl font-inter-black text-primary">₹{displayBooking.totalPrice}</Text>
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            onPress={() => setCancelModalVisible(true)}
            className="mt-5 h-14 rounded-2xl bg-red-50 items-center justify-center border border-red-100"
            activeOpacity={0.7}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color={Colors.danger} />
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="close-circle-outline" size={20} color={Colors.danger} />
                <Text className="ml-2.5 text-sm font-inter-bold text-danger">Cancel Booking</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Cancel Modal */}
        <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
          <View className="flex-1 bg-black/60 justify-end">
            <TouchableOpacity className="flex-1" onPress={() => setCancelModalVisible(false)} />
            <View className="bg-white rounded-t-3xl p-6 shadow-2xl" style={{ paddingBottom: bottomInset + 10 }}>
              <Text className="text-xl font-inter-bold text-text mb-1.5">Abort Service?</Text>
              <Text className="text-[13px] font-inter-medium text-text-tertiary mb-6">Are you sure you want to cancel this booking?</Text>
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
                <Text className="text-sm font-inter-bold text-text-secondary">Keep Waiting</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <View style={{ height: '48%', width: '100%', position: 'relative' }}>
        <RouteMap
          pickup={displayBooking.pickup}
          delivery={displayBooking.delivery}
          driverLocation={driverLocation}
          showDriverToPickup={displayBooking.status === 'accepted'}
          onRoutingUpdate={(data) => setEta(data)}
        />

        {eta && (
          <View
            style={{
              position: 'absolute',
              bottom: 24,
              alignSelf: 'center',
              backgroundColor: 'white',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.05)'
            }}
          >
            <MaterialCommunityIcons name="clock-fast" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1D26' }}>
              {Math.round(eta.duration)} min
            </Text>
            <View style={{ width: 1, height: 14, backgroundColor: '#E5E7EB', marginHorizontal: 10 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280' }}>
              {eta.distance.toFixed(1)} km
            </Text>
          </View>
        )}


        <LinearGradient
          colors={['rgba(10, 25, 48, 0.7)', 'transparent']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: topInset + 12,
            paddingBottom: 40,
            paddingHorizontal: 20
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.replace('/customer/home' as any)}
              style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </TouchableOpacity>

            <View className="flex-1 items-center">
              <Text className="text-white font-inter-bold text-lg">Trip Radar</Text>
              <View className="flex-row items-center mt-0.5">
                <View className="w-1 h-1 rounded-full bg-accent mr-1.5" />
                <Text className="text-[9px] font-inter-bold text-accent uppercase tracking-wider">Live Tracking</Text>
              </View>
            </View>

            <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <MaterialCommunityIcons name="radar" size={20} color={Colors.accent} />
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        className="flex-1 -mt-8 bg-[#FDFDFD] rounded-t-[32px]"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: bottomInset + 30 }}
        showsVerticalScrollIndicator={false}
      >
        {displayBooking.status !== 'pending' ? (
          <>
            <View className="flex-row items-center justify-between mb-8 px-1">
              <View>
                <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[3px] mb-2">Reference</Text>
                <View className="bg-gray-100 px-3 py-1.5 rounded-xl self-start">
                  <Text className="text-sm font-inter-bold text-text-secondary">#{String(bookingId || '').slice(-6).toUpperCase()}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[3px] mb-1">Total Fare</Text>
                <View className="flex-row items-baseline">
                  <Text className="text-[14px] font-inter-black text-primary mr-1">₹</Text>
                  <Text className="text-3xl font-inter-black text-primary">{displayBooking.totalPrice}</Text>
                </View>
              </View>
            </View>

            {isCancelled ? (
              <AnimatedCard delay={0} className="bg-red-50 rounded-3xl p-8 items-center border border-red-100 shadow-xl shadow-red-500/5">
                <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center mb-5 shadow-sm">
                  <Ionicons name="close-circle" size={40} color={Colors.danger} />
                </View>
                <Text className="text-xl font-inter-bold text-danger mb-1.5">Job Cancelled</Text>
                <Text className="text-[13px] font-inter-medium text-danger/60 text-center leading-5 px-4">{displayBooking.cancelReason ? `Reason: ${displayBooking.cancelReason}` : 'This journey was aborted. Check your notification logs for details.'}</Text>
              </AnimatedCard>
            ) : (
              <>
                {displayBooking.status === 'accepted' && (
                  <View className="mb-6">
                    <LinearGradient
                      colors={['rgba(27, 110, 243, 0.08)', 'rgba(27, 110, 243, 0.02)']}
                      className="p-5 rounded-3xl border border-primary/10"
                    >
                      <View className="flex-row items-center mb-2">
                        <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mr-3">
                          <MaterialCommunityIcons name="shield-car" size={24} color={Colors.primary} />
                        </View>
                        <View>
                          <Text className="text-lg font-inter-bold text-primary">Driver Assigned</Text>
                          <View className="flex-row items-center">
                            <View className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2" />
                            <Text className="text-[11px] font-inter-bold text-primary/60 uppercase tracking-wider">En Route to Pickup</Text>
                          </View>
                        </View>
                      </View>

                      {displayBooking.otp && (
                        <View className="mt-4 flex-row items-center justify-between bg-white p-4 rounded-[24px] shadow-sm border border-gray-50">
                          <View>
                            <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-0.5">Start Code</Text>
                            <Text className="text-[11px] font-inter-medium text-text-tertiary">Share with partner</Text>
                          </View>
                          <View className="w-[110px] h-12 bg-primary items-center justify-center rounded-2xl shadow-lg shadow-primary/30">
                            <Text className="text-2xl font-inter-black text-white tracking-[4px]">{displayBooking.otp}</Text>
                          </View>
                        </View>
                      )}
                    </LinearGradient>
                  </View>
                )}

                {displayBooking.status === 'in_progress' && (
                  <View className="mb-6">
                    <View className="flex-row items-center justify-center mb-3">
                      <View className="items-center" >
                        <Text className="text-lg font-inter-bold text-success">Journey in Progress</Text>
                        <View className="flex-row items-center">
                          <View className="w-1.5 h-1.5 rounded-full bg-success/40 mr-2" />
                          <Text className="text-[11px] font-inter-bold text-success/60 uppercase tracking-widest text-success">Live Navigation</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {displayBooking.driverName && (
                  <AnimatedCard delay={100} className="bg-white rounded-3xl p-5 mb-5 shadow-2xl shadow-black/5 border border-gray-50">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className="w-14 h-14 rounded-2xl bg-primary/5 items-center justify-center mr-4 border border-primary/10 shadow-sm overflow-hidden">
                          {displayBooking.driverProfileSelfie ? (
                            <Image source={{ uri: displayBooking.driverProfileSelfie }} className="w-full h-full" resizeMode="cover" />
                          ) : (
                            <FontAwesome5 name="user-tie" size={24} color={Colors.primary} />
                          )}
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center mb-1">
                            <Text className="text-lg font-inter-bold text-text mr-2" numberOfLines={1}>{displayBooking.driverName}</Text>
                            <MaterialCommunityIcons name="shield-check" size={16} color={Colors.success} />
                          </View>
                          <View className="flex-row items-center">
                            <View className="bg-gray-100 px-2 py-0.5 rounded-md mr-2">
                              <Text className="text-[9px] font-inter-bold text-text-secondary uppercase">{displayBooking.driverVehicleNumber || 'MH-12-TR-0001'}</Text>
                            </View>
                            <View className="flex-row items-center">
                              <Ionicons name="star" size={10} color={Colors.warning} />
                              <Text className="text-[10px] font-inter-bold text-text-tertiary ml-1">4.9</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => displayBooking.driverPhone && Linking.openURL(`tel:${displayBooking.driverPhone}`)}
                        className="w-12 h-12 rounded-2xl bg-success items-center justify-center shadow-lg shadow-success/30"
                      >
                        <Ionicons name="call" size={22} color="#FFF" />
                      </TouchableOpacity>
                    </View>
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

                  {/* <View className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex-row items-center">
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
                    <View className="flex-1">
                      <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-widest">Payment Strategy</Text>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[13px] font-inter-bold text-text mt-0.5">
                          {displayBooking.paymentMethod === 'cash' ? 'Physical Cash' : 'UPI Verified'}
                        </Text>
                        {displayBooking.paymentStatus === 'confirmed' && (
                          <View className="bg-success/10 px-2 py-0.5 rounded-md flex-row items-center">
                            <Ionicons name="checkmark-circle" size={10} color={Colors.success} />
                            <Text className="text-[8px] font-inter-bold text-success uppercase ml-1">Confirmed</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View> */}
                </AnimatedCard>

                {displayBooking.paymentMethod === 'upi' && displayBooking.status !== 'pending' && displayBooking.status !== 'completed' && (
                  <AnimatedCard delay={350} className="bg-white rounded-[32px] p-6 mb-4 shadow-2xl shadow-black/5 border border-primary/10">
                    <View className="flex-row items-center justify-between mb-5">
                      <Text className="text-[10px] font-inter-bold text-primary uppercase tracking-[2px]">Payment Intel</Text>
                      {displayBooking.paymentStatus !== 'confirmed' && (
                        <View className="bg-amber-50 px-2 py-1 rounded-lg">
                          <Text className="text-[8px] font-inter-bold text-amber-600 uppercase">Awaiting Settlement</Text>
                        </View>
                      )}
                    </View>
                    {displayBooking.driverBankDetails ? (
                      <View>
                        <View className="bg-gray-50 p-4 rounded-2xl mb-4 border border-gray-100">
                          <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-wider mb-2">Driver VPA (UPI ID)</Text>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm font-inter-bold text-text">{displayBooking.driverBankDetails.upiId}</Text>
                            <TouchableOpacity onPress={() => {
                              Clipboard.setString(displayBooking.driverBankDetails!.upiId);
                              Alert.alert('Copied', 'UPI ID copied to clipboard');
                            }}>
                              <Feather name="copy" size={16} color={Colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        {displayBooking.driverBankDetails.qrCode && (
                          <View className="items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-wider mb-3">Instant Scan & Pay</Text>
                            <Image
                              source={{ uri: displayBooking.driverBankDetails.qrCode }}
                              className="w-40 h-40 rounded-xl"
                              resizeMode="contain"
                            />
                            <Text className="text-[10px] font-inter-medium text-text-tertiary mt-3 text-center">
                              Scan this code in any UPI app to pay ₹{displayBooking.totalPrice}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View className="items-center py-4">
                        <ActivityIndicator color={Colors.primary} size="small" />
                        <Text className="text-[11px] font-inter-medium text-text-tertiary mt-2">Connecting to secure terminal...</Text>
                      </View>
                    )}
                  </AnimatedCard>
                )}

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
          </>
        ) : null}
      </ScrollView>

      {/* Payment and Ride Completion Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-[40px] p-8 items-center shadow-2xl">
            <View className="w-20 h-20 bg-success/10 rounded-full items-center justify-center mb-6">
              <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
            </View>
            <Text className="text-2xl font-inter-black text-text text-center uppercase tracking-wider mb-2">Ride Complete</Text>
            <Text className="text-base font-inter-medium text-text-secondary text-center mb-8">Please pay this amount to the driver</Text>

            <View className="bg-gray-50 w-full rounded-3xl p-6 border border-gray-100 mb-8 items-center">
              <Text className="text-3xl font-inter-black text-primary mb-6">₹{displayBooking.totalPrice}</Text>

              {displayBooking.driverBankDetails ? (
                <View className="items-center w-full">
                  <View className="bg-primary/5 px-4 py-2 rounded-full mb-4 border border-primary/10">
                    <Text className="text-sm font-inter-bold text-primary">{displayBooking.driverBankDetails.upiId}</Text>
                  </View>

                  {displayBooking.driverBankDetails.qrCode ? (
                    <>
                      <Image
                        source={{ uri: displayBooking.driverBankDetails.qrCode }}
                        className="w-32 h-32 rounded-2xl mb-3 shadow-md border border-gray-100"
                        resizeMode="contain"
                      />
                      <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-widest text-center">Scan to Pay via UPI</Text>
                    </>
                  ) : (
                    <Text className="text-[11px] font-inter-medium text-text-tertiary italic">Pay via UPI to the ID above</Text>
                  )}

                  {/* {displayBooking.paymentMethod === 'cash' && (
                    <View className="mt-4 flex-row items-center opacity-60">
                      <Ionicons name="cash-outline" size={14} color="#6B7280" />
                      <Text className="ml-2 text-[10px] font-inter-bold text-text-secondary uppercase">Cash was selected</Text>
                    </View>
                  )} */}
                </View>
              ) : (
                <View className="flex-row items-center bg-amber-50 px-6 py-3 rounded-2xl border border-amber-100">
                  <Ionicons name={displayBooking.paymentMethod === 'cash' ? 'cash-outline' : 'card-outline'} size={24} color="#D97706" />
                  <Text className="ml-3 text-lg font-inter-bold text-amber-700">
                    {displayBooking.paymentMethod === 'cash' ? 'Cash Payment' : 'Digital Payment'}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={handleFinishRide}
              className="w-full h-16 rounded-2xl bg-primary items-center justify-center shadow-lg shadow-primary/30"
            >
              <Text className="text-lg font-inter-bold text-white uppercase tracking-widest">Done / Rate Driver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
