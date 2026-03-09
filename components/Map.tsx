import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';

export default function Map() {
    const mapRef = useRef<MapView>(null);
    const [region, setRegion] = useState<Region>({
        latitude: 22.7196,
        longitude: 75.8577,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    // Mute the alert on missing permissions so it doesn't annoy the user
                    return;
                }

                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                const currentRegion = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                };

                setRegion(currentRegion);
                // Animate to user location when found
                mapRef.current?.animateToRegion(currentRegion, 1000);
            } catch (error) {
                console.log('Error fetching location:', error);
            }
        })();
    }, []);
    return (
        <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={region}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            showsMyLocationButton={true}
        />
    );
}







