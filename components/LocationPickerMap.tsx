import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { BILASPUR_REGION } from '@/lib/locations';

import * as Location from 'expo-location';

interface LocationPickerMapProps {
    activeField: 'pickup' | 'delivery' | null;
    onLocationSelect: (loc: any) => void;
    googleMapsApiKey?: string;
    initialLocation?: { lat: number, lng: number } | null;
}

const LocationPickerMap = (props: LocationPickerMapProps) => {
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        if (props.initialLocation) {
            setTimeout(() => {
                mapRef.current?.animateToRegion({
                    latitude: props.initialLocation!.lat,
                    longitude: props.initialLocation!.lng,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }, 1000);
            }, 300);
            return;
        }

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                // Fallback to Bilaspur if permission denied
                setTimeout(() => {
                    mapRef.current?.animateToRegion(BILASPUR_REGION, 1000);
                }, 500);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const currentRegion = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };

            setTimeout(() => {
                mapRef.current?.animateToRegion(currentRegion, 1000);
            }, 500);
        })();
    }, [props.initialLocation?.lat, props.initialLocation?.lng]); // Depend on coordinates to avoid unnecessary jumps

    return (
        <View className="flex-1">
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={
                    props.initialLocation
                        ? { latitude: props.initialLocation.lat, longitude: props.initialLocation.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }
                        : BILASPUR_REGION
                }
                provider={PROVIDER_GOOGLE}
                showsUserLocation={true}
                showsMyLocationButton={true}
                onRegionChangeComplete={async (r) => {
                    if (props.activeField) {
                        let name = 'Selected Location';
                        let area = `Lat: ${r.latitude.toFixed(4)}, Lng: ${r.longitude.toFixed(4)}`;

                        if (props.googleMapsApiKey) {
                            try {
                                const res = await fetch(
                                    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${r.latitude},${r.longitude}&key=${props.googleMapsApiKey}`
                                );
                                const data = await res.json();
                                if (data.status === 'OK' && data.results.length > 0) {
                                    // Filter out results that are just plus codes if possible
                                    const bestResult = data.results.find((r: any) => !r.types.includes('plus_code')) || data.results[0];

                                    // Try to find a meaningful name (e.g., point of interest, sublocality)
                                    const poi = data.results.find((r: any) =>
                                        r.types.includes('point_of_interest') ||
                                        r.types.includes('establishment') ||
                                        r.types.includes('sublocality_level_1')
                                    );

                                    name = poi ? poi.address_components[0]?.long_name : (bestResult.address_components[0]?.long_name || 'Selected Point');
                                    area = bestResult.formatted_address;
                                } else {
                                    if (data.status === 'REQUEST_DENIED' || data.status === 'OVER_QUERY_LIMIT') {
                                        console.error('Geocoding API Error:', data.error_message || data.status);
                                        area = `API Error: ${data.status}. Check API Key/Billing.`;
                                    }
                                }
                            } catch (e) {
                                console.error('Geocoding Network Error:', e);
                            }
                        }

                        props.onLocationSelect({
                            id: 'pin-' + Date.now(),
                            name,
                            area,
                            lat: r.latitude,
                            lng: r.longitude,
                            isLoaded: true
                        });
                    }
                }}
                onRegionChange={() => {
                    if (props.activeField) {
                        props.onLocationSelect({ isLoaded: false });
                    }
                }}
            />
            {props.activeField && (
                <View
                    style={{ position: 'absolute', top: '50%', left: '50%', marginTop: -40, marginLeft: -20, pointerEvents: 'none', zIndex: 10 }}
                    className="items-center"
                >
                    <View className="bg-white/20 rounded-full p-2">
                        <Ionicons name="location" size={40} color={props.activeField === 'pickup' ? Colors.success : Colors.danger} />
                    </View>
                    <View className="w-1 h-1 bg-black/20 rounded-full mt-[-4px]" />
                </View>
            )}
        </View>
    );
};

export default LocationPickerMap;
