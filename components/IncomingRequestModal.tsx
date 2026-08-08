import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
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
import { BookingData } from '@/contexts/BookingContext';
import Colors from '@/constants/colors';
import { useBookingSound } from '@/lib/useBookingSound';

const { width } = Dimensions.get('window');

interface IncomingRequestModalProps {
  request: BookingData | null;
  onAccept: () => Promise<void>;
  onDecline: () => void;
}

export function IncomingRequestModal({
  request,
  onAccept,
  onDecline,
}: IncomingRequestModalProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isAccepting, setIsAccepting] = useState(false);
  const { playBookingAlert, stopBookingAlert } = useBookingSound();
  
  const timerRef = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the "New Request" indicator
  useEffect(() => {
    if (!request) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
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

  // Main timer and sound loop effect
  useEffect(() => {
    if (!request) return;

    // 1. Play loop sound
    playBookingAlert();

    // 2. Start progress bar animation (shrink from 1 to 0 over 30s)
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 30000,
      useNativeDriver: false, // width/layout animations cannot use native driver
    }).start();

    // 3. Start numerical countdown timer
    setTimeLeft(30);
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
  }, [request]);

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
    onDecline();
  };

  const handleAccept = async () => {
    if (isAccepting) return;
    setIsAccepting(true);
    try {
      await onAccept();
      cleanup(); // cleanup sound and timer on success
    } catch (error) {
      setIsAccepting(false);
    }
  };

  if (!request) return null;

  return (
    <Modal
      transparent
      visible={!!request}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Top Progress Bar (shrinks from left to right) */}
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

          {/* Card Content Wrapper */}
          <View className="p-6">
            {/* Header Badge & Countdown */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center bg-gray-100 px-3 py-1 rounded-full space-x-1.5">
                <Animated.View
                  style={{ transform: [{ scale: pulseAnim }] }}
                  className="w-2 h-2 rounded-full bg-red-500"
                />
                <Text className="text-[10px] font-inter-bold text-text uppercase tracking-widest">
                  New Request
                </Text>
              </View>
              <View className="bg-black/5 px-3 py-1 rounded-full">
                <Text className="text-xs font-inter-bold text-text-secondary">
                  {timeLeft}s remaining
                </Text>
              </View>
            </View>

            {/* Earnings spotlight */}
            <View className="items-center mb-6">
              <Text className="text-xs font-inter-semibold text-text-secondary uppercase tracking-widest mb-1">
                Estimated Earnings
              </Text>
              <Text className="text-5xl font-inter-bold text-text tracking-tight">
                ₹{request.totalPrice}
              </Text>
              <View className="flex-row items-center mt-2 space-x-2">
                <Text className="text-xs font-inter-medium text-text-secondary">
                  {request.distance.toFixed(1)} km
                </Text>
                <Text className="text-xs font-inter-medium text-text-tertiary">•</Text>
                <Text className="text-xs font-inter-medium text-text-secondary">
                  {request.estimatedTime} mins
                </Text>
                <Text className="text-xs font-inter-medium text-text-tertiary">•</Text>
                <Text className="text-xs font-inter-semibold text-primary capitalize">
                  {request.vehicleType}
                </Text>
              </View>
            </View>

            <View style={styles.divider} className="mb-6" />

            {/* Address timeline */}
            <View className="mb-6 relative">
              {/* Vertical line indicator */}
              <View className="absolute left-[9px] top-[14px] bottom-[14px] w-[2px] bg-gray-200 border-dashed border-l border-gray-400" />

              {/* Pickup location */}
              <View className="flex-row items-start mb-5 pl-7 relative">
                <View className="absolute left-[3px] top-[4px] w-3 h-3 rounded-full bg-black border border-white items-center justify-center" />
                <View className="flex-1">
                  <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-widest mb-0.5">
                    Pickup Location
                  </Text>
                  <Text className="text-sm font-inter-semibold text-text" numberOfLines={1}>
                    {request.pickup.name}
                  </Text>
                  <Text className="text-xs font-inter-regular text-text-secondary" numberOfLines={1}>
                    {request.pickup.area}
                  </Text>
                </View>
              </View>

              {/* Drop location */}
              <View className="flex-row items-start pl-7 relative">
                <View className="absolute left-[3px] top-[4px] w-3 h-3 bg-black border border-white items-center justify-center" />
                <View className="flex-1">
                  <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase tracking-widest mb-0.5">
                    Drop Location
                  </Text>
                  <Text className="text-sm font-inter-semibold text-text" numberOfLines={1}>
                    {request.delivery.name}
                  </Text>
                  <Text className="text-xs font-inter-regular text-text-secondary" numberOfLines={1}>
                    {request.delivery.area}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions footer */}
            <View className="flex-row space-x-3 mt-2">
              <TouchableOpacity
                onPress={handleDecline}
                disabled={isAccepting}
                style={styles.declineButton}
                activeOpacity={0.7}
              >
                <Text className="text-sm font-inter-bold text-text">Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAccept}
                disabled={isAccepting}
                style={styles.acceptButton}
                activeOpacity={0.8}
              >
                {isAccepting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View className="flex-row items-center justify-center space-x-2">
                    <MaterialCommunityIcons name="steering" size={18} color="#FFFFFF" />
                    <Text className="text-sm font-inter-bold text-white">Accept Request</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
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
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
  },
  declineButton: {
    width: '35%',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
