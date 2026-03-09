import React, { forwardRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface LocationPickerMapProps {
    activeField: 'pickup' | 'delivery' | null;
    onLocationSelect: (loc: any) => void;
}

const LocationPickerMap = forwardRef((props: LocationPickerMapProps, ref) => {
    return (
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, padding: 40 }]}>
            <View style={{ alignItems: 'center', maxWidth: 300 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary + '10', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <Ionicons name="map" size={40} color={Colors.primary} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.text, textAlign: 'center', marginBottom: 10 }}>Interactive Discovery</Text>
                <Text style={{ fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>Please use the mobile terminal for full geographic selection and route tracking features.</Text>
            </View>
        </View>
    );
});

export default LocationPickerMap;
