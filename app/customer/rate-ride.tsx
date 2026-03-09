import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert, Animated, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useBookings } from '@/contexts/BookingContext';

const feedbackTags = ['Elite Professional', 'Road Master', 'On Time', 'Goods Secure', 'Clean Fleet', 'Polite Hub'];

function StarButton({ index, rating, onPress }: { index: number; rating: number; onPress: (n: number) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const selected = index <= rating;

  function handlePress() {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, friction: 3, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onPress(index);
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} className="px-1">
        <Ionicons name={selected ? 'star' : 'star-outline'} size={48} color={selected ? '#F59E0B' : '#E5E7EB'} />
        {selected && (
          <Animated.View className="absolute inset-0 items-center justify-center opacity-20">
            <Ionicons name="star" size={56} color="#F59E0B" />
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RateRideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bookingId: string }>();
  const { getBookingById, rateBooking } = useBookings();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const booking = getBookingById(params.bookingId || '');

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function handleSubmit() {
    if (rating === 0) { Alert.alert('Rating Required', 'Please provide a star rating for your journey.'); return; }
    if (!params.bookingId) return;
    setLoading(true);
    const fullComment = [...selectedTags, comment.trim()].filter(Boolean).join('. ');
    const result = await rateBooking(params.bookingId, rating, fullComment || undefined);
    setLoading(false);
    if (result.success) {
      router.replace('/customer/home' as any);
    } else {
      Alert.alert('Submission Error', result.error || 'Failed to submit your feedback.');
    }
  }

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.success, '#065F46']}
        className="pb-20 rounded-b-[60px] shadow-2xl items-center"
        style={{ paddingTop: topInset + 32 }}
      >
        <View className="w-24 h-24 bg-white/20 rounded-[40px] items-center justify-center mb-6 border border-white/20">
          <Ionicons name="checkmark-done" size={48} color="#FFF" />
        </View>
        <Text className="text-2xl font-inter-black text-white uppercase tracking-[4px]">Mission Accomplished</Text>
        <Text className="text-sm font-inter-medium text-white/60 mt-2">The transportation job has been finalized</Text>
      </LinearGradient>

      <ScrollView
        className="flex-1 -mt-12"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: bottomInset + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="bg-white rounded-[40px] p-8 shadow-2xl shadow-black/5 border border-gray-50 mb-8">
          <View className="items-center mb-8">
            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[4px] mb-6">Service Quality</Text>
            <View className="flex-row items-center mb-3">
              {[1, 2, 3, 4, 5].map(i => (
                <StarButton key={i} index={i} rating={rating} onPress={setRating} />
              ))}
            </View>
            <Text className="text-lg font-inter-bold text-text mt-2">
              {rating === 0 ? 'How was the service?' : rating <= 2 ? 'Subpar Experience' : rating <= 4 ? 'Great Service' : 'Exceptional Partner'}
            </Text>
          </View>

          <View className="mb-10">
            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[3px] mb-5">Professional Badges</Text>
            <View className="flex-row flex-wrap gap-3">
              {feedbackTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    className={`px-5 py-3 rounded-2xl border ${isSelected ? 'bg-primary/5 border-primary' : 'bg-gray-50 border-gray-50'}`}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-xs font-inter-bold ${isSelected ? 'text-primary' : 'text-text-secondary'}`}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="mb-0">
            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[3px] mb-5">Extended Feedback</Text>
            <View className="bg-gray-50 rounded-3xl p-5 border border-gray-100 min-h-[120px]">
              <TextInput
                className="text-sm font-inter-bold text-text flex-1"
                placeholder="Detailed observations about the partner or transit..."
                placeholderTextColor="rgba(0,0,0,0.15)"
                value={comment}
                onChangeText={setComment}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
          className="h-16 rounded-[24px] overflow-hidden shadow-2xl shadow-primary/30"
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="flex-1 flex-row items-center justify-center"
          >
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text className="text-lg font-inter-bold text-white mr-3">Secure Review</Text>
                <Ionicons name="shield-checkmark" size={20} color="#FFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-6 py-2 items-center"
          onPress={() => router.replace('/customer/home' as any)}
        >
          <Text className="text-sm font-inter-bold text-text-tertiary uppercase tracking-widest">Decide Later</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
