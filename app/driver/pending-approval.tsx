import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    Easing,
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';
import { io as socketIO } from 'socket.io-client';

const STEPS = [
    {
        icon: 'document-text-outline' as const,
        label: 'Docs Received',
        desc: 'Docs uploaded successfully.',
        color: '#10B981',
        done: true,
    },
    {
        icon: 'eye-outline' as const,
        label: 'Admin Review',
        desc: 'Verifying identity details.',
        color: '#6366F1',
        done: false,
    },
    {
        icon: 'checkmark-circle-outline' as const,
        label: 'Activation',
        desc: 'Account active on approval.',
        color: '#F59E0B',
        done: false,
    },
];

export default function PendingApprovalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, refreshUser, logout } = useAuth();

    // Animations
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const ringAnim = useRef(new Animated.Value(0)).current;

    const [pollCount, setPollCount] = useState(0);

    // Entry animation
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    // Rotating clock animation
    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    // Pulse animation on outer ring
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Ring ripple animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(ringAnim, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Poll for approval every 5 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            await refreshUser();
            setPollCount(c => c + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Real-time socket for instant approval notification
    useEffect(() => {
        if (!user?.id) return;
        let socket: any;
        try {
            let baseUrl = getApiUrl();
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            socket = socketIO(baseUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });
            socket.on('driver:approved', async (data: { driverId: string }) => {
                if (data.driverId === user.id) {
                    await refreshUser();
                }
            });
            socket.on('driver:rejected', async (data: { driverId: string }) => {
                if (data.driverId === user.id) {
                    await refreshUser();
                }
            });
        } catch (e) {
            // Socket optional — polling will still work
        }
        return () => { if (socket) socket.disconnect(); };
    }, [user?.id]);

    // Auto-redirect when approved
    useEffect(() => {
        if (user?.verificationStatus === 'approved' && user?.isApproved) {
            router.replace('/driver/dashboard' as any);
        } else if (user?.verificationStatus === 'rejected') {
            router.replace('/driver/verify' as any);
        }
    }, [user?.verificationStatus, user?.isApproved]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
    const ringOpacity = ringAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.2, 0] });

    return (
        <LinearGradient
            colors={['#0A0F1E', '#0F1A35', '#1A2550']}
            className="flex-1"
        >
            <Animated.ScrollView
                className="flex-1"
                contentContainerStyle={{ flexGrow: 1 }}
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24, paddingBottom: 8 }}>
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center mr-3">
                                <MaterialCommunityIcons name="shield-check-outline" size={18} color="rgba(255,255,255,0.7)" />
                            </View>
                            <Text className="text-white/60 font-inter-medium text-sm">Verification in Progress</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => logout()}
                            className="w-9 h-9 rounded-full bg-white/10 items-center justify-center"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Center Animation */}
                <View className="flex-1 items-center justify-center px-6 py-4">
                    {/* Ripple Ring */}
                    <View className="items-center justify-center mb-6 mt-4">
                        <Animated.View
                            style={[
                                styles.ripple,
                                { transform: [{ scale: ringScale }], opacity: ringOpacity }
                            ]}
                        />
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <LinearGradient
                                colors={['#6366F1', '#818CF8', '#4F46E5']}
                                style={styles.iconCircle}
                            >
                                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                    <Ionicons name="time" size={52} color="#ffffff" />
                                </Animated.View>
                            </LinearGradient>
                        </Animated.View>
                    </View>

                    {/* Title */}
                    <Text className="text-2xl font-inter-bold text-white text-center mb-2">
                        Under Review
                    </Text>
                    <Text className="text-white/50 font-inter-medium text-sm text-center leading-5 mb-6">
                        Verifying your details.{'\n'}You'll be notified shortly.
                    </Text>

                    {/* Status Card */}
                    <View className="w-full bg-white/8 rounded-3xl p-5 border border-white/10 mb-6">
                        <View className="flex-row items-center mb-4">
                            <View className="w-2 h-2 rounded-full bg-amber-400 mr-2" />
                            <Text className="text-amber-400 font-inter-bold text-xs uppercase tracking-widest">
                                Pending Approval
                            </Text>
                        </View>

                        {STEPS.map((step, index) => (
                            <View key={index} className="flex-row items-start mb-4">
                                {/* Line */}
                                <View className="items-center mr-4">
                                    <View
                                        style={[
                                            styles.stepIcon,
                                            { backgroundColor: step.done ? step.color + '30' : 'rgba(255,255,255,0.08)' }
                                        ]}
                                    >
                                        <Ionicons
                                            name={step.icon}
                                            size={18}
                                            color={step.done ? step.color : (index === 1 ? '#818CF8' : 'rgba(255,255,255,0.3)')}
                                        />
                                    </View>
                                    {index < STEPS.length - 1 && (
                                        <View
                                            style={[
                                                styles.stepLine,
                                                { backgroundColor: step.done ? step.color + '40' : 'rgba(255,255,255,0.08)' }
                                            ]}
                                        />
                                    )}
                                </View>
                                {/* Text */}
                                <View className="flex-1 pt-0.5 pb-3">
                                    <Text
                                        className="font-inter-bold text-sm mb-1"
                                        style={{ color: step.done ? step.color : (index === 1 ? '#818CF8' : 'rgba(255,255,255,0.4)') }}
                                    >
                                        {step.label}
                                    </Text>
                                    <Text className="font-inter-medium text-xs text-white/40 leading-5">
                                        {step.desc}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Info Badge */}
                    <View className="flex-row items-center bg-indigo-500/15 rounded-2xl px-4 py-3 border border-indigo-400/20 w-full mt-2">
                        <Ionicons name="information-circle-outline" size={20} color="#818CF8" />
                        <Text className="text-indigo-300 font-inter-medium text-xs ml-2 flex-1 leading-4">
                            Takes 24–48hrs. Auto-checking status...
                        </Text>
                    </View>
                </View>

                {/* Bottom Actions */}
                <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
                    <TouchableOpacity
                        onPress={async () => {
                            await refreshUser();
                        }}
                        activeOpacity={0.8}
                        className="h-14 rounded-2xl overflow-hidden mb-3"
                    >
                        <LinearGradient
                            colors={['#6366F1', '#4F46E5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="flex-1 flex-row items-center justify-center"
                        >
                            <Ionicons name="refresh" size={20} color="#fff" />
                            <Text className="text-white font-inter-bold text-sm ml-2">
                                Refresh Status
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text className="text-white/20 font-inter-medium text-xs text-center">
                        Auto-checking every 5s · Checked {pollCount} time{pollCount !== 1 ? 's' : ''}
                    </Text>
                </View>
            </Animated.ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 16,
    },
    ripple: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#6366F1',
    },
    stepIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepLine: {
        width: 2,
        flex: 1,
        minHeight: 16,
        marginTop: 4,
        borderRadius: 1,
    },
});
