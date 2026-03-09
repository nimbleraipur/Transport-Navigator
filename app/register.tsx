import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

function AnimatedInput({ onFocus, onBlur, label, ...props }: any) {
  const [isFocused, setIsFocused] = useState(false);
  const borderFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderFade, { toValue: isFocused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [isFocused]);

  const borderColor = borderFade.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F3F4F6', Colors.primary]
  });

  return (
    <View className="mb-5">
      <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px] mb-2 ml-1">{label}</Text>
      <Animated.View
        className="rounded-xl px-4 py-0.5 bg-gray-50/50 border"
        style={{ borderColor }}
      >
        <TextInput
          className="text-sm font-inter-semibold text-text h-11"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="rgba(0,0,0,0.2)"
          {...props}
        />
      </Animated.View>
    </View>
  );
}

function VehicleCard({ vehicle, isActive, onPress, index }: { vehicle: { type: string; label: string; icon: any }; isActive: boolean; onPress: () => void; index: number }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 50, friction: 8, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ scale: isActive ? 1.05 : 1 }] }} className="px-1">
      <TouchableOpacity
        className={`items-center justify-center py-4 rounded-2xl border-2 shadow-sm ${isActive ? 'border-primary bg-primary/5 shadow-primary/10' : 'border-gray-50 bg-white shadow-black/5'}`}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View className={`w-10 h-10 rounded-xl items-center justify-center mb-2 ${isActive ? 'bg-primary/10' : 'bg-gray-50'}`}>
          <MaterialCommunityIcons name={vehicle.icon} size={24} color={isActive ? Colors.primary : Colors.textTertiary} />
        </View>
        <Text className={`text-[10px] font-inter-bold uppercase tracking-wider ${isActive ? 'text-primary' : 'text-text-tertiary'}`}>{vehicle.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone: string; role: string }>();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('auto');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const isDriver = params.role === 'driver';

  const headerSlide = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(20)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(headerSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(formSlide, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  async function handleRegister() {
    if (!name.trim()) { Alert.alert('Missing Name', 'Please enter your full name'); return; }
    if (isDriver && !vehicleNumber.trim()) { Alert.alert('Vehicle Missing', 'Please enter your vehicle number'); return; }
    setLoading(true);
    const result = await register({
      phone: params.phone || '',
      name: name.trim(),
      role: params.role || 'customer',
      ...(isDriver && { vehicleType, vehicleNumber: vehicleNumber.trim(), licenseNumber: licenseNumber.trim() }),
    });
    setLoading(false);
    if (result.success) {
      if (isDriver) router.replace('/driver/dashboard' as any);
      else router.replace('/customer/home' as any);
    } else {
      Alert.alert('Registration Failed', result.error || 'Please check your details and try again.');
    }
  }

  const vehicles = [
    { type: 'auto', label: 'Auto', icon: 'rickshaw' as const },
    { type: 'tempo', label: 'Tempo', icon: 'van-utility' as const },
    { type: 'truck', label: 'Truck', icon: 'truck' as const },
  ];

  return (
    <LinearGradient colors={[Colors.navyDark, Colors.navyMid]} className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === 'web' ? 70 : 40),
          paddingBottom: insets.bottom + 40,
          maxWidth: 480,
          alignSelf: 'center',
          width: '100%'
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          className="flex-row items-center px-8 mb-8"
          style={{ transform: [{ translateY: headerSlide }], opacity: headerOpacity }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center mr-4 border border-white/5"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-inter-bold text-surface">Profile Setup</Text>
            <Text className="text-xs font-inter-medium text-white/40 mt-0.5 uppercase tracking-widest leading-4">
              {isDriver ? 'Driver Registration' : 'Personal Details'}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          className="mx-6 bg-surface rounded-[32px] p-6 shadow-2xl"
          style={{ transform: [{ translateY: formSlide }], opacity: formOpacity }}
        >
          <AnimatedInput
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          {isDriver && (
            <View>
              <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px] mb-3 ml-1">Select Transport</Text>
              <View className="flex-row mb-6" style={{ marginHorizontal: -4 }}>
                {vehicles.map((v, i) => (
                  <VehicleCard
                    key={v.type}
                    vehicle={v}
                    index={i}
                    isActive={vehicleType === v.type}
                    onPress={() => setVehicleType(v.type)}
                  />
                ))}
              </View>

              <AnimatedInput
                label="Vehicle Register #"
                placeholder="MP09 AB 1234"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                autoCapitalize="characters"
              />

              <AnimatedInput
                label="License (Optional)"
                placeholder="MH01 2024 000..."
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                autoCapitalize="characters"
              />
            </View>
          )}

          <TouchableOpacity
            className="h-14 rounded-2xl overflow-hidden shadow-2xl shadow-primary/30 mt-3"
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="flex-1 items-center justify-center flex-row"
            >
              {loading ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <>
                  <Text className="text-sm font-inter-bold text-surface mr-2.5">Create Profile</Text>
                  <View className="w-7 h-7 rounded-full bg-white/12 items-center justify-center">
                    <Ionicons name="arrow-forward" size={16} color={Colors.surface} />
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text className="text-[9px] font-inter-medium text-text-tertiary text-center mt-6 uppercase tracking-widest opacity-40">
            By proceeding, you agree to our terms of service
          </Text>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({});
