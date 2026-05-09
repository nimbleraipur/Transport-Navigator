import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WalletScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleCallSupport = () => {
        // Support number for offline recharge
        Linking.openURL('tel:7354647786');
    };

    const handleOnlineRecharge = () => {
        // Placeholder for future payment gateway integration
        alert('Online recharge will be available soon. Please use the offline method for now.');
    };

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <LinearGradient
                colors={['#1F2937', '#111827']}
                className="px-6 pb-12 rounded-b-[32px] shadow-2xl"
                style={{ paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 12) }}
            >
                <View className="flex-row items-center justify-between mb-10">
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/10"
                    >
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text className="text-xl font-inter-bold text-surface">Driver Wallet</Text>
                    <View className="w-10" />
                </View>

                <View className="items-center">
                    <Text className="text-[10px] font-inter-medium text-white/50 uppercase tracking-[2px]">Available Balance</Text>
                    <View className="flex-row items-end mt-2">
                        <Text className="text-4xl font-inter-bold text-surface mb-1 mr-1">₹</Text>
                        <Text className="text-6xl font-inter-bold text-surface">{user?.walletBalance ?? 0}</Text>
                    </View>
                    
                    {(user?.walletBalance ?? 0) < 0 && (
                        <View className="bg-danger/20 px-4 py-2 rounded-xl mt-6 border border-danger/30 flex-row items-center">
                            <Ionicons name="warning" size={16} color="#F87171" className="mr-2" />
                            <Text className="text-[10px] font-inter-bold text-danger uppercase tracking-tighter">Negative Balance: Account on Hold</Text>
                        </View>
                    )}
                </View>
            </LinearGradient>

            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-lg font-inter-bold text-text mb-6 tracking-tight">Add Funds to Wallet</Text>

                {/* Option 1: Online Payment */}
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={handleOnlineRecharge}
                    className="bg-surface p-5 rounded-3xl mb-5 flex-row items-center border border-[#F3F4F6] shadow-xl shadow-black/5"
                >
                    <View className="w-14 h-14 bg-primary/10 rounded-2xl items-center justify-center mr-4">
                        <MaterialCommunityIcons name="lightning-bolt" size={28} color={Colors.primary} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-inter-bold text-text">Instant Online</Text>
                        <Text className="text-[11px] font-inter-medium text-text-tertiary mt-1">UPI, Debit/Credit Cards</Text>
                    </View>
                    <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center">
                        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                    </View>
                </TouchableOpacity>

                {/* Option 2: Offline/Support Payment */}
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={handleCallSupport}
                    className="bg-surface p-5 rounded-3xl mb-8 flex-row items-center border border-[#F3F4F6] shadow-xl shadow-black/5"
                >
                    <View className="w-14 h-14 bg-success/10 rounded-2xl items-center justify-center mr-4">
                        <MaterialCommunityIcons name="account-group" size={28} color="#10B981" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-inter-bold text-text">Offline Recharge</Text>
                        <Text className="text-[11px] font-inter-medium text-text-tertiary mt-1">Cash or Bank Transfer (Call Support)</Text>
                    </View>
                    <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center">
                        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                    </View>
                </TouchableOpacity>

                {/* Policy Notice */}
                <View className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 mb-8">
                    <View className="flex-row items-start mb-3">
                        <Ionicons name="information-circle-outline" size={22} color="#3B82F6" className="mr-3" />
                        <Text className="flex-1 text-sm font-inter-bold text-blue-800">Wallet Guidelines</Text>
                    </View>
                    <View className="space-y-3">
                        <View className="flex-row items-start">
                            <View className="w-1 h-1 rounded-full bg-blue-400 mt-2 mr-3" />
                            <Text className="flex-1 text-[11px] font-inter-medium text-blue-700/80 leading-relaxed">
                                Minimum maintainable balance is ₹100.
                            </Text>
                        </View>
                        <View className="flex-row items-start">
                            <View className="w-1 h-1 rounded-full bg-blue-400 mt-2 mr-3" />
                            <Text className="flex-1 text-[11px] font-inter-medium text-blue-700/80 leading-relaxed">
                                Negative balance results in automatic account hold.
                            </Text>
                        </View>
                        <View className="flex-row items-start">
                            <View className="w-1 h-1 rounded-full bg-blue-400 mt-2 mr-3" />
                            <Text className="flex-1 text-[11px] font-inter-medium text-blue-700/80 leading-relaxed">
                                System commissions are deducted directly from this balance upon trip completion.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Recent Transactions Placeholder */}
                <View className="flex-row items-center justify-between mb-4 mt-2 px-1">
                    <Text className="text-base font-inter-bold text-text">Recent Activity</Text>
                    <TouchableOpacity>
                        <Text className="text-[10px] font-inter-bold text-primary uppercase">View Reports</Text>
                    </TouchableOpacity>
                </View>
                
                <View className="bg-gray-50/50 p-10 rounded-3xl border border-dashed border-gray-200 items-center">
                    <MaterialCommunityIcons name="history" size={24} color="#9CA3AF" />
                    <Text className="text-[11px] font-inter-medium text-text-tertiary mt-3">No recent wallet activity found</Text>
                </View>
            </ScrollView>
        </View>
    );
}
