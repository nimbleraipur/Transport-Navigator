import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Animated, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MENU_ITEMS = [
  { id: 'profile', label: 'My Profile', icon: 'person-outline' as const, color: '#1B6EF3', route: '/customer/profile' },
  { id: 'history', label: 'Ride History', icon: 'time-outline' as const, color: '#10B981', route: '/customer/history' },
  { id: 'notifications', label: 'Alerts', icon: 'notifications-outline' as const, color: '#F59E0B', route: '/customer/notifications' },
  { id: 'safety', label: 'Safety Center', icon: 'shield-checkmark-outline' as const, color: '#EF4444', route: '/customer/safety' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' as const, color: '#6366F1', route: '/customer/settings' },
  { id: 'help', label: 'Help & FAQ', icon: 'help-circle-outline' as const, color: '#EC4899', route: '/customer/help' },
  { id: 'support', label: 'Connect Support', icon: 'headset-outline' as const, color: '#14B8A6', route: '/customer/support' },
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
        className="flex-row items-center justify-between bg-white mx-5 mb-3 p-4 rounded-[24px] border border-gray-50 shadow-sm"
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: item.color + '10' }}>
            <Ionicons name={item.icon as any} size={24} color={item.color} />
          </View>
          <Text className="text-base font-inter-bold text-text">{item.label}</Text>
        </View>
        <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center">
          <Ionicons name="chevron-forward" size={16} color={Colors.divider} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CustomerMenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to end your session?',
      [
        { text: 'Cancel', style: 'cancel' },
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

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        className="pb-10 rounded-b-[32px] shadow-2xl"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center px-6 mb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/5"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-inter-bold text-surface mr-10">Application Hub</Text>
        </View>

        <View className="flex-row items-center px-8">
          <View className="w-16 h-16 rounded-2xl bg-white/10 items-center justify-center border border-white/10 shadow-2xl text-center">
            <LinearGradient
              colors={['#102238', '#1C2B4A']}
              className="w-full h-full rounded-2xl items-center justify-center"
            >
              <Ionicons name="person" size={28} color={Colors.surface} />
            </LinearGradient>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-xl font-inter-bold text-surface">{user?.name || 'User'}</Text>
            <View className="flex-row items-center mt-1">
              <View className="w-1.5 h-1.5 rounded-full bg-accent mr-2" />
              <Text className="text-[13px] font-inter-medium text-white/50">{user?.phone || 'Account Verified'}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 -mt-4"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: bottomInset + 30 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              className="flex-row items-center justify-between bg-white mx-6 mb-2.5 p-3.5 rounded-2xl border border-gray-50 shadow-sm"
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3.5" style={{ backgroundColor: item.color + '10' }}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text className="text-sm font-inter-bold text-text">{item.label}</Text>
              </View>
              <View className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center">
                <Ionicons name="chevron-forward" size={14} color={Colors.divider} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          className="flex-row items-center justify-between mx-6 mt-6 p-4 bg-red-50 rounded-3xl border border-red-100"
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
          <View className="bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[3px]">
              My Load 24 • v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
