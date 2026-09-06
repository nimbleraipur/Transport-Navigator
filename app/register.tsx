import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView, ActivityIndicator, Animated, Dimensions, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/query-client';
import { getVehicleImageSource } from '@/lib/vehicles';

const normalizeVehicleIcon = (icon?: string) => {
  if (icon === 'rickshaw') return 'auto-rickshaw';
  if (icon === 'van-utility') return 'truck-delivery';
  return icon || 'truck';
};

function AnimatedInput({ onFocus, onBlur, label, ...props }: any) {
  const [isFocused, setIsFocused] = useState(false);
  const borderFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderFade, { toValue: isFocused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [isFocused]);

  const borderColor = borderFade.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', Colors.primary]
  });

  return (
    <View className="mb-5">
      <Text className="text-[10px] font-inter-bold text-black uppercase tracking-[1.5px] mb-2 ml-1">{label}</Text>
      <Animated.View
        className="rounded-xl px-4 py-0.5 bg-white border shadow-sm shadow-black/5"
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

  const imgSource = getVehicleImageSource(vehicle.icon, vehicle.type);

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ scale: isActive ? 1.05 : 1 }] }} className="px-1">
      <TouchableOpacity
        className={`items-center justify-center py-4 rounded-2xl border-2 shadow-sm ${isActive ? 'border-primary bg-primary/5 shadow-primary/10' : 'border-gray-50 bg-white shadow-black/5'}`}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View className={`w-12 h-12 rounded-xl items-center justify-center mb-2 ${isActive ? 'bg-primary/10' : 'bg-gray-50'}`}>
          <Image
            source={imgSource}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
        </View>
        <Text className={`text-[10px] font-inter-bold uppercase tracking-wider ${isActive ? 'text-primary' : 'text-text-tertiary'}`}>{vehicle.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const isSmallScreen = SCREEN_WIDTH < 380;
  const params = useLocalSearchParams<{ phone: string; role: string }>();
  const { register, logout } = useAuth();
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('auto');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState<{type: string, label: string, icon: any}[]>([]);
  const [fetchingVehicles, setFetchingVehicles] = useState(false);

  // City / location states
  // For drivers: start in 'loading' immediately so form never flashes before city check
  const [cityCheckState, setCityCheckState] = useState<'loading' | 'found' | 'not_found' | 'permission_denied' | 'idle'>(params.role === 'driver' ? 'loading' : 'idle');
  const [detectedCity, setDetectedCity] = useState<{ id: string; name: string; state: string } | null>(null);
  const [activeCities, setActiveCities] = useState<{ name: string; state: string }[]>([]);

  const isDriver = params.role === 'driver';

  const headerSlide = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(20)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  const [userCoords, setUserCoords] = useState<{ lat?: number; lng?: number } | null>(null);

  useEffect(() => {
    if (isDriver) {
      checkCityAndFetchVehicles();
    } else {
      // For customers, prefetch GPS location in background
      const prefetchCustomerLocation = async () => {
        try {
          const Location = await import('expo-location');
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (loc?.coords) {
              setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            }
          }
        } catch (err) {
          console.log('[CUSTOMER-REG-LOC] Skipped:', err);
        }
      };
      prefetchCustomerLocation();
    }
  }, [isDriver]);

  const checkCityAndFetchVehicles = async () => {
    setCityCheckState('loading');
    setFetchingVehicles(true);

    try {
      const baseUrl = getApiUrl();

      // Step 1: Pre-fetch all active cities (for "not available" info screen)
      try {
        const allCitiesRes = await fetch(`${baseUrl}/api/cities`);
        if (allCitiesRes.ok) {
          const allCitiesData = await allCitiesRes.json();
          const cities = Array.isArray(allCitiesData) ? allCitiesData : [];
          setActiveCities(cities.filter((c: any) => c.isActive).map((c: any) => ({ name: c.name, state: c.state })));
        }
      } catch (cityListErr) {
        console.warn('[REGISTER] Could not fetch city list:', cityListErr);
      }

      // Step 2: Request GPS permission
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setCityCheckState('permission_denied');
        setFetchingVehicles(false);
        // Still try to load all vehicles as fallback
        fetchVehiclesFallback();
        return;
      }

      // Step 3: Get current position
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setUserCoords({ lat: latitude, lng: longitude });

      // Step 4: Check if this location is in a service city
      const cityRes = await fetch(`${baseUrl}/api/cities/check?lat=${latitude}&lng=${longitude}`);

      if (!cityRes.ok) {
        // 404 = not in any operational city
        setCityCheckState('not_found');
        setFetchingVehicles(false);
        return;
      }

      const cityData = await cityRes.json();
      setDetectedCity({ id: cityData.id, name: cityData.name, state: cityData.state });
      setCityCheckState('found');

      // Step 5: Fetch vehicles for this specific city
      await fetchVehiclesByCityId(cityData.id);

    } catch (e) {
      console.error('[REGISTER] City check failed:', e);
      // Fallback: show all vehicles
      setCityCheckState('found');
      fetchVehiclesFallback();
    }
  };

  const fetchVehiclesByCityId = async (cityId: string) => {
    setFetchingVehicles(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/vehicles?cityId=${cityId}`);
      const data = await res.json();
      if (data.vehicles && data.vehicles.length > 0) {
        const options = data.vehicles.map((v: any) => ({
          type: v.type,
          label: v.name,
          icon: normalizeVehicleIcon(v.icon),
        }));
        setAvailableVehicles(options);
        setVehicleType(data.vehicles[0].type);
      }
    } catch (e) {
      console.error('[REGISTER] Failed to fetch vehicles by city:', e);
      fetchVehiclesFallback();
    } finally {
      setFetchingVehicles(false);
    }
  };

  const fetchVehiclesFallback = async () => {
    setFetchingVehicles(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/vehicles`);
      const data = await res.json();
      if (data.vehicles && data.vehicles.length > 0) {
        const options = data.vehicles.map((v: any) => ({
          type: v.type,
          label: v.name,
          icon: normalizeVehicleIcon(v.icon),
        }));
        setAvailableVehicles(options);
        setVehicleType(data.vehicles[0].type);
      } else {
        setAvailableVehicles([
          { type: 'auto', label: 'Auto', icon: 'auto-rickshaw' as const },
          { type: 'e-rickshaw', label: 'E-Rickshaw', icon: 'e-rickshaw' as const },
          { type: 'tempo', label: 'Tempo', icon: 'truck-delivery' as const },
          { type: 'truck', label: 'Truck', icon: 'truck' as const },
        ]);
      }
    } catch (e) {
      console.error('[REGISTER] Fallback vehicle fetch failed:', e);
      setAvailableVehicles([
        { type: 'auto', label: 'Auto', icon: 'auto-rickshaw' as const },
        { type: 'e-rickshaw', label: 'E-Rickshaw', icon: 'e-rickshaw' as const },
        { type: 'tempo', label: 'Tempo', icon: 'truck-delivery' as const },
        { type: 'truck', label: 'Truck', icon: 'truck' as const },
      ]);
    } finally {
      setFetchingVehicles(false);
    }
  };

  // Run entry animation when the form becomes visible:
  // - Customers: immediately on mount
  // - Drivers: after city check completes (found / permission_denied)
  const shouldShowForm = !isDriver || cityCheckState === 'found' || cityCheckState === 'permission_denied';

  useEffect(() => {
    if (!shouldShowForm) return;
    // Reset values before animating in (handles driver re-mount after loading screen)
    headerSlide.setValue(-20);
    headerOpacity.setValue(0);
    formSlide.setValue(20);
    formOpacity.setValue(0);
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
  }, [shouldShowForm]);

  async function handleRegister() {
    if (!name.trim()) { Alert.alert('Missing Name', 'Please enter your full name'); return; }
    if (isDriver && !vehicleNumber.trim()) { Alert.alert('Vehicle Missing', 'Please enter your vehicle number'); return; }
    setLoading(true);

    let finalCoords = userCoords;
    if (!finalCoords) {
      try {
        const Location = await import('expo-location');
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords) {
            finalCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          }
        }
      } catch (e) {
        console.log('[REGISTER-FINAL-LOC] Error:', e);
      }
    }

    // Derive 2-letter city code from detected city name (e.g. "Bilaspur" → "BL")
    const cityCode = detectedCity
      ? detectedCity.name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2)
      : 'ML'; // ML = MyLoad default fallback

    const result = await register({
      phone: params.phone || '',
      name: name.trim(),
      role: params.role || 'customer',
      cityCode,
      city: detectedCity?.name,
      state: detectedCity?.state,
      lat: finalCoords?.lat,
      lng: finalCoords?.lng,
      ...(isDriver && { vehicleType, vehicleNumber: vehicleNumber.trim() }),
    });
    setLoading(false);
    if (result.success) {
      if (isDriver) router.replace('/driver/dashboard' as any);
      else router.replace('/customer/home' as any);
    } else {
      Alert.alert('Registration Failed', result.error || 'Please check your details and try again.');
    }
  }

  // ── "Service Not Available" Screen ────────────────────────────────────────
  if (isDriver && cityCheckState === 'not_found') {
    return (
      <LinearGradient colors={[Colors.navyDark, Colors.navyMid]} className="flex-1">
        <View className="flex-1 items-center justify-center px-8" style={{ paddingTop: insets.top }}>
          <View className="w-24 h-24 rounded-full bg-white/10 items-center justify-center mb-6 border border-white/10">
            <MaterialCommunityIcons name="map-marker-off" size={44} color="rgba(255,255,255,0.7)" />
          </View>

          <Text className="text-2xl font-inter-bold text-surface text-center mb-3">
            Service Not Available
          </Text>
          <Text className="text-sm font-inter-medium text-white/50 text-center mb-8 leading-6">
            Sorry! We are currently not available in your area.{'\n'}
            Stay tuned — we are expanding soon!
          </Text>

          <View className="bg-white/8 rounded-2xl p-5 w-full border border-white/10 mb-8">
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons name="information-outline" size={18} color="rgba(255,255,255,0.5)" />
              <Text className="text-[11px] font-inter-bold text-white/50 uppercase tracking-widest ml-2">Currently Active In</Text>
            </View>
            {activeCities.length > 0 ? (
              activeCities.map((c, i) => (
                <Text key={i} className="text-sm font-inter-semibold text-white/70 leading-6">
                  • {c.name}, {c.state}
                </Text>
              ))
            ) : (
              <Text className="text-sm font-inter-semibold text-white/70 leading-5">
                • More cities coming soon...
              </Text>
            )}
          </View>

          <TouchableOpacity
            className="w-full h-14 rounded-2xl overflow-hidden mb-4"
            onPress={checkCityAndFetchVehicles}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="flex-1 items-center justify-center flex-row"
            >
              <Ionicons name="refresh" size={18} color={Colors.surface} style={{ marginRight: 8 }} />
              <Text className="text-sm font-inter-bold text-surface">Retry Location Check</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full h-12 rounded-2xl bg-white/10 items-center justify-center border border-white/10"
            onPress={async () => {
              if (router.canGoBack()) router.back();
              else { await logout(); router.replace('/'); }
            }}
            activeOpacity={0.8}
          >
            <Text className="text-sm font-inter-semibold text-white/60">Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── Location Loading Screen ────────────────────────────────────────────────
  if (isDriver && cityCheckState === 'loading') {
    return (
      <LinearGradient colors={[Colors.navyDark, Colors.navyMid]} className="flex-1 items-center justify-center">
        <View className="items-center px-8">
          <View className="w-20 h-20 rounded-full bg-white/10 items-center justify-center mb-6 border border-white/10">
            <MaterialCommunityIcons name="map-marker-radius" size={36} color="rgba(255,255,255,0.7)" />
          </View>
          <ActivityIndicator color={Colors.surface} size="large" style={{ marginBottom: 16 }} />
          <Text className="text-lg font-inter-bold text-surface text-center mb-2">Detecting Location</Text>
          <Text className="text-sm font-inter-medium text-white/50 text-center">
            Checking if our service is{'\n'}available in your area...
          </Text>
        </View>
      </LinearGradient>
    );
  }

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
            onPress={async () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                await logout();
                router.replace('/');
              }
            }}
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
          {/* City Badge for drivers */}
          {isDriver && detectedCity && (
            <View className="flex-row items-center bg-green-50 rounded-xl px-3 py-2.5 mb-5 border border-green-100">
              <MaterialCommunityIcons name="map-marker-check" size={16} color="#10B981" />
              <Text className="text-xs font-inter-bold text-green-700 ml-2">
                Service available in {detectedCity.name}, {detectedCity.state}
              </Text>
            </View>
          )}

          <AnimatedInput
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          {isDriver && (
            <View>
              <Text className="text-[10px] font-inter-bold text-black uppercase tracking-[1.5px] mb-3 ml-1">Select Transport</Text>
              <View className="flex-row mb-6 flex-wrap" style={{ marginHorizontal: -4 }}>
                {fetchingVehicles ? (
                  <View className="flex-1 items-center py-6">
                    <ActivityIndicator color={Colors.primary} />
                    <Text className="text-[11px] font-inter-medium text-text-tertiary mt-2">Loading vehicles...</Text>
                  </View>
                ) : (
                  availableVehicles.map((v, i) => (
                    <View key={v.type} style={{ width: '50%', marginBottom: 8 }}>
                      <VehicleCard
                        vehicle={v}
                        index={i}
                        isActive={vehicleType === v.type}
                        onPress={() => setVehicleType(v.type)}
                      />
                    </View>
                  ))
                )}
              </View>

              <AnimatedInput
                label="Vehicle Register #"
                placeholder="MP09 AB 1234"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
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
