import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useNotifications } from '@/contexts/NotificationContext';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clearAll } = useNotifications();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const topInset = insets.top + webTop;

  const handleClearNotifications = () => {
    Alert.alert('Clear Notifications', 'Are you sure you want to clear all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearAll },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        className="pb-4 rounded-b-2xl shadow-sm"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center justify-between px-5">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.surface} />
          </TouchableOpacity>
          <Text className="text-lg font-inter-semibold text-surface">Settings</Text>
          <View className="w-10" />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="text-[11px] font-inter-semibold text-text-tertiary uppercase tracking-wider mb-2.5 ml-1">Notifications</Text>
        <View className="bg-surface rounded-2xl border border-gray-100 overflow-hidden mb-5 shadow-sm">
          <View className="flex-row items-center justify-between py-3.5 px-4 border-b border-gray-50">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
              <Text className="text-[15px] font-inter-medium text-text">Push Notifications</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={pushEnabled ? Colors.primary : Colors.textTertiary}
            />
          </View>
          <View className="flex-row items-center justify-between py-3.5 px-4">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="volume-high-outline" size={20} color={Colors.primary} />
              <Text className="text-[15px] font-inter-medium text-text">Sound</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={soundEnabled ? Colors.primary : Colors.textTertiary}
            />
          </View>
        </View>

        <Text className="text-[11px] font-inter-semibold text-text-tertiary uppercase tracking-wider mb-2.5 ml-1">Privacy</Text>
        <View className="bg-surface rounded-2xl border border-gray-100 overflow-hidden mb-5 shadow-sm">
          <View className="flex-row items-center justify-between py-3.5 px-4">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="location-outline" size={20} color={Colors.primary} />
              <Text className="text-[15px] font-inter-medium text-text">Location Access</Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={locationEnabled ? Colors.primary : Colors.textTertiary}
            />
          </View>
        </View>

        <Text className="text-[11px] font-inter-semibold text-text-tertiary uppercase tracking-wider mb-2.5 ml-1">Data</Text>
        <View className="bg-surface rounded-2xl border border-gray-100 overflow-hidden mb-5 shadow-sm">
          <TouchableOpacity
            className="flex-row items-center justify-between py-3.5 px-4"
            onPress={handleClearNotifications}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center space-x-3">
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              <Text className="text-[15px] font-inter-medium text-danger">Clear All Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text className="text-[11px] font-inter-semibold text-text-tertiary uppercase tracking-wider mb-2.5 ml-1">About</Text>
        <View className="bg-surface rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <View className="flex-row items-center justify-between py-3.5 px-4 border-b border-gray-50">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
              <Text className="text-[15px] font-inter-medium text-text">App Version</Text>
            </View>
            <Text className="text-sm font-inter text-text-tertiary">1.0.0</Text>
          </View>
          <View className="flex-row items-center justify-between py-3.5 px-4">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="code-slash-outline" size={20} color={Colors.textSecondary} />
              <Text className="text-[15px] font-inter-medium text-text">Build</Text>
            </View>
            <Text className="text-sm font-inter text-text-tertiary">2026.02</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
