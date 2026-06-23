import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  TextInput,
  Dimensions,
  StatusBar,
  Keyboard,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import RouteMap from '@/components/RouteMap';
import { useBookings } from '@/contexts/BookingContext';
import Colors from '@/constants/colors';
import LocationPickerMap from '@/components/LocationPickerMap';
import { getVehicleImageSource } from '@/lib/vehicles';

import { MOCK_LOCATIONS, BILASPUR_REGION } from '@/lib/locations';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  area: string;
  isLoaded?: boolean;
}

// Static types for safety, but data comes from backend
const VEHICLE_COLORS: { [key: string]: string } = {
  'auto': '#F59E0B',
  'tempo': '#10B981',
  'truck': '#1B6EF3',
};

const DEFAULT_COLOR = '#1B6EF3';

function calculateDistance(lat1?: number, lng1?: number, lat2?: number, lng2?: number): number {
  if (lat1 === undefined || lng1 === undefined || lat2 === undefined || lng2 === undefined) return 0;
  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return 0;
  
  return (
    Math.round(
      Math.sqrt(
        Math.pow((lat2 - lat1) * 111, 2) +
        Math.pow((lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180), 2)
      ) * 10
    ) / 10
  );
}

function LocationSearchItem({
  loc,
  type,
  onPress,
  index,
}: {
  loc: MapLocation;
  type: 'pickup' | 'delivery';
  onPress: () => void;
  index: number;
}) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 300, delay: index * 30, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fade }}>
      <TouchableOpacity
        className="flex-row items-center bg-white rounded-xl p-3 mb-2 border border-gray-100 shadow-sm"
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View className={`w-9 h-9 rounded-lg items-center justify-center mr-3 ${type === 'pickup' ? 'bg-success/5' : 'bg-danger/5'}`}>
          <Ionicons
            name={type === 'pickup' ? 'location' : 'flag'}
            size={16}
            color={type === 'pickup' ? Colors.success : Colors.danger}
          />
        </View>
        <View className="flex-1">
          <Text className="text-[14px] font-inter-semibold text-text mb-0.5">{loc.name}</Text>
          <Text className="text-[11px] font-inter-medium text-text-tertiary uppercase tracking-wider" numberOfLines={1}>{loc.area}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function VehicleOption({
  vehicle,
  isActive,
  distance,
  onPress,
  isCalculating,
}: {
  vehicle: any;
  isActive: boolean;
  distance: number;
  onPress: () => void;
  isCalculating: boolean;
}) {
  const totalPrice = (vehicle.baseFare || 0) + Math.round((distance || 0) * (vehicle.perKmCharge || 0));
  const imgSource = getVehicleImageSource(vehicle.icon, vehicle.type);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-row items-center py-3 mb-2 transition-all"
    >
      <View className="w-16 h-16 items-center justify-center mr-4">
        <Image
          source={imgSource}
          style={{ width: 56, height: 56 }}
          resizeMode="contain"
        />
      </View>
      <View className="flex-1">
        <Text className={`text-[15px] font-inter-bold ${isActive ? 'text-primary' : 'text-text'} mb-0.5`}>
          {vehicle.name || vehicle.type}
        </Text>
        <Text className="text-[11px] font-inter-medium text-text-tertiary">
          {vehicle.capacity}
        </Text>
      </View>
      <View className="items-end mr-1">
        {isCalculating ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <View className="flex-row items-center">
            <View className="items-end mr-3">
              <Text className={`text-base font-inter-bold ${isActive ? 'text-primary' : 'text-text'}`}>
                ₹{totalPrice}
              </Text>
              <Text className={`text-[9px] font-inter-bold uppercase mt-0.5 tracking-wider ${isActive ? 'text-primary' : 'text-text-tertiary'}`}>
                ₹{vehicle.perKmCharge}/km
              </Text>
            </View>
            <View className="w-5 h-5 items-center justify-center">
              {isActive ? (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              ) : (
                <View className="w-4 h-4 rounded-full border border-gray-300" />
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function NewBookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createBooking } = useBookings();

  const [pickup, setPickup] = useState<MapLocation | null>(null);
  const [delivery, setDelivery] = useState<MapLocation | null>(null);
  const [activeField, setActiveField] = useState<'pickup' | 'delivery' | null>(null);
  const [pickupSearch, setPickupSearch] = useState('');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { vehicles, fetchVehicles } = useBookings();
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isPickingFromMap, setIsPickingFromMap] = useState(false);
  const [distance, setDistance] = useState(0);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [tempLocation, setTempLocation] = useState<MapLocation | null>(null);
  const [showServiceError, setShowServiceError] = useState(false);
  const [serviceErrorMsg, setServiceErrorMsg] = useState('');
  const [serviceErrorTitle, setServiceErrorTitle] = useState('Outside Service Area');
  const searchId = useRef(0);
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);
  const bothSelected = pickup !== null && delivery !== null;

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicle) {
      setSelectedVehicle(vehicles[0]);
    }
  }, [vehicles]);

  useEffect(() => {
    if (pickup && delivery && GOOGLE_MAPS_API_KEY) {
      const getDistance = async () => {
        setCalculatingDistance(true);
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickup.lat},${pickup.lng}&destinations=${delivery.lat},${delivery.lng}&key=${GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
            const distanceObj = data.rows[0].elements[0].distance;
            if (distanceObj && typeof distanceObj.value === 'number') {
              const distInKm = distanceObj.value / 1000;
              setDistance(Math.round(distInKm * 10) / 10);
            } else {
              setDistance(calculateDistance(pickup?.lat, pickup?.lng, delivery?.lat, delivery?.lng));
            }
          } else {
            console.log('[BOOKING] Distance Matrix Status:', data.status);
            setDistance(calculateDistance(pickup?.lat, pickup?.lng, delivery?.lat, delivery?.lng));
          }
        } catch (e) {
          console.error('Distance Matrix Error:', e);
          setDistance(calculateDistance(pickup?.lat, pickup?.lng, delivery?.lat, delivery?.lng));
        } finally {
          setCalculatingDistance(false);
        }
      };
      getDistance();
    } else if (pickup && delivery) {
      setDistance(calculateDistance(pickup.lat, pickup.lng, delivery.lat, delivery.lng));
    }
  }, [pickup, delivery]);

  const performSearch = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const currentSearchId = ++searchId.current;
    setIsSearching(true);

    if (GOOGLE_MAPS_API_KEY) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&components=country:in&location=${BILASPUR_REGION.latitude},${BILASPUR_REGION.longitude}&radius=50000`
        );
        const data = await response.json();

        // Only update if this is still the most recent search
        if (currentSearchId === searchId.current) {
          if (data.status === 'OK') {
            const results = (data.predictions || []).map((p: any) => ({
              id: p.place_id,
              name: p.structured_formatting?.main_text || 'Unknown Location',
              area: p.structured_formatting?.secondary_text || p.description || '',
              place_id: p.place_id
            }));
            setSearchResults(results);
          } else {
            setSearchResults([]);
          }
        }
      } catch (e) {
        console.error('Places Autocomplete Error:', e);
        if (currentSearchId === searchId.current) setSearchResults([]);
      }
    } else {
      // Mock search fallback
      const searchTerms = query.toLowerCase().split(' ');
      const mockResults: MapLocation[] = MOCK_LOCATIONS.filter(r => {
        const name = r.name.toLowerCase();
        const area = r.area.toLowerCase();
        return searchTerms.every(term => name.includes(term) || area.includes(term));
      });
      if (currentSearchId === searchId.current) {
        setSearchResults(mockResults);
      }
    }

    if (currentSearchId === searchId.current) {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (activeField === 'pickup') {
      performSearch(pickupSearch);
    } else if (activeField === 'delivery') {
      performSearch(deliverySearch);
    } else {
      setSearchResults([]);
    }
  }, [pickupSearch, deliverySearch, activeField]);

  const handleConfirmBooking = async () => {
    if (!pickup || !delivery || !selectedVehicle) {
      Alert.alert('Selection Required', 'Please select pickup, delivery, and a vehicle type.');
      return;
    }

    // Sanitize location objects - ensure all required fields are present
    const sanitizeLocation = (loc: MapLocation) => ({
      name: loc.name || 'Unknown Location',
      area: loc.area || loc.name || '',
      lat: Number(loc.lat),
      lng: Number(loc.lng),
    });

    const sanitizedPickup = sanitizeLocation(pickup);
    const sanitizedDelivery = sanitizeLocation(delivery);

    if (!sanitizedPickup.lat || !sanitizedPickup.lng || !sanitizedDelivery.lat || !sanitizedDelivery.lng) {
      Alert.alert('Invalid Location', 'One or more locations have invalid coordinates. Please re-select.');
      return;
    }

    setLoading(true);
    const result = await createBooking({
      pickup: sanitizedPickup,
      delivery: sanitizedDelivery,
      vehicleType: selectedVehicle.type || 'auto',
      totalPrice: (selectedVehicle.baseFare || 0) + Math.round((distance || 0) * (selectedVehicle.perKmCharge || 0)),
      distance,
    });
    setLoading(false);
    if (result.success && result.booking) {
      const bookingId = result.booking.id;
      // Using a simple URL string for more stable expo-router navigation
      router.replace(`/customer/track-ride?bookingId=${bookingId}` as any);
    } else {
      console.error('Booking Creation Error:', result.error);
      const isServiceError = result.error && (
        result.error.includes('service area') || 
        result.error.includes('Operational Cities') || 
        result.error.includes('service city') ||
        result.error.includes('Drop location') ||
        result.error.includes('Pickup location') ||
        result.error.includes('km long')
      );

      if (isServiceError) {
        setServiceErrorMsg(result.error || '');
        let title = 'Service Restricted';
        if (result.error?.includes('Drop')) title = 'Drop Area Restricted';
        if (result.error?.includes('km long')) title = 'Distance Limit';
        setServiceErrorTitle(title);
        setShowServiceError(true);
        Animated.parallel([
          Animated.spring(modalScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
          Animated.timing(modalOpacity, { toValue: 1, duration: 300, useNativeDriver: true })
        ]).start();
      } else {
        Alert.alert('Booking Error', result.error || 'Something went wrong. Please check your network and try again.');
      }
    }
  };

  const handleLocationSelectFromMap = (loc: MapLocation) => {
    setTempLocation(loc);
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <View className="absolute inset-0 bg-gray-50">
        {bothSelected && !activeField ? (
          <View className="flex-1">
            <RouteMap pickup={pickup} delivery={delivery} />
            {/* Dynamic Edit Pill on Map - Rapido Style */}
            {/* Destination Edit Pill on Map - Rapido Style */}
            <View className="absolute top-4 left-5 right-5 flex-row">
              <TouchableOpacity
                onPress={() => {
                  setActiveField('delivery');
                  setIsPickingFromMap(true);
                }}
                className="bg-white/95 px-5 py-3 rounded-full shadow-2xl border border-gray-100 flex-row items-center flex-1"
                activeOpacity={0.9}
              >
                <View className="w-2.5 h-2.5 rounded-full bg-danger mr-3" />
                <Text className="text-[14px] font-inter-bold text-text flex-1 mr-2" numberOfLines={1}>
                  {delivery.name}
                </Text>
                <View className="w-8 h-8 items-center justify-center bg-gray-50 rounded-full border border-gray-100">
                  <Ionicons name="pencil-sharp" size={14} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-1">
            <LocationPickerMap
              activeField={activeField}
              onLocationSelect={handleLocationSelectFromMap}
              googleMapsApiKey={GOOGLE_MAPS_API_KEY}
              initialLocation={activeField === 'pickup' ? pickup : delivery}
            />
            {activeField && (
              <View style={{ position: 'absolute', bottom: bottomInset + 16, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 }}>
                <View className="bg-white p-4 rounded-[24px] mb-4 shadow-2xl border border-primary/10 w-full">
                  <View className="flex-row items-center mb-2">
                    <View className={`w-2 h-2 rounded-full mr-2 ${activeField === 'pickup' ? 'bg-success' : 'bg-danger'}`} />
                    <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-[2px]">Confirm {activeField} Location</Text>
                  </View>
                  <Text className="text-[13px] font-inter-semibold text-text leading-5" numberOfLines={2}>
                    {tempLocation?.isLoaded === false ? 'Locating...' : (tempLocation?.area || 'Drag map to select exact point')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ width: '100%' }}
                  className={`py-4 rounded-2xl shadow-2xl shadow-primary/30 flex-row items-center justify-center ${(!tempLocation || tempLocation.isLoaded === false) ? 'bg-gray-400' : 'bg-primary'}`}
                  disabled={!tempLocation || tempLocation.isLoaded === false}
                  onPress={() => {
                    if (tempLocation && tempLocation.isLoaded !== false && tempLocation.lat && tempLocation.lng) {
                      const finalLoc = { ...tempLocation };
                      delete finalLoc.isLoaded;

                      console.log(`[MAP-PICK] Confirming ${activeField}: ${finalLoc.name}`);

                      if (activeField === 'pickup') {
                        setPickup(finalLoc);
                        setPickupSearch(finalLoc.name);
                      } else {
                        setDelivery(finalLoc);
                        setDeliverySearch(finalLoc.name);
                      }

                      setActiveField(null);
                      setIsPickingFromMap(false);
                      setTempLocation(null);
                      Keyboard.dismiss();
                    } else {
                      Alert.alert('Incomplete Location', 'Please wait for the address to load or move the map slightly.');
                    }
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white font-inter-bold uppercase tracking-[2px] text-sm">Confirm Location</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <View className="z-10 bg-white/95 shadow-lg rounded-b-[32px]" style={{ paddingTop: topInset }}>
        <View className="flex-row items-center px-5 py-3">
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 items-center justify-center bg-gray-50 rounded-xl border border-gray-100">
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-base font-inter-bold text-text">
            {bothSelected ? 'Confirm Trip' : 'Select Locations'}
          </Text>
          <View className="w-9" />
        </View>

        <View className="px-5 pb-4">
          <View className="flex-row items-center bg-[#F9FAFB] rounded-2xl p-4 border border-gray-100">
            <View className="items-center mr-4">
              <View className="w-2.5 h-2.5 rounded-full bg-success" />
              <View className="w-px h-6 bg-gray-200 my-1 border-dashed border-l border-gray-300" />
              <View className="w-2.5 h-2.5 rounded-full bg-danger" />
            </View>
            <View className="flex-1">
              <TouchableOpacity
                className="flex-row items-center h-12 border-b border-gray-100 mb-0.5"
                onPress={() => {
                  setActiveField('pickup');
                  setIsPickingFromMap(false);
                }}
              >
                {activeField === 'pickup' ? (
                  <TextInput
                    className="flex-1 text-[15px] font-inter-semibold text-text"
                    style={{ paddingVertical: 0 }}
                    placeholder="Enter pickup point"
                    placeholderTextColor="#9CA3AF"
                    value={pickupSearch}
                    onChangeText={setPickupSearch}
                    onFocus={() => {
                      setSearchResults([]);
                      if (pickup) setPickupSearch('');
                    }}
                    autoFocus
                  />
                ) : (
                  <TouchableOpacity
                    className="flex-1 flex-row items-center"
                    onPress={() => {
                      setActiveField('pickup');
                      setIsPickingFromMap(false);
                    }}
                  >
                    <Text className={`flex-1 text-[15px] font-inter-semibold ${pickup ? 'text-text' : 'text-text-tertiary'}`} numberOfLines={1}>
                      {pickup ? pickup.name : 'Choose Pickup'}
                    </Text>
                    {pickup && (
                      <TouchableOpacity
                        onPress={() => {
                          setActiveField('pickup');
                          setIsPickingFromMap(true);
                        }}
                        className="p-1"
                      >
                        <Ionicons name="pencil-sharp" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center h-12"
                onPress={() => {
                  setActiveField('delivery');
                  setIsPickingFromMap(false);
                }}
              >
                {activeField === 'delivery' ? (
                  <TextInput
                    className="flex-1 text-[15px] font-inter-semibold text-text"
                    style={{ paddingVertical: 0 }}
                    placeholder="Enter destination"
                    placeholderTextColor="#9CA3AF"
                    value={deliverySearch}
                    onChangeText={setDeliverySearch}
                    onFocus={() => {
                      setSearchResults([]);
                      if (delivery) setDeliverySearch('');
                    }}
                    autoFocus
                  />
                ) : (
                  <TouchableOpacity
                    className="flex-1 flex-row items-center"
                    onPress={() => {
                      setActiveField('delivery');
                      setIsPickingFromMap(false);
                    }}
                  >
                    <Text className={`flex-1 text-[15px] font-inter-semibold ${delivery ? 'text-text' : 'text-text-tertiary'}`} numberOfLines={1}>
                      {delivery ? delivery.name : 'Choose Destination'}
                    </Text>
                    {delivery && (
                      <TouchableOpacity
                        onPress={() => {
                          setActiveField('delivery');
                          setIsPickingFromMap(true);
                        }}
                        className="p-1"
                      >
                        <Ionicons name="pencil-sharp" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Select on Map Button - Rapido Style */}
          {activeField && !isPickingFromMap && (
            <TouchableOpacity
              className="flex-row items-center bg-white self-start mt-3 px-5 py-2.5 rounded-full border border-gray-200 shadow-sm"
              onPress={() => {
                setIsPickingFromMap(true);
                Keyboard.dismiss();
              }}
            >
              <Ionicons name="location-outline" size={18} color={Colors.text} style={{ marginRight: 8 }} />
              <Text className="text-[13px] font-inter-semibold text-text">Select on map</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {activeField && !isPickingFromMap && (
        <View className="absolute top-[260px] left-0 right-0 bottom-0 bg-white z-20 rounded-t-3xl shadow-xl">
          <View className="px-5 pt-4 pb-2">
            <View className="flex-row items-center mb-4 px-1">
              <View className="h-[1px] flex-1 bg-gray-100" />
              <Text className="mx-4 text-[9px] font-inter-bold text-text-tertiary uppercase tracking-widest">Suggestions</Text>
              <View className="h-[1px] flex-1 bg-gray-100" />
            </View>
          </View>

          <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {isSearching ? (
              <ActivityIndicator className="mt-10" color={Colors.primary} />
            ) : (pickupSearch.length < 3 && deliverySearch.length < 3) ? (
              <View className="items-center py-10 opacity-60 px-6">
                <MaterialCommunityIcons name="map-marker-radius" size={40} color={Colors.primary + '40'} />
                <Text className="text-sm font-inter-bold text-text mt-4">Search for an address</Text>
                <Text className="text-[11px] font-inter-medium text-text-tertiary text-center mt-2 leading-4">
                  Type at least 3 characters to see suggestions or use the "Set on Map" option above.
                </Text>
              </View>
            ) : searchResults.length === 0 ? (
              <View className="items-center py-10 opacity-40 px-6">
                <Ionicons name="search-outline" size={32} color={Colors.divider} />
                <Text className="text-xs font-inter-bold text-text mt-2 uppercase tracking-widest text-center">No results found</Text>
                <Text className="text-[10px] font-inter-medium text-text-tertiary text-center mt-2">Try a different name or use the map.</Text>
              </View>
            ) : (
              searchResults.map((loc, i) => (
                <LocationSearchItem key={loc.id} loc={loc} type={activeField} index={i} onPress={async () => {
                  let finalLoc = loc;
                  if (loc.place_id) {
                    setIsSearching(true);
                    try {
                      const response = await fetch(
                        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${loc.place_id}&key=${GOOGLE_MAPS_API_KEY}`
                      );
                      const result = await response.json();
                      if (result.status === 'OK') {
                        const { lat, lng } = result.result.geometry.location;
                        finalLoc = { ...loc, lat, lng };
                      } else {
                        Alert.alert('Location Error', 'Could not get coordinates for this location. Please try another or use map.');
                        return;
                      }
                    } catch (e) {
                      console.error('Place Details Error:', e);
                      Alert.alert('Search Error', 'Failed to fetch location details. Please use the map.');
                      return;
                    } finally {
                      setIsSearching(false);
                    }
                  }

                  if (!finalLoc.lat || !finalLoc.lng) {
                    Alert.alert('Invalid Location', 'This location does not have coordinates. Please select from map.');
                    return;
                  }

                  if (activeField === 'pickup') { setPickup(finalLoc); setPickupSearch(finalLoc.name); }
                  else { setDelivery(finalLoc); setDeliverySearch(finalLoc.name); }
                  setActiveField(null);
                  Keyboard.dismiss();
                }}
                />
              ))
            )}
          </ScrollView>
        </View>
      )}

      {bothSelected && !activeField && (
        <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl" style={{ paddingBottom: bottomInset + 8 }}>
          <View className="p-6">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-lg font-inter-bold text-text">Select Ride</Text>
              <View className="bg-primary/10 px-3 py-1.5 rounded-xl min-w-[60px] items-center">
                {calculatingDistance ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text className="text-[11px] font-inter-bold text-primary">{distance} km</Text>
                )}
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[280px]">
              {(vehicles.length > 0 ? vehicles : []).map((v: any) => (
                <VehicleOption
                  key={v.id || v.type}
                  vehicle={v}
                  distance={distance}
                  isCalculating={calculatingDistance}
                  isActive={selectedVehicle?.type === v.type}
                  onPress={() => setSelectedVehicle(v)}
                />
              ))}
            </ScrollView>

            <TouchableOpacity
              className="mt-6 h-14 rounded-2xl overflow-hidden shadow-lg shadow-primary/20"
              onPress={handleConfirmBooking}
              disabled={loading || calculatingDistance}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="flex-1 items-center justify-center"
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text className="text-base font-inter-bold text-white uppercase tracking-wider">Confirm Booking</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Service Area Error Modal */}
      {showServiceError && (
        <View style={StyleSheet.absoluteFill} className="z-50 items-center justify-center p-6">
          <Animated.View 
            style={{ opacity: modalOpacity }}
            className="absolute inset-0 bg-navyDark/80" 
          />
          <Animated.View 
            style={{ 
              transform: [{ scale: modalScale }],
              opacity: modalOpacity 
            }}
            className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl"
          >
            <LinearGradient
              colors={[Colors.danger, '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="py-10 items-center"
            >
              <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center border border-white/30">
                <MaterialCommunityIcons name="map-marker-off" size={40} color="white" />
              </View>
            </LinearGradient>
            
            <View className="p-8 items-center">
              <Text className="text-xl font-inter-bold text-text text-center mb-3">{serviceErrorTitle}</Text>
              <Text className="text-[14px] font-inter-medium text-text-secondary text-center leading-5 mb-8">
                {serviceErrorMsg || "We currently don't offer services in this location. We're expanding rapidly, please check back soon!"}
              </Text>
              
              <TouchableOpacity
                onPress={() => {
                  Animated.parallel([
                    Animated.timing(modalScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
                    Animated.timing(modalOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
                  ]).start(() => {
                    setShowServiceError(false);
                  });
                }}
                className="w-full h-14 rounded-2xl bg-gray-100 items-center justify-center"
              >
                <Text className="text-sm font-inter-bold text-text uppercase tracking-widest">Understood</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                   router.back();
                }}
                className="mt-4"
              >
                <Text className="text-[12px] font-inter-bold text-primary uppercase tracking-wider">Change Location</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({});
