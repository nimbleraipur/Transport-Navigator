import React, { useState, useEffect } from 'react';
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
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

    const [currentStep, setCurrentStep] = useState(1);
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

    // Load draft on mount
    useEffect(() => {
        const loadDraft = async () => {
            try {
                const stored = await AsyncStorage.getItem('driver_verify_draft');
                if (stored) {
                    const draft = JSON.parse(stored);
                    if (draft.name) setName(draft.name);
                    if (draft.aadharNumber) setAadharNumber(draft.aadharNumber);
                    if (draft.rcNumber) setRcNumber(draft.rcNumber);
                    if (draft.licenseNumber) setLicenseNumber(draft.licenseNumber);
                    if (draft.accountHolderName) setAccountHolderName(draft.accountHolderName);
                    if (draft.accountNumber) setAccountNumber(draft.accountNumber);
                    if (draft.ifscCode) setIfscCode(draft.ifscCode);
                    if (draft.upiId) setUpiId(draft.upiId);
                    if (draft.docs) {
                        setDocs(prev => ({ ...prev, ...draft.docs }));
                    }
                    if (draft.currentStep) {
                        setCurrentStep(draft.currentStep);
                    }
                }
            } catch (e) {
                console.error('Error loading verification draft:', e);
            }
        };
        loadDraft();
    }, []);

    // Save draft helper
    const saveDraft = async (updates: any) => {
        try {
            const stored = await AsyncStorage.getItem('driver_verify_draft');
            const currentDraft = stored ? JSON.parse(stored) : {};
            
            const newDraft = {
                name: updates.hasOwnProperty('name') ? updates.name : name,
                aadharNumber: updates.hasOwnProperty('aadharNumber') ? updates.aadharNumber : aadharNumber,
                rcNumber: updates.hasOwnProperty('rcNumber') ? updates.rcNumber : rcNumber,
                licenseNumber: updates.hasOwnProperty('licenseNumber') ? updates.licenseNumber : licenseNumber,
                accountHolderName: updates.hasOwnProperty('accountHolderName') ? updates.accountHolderName : accountHolderName,
                accountNumber: updates.hasOwnProperty('accountNumber') ? updates.accountNumber : accountNumber,
                ifscCode: updates.hasOwnProperty('ifscCode') ? updates.ifscCode : ifscCode,
                upiId: updates.hasOwnProperty('upiId') ? updates.upiId : upiId,
                docs: updates.hasOwnProperty('docs') ? updates.docs : docs,
                currentStep: updates.hasOwnProperty('currentStep') ? updates.currentStep : currentStep,
            };
            await AsyncStorage.setItem('driver_verify_draft', JSON.stringify(newDraft));
        } catch (e) {
            console.error('Error saving verification draft:', e);
        }
    };

    const isStepValid = (step: number) => {
        switch (step) {
            case 1:
                return name.trim().length >= 3 && !!docs.profileSelfie;
            case 2:
                return aadharNumber.trim().length === 12 && !!docs.aadharPhoto;
            case 3:
                // DL is optional. If they start typing it, we require the DL photo.
                if (licenseNumber.trim().length > 0) {
                    return !!docs.licensePhoto;
                }
                return true;
            case 4:
                return rcNumber.trim().length >= 5 && !!docs.rcPhoto && !!docs.vehiclePhoto && !!docs.selfieWithVehicle;
            case 5:
                // Bank info is optional
                return true;
            default:
                return false;
        }
    };

    const pickImage = async (type: DocType) => {
        Alert.alert(
            'Upload Photo',
            'Choose a source',
            [
                {
                    text: 'Camera',
                    onPress: async () => {
                        try {
                            const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ['images'],
                                allowsEditing: true,
                                quality: 0.7,
                            });
                            if (!result.canceled && result.assets && result.assets.length > 0) {
                                const newDocs = { ...docs, [type]: result.assets[0].uri };
                                setDocs(newDocs);
                                saveDraft({ docs: newDocs });
                            }
                        } catch (e) {
                            console.error('Error launching camera:', e);
                            Alert.alert('Error', 'Failed to launch camera.');
                        }
                    },
                },
                {
                    text: 'Gallery',
                    onPress: async () => {
                        try {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ['images'],
                                allowsEditing: true,
                                quality: 0.7,
                            });
                            if (!result.canceled && result.assets && result.assets.length > 0) {
                                const newDocs = { ...docs, [type]: result.assets[0].uri };
                                setDocs(newDocs);
                                saveDraft({ docs: newDocs });
                            }
                        } catch (e) {
                            console.error('Error launching image library:', e);
                            Alert.alert('Error', 'Failed to open photo library.');
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

        // License photo only checked if DL number was filled
        if (licenseNumber.trim().length > 0 && !docs.licensePhoto) {
            return Alert.alert('Missing Documents', 'Please upload your Driving License photo.');
        }

        const missingRequired = Object.entries(docs).filter(([key, val]) => {
            if (key === 'licensePhoto') return false; // Optional
            return !val;
        });

        if (missingRequired.length > 0) {
            return Alert.alert('Missing Documents', 'Please upload all required photos.');
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('aadharNumber', aadharNumber);
            formData.append('rcNumber', rcNumber);
            formData.append('licenseNumber', licenseNumber || '');

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

    const stepsConfig = [
        { label: 'Profile', icon: 'account' },
        { label: 'Aadhar', icon: 'card-account-details' },
        { label: 'License', icon: 'card-bulleted' },
        { label: 'Vehicle', icon: 'truck' },
        { label: 'Payout', icon: 'bank' }
    ];

    return (
        <View className="flex-1 bg-white">
            <LinearGradient
                colors={[Colors.navyDark, Colors.navyMid]}
                style={{ paddingTop: insets.top + 20, paddingBottom: 25, paddingHorizontal: 24 }}
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

            {/* Stepper Progress Bar */}
            <View className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                <View className="flex-row justify-between items-center relative">
                    <View className="absolute left-6 right-6 top-5 h-[2px] bg-gray-200" />
                    <View 
                        className="absolute left-6 top-5 h-[2px] bg-primary" 
                        style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                    />
                    
                    {stepsConfig.map((step, idx) => {
                        const stepNum = idx + 1;
                        const isCompleted = currentStep > stepNum;
                        const isActive = currentStep === stepNum;
                        
                        return (
                            <View key={step.label} className="items-center z-10 flex-1">
                                <TouchableOpacity 
                                    disabled={stepNum > currentStep && !isStepValid(stepNum - 1)}
                                    onPress={() => {
                                        setCurrentStep(stepNum);
                                        saveDraft({ currentStep: stepNum });
                                    }}
                                    className={`w-10 h-10 rounded-full items-center justify-center border-2 ${
                                        isCompleted 
                                            ? 'bg-primary border-primary' 
                                            : isActive 
                                                ? 'bg-white border-primary shadow-sm' 
                                                : 'bg-white border-gray-200'
                                    }`}
                                >
                                    {isCompleted ? (
                                        <Ionicons name="checkmark" size={16} color="white" />
                                    ) : (
                                        <MaterialCommunityIcons 
                                            name={step.icon as any} 
                                            size={16} 
                                            color={isActive ? Colors.primary : '#9CA3AF'} 
                                        />
                                    )}
                                </TouchableOpacity>
                                <Text 
                                    className={`text-[8px] font-inter-bold uppercase tracking-wider mt-1.5 ${
                                        isActive ? 'text-primary' : 'text-text-tertiary'
                                    }`}
                                >
                                    {step.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

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
                keyboardShouldPersistTaps="handled"
            >
                {user?.verificationStatus === 'rejected' && currentStep === 1 && (
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

                {/* Step 1: Driver Profile */}
                {currentStep === 1 && (
                    <View>
                        <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-widest mb-3 ml-1">Driver Profile</Text>
                        <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Full Name</Text>
                            <TextInput
                                value={name}
                                onChangeText={(val) => {
                                    setName(val);
                                    saveDraft({ name: val });
                                }}
                                placeholder="Enter your full name"
                                className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm"
                            />
                        </View>
                        
                        <DocItem 
                            label="Your Profile Selfie" 
                            type="profileSelfie" 
                            image={docs.profileSelfie} 
                            onPick={pickImage} 
                            icon="account-circle-outline" 
                        />
                        <View className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl mb-6">
                            <Text className="text-[10px] font-inter-bold text-blue-700 uppercase tracking-wider mb-1">💡 Instructions</Text>
                            <Text className="text-[11px] font-inter-medium text-blue-800 leading-4">
                                Snap a clear selfie with good lighting. Do not wear sunglasses, helmets, or caps. Ensure your face is centered.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Step 2: Aadhar Verification */}
                {currentStep === 2 && (
                    <View>
                        <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-widest mb-3 ml-1">Aadhar Verification</Text>
                        <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Aadhar Card Number</Text>
                            <TextInput
                                value={aadharNumber}
                                onChangeText={(val) => {
                                    const digits = val.replace(/\D/g, '').slice(0, 12);
                                    setAadharNumber(digits);
                                    saveDraft({ aadharNumber: digits });
                                }}
                                placeholder="12-digit Aadhar number"
                                keyboardType="numeric"
                                maxLength={12}
                                className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm"
                            />
                        </View>

                        <DocItem 
                            label="Aadhar Card Photo" 
                            type="aadharPhoto" 
                            image={docs.aadharPhoto} 
                            onPick={pickImage} 
                            icon="card-account-details-outline" 
                        />
                        <View className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl mb-6">
                            <Text className="text-[10px] font-inter-bold text-blue-700 uppercase tracking-wider mb-1">💡 Instructions</Text>
                            <Text className="text-[11px] font-inter-medium text-blue-800 leading-4">
                                Place your Aadhar card on a flat surface under good lighting and snap a clear photo of the front side. Ensure the 12-digit number is readable.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Step 3: Driving License */}
                {currentStep === 3 && (
                    <View>
                        <View className="flex-row items-center justify-between mb-3 px-1">
                            <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-widest">Driving License (Optional)</Text>
                            <View className="bg-gray-100 px-2 py-0.5 rounded-md">
                                <Text className="text-[8px] font-inter-bold text-text-tertiary uppercase tracking-wider">Optional</Text>
                            </View>
                        </View>
                        
                        <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Driving License Number</Text>
                            <TextInput
                                value={licenseNumber}
                                onChangeText={(val) => {
                                    const upper = val.toUpperCase();
                                    setLicenseNumber(upper);
                                    saveDraft({ licenseNumber: upper });
                                }}
                                placeholder="Enter License Number"
                                autoCapitalize="characters"
                                className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm"
                            />
                        </View>

                        <DocItem 
                            label="Driver License Photo" 
                            type="licensePhoto" 
                            image={docs.licensePhoto} 
                            onPick={pickImage} 
                            icon="card-bulleted-outline" 
                        />
                        <View className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl mb-6">
                            <Text className="text-[10px] font-inter-bold text-blue-700 uppercase tracking-wider mb-1">💡 Instructions</Text>
                            <Text className="text-[11px] font-inter-medium text-blue-800 leading-4">
                                If you have a driving license, please enter the license number and upload a photo of the card. You can skip this step if not applicable.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Step 4: Vehicle & RC Details */}
                {currentStep === 4 && (
                    <View>
                        <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-widest mb-3 ml-1">Vehicle & RC Details</Text>
                        <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Vehicle RC Number</Text>
                            <TextInput
                                value={rcNumber}
                                onChangeText={(val) => {
                                    const upper = val.toUpperCase();
                                    setRcNumber(upper);
                                    saveDraft({ rcNumber: upper });
                                }}
                                placeholder="Enter RC Number"
                                autoCapitalize="characters"
                                className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm"
                            />
                        </View>

                        <DocItem 
                            label="Vehicle Registration (RC) Photo" 
                            type="rcPhoto" 
                            image={docs.rcPhoto} 
                            onPick={pickImage} 
                            icon="file-document-outline" 
                        />
                        <DocItem 
                            label="Photo of your Vehicle" 
                            type="vehiclePhoto" 
                            image={docs.vehiclePhoto} 
                            onPick={pickImage} 
                            icon="truck-outline" 
                        />
                        <DocItem 
                            label="Selfie with your Vehicle" 
                            type="selfieWithVehicle" 
                            image={docs.selfieWithVehicle} 
                            onPick={pickImage} 
                            icon="account-group-outline" 
                        />
                        <View className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl mb-6">
                            <Text className="text-[10px] font-inter-bold text-blue-700 uppercase tracking-wider mb-1">💡 Instructions</Text>
                            <Text className="text-[11px] font-inter-medium text-blue-800 leading-4">
                                Make sure your RC number matches the physical card. The vehicle photo should clearly show the license plate.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Step 5: Payout Bank Settings */}
                {currentStep === 5 && (
                    <View>
                        <View className="flex-row items-center justify-between mb-3 px-1">
                            <Text className="text-[11px] font-inter-bold text-text-tertiary uppercase tracking-widest">Payout Credentials (Optional)</Text>
                            <View className="bg-gray-100 px-2 py-0.5 rounded-md">
                                <Text className="text-[8px] font-inter-bold text-text-tertiary uppercase tracking-wider">Optional</Text>
                            </View>
                        </View>

                        <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Account Holder Name</Text>
                            <TextInput
                                value={accountHolderName}
                                onChangeText={(val) => {
                                    setAccountHolderName(val);
                                    saveDraft({ accountHolderName: val });
                                }}
                                placeholder="Name as per bank record"
                                className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm mb-4"
                            />
                            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">Account Number</Text>
                            <TextInput
                                value={accountNumber}
                                onChangeText={(val) => {
                                    const digits = val.replace(/\D/g, '');
                                    setAccountNumber(digits);
                                    saveDraft({ accountNumber: digits });
                                }}
                                placeholder="Bank account number"
                                keyboardType="numeric"
                                className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm mb-4"
                            />
                            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">IFSC Code</Text>
                            <TextInput
                                value={ifscCode}
                                onChangeText={(val) => {
                                    const upper = val.toUpperCase().slice(0, 11);
                                    setIfscCode(upper);
                                    saveDraft({ ifscCode: upper });
                                }}
                                placeholder="Ex. SBIN000123"
                                autoCapitalize="characters"
                                maxLength={11}
                                className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm mb-4"
                            />
                            <Text className="text-[10px] font-inter-bold text-text-tertiary uppercase mb-1.5 ml-1">UPI Alias (VPA)</Text>
                            <TextInput
                                value={upiId}
                                onChangeText={(val) => {
                                    const lower = val.toLowerCase();
                                    setUpiId(lower);
                                    saveDraft({ upiId: lower });
                                }}
                                placeholder="name@upi"
                                autoCapitalize="none"
                                className="bg-white rounded-xl h-14 px-4 font-inter-bold text-text border border-gray-100 shadow-sm"
                            />
                        </View>
                        <View className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl mb-6">
                            <Text className="text-[10px] font-inter-bold text-blue-700 uppercase tracking-wider mb-1">💡 Instructions</Text>
                            <Text className="text-[11px] font-inter-medium text-blue-800 leading-4">
                                Add your bank or UPI details to withdraw earnings directly. You can skip this step and add it later in settings.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Bottom Navigation Buttons */}
                <View className="flex-row gap-4 mt-4">
                    {currentStep > 1 && (
                        <TouchableOpacity
                            onPress={() => {
                                const prev = currentStep - 1;
                                setCurrentStep(prev);
                                saveDraft({ currentStep: prev });
                            }}
                            className="flex-1 h-16 rounded-2xl bg-gray-100 items-center justify-center flex-row border border-gray-200"
                        >
                            <Ionicons name="chevron-back" size={20} color={Colors.text} style={{ marginRight: 4 }} />
                            <Text className="text-base font-inter-bold text-text">Back</Text>
                        </TouchableOpacity>
                    )}
                    
                    {currentStep < 5 ? (
                        <TouchableOpacity
                            onPress={() => {
                                const next = currentStep + 1;
                                setCurrentStep(next);
                                saveDraft({ currentStep: next });
                            }}
                            disabled={!isStepValid(currentStep)}
                            className={`flex-[2] h-16 rounded-2xl items-center justify-center flex-row shadow-sm ${
                                isStepValid(currentStep) ? 'bg-primary' : 'bg-gray-200'
                            }`}
                        >
                            <Text className={`text-base font-inter-bold ${isStepValid(currentStep) ? 'text-surface' : 'text-gray-400'}`}>
                                {currentStep === 3 && licenseNumber.trim().length === 0 ? 'Skip / Continue' : 'Continue'}
                            </Text>
                            <Ionicons 
                                name="chevron-forward" 
                                size={20} 
                                color={isStepValid(currentStep) ? '#FFF' : '#9CA3AF'} 
                                style={{ marginLeft: 4 }} 
                            />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={async () => {
                                await handleSubmit();
                                try {
                                    await AsyncStorage.removeItem('driver_verify_draft');
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            disabled={loading || !isStepValid(5)}
                            className={`flex-[2] h-16 rounded-2xl items-center justify-center shadow-xl shadow-primary/20 ${
                                loading || !isStepValid(5) ? 'bg-gray-400' : 'bg-primary'
                            }`}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text className="text-base font-inter-bold text-surface">
                                    {!accountHolderName && !accountNumber && !upiId ? 'Skip & Submit' : 'Submit Verification'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({});
