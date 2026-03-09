import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, LayoutAnimation } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

const FAQ_ITEMS = [
  { q: 'How do I go online?', a: 'Toggle the Online/Offline switch on your dashboard header. You must be online to receive ride requests.' },
  { q: 'How do I accept a ride?', a: 'When online, go to "New Ride Requests" on the dashboard. Tap on a request to view details, then tap "Accept" to take the ride.' },
  { q: 'How does OTP verification work?', a: 'After accepting a ride, meet the customer at the pickup location. Ask for their 4-digit OTP and enter it to confirm the pickup and start the trip.' },
  { q: 'How do I complete a delivery?', a: 'Once you reach the delivery location and hand over the goods, tap "Complete Delivery" on the active ride screen.' },
  { q: 'How are my earnings calculated?', a: 'You earn the full fare for each completed trip. The fare includes a base charge plus a per-kilometer charge based on the vehicle type.' },
  { q: 'What if a customer cancels?', a: 'If a customer cancels after you have accepted, the booking will be updated. You can then go back online to accept new requests.' },
  { q: 'How do I update my vehicle details?', a: 'Vehicle details are set during registration. Contact support if you need to change your vehicle type or number.' },
  { q: 'What if I face an issue during a ride?', a: 'Use the SOS button on the active ride screen to contact emergency services, or reach out to our support team.' },
];

function FAQItem({ item }: { item: typeof FAQ_ITEMS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-2.5 border border-gray-50 shadow-sm"
      onPress={toggle}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-inter-semibold text-text flex-1 mr-3 leading-5">{item.q}</Text>
        <View className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center">
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textTertiary} />
        </View>
      </View>
      {expanded && (
        <Text className="text-[12px] font-inter-medium text-text-secondary leading-5 mt-3.5 pt-3.5 border-t border-gray-50">
          {item.a}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function DriverHelpScreen() {
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
          <Text className="flex-1 text-center text-lg font-inter-bold text-surface mr-10">Driver Assistance</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
        className="flex-1 -mt-5"
      >
        <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px] mb-6 ml-1">Frequently Asked Questions</Text>
        {FAQ_ITEMS.map((item, i) => (
          <FAQItem key={i} item={item} />
        ))}

        <View className="items-center mt-10 pt-4 px-6 border-t border-gray-100">
          <Text className="text-[11px] font-inter-medium text-text-tertiary text-center leading-4 opacity-60">
            For critical issues during an active mission, please use the SOS button on the job terminal.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
