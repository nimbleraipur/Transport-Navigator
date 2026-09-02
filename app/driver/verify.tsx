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
    Dimensions,
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

type DocType = 'licensePhoto' | 'rcPhoto' | 'vehiclePhoto' | 'profileSelfie' | 'qrPhoto';

interface DocCardProps {
    label: string;
    subLabel?: string;
    type: DocType;
    image: string | null;
    onPick: (type: DocType) => void;
    icon: string;
    aspectRatio?: number;
}

function DocCard({ label, subLabel, type, image, onPick, icon, aspectRatio = 16 / 9 }: DocCardProps) {
    return (
        <View style={styles.docCardContainer}>
            <View style={styles.docLabelRow}>
                <Text style={styles.docCardLabel}>{label}</Text>
                {subLabel && <Text style={styles.docCardSubLabel}>{subLabel}</Text>}
            </View>
            <TouchableOpacity
                onPress={() => onPick(type)}
                activeOpacity={0.8}
                style={[styles.docCardBox, { aspectRatio }]}
            >
                {image ? (
                    <>
                        <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        <View style={styles.docCardEditOverlay}>
                            <Ionicons name="camera" size={16} color="#000000" />
                            <Text style={styles.docCardEditText}>Change Photo</Text>
                        </View>
                    </>
                ) : (
                    <View style={styles.docCardEmpty}>
                        <View style={styles.docCardIconBg}>
                            <MaterialCommunityIcons name={icon as any} size={28} color="#000000" />
                        </View>
                        <Text style={styles.docCardUploadText}>Tap to Capture / Upload</Text>
                        <Text style={styles.docCardSubText}>Take a clear, readable photo</Text>
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
    const { width: SCREEN_WIDTH } = Dimensions.get('window');

    const [currentStep, setCurrentStep] = useState(1);
    const [name, setName] = useState(user?.name || '');
    const [upiId, setUpiId] = useState('');
    const [docs, setDocs] = useState<Record<DocType, string | null>>({
        profileSelfie: null,
        licensePhoto: null,
        rcPhoto: null,
        vehiclePhoto: null,
        qrPhoto: null,
    });

    const [loading, setLoading] = useState(false);

    // Load saved draft on mount
    useEffect(() => {
        const loadDraft = async () => {
            try {
                const stored = await AsyncStorage.getItem('driver_verify_draft_v2');
                if (stored) {
                    const draft = JSON.parse(stored);
                    if (draft.name) setName(draft.name);
                    if (draft.upiId) setUpiId(draft.upiId);
                    if (draft.docs) setDocs(prev => ({ ...prev, ...draft.docs }));
                    if (draft.currentStep) setCurrentStep(draft.currentStep);
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
                upiId: updates.hasOwnProperty('upiId') ? updates.upiId : upiId,
                docs: updates.hasOwnProperty('docs') ? updates.docs : docs,
                currentStep: updates.hasOwnProperty('currentStep') ? updates.currentStep : currentStep,
            };
            await AsyncStorage.setItem('driver_verify_draft_v2', JSON.stringify(newDraft));
        } catch (e) {
            console.error('Error saving verification draft:', e);
        }
    };

    const isStepValid = (step: number) => {
        switch (step) {
            case 1:
                return name.trim().length >= 2 && !!docs.profileSelfie;
            case 2:
                return !!docs.licensePhoto && !!docs.rcPhoto && !!docs.vehiclePhoto;
            case 3:
                return true; // Payout optional / flexible
            default:
                return false;
        }
    };

    const pickImage = async (type: DocType) => {
        Alert.alert(
            'Upload Photo',
            'Select source for document photo',
            [
                {
                    text: 'Take Photo',
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Permission Required', 'Camera permission is required to capture document photos.');
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
                            Alert.alert('Error', 'Failed to launch camera');
                        }
                    },
                },
                {
                    text: 'Choose from Gallery',
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('Permission Required', 'Photo library permission is required to select photos.');
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
                            Alert.alert('Error', 'Failed to open photo gallery');
                        }
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSubmit = async () => {
        if (!name || name.trim().length < 2) {
            return Alert.alert('Missing Name', 'Please enter your full name.');
        }
        if (!docs.profileSelfie) {
            return Alert.alert('Missing Selfie', 'Please upload your driver selfie photo in Step 1.');
        }
        if (!docs.licensePhoto || !docs.rcPhoto || !docs.vehiclePhoto) {
            return Alert.alert('Missing Documents', 'Please upload your License, RC, and Vehicle photos in Step 2.');
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            if (upiId) formData.append('upiId', upiId.toLowerCase().trim());

            // Append photos
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
                await AsyncStorage.removeItem('driver_verify_draft_v2');
                router.replace('/driver/pending-approval' as any);
            } else {
                Alert.alert('Submission Failed', data.error || 'Please check your details and try again.');
            }
        } catch (e) {
            console.error('Verification submit error:', e);
            Alert.alert('Network Error', 'Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const stepsConfig = [
        { label: 'Profile & Selfie', icon: 'account' },
        { label: 'Documents', icon: 'file-document' },
        { label: 'Payout QR', icon: 'qrcode' }
    ];

    const stepValid = isStepValid(currentStep);
    const progressWidth = ((currentStep - 1) / 2) * 100;

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#0F172A', '#1E293B']}
                style={[styles.header, { paddingTop: insets.top + 16 }]}
            >
                <TouchableOpacity onPress={() => logout()} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={22} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Driver Verification</Text>
                <Text style={styles.headerSubtitle}>Complete 3 quick steps to start earning</Text>
            </LinearGradient>

            {/* Stepper */}
            <View style={styles.stepperContainer}>
                <View style={styles.stepperRow}>
                    <View style={styles.stepperTrackBg} />
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
                                            size={18}
                                            color={isActive ? '#0F172A' : '#9CA3AF'}
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
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Rejection Banner */}
                {user?.verificationStatus === 'rejected' && currentStep === 1 && (
                    <View style={styles.rejectionBanner}>
                        <View style={styles.rejectionRow}>
                            <Ionicons name="alert-circle" size={20} color="#EF4444" />
                            <Text style={styles.rejectionTitle}>Verification Rejected</Text>
                        </View>
                        <Text style={styles.rejectionReason}>
                            {user.rejectionReason || 'Uploaded documents were not clear. Please re-capture and submit.'}
                        </Text>
                    </View>
                )}

                {/* ─── Step 1: Profile & Selfie ─── */}
                {currentStep === 1 && (
                    <View className="animate-fade-in">
                        <Text style={styles.sectionTitle}>1. Profile Details & Selfie</Text>
                        
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

                        <DocCard
                            label="Driver Selfie Photo"
                            subLabel="Required for verification"
                            type="profileSelfie"
                            image={docs.profileSelfie}
                            onPick={pickImage}
                            icon="account-box-outline"
                            aspectRatio={4 / 3}
                        />

                        <View style={styles.infoBox}>
                            <View style={styles.infoTitleRow}>
                                <Ionicons name="bulb-outline" size={16} color="#0284C7" />
                                <Text style={styles.infoTitle}>Selfie Guidelines</Text>
                            </View>
                            <Text style={styles.infoText}>
                                • Take a clear selfie in good light.{'\n'}
                                • Do not wear helmet, cap, or dark sunglasses.{'\n'}
                                • Ensure your face is centered and fully visible.
                            </Text>
                        </View>
                    </View>
                )}

                {/* ─── Step 2: Vehicle & License Documents (3 Photos ONLY) ─── */}
                {currentStep === 2 && (
                    <View className="animate-fade-in">
                        <Text style={styles.sectionTitle}>2. Upload Document Photos</Text>

                        <DocCard
                            label="1. Driving License Photo"
                            subLabel="Clear front side photo"
                            type="licensePhoto"
                            image={docs.licensePhoto}
                            onPick={pickImage}
                            icon="card-bulleted-outline"
                        />

                        <DocCard
                            label="2. Vehicle RC Photo"
                            subLabel="Registration Certificate photo"
                            type="rcPhoto"
                            image={docs.rcPhoto}
                            onPick={pickImage}
                            icon="file-document-outline"
                        />

                        <DocCard
                            label="3. Vehicle Photo"
                            subLabel="Full front/side view showing number plate"
                            type="vehiclePhoto"
                            image={docs.vehiclePhoto}
                            onPick={pickImage}
                            icon="truck-outline"
                        />
                    </View>
                )}

                {/* ─── Step 3: Payout Details (UPI ID & QR Code) ─── */}
                {currentStep === 3 && (
                    <View className="animate-fade-in">
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>3. Payout & Earnings Details</Text>
                            <View style={styles.optionalBadge}>
                                <Text style={styles.optionalBadgeText}>Direct Payout</Text>
                            </View>
                        </View>

                        <View style={styles.inputCard}>
                            <Text style={styles.inputLabel}>UPI ID (VPA)</Text>
                            <TextInput
                                value={upiId}
                                onChangeText={(val) => {
                                    const lower = val.toLowerCase();
                                    setUpiId(lower);
                                    saveDraft({ upiId: lower });
                                }}
                                placeholder="Example: 9876543210@paytm or name@upi"
                                placeholderTextColor="#9CA3AF"
                                autoCapitalize="none"
                                style={styles.textInput}
                            />
                        </View>

                        <DocCard
                            label="Payment QR Code Photo"
                            subLabel="Upload PhonePe / GPay / PayTM QR Image"
                            type="qrPhoto"
                            image={docs.qrPhoto}
                            onPick={pickImage}
                            icon="qrcode-scan"
                            aspectRatio={4 / 3}
                        />
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

                    {currentStep < 3 ? (
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
                                Continue
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
                            onPress={handleSubmit}
                            disabled={loading}
                            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>
                                    Complete Verification
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
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    // Header
    header: { paddingBottom: 20, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    logoutBtn: { position: 'absolute', top: 48, right: 20, zIndex: 10, padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
    // Stepper
    stepperContainer: { paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
    stepperTrackBg: { position: 'absolute', left: 30, right: 30, top: 18, height: 3, backgroundColor: '#E2E8F0' },
    stepperTrackFill: { position: 'absolute', left: 30, top: 18, height: 3, backgroundColor: '#0F172A' },
    stepItemContainer: { alignItems: 'center', zIndex: 10, flex: 1 },
    stepCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    stepCircleCompleted: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
    stepCircleActive: { backgroundColor: '#FFFFFF', borderColor: '#0F172A' },
    stepCircleInactive: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1' },
    stepLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
    stepLabelActive: { color: '#0F172A' },
    stepLabelInactive: { color: '#94A3B8' },
    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingTop: 20, paddingHorizontal: 20, maxWidth: 500, alignSelf: 'center', width: '100%' },
    // Section
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    optionalBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    optionalBadgeText: { fontSize: 9, fontWeight: '800', color: '#0284C7', textTransform: 'uppercase' },
    // Input Card
    inputCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
    inputLabel: { fontSize: 11, fontWeight: '800', color: '#334155', textTransform: 'uppercase', marginBottom: 6 },
    textInput: { backgroundColor: '#F8FAFC', borderRadius: 12, height: 50, paddingHorizontal: 16, fontSize: 14, fontWeight: '700', color: '#0F172A', borderWidth: 1, borderColor: '#CBD5E1' },
    // Info Box
    infoBox: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD', padding: 14, borderRadius: 16, marginBottom: 20 },
    infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    infoTitle: { fontSize: 11, fontWeight: '800', color: '#0369A1', textTransform: 'uppercase' },
    infoText: { fontSize: 12, color: '#0284C7', lineHeight: 18, fontWeight: '500' },
    // DocCard
    docCardContainer: { marginBottom: 18 },
    docLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    docCardLabel: { fontSize: 12, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' },
    docCardSubLabel: { fontSize: 10, color: '#64748B', fontWeight: '600' },
    docCardBox: { width: '100%', borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    docCardEditOverlay: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 3 },
    docCardEditText: { fontSize: 11, fontWeight: '800', color: '#000000' },
    docCardEmpty: { alignItems: 'center' },
    docCardIconBg: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    docCardUploadText: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
    docCardSubText: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    // Rejection Banner
    rejectionBanner: { backgroundColor: '#FEF2F2', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', marginBottom: 16 },
    rejectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    rejectionTitle: { fontSize: 14, fontWeight: '800', color: '#DC2626' },
    rejectionReason: { fontSize: 12, color: '#B91C1C', lineHeight: 18 },
    // Nav Buttons
    navRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    backBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1, borderColor: '#CBD5E1' },
    backBtnText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
    continueBtn: { flex: 2, height: 56, borderRadius: 16, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    continueBtnDisabled: { backgroundColor: '#CBD5E1' },
    continueBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
    continueBtnTextDisabled: { color: '#94A3B8' },
    submitBtn: { flex: 2, height: 56, borderRadius: 16, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
    submitBtnDisabled: { backgroundColor: '#94A3B8' },
    submitBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
