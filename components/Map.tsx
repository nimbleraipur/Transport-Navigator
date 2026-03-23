import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';

export interface MapRef {
    animateToCurrentLocation: () => Promise<void>;
}

const Map = forwardRef<MapRef, {}>((props, ref) => {
    const mapRef = useRef<MapView>(null);
    const [region, setRegion] = useState<Region>({
        latitude: 22.7196,
        longitude: 75.8577,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });

    const animateToCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Location permission is required to find your position.');
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
            mapRef.current?.animateToRegion(currentRegion, 1000);
        } catch (error) {
            console.log('Error fetching location:', error);
        }
    };

    useImperativeHandle(ref, () => ({
        animateToCurrentLocation
    }));

    useEffect(() => {
        animateToCurrentLocation();
    }, []);

    return (
        <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={region}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            showsMyLocationButton={false} // We are adding our own custom button
        />
    );
});

export default Map;







