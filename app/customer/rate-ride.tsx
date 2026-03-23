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
        <Ionicons name={selected ? 'star' : 'star-outline'} size={40} color={selected ? '#F59E0B' : '#CBD5E1'} />
        {selected && (
          <Animated.View className="absolute inset-0 items-center justify-center opacity-10">
            <Ionicons name="star" size={48} color="#F59E0B" />
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
    <View className="flex-1 bg-[#F8FAFC]">
      <LinearGradient
        colors={[Colors.primary, '#1E40AF']}
        className="pb-16 rounded-b-[48px] shadow-lg items-center"
        style={{ paddingTop: topInset + 16 }}
      >
        <View className="w-20 h-20 bg-white/10 rounded-full items-center justify-center mb-4 border border-white/20">
          <MaterialCommunityIcons name="star-face" size={44} color="#FFF" />
        </View>
        <Text className="text-xl font-inter-black text-white uppercase tracking-widest text-center px-4">Rate Your Experience</Text>
        <Text className="text-xs font-inter-medium text-white/70 mt-1">Help us improve the service</Text>
      </LinearGradient>

      <ScrollView
        className="flex-1 -mt-8"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomInset + 30 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-6">
          <View className="items-center mb-6">
            <Text className="text-[10px] font-inter-bold text-slate-400 uppercase tracking-[2px] mb-4">Driver Service Quality</Text>
            <View className="flex-row items-center mb-2">
              {[1, 2, 3, 4, 5].map(i => (
                <StarButton key={i} index={i} rating={rating} onPress={setRating} />
              ))}
            </View>
            <Text className="text-base font-inter-bold text-slate-700 mt-2">
              {rating === 0 ? 'Select Stars' : rating <= 2 ? 'Needs Improvement' : rating <= 4 ? 'Good Experience' : 'Excellent Service'}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-[10px] font-inter-bold text-slate-400 uppercase tracking-[2px] mb-4">What stood out?</Text>
            <View className="flex-row flex-wrap gap-2">
              {feedbackTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    className={`px-4 py-2 rounded-xl border ${isSelected ? 'bg-primary/5 border-primary' : 'bg-slate-50 border-slate-50'}`}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-[11px] font-inter-bold ${isSelected ? 'text-primary' : 'text-slate-500'}`}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="mb-2">
            <Text className="text-[10px] font-inter-bold text-slate-400 uppercase tracking-[2px] mb-3">Any suggestions? (Optional)</Text>
            <View className="bg-slate-50 rounded-2xl p-4 border border-slate-100 min-h-[100px]">
              <TextInput
                className="text-sm font-inter-medium text-slate-700 flex-1"
                placeholder="Tell us more about your ride..."
                placeholderTextColor="#94A3B8"
                value={comment}
                onChangeText={setComment}
                multiline
                textAlignVertical="top"
                maxLength={200}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
          className="h-14 rounded-2xl overflow-hidden shadow-lg shadow-primary/20"
        >
          <LinearGradient
            colors={[Colors.primary, '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="flex-1 flex-row items-center justify-center"
          >
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text className="text-base font-inter-bold text-white mr-2">Submit Rating</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-4 py-2 items-center"
          onPress={() => router.replace('/customer/home' as any)}
        >
          <Text className="text-xs font-inter-bold text-slate-400 uppercase tracking-widest">Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
