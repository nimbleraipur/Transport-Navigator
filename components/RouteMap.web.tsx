import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface RouteMapProps {
  pickup: { name: string; lat: number; lng: number };
  delivery: { name: string; lat: number; lng: number };
}

export default function RouteMap({ pickup, delivery }: RouteMapProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F0FE', '#D1E3FD', '#E8F0FE']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.route}>
        <View style={styles.marker}>
          <Ionicons name="location" size={24} color={Colors.success} />
          <Text style={styles.label}>{pickup.name}</Text>
        </View>
        <View style={styles.line} />
        <View style={styles.marker}>
          <Ionicons name="flag" size={24} color={Colors.danger} />
          <Text style={styles.label}>{delivery.name}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  route: {
    alignItems: 'center',
    gap: 8,
  },
  marker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  line: {
    width: 3,
    height: 40,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
