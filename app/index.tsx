import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Easing,
  Image,
  StatusBar,
  Keyboard,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getAppMode, getAppName, getAppSubtitle } from '@/lib/app-config';

const appLogo = require('@/assets/images/logo.png');

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const isSmallScreen = SCREEN_HEIGHT < 680 || SCREEN_WIDTH < 360;

  const { user, isAuthenticated, loading: authLoading, sendOtp, verifyOtp, logout } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const appMode = getAppMode();
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const timerRef = useRef<any>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendTimer]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1.3, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const currentPath = usePathname();

  useEffect(() => {
    if (currentPath === '/' && !authLoading && isAuthenticated && user) {
      const timeoutId = setTimeout(() => {
        if (user.role !== 'admin' && user.role !== appMode) {
          Alert.alert(
            'Wrong Application',
            `Your account is registered as a ${user.role.toUpperCase()}. Please open the ${user.role.toUpperCase()} app.`
          );
          logout();
          return;
        }

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
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    const result = await sendOtp(clean);
    setLoading(false);
    if (result.success) {
      setOtpSent(true);
      setResendTimer(30);
    } else {
      Alert.alert('Error', result.error || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit code sent to your phone.');
      return;
    }
    setLoading(true);
    const result = await verifyOtp(phone.replace(/\D/g, ''), otp, appMode);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Verification Error', result.error || 'The OTP code is incorrect.');
    }
  };

  const backToPhone = () => {
    setOtpSent(false);
    setOtp('');
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // Responsive sizes
  const logoSize = keyboardVisible ? (isSmallScreen ? 48 : 56) : (isSmallScreen ? 70 : 84);
  const cardPadding = isSmallScreen ? 20 : 28;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      
      {/* Premium Dark Gradient */}
      <LinearGradient
        colors={['#020617', '#0F172A', '#1E293B']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + (isSmallScreen ? 12 : 24),
              paddingBottom: insets.bottom + (isSmallScreen ? 16 : 32),
            }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.mainWrapper,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* App Logo & Branding */}
            <View style={[styles.brandingContainer, keyboardVisible && styles.brandingContainerCompact]}>
              <View style={styles.logoWrapper}>
                <Animated.View
                  style={[
                    styles.logoGlow,
                    { transform: [{ scale: keyboardVisible ? 0.7 : glowPulse }] }
                  ]}
                />
                <Image
                  source={appLogo}
                  style={{ width: logoSize, height: logoSize }}
                  resizeMode="contain"
                />
              </View>

              {!keyboardVisible && (
                <View style={styles.titleWrapper}>
                  <Text style={styles.appNameText}>
                    {getAppName().replace(' Driver', '')}
                  </Text>
                  {getAppName().includes('Driver') && (
                    <Text style={styles.driverTagText}>DRIVER PARTNER</Text>
                  )}
                  <Text style={styles.subtitleText}>{getAppSubtitle()}</Text>
                </View>
              )}
            </View>

            {/* Glassmorphic Form Card */}
            <View style={[styles.formCard, { padding: cardPadding }]}>
              {!otpSent ? (
                // ─── PHONE NUMBER FORM ───
                <View>
                  <Text style={styles.cardHeaderTitle}>Enter Mobile Number</Text>
                  <Text style={styles.cardHeaderSub}>We will send a 4-digit verification code</Text>

                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneTextInput}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={setPhone}
                      autoFocus={false}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleSendOtp}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#1E293B', '#0F172A']}
                      style={styles.gradientBtnContent}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.primaryBtnText}>Get Verification Code</Text>
                          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                // ─── OTP VERIFICATION FORM ───
                <View>
                  <View style={styles.otpHeaderRow}>
                    <TouchableOpacity onPress={backToPhone} style={styles.backIconBtn}>
                      <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.cardHeaderTitle}>Verify OTP</Text>
                    <View style={{ width: 36 }} />
                  </View>

                  <View style={styles.sentToRow}>
                    <Text style={styles.sentToText}>
                      Code sent to <Text style={styles.phoneHighlight}>+91 {phone}</Text>
                    </Text>
                    <TouchableOpacity onPress={backToPhone} style={styles.editPhoneBtn}>
                      <Ionicons name="pencil" size={12} color="#38BDF8" />
                      <Text style={styles.editPhoneText}>Edit</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.otpTextInput}
                    placeholder="• • • •"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otp}
                    onChangeText={setOtp}
                    autoFocus
                  />

                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#16A34A', '#15803D']}
                      style={styles.gradientBtnContent}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.primaryBtnText}>Verify & Login</Text>
                          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.resendContainer}>
                    {resendTimer > 0 ? (
                      <Text style={styles.resendTimerText}>
                        Resend code in <Text style={{ color: '#38BDF8', fontWeight: '800' }}>{resendTimer}s</Text>
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                        <Text style={styles.resendBtnText}>Resend Verification Code</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  mainWrapper: {
    width: '100%',
  },
  // Branding
  brandingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandingContainerCompact: {
    marginBottom: 12,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  titleWrapper: {
    alignItems: 'center',
  },
  appNameText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  driverTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  // Card
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cardHeaderSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  // Inputs
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    marginBottom: 20,
    gap: 10,
  },
  countryCodeBadge: {
    height: 56,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  phoneTextInput: {
    flex: 1,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  sentToText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  phoneHighlight: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  editPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 6,
  },
  editPhoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  otpTextInput: {
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 14,
    marginBottom: 20,
  },
  // Buttons
  primaryBtn: {
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
  },
  gradientBtnContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resendContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendTimerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  resendBtnText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
