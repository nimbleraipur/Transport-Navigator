import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useNotifications } from '@/contexts/NotificationContext';

export default function DriverSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clearAll } = useNotifications();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const handleClearNotifications = () => {
    Alert.alert('Clear Notifications', 'Are you sure you want to clear all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearAll },
    ]);
  };

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        className="pb-10 rounded-b-[32px] shadow-2xl"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center px-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/5"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-inter-bold text-surface mr-10">Preferences</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
        className="flex-1 -mt-5"
      >
        <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-3 ml-1">Notifications</Text>
        <View className="bg-white rounded-2xl border border-gray-50 overflow-hidden mb-6 shadow-sm">
          <View className="flex-row items-center justify-between py-3.5 px-4 border-b border-gray-50">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-primary/5 items-center justify-center mr-3">
                <Ionicons name="notifications-outline" size={16} color={Colors.primary} />
              </View>
              <Text className="text-[14px] font-inter-semibold text-text">Push Notifications</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#E5E7EB', true: Colors.primaryLight }}
              thumbColor={pushEnabled ? Colors.primary : '#9CA3AF'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
          <View className="flex-row items-center justify-between py-3.5 px-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-primary/5 items-center justify-center mr-3">
                <Ionicons name="volume-high-outline" size={16} color={Colors.primary} />
              </View>
              <Text className="text-[14px] font-inter-semibold text-text">Sound</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#E5E7EB', true: Colors.primaryLight }}
              thumbColor={soundEnabled ? Colors.primary : '#9CA3AF'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>

        <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-3 ml-1">Privacy</Text>
        <View className="bg-white rounded-2xl border border-gray-50 overflow-hidden mb-6 shadow-sm">
          <View className="flex-row items-center justify-between py-3.5 px-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-primary/5 items-center justify-center mr-3">
                <Ionicons name="location-outline" size={16} color={Colors.primary} />
              </View>
              <Text className="text-[14px] font-inter-semibold text-text">Share Location</Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: '#E5E7EB', true: Colors.primaryLight }}
              thumbColor={locationEnabled ? Colors.primary : '#9CA3AF'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>

        <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-3 ml-1">Data Management</Text>
        <View className="bg-white rounded-2xl border border-gray-50 overflow-hidden mb-6 shadow-sm">
          <TouchableOpacity
            className="flex-row items-center justify-between py-4 px-4"
            onPress={handleClearNotifications}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-danger/5 items-center justify-center mr-3">
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </View>
              <Text className="text-[14px] font-inter-semibold text-danger">Clear All Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-3 ml-1">App Details</Text>
        <View className="bg-white rounded-2xl border border-gray-50 overflow-hidden shadow-sm">
          <View className="flex-row items-center justify-between py-4 px-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-gray-50 items-center justify-center mr-3">
                <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
              </View>
              <Text className="text-[14px] font-inter-semibold text-text">Version</Text>
            </View>
            <Text className="text-[13px] font-inter-bold text-text-tertiary">1.0.0 (RT-LIVE)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
