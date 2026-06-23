import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/contexts/BookingContext';
import { useNotifications } from '@/contexts/NotificationContext';
import Colors from '@/constants/colors';
import { getApiUrl } from '@/lib/query-client';
import { getVehicleImageSource } from '@/lib/vehicles';
import { io } from 'socket.io-client';
import * as Location from 'expo-location';
import { useBookingSound } from '@/lib/useBookingSound';

function AnimatedStatCard({
  index,
  icon,
  iconBg,
  value,
  label,
  color,
}: {
  index: number;
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
  color: string;
}) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, delay: index * 100, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 50, friction: 7, delay: index * 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 50, friction: 7, delay: index * 100, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }, { scale }] }}
      className="flex-1 bg-surface rounded-2xl p-4 border border-gray-100 shadow-xl shadow-black/5 items-center justify-center"
    >
      <View
        className="w-12 h-12 rounded-2xl items-center justify-center mb-3 shadow-sm"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </View>
      <View className="items-center">
        <Text className="text-xl font-inter-bold text-text mb-0.5">{value}</Text>
        <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px] text-center">{label}</Text>
      </View>
      <View className="absolute top-4 right-4 w-2 h-2 rounded-full" style={{ backgroundColor: color + '40' }} />
    </Animated.View>
  );
}

function AnimatedRequestsButton({ onPress, isOnline }: { onPress: () => void; isOnline: boolean }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.02, duration: 1500, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(shineAnim, { toValue: 1, duration: 2500, useNativeDriver: true })
      ).start();
    } else {
      scaleAnim.setValue(1);
      shineAnim.setValue(0);
    }
  }, [isOnline]);

  const shineTranslate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300]
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="mb-6">
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        className={!isOnline ? 'opacity-60' : ''}
      >
        <LinearGradient
          colors={isOnline ? [Colors.primary, Colors.primaryDark] : ['#4B5563', '#374151']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-2xl shadow-xl overflow-hidden"
        >
          <View className="flex-row items-center justify-between p-5">
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-xl bg-white/15 items-center justify-center mr-4 border border-white/10">
                <MaterialCommunityIcons name="radar" size={24} color={Colors.surface} />
              </View>
              <View>
                <Text className="text-base font-inter-bold text-surface">
                  {isOnline ? 'Live Ride Radar' : 'Radar Offline'}
                </Text>
                <Text className="text-xs font-inter text-white/60">
                  {isOnline ? 'Find jobs near your location' : 'Go online to start receiving jobs'}
                </Text>
              </View>
            </View>
            <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
              <Ionicons name={isOnline ? "chevron-forward" : "lock-closed"} size={18} color={Colors.surface} />
            </View>
          </View>
          {isOnline && (
            <Animated.View
              className="absolute top-0 bottom-0 w-32 "
              style={{ transform: [{ translateX: shineTranslate }, { skewX: '-20deg' }] }}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="flex-1"
              />
            </Animated.View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function AnimatedActiveCard({
  booking,
  onPress,
}: {
  booking: any;
  onPress: () => void;
}) {
  return (
    <View className="bg-surface rounded-2xl p-5 border border-primary/10 shadow-2xl shadow-primary/5 mb-6 overflow-hidden">
      <LinearGradient
        colors={[Colors.primary + '05', 'transparent']}
        className="absolute inset-0"
      />
      <TouchableOpacity activeOpacity={1} onPress={onPress}>
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-full bg-gray-100 mr-3 border border-gray-100 overflow-hidden">
              {booking.customerProfileSelfie ? (
                <Image source={{ uri: booking.customerProfileSelfie }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="w-full h-full items-center justify-center bg-gray-50">
                  <Ionicons name="person" size={20} color={Colors.textTertiary} />
                </View>
              )}
            </View>
            <View>
              <Text className="text-sm font-inter-bold text-text tracking-tight">Ongoing Journey</Text>
              <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase">{booking.customerName}</Text>
            </View>
          </View>
          <View className="bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/10">
            <Text className="text-[9px] font-inter-bold text-primary uppercase tracking-[1.5px]">
              {booking.status === 'accepted' ? 'Accepted' : 'In Transit'}
            </Text>
          </View>
        </View>

        <View className="mb-5 space-y-2">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-success mr-3.5" />
            <Text className="flex-1 text-sm font-inter-medium text-text-secondary" numberOfLines={1}>{booking.pickup.name}</Text>
          </View>
          <View className="w-px h-3 bg-gray-100 ml-1" />
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-danger mr-3.5" />
            <Text className="flex-1 text-sm font-inter-medium text-text-secondary" numberOfLines={1}>{booking.delivery.name}</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between border-t border-gray-50 pt-4">
          <View>
            <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-widest mb-0.5">Total Pay</Text>
            <Text className="text-xl font-inter-bold text-text">₹{booking.totalPrice}</Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center bg-primary px-4 py-2.5 rounded-xl shadow-lg shadow-primary/20"
            onPress={onPress}
          >
            <Text className="text-sm font-inter-bold text-surface mr-2">Open Map</Text>
            <Ionicons name="navigate-circle" size={18} color={Colors.surface} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function AnimatedCompletedCard({
  booking,
  index,
  getVehicleIcon,
}: {
  booking: any;
  index: number;
  getVehicleIcon: (type: string) => string;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, delay: index * 100, useNativeDriver: true }),
      Animated.timing(slideX, { toValue: 0, duration: 600, delay: index * 100, useNativeDriver: true })
    ]).start();
  }, []);

  const imgSource = getVehicleImageSource(undefined, booking.vehicleType);

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateX: slideX }] }}
      className="flex-row items-center justify-between bg-surface rounded-xl p-3.5 mb-3 border border-gray-50 shadow-sm"
    >
      <View className="flex-row items-center flex-1 mr-3">
        <View className="w-12 h-12 rounded-xl bg-gray-50 items-center justify-center mr-3.5">
          <Image
            source={imgSource}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-inter-bold text-text" numberOfLines={1}>{booking.delivery.name}</Text>
          <Text className="text-[10px] font-inter-medium text-text-tertiary mt-0.5">
            {new Date(booking.completedAt || booking.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
          </Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="text-base font-inter-bold text-text">₹{booking.totalPrice}</Text>
        <View className="flex-row items-center mt-1">
          <View className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
          <Text className="text-[9px] font-inter-bold text-success uppercase">Paid</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function DriverDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, refreshUser } = useAuth();
  const { bookings, fetchBookings, getActiveBooking, checkOperationalAvailability } = useBookings();
  const { unreadCount } = useNotifications();
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const isFocused = useIsFocused();

  // Sound and Popup Notification logic for Online Driver
  const { playBookingAlert, stopBookingAlert } = useBookingSound();
  const [newRequest, setNewRequest] = useState<any | null>(null);
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const timeoutRef = useRef<any>(null);

  const hideRequestPopup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopBookingAlert();
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setNewRequest(null);
    });
  }, [slideAnim, stopBookingAlert]);

  useEffect(() => {
    if (!isFocused) {
      hideRequestPopup();
    }
  }, [isFocused, hideRequestPopup]);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const activeBooking = getActiveBooking();
  const completedBookings = bookings.filter((b) => b.status === 'completed').slice(0, 5);

  useEffect(() => {
    fetchBookings();
    refreshUser();
    const interval = setInterval(() => {
      fetchBookings();
      refreshUser();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Verification Check
  useEffect(() => {
    if (user && user.role === 'driver') {
      if (user.verificationStatus === 'none' || user.verificationStatus === 'rejected') {
        router.replace('/driver/verify' as any);
      } else if (user.verificationStatus === 'pending') {
        router.replace('/driver/pending-approval' as any);
      }
    }
  }, [user?.verificationStatus]);

  // Location tracking for Admin Panel & Real-time Booking Notifications
  useEffect(() => {
    if (!user?.isOnline || !token) return;

    let socket: any;
    let locationSubscription: any;

    const startTracking = async () => {
      try {
        console.log('[TRACKING] Requesting location permissions...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error('[TRACKING] Permission denied');
          return;
        }

        let baseUrl = getApiUrl();
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

        console.log('[TRACKING] Connecting to socket at:', baseUrl);
        socket = io(baseUrl, {
          path: '/socket.io',
          transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
          console.log('[TRACKING] Socket connected, emitting driver:online');
          socket.emit('driver:online', { driverId: user.id });
        });

        socket.on('wallet:updated', (data: { balance: number }) => {
          console.log('[SOCKET] Wallet updated via admin:', data.balance);
          refreshUser();
        });

        // Real-time booking popup and sound listener
        socket.on('booking:new', (data: { booking: any }) => {
          if (!isFocused || getActiveBooking()) {
            console.log('[SOCKET] Driver is already in an active ride or dashboard not focused, ignoring new booking request');
            return;
          }
          console.log('[SOCKET] New request arrived on dashboard:', data.booking.id);
          playBookingAlert();
          setNewRequest(data.booking);
          
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          Animated.spring(slideAnim, {
            toValue: 20,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
          }).start();

          timeoutRef.current = setTimeout(() => {
            hideRequestPopup();
          }, 30000);
        });

        // Get initial position
        const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (currentLoc && socket) {
          console.log('[TRACKING] Sending initial location:', currentLoc.coords.latitude, currentLoc.coords.longitude);
          socket.emit('driver:location', {
            driverId: user.id,
            lat: currentLoc.coords.latitude,
            lng: currentLoc.coords.longitude
          });
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
            distanceInterval: 10,
          },
          (newLocation) => {
            if (socket) {
              console.log('[TRACKING] Emitting location update:', newLocation.coords.latitude, newLocation.coords.longitude);
              socket.emit('driver:location', {
                driverId: user.id,
                lat: newLocation.coords.latitude,
                lng: newLocation.coords.longitude
              });
            }
          }
        );
      } catch (e) {
        console.error('Tracking Error:', e);
      }
    };

    startTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      stopBookingAlert();
      if (socket) {
        socket.emit('driver:offline', { driverId: user.id });
        socket.disconnect();
      }
    };
  }, [user?.isOnline, token, stopBookingAlert]);

  const handleToggleOnline = async () => {
    if (isTogglingOnline) return;
    
    // If turning online, check location first
    if (!user?.isOnline) {
      setIsTogglingOnline(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please allow location access to go online.');
          setIsTogglingOnline(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const cityCheck = await checkOperationalAvailability(loc.coords.latitude, loc.coords.longitude);
        
        if (cityCheck.error) {
          Alert.alert('Service Unavailable', 'We are not available in your current location yet. Stay tuned!');
          setIsTogglingOnline(false);
          return;
        }
      } catch (e) {
        console.error('Location Check Error:', e);
        // Fallback or just continue if check fails? 
        // Better to be safe and allow if it's an error on our side?
        // User said: "dikhe ki we are not available".
      }
    }

    setIsTogglingOnline(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL('/api/users/toggle-online', baseUrl);
      const res = await fetch(url.toString(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await res.json();
      if (res.ok && data.user) {
        await refreshUser();
      } else {
        Alert.alert('System Error', data.error || 'Unable to update status. Please try again.');
      }
    } catch (e: any) {
      console.error('Toggle Online Error:', e);
      Alert.alert('Connection Problem', 'Check your internet connection and try again.');
    } finally {
      setIsTogglingOnline(false);
    }
  };

  const getVehicleIcon = (type: string) => {
    if (!type) return 'truck';
    switch (type.toLowerCase()) {
      case 'auto': return 'auto-rickshaw';
      case 'tempo': return 'truck-delivery';
      case 'truck': return 'truck';
      default: return 'truck';
    }
  };


  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        className="px-6 pb-10 rounded-b-[32px] shadow-2xl"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            className="flex-row items-center flex-1"
            onPress={() => router.push('/driver/menu' as any)}
            activeOpacity={0.7}
          >
            <View className="w-12 h-12 rounded-xl bg-white/10 items-center justify-center border border-white/10 overflow-hidden">
              {user?.profileSelfie ? (
                <Image source={{ uri: user.profileSelfie }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={24} color={Colors.surface} />
              )}
            </View>
            <View className="ml-3.5">
              <Text className="text-[10px] font-inter-medium text-white/50 mb-0.5 uppercase tracking-widest">Active Driver</Text>
              <Text className="text-lg font-inter-bold text-surface">{user?.name || 'Driver'}</Text>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center">
            <TouchableOpacity
              className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center mr-3 relative border border-white/5"
              onPress={() => router.push('/driver/notifications' as any)}
            >
              <Ionicons name="notifications" size={20} color={Colors.surface} />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-danger rounded-lg min-w-[18px] h-[18px] border-2 border-navyMid items-center justify-center px-1">
                  <Text className="text-[8px] font-inter-bold text-surface">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View className="mx-6 -mt-6">
        <View className="bg-surface rounded-2xl p-5 shadow-2xl shadow-black/10 border border-gray-50 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className={`w-3.5 h-3.5 rounded-full mr-3.5 border-2 border-white shadow-sm ${user?.isOnline ? 'bg-accent' : 'bg-gray-300'}`} />
            <View className="flex-1">
              <Text className="text-base font-inter-bold text-text">{user?.isOnline ? 'Go Offline' : 'Go Online'}</Text>
              <Text className="text-[11px] font-inter-medium text-text-tertiary mt-0.5">
                {user?.isOnline ? 'Currently accepting rides' : 'Ready to start your shift?'}
              </Text>
            </View>
          </View>
          {isTogglingOnline ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Switch
              value={user?.isOnline ?? false}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#EEF2F6', true: Colors.accent }}
              thumbColor={Colors.surface}
            />
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingTop: 32, paddingBottom: bottomInset + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap mb-4" style={{ marginHorizontal: -8 }}>
          <View className="w-1/2 px-2 mb-4">
            <AnimatedStatCard
              index={0}
              icon={<MaterialCommunityIcons name="currency-inr" size={24} color="#10B981" />}
              iconBg="#D1FAE5"
              value={`₹${user?.totalEarnings ?? 0}`}
              label="Earnings"
              color="#10B981"
            />
          </View>
          <View className="w-1/2 px-2 mb-4">
            <TouchableOpacity onPress={() => router.push('/driver/wallet' as any)} activeOpacity={0.8} style={{ flex: 1 }}>
              <AnimatedStatCard
                index={1}
                icon={<MaterialCommunityIcons name="wallet-outline" size={24} color={(user?.walletBalance ?? 0) < 0 ? '#EF4444' : '#3B82F6'} />}
                iconBg={(user?.walletBalance ?? 0) < 0 ? '#FEE2E2' : '#DBEAFE'}
                value={`₹${user?.walletBalance ?? 0}`}
                label="Balance"
                color={(user?.walletBalance ?? 0) < 0 ? '#EF4444' : '#3B82F6'}
              />
            </TouchableOpacity>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <AnimatedStatCard
              index={2}
              icon={<FontAwesome5 name="route" size={22} color={Colors.primary} />}
              iconBg={Colors.primaryLight}
              value={String(user?.totalTrips ?? 0)}
              label="Total Trips"
              color={Colors.primary}
            />
          </View>
          <View className="w-1/2 px-2 mb-4">
            <AnimatedStatCard
              index={3}
              icon={<Ionicons name="star" size={22} color={Colors.warning} />}
              iconBg={Colors.warningLight}
              value={user?.rating ? user.rating.toFixed(1) : '5.0'}
              label="Avg. Rating"
              color={Colors.warning}
            />
          </View>
        </View>

        <AnimatedRequestsButton
          isOnline={user?.isOnline ?? false}
          onPress={() => {
            if (user?.isOnline) {
              if ((user?.walletBalance ?? 0) < 0) {
                Alert.alert(
                  'Account Blocked',
                  'Your wallet balance has gone negative. Please recharge your account to continue receiving and accepting ride requests.'
                );
                return;
              }
              router.push('/driver/requests' as any);
            } else {
              Alert.alert('Radar Offline', 'You must go online to view and accept ride requests.');
            }
          }}
        />

        {activeBooking && (
          <AnimatedActiveCard
            booking={activeBooking}
            onPress={() => router.push(`/driver/active-ride?bookingId=${activeBooking.id}` as any)}
          />
        )}

        {completedBookings.length > 0 && (
          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-inter-bold text-text tracking-tight">Recent Activity</Text>
              <TouchableOpacity
                className="bg-gray-100 px-4 py-2 rounded-xl"
                onPress={() => router.push('/driver/history' as any)}
              >
                <Text className="text-xs font-inter-bold text-primary uppercase">View All</Text>
              </TouchableOpacity>
            </View>
            {completedBookings.map((booking, index) => (
              <AnimatedCompletedCard key={booking.id} booking={booking} index={index} getVehicleIcon={getVehicleIcon} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Real-time New Ride Request Floating Banner */}
      {newRequest && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: topInset,
              left: 16,
              right: 16,
              zIndex: 9999,
              transform: [{ translateY: slideAnim }],
            }
          ]}
          className="bg-surface rounded-2xl p-4 shadow-2xl border border-primary/20 flex-row items-center justify-between"
        >
          {/* Ride Details (Pickup, Drop, Price) */}
          <TouchableOpacity
            activeOpacity={0.9}
            className="flex-1 mr-3"
            onPress={() => {
              hideRequestPopup();
              router.push('/driver/requests' as any);
            }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[10px] font-inter-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                New Ride Request
              </Text>
              <Text className="text-base font-inter-bold text-text">₹{newRequest.totalPrice}</Text>
            </View>
            
            <View className="space-y-1">
              <Text className="text-xs font-inter-semibold text-text-secondary" numberOfLines={1}>
                🟢 From: {newRequest.pickup.name}
              </Text>
              <Text className="text-xs font-inter-semibold text-text-secondary" numberOfLines={1}>
                🔴 To: {newRequest.delivery.name}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Quick Action Buttons */}
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                hideRequestPopup();
                router.push('/driver/requests' as any);
              }}
              className="bg-primary px-3 py-2.5 rounded-xl mr-2"
            >
              <Text className="text-xs font-inter-bold text-surface">View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={hideRequestPopup}
              className="bg-gray-100 p-2.5 rounded-xl"
            >
              <Ionicons name="close" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({});
