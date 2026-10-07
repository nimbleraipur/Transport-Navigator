import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { BookingData } from '@/contexts/BookingContext';
import { useBookingSound } from '@/lib/useBookingSound';

function calculateDistanceKm(
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number | null {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

interface IncomingRequestModalProps {
  request: BookingData | null;
  queueCount?: number;
  driverLocation?: { lat: number; lng: number } | null;
  onAccept: () => Promise<void>;
  onDecline: () => void;
}

export function IncomingRequestModal({
  request,
  queueCount = 1,
  driverLocation,
  onAccept,
  onDecline,
}: IncomingRequestModalProps) {
  const insets = useSafeAreaInsets();
  const [timeLeft, setTimeLeft] = useState(30);
  const [isAccepting, setIsAccepting] = useState(false);
  const [currentDriverCoords, setCurrentDriverCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(driverLocation || null);

  const { playBookingAlert, stopBookingAlert } = useBookingSound();

  const timerRef = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;

  // Fetch live driver location if not passed in props
  useEffect(() => {
    if (driverLocation) {
      setCurrentDriverCoords(driverLocation);
    } else {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((loc) => {
          if (loc?.coords) {
            setCurrentDriverCoords({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
            });
          }
        })
        .catch(() => {});
    }
  }, [driverLocation, request?.id]);

  // Main countdown and slide-in effect
  useEffect(() => {
    if (!request) {
      Animated.timing(slideAnim, {
        toValue: -350,
        duration: 250,
        useNativeDriver: true,
      }).start();
      cleanup();
      return;
    }

    // 1. Play alert sound
    playBookingAlert();

    // 2. Slide down animation
    slideAnim.setValue(-300);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 9,
      useNativeDriver: true,
    }).start();

    // 3. Reset & start 30s progress bar animation
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 30000,
      useNativeDriver: false,
    }).start();

    // 4. Numerical countdown timer
    setTimeLeft(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      cleanup();
    };
  }, [request?.id]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopBookingAlert();
    setIsAccepting(false);
  };

  const handleDecline = () => {
    cleanup();
    Animated.timing(slideAnim, {
      toValue: -350,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDecline();
    });
  };

  const handleAccept = async () => {
    if (isAccepting) return;
    setIsAccepting(true);
    try {
      await onAccept();
      cleanup();
    } catch (error) {
      setIsAccepting(false);
    }
  };

  if (!request) return null;

  const topPosition = Math.max(insets.top, 16) + 6;

  // Calculate distance from driver's location to pickup & drop
  const driverLat = currentDriverCoords?.lat;
  const driverLng = currentDriverCoords?.lng;

  const pickupDistFromDriver = calculateDistanceKm(
    driverLat,
    driverLng,
    request.pickup?.lat,
    request.pickup?.lng
  );

  const dropDistFromDriver = calculateDistanceKm(
    driverLat,
    driverLng,
    request.delivery?.lat,
    request.delivery?.lng
  );

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          top: topPosition,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        {/* Top Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        <View style={styles.content}>
          {/* 1. TOP HEADER: Clean Black & White (Price, Vehicle Tag & Timer) */}
          <View style={styles.topRow}>
            <View style={styles.priceGroup}>
              <Text style={styles.priceValue}>₹{request.totalPrice}</Text>
              <View style={styles.vehicleChip}>
                <Text style={styles.vehicleText}>
                  {request.vehicleType || 'Vehicle'}
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {queueCount > 1 && (
                <View style={styles.queueBadge}>
                  <Text style={styles.queueText}>+{queueCount - 1} in queue</Text>
                </View>
              )}
              <View style={styles.timerBadge}>
                <Ionicons name="time-outline" size={13} color="#FFFFFF" />
                <Text style={styles.timerText}>{timeLeft}s</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 2. MIDDLE ROUTE: Black & White Clean Timeline */}
          <View style={styles.routeSection}>
            <View style={styles.routeLine} />

            {/* Pickup Location */}
            <View style={styles.locationItem}>
              <View style={styles.pickupDotOuter}>
                <View style={styles.pickupDotInner} />
              </View>
              <View style={styles.locationTextContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.locationTypeLabel}>PICKUP</Text>
                  {pickupDistFromDriver != null && (
                    <Text style={styles.distanceBadge}>
                      {pickupDistFromDriver} km from you
                    </Text>
                  )}
                </View>
                <Text style={styles.locationMainText} numberOfLines={1}>
                  {request.pickup?.name || 'Pickup Location'}
                </Text>
                {!!request.pickup?.area && (
                  <Text style={styles.locationSubText} numberOfLines={1}>
                    {request.pickup.area}
                  </Text>
                )}
              </View>
            </View>

            {/* Drop Location */}
            <View style={styles.locationItem}>
              <View style={styles.dropDotOuter}>
                <View style={styles.dropDotInner} />
              </View>
              <View style={styles.locationTextContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.locationTypeLabel}>DROP</Text>
                  {dropDistFromDriver != null ? (
                    <Text style={styles.distanceBadge}>
                      {dropDistFromDriver} km from you
                    </Text>
                  ) : (
                    <Text style={styles.distanceBadge}>
                      {(request.distance || 0).toFixed(1)} km trip
                    </Text>
                  )}
                </View>
                <Text style={styles.locationMainText} numberOfLines={1}>
                  {request.delivery?.name || 'Drop Location'}
                </Text>
                {!!request.delivery?.area && (
                  <Text style={styles.locationSubText} numberOfLines={1}>
                    {request.delivery.area}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* 3. BOTTOM: 2 Clean Action Buttons */}
          <View style={styles.actionRow}>
            {/* Cancel Button */}
            <TouchableOpacity
              onPress={handleDecline}
              disabled={isAccepting}
              style={styles.cancelButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={17} color="#000000" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              onPress={handleAccept}
              disabled={isAccepting}
              style={styles.acceptButton}
              activeOpacity={0.85}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.acceptButtonContent}>
                  <MaterialCommunityIcons
                    name="steering"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.acceptButtonText}>Accept Ride</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 99999,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#F3F4F6',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  vehicleChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vehicleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  queueBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  queueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    gap: 4,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
    marginVertical: 6,
  },
  routeSection: {
    position: 'relative',
    marginVertical: 3,
  },
  routeLine: {
    position: 'absolute',
    left: 8,
    top: 14,
    bottom: 14,
    width: 1.5,
    backgroundColor: '#E5E7EB',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3,
    paddingLeft: 24,
    position: 'relative',
  },
  pickupDotOuter: {
    position: 'absolute',
    left: 2,
    top: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  pickupDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
  },
  dropDotOuter: {
    position: 'absolute',
    left: 2,
    top: 3,
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropDotInner: {
    width: 4,
    height: 4,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  locationTextContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 1,
  },
  locationTypeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.8,
  },
  distanceBadge: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#666666',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  locationSubText: {
    fontSize: 10.5,
    fontWeight: '400',
    color: '#666666',
    marginTop: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  acceptButton: {
    flex: 2,
    height: 44,
    backgroundColor: '#000000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  acceptButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
