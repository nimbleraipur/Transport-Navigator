import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

const SUPPORT_OPTIONS = [
  { icon: 'mail-outline', label: 'Email Us', desc: 'support@transportgo.in', action: 'mailto:support@transportgo.in' },
  { icon: 'call-outline', label: 'Call Us', desc: '+91 731-XXXX-XXX', action: 'tel:+917310000000' },
  { icon: 'logo-whatsapp', label: 'WhatsApp', desc: 'Chat with us on WhatsApp', action: 'https://wa.me/917310000000' },
];

const TOPICS = [
  { icon: 'car-outline', title: 'Booking Issues', desc: 'Problems with creating or managing bookings' },
  { icon: 'cash-outline', title: 'Payment & Billing', desc: 'Payment failures, refunds, or billing queries' },
  { icon: 'person-outline', title: 'Account Issues', desc: 'Login problems, profile updates, or verification' },
  { icon: 'alert-circle-outline', title: 'Report an Incident', desc: 'Report safety concerns or misconduct' },
  { icon: 'chatbox-ellipses-outline', title: 'Feedback', desc: 'Share your experience and suggestions' },
];

export default function SupportScreen() {
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
          <Text className="text-lg font-inter-semibold text-surface">Support</Text>
          <View className="w-10" />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="bg-surface rounded-2xl p-5 border border-gray-100 shadow-sm mb-6">
          <Text className="text-base font-inter-semibold text-text mb-4">Get in Touch</Text>
          <View className="space-y-2.5">
            {SUPPORT_OPTIONS.map((item, i) => (
              <TouchableOpacity
                key={i}
                className="flex-row items-center bg-gray-50 rounded-xl p-3.5 space-x-3.5"
                onPress={() => Linking.openURL(item.action)}
                activeOpacity={0.7}
              >
                <View className="w-11 h-11 rounded-xl bg-primary-light items-center justify-center">
                  <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-inter-semibold text-text">{item.label}</Text>
                  <Text className="text-xs font-inter text-text-secondary mt-0.5">{item.desc}</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text className="text-base font-inter-semibold text-text mb-3">Help Topics</Text>
        {TOPICS.map((item, i) => (
          <View
            key={i}
            className="flex-row items-start bg-surface rounded-2xl p-4 mb-2 border border-gray-100 space-x-3.5"
          >
            <View className="w-10 h-10 rounded-xl bg-primary-light items-center justify-center">
              <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-inter-semibold text-text mb-0.5">{item.title}</Text>
              <Text className="text-xs font-inter text-text-secondary leading-4.5">{item.desc}</Text>
            </View>
          </View>
        ))}

        <View className="flex-row items-start space-x-3 mt-5 p-4 bg-surface rounded-2xl border border-gray-100">
          <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
          <View className="flex-1">
            <Text className="text-sm font-inter-semibold text-text mb-1">Support Hours</Text>
            <Text className="text-[13px] font-inter text-text-secondary leading-5">Monday - Saturday: 9:00 AM - 8:00 PM</Text>
            <Text className="text-[13px] font-inter text-text-secondary leading-5">Sunday: 10:00 AM - 6:00 PM</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
