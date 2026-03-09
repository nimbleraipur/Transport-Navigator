import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings, BookingData } from '@/contexts/BookingContext';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';

function ShimmerButton({ onPress, disabled, isLoading }: { onPress: () => void; disabled: boolean; isLoading: boolean }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      className={`${disabled ? 'opacity-70' : ''}`}
    >
      <LinearGradient
        colors={[Colors.success, '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="rounded-xl py-3 flex-row items-center justify-center space-x-2 overflow-hidden shadow-lg shadow-success/20"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.surface} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={18} color={Colors.surface} />
            <Text className="text-sm font-inter-semibold text-surface">Accept Ride</Text>
          </>
        )}
        <Animated.View
          className="absolute top-0 bottom-0 w-32"
          style={[{ transform: [{ translateX: shimmerTranslate }] }]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.2)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="flex-1"
          />
        </Animated.View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function AnimatedRequestCard({
  item,
  index,
  acceptingId,
  onAccept,
  getVehicleIcon,
}: {
  item: BookingData;
  index: number;
  acceptingId: string | null;
  onAccept: (id: string) => void;
  getVehicleIcon: (type: string) => string;
}) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const badgeBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 100;
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, delay, useNativeDriver: true })
    ]).start(() => {
      Animated.spring(badgeBounce, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    });
  }, []);

  return (
    <Animated.View
      className="bg-surface rounded-2xl p-4 mb-4 border border-gray-100 shadow-xl shadow-black/5"
      style={[{ opacity: opacityAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}
    >
      <View className="flex-row items-center justify-between mb-4">
        <Animated.View
          className="flex-row items-center px-2.5 py-1.5 bg-primary/10 rounded-lg"
          style={[{ transform: [{ scale: badgeBounce }] }]}
        >
          <MaterialCommunityIcons name={getVehicleIcon(item.vehicleType) as any} size={18} color={Colors.primary} />
          <Text className="ml-1.5 text-[10px] font-inter-bold text-primary uppercase tracking-wider">
            {item.vehicleType}
          </Text>
        </Animated.View>
        <View className="items-end">
          <Text className="text-xl font-inter-bold text-text">₹{item.totalPrice}</Text>
          <Text className="text-[9px] font-inter-medium text-text-tertiary uppercase tracking-wider mt-0.5">Estimated Fare</Text>
        </View>
      </View>

      <View className="mb-5 bg-gray-50/50 rounded-xl p-3.5 border border-gray-50">
        <View className="flex-row items-start">
          <View className="items-center mr-3.5 pt-1">
            <View className="w-3.5 h-3.5 rounded-full bg-success/20 items-center justify-center">
              <View className="w-1.5 h-1.5 rounded-full bg-success" />
            </View>
            <View className="w-0.5 h-8 bg-gray-200 my-1 border-dashed border-l border-gray-300" />
            <View className="w-3.5 h-3.5 rounded-full bg-danger/20 items-center justify-center">
              <View className="w-1.5 h-1.5 rounded-full bg-danger" />
            </View>
          </View>
          <View className="flex-1">
            <View className="mb-4">
              <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px] mb-0.5">Pickup</Text>
              <Text className="text-[13px] font-inter-semibold text-text" numberOfLines={1}>{item.pickup.name}</Text>
              <Text className="text-[11px] font-inter text-text-secondary mt-0.5" numberOfLines={1}>{item.pickup.area}</Text>
            </View>
            <View>
              <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px] mb-0.5">Drop</Text>
              <Text className="text-[13px] font-inter-semibold text-text" numberOfLines={1}>{item.delivery.name}</Text>
              <Text className="text-[11px] font-inter text-text-secondary mt-0.5" numberOfLines={1}>{item.delivery.area}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-5 px-0.5">
        <View className="flex-row items-center space-x-4">
          <View className="flex-row items-center">
            <View className="w-6 h-6 rounded-lg bg-gray-100 items-center justify-center mr-2">
              <Feather name="navigation" size={12} color={Colors.primary} />
            </View>
            <Text className="text-[13px] font-inter-bold text-text">{item.distance} <Text className="text-text-tertiary font-inter-medium text-[11px]">km</Text></Text>
          </View>
          <View className="flex-row items-center ml-4">
            <View className="w-6 h-6 rounded-lg bg-gray-100 items-center justify-center mr-2">
              <Feather name="clock" size={12} color={Colors.success} />
            </View>
            <Text className="text-[13px] font-inter-bold text-text">{item.estimatedTime} <Text className="text-text-tertiary font-inter-medium text-[11px]">min</Text></Text>
          </View>
        </View>
      </View>

      <ShimmerButton
        onPress={() => onAccept(item.id)}
        disabled={acceptingId === item.id}
        isLoading={acceptingId === item.id}
      />
    </Animated.View>
  );
}

function AnimatedEmptyState({ isOnline }: { isOnline: boolean }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View className="flex-1 items-center justify-center px-10" style={[{ opacity: fadeAnim }]}>
      <Animated.View
        className="w-24 h-24 rounded-full bg-primary/5 items-center justify-center mb-6"
        style={{ transform: [{ translateY: floatAnim }] }}
      >
        <LinearGradient
          colors={isOnline ? [Colors.primary + '20', Colors.primary + '05'] : ['#9CA3AF40', '#9CA3AF10']}
          className="w-18 h-18 rounded-full items-center justify-center"
        >
          <MaterialCommunityIcons
            name={isOnline ? "car-connected" : "wifi-off"}
            size={44}
            color={isOnline ? Colors.primary : Colors.textTertiary}
          />
        </LinearGradient>
      </Animated.View>
      <Text className="text-xl font-inter-bold text-text mb-2 text-center">
        {isOnline ? 'Searching for rides...' : 'You are Offline'}
      </Text>
      <Text className="text-[13px] font-inter text-text-secondary text-center leading-5 opacity-70 px-4">
        {isOnline
          ? "We'll notify you as soon as someone nearby requests a ride. Keep the app open for better results!"
          : "Go back to the dashboard and toggle 'Go Online' to start receiving new ride requests in your area."}
      </Text>
    </Animated.View>
  );
}

export default function DriverRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { fetchPendingBookings, acceptBooking } = useBookings();
  const [pendingBookings, setPendingBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const loadPendingBookings = useCallback(async () => {
    try {
      const result = await fetchPendingBookings();
      setPendingBookings(result);
    } catch (e: any) {
      // Background silent poll
    } finally {
      setLoading(false);
    }
  }, [fetchPendingBookings]);

  useEffect(() => {
    loadPendingBookings();
    const interval = setInterval(() => { loadPendingBookings(); }, 5000);

    let socket: any;
    try {
      const apiUrl = getApiUrl();
      socket = io(apiUrl, { transports: ['websocket', 'polling'], path: '/socket.io' });
      socket.on('booking:new', () => { loadPendingBookings(); });
      socket.on('booking:updated', () => { loadPendingBookings(); });
    } catch (e) { }

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [loadPendingBookings]);

  const handleAccept = async (bookingId: string) => {
    setAcceptingId(bookingId);
    try {
      const result = await acceptBooking(bookingId);
      if (result.success) {
        router.push({ pathname: '/driver/active-ride' as any, params: { bookingId } });
      } else {
        Alert.alert('In Progress', result.error || 'This ride is no longer available');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Something went wrong while accepting the ride');
    } finally {
      setAcceptingId(null);
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'auto': return 'rickshaw';
      case 'tempo': return 'van-utility';
      case 'truck': return 'truck';
      default: return 'truck';
    }
  };

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        className="px-6 pb-6 rounded-b-[32px] shadow-2xl"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/10"
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-lg font-inter-bold text-surface">New Requests</Text>
            <View className="flex-row items-center mt-1">
              <View className="w-1 h-1 rounded-full bg-accent mr-2" />
              <Text className="text-[9px] font-inter-bold text-accent uppercase tracking-[1.5px]">Live Radar</Text>
            </View>
          </View>
          <View className="w-10" />
        </View>
      </LinearGradient>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="mt-4 text-text-tertiary font-inter-medium text-xs">Scanning for requests...</Text>
        </View>
      ) : (
        <FlatList
          data={pendingBookings}
          renderItem={({ item, index }) => (
            <AnimatedRequestCard
              item={item}
              index={index}
              acceptingId={acceptingId}
              onAccept={handleAccept}
              getVehicleIcon={getVehicleIcon}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 18, paddingBottom: bottomInset + 20, flexGrow: 1 }}
          ListEmptyComponent={<AnimatedEmptyState isOnline={user?.isOnline ?? false} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({});
