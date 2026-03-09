import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Animated, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

const MENU_ITEMS = [
  { id: 'profile', label: 'Driver Profile', icon: 'person-outline' as const, color: '#1B6EF3', route: '/driver/profile' },
  { id: 'history', label: 'Trip History', icon: 'time-outline' as const, color: '#10B981', route: '/driver/history' },
  { id: 'notifications', label: 'Broadcasts', icon: 'notifications-outline' as const, color: '#F59E0B', route: '/driver/notifications' },
  { id: 'safety', label: 'Road Safety', icon: 'shield-checkmark-outline' as const, color: '#EF4444', route: '/driver/safety' },
  { id: 'settings', label: 'Preferences', icon: 'settings-outline' as const, color: '#6366F1', route: '/driver/settings' },
  { id: 'help', label: 'Driver Support', icon: 'help-circle-outline' as const, color: '#EC4899', route: '/driver/help' },
];

function AnimatedMenuItem({ item, index, onPress }: { item: typeof MENU_ITEMS[0]; index: number; onPress: () => void }) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: index * 80, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        className="flex-row items-center justify-between bg-white mx-5 mb-2.5 p-3.5 rounded-2xl border border-gray-50 shadow-sm"
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl items-center justify-center mr-3.5" style={{ backgroundColor: item.color + '10' }}>
            <Ionicons name={item.icon as any} size={20} color={item.color} />
          </View>
          <Text className="text-[15px] font-inter-semibold text-text">{item.label}</Text>
        </View>
        <View className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center">
          <Ionicons name="chevron-forward" size={14} color={Colors.divider} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DriverMenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const handleLogout = async () => {
    Alert.alert(
      'End Shift',
      'Are you sure you want to log out from your driver account?',
      [
        { text: 'Stay Online', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const vehicleLabel = user?.vehicleType ? user.vehicleType.charAt(0).toUpperCase() + user.vehicleType.slice(1) : 'Standard';

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        className="pb-10 rounded-b-[32px] shadow-2xl"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center px-6 mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/5"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-inter-bold text-surface mr-10">Driver Terminal</Text>
        </View>

        <View className="flex-row items-center px-8">
          <View className="w-16 h-16 rounded-2xl bg-white/10 items-center justify-center border border-white/10 shadow-2xl overflow-hidden">
            <LinearGradient
              colors={['#102238', '#1C2B4A']}
              className="w-full h-full items-center justify-center"
            >
              <FontAwesome5 name="user-tie" size={24} color={Colors.surface} />
            </LinearGradient>
          </View>
          <View className="ml-4.5 flex-1">
            <Text className="text-xl font-inter-bold text-surface">{user?.name || 'Driver'}</Text>
            <View className="flex-row items-center mt-1">
              <View className="bg-accent/20 px-2 py-0.5 rounded-lg border border-accent/20 mr-2">
                <Text className="text-[9px] font-inter-bold text-accent uppercase tracking-wider">{vehicleLabel}</Text>
              </View>
              <Text className="text-[11px] font-inter-medium text-white/40">{user?.vehicleNumber || 'Verified'}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 -mt-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {MENU_ITEMS.map((item, index) => (
            <AnimatedMenuItem
              key={item.id}
              item={item}
              index={index}
              onPress={() => router.push(item.route as any)}
            />
          ))}
        </View>

        <TouchableOpacity
          className="flex-row items-center justify-between mx-5 mt-6 p-4 bg-red-50 rounded-2xl border border-red-100"
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-xl bg-white items-center justify-center mr-3.5 shadow-sm">
              <Feather name="log-out" size={20} color={Colors.danger} />
            </View>
            <View>
              <Text className="text-sm font-inter-bold text-danger">Sign Out</Text>
              <Text className="text-[9px] font-inter-bold text-danger/40 uppercase tracking-widest mt-0.5">End active session</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color={Colors.danger} />
        </TouchableOpacity>

        <View className="items-center mt-10">
          <View className="bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
            <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[3.5px]">
              My Load 24 • Driver v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
