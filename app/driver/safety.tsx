import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

const SAFETY_FEATURES = [
  { icon: 'shield-checkmark', title: 'Verified Trips', desc: 'All bookings are verified with OTP before starting the trip.' },
  { icon: 'location', title: 'Live Tracking', desc: 'Your location is shared with customers for transparency and safety.' },
  { icon: 'key', title: 'OTP Pickup', desc: 'Verify the customer at pickup with a 4-digit OTP to prevent fraud.' },
  { icon: 'call', title: 'Emergency SOS', desc: 'Quick emergency access available during active rides.' },
  { icon: 'cash', title: 'Secure Payments', desc: 'All payments are tracked and recorded for your safety.' },
  { icon: 'document-text', title: 'Trip Records', desc: 'Complete history of all your rides with full details.' },
];

const EMERGENCY_NUMBERS = [
  { label: 'Police', number: '100', icon: 'shield' },
  { label: 'Ambulance', number: '108', icon: 'medkit' },
  { label: 'Roadside Help', number: '1800-180-1234', icon: 'car' },
];

export default function DriverSafetyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

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
          <Text className="flex-1 text-center text-lg font-inter-bold text-surface mr-10">Safety Protocols</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
        className="flex-1 -mt-5"
      >
        <View className="bg-red-50/50 rounded-[28px] p-5 mb-8 border border-red-100 shadow-sm">
          <View className="flex-row items-center mb-1">
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text className="text-[13px] font-inter-bold text-danger ml-2 uppercase tracking-tight">Emergency Hotlines</Text>
          </View>
          <Text className="text-[11px] font-inter-medium text-text-tertiary mb-5 ml-6">Tap to dial in case of active threat or crash</Text>

          <View className="space-y-2.5">
            {EMERGENCY_NUMBERS.map(item => (
              <TouchableOpacity
                key={item.number}
                className="flex-row items-center bg-white rounded-xl p-3 border border-red-50/50"
                onPress={() => Linking.openURL(`tel:${item.number}`)}
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-xl bg-danger/5 items-center justify-center">
                  <Ionicons name={item.icon as any} size={18} color={Colors.danger} />
                </View>
                <View className="flex-1 ml-3.5">
                  <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-wider">{item.label}</Text>
                  <Text className="text-[15px] font-inter-bold text-danger">{item.number}</Text>
                </View>
                <View className="w-8 h-8 rounded-full bg-danger/5 items-center justify-center">
                  <Ionicons name="call" size={14} color={Colors.danger} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-6 ml-1">Embedded Features</Text>
        {SAFETY_FEATURES.map((item, i) => (
          <View
            key={i}
            className="flex-row bg-white rounded-2xl p-4 mb-3 border border-gray-50 shadow-sm items-start"
          >
            <View className="w-10 h-10 rounded-xl bg-primary/5 items-center justify-center">
              <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
            </View>
            <View className="flex-1 ml-4 pt-0.5">
              <Text className="text-[14px] font-inter-bold text-text mb-1">{item.title}</Text>
              <Text className="text-[12px] font-inter-medium text-text-tertiary leading-5">{item.desc}</Text>
            </View>
          </View>
        ))}

        <View className="items-center mt-8 px-8">
          <Text className="text-[11px] font-inter-medium text-text-tertiary text-center leading-4 opacity-50">
            Transport Navigator enforces strict safety standards for all mission assignments.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
