import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Platform, Alert, KeyboardAvoidingView, ScrollView, ActivityIndicator, Dimensions, Easing, Image, StatusBar } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getAppMode, getAppName, getAppSubtitle } from '@/lib/app-config';
import * as WebBrowser from 'expo-web-browser';
import { ADMIN_WEB_URL } from '@/constants/config';
import LAYOUT from '@/constants/layout';

const appLogo = require('@/assets/images/logo.png');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = LAYOUT.window;
const PARTICLE_COUNT = 8;

function FloatingParticle({ delay, size, startX, startY }: { delay: number; size: number; startX: number; startY: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driftY = 60 + Math.random() * 80;
    const driftX = 30 + Math.random() * 40;
    const duration = 5000 + Math.random() * 4000;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.4 + Math.random() * 0.4, duration: 1500, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, { toValue: -driftY, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(translateY, { toValue: driftY * 0.2, duration: duration * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ])
        ),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateX, { toValue: driftX, duration: duration * 1.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -driftX, duration: duration * 1.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      className="absolute bg-primary/40 rounded-full"
      style={{
        left: startX,
        top: startY,
        width: size,
        height: size,
        opacity,
        transform: [{ translateY }, { translateX }],
      }}
    />
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, loading: authLoading, sendOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const appMode = getAppMode();
  const [loading, setLoading] = useState(false);
  const [sentOtpValue, setSentOtpValue] = useState('');

  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;
  const crossfadeAnim = useRef(new Animated.Value(0)).current;

  const particles = useRef(Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    delay: i * 500,
    size: 2 + Math.random() * 5,
    startX: Math.random() * SCREEN_WIDTH,
    startY: Math.random() * SCREEN_HEIGHT * 0.8,
  }))).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(formSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1.5, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const currentPath = usePathname();

  useEffect(() => {
    // Only attempt navigation if at root, authenticated and not loading
    if (currentPath === '/' && !authLoading && isAuthenticated && user) {
      const timeoutId = setTimeout(() => {
        if (!user.name || user.name.trim() === '') {
          router.replace({ pathname: '/register' as any, params: { phone: user.phone, role: appMode } });
        } else {
          router.replace(appMode === 'customer' ? '/customer/home' : '/driver/dashboard');
        }
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [authLoading, isAuthenticated, user, appMode, currentPath]);

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a 10-digit mobile number');
      return;
    }
    setLoading(true);
    const result = await sendOtp(phone);
    setLoading(false);
    if (result.success) {
      setSentOtpValue(result.otp || '');
      setOtpSent(true);
      Animated.timing(crossfadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else {
      Alert.alert('Error', result.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit code');
      return;
    }
    setLoading(true);
    const result = await verifyOtp(phone, otp, appMode);
    setLoading(false);
    if (result.success) {
      // Navigation handled by auth effect
    } else {
      Alert.alert('Invalid Code', result.error || 'The OTP you entered is incorrect');
    }
  };

  const backToPhone = () => {
    Animated.timing(crossfadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setOtpSent(false);
      setOtp('');
    });
  };

  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#081220]">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const phoneOpacity = crossfadeAnim.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0] });
  const otpOpacity = crossfadeAnim.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1] });
  const phoneTranslateX = crossfadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -50] });
  const otpTranslateX = crossfadeAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });

  return (
    <View className="flex-1 bg-[#081220]">
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.navyDark, '#0D1B2E', '#142845']}
        className="absolute inset-0"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {particles.map((p) => (
        <FloatingParticle key={p.id} delay={p.delay} size={p.size} startX={p.startX} startY={p.startY} />
      ))}

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 32,
            paddingTop: insets.top + (Platform.OS === 'web' ? 80 : 60),
            paddingBottom: insets.bottom + 40,
            maxWidth: 460,
            alignSelf: 'center',
            width: '100%'
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            className="items-center mb-10"
            style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}
          >
            <View className="items-center justify-center mb-5">
              <Animated.View
                className="absolute w-20 h-20 rounded-full border border-primary/20"
                style={{ transform: [{ scale: glowPulse }] }}
              />
              <View className="w-20 h-20 rounded-2xl bg-white items-center justify-center shadow-2xl border border-white/20 rotate-12">
                <Image source={appLogo} className="w-12 h-12 -rotate-12" resizeMode="contain" />
              </View>
            </View>
            <Text className="text-3xl font-inter-bold text-surface tracking-[4px] uppercase">{getAppName()}</Text>
            <View className="flex-row items-center mt-2.5">
              <View className="h-[1.5px] w-5 bg-primary/40 mr-2.5" />
              <Text className="text-[10px] font-inter-bold text-white/40 uppercase tracking-[2px]">{getAppSubtitle()}</Text>
              <View className="h-[1.5px] w-5 bg-primary/40 ml-2.5" />
            </View>
          </Animated.View>

          <Animated.View
            className="bg-white/5 rounded-[32px] p-7 border border-white/10 shadow-2xl"
            style={{ opacity: formOpacity, transform: [{ translateY: formSlide }] }}
          >
            {!otpSent || crossfadeAnim ? (
              <Animated.View
                style={{ opacity: phoneOpacity, transform: [{ translateX: phoneTranslateX }] }}
                pointerEvents={otpSent ? 'none' : 'auto'}
              >
                <Text className="text-[9px] font-inter-bold text-white/30 mb-4 uppercase tracking-[2px]">Terminal Authentication</Text>
                <View className="flex-row items-center mb-6">
                  <View className="w-14 h-14 rounded-xl bg-white/5 items-center justify-center border border-white/10 mr-3">
                    <Text className="text-base font-inter-bold text-surface">+91</Text>
                  </View>
                  <TextInput
                    className="flex-1 h-14 rounded-xl bg-white/5 px-4 text-lg font-inter-bold text-surface border border-white/10"
                    placeholder="Mobile Number"
                    placeholderTextColor="rgba(255,255,255,0.12)"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
                <TouchableOpacity
                  className="h-14 rounded-xl overflow-hidden shadow-2xl shadow-primary/20"
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    className="flex-1 items-center justify-center flex-row"
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color={Colors.surface} />
                    ) : (
                      <>
                        <Text className="text-sm font-inter-bold text-surface mr-2">Secure Login</Text>
                        <Ionicons name="shield-checkmark" size={16} color={Colors.surface} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {otpSent ? (
              <Animated.View
                className="absolute inset-x-7 top-7"
                style={{ opacity: otpOpacity, transform: [{ translateX: otpTranslateX }] }}
              >
                <View className="flex-row items-center justify-between mb-5">
                  <TouchableOpacity onPress={backToPhone} className="w-9 h-9 rounded-xl bg-white/5 items-center justify-center border border-white/10">
                    <Ionicons name="chevron-back" size={18} color={Colors.surface} />
                  </TouchableOpacity>
                  <Text className="text-base font-inter-bold text-surface">Security Code</Text>
                  <View className="w-9" />
                </View>

                <Text className="text-[13px] font-inter text-white/40 text-center mb-6 leading-5">Verification code sent to{'\n'}
                  <Text className="text-accent font-inter-bold">+91 {phone}</Text>
                </Text>

                {sentOtpValue ? (
                  <View className="bg-accent/10 py-2 rounded-xl mb-6 border border-accent/20">
                    <Text className="text-[10px] font-inter-bold text-accent text-center uppercase tracking-widest">
                      Dev Portal OTP: {sentOtpValue}
                    </Text>
                  </View>
                ) : null}

                <TextInput
                  className="h-14 rounded-xl bg-white/5 px-4 text-3xl font-inter-bold text-surface border border-white/10 mb-6 text-center tracking-widest"
                  placeholder="0000"
                  placeholderTextColor="rgba(255,255,255,0.05)"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otp}
                  onChangeText={setOtp}
                  autoFocus
                />

                <TouchableOpacity
                  className="h-14 rounded-xl overflow-hidden shadow-2xl shadow-primary/20"
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    className="flex-1 items-center justify-center"
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color={Colors.surface} />
                    ) : (
                      <Text className="text-sm font-inter-bold text-surface">Verify Identity</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ) : null}
          </Animated.View>

          <TouchableOpacity
            className="flex-row items-center justify-center mt-10 opacity-30"
            onPress={() => WebBrowser.openBrowserAsync(ADMIN_WEB_URL || '')}
          >
            <FontAwesome5 name="cog" size={10} color={Colors.surface} />
            <Text className="text-[11px] font-inter-bold text-surface ml-2 uppercase tracking-widest">Terminal Console</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({});
