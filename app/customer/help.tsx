import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, LayoutAnimation } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

const FAQ_ITEMS = [
  { q: 'How do I book a ride?', a: 'Tap the search bar on the home screen, select your pickup and delivery locations, choose a vehicle type, and confirm your booking.' },
  { q: 'What vehicle types are available?', a: 'We offer three vehicle types: Auto (up to 200kg), Tempo (up to 1000kg), and Truck (1000kg+). Pricing varies by vehicle type.' },
  { q: 'How does OTP verification work?', a: 'When your booking is accepted, you receive a 4-digit OTP. Share this with your driver at pickup to confirm the correct driver has arrived.' },
  { q: 'Can I cancel a booking?', a: 'Yes, you can cancel a pending or accepted booking from the track ride screen. Note that cancellation after pickup may not be available.' },
  { q: 'How is pricing calculated?', a: 'Pricing consists of a base fare plus a per-kilometer charge. The total is calculated based on the distance between pickup and delivery locations.' },
  { q: 'How do I rate my driver?', a: 'After your delivery is completed, you will be prompted to rate your driver on a 1-5 scale and optionally leave a comment.' },
  { q: 'Is my data safe?', a: 'Yes, we use secure authentication with JWT tokens. Your personal data is encrypted and protected according to industry standards.' },
  { q: 'What payment methods are accepted?', a: 'Currently we support Cash and UPI payments. You can select your preferred payment method during booking.' },
];

function FAQItem({ item }: { item: typeof FAQ_ITEMS[0] }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl p-4 mb-2 border border-gray-100"
      onPress={toggle}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-inter-medium text-text flex-1 mr-2">{item.q}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textTertiary} />
      </View>
      {expanded && (
        <Text className="text-[13px] font-inter text-text-secondary leading-5 mt-3 pt-3 border-t border-gray-50">
          {item.a}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
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
          <Text className="text-lg font-inter-semibold text-surface">Help</Text>
          <View className="w-10" />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="text-base font-inter-semibold text-text mb-4">Frequently Asked Questions</Text>
        {FAQ_ITEMS.map((item, i) => (
          <FAQItem key={i} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
