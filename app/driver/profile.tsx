import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator, Animated, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/query-client';
import { getVehicleImageSource } from '@/lib/vehicles';

function ProfileField({ label, value, icon, isLocked = false, onChangeText, placeholder, keyboardType = 'default', autoCapitalize = 'none' }: any) {
  const safeValue = value ? String(value) : '';

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#000000', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>
        {label}
      </Text>
      <View style={{ 
        flexDirection: 'row', 
        paddingHorizontal: 16, 
        borderRadius: 16, 
        borderWidth: 1, 
        borderColor: isLocked ? '#F3F4F6' : '#E5E7EB', 
        backgroundColor: isLocked ? '#F9FAFB' : '#FFFFFF',
        height: 54,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isLocked ? 0 : 0.05,
        shadowRadius: 2,
        elevation: isLocked ? 0 : 2,
      }}>
        <View style={{ marginRight: 14 }}>
          <Ionicons name={icon} size={18} color={isLocked ? '#9CA3AF' : Colors.primary} />
        </View>
        
        {isLocked ? (
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#6B7280' }}>
            {safeValue}
          </Text>
        ) : (
          <TextInput
            style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1D26' }}
            value={safeValue}
            onChangeText={(t) => onChangeText && onChangeText(t)}
            placeholder={placeholder}
            placeholderTextColor="rgba(0,0,0,0.2)"
            keyboardType={keyboardType as any}
            autoCapitalize={autoCapitalize as any}
            autoCorrect={false}
          />
        )}
        
        {isLocked && <Ionicons name="lock-closed" size={14} color="#9CA3AF" />}
      </View>
    </View>
  );
}

export default function DriverProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const isSmallScreen = SCREEN_WIDTH < 360;
  const { user, token, updateUser } = useAuth();
  
  const [saving, setSaving] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Robust bank details state
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: user?.bankDetails?.accountHolderName || '',
    accountNumber: user?.bankDetails?.accountNumber || '',
    ifscCode: user?.bankDetails?.ifscCode || '',
    upiId: user?.bankDetails?.upiId || '',
    qrCode: user?.bankDetails?.qrCode || '',
  });

  // Track if we have already initialized the state from user context
  const [isInitialized, setIsInitialized] = useState(false);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 20);

  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true })
    ]).start();
  }, []);

  // Sync state once on mount or when user data finally arrives
  useEffect(() => {
    if (user && !isInitialized) {
      console.log(`[PROFILE] Initializing state for user: ${user.name}`);
      if (user.bankDetails) {
        setBankDetails({
          accountHolderName: user.bankDetails.accountHolderName || '',
          accountNumber: user.bankDetails.accountNumber || '',
          ifscCode: user.bankDetails.ifscCode || '',
          upiId: user.bankDetails.upiId || '',
          qrCode: user.bankDetails.qrCode || '',
        });
      }
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  const handleUpdateBank = async () => {
    const { accountHolderName, accountNumber, ifscCode, upiId } = bankDetails;
    if (!accountHolderName || !accountNumber || !ifscCode || !upiId) {
      Alert.alert('Required', 'Please fill all bank details');
      return;
    }

    setSaving(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL('/api/users/bank-details', baseUrl).toString(), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          upiId: upiId.trim().toLowerCase(),
        }),
      });
      
      const data = await res.json();

      if (res.ok && data.user) {
        updateUser(data.user);
        Alert.alert('Details Saved', 'Your payout information has been updated.');
      } else {
        console.error('[PROFILE-UPDATE] Server failed to save:', data);
        Alert.alert('Save Failed', data.error || 'The server could not save your bank details.');
      }
    } catch (e: any) {
      console.error('[PROFILE-UPDATE] Network/Request error:', e);
      Alert.alert('Error', `Connection failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const pickQrCode = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is needed. Please allow it in Settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadQrFile(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Error picking QR code:', e);
      Alert.alert('Error', 'Could not open gallery');
    }
  };

  const uploadQrFile = async (uri: string) => {
    setUploadingQR(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'qrcode.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpg`;
      
      formData.append('qrCode', { uri, name: filename, type } as any);
      // Include current text details to ensure they aren't lost
      formData.append('accountHolderName', bankDetails.accountHolderName);
      formData.append('accountNumber', bankDetails.accountNumber);
      formData.append('ifscCode', bankDetails.ifscCode);
      formData.append('upiId', bankDetails.upiId);

      const baseUrl = getApiUrl();
      const res = await fetch(new URL('/api/users/bank-details', baseUrl).toString(), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.user) {
        updateUser(data.user);
        if (data.user.bankDetails) {
          setBankDetails({
            accountHolderName: data.user.bankDetails.accountHolderName || '',
            accountNumber: data.user.bankDetails.accountNumber || '',
            ifscCode: data.user.bankDetails.ifscCode || '',
            upiId: data.user.bankDetails.upiId || '',
            qrCode: data.user.bankDetails.qrCode || '',
          });
        }
        Alert.alert('Success', 'Payment QR Code updated successfully.');
      } else {
        Alert.alert('Error', data.error || 'Failed to upload QR code.');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed.');
    } finally {
      setUploadingQR(false);
    }
  };

  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is needed. Please allow it in Settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Error picking profile photo:', e);
      Alert.alert('Error', 'Could not open gallery');
    }
  };
  const uploadProfilePhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpg`;
      
      formData.append('photo', { uri, name: filename, type } as any);

      const baseUrl = getApiUrl();
      const res = await fetch(new URL('/api/users/profile-photo', baseUrl).toString(), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.user) {
        updateUser(data.user);
        Alert.alert('Success', 'Profile photo updated successfully.');
      } else {
        Alert.alert('Error', data.error || 'Failed to upload profile photo.');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const vehicleLabel = user?.vehicleType ? user.vehicleType.charAt(0).toUpperCase() + user.vehicleType.slice(1) : 'N/A';
  const vehicleImage = getVehicleImageSource(undefined, user?.vehicleType);

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <LinearGradient
        colors={[Colors.navyDark, Colors.navyMid]}
        className="pb-12 rounded-b-[32px] shadow-2xl"
        style={{ paddingTop: topInset + 12 }}
      >
        <View className="flex-row items-center px-6 mb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center border border-white/5"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.surface} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-inter-bold text-surface mr-10">Driver Identity</Text>
        </View>

        <View className="flex-row items-center px-6 mt-1.5">
          {/* Left Side: Circular Profile Avatar (Editable) */}
          <TouchableOpacity 
            onPress={pickProfilePhoto}
            disabled={uploadingPhoto}
            className="w-20 h-20 rounded-full bg-white/10 items-center justify-center border-2 border-white/20 relative shadow-2xl mr-4"
            style={{ alignItems: 'center', justifyContent: 'center' }}
          >
            <View className="w-full h-full rounded-full overflow-hidden items-center justify-center" style={{ overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              {uploadingPhoto ? (
                <ActivityIndicator color={Colors.surface} size="small" />
              ) : user?.profileSelfie ? (
                <Image 
                  source={{ uri: user.profileSelfie }} 
                  className="w-full h-full rounded-full" 
                  resizeMode="cover" 
                  style={{ alignSelf: 'center' }}
                />
              ) : (
                <LinearGradient
                  colors={['#1B3A5C', '#132743']}
                  className="w-full h-full rounded-full items-center justify-center"
                  style={{ alignItems: 'center', justifyContent: 'center' }}
                >
                  <FontAwesome5 name="user-tie" size={32} color={Colors.surface} style={{ alignSelf: 'center' }} />
                </LinearGradient>
              )}
            </View>
            
            {/* Edit overlay badge */}
            <View className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full items-center justify-center border border-white shadow">
              <Ionicons name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>

          {/* Right Side: Driver Information Column */}
          <View className="flex-1 justify-center" style={{ gap: 4 }}>
            <Text className="text-xl font-inter-bold text-white leading-7" numberOfLines={1}>
              {String(user?.name || 'Driver')}
            </Text>

            {/* Custom/User ID Pill */}
            {user?.customId && (
              <View className="bg-white/10 px-3 py-1 rounded-full border border-white/10 flex-row items-center" style={{ alignSelf: 'flex-start' }}>
                <MaterialCommunityIcons name="identifier" size={13} color="rgba(255,255,255,0.7)" style={{ marginRight: 5 }} />
                <Text className="text-[11px] font-inter-bold text-white tracking-widest">{user.customId}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        className="flex-1 -mt-8"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomInset + 40 }}
        style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Assigned Vehicle Card */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
          <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 8, marginRight: 16 }}>
            {vehicleImage ? (
              <Image source={vehicleImage} style={{ width: 60, height: 60, alignSelf: 'center' }} resizeMode="contain" />
            ) : (
              <Ionicons name="car" size={36} color={Colors.primary} style={{ alignSelf: 'center' }} />
            )}
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Assigned Vehicle</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 }}>{vehicleLabel}</Text>
            {user?.vehicleNumber ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
                <MaterialCommunityIcons name="car-info" size={12} color="#4B5563" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>{user.vehicleNumber}</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>No registration plate set</Text>
            )}
          </View>
        </View>
        {/* Official Details - READ ONLY */}
        <View style={{ backgroundColor: 'white', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#F9FAFB', marginBottom: 20 }}>
          <Text className="text-[10px] font-inter-bold text-primary uppercase tracking-[2px] mb-6 pb-2.5 border-b border-gray-50">Official Details</Text>

          <ProfileField label="Driver Name" value={user?.name} icon="person-outline" isLocked={true} />
          <ProfileField label="Registered Mobile" value={user?.phone} icon="call-outline" isLocked={true} />
          <ProfileField label="Vehicle Number" value={user?.vehicleNumber} icon="car-outline" isLocked={true} />
          <ProfileField label="License ID (Optional)" value={user?.licenseNumber} icon="card-outline" isLocked={true} />
        </View>

        {/* Payout Credentials - EDITABLE */}
        <View style={{ backgroundColor: 'white', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#F9FAFB', marginBottom: 20 }}>
          <Text className="text-[10px] font-inter-bold text-primary uppercase tracking-[2px] mb-6 pb-2.5 border-b border-gray-50">Payout Credentials</Text>

          <ProfileField
            label="Account Holder Name"
            value={bankDetails?.accountHolderName || ''}
            onChangeText={(text: string) => setBankDetails(prev => ({ ...prev, accountHolderName: text }))}
            icon="person-outline"
            isLocked={false}
          />

          <ProfileField
            label="Account Number"
            value={bankDetails?.accountNumber || ''}
            onChangeText={(text: string) => setBankDetails(prev => ({ ...prev, accountNumber: text }))}
            icon="business-outline"
            isLocked={false}
            keyboardType="number-pad"
          />

          <ProfileField
            label="IFSC Code"
            value={bankDetails?.ifscCode || ''}
            onChangeText={(text: string) => setBankDetails(prev => ({ ...prev, ifscCode: text }))}
            icon="barcode-outline"
            isLocked={false}
            autoCapitalize="characters"
          />

          <ProfileField
            label="UPI Alias (VPA)"
            value={bankDetails?.upiId || ''}
            onChangeText={(text: string) => setBankDetails(prev => ({ ...prev, upiId: text }))}
            icon="at-outline"
            isLocked={false}
            autoCapitalize="none"
          />

          {/* QR Code Section */}
          <View className="mb-6">
            <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px] mb-3 ml-1">Payment QR Code</Text>
            <TouchableOpacity
              onPress={pickQrCode}
              disabled={uploadingQR}
              style={{ width: '100%', height: 160, backgroundColor: '#F9FAFB', borderRadius: 16, borderStyle: 'solid', borderWidth: 1, borderColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
            >
              {uploadingQR ? (
                <ActivityIndicator color={Colors.primary} />
              ) : bankDetails.qrCode ? (
                <Image source={{ uri: bankDetails.qrCode }} className="w-full h-full" resizeMode="contain" />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="qr-code-outline" size={32} color={Colors.divider} />
                  <Text className="text-[10px] font-inter-bold text-text-tertiary mt-2">Tap to Upload QR</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleUpdateBank}
            disabled={saving}
            className={`w-full h-14 rounded-2xl flex-row items-center justify-center ${saving ? 'bg-primary/70' : 'bg-primary'} shadow-lg shadow-primary/30`}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text className="text-sm font-inter-bold text-white mr-2.5">Update Bank Details</Text>
                <Ionicons name="save-outline" size={18} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F9FAFB', marginBottom: 24 }}>
          <Text className="text-[9px] font-inter-bold text-text-tertiary uppercase tracking-[1.5px] mb-5 ml-1">Terminal Performance</Text>
          <View className="flex-row items-center justify-around">
            <View className="items-center flex-1">
              <Text className={`${isSmallScreen ? 'text-lg' : 'text-xl'} font-inter-bold text-text`}>{String(user?.totalTrips ?? 0)}</Text>
              <Text className="text-[8px] font-inter-bold text-text-tertiary uppercase tracking-widest mt-0.5 text-center">Jobs</Text>
            </View>
            <View className="w-[1px] h-8 bg-gray-100 mx-1" />
            <TouchableOpacity 
              onPress={() => router.push('/driver/wallet' as any)}
              activeOpacity={0.7}
              className="items-center flex-1"
            >
              <Text className={`${isSmallScreen ? 'text-lg' : 'text-xl'} font-inter-bold text-text`}>₹{String(user?.walletBalance ?? user?.totalEarnings ?? 0)}</Text>
              <Text className="text-[8px] font-inter-bold text-emerald-600 uppercase tracking-widest mt-0.5 text-center">Wallet</Text>
            </TouchableOpacity>
            <View className="w-[1px] h-8 bg-gray-100 mx-1" />
            <View className="items-center flex-1">
              <View className="flex-row items-center">
                <Text className={`${isSmallScreen ? 'text-lg' : 'text-xl'} font-inter-bold text-text`}>{Number(user?.rating || 5).toFixed(1)}</Text>
                <Ionicons name="star" size={12} color={Colors.warning} style={{ marginLeft: 2 }} />
              </View>
              <Text className="text-[8px] font-inter-bold text-text-tertiary uppercase tracking-widest mt-0.5 text-center">Rating</Text>
            </View>
          </View>
        </View>

        <View className="px-5 items-center mb-8">
          <Text className="text-[11px] font-inter-medium text-text-tertiary text-center leading-4 opacity-60">
            Driver identity details are verified by the administrator. Contact support for vehicle replacements.
          </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
