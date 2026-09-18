import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView, 
    Linking, 
    Platform, 
    RefreshControl, 
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
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
    category: 'online_recharge' | 'admin_recharge' | 'trip_earning' | 'commission_deduction' | 'manual_adjustment' | 'bonus' | 'refund';
    description: string;
    referenceId?: string;
    paymentGateway?: string;
    orderId?: string;
    paymentId?: string;
    status?: 'pending' | 'success' | 'failed' | 'refunded';
    createdByName?: string;
    createdAt: string;
}

const PRESET_AMOUNTS = [200, 500, 1000, 2000];

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
    const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');

    // Top-up Modal State
    const [isTopUpModalVisible, setIsTopUpModalVisible] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState<string>('500');
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);

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

        socket.on('wallet:updated', (payload: any) => {
            console.log('[WALLET-SOCKET] Received wallet:updated event:', payload);
            try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (_) {}
            loadWalletData();
        });

        socket.on('wallet:balance_update', (payload: any) => {
            if (payload?.userId === user.id) {
                console.log('[WALLET-SOCKET] Received wallet:balance_update:', payload);
                loadWalletData();
            }
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

    const handleOpenTopUpModal = () => {
        setIsTopUpModalVisible(true);
    };

    const handleCloseTopUpModal = () => {
        if (isProcessingOrder) return;
        setIsTopUpModalVisible(false);
    };

    const handleSelectPreset = (amount: number) => {
        setRechargeAmount(String(amount));
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (_) {}
    };

    const handleProceedToRazorpay = async () => {
        const numAmount = parseInt(rechargeAmount, 10);
        if (isNaN(numAmount) || numAmount < 10) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount (Minimum ₹10).');
            return;
        }
        if (numAmount > 50000) {
            Alert.alert('Amount Limit Exceeded', 'Maximum recharge amount at a time is ₹50,000.');
            return;
        }

        setIsProcessingOrder(true);
        try {
            const baseUrl = getApiUrl();
            
            // Create Razorpay Order on server
            const orderRes = await fetch(new URL('/api/users/wallet/create-razorpay-order', baseUrl).toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ amount: numAmount })
            });

            const orderData = await orderRes.json();
            if (!orderRes.ok || !orderData.success) {
                throw new Error(orderData.error || 'Failed to initiate payment order');
            }

            const { orderId } = orderData;
            const checkoutUrl = `${baseUrl}/api/users/wallet/checkout-page?orderId=${orderId}`;

            console.log(`[WALLET-CHECKOUT] Opening Razorpay checkout: ${checkoutUrl}`);

            // Launch Secure In-App Payment Browser
            const result = await WebBrowser.openAuthSessionAsync(
                checkoutUrl,
                'transportgo://wallet-callback'
            );

            console.log('[WALLET-CHECKOUT-RESULT]', result);

            // Handle result callback
            if (result.type === 'success' && result.url) {
                if (result.url.includes('status=success')) {
                    try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (_) {}
                    setIsTopUpModalVisible(false);
                    Alert.alert(
                        'Payment Successful! 💳',
                        `₹${numAmount} has been added to your wallet balance.`,
                        [{ text: 'Great!', onPress: () => loadWalletData() }]
                    );
                } else if (result.url.includes('status=failed')) {
                    Alert.alert('Payment Failed', 'Transaction could not be completed. Please try again.');
                }
            }

            // Always trigger a refresh after browser session ends to sync latest balance
            await loadWalletData();
        } catch (error: any) {
            console.error('[WALLET-TOPUP-ERROR]', error);
            Alert.alert('Recharge Error', error.message || 'Unable to process payment at this time.');
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const formatDate = (isoString: string) => {
        try {
            const d = new Date(isoString);
            return d.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return isoString;
        }
    };

    const getCategoryBadge = (tx: WalletTransactionItem) => {
        if (tx.category === 'online_recharge') {
            return { label: 'Online Top-up', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        }
        if (tx.category === 'admin_recharge') {
            return { label: 'Admin Top-up', color: 'bg-blue-50 text-blue-700 border-blue-200' };
        }
        if (tx.category === 'commission_deduction') {
            return { label: 'Platform Commission', color: 'bg-amber-50 text-amber-700 border-amber-200' };
        }
        if (tx.category === 'trip_earning') {
            return { label: 'Trip Fare', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
        }
        return { label: 'Adjustment', color: 'bg-gray-50 text-gray-700 border-gray-200' };
    };

    const filteredTransactions = transactions.filter(tx => {
        if (filterType === 'credit') return tx.type === 'credit';
        if (filterType === 'debit') return tx.type === 'debit';
        return true;
    });

    const currentBalance = user?.walletBalance ?? 0;
    const isLowBalance = currentBalance < settings.minWalletBalance;

    return (
        <View className="flex-1 bg-[#F8FAFC]">
            {/* Header / Hero Gradient */}
            <LinearGradient
                colors={['#0F172A', '#1E293B']}
                className="px-6 pb-10 rounded-b-[36px] shadow-2xl"
                style={{ paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 12) }}
            >
                <View className="flex-row items-center justify-between mb-8">
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center border border-white/10"
                    >
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text className="text-lg font-inter-bold text-white tracking-tight">Driver Wallet</Text>
                    <TouchableOpacity 
                        onPress={handleRefresh} 
                        className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center border border-white/10"
                    >
                        <Ionicons name="refresh" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Available Balance Card */}
                <View className="items-center">
                    <Text className="text-[11px] font-inter-bold text-white/60 uppercase tracking-[2px]">Available Balance</Text>
                    <View className="flex-row items-center mt-2">
                        <Text className="text-3xl font-inter-bold text-blue-400 mr-1">₹</Text>
                        <Text className="text-5xl font-inter-bold text-white tracking-tight">{currentBalance.toLocaleString('en-IN')}</Text>
                    </View>
                    
                    {isLowBalance && (
                        <View className="bg-rose-500/20 px-4 py-2 rounded-2xl mt-4 border border-rose-500/30 flex-row items-center">
                            <Ionicons name="warning" size={16} color="#FB7185" />
                            <Text className="text-[11px] font-inter-bold text-rose-300 ml-1.5 uppercase tracking-tight">
                                {currentBalance < 0 ? 'Account Suspended: Negative Balance' : `Low Balance: Maintain min ₹${settings.minWalletBalance}`}
                            </Text>
                        </View>
                    )}

                    {/* Quick Add Funds Action Button */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleOpenTopUpModal}
                        className="mt-6 bg-gradient-to-r bg-blue-600 px-8 py-3.5 rounded-2xl flex-row items-center shadow-lg shadow-blue-500/30 border border-blue-400/30"
                    >
                        <Ionicons name="add-circle" size={22} color="#FFF" />
                        <Text className="text-white font-inter-bold text-sm ml-2 tracking-wide">Add Money / Recharge</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
                }
            >
                {/* Recharge Methods Section */}
                <Text className="text-sm font-inter-bold text-gray-500 uppercase tracking-wider mb-4 px-1">Recharge Options</Text>

                {/* Option 1: Instant Online Recharge via Razorpay */}
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={handleOpenTopUpModal}
                    className="bg-white p-4.5 rounded-3xl mb-3.5 flex-row items-center border border-gray-100 shadow-sm"
                >
                    <View className="w-13 h-13 bg-blue-50 border border-blue-100 rounded-2xl items-center justify-center mr-4">
                        <MaterialCommunityIcons name="lightning-bolt" size={26} color="#2563EB" />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center">
                            <Text className="text-base font-inter-bold text-gray-900">Instant Online Recharge</Text>
                            <View className="bg-emerald-100 px-2 py-0.5 rounded-full ml-2">
                                <Text className="text-[10px] font-inter-bold text-emerald-800">Auto-Credit</Text>
                            </View>
                        </View>
                        <Text className="text-xs font-inter-medium text-gray-500 mt-1">UPI (GPay, PhonePe, Paytm), Cards, NetBanking</Text>
                    </View>
                    <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center">
                        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </View>
                </TouchableOpacity>

                {/* Option 2: Offline / Support Recharge */}
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={handleCallSupport}
                    className="bg-white p-4.5 rounded-3xl mb-6 flex-row items-center border border-gray-100 shadow-sm"
                >
                    <View className="w-13 h-13 bg-emerald-50 border border-emerald-100 rounded-2xl items-center justify-center mr-4">
                        <MaterialCommunityIcons name="phone-in-talk" size={24} color="#10B981" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-inter-bold text-gray-900">Offline Recharge / Support</Text>
                        <Text className="text-xs font-inter-medium text-gray-500 mt-1">Call Support for Cash / Direct Bank Transfer</Text>
                    </View>
                    <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center">
                        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </View>
                </TouchableOpacity>

                {/* Guidelines Box */}
                <View className="bg-blue-50/70 p-5 rounded-3xl border border-blue-100 mb-6">
                    <View className="flex-row items-center mb-3">
                        <Ionicons name="information-circle" size={20} color="#2563EB" />
                        <Text className="text-sm font-inter-bold text-blue-900 ml-2">Wallet Terms & Policy</Text>
                    </View>
                    <View className="space-y-2">
                        <View className="flex-row items-start">
                            <Text className="text-blue-500 mr-2">•</Text>
                            <Text className="flex-1 text-xs font-inter-medium text-blue-950 leading-relaxed">
                                Maintain minimum <Text className="font-inter-bold">₹{settings.minWalletBalance}</Text> to receive new booking requests without interruption.
                            </Text>
                        </View>
                        <View className="flex-row items-start">
                            <Text className="text-blue-500 mr-2">•</Text>
                            <Text className="flex-1 text-xs font-inter-medium text-blue-950 leading-relaxed">
                                System commission of <Text className="font-inter-bold">{settings.commissionPercentage}%</Text> is auto-debited upon trip completion.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Transaction Passbook Ledger Section */}
                <View className="flex-row items-center justify-between mb-3 px-1">
                    <Text className="text-base font-inter-bold text-gray-900">Passbook Ledger</Text>
                    <Text className="text-xs font-inter-semibold text-gray-400">{transactions.length} entries</Text>
                </View>

                {/* Filter Pills */}
                <View className="flex-row items-center mb-4 bg-gray-100 p-1 rounded-2xl">
                    <TouchableOpacity
                        onPress={() => setFilterType('all')}
                        className={`flex-1 py-2 items-center rounded-xl ${filterType === 'all' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`text-xs font-inter-bold ${filterType === 'all' ? 'text-gray-900' : 'text-gray-500'}`}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilterType('credit')}
                        className={`flex-1 py-2 items-center rounded-xl ${filterType === 'credit' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`text-xs font-inter-bold ${filterType === 'credit' ? 'text-emerald-700' : 'text-gray-500'}`}>+ Credits</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilterType('debit')}
                        className={`flex-1 py-2 items-center rounded-xl ${filterType === 'debit' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`text-xs font-inter-bold ${filterType === 'debit' ? 'text-rose-700' : 'text-gray-500'}`}>- Debits</Text>
                    </TouchableOpacity>
                </View>
                
                {loading && transactions.length === 0 ? (
                    <View className="bg-white p-8 rounded-3xl border border-gray-100 items-center justify-center">
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text className="text-xs font-inter-medium text-gray-400 mt-2">Loading transactions...</Text>
                    </View>
                ) : filteredTransactions.length === 0 ? (
                    <View className="bg-white p-10 rounded-3xl border border-dashed border-gray-200 items-center">
                        <MaterialCommunityIcons name="wallet-outline" size={32} color="#94A3B8" />
                        <Text className="text-xs font-inter-medium text-gray-500 mt-3">No {filterType !== 'all' ? filterType : ''} transactions recorded yet</Text>
                    </View>
                ) : (
                    <View className="space-y-3">
                        {filteredTransactions.map((tx) => {
                            const isCredit = tx.type === 'credit';
                            const badge = getCategoryBadge(tx);
                            return (
                                <View 
                                    key={tx._id} 
                                    className="bg-white p-4 rounded-2xl flex-row items-center justify-between border border-gray-100 shadow-sm"
                                >
                                    <View className="flex-row items-center flex-1 mr-3">
                                        <View className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${isCredit ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                                            <MaterialCommunityIcons 
                                                name={isCredit ? 'arrow-down-left' : 'arrow-up-right'} 
                                                size={22} 
                                                color={isCredit ? '#10B981' : '#F43F5E'} 
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-xs font-inter-bold text-gray-900" numberOfLines={1}>
                                                {tx.description || (isCredit ? 'Credit Entry' : 'Debit Entry')}
                                            </Text>
                                            <View className="flex-row items-center mt-1 flex-wrap gap-1">
                                                <View className={`px-1.5 py-0.5 rounded-md border ${badge.color}`}>
                                                    <Text className="text-[9px] font-inter-bold">{badge.label}</Text>
                                                </View>
                                                {tx.paymentId && (
                                                    <Text className="text-[9px] font-inter-medium text-gray-400">
                                                        #{tx.paymentId.slice(-8)}
                                                    </Text>
                                                )}
                                            </View>
                                            <Text className="text-[10px] font-inter-medium text-gray-400 mt-1">
                                                {formatDate(tx.createdAt)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="items-end">
                                        <Text className={`text-base font-inter-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {isCredit ? '+' : '-'} ₹{tx.amount}
                                        </Text>
                                        <Text className="text-[10px] font-inter-medium text-gray-400 mt-0.5">
                                            Bal: ₹{tx.balanceAfter}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Razorpay Top-Up BottomSheet Modal */}
            <Modal
                visible={isTopUpModalVisible}
                transparent
                animationType="slide"
                onRequestClose={handleCloseTopUpModal}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View className="flex-1 bg-black/60 justify-end">
                        <KeyboardAvoidingView 
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            className="bg-white rounded-t-[36px] px-6 pt-6 pb-10 border-t border-gray-100 shadow-2xl"
                        >
                            {/* Modal Header */}
                            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3 border border-blue-100">
                                        <MaterialCommunityIcons name="credit-card-plus" size={22} color="#2563EB" />
                                    </View>
                                    <View>
                                        <Text className="text-base font-inter-bold text-gray-900">Add Money to Wallet</Text>
                                        <Text className="text-[11px] font-inter-medium text-gray-400">Instant UPI & Online Recharge</Text>
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    onPress={handleCloseTopUpModal}
                                    disabled={isProcessingOrder}
                                    className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                                >
                                    <Ionicons name="close" size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {/* Amount Input */}
                            <View className="my-6">
                                <Text className="text-xs font-inter-bold text-gray-500 uppercase tracking-wider mb-2">Enter Recharge Amount (₹)</Text>
                                <View className="flex-row items-center bg-gray-50 border-2 border-blue-500/30 rounded-2xl px-4 py-3">
                                    <Text className="text-2xl font-inter-bold text-blue-600 mr-2">₹</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        value={rechargeAmount}
                                        onChangeText={setRechargeAmount}
                                        placeholder="500"
                                        placeholderTextColor="#94A3B8"
                                        className="flex-1 text-2xl font-inter-bold text-gray-900"
                                        maxLength={6}
                                        editable={!isProcessingOrder}
                                    />
                                </View>
                            </View>

                            {/* Quick Amount Preset Chips */}
                            <Text className="text-xs font-inter-bold text-gray-500 uppercase tracking-wider mb-3">Popular Amounts</Text>
                            <View className="flex-row justify-between mb-6">
                                {PRESET_AMOUNTS.map((amt) => {
                                    const isSelected = rechargeAmount === String(amt);
                                    return (
                                        <TouchableOpacity
                                            key={amt}
                                            onPress={() => handleSelectPreset(amt)}
                                            disabled={isProcessingOrder}
                                            className={`flex-1 mx-1 py-3 rounded-2xl items-center border ${
                                                isSelected 
                                                    ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-500/20' 
                                                    : 'bg-gray-50 border-gray-200'
                                            }`}
                                        >
                                            <Text className={`text-sm font-inter-bold ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                                                +₹{amt}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Balance Preview Card */}
                            <View className="bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-200/60 flex-row items-center justify-between">
                                <View>
                                    <Text className="text-[11px] font-inter-medium text-gray-500">Current Balance</Text>
                                    <Text className="text-sm font-inter-bold text-gray-800">₹{currentBalance}</Text>
                                </View>
                                <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
                                <View className="items-end">
                                    <Text className="text-[11px] font-inter-medium text-emerald-700">Estimated Balance</Text>
                                    <Text className="text-sm font-inter-bold text-emerald-600">
                                        ₹{currentBalance + (parseInt(rechargeAmount, 10) || 0)}
                                    </Text>
                                </View>
                            </View>

                            {/* Action Pay Button */}
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={handleProceedToRazorpay}
                                disabled={isProcessingOrder}
                                className="bg-blue-600 py-4 rounded-2xl items-center justify-center flex-row shadow-lg shadow-blue-600/30"
                            >
                                {isProcessingOrder ? (
                                    <>
                                        <ActivityIndicator size="small" color="#FFF" />
                                        <Text className="text-white font-inter-bold text-base ml-2">Connecting to Razorpay...</Text>
                                    </>
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" />
                                        <Text className="text-white font-inter-bold text-base ml-2">
                                            Proceed to Pay ₹{rechargeAmount || 0}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Trust Badge */}
                            <View className="flex-row items-center justify-center mt-4">
                                <Ionicons name="lock-closed" size={12} color="#94A3B8" />
                                <Text className="text-[10px] font-inter-medium text-gray-400 ml-1">
                                    100% Secure Checkout via Razorpay UPI & Cards
                                </Text>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}
