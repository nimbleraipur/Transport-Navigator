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
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
        <View style={styles.docItemContainer}>
            <Text style={styles.docItemLabel}>{label}</Text>
            <TouchableOpacity
                onPress={() => onPick(type)}
                activeOpacity={0.7}
                style={styles.docItemBox}
            >
                {image ? (
                    <>
                        <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        <View style={styles.docItemEditOverlay}>
                            <Ionicons name="camera" size={16} color={Colors.primary} />
                        </View>
                    </>
                ) : (
                    <View style={styles.docItemEmpty}>
                        <View style={styles.docItemIconBg}>
                            <MaterialCommunityIcons name={icon as any} size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.docItemUploadText}>Upload Photo</Text>
                        <Text style={styles.docItemSubText}>Tap to capture or select</Text>
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
                if (licenseNumber.trim().length > 0) {
                    return !!docs.licensePhoto;
                }
                return true;
            case 4:
                return rcNumber.trim().length >= 5 && !!docs.rcPhoto && !!docs.vehiclePhoto && !!docs.selfieWithVehicle;
            case 5:
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
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Permission Required', 'Camera access is needed to capture documents. Please allow camera access in your device settings.', [{ text: 'OK' }]);
                                return;
                            }
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
                            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Permission Required', 'Photo library access is needed to upload documents. Please allow photo access in your device settings.', [{ text: 'OK' }]);
                                return;
                            }
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
        if (licenseNumber.trim().length > 0 && !docs.licensePhoto) {
            return Alert.alert('Missing Documents', 'Please upload your Driving License photo.');
        }

        const missingRequired = Object.entries(docs).filter(([key, val]) => {
            if (key === 'licensePhoto') return false;
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

            if (accountHolderName) formData.append('accountHolderName', accountHolderName);
            if (accountNumber) formData.append('accountNumber', accountNumber);
            if (ifscCode) formData.append('ifscCode', ifscCode.toUpperCase());
            if (upiId) formData.append('upiId', upiId.toLowerCase());

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

    const stepValid = isStepValid(currentStep);
    const progressWidth = ((currentStep - 1) / 4) * 100;

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#000000', '#333333']}
                style={[styles.header, { paddingTop: insets.top + 20 }]}
            >
                <TouchableOpacity onPress={() => logout()} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Driver Verification</Text>
                <Text style={styles.headerSubtitle}>Submit documents to start working</Text>
            </LinearGradient>

            {/* Stepper */}
            <View style={styles.stepperContainer}>
                <View style={styles.stepperRow}>
                    {/* background track */}
                    <View style={styles.stepperTrackBg} />
                    {/* filled progress */}
                    <View style={[styles.stepperTrackFill, { width: `${progressWidth}%` as any }]} />

                    {stepsConfig.map((step, idx) => {
                        const stepNum = idx + 1;
                        const isCompleted = currentStep > stepNum;
                        const isActive = currentStep === stepNum;

                        return (
                            <View key={step.label} style={styles.stepItemContainer}>
                                <TouchableOpacity
                                    disabled={stepNum > currentStep && !isStepValid(stepNum - 1)}
                                    onPress={() => {
                                        setCurrentStep(stepNum);
                                        saveDraft({ currentStep: stepNum });
                                    }}
                                    style={[
                                        styles.stepCircle,
                                        isCompleted ? styles.stepCircleCompleted : isActive ? styles.stepCircleActive : styles.stepCircleInactive
                                    ]}
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
                                <Text style={[styles.stepLabel, isActive ? styles.stepLabelActive : styles.stepLabelInactive]}>
                                    {step.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Rejection Banner */}
                {user?.verificationStatus === 'rejected' && currentStep === 1 && (
                    <View style={styles.rejectionBanner}>
                        <View style={styles.rejectionRow}>
                            <Ionicons name="alert-circle" size={18} color="#EF4444" />
                            <Text style={styles.rejectionTitle}>Verification Rejected</Text>
                        </View>
                        <Text style={styles.rejectionReason}>
                            Reason: {user.rejectionReason || 'Documents were invalid or unclear. Please re-submit.'}
                        </Text>
                    </View>
                )}

                {/* ─── Step 1: Profile ─── */}
                {currentStep === 1 && (
                    <View>
                        <Text style={styles.sectionTitle}>Driver Profile</Text>
                        <View style={styles.inputCard}>
                            <Text style={styles.inputLabel}>Full Name</Text>
                            <TextInput
                                value={name}
                                onChangeText={(val) => { setName(val); saveDraft({ name: val }); }}
                                placeholder="Enter your full name"
                                placeholderTextColor="#9CA3AF"
                                style={styles.textInput}
                            />
                        </View>
                        <DocItem label="Your Profile Selfie" type="profileSelfie" image={docs.profileSelfie} onPick={pickImage} icon="account-circle-outline" />
                        <View style={styles.infoBox}>
                            <Text style={styles.infoTitle}>💡 Instructions</Text>
                            <Text style={styles.infoText}>
                                Snap a clear selfie with good lighting. Do not wear sunglasses, helmets, or caps. Ensure your face is centered.
                            </Text>
                        </View>
                    </View>
                )}

                {/* ─── Step 2: Aadhar ─── */}
                {currentStep === 2 && (
                    <View>
                        <Text style={styles.sectionTitle}>Aadhar Verification</Text>
                        <View style={styles.inputCard}>
                            <Text style={styles.inputLabel}>Aadhar Card Number</Text>
                            <TextInput
                                value={aadharNumber}
                                onChangeText={(val) => {
                                    const digits = val.replace(/\D/g, '').slice(0, 12);
                                    setAadharNumber(digits);
                                    saveDraft({ aadharNumber: digits });
                                }}
                                placeholder="12-digit Aadhar number"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                maxLength={12}
                                style={styles.textInput}
                            />
                        </View>
                        <DocItem label="Aadhar Card Photo" type="aadharPhoto" image={docs.aadharPhoto} onPick={pickImage} icon="card-account-details-outline" />
                        <View style={styles.infoBox}>
                            <Text style={styles.infoTitle}>💡 Instructions</Text>
                            <Text style={styles.infoText}>
                                Place your Aadhar card on a flat surface under good lighting and snap a clear photo of the front side. Ensure the 12-digit number is readable.
                            </Text>
                        </View>
                    </View>
                )}

                {/* ─── Step 3: Driving License (Optional) ─── */}
                {currentStep === 3 && (
                    <View>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Driving License</Text>
                            <View style={styles.optionalBadge}>
                                <Text style={styles.optionalBadgeText}>Optional</Text>
                            </View>
                        </View>
                        <View style={styles.inputCard}>
                            <Text style={styles.inputLabel}>Driving License Number</Text>
                            <TextInput
                                value={licenseNumber}
                                onChangeText={(val) => {
                                    const upper = val.toUpperCase();
                                    setLicenseNumber(upper);
                                    saveDraft({ licenseNumber: upper });
                                }}
                                placeholder="Enter License Number"
                                placeholderTextColor="#9CA3AF"
                                autoCapitalize="characters"
                                style={styles.textInput}
                            />
                        </View>
                        <DocItem label="Driver License Photo" type="licensePhoto" image={docs.licensePhoto} onPick={pickImage} icon="card-bulleted-outline" />
                        <View style={styles.infoBox}>
                            <Text style={styles.infoTitle}>💡 Instructions</Text>
                            <Text style={styles.infoText}>
                                If you have a driving license, please enter the license number and upload a photo of the card. You can skip this step if not applicable.
                            </Text>
                        </View>
                    </View>
                )}

                {/* ─── Step 4: Vehicle & RC ─── */}
                {currentStep === 4 && (
                    <View>
                        <Text style={styles.sectionTitle}>Vehicle & RC Details</Text>
                        <View style={styles.inputCard}>
                            <Text style={styles.inputLabel}>Vehicle RC Number</Text>
                            <TextInput
                                value={rcNumber}
                                onChangeText={(val) => {
                                    const upper = val.toUpperCase();
                                    setRcNumber(upper);
                                    saveDraft({ rcNumber: upper });
                                }}
                                placeholder="Enter RC Number"
                                placeholderTextColor="#9CA3AF"
                                autoCapitalize="characters"
                                style={styles.textInput}
                            />
                        </View>
                        <DocItem label="Vehicle Registration (RC) Photo" type="rcPhoto" image={docs.rcPhoto} onPick={pickImage} icon="file-document-outline" />
                        <DocItem label="Photo of your Vehicle" type="vehiclePhoto" image={docs.vehiclePhoto} onPick={pickImage} icon="truck-outline" />
                        <DocItem label="Selfie with your Vehicle" type="selfieWithVehicle" image={docs.selfieWithVehicle} onPick={pickImage} icon="account-group-outline" />
                        <View style={styles.infoBox}>
                            <Text style={styles.infoTitle}>💡 Instructions</Text>
                            <Text style={styles.infoText}>
                                Make sure your RC number matches the physical card. The vehicle photo should clearly show the license plate.
                            </Text>
                        </View>
                    </View>
                )}

                {/* ─── Step 5: Payout (Optional) ─── */}
                {currentStep === 5 && (
                    <View>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Payout Credentials</Text>
                            <View style={styles.optionalBadge}>
                                <Text style={styles.optionalBadgeText}>Optional</Text>
                            </View>
                        </View>
                        <View style={styles.inputCard}>
                            <Text style={styles.inputLabel}>Account Holder Name</Text>
                            <TextInput
                                value={accountHolderName}
                                onChangeText={(val) => { setAccountHolderName(val); saveDraft({ accountHolderName: val }); }}
                                placeholder="Name as per bank record"
                                placeholderTextColor="#9CA3AF"
                                style={[styles.textInput, { marginBottom: 16 }]}
                            />
                            <Text style={styles.inputLabel}>Account Number</Text>
                            <TextInput
                                value={accountNumber}
                                onChangeText={(val) => {
                                    const digits = val.replace(/\D/g, '');
                                    setAccountNumber(digits);
                                    saveDraft({ accountNumber: digits });
                                }}
                                placeholder="Bank account number"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                style={[styles.textInput, { marginBottom: 16 }]}
                            />
                            <Text style={styles.inputLabel}>IFSC Code</Text>
                            <TextInput
                                value={ifscCode}
                                onChangeText={(val) => {
                                    const upper = val.toUpperCase().slice(0, 11);
                                    setIfscCode(upper);
                                    saveDraft({ ifscCode: upper });
                                }}
                                placeholder="Ex. SBIN000123"
                                placeholderTextColor="#9CA3AF"
                                autoCapitalize="characters"
                                maxLength={11}
                                style={[styles.textInput, { marginBottom: 16 }]}
                            />
                            <Text style={styles.inputLabel}>UPI Alias (VPA)</Text>
                            <TextInput
                                value={upiId}
                                onChangeText={(val) => {
                                    const lower = val.toLowerCase();
                                    setUpiId(lower);
                                    saveDraft({ upiId: lower });
                                }}
                                placeholder="name@upi"
                                placeholderTextColor="#9CA3AF"
                                autoCapitalize="none"
                                style={styles.textInput}
                            />
                        </View>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoTitle}>💡 Instructions</Text>
                            <Text style={styles.infoText}>
                                Add your bank or UPI details to withdraw earnings directly. You can skip this step and add it later in settings.
                            </Text>
                        </View>
                    </View>
                )}

                {/* ─── Bottom Navigation Buttons ─── */}
                <View style={styles.navRow}>
                    {currentStep > 1 && (
                        <TouchableOpacity
                            onPress={() => {
                                const prev = currentStep - 1;
                                setCurrentStep(prev);
                                saveDraft({ currentStep: prev });
                            }}
                            style={styles.backBtn}
                        >
                            <Ionicons name="chevron-back" size={20} color="#000" style={{ marginRight: 4 }} />
                            <Text style={styles.backBtnText}>Back</Text>
                        </TouchableOpacity>
                    )}

                    {currentStep < 5 ? (
                        <TouchableOpacity
                            onPress={() => {
                                const next = currentStep + 1;
                                setCurrentStep(next);
                                saveDraft({ currentStep: next });
                            }}
                            disabled={!stepValid}
                            style={[styles.continueBtn, !stepValid && styles.continueBtnDisabled]}
                        >
                            <Text style={[styles.continueBtnText, !stepValid && styles.continueBtnTextDisabled]}>
                                {currentStep === 3 && licenseNumber.trim().length === 0 ? 'Skip / Continue' : 'Continue'}
                            </Text>
                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color={stepValid ? '#FFF' : '#9CA3AF'}
                                style={{ marginLeft: 4 }}
                            />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={async () => {
                                await handleSubmit();
                                try { await AsyncStorage.removeItem('driver_verify_draft'); } catch (e) { console.error(e); }
                            }}
                            disabled={loading}
                            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    // Header
    header: { paddingBottom: 25, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    logoutBtn: { position: 'absolute', top: 52, right: 24, zIndex: 10, padding: 8 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFF' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
    // Stepper
    stepperContainer: { paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'rgba(249,250,251,0.5)', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
    stepperTrackBg: { position: 'absolute', left: 20, right: 20, top: 20, height: 2, backgroundColor: '#E5E7EB' },
    stepperTrackFill: { position: 'absolute', left: 20, top: 20, height: 2, backgroundColor: '#000000' },
    stepItemContainer: { alignItems: 'center', zIndex: 10, flex: 1 },
    stepCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    stepCircleCompleted: { backgroundColor: '#000000', borderColor: '#000000' },
    stepCircleActive: { backgroundColor: '#FFFFFF', borderColor: '#000000' },
    stepCircleInactive: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
    stepLabel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 },
    stepLabelActive: { color: '#000000' },
    stepLabelInactive: { color: '#9CA3AF' },
    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingTop: 24, paddingHorizontal: 24, maxWidth: 500, alignSelf: 'center', width: '100%' },
    // Section
    sectionTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
    optionalBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    optionalBadgeText: { fontSize: 8, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
    // Input Card
    inputCard: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 24 },
    inputLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6, marginLeft: 4 },
    textInput: { backgroundColor: '#FFFFFF', borderRadius: 12, height: 56, paddingHorizontal: 16, fontSize: 14, fontWeight: '700', color: '#000000', borderWidth: 1, borderColor: '#F3F4F6' },
    // Info Box
    infoBox: { backgroundColor: 'rgba(239,246,255,0.5)', borderWidth: 1, borderColor: 'rgba(191,219,254,0.5)', padding: 16, borderRadius: 16, marginBottom: 24 },
    infoTitle: { fontSize: 10, fontWeight: '700', color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    infoText: { fontSize: 11, color: '#1E40AF', lineHeight: 18 },
    // DocItem
    docItemContainer: { marginBottom: 24 },
    docItemLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
    docItemBox: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    docItemEditOverlay: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, padding: 8 },
    docItemEmpty: { alignItems: 'center' },
    docItemIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    docItemUploadText: { fontSize: 12, fontWeight: '700', color: '#000000' },
    docItemSubText: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
    // Rejection Banner
    rejectionBanner: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FEE2E2', marginBottom: 24 },
    rejectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    rejectionTitle: { fontSize: 14, fontWeight: '700', color: '#EF4444', marginLeft: 8 },
    rejectionReason: { fontSize: 12, color: 'rgba(239,68,68,0.7)', lineHeight: 20 },
    // Nav Buttons
    navRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
    backBtn: { flex: 1, height: 64, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1, borderColor: '#E5E7EB' },
    backBtnText: { fontSize: 16, fontWeight: '700', color: '#000000' },
    continueBtn: { flex: 2, height: 64, borderRadius: 16, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    continueBtnDisabled: { backgroundColor: '#E5E7EB' },
    continueBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    continueBtnTextDisabled: { color: '#9CA3AF' },
    submitBtn: { flex: 2, height: 64, borderRadius: 16, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
    submitBtnDisabled: { backgroundColor: '#9CA3AF' },
    submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
