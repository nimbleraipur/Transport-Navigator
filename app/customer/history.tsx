import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Platform, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useBookings, type BookingData } from '@/contexts/BookingContext';

const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
  pending: { color: Colors.warning, label: 'Finding Driver', icon: 'hourglass-outline' },
  accepted: { color: Colors.primary, label: 'Trip Confirmed', icon: 'checkmark-circle-outline' },
  in_progress: { color: Colors.accent, label: 'On the Way', icon: 'navigate-outline' },
  completed: { color: Colors.success, label: 'Delivered', icon: 'shield-check-outline' },
  cancelled: { color: Colors.danger, label: 'Cancelled', icon: 'close-circle-outline' },
};

const vehicleIcons: Record<string, any> = {
  auto: 'rickshaw',
  tempo: 'van-utility',
  truck: 'truck',
};

function AnimatedBookingCard({ booking, onPress, index }: { booking: BookingData; onPress: () => void; index: number }) {
  const config = statusConfig[booking.status] || { color: Colors.textSecondary, label: booking.status, icon: 'help-circle-outline' };
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const delay = index * 100;
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, delay, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }, { scale: scaleAnim }], opacity: opacityAnim }}>
      <TouchableOpacity
        className="bg-white rounded-2xl mb-4 p-4 border border-gray-50 shadow-xl shadow-black/5"
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3.5 border border-gray-50 bg-gray-50/50`}>
              <MaterialCommunityIcons name={vehicleIcons[booking.vehicleType] || 'truck'} size={22} color={Colors.text} />
            </View>
            <View>
              <Text className="text-sm font-inter-bold text-text tracking-tight">{booking.vehicleType.toUpperCase()}</Text>
              <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-widest mt-0.5">
                {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-lg font-inter-bold text-text">₹{booking.totalPrice}</Text>
            <View className="flex-row items-center mt-1">
              <View className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: config.color }} />
              <Text className="text-[9px] font-inter-bold uppercase tracking-widest" style={{ color: config.color }}>{config.label}</Text>
            </View>
          </View>
        </View>

        <View className="bg-gray-50/50 rounded-xl p-3.5 border border-gray-50 mb-4">
          <View className="flex-row items-start">
            <View className="items-center mr-3.5 pt-1">
              <View className="w-3.5 h-3.5 rounded-full bg-success/20 items-center justify-center">
                <View className="w-1.5 h-1.5 rounded-full bg-success" />
              </View>
              <View className="w-px h-5 bg-gray-200 my-1" />
              <View className="w-3.5 h-3.5 rounded-full bg-danger/20 items-center justify-center">
                <View className="w-1.5 h-1.5 rounded-full bg-danger" />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-inter-semibold text-text mb-2.5" numberOfLines={1}>{booking.pickup.name}</Text>
              <Text className="text-[13px] font-inter-semibold text-text" numberOfLines={1}>{booking.delivery.name}</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-between px-1">
          <View className="flex-row items-center space-x-4">
            <View className="flex-row items-center">
              <Feather name="navigation" size={12} color={Colors.divider} style={{ marginRight: 6 }} />
              <Text className="text-[11px] font-inter-bold text-text-secondary">{booking.distance} km</Text>
            </View>
            {booking.rating ? (
              <View className="flex-row items-center ml-4">
                <Ionicons name="star" size={12} color={Colors.warning} style={{ marginRight: 6 }} />
                <Text className="text-[11px] font-inter-bold text-text">{booking.rating}</Text>
              </View>
            ) : null}
          </View>
          <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center">
            <Ionicons name="chevron-forward" size={16} color={Colors.divider} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-10">
      <View className="w-20 h-20 rounded-full bg-gray-50 items-center justify-center mb-6">
        <MaterialCommunityIcons name="clipboard-text-off-outline" size={40} color={Colors.divider} />
      </View>
      <Text className="text-xl font-inter-bold text-text text-center mb-2">No Journey Found</Text>
      <Text className="text-[13px] font-inter-medium text-text-tertiary text-center leading-5 px-4">
        Your travel history is currently empty. Start your first job from the terminal.
      </Text>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings, fetchBookings, loading } = useBookings();

  useEffect(() => { fetchBookings(); }, []);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  function handleBookingPress(booking: BookingData) {
    if (['pending', 'accepted', 'in_progress'].includes(booking.status)) {
      router.push({ pathname: '/customer/track-ride' as any, params: { bookingId: booking.id } });
    } else if (booking.status === 'completed' && !booking.rating) {
      router.push({ pathname: '/customer/rate-ride' as any, params: { bookingId: booking.id } });
    }
  }

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        className="pb-8 rounded-b-[32px] shadow-2xl"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center px-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/5"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-inter-bold text-surface mr-10">Trip Logs</Text>
        </View>
      </LinearGradient>

      {loading && bookings.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="mt-4 text-text-tertiary font-inter-bold text-[10px] uppercase tracking-[3px]">Syncing logs...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <AnimatedBookingCard booking={item} onPress={() => handleBookingPress(item)} index={index} />
          )}
          contentContainerStyle={{ padding: 24, paddingTop: 32, paddingBottom: bottomInset + 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({});
