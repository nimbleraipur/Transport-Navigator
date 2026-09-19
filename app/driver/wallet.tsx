import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Keyboard,
    StyleSheet
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
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

    // Top-up BottomSheet Modal State
    const [isTopUpModalVisible, setIsTopUpModalVisible] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState<string>('500');
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);

    // In-App Seamless WebView Checkout Modal State
    const [isCheckoutModalVisible, setIsCheckoutModalVisible] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState<string>('');
    const [lastProcessedAmount, setLastProcessedAmount] = useState<number>(0);
    const webViewRef = useRef<WebView>(null);

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
            const url = `${baseUrl}/api/users/wallet/checkout-page?orderId=${orderId}`;

            console.log(`[WALLET-CHECKOUT] Opening In-App Razorpay Checkout: ${url}`);

            setLastProcessedAmount(numAmount);
            setCheckoutUrl(url);
            setIsTopUpModalVisible(false);
            setIsCheckoutModalVisible(true);
        } catch (error: any) {
            console.error('[WALLET-TOPUP-ERROR]', error);
            Alert.alert('Recharge Error', error.message || 'Unable to process payment at this time.');
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const handleCloseCheckoutModal = () => {
        setIsCheckoutModalVisible(false);
        setCheckoutUrl('');
        loadWalletData();
    };

    // Handle In-App WebView PostMessage Communication
    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('[WEBVIEW-PAYMENT-MESSAGE]', data);

            if (data.status === 'success') {
                try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (_) {}
                setIsCheckoutModalVisible(false);
                setCheckoutUrl('');
                loadWalletData();
                Alert.alert(
                    'Payment Successful',
                    `₹${lastProcessedAmount || data.amount || rechargeAmount} has been added to your wallet balance.`,
                    [{ text: 'OK', onPress: () => loadWalletData() }]
                );
            } else if (data.status === 'failed') {
                setIsCheckoutModalVisible(false);
                setCheckoutUrl('');
                Alert.alert('Payment Failed', data.error || 'Transaction could not be completed. Please try again.');
            } else if (data.status === 'cancelled') {
                setIsCheckoutModalVisible(false);
                setCheckoutUrl('');
            }
        } catch (err) {
            console.warn('[WEBVIEW-MSG-PARSE-ERROR]', err);
        }
    };

    // Handle In-App Deep Link Navigation Redirects
    const handleNavigationStateChange = (navState: any) => {
        const url = navState.url || '';
        console.log('[WEBVIEW-NAV-CHANGE]', url);

        if (url.includes('transportgo://wallet-callback') || url.includes('wallet-callback')) {
            if (url.includes('status=success')) {
                try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (_) {}
                setIsCheckoutModalVisible(false);
                setCheckoutUrl('');
                loadWalletData();
                Alert.alert(
                    'Payment Successful',
                    `₹${lastProcessedAmount || rechargeAmount} has been credited to your wallet balance.`,
                    [{ text: 'OK', onPress: () => loadWalletData() }]
                );
            } else if (url.includes('status=failed')) {
                setIsCheckoutModalVisible(false);
                setCheckoutUrl('');
                Alert.alert('Payment Failed', 'Transaction could not be verified. Please try again.');
            }
        }
    };

    // Intercept UPI deep link schemes (GPay, PhonePe, Paytm, BHIM, Cred, etc.)
    const handleShouldStartLoadWithRequest = (request: { url: string }) => {
        const { url } = request;
        if (!url) return true;

        console.log('[WEBVIEW-REQUEST-URL]', url);

        // Check for Custom Scheme Callbacks
        if (url.includes('transportgo://wallet-callback') || url.includes('wallet-callback')) {
            handleNavigationStateChange({ url });
            return false;
        }

        // Intercept native UPI applications schemes so user can complete in their preferred UPI app
        if (
            url.startsWith('upi:') ||
            url.startsWith('phonepe:') ||
            url.startsWith('tez:') ||
            url.startsWith('gpay:') ||
            url.startsWith('paytmmp:') ||
            url.startsWith('intent:') ||
            url.startsWith('bhim:') ||
            url.startsWith('credpay:') ||
            url.startsWith('whatsapp:')
        ) {
            Linking.canOpenURL(url).then((supported) => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Linking.openURL(url).catch((err) => {
                        console.warn('[WALLET-UPI-INTENT-ERROR]', err);
                    });
                }
            }).catch(() => {
                Linking.openURL(url).catch((e) => console.warn('[WALLET-UPI-OPEN-FALLBACK-ERR]', e));
            });
            return false;
        }

        // Allow standard HTTP/HTTPS Razorpay checkout URLs inside WebView
        return true;
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
            return { label: 'Online Top-up', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
        }
        if (tx.category === 'admin_recharge') {
            return { label: 'Admin Credit', color: 'bg-gray-100 text-gray-800 border-gray-200' };
        }
        if (tx.category === 'commission_deduction') {
            return { label: 'Commission', color: 'bg-amber-50 text-amber-800 border-amber-200' };
        }
        if (tx.category === 'trip_earning') {
            return { label: 'Trip Fare', color: 'bg-blue-50 text-blue-800 border-blue-200' };
        }
        return { label: 'Adjustment', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    };

    const filteredTransactions = transactions.filter(tx => {
        if (filterType === 'credit') return tx.type === 'credit';
        if (filterType === 'debit') return tx.type === 'debit';
        return true;
    });

    const currentBalance = user?.walletBalance ?? 0;
    const isLowBalance = currentBalance < settings.minWalletBalance;

    return (
        <View className="flex-1 bg-[#F9FAFB]">
            {/* Header / Hero Section (Obsidian Gradient matching Dashboard) */}
            <LinearGradient
                colors={['#1F2937', '#111827']}
                className="px-6 pb-10 rounded-b-[32px] shadow-2xl"
                style={{ paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 12) }}
            >
                {/* Navigation Bar */}
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

                {/* Balance Display */}
                <View className="items-center">
                    <Text className="text-[11px] font-inter-bold text-white/50 uppercase tracking-[2px]">Available Balance</Text>
                    <View className="flex-row items-baseline mt-2">
                        <Text className="text-3xl font-inter-bold text-white/70 mr-1">₹</Text>
                        <Text className="text-5xl font-inter-bold text-white tracking-tight">{currentBalance.toLocaleString('en-IN')}</Text>
                    </View>
                    
                    {isLowBalance && (
                        <View className="bg-rose-500/20 px-4 py-2 rounded-2xl mt-4 border border-rose-500/30 flex-row items-center">
                            <Ionicons name="warning-outline" size={16} color="#FB7185" />
                            <Text className="text-[11px] font-inter-bold text-rose-200 ml-1.5 uppercase tracking-tight">
                                {currentBalance < 0 ? 'Account Hold: Negative Balance' : `Low Balance: Maintain min ₹${settings.minWalletBalance}`}
                            </Text>
                        </View>
                    )}

                    {/* Add Funds Button */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleOpenTopUpModal}
                        className="mt-6 bg-white px-7 py-3.5 rounded-2xl flex-row items-center shadow-lg shadow-black/20"
                    >
                        <Ionicons name="add-circle-outline" size={20} color="#111827" />
                        <Text className="text-[#111827] font-inter-bold text-sm ml-2 tracking-wide">Add Money</Text>
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
                {/* Recharge Options Title */}
                <Text className="text-xs font-inter-bold text-text-tertiary uppercase tracking-wider mb-3 px-1">Recharge Options</Text>

                {/* Option 1: Instant Online Recharge */}
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={handleOpenTopUpModal}
                    className="bg-white p-4.5 rounded-2xl mb-3 flex-row items-center border border-gray-100 shadow-sm"
                >
                    <View className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl items-center justify-center mr-4">
                        <MaterialCommunityIcons name="flash-outline" size={24} color="#111827" />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center">
                            <Text className="text-sm font-inter-bold text-text">Instant Online Recharge</Text>
                            <View className="bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full ml-2">
                                <Text className="text-[9px] font-inter-bold text-emerald-800 uppercase">In-App</Text>
                            </View>
                        </View>
                        <Text className="text-[11px] font-inter-medium text-text-tertiary mt-1">UPI (GPay, PhonePe, Paytm), Cards, NetBanking</Text>
                    </View>
                    <View className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center">
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </View>
                </TouchableOpacity>

                {/* Option 2: Offline / Support Recharge */}
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={handleCallSupport}
                    className="bg-white p-4.5 rounded-2xl mb-5 flex-row items-center border border-gray-100 shadow-sm"
                >
                    <View className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl items-center justify-center mr-4">
                        <Feather name="phone-call" size={20} color="#111827" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-inter-bold text-text">Offline Support Recharge</Text>
                        <Text className="text-[11px] font-inter-medium text-text-tertiary mt-1">Cash Deposit or Direct Bank Transfer</Text>
                    </View>
                    <View className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center">
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </View>
                </TouchableOpacity>

                {/* Guidelines Box */}
                <View className="bg-white p-4.5 rounded-2xl border border-gray-100 mb-6 shadow-sm">
                    <View className="flex-row items-center mb-2.5">
                        <Ionicons name="information-circle-outline" size={18} color="#4B5563" />
                        <Text className="text-xs font-inter-bold text-text ml-1.5">Wallet Policy & Info</Text>
                    </View>
                    <View className="space-y-1.5">
                        <View className="flex-row items-start">
                            <Text className="text-gray-400 mr-2 text-xs">•</Text>
                            <Text className="flex-1 text-[11px] font-inter-medium text-text-secondary leading-relaxed">
                                Maintain a minimum balance of <Text className="font-inter-bold text-text">₹{settings.minWalletBalance}</Text> to receive ride requests.
                            </Text>
                        </View>
                        <View className="flex-row items-start">
                            <Text className="text-gray-400 mr-2 text-xs">•</Text>
                            <Text className="flex-1 text-[11px] font-inter-medium text-text-secondary leading-relaxed">
                                Platform commission of <Text className="font-inter-bold text-text">{settings.commissionPercentage}%</Text> is auto-debited upon trip completion.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Passbook Ledger Title */}
                <View className="flex-row items-center justify-between mb-3 px-1">
                    <Text className="text-sm font-inter-bold text-text">Transaction History</Text>
                    <Text className="text-[11px] font-inter-medium text-text-tertiary">{transactions.length} entries</Text>
                </View>

                {/* Filter Pills */}
                <View className="flex-row items-center mb-4 bg-gray-100 p-1 rounded-xl">
                    <TouchableOpacity
                        onPress={() => setFilterType('all')}
                        className={`flex-1 py-2 items-center rounded-lg ${filterType === 'all' ? 'bg-white shadow-xs' : ''}`}
                    >
                        <Text className={`text-[11px] font-inter-bold ${filterType === 'all' ? 'text-text' : 'text-text-tertiary'}`}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilterType('credit')}
                        className={`flex-1 py-2 items-center rounded-lg ${filterType === 'credit' ? 'bg-white shadow-xs' : ''}`}
                    >
                        <Text className={`text-[11px] font-inter-bold ${filterType === 'credit' ? 'text-emerald-700' : 'text-text-tertiary'}`}>Credits (+)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilterType('debit')}
                        className={`flex-1 py-2 items-center rounded-lg ${filterType === 'debit' ? 'bg-white shadow-xs' : ''}`}
                    >
                        <Text className={`text-[11px] font-inter-bold ${filterType === 'debit' ? 'text-rose-700' : 'text-text-tertiary'}`}>Debits (-)</Text>
                    </TouchableOpacity>
                </View>
                
                {/* Ledger Content */}
                {loading && transactions.length === 0 ? (
                    <View className="bg-white p-8 rounded-2xl border border-gray-100 items-center justify-center">
                        <ActivityIndicator size="small" color="#111827" />
                        <Text className="text-[11px] font-inter-medium text-text-tertiary mt-2">Loading transactions...</Text>
                    </View>
                ) : filteredTransactions.length === 0 ? (
                    <View className="bg-white p-10 rounded-2xl border border-dashed border-gray-200 items-center">
                        <MaterialCommunityIcons name="history" size={28} color="#9CA3AF" />
                        <Text className="text-xs font-inter-medium text-text-tertiary mt-2">No transactions recorded</Text>
                    </View>
                ) : (
                    <View className="space-y-2.5">
                        {filteredTransactions.map((tx) => {
                            const isCredit = tx.type === 'credit';
                            const badge = getCategoryBadge(tx);
                            return (
                                <View 
                                    key={tx._id} 
                                    className="bg-white p-4 rounded-2xl flex-row items-center justify-between border border-gray-100 shadow-xs"
                                >
                                    <View className="flex-row items-center flex-1 mr-3">
                                        <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isCredit ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                                            <MaterialCommunityIcons 
                                                name={isCredit ? 'arrow-down-left' : 'arrow-up-right'} 
                                                size={20} 
                                                color={isCredit ? '#10B981' : '#EF4444'} 
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-xs font-inter-bold text-text" numberOfLines={1}>
                                                {tx.description || (isCredit ? 'Credit Entry' : 'Debit Entry')}
                                            </Text>
                                            <View className="flex-row items-center mt-1 flex-wrap gap-1">
                                                <View className={`px-1.5 py-0.5 rounded-md border ${badge.color}`}>
                                                    <Text className="text-[8.5px] font-inter-bold uppercase tracking-tight">{badge.label}</Text>
                                                </View>
                                                {tx.paymentId && (
                                                    <Text className="text-[9px] font-inter-medium text-text-tertiary">
                                                        Ref: {tx.paymentId.slice(-8)}
                                                    </Text>
                                                )}
                                            </View>
                                            <Text className="text-[10px] font-inter-medium text-text-tertiary mt-1">
                                                {formatDate(tx.createdAt)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="items-end">
                                        <Text className={`text-sm font-inter-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {isCredit ? '+' : '-'} ₹{tx.amount}
                                        </Text>
                                        <Text className="text-[9.5px] font-inter-medium text-text-tertiary mt-0.5">
                                            Bal: ₹{tx.balanceAfter}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Top-Up BottomSheet Modal */}
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
                            className="bg-white rounded-t-[32px] px-6 pt-6 pb-10 border-t border-gray-100 shadow-2xl"
                        >
                            {/* Modal Header */}
                            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center mr-3 border border-gray-200">
                                        <MaterialCommunityIcons name="wallet-plus-outline" size={22} color="#111827" />
                                    </View>
                                    <View>
                                        <Text className="text-base font-inter-bold text-text">Add Money to Wallet</Text>
                                        <Text className="text-[11px] font-inter-medium text-text-tertiary">Instant In-App Payment</Text>
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    onPress={handleCloseTopUpModal}
                                    disabled={isProcessingOrder}
                                    className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                                >
                                    <Ionicons name="close" size={18} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            {/* Amount Input */}
                            <View className="my-5">
                                <Text className="text-xs font-inter-bold text-text-tertiary uppercase tracking-wider mb-2">Recharge Amount (₹)</Text>
                                <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3">
                                    <Text className="text-2xl font-inter-bold text-text mr-2">₹</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        value={rechargeAmount}
                                        onChangeText={setRechargeAmount}
                                        placeholder="500"
                                        placeholderTextColor="#9CA3AF"
                                        className="flex-1 text-2xl font-inter-bold text-text"
                                        maxLength={6}
                                        editable={!isProcessingOrder}
                                    />
                                </View>
                            </View>

                            {/* Quick Amount Preset Chips */}
                            <Text className="text-xs font-inter-bold text-text-tertiary uppercase tracking-wider mb-2.5">Popular Amounts</Text>
                            <View className="flex-row justify-between mb-5">
                                {PRESET_AMOUNTS.map((amt) => {
                                    const isSelected = rechargeAmount === String(amt);
                                    return (
                                        <TouchableOpacity
                                            key={amt}
                                            onPress={() => handleSelectPreset(amt)}
                                            disabled={isProcessingOrder}
                                            className={`flex-1 mx-1 py-3 rounded-xl items-center border ${
                                                isSelected 
                                                    ? 'bg-[#111827] border-[#111827]' 
                                                    : 'bg-gray-50 border-gray-200'
                                            }`}
                                        >
                                            <Text className={`text-xs font-inter-bold ${isSelected ? 'text-white' : 'text-text'}`}>
                                                +₹{amt}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Balance Preview Card */}
                            <View className="bg-gray-50 p-4 rounded-2xl mb-5 border border-gray-200/70 flex-row items-center justify-between">
                                <View>
                                    <Text className="text-[10px] font-inter-medium text-text-tertiary uppercase">Current Balance</Text>
                                    <Text className="text-sm font-inter-bold text-text">₹{currentBalance}</Text>
                                </View>
                                <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
                                <View className="items-end">
                                    <Text className="text-[10px] font-inter-medium text-emerald-700 uppercase">Estimated Balance</Text>
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
                                className="bg-[#111827] py-4 rounded-2xl items-center justify-center flex-row shadow-lg shadow-black/20"
                            >
                                {isProcessingOrder ? (
                                    <>
                                        <ActivityIndicator size="small" color="#FFF" />
                                        <Text className="text-white font-inter-bold text-sm ml-2">Initiating In-App Checkout...</Text>
                                    </>
                                ) : (
                                    <>
                                        <Feather name="shield" size={18} color="#FFF" />
                                        <Text className="text-white font-inter-bold text-sm ml-2 tracking-wide">
                                            Proceed to Pay ₹{rechargeAmount || 0}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Trust Badge */}
                            <View className="flex-row items-center justify-center mt-4">
                                <Ionicons name="lock-closed-outline" size={13} color="#9CA3AF" />
                                <Text className="text-[10px] font-inter-medium text-text-tertiary ml-1">
                                    Secure 256-bit Encrypted Checkout via Razorpay
                                </Text>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* In-App Seamless WebView Checkout Modal */}
            <Modal
                visible={isCheckoutModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleCloseCheckoutModal}
            >
                <View style={[styles.webViewContainer, { paddingTop: insets.top }]}>
                    {/* Seamless In-App Header */}
                    <View style={styles.webViewHeader}>
                        <TouchableOpacity 
                            onPress={handleCloseCheckoutModal}
                            style={styles.webViewCloseBtn}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={22} color="#FFF" />
                        </TouchableOpacity>
                        <View style={styles.webViewHeaderCenter}>
                            <View style={styles.webViewLockRow}>
                                <Ionicons name="lock-closed" size={13} color="#10B981" />
                                <Text style={styles.webViewHeaderTitle}>Secure Razorpay Checkout</Text>
                            </View>
                            <Text style={styles.webViewHeaderSub}>256-Bit Encrypted In-App Payment</Text>
                        </View>
                        <View style={{ width: 36 }} />
                    </View>

                    {/* In-App Razorpay Checkout WebView */}
                    {checkoutUrl ? (
                        <WebView
                            ref={webViewRef}
                            source={{ uri: checkoutUrl }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            thirdPartyCookiesEnabled={true}
                            sharedCookiesEnabled={true}
                            originWhitelist={['*']}
                            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
                            setSupportMultipleWindows={false}
                            onMessage={handleWebViewMessage}
                            onNavigationStateChange={handleNavigationStateChange}
                            startInLoadingState={true}
                            renderLoading={() => (
                                <View style={styles.webViewLoading}>
                                    <ActivityIndicator size="large" color="#FFF" />
                                    <Text style={styles.webViewLoadingText}>Loading Razorpay Checkout...</Text>
                                </View>
                            )}
                            style={styles.webView}
                        />
                    ) : null}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    webViewContainer: {
        flex: 1,
        backgroundColor: '#111827',
    },
    webViewHeader: {
        height: 56,
        backgroundColor: '#111827',
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    webViewCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    webViewHeaderCenter: {
        alignItems: 'center',
    },
    webViewLockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    webViewHeaderTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    webViewHeaderSub: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 1,
    },
    webView: {
        flex: 1,
        backgroundColor: '#111827',
    },
    webViewLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    webViewLoadingText: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 12,
        fontWeight: '600',
    },
});
