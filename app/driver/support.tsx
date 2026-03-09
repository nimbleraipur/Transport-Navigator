import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

const SUPPORT_OPTIONS = [
  { icon: 'mail-outline', label: 'Email Us', desc: 'driver-support@transportgo.in', action: 'mailto:driver-support@transportgo.in' },
  { icon: 'call-outline', label: 'Call Us', desc: '+91 731-XXXX-XXX', action: 'tel:+917310000000' },
  { icon: 'logo-whatsapp', label: 'WhatsApp', desc: 'Chat with us on WhatsApp', action: 'https://wa.me/917310000000' },
];

const TOPICS = [
  { icon: 'car-outline', title: 'Ride Issues', desc: 'Problems with ride requests, navigation, or completion' },
  { icon: 'cash-outline', title: 'Earnings & Payments', desc: 'Earnings queries, payment delays, or payout issues' },
  { icon: 'person-outline', title: 'Account & Documents', desc: 'Profile updates, vehicle details, or document verification' },
  { icon: 'alert-circle-outline', title: 'Report an Incident', desc: 'Report safety concerns or customer misconduct' },
  { icon: 'construct-outline', title: 'Vehicle Issues', desc: 'Vehicle breakdown, change of vehicle, or maintenance' },
];

export default function DriverSupportScreen() {
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
          <Text className="flex-1 text-center text-lg font-inter-bold text-surface mr-10">Terminal Support</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
        className="flex-1 -mt-5"
      >
        <View className="bg-white rounded-[28px] p-5 border border-gray-50 shadow-sm mb-8">
          <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-4 ml-1">Live Channels</Text>
          <View className="space-y-2.5">
            {SUPPORT_OPTIONS.map((item, i) => (
              <TouchableOpacity
                key={i}
                className="flex-row items-center bg-gray-50/50 rounded-2xl p-3 border border-gray-50"
                onPress={() => Linking.openURL(item.action)}
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-xl bg-primary/5 items-center justify-center">
                  <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
                </View>
                <View className="flex-1 ml-3.5">
                  <Text className="text-[13px] font-inter-bold text-text">{item.label}</Text>
                  <Text className="text-[11px] font-inter-medium text-text-tertiary mt-0.5">{item.desc}</Text>
                </View>
                <View className="w-7 h-7 rounded-full bg-white items-center justify-center shadow-sm">
                  <Ionicons name="chevron-forward" size={12} color={Colors.textTertiary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-5 ml-1">Common Inquiries</Text>
        {TOPICS.map((item, i) => (
          <View
            key={i}
            className="flex-row items-start bg-white rounded-2xl p-4 mb-3 border border-gray-50 shadow-sm"
          >
            <View className="w-9 h-9 rounded-xl bg-primary/5 items-center justify-center">
              <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
            </View>
            <View className="flex-1 ml-4 pt-0.5">
              <Text className="text-[14px] font-inter-bold text-text mb-1">{item.title}</Text>
              <Text className="text-[12px] font-inter-medium text-text-tertiary leading-5">{item.desc}</Text>
            </View>
          </View>
        ))}

        <View className="flex-row items-start mt-6 p-4 bg-surface rounded-2xl border border-gray-50">
          <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center mr-3">
            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-inter-bold text-text mb-1.5">Dispatch Support Hours</Text>
            <View className="flex-row items-center mb-1">
              <View className="w-1.5 h-1.5 rounded-full bg-success mr-2" />
              <Text className="text-[11px] font-inter-bold text-text-secondary">24/7 for active mission emergency</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2" />
              <Text className="text-[11px] font-inter-medium text-text-tertiary">Mon-Sat 09:00 - 20:00 for general queries</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
