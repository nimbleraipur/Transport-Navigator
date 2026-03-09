import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/contexts/BookingContext';
import { useNotifications } from '@/contexts/NotificationContext';
import Colors from '@/constants/colors';
import Map from '@/components/Map';

function PulsingDot() {
  // Removing Animated.View to prevent nativewind unmount crashes during rapid state switches
  return (
    <View className="w-10 h-10 items-center justify-center">
      <View
        className="absolute w-6 h-6 rounded-full bg-primary/30"
      />
      <View className="w-3.5 h-3.5 rounded-full bg-primary border-2 border-white shadow-sm" />
    </View>
  );
}

export default function CustomerHomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bookings, fetchBookings, getActiveBooking } = useBookings();
  const { unreadCount } = useNotifications();

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const bottomSheetSlide = useRef(new Animated.Value(100)).current;
  const bannerSlide = useRef(new Animated.Value(-100)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const activeBooking = getActiveBooking();

  useEffect(() => {
    fetchBookings();

    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
      Animated.spring(bottomSheetSlide, { toValue: 0, tension: 30, friction: 9, useNativeDriver: true })
    ]).start();
  }, []);

  useEffect(() => {
    if (activeBooking) {
      Animated.spring(bannerSlide, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }).start();
    } else {
      Animated.timing(bannerSlide, { toValue: -100, duration: 200, useNativeDriver: true }).start();
    }
  }, [!!activeBooking]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Looking for driver...';
      case 'accepted': return 'Driver on away';
      case 'in_progress': return 'Trip started';
      default: return 'Active';
    }
  };

  const mapScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.2, 1, 1],
    extrapolate: 'clamp',
  });

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '70%',
          transform: [{ scale: mapScale }]
        }}
      >
        {isFocused && <Map />}
        <LinearGradient
          colors={['rgba(8, 18, 32, 0.9)', 'rgba(8, 18, 32, 0)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.6 }}
        />
      </Animated.View>

      <Animated.View
        className="absolute top-0 left-0 right-0 z-10 px-6"
        style={{
          paddingTop: topInset + 12,
          opacity: headerFade,
          transform: [{ translateY: headerSlide }]
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            className="flex-row items-center flex-1 bg-white/5 p-1.5 rounded-xl border border-white/5"
            onPress={() => router.push('/customer/menu' as any)}
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/10">
              <Ionicons name="person" size={20} color={Colors.surface} />
            </View>
            <View className="ml-3">
              <Text className="text-[9px] font-inter-bold text-white/40 uppercase tracking-[1.5px]">Premium User</Text>
              <Text className="text-lg font-inter-bold text-surface">{user?.name || 'User'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center ml-3 border border-white/10 relative"
            onPress={() => router.push('/customer/notifications' as any)}
          >
            <Feather name="bell" size={20} color={Colors.surface} />
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-md bg-danger border-2 border-[#081220] items-center justify-center px-0.5">
                <Text className="text-[8px] font-inter-bold text-surface">{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Always mounted to avoid CSS interop crash on conditional mount */}
      <Animated.View
        pointerEvents={activeBooking ? 'auto' : 'none'}
        style={[
          {
            position: 'absolute',
            left: 20,
            right: 20,
            zIndex: 10,
            top: topInset + 85,
            opacity: bannerSlide.interpolate({
              inputRange: [-100, 0],
              outputRange: [0, 1],
              extrapolate: 'clamp'
            }),
            transform: [{ translateY: bannerSlide }]
          }
        ]}
      >
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.06)',
          }}
          onPress={() => activeBooking && router.push(`/customer/track-ride?bookingId=${activeBooking.id}` as any)}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <PulsingDot />
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', fontFamily: 'Inter_700Bold' }}>Ongoing Activity</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.primary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {activeBooking ? getStatusLabel(activeBooking.status) : ''}
              </Text>
            </View>
          </View>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(27, 110, 243, 0.05)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] pt-6 shadow-2xl"
        style={{
          paddingBottom: bottomInset + 10,
          transform: [{ translateY: bottomSheetSlide }]
        }}
      >
        <ScrollView
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          className="px-5"
        >
          <View className="items-center mb-6">
            <View className="w-10 h-1 bg-gray-100 rounded-full mb-5" />
            <Text className="text-xl font-inter-bold text-text text-center">Where are we going?</Text>
            <Text className="text-[13px] font-inter-medium text-text-tertiary mt-1.5">Pick a destination for your ride</Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/customer/new-booking' as any)}
            activeOpacity={0.9}
            className="mb-6"
          >
            <View className="flex-row items-center bg-gray-50 rounded-[20px] px-4 py-4 border border-gray-100">
              <View className="w-9 h-9 rounded-lg bg-primary/10 items-center justify-center mr-3">
                <Ionicons name="search" size={20} color={Colors.primary} />
              </View>
              <Text className="flex-1 text-base font-inter-bold text-text-secondary">Where to?</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.divider} />
            </View>
          </TouchableOpacity>

          {/* <View className="flex-row items-center justify-between mb-5 px-1">
            <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px]">Quick Actions</Text>
          </View>

          <View className="flex-row justify-between mb-4">
            <TouchableOpacity className="flex-1 mr-2.5 bg-surface p-3.5 rounded-2xl border border-gray-50 items-center">
              <View className="w-10 h-10 bg-accent/10 rounded-xl items-center justify-center mb-2.5">
                <MaterialCommunityIcons name="history" size={20} color={Colors.accent} />
              </View>
              <Text className="text-[11px] font-inter-bold text-text">Activity</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 mx-1.5 bg-surface p-3.5 rounded-2xl border border-gray-50 items-center">
              <View className="w-10 h-10 bg-warning/10 rounded-xl items-center justify-center mb-2.5">
                <Ionicons name="heart" size={20} color={Colors.warning} />
              </View>
              <Text className="text-[11px] font-inter-bold text-text">Saved</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 ml-2.5 bg-surface p-3.5 rounded-2xl border border-gray-50 items-center">
              <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mb-2.5">
                <Ionicons name="help-buoy" size={20} color={Colors.primary} />
              </View>
              <Text className="text-[11px] font-inter-bold text-text">Help</Text>
            </TouchableOpacity>
          </View> */}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({});
