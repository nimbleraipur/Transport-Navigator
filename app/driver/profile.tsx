import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/query-client';

function ProfileField({ label, value, icon, isLocked = false, onChangeText, placeholder }: any) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-5">
      <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px] mb-2.5 ml-1">{label}</Text>
      <View
        className={`flex-row items-center px-4 rounded-2xl border ${isFocused ? 'border-primary bg-white shadow-sm' : 'border-gray-50 bg-gray-50/50'}`}
        style={{ height: 54 }}
      >
        <View className="mr-3.5">
          <Ionicons name={icon} size={18} color={isFocused ? Colors.primary : Colors.divider} />
        </View>
        {isLocked ? (
          <Text className="flex-1 text-sm font-inter-semibold text-text-secondary">{value}</Text>
        ) : (
          <TextInput
            className="flex-1 text-sm font-inter-semibold text-text"
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholderTextColor="rgba(0,0,0,0.2)"
          />
        )}
        {isLocked && <Ionicons name="lock-closed" size={14} color={Colors.divider} />}
      </View>
    </View>
  );
}

export default function DriverProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true })
    ]).start();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    setSaving(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL('/api/users/profile', baseUrl).toString(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.user) {
        updateUser({ name: data.user.name });
        Alert.alert('Profile Updated', 'Your professional driver profile has been updated.');
      }
    } catch (e) {
      Alert.alert('Error', 'We could not update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const vehicleIcon = user?.vehicleType === 'auto' ? 'rickshaw' : user?.vehicleType === 'tempo' ? 'van-utility' : 'truck';
  const vehicleLabel = user?.vehicleType ? user.vehicleType.charAt(0).toUpperCase() + user.vehicleType.slice(1) : 'N/A';

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        className="pb-12 rounded-b-[32px] shadow-2xl"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center px-6 mb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/5"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-inter-bold text-surface mr-10">Driver Identity</Text>
        </View>

        <View className="items-center">
          <View className="w-24 h-24 rounded-[32px] bg-white/10 items-center justify-center border border-white/10 shadow-2xl relative">
            <LinearGradient
              colors={['#1B3A5C', '#132743']}
              className="w-full h-full rounded-[32px] items-center justify-center"
            >
              <FontAwesome5 name="user-tie" size={40} color={Colors.surface} />
            </LinearGradient>
            <TouchableOpacity className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-accent border-[3px] border-navyMid items-center justify-center shadow-lg">
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text className="text-xl font-inter-bold text-surface mt-5">{user?.name || 'Driver'}</Text>
          <View className="bg-accent/20 px-2.5 py-1 rounded-full mt-2 border border-accent/20">
            <Text className="text-[9px] font-inter-bold text-accent uppercase tracking-widest">Verified Driver • {vehicleLabel}</Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        className="flex-1 -mt-8"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomInset + 40 }}
        style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white rounded-[32px] p-6 shadow-2xl shadow-black/5 border border-gray-50 mb-5">
          <Text className="text-[10px] font-inter-bold text-primary uppercase tracking-[2px] mb-6 pb-2.5 border-b border-gray-50">Official Details</Text>

          <ProfileField
            label="Driver Name"
            value={name}
            onChangeText={setName}
            icon="person-outline"
            placeholder="Ex. Rahul Kumar"
          />

          <ProfileField
            label="Registered Mobile"
            value={user?.phone || ''}
            icon="call-outline"
            isLocked={true}
          />

          <View className="mb-5">
            <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px] mb-2.5 ml-1">Assigned Vehicle</Text>
            <View className="flex-row items-center p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
              <View className="w-10 h-10 rounded-xl bg-white items-center justify-center mr-3.5 shadow-sm">
                <MaterialCommunityIcons name={vehicleIcon as any} size={22} color={Colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-inter-bold text-text">{vehicleLabel}</Text>
                <Text className="text-[10px] font-inter-medium text-text-tertiary uppercase tracking-wider">{user?.vehicleNumber || 'Reg No. N/A'}</Text>
              </View>
              <Ionicons name="lock-closed" size={14} color={Colors.divider} />
            </View>
          </View>

          <ProfileField
            label="License ID"
            value={user?.licenseNumber || 'Not Provided'}
            icon="card-outline"
            isLocked={true}
          />

          <TouchableOpacity
            className="mt-5 h-14 rounded-2xl overflow-hidden shadow-2xl shadow-primary/20"
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="flex-1 items-center justify-center flex-row"
            >
              {saving ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <>
                  <Text className="text-sm font-inter-bold text-surface mr-2.5">Professional Sync</Text>
                  <Feather name="shield" size={16} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View className="bg-surface rounded-2xl p-5 border border-gray-50 shadow-sm mb-6">
          <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px] mb-5 ml-1">Terminal Performance</Text>
          <View className="flex-row items-center justify-around">
            <View className="items-center">
              <Text className="text-xl font-inter-bold text-text">{user?.totalTrips ?? 0}</Text>
              <Text className="text-[8px] font-inter-bold text-text-tertiary uppercase tracking-widest mt-0.5">Jobs</Text>
            </View>
            <View className="w-[1px] h-8 bg-gray-100" />
            <View className="items-center">
              <Text className="text-xl font-inter-bold text-text">₹{user?.totalEarnings ?? 0}</Text>
              <Text className="text-[8px] font-inter-bold text-text-tertiary uppercase tracking-widest mt-0.5">Wallet</Text>
            </View>
            <View className="w-[1px] h-8 bg-gray-100" />
            <View className="items-center">
              <View className="flex-row items-center">
                <Text className="text-xl font-inter-bold text-text">{user?.rating ? user.rating.toFixed(1) : '5.0'}</Text>
                <Ionicons name="star" size={12} color={Colors.warning} style={{ marginLeft: 2 }} />
              </View>
              <Text className="text-[8px] font-inter-bold text-text-tertiary uppercase tracking-widest mt-0.5">Rating</Text>
            </View>
          </View>
        </View>

        <View className="px-5 items-center mb-8">
          <Text className="text-[11px] font-inter-medium text-text-tertiary text-center leading-4 opacity-60">
            Driver identity details are verified by the administrator. Contact support for vehicle replacements.
          </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
