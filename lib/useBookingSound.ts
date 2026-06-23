import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Global singleton for Audio Sound to prevent overlapping/multiple instances
let globalSound: Audio.Sound | null = null;
let isSoundLoading = false;
let stopTimeoutId: any = null;

async function getOrLoadSound(): Promise<Audio.Sound | null> {
  if (globalSound) return globalSound;
  if (isSoundLoading) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (globalSound) return globalSound;
  }

  isSoundLoading = true;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });
    const { sound } = await Audio.Sound.createAsync(
      require('@/assets/sounds/new-booking.mp3.mpeg'),
      { shouldPlay: false, volume: 1.0 }
    );
    globalSound = sound;
  } catch (e) {
    console.warn('[BookingSound] Failed to load sound:', e);
  } finally {
    isSoundLoading = false;
  }
  return globalSound;
}

export function useBookingSound() {
  useEffect(() => {
    // Pre-load the singleton sound on mount
    getOrLoadSound();
  }, []);

  const playBookingAlert = useCallback(async () => {
    try {
      // Haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const sound = await getOrLoadSound();
      if (sound) {
        // Clear any existing stop timeout
        if (stopTimeoutId) {
          clearTimeout(stopTimeoutId);
          stopTimeoutId = null;
        }

        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.setIsLoopingAsync(true);
          await sound.setPositionAsync(0);
          await sound.playAsync();

          // Auto-stop the sound after 30 seconds
          stopTimeoutId = setTimeout(async () => {
            try {
              console.log('[BookingSound] Auto-stopping sound after 30 seconds');
              if (globalSound) {
                const checkStatus = await globalSound.getStatusAsync();
                if (checkStatus.isLoaded && checkStatus.isPlaying) {
                  await globalSound.stopAsync();
                }
              }
            } catch (err) {
              console.warn('[BookingSound] Failed to auto-stop sound:', err);
            }
            stopTimeoutId = null;
          }, 30000);
        }
      }
    } catch (e) {
      console.warn('[BookingSound] Failed to play sound:', e);
    }
  }, []);

  const stopBookingAlert = useCallback(async () => {
    try {
      if (stopTimeoutId) {
        clearTimeout(stopTimeoutId);
        stopTimeoutId = null;
      }
      if (globalSound) {
        const status = await globalSound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await globalSound.stopAsync();
        }
      }
    } catch (e) {
      console.warn('[BookingSound] Failed to stop sound:', e);
    }
  }, []);

  return { playBookingAlert, stopBookingAlert };
}
