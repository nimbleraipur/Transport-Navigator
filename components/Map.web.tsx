import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import LAYOUT, { moderateScale } from '@/constants/layout';

export default function Map() {
    return (
        <View style={[styles.mapBackground, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface }]}>
            <Ionicons name="map-outline" size={moderateScale(48)} color={Colors.textTertiary} />
            <Text style={{ color: Colors.textSecondary, marginTop: 10, fontFamily: 'Inter_500Medium' }}>
                Map is available on mobile devices
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    mapBackground: {
        ...StyleSheet.absoluteFillObject,
    },
});
