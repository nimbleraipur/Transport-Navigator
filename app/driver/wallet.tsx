import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import io from 'socket.io-client';

export interface WalletTransactionItem {
    _id: string;
    type: 'credit' | 'debit';
    amount: number;
    balanceAfter: number;
    category: 'admin_recharge' | 'trip_earning' | 'commission_deduction' | 'manual_adjustment';
    description: string;
    referenceId?: string;
    createdByName?: string;
    createdAt: string;
}

export default function WalletScreen() {
    const { user, token, refreshUser } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
    const [settings, setSettings] = useState<{ minWalletBalance: number; commissionPercentage: number }>({
        minWalletBalance: 100,
        commissionPercentage: 5
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadWalletData = useCallback(async () => {
        if (!token) return;
        try {
            const baseUrl = getApiUrl();
            
            // 1. Fetch system settings (min balance, commission %)
            try {
                const settingsRes = await fetch(new URL('/api/users/settings', baseUrl).toString(), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (settingsRes.ok) {
                    const data = await settingsRes.json();
                    if (data.settings) setSettings(data.settings);
                }
            } catch (e) {
                console.warn('[WALLET-SCREEN] Failed to load settings:', e);
            }

            // 2. Fetch wallet transaction history
            try {
                const txRes = await fetch(new URL('/api/users/wallet/transactions', baseUrl).toString(), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (txRes.ok) {
                    const data = await txRes.json();
                    if (data.transactions) setTransactions(data.transactions);
                }
            } catch (e) {
                console.warn('[WALLET-SCREEN] Failed to load transactions:', e);
            }

            await refreshUser();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, refreshUser]);

    useEffect(() => {
        loadWalletData();
    }, [loadWalletData]);

    // Socket listener for instant balance & ledger updates
    useEffect(() => {
        if (!user?.id) return;
        const baseUrl = getApiUrl();
        const socket = io(baseUrl, { query: { driverId: user.id } });

        socket.on('wallet:updated', () => {
            console.log('[WALLET-SOCKET] Received wallet:updated event — refreshing data');
            loadWalletData();
        });

        return () => {
            socket.disconnect();
        };
    }, [user?.id, loadWalletData]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadWalletData();
    };

    const handleCallSupport = () => {
        Linking.openURL('tel:7354647786');
    };

    const handleOnlineRecharge = () => {
        alert('Online instant recharge will be available soon. Please use Offline Recharge / Support call for instant top-up.');
    };

    const formatDate = (isoString: string) => {
        try {
            const d = new Date(isoString);
            return d.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return isoString;
        }
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
                    <TouchableOpacity 
                        onPress={handleRefresh} 
                        className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/10"
                    >
                        <Ionicons name="refresh" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View className="items-center">
                    <Text className="text-[10px] font-inter-medium text-white/50 uppercase tracking-[2px]">Available Balance</Text>
                    <View className="flex-row items-end mt-2">
                        <Text className="text-4xl font-inter-bold text-surface mb-1 mr-1">₹</Text>
                        <Text className="text-6xl font-inter-bold text-surface">{user?.walletBalance ?? 0}</Text>
                    </View>
                    
                    {(user?.walletBalance ?? 0) < settings.minWalletBalance && (
                        <View className="bg-danger/20 px-4 py-2 rounded-xl mt-6 border border-danger/30 flex-row items-center">
                            <Ionicons name="warning" size={16} color="#F87171" className="mr-2" />
                            <Text className="text-[10px] font-inter-bold text-danger uppercase tracking-tighter">
                                {(user?.walletBalance ?? 0) < 0 ? 'Negative Balance: Account on Hold' : `Low Balance: Maintain min ₹${settings.minWalletBalance}`}
                            </Text>
                        </View>
                    )}
                </View>
            </LinearGradient>

            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
                }
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

                {/* Dynamic Policy Guidelines Notice */}
                <View className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 mb-8">
                    <View className="flex-row items-start mb-3">
                        <Ionicons name="information-circle-outline" size={22} color="#3B82F6" className="mr-3" />
                        <Text className="flex-1 text-sm font-inter-bold text-blue-800">Wallet Guidelines</Text>
                    </View>
                    <View className="space-y-3">
                        <View className="flex-row items-start">
                            <View className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 mr-3" />
                            <Text className="flex-1 text-[11px] font-inter-medium text-blue-700/80 leading-relaxed">
                                Minimum maintainable balance is <Text className="font-inter-bold text-blue-900">₹{settings.minWalletBalance}</Text>.
                            </Text>
                        </View>
                        <View className="flex-row items-start">
                            <View className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 mr-3" />
                            <Text className="flex-1 text-[11px] font-inter-medium text-blue-700/80 leading-relaxed">
                                Negative balance results in automatic account hold.
                            </Text>
                        </View>
                        <View className="flex-row items-start">
                            <View className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 mr-3" />
                            <Text className="flex-1 text-[11px] font-inter-medium text-blue-700/80 leading-relaxed">
                                System commission of <Text className="font-inter-bold text-blue-900">{settings.commissionPercentage}%</Text> is deducted directly upon trip completion.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Dynamic Recent Transactions Activity Ledger */}
                <View className="flex-row items-center justify-between mb-4 mt-2 px-1">
                    <Text className="text-base font-inter-bold text-text">Recent Activity</Text>
                    <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase">Real-Time Ledger</Text>
                </View>
                
                {loading && transactions.length === 0 ? (
                    <View className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100 items-center justify-center">
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text className="text-[11px] font-inter-medium text-text-tertiary mt-2">Loading transactions...</Text>
                    </View>
                ) : transactions.length === 0 ? (
                    <View className="bg-gray-50/50 p-10 rounded-3xl border border-dashed border-gray-200 items-center">
                        <MaterialCommunityIcons name="history" size={28} color="#9CA3AF" />
                        <Text className="text-[11px] font-inter-medium text-text-tertiary mt-3">No recent wallet activity found</Text>
                    </View>
                ) : (
                    <View className="space-y-3">
                        {transactions.map((tx) => {
                            const isCredit = tx.type === 'credit';
                            return (
                                <View 
                                    key={tx._id} 
                                    className="bg-surface p-4 rounded-2xl flex-row items-center justify-between border border-gray-100 shadow-sm"
                                >
                                    <View className="flex-row items-center flex-1 mr-3">
                                        <View className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${isCredit ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                                            <MaterialCommunityIcons 
                                                name={isCredit ? 'arrow-bottom-left' : 'arrow-top-right'} 
                                                size={22} 
                                                color={isCredit ? '#10B981' : '#F43F5E'} 
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-xs font-inter-bold text-text font-medium" numberOfLines={1}>
                                                {tx.description || (isCredit ? 'Credit Entry' : 'Debit Entry')}
                                            </Text>
                                            <Text className="text-[10px] font-inter-medium text-text-tertiary mt-0.5">
                                                {formatDate(tx.createdAt)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="items-end">
                                        <Text className={`text-sm font-inter-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {isCredit ? '+' : '-'} ₹{tx.amount}
                                        </Text>
                                        <Text className="text-[9px] font-inter-medium text-text-tertiary mt-0.5">
                                            Bal: ₹{tx.balanceAfter}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

