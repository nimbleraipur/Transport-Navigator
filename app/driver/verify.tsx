import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';

type DocType = 'aadharPhoto' | 'rcPhoto' | 'licensePhoto' | 'profileSelfie' | 'vehiclePhoto' | 'selfieWithVehicle';

interface DocItemProps {
    label: string;
    type: DocType;
    image: string | null;
    onPick: (type: DocType) => void;
    icon: string;
}

function DocItem({ label, type, image, onPick, icon }: DocItemProps) {
    return (
        <View className="mb-6">
            <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-widest mb-3 ml-1">{label}</Text>
            <TouchableOpacity
                onPress={() => onPick(type)}
                activeOpacity={0.7}
                className="w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden items-center justify-center"
            >
                {image ? (
                    <>
                        <Image source={{ uri: image }} className="w-full h-full" resizeMode="cover" />
                        <View className="absolute top-3 right-3 bg-white/90 rounded-full p-2 shadow-sm">
                            <Ionicons name="camera" size={16} color={Colors.primary} />
                        </View>
                    </>
                ) : (
                    <View className="items-center">
                        <View className="w-12 h-12 rounded-full bg-white items-center justify-center mb-2 shadow-sm">
                            <MaterialCommunityIcons name={icon as any} size={24} color={Colors.primary} />
                        </View>
                        <Text className="text-xs font-inter-bold text-primary">Upload Photo</Text>
                        <Text className="text-[10px] font-inter-medium text-text-tertiary mt-1">Tap to capture or select</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}

export default function DriverVerifyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, token, refreshUser, logout } = useAuth();

    const [aadharNumber, setAadharNumber] = useState('');
    const [rcNumber, setRcNumber] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [name, setName] = useState(user?.name || '');
    const [docs, setDocs] = useState<Record<DocType, string | null>>({
        aadharPhoto: null,
        rcPhoto: null,
        licensePhoto: null,
        profileSelfie: null,
        vehiclePhoto: null,
        selfieWithVehicle: null,
    });
    
    // Optional Bank Details
    const [accountHolderName, setAccountHolderName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [upiId, setUpiId] = useState('');
    
    const [loading, setLoading] = useState(false);

    const pickImage = async (type: DocType) => {
        Alert.alert(
            'Upload Photo',
            'Choose a source',
            [
                {
                    text: 'Camera',
                    onPress: async () => {
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            quality: 0.7,
                        });
                        if (!result.canceled) {
                            setDocs(prev => ({ ...prev, [type]: result.assets[0].uri }));
                        }
                    },
                },
                {
                    text: 'Gallery',
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            quality: 0.7,
                        });
                        if (!result.canceled) {
                            setDocs(prev => ({ ...prev, [type]: result.assets[0].uri }));
                        }
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSubmit = async () => {
        if (!name || name.length < 3) {
            return Alert.alert('Invalid Data', 'Please enter your full name (min 3 chars).');
        }
        if (!aadharNumber || aadharNumber.length < 12) {
            return Alert.alert('Invalid Data', 'Please enter a valid 12-digit Aadhar number.');
        }
        if (!rcNumber) {
            return Alert.alert('Invalid Data', 'Please enter your Vehicle RC number.');
        }
        if (!licenseNumber) {
            return Alert.alert('Invalid Data', 'Please enter your License number.');
        }

        const missingDocs = Object.entries(docs).filter(([_, val]) => !val);
        if (missingDocs.length > 0) {
            return Alert.alert('Missing Documents', 'Please upload all required photos.');
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('aadharNumber', aadharNumber);
            formData.append('rcNumber', rcNumber);
            formData.append('licenseNumber', licenseNumber || ''); // Now truly optional

            // Append optional bank details
            if (accountHolderName) formData.append('accountHolderName', accountHolderName);
            if (accountNumber) formData.append('accountNumber', accountNumber);
            if (ifscCode) formData.append('ifscCode', ifscCode.toUpperCase());
            if (upiId) formData.append('upiId', upiId.toLowerCase());

            // Append files
            Object.entries(docs).forEach(([key, uri]) => {
                if (uri) {
                    const filename = uri.split('/').pop() || 'photo.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpg`;
                    formData.append(key, { uri, name: filename, type } as any);
                }
            });

            const baseUrl = getApiUrl();
            const res = await fetch(`${baseUrl}/api/users/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                await refreshUser();
                router.replace('/driver/pending-approval' as any);
            } else {
                Alert.alert('Error', data.error || 'Submission failed. Please try again.');
            }
        } catch (e) {
            console.error('Verification Submit Error:', e);
            Alert.alert('Error', 'Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <LinearGradient
                colors={[Colors.navyDark, Colors.navyMid]}
                style={{ paddingTop: insets.top + 20, paddingBottom: 30, paddingHorizontal: 24 }}
                className="rounded-b-[32px] shadow-lg"
            >
                <TouchableOpacity
                    onPress={() => logout()}
                    className="absolute top-10 right-6 z-10 p-2"
                >
                    <Ionicons name="log-out-outline" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text className="text-2xl font-inter-bold text-surface">Driver Verification</Text>
                <Text className="text-surface/60 font-inter-medium mt-1">Submit documents to start working</Text>
            </LinearGradient>

            <ScrollView
                className="flex-1 w-full"
                contentContainerStyle={{ 
                    paddingTop: 24, 
                    paddingBottom: insets.bottom + 40,
                    maxWidth: 500,
                    alignSelf: 'center',
                    width: '100%',
                    paddingHorizontal: 24
                }}
                showsVerticalScrollIndicator={false}
            >
                {user?.verificationStatus === 'rejected' && (
                    <View className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                        <View className="flex-row items-center mb-1">
                            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                            <Text className="text-sm font-inter-bold text-danger ml-2">Verification Rejected</Text>
                        </View>
                        <Text className="text-xs font-inter-medium text-danger/70 leading-5">
                            Reason: {user.rejectionReason || 'Documents were invalid or unclear. Please re-submit.'}
                        </Text>
                    </View>
                )}

                <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-widest mb-3 ml-1">Identity Information</Text>
                <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                    <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Full Name</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Your full name"
                        className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm mb-4"
                    />
                    <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Aadhar Card Number</Text>
                    <TextInput
                        value={aadharNumber}
                        onChangeText={setAadharNumber}
                        placeholder="12-digit Aadhar number"
                        keyboardType="numeric"
                        maxLength={12}
                        className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm mb-4"
                    />
                    <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Vehicle RC Number</Text>
                    <TextInput
                        value={rcNumber}
                        onChangeText={setRcNumber}
                        placeholder="Enter RC Number"
                        autoCapitalize="characters"
                        className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm mb-4"
                    />
                    <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Driving License Number (Optional)</Text>
                    <TextInput
                        value={licenseNumber}
                        onChangeText={setLicenseNumber}
                        placeholder="Enter License Number"
                        autoCapitalize="characters"
                        className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm"
                    />
                </View>

                <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-widest mb-3 ml-1">Payout Credentials (Optional)</Text>
                <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                    <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Account Holder Name</Text>
                    <TextInput
                        value={accountHolderName}
                        onChangeText={setAccountHolderName}
                        placeholder="Name as per bank record"
                        className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm mb-4"
                    />
                    <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Account Number</Text>
                    <TextInput
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                        placeholder="Bank account number"
                        keyboardType="numeric"
                        className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm mb-4"
                    />
                    <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">IFSC Code</Text>
                    <TextInput
                        value={ifscCode}
                        onChangeText={setIfscCode}
                        placeholder="Ex. SBIN000123"
                        autoCapitalize="characters"
                        className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm mb-4"
                    />
                    <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">UPI Alias (VPA)</Text>
                    <TextInput
                        value={upiId}
                        onChangeText={setUpiId}
                        placeholder="name@upi"
                        autoCapitalize="none"
                        className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm"
                    />
                </View>

                <DocItem label="Aadhar Card Photo" type="aadharPhoto" image={docs.aadharPhoto} onPick={pickImage} icon="card-account-details-outline" />
                <DocItem label="Vehicle RC Photo" type="rcPhoto" image={docs.rcPhoto} onPick={pickImage} icon="file-document-outline" />
                <DocItem label="Driver License Photo" type="licensePhoto" image={docs.licensePhoto} onPick={pickImage} icon="card-bulleted-outline" />

                <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-widest mt-4 mb-3 ml-1 text-center">Required Selfies</Text>

                <DocItem label="Your Profile Selfie" type="profileSelfie" image={docs.profileSelfie} onPick={pickImage} icon="account-circle-outline" />
                <DocItem label="Photo of your Vehicle" type="vehiclePhoto" image={docs.vehiclePhoto} onPick={pickImage} icon="truck-outline" />
                <DocItem label="Selfie with your Vehicle" type="selfieWithVehicle" image={docs.selfieWithVehicle} onPick={pickImage} icon="account-group-outline" />

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    className={`h-16 rounded-2xl items-center justify-center shadow-xl shadow-primary/30 mt-4 ${loading ? 'bg-gray-400' : 'bg-primary'}`}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text className="text-lg font-inter-bold text-surface">Submit for Verification</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
