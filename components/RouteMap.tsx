import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Colors from '@/constants/colors';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface RouteMapProps {
  pickup: { name: string; lat: number; lng: number };
  delivery: { name: string; lat: number; lng: number };
  driverLocation?: { latitude: number; longitude: number } | null;
  showDriverToPickup?: boolean;
  onRoutingUpdate?: (data: { distance: number; duration: number }) => void;
}

export default function RouteMap({ pickup, delivery, driverLocation, showDriverToPickup, onRoutingUpdate }: RouteMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      const coords = [
        { latitude: pickup.lat, longitude: pickup.lng },
        { latitude: delivery.lat, longitude: delivery.lng },
      ];
      if (driverLocation) coords.push(driverLocation);

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 60, bottom: 200, left: 60 },
          animated: true
        });
      }, 300);
    }
  }, [pickup, delivery, driverLocation]);

  const origin = showDriverToPickup && driverLocation
    ? driverLocation
    : { latitude: pickup.lat, longitude: pickup.lng };

  const destination = { latitude: delivery.lat, longitude: delivery.lng };

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        latitude: (pickup.lat + delivery.lat) / 2,
        longitude: (pickup.lng + delivery.lng) / 2,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      showsUserLocation={!!driverLocation}
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      <Marker
        coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
        title="Pickup"
        description={pickup.name}
        pinColor={Colors.success}
      />
      <Marker
        coordinate={{ latitude: delivery.lat, longitude: delivery.lng }}
        title="Drop-off"
        description={delivery.name}
        pinColor={Colors.danger}
      />

      {driverLocation && (
        <Marker
          coordinate={driverLocation}
          title="Vehicle"
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <MaterialCommunityIcons name="truck-delivery" size={32} color={Colors.primary} />
        </Marker>
      )}

      {GOOGLE_MAPS_API_KEY ? (
        <>
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor={Colors.primary}
            onReady={(result) => {
              if (onRoutingUpdate) {
                onRoutingUpdate({
                  distance: result.distance,
                  duration: result.duration
                });
              }
              mapRef.current?.fitToCoordinates(result.coordinates, {
                edgePadding: { right: 60, bottom: 350, left: 60, top: 80 },
              });
            }}
          />
          {showDriverToPickup && driverLocation && (
            <MapViewDirections
              origin={driverLocation}
              destination={{ latitude: pickup.lat, longitude: pickup.lng }}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={3}
              strokeColor={Colors.success}
              lineDashPattern={[5, 5]}
              onReady={(result) => {
                // If we are showing driver to pickup, this duration is more important for ETA
                if (onRoutingUpdate) {
                  onRoutingUpdate({
                    distance: result.distance,
                    duration: result.duration
                  });
                }
              }}
            />
          )}
        </>
      ) : (
        <Polyline
          coordinates={[
            driverLocation || { latitude: pickup.lat, longitude: pickup.lng },
            { latitude: delivery.lat, longitude: delivery.lng },
          ]}
          strokeColor={Colors.primary}
          strokeWidth={4}
        />
      )}
    </MapView>
  );
}
