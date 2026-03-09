import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useNotifications, type NotificationItem } from '@/contexts/NotificationContext';

const typeIcons: Record<string, { name: string; color: string; bg: string }> = {
  booking: { name: 'car-outline', color: Colors.primary, bg: Colors.primaryLight },
  system: { name: 'information-circle-outline', color: Colors.accent, bg: 'rgba(0,201,167,0.12)' },
  promo: { name: 'gift-outline', color: Colors.warning, bg: Colors.warningLight },
  safety: { name: 'shield-checkmark-outline', color: Colors.success, bg: Colors.successLight },
};

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Live now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotificationCard({ item, index, onPress }: { item: NotificationItem; index: number; onPress: () => void }) {
  const config = typeIcons[item.type] || typeIcons.system;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 50, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        className={`flex-row mx-6 mb-3 p-4 bg-white rounded-2xl border ${item.read ? 'border-gray-50' : 'border-primary/10 shadow-xl shadow-primary/5'}`}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mr-3.5"
          style={{ backgroundColor: config.bg }}
        >
          <Ionicons name={config.name as any} size={20} color={config.color} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className={`text-[15px] flex-1 ${item.read ? 'font-inter-semibold text-text-secondary' : 'font-inter-bold text-text'}`} numberOfLines={1}>{item.title}</Text>
            {!item.read && (
              <View className="w-2 h-2 rounded-full bg-primary ml-2 shadow-sm" />
            )}
          </View>
          <Text className="text-[13px] font-inter-medium text-text-tertiary leading-5" numberOfLines={2}>{item.message}</Text>
          <View className="flex-row items-center mt-2.5">
            <Feather name="clock" size={10} color={Colors.divider} style={{ marginRight: 6 }} />
            <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-wider">{getTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DriverNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        className="pb-8 rounded-b-[32px] shadow-2xl"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center justify-between px-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/5"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <Text className="text-lg font-inter-bold text-surface">Dispatch Alerts</Text>
          {unreadCount > 0 ? (
            <TouchableOpacity
              onPress={markAllAsRead}
              className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/5"
            >
              <Ionicons name="checkmark-done" size={20} color={Colors.surface} />
            </TouchableOpacity>
          ) : <View className="w-10" />}
        </View>
      </LinearGradient>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingVertical: 24, paddingBottom: bottomInset + 40 }}
        renderItem={({ item, index }) => (
          <NotificationCard item={item} index={index} onPress={() => markAsRead(item.id)} />
        )}
        ListEmptyComponent={
          <View className="items-center justify-center pt-24 px-10">
            <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-6">
              <Feather name="bell-off" size={32} color={Colors.divider} />
            </View>
            <Text className="text-xl font-inter-bold text-text mb-2">Clear Terminal</Text>
            <Text className="text-[13px] font-inter-medium text-text-tertiary text-center leading-5 px-6">You are all caught up. New dispatch alerts will be displayed here.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({});
