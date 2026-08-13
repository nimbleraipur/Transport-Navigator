import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UpdateModalProps {
    visible: boolean;
    latestVersion: string;
    isForceUpdate: boolean;
    playStoreUrl: string;
    updateMessage?: string;
    onDismiss: () => void;
}

export default function UpdateModal({
    visible,
    latestVersion,
    isForceUpdate,
    playStoreUrl,
    updateMessage,
    onDismiss
}: UpdateModalProps) {
    if (!visible) return null;

    const handleUpdate = () => {
        if (playStoreUrl) {
            Linking.openURL(playStoreUrl).catch(err => {
                console.error('[PLAY-STORE-ERROR] Could not open store link:', err);
            });
        }
    };

    return (
        <Modal
            transparent
            animationType="slide"
            visible={visible}
            onRequestClose={() => {
                if (!isForceUpdate) onDismiss();
            }}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    
                    {/* Hero Icon Badge */}
                    <View style={styles.iconCircle}>
                        <Ionicons name="rocket-sharp" size={42} color="#00C853" />
                    </View>

                    {/* Version Badge */}
                    <View style={styles.versionBadge}>
                        <Text style={styles.versionText}>NEW VERSION {latestVersion} AVAILABLE</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Update My Load 24 🚀</Text>

                    {/* Message Body */}
                    <Text style={styles.message}>
                        {updateMessage || 'A new update with exciting performance enhancements and bug fixes is now live on Google Play Store. Please update your app for uninterrupted service!'}
                    </Text>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.updateButton} 
                            onPress={handleUpdate}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="download-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.updateButtonText}>UPDATE NOW</Text>
                        </TouchableOpacity>

                        {!isForceUpdate && (
                            <TouchableOpacity 
                                style={styles.dismissButton} 
                                onPress={onDismiss}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.dismissButtonText}>Remind Me Later</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    card: {
        width: Math.min(width * 0.9, 360),
        backgroundColor: '#1C1C1E',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
        shadowColor: '#00C853',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 15
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 200, 83, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(0, 200, 83, 0.3)'
    },
    versionBadge: {
        backgroundColor: 'rgba(0, 200, 83, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 200, 83, 0.3)'
    },
    versionText: {
        color: '#00C853',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1
    },
    title: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 8
    },
    message: {
        color: '#A1A1AA',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20
    },
    buttonContainer: {
        width: '100%',
        gap: 10
    },
    updateButton: {
        backgroundColor: '#00C853',
        paddingVertical: 14,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: '#00C853',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8
    },
    updateButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1
    },
    dismissButton: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    dismissButtonText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '700'
    }
});
