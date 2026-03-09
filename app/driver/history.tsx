import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Platform, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useBookings, type BookingData } from '@/contexts/BookingContext';

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: Colors.warning, label: 'Broadcasted' },
  accepted: { color: Colors.primary, label: 'Confirmed' },
  in_progress: { color: Colors.accent, label: 'In Transit' },
  completed: { color: Colors.success, label: 'Finished' },
  cancelled: { color: Colors.danger, label: 'Aborted' },
};

const vehicleIcons: Record<string, any> = {
  auto: 'rickshaw',
  tempo: 'van-utility',
  truck: 'truck',
};

function AnimatedBookingCard({ booking, index }: { booking: BookingData; index: number }) {
  const config = statusConfig[booking.status] || { color: Colors.textSecondary, label: booking.status };
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 80;
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
      <View className="bg-white rounded-2xl mb-4 p-4 border border-gray-50 shadow-xl shadow-black/5">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-xl bg-gray-50 items-center justify-center mr-3.5 border border-gray-100">
              <MaterialCommunityIcons name={vehicleIcons[booking.vehicleType] || 'truck'} size={22} color={Colors.text} />
            </View>
            <View>
              <Text className="text-sm font-inter-bold text-text uppercase tracking-tight">{booking.vehicleType}</Text>
              <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-widest mt-0.5">
                {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-lg font-inter-bold text-text">₹{booking.totalPrice}</Text>
            <View className="flex-row items-center mt-1">
              <View className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: config.color }} />
              <Text className="text-[9px] font-inter-bold uppercase tracking-[1.5px]" style={{ color: config.color }}>{config.label}</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-4">
          <View className="items-center mr-3.5">
            <View className="w-3.5 h-3.5 rounded-full bg-success/20 items-center justify-center">
              <View className="w-1.5 h-1.5 rounded-full bg-success" />
            </View>
            <View className="w-px h-5 bg-gray-200 my-1" />
            <View className="w-3.5 h-3.5 rounded-full bg-danger/20 items-center justify-center">
              <View className="w-1.5 h-1.5 rounded-full bg-danger" />
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-inter-bold text-text mb-2.5" numberOfLines={1}>{booking.pickup.name}</Text>
            <Text className="text-[13px] font-inter-bold text-text" numberOfLines={1}>{booking.delivery.name}</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between px-1">
          <View className="flex-row items-center space-x-5">
            <View className="flex-row items-center">
              <Feather name="navigation" size={12} color={Colors.divider} style={{ marginRight: 6 }} />
              <Text className="text-[11px] font-inter-bold text-text-secondary">{booking.distance} km</Text>
            </View>
            <View className="flex-row items-center">
              <Feather name="user" size={12} color={Colors.divider} style={{ marginRight: 6 }} />
              <Text className="text-[11px] font-inter-bold text-text-secondary" numberOfLines={1}>{booking.customerName.split(' ')[0]}</Text>
            </View>
          </View>
          <View className="px-2.5 py-1 bg-primary/5 rounded-lg">
            <Text className="text-[9px] font-inter-bold text-primary uppercase">Report</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function DriverHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookings, fetchBookings, loading } = useBookings();

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  useEffect(() => { fetchBookings(); }, []);

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        className="pb-8 rounded-b-[32px] shadow-2xl"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center px-6">
          <TouchableOpacity
            onPress={() => router.replace('/driver/dashboard' as any)}
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/5"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-inter-bold text-surface mr-10">Earnings History</Text>
        </View>
      </LinearGradient>

      {loading && bookings.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="mt-4 text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[3px]">Syncing terminal...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: bottomInset + 20 }}
          renderItem={({ item, index }) => <AnimatedBookingCard booking={item} index={index} />}
          ListEmptyComponent={
            <View className="items-center justify-center pt-20 px-10">
              <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-6">
                <MaterialCommunityIcons name="clipboard-text-outline" size={40} color={Colors.divider} />
              </View>
              <Text className="text-xl font-inter-bold text-text text-center mb-2">Empty Ledger</Text>
              <Text className="text-[13px] font-inter-medium text-text-tertiary text-center leading-5 px-4">Your professional trip logs will appear once you complete a transportation job.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({});
