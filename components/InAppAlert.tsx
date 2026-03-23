import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

const { width, height } = Dimensions.get('window');

export type AlertType = 'error' | 'warning' | 'success' | 'info';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface InAppAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}
//inke jo colour hai app ke blue colour se match krna hai 
const TYPE_CONFIG = {
  error: {
    icon: 'close-circle' as const,
    gradient: [Colors.danger, '#0645d9ff'] as [string, string],
    glow: 'rgba(239, 68, 68, 0.25)',
    label: 'Error',
  },
  warning: {
    icon: 'warning' as const,
    gradient: [Colors.warning, '#0645d9ff'] as [string, string],
    glow: 'rgba(245, 158, 11, 0.25)',
    label: 'Notice',
  },
  success: {
    icon: 'checkmark-circle' as const,
    gradient: [Colors.success, '#0645d9ff'] as [string, string],
    glow: 'rgba(16, 185, 129, 0.25)',
    label: 'Success',
  },
  info: {
    icon: 'information-circle' as const,
    gradient: [Colors.primary, Colors.primaryDark] as [string, string],
    glow: Colors.primaryGlow,
    label: 'Info',
  },
};

export default function InAppAlert({
  visible,
  type = 'info',
  title,
  message,
  buttons,
  onDismiss,
}: InAppAlertProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  const cfg = TYPE_CONFIG[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(iconScale, { toValue: 1, tension: 160, friction: 6, useNativeDriver: true }).start();
      });
    } else {
      iconScale.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const defaultButtons: AlertButton[] = buttons && buttons.length > 0
    ? buttons
    : [{ text: 'Got it', style: 'default', onPress: onDismiss }];

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5, 10, 22, 0.65)' }]}
          activeOpacity={1}
          onPress={defaultButtons.length === 1 ? (defaultButtons[0].onPress ?? onDismiss) : undefined}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Icon circle */}
          <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}>
            {/* Glow ring */}
            <View style={[styles.glowRing, { backgroundColor: cfg.glow }]} />
            <LinearGradient
              colors={cfg.gradient}
              style={styles.iconCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={cfg.icon} size={36} color="#fff" />
            </LinearGradient>
          </Animated.View>

          {/* Type label */}
          <Text style={[styles.typeLabel, { color: cfg.gradient[0] }]}>{cfg.label}</Text>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          {!!message && <Text style={styles.message}>{message}</Text>}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Buttons */}
          <View style={styles.buttonsRow}>
            {defaultButtons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              const isPrimary = !isCancel && !isDestructive;

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => { btn.onPress?.(); }}
                  activeOpacity={0.75}
                  style={[
                    styles.btn,
                    defaultButtons.length === 1 && { flex: 1 },
                    defaultButtons.length > 1 && i === 0 && { flex: 1, marginRight: 8 },
                    defaultButtons.length > 1 && i > 0 && { flex: 1 },
                    isCancel && styles.btnCancel,
                    isDestructive && styles.btnDestructive,
                  ]}
                >
                  {isPrimary ? (
                    <LinearGradient
                      colors={cfg.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      <Text style={styles.btnTextPrimary}>{btn.text}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.btnGradient}>
                      <Text style={[
                        styles.btnTextSecondary,
                        isDestructive && { color: Colors.danger },
                      ]}>{btn.text}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom safe area space */}
          <View style={{ height: 24 }} />
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 28,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  glowRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    opacity: 0.85,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    width: '100%',
    marginTop: 24,
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  btn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnCancel: {
    backgroundColor: Colors.borderLight,
  },
  btnDestructive: {
    backgroundColor: Colors.dangerLight,
  },
  btnGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  btnTextSecondary: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
