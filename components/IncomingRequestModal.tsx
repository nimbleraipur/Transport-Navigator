import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingData } from '@/contexts/BookingContext';
import Colors from '@/constants/colors';
import { useBookingSound } from '@/lib/useBookingSound';

const { width } = Dimensions.get('window');

interface IncomingRequestModalProps {
  request: BookingData | null;
  queueCount?: number;
  onAccept: () => Promise<void>;
  onDecline: () => void;
}

export function IncomingRequestModal({
  request,
  queueCount = 1,
  onAccept,
  onDecline,
}: IncomingRequestModalProps) {
  const insets = useSafeAreaInsets();
  const [timeLeft, setTimeLeft] = useState(30);
  const [isAccepting, setIsAccepting] = useState(false);
  const { playBookingAlert, stopBookingAlert } = useBookingSound();

  const timerRef = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the "LIVE REQUEST" indicator
  useEffect(() => {
    if (!request) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [request]);

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
          {/* Header Row: Badge, Queue Counter, Countdown */}
          <View style={styles.headerRow}>
            <View style={styles.badgeGroup}>
              <View style={styles.liveBadge}>
                <Animated.View
                  style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]}
                />
                <Text style={styles.liveText}>NEW RIDE REQUEST</Text>
              </View>
              {queueCount > 1 && (
                <View style={styles.queueBadge}>
                  <Text style={styles.queueText}>+{(queueCount - 1)} in queue</Text>
                </View>
              )}
            </View>

            <View style={styles.timerBadge}>
              <Ionicons name="time-outline" size={13} color="#EF4444" />
              <Text style={styles.timerText}>{timeLeft}s</Text>
            </View>
          </View>

          {/* 1. TOP: Price & Ride Specs */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>ESTIMATED EARNINGS</Text>
              <Text style={styles.priceValue}>₹{request.totalPrice}</Text>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <MaterialCommunityIcons name="truck-fast" size={13} color="#2563EB" />
                <Text style={styles.metaChipText}>{request.vehicleType || 'Truck'}</Text>
              </View>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaInfo}>{(request.distance || 0).toFixed(1)} km</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaInfo}>{request.estimatedTime || 15} mins</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 2. MIDDLE: Pickup Location then Drop Location */}
          <View style={styles.routeSection}>
            {/* Connecting Vertical Line */}
            <View style={styles.routeLine} />

            {/* Pickup Location */}
            <View style={styles.locationItem}>
              <View style={styles.pickupDotOuter}>
                <View style={styles.pickupDotInner} />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationTypeLabel}>PICKUP LOCATION</Text>
                <Text style={styles.locationMainText} numberOfLines={1}>
                  {request.pickup?.name || 'Pickup Address'}
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
                <Text style={styles.locationTypeLabel}>DROP LOCATION</Text>
                <Text style={styles.locationMainText} numberOfLines={1}>
                  {request.delivery?.name || 'Drop Address'}
                </Text>
                {!!request.delivery?.area && (
                  <Text style={styles.locationSubText} numberOfLines={1}>
                    {request.delivery.area}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* 3. BOTTOM: 2 Action Buttons (Decline / Cancel & Accept) */}
          <View style={styles.actionRow}>
            {/* Left Button: Decline / Cancel */}
            <TouchableOpacity
              onPress={handleDecline}
              disabled={isAccepting}
              style={styles.cancelButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {/* Right Button: Accept Ride */}
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
                  <MaterialCommunityIcons name="steering" size={19} color="#FFFFFF" />
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
        shadowOpacity: 0.22,
        shadowRadius: 14,
      },
      android: {
        elevation: 18,
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
    backgroundColor: '#10B981',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    letterSpacing: 0.8,
  },
  queueBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  queueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 3,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 8,
  },
  priceRow: {
    justifyContent: 'center',
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.7,
    marginBottom: 1,
  },
  priceValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  metaDot: {
    fontSize: 10,
    color: '#9CA3AF',
    marginHorizontal: 5,
  },
  metaInfo: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
    marginVertical: 6,
  },
  routeSection: {
    position: 'relative',
    marginVertical: 4,
  },
  routeLine: {
    position: 'absolute',
    left: 8,
    top: 14,
    bottom: 14,
    width: 1.5,
    backgroundColor: '#D1D5DB',
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
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  pickupDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  dropDotOuter: {
    position: 'absolute',
    left: 2,
    top: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dropDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  locationTextContainer: {
    flex: 1,
  },
  locationTypeLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.6,
    marginBottom: 0.5,
  },
  locationMainText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  locationSubText: {
    fontSize: 10.5,
    fontWeight: '400',
    color: '#6B7280',
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
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  acceptButton: {
    flex: 2,
    height: 44,
    backgroundColor: '#10B981',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
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
