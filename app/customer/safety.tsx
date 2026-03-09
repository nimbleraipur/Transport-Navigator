import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

const SAFETY_FEATURES = [
  { icon: 'shield-checkmark', title: 'Verified Drivers', desc: 'All drivers are verified and approved before accepting rides.' },
  { icon: 'location', title: 'Live Tracking', desc: 'Track your ride in real-time and share your trip with family.' },
  { icon: 'key', title: 'OTP Verification', desc: 'Secure pickup with 4-digit OTP shared only between you and the driver.' },
  { icon: 'call', title: 'Emergency Contact', desc: 'Quick access to emergency services during your ride.' },
  { icon: 'star', title: 'Driver Ratings', desc: 'Rate your driver after every trip to maintain service quality.' },
  { icon: 'document-text', title: 'Trip Records', desc: 'Complete history of all your trips for your records.' },
];

const EMERGENCY_NUMBERS = [
  { label: 'Police', number: '100', icon: 'shield' },
  { label: 'Ambulance', number: '108', icon: 'medkit' },
  { label: 'Women Helpline', number: '1091', icon: 'call' },
];

export default function SafetyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTop = Platform.OS === 'web' ? 67 : 0;
  const topInset = insets.top + webTop;

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
          <Text className="text-lg font-inter-semibold text-surface">Safety</Text>
          <View className="w-10" />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="bg-red-50 rounded-2xl p-5 mb-6 border border-red-100 shadow-sm">
          <Text className="text-base font-inter-bold text-danger mb-1">Emergency Numbers</Text>
          <Text className="text-xs font-inter text-text-secondary mb-4">Tap to call in case of emergency</Text>
          <View className="space-y-2.5">
            {EMERGENCY_NUMBERS.map(item => (
              <TouchableOpacity
                key={item.number}
                className="flex-row items-center bg-surface rounded-xl p-3.5 space-x-3"
                onPress={() => Linking.openURL(`tel:${item.number}`)}
                activeOpacity={0.7}
              >
                <View className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center">
                  <Ionicons name={item.icon as any} size={18} color={Colors.danger} />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-inter-medium text-text">{item.label}</Text>
                  <Text className="text-base font-inter-bold text-danger">{item.number}</Text>
                </View>
                <Ionicons name="call" size={18} color={Colors.danger} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text className="text-base font-inter-semibold text-text mb-3">Safety Features</Text>
        {SAFETY_FEATURES.map((item, i) => (
          <View
            key={i}
            className="flex-row bg-surface rounded-2xl p-4 mb-2.5 border border-gray-100 space-x-3.5 items-start"
          >
            <View className="w-11 h-11 rounded-xl bg-primary-light items-center justify-center">
              <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-inter-semibold text-text mb-1">{item.title}</Text>
              <Text className="text-[13px] font-inter text-text-secondary leading-4.5">{item.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
