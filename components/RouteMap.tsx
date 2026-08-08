import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, Platform, View, TouchableOpacity, Text } from 'react-native';
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

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const rLat1 = lat1 * Math.PI / 180;
  const rLat2 = lat2 * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(rLat2);
  const x = Math.cos(rLat1) * Math.sin(rLat2) -
            Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon);
  
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

export default function RouteMap({ pickup, delivery, driverLocation, showDriverToPickup, onRoutingUpdate }: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const [animatedLoc, setAnimatedLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [bearing, setBearing] = useState<number>(0);
  
  // Navigation & Gesture Controls
  const [isAutoRefocusEnabled, setIsAutoRefocusEnabled] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'navigation'>('overview');
  
  // Throttled Google Directions inputs
  const [throttledOrigin, setThrottledOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const lastQueryLocRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastQueryTimeRef = useRef<number>(0);

  const prevLocRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const animationRef = useRef<number | null>(null);

  // Smooth Marker interpolation & bearing rotation
  useEffect(() => {
    if (!driverLocation) return;

    if (!prevLocRef.current) {
      setAnimatedLoc(driverLocation);
      prevLocRef.current = driverLocation;
      return;
    }

    const startLat = prevLocRef.current.latitude;
    const startLng = prevLocRef.current.longitude;
    const endLat = driverLocation.latitude;
    const endLng = driverLocation.longitude;

    if (startLat === endLat && startLng === endLng) return;

    const newBearing = calculateBearing(startLat, startLng, endLat, endLng);
    setBearing(newBearing);

    const duration = 1500; // interpolate coordinates over 1.5 seconds for maximum fluid movement
    const startTime = Date.now();

    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    animationRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-in-out quad
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const currentLat = startLat + (endLat - startLat) * easeProgress;
      const currentLng = startLng + (endLng - startLng) * easeProgress;

      setAnimatedLoc({ latitude: currentLat, longitude: currentLng });

      if (progress >= 1) {
        if (animationRef.current) {
          clearInterval(animationRef.current);
          animationRef.current = null;
        }
        prevLocRef.current = driverLocation;
      }
    }, 16);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [driverLocation]);

  // Throttle Google Directions updates to prevent screen-flash & save API costs
  useEffect(() => {
    if (!animatedLoc) return;

    if (!showDriverToPickup) {
      setThrottledOrigin({ latitude: pickup.lat, longitude: pickup.lng });
      return;
    }

    if (!lastQueryLocRef.current) {
      setThrottledOrigin(animatedLoc);
      lastQueryLocRef.current = animatedLoc;
      lastQueryTimeRef.current = Date.now();
      return;
    }

    // Measure distance moved
    const R = 6371e3; // meters
    const lat1 = lastQueryLocRef.current.latitude;
    const lon1 = lastQueryLocRef.current.longitude;
    const lat2 = animatedLoc.latitude;
    const lon2 = animatedLoc.longitude;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    const elapsed = Date.now() - lastQueryTimeRef.current;

    // Refresh route only if moved > 150m or 45s passed since last Google request
    if (dist > 150 || elapsed > 45000) {
      setThrottledOrigin(animatedLoc);
      lastQueryLocRef.current = animatedLoc;
      lastQueryTimeRef.current = Date.now();
    }
  }, [animatedLoc, showDriverToPickup, pickup.lat, pickup.lng]);

  // Initial flat fit-to-route if auto-refocus is active in 2D mode
  useEffect(() => {
    if (viewMode === 'overview' && isAutoRefocusEnabled) {
      const coords = [
        { latitude: pickup.lat, longitude: pickup.lng },
        { latitude: delivery.lat, longitude: delivery.lng },
      ];
      if (animatedLoc) coords.push(animatedLoc);

      const timer = setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 50, bottom: 150, left: 50 },
          animated: true
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [pickup.lat, pickup.lng, delivery.lat, delivery.lng, viewMode, isAutoRefocusEnabled]);

  // 3D Navigation Camera tracking (course-up & pitch tilt)
  useEffect(() => {
    if (viewMode === 'navigation' && animatedLoc && isAutoRefocusEnabled) {
      mapRef.current?.animateCamera({
        center: animatedLoc,
        pitch: 45, // 3D perspective angle
        heading: bearing, // align heading matching direction of travel
        zoom: 17, // zoomed-in navigation view
      }, { duration: 1000 });
    }
  }, [animatedLoc, bearing, viewMode, isAutoRefocusEnabled]);

  const recenterMap = () => {
    setIsAutoRefocusEnabled(true);
    if (viewMode === 'overview') {
      const coords = [
        { latitude: pickup.lat, longitude: pickup.lng },
        { latitude: delivery.lat, longitude: delivery.lng },
      ];
      if (animatedLoc) coords.push(animatedLoc);
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 50, bottom: 150, left: 50 },
        animated: true
      });
    }
  };

  const toggleViewMode = () => {
    setIsAutoRefocusEnabled(true);
    setViewMode(prev => prev === 'overview' ? 'navigation' : 'overview');
  };

  const origin = showDriverToPickup
    ? (throttledOrigin || animatedLoc || { latitude: pickup.lat, longitude: pickup.lng })
    : { latitude: pickup.lat, longitude: pickup.lng };

  const destination = { latitude: delivery.lat, longitude: delivery.lng };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: (pickup.lat + delivery.lat) / 2,
          longitude: (pickup.lng + delivery.lng) / 2,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onRegionChangeComplete={(region, details) => {
          // Detect user pinch/scroll gestures & pause auto-refocus
          if (details?.isGesture) {
            setIsAutoRefocusEnabled(false);
          }
        }}
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

        {animatedLoc && (
          <Marker
            coordinate={animatedLoc}
            title="Vehicle"
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={bearing}
            flat={true}
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
                // Only fit routes automatically if user is not actively zooming/panning in overview
                if (isAutoRefocusEnabled && viewMode === 'overview') {
                  mapRef.current?.fitToCoordinates(result.coordinates, {
                    edgePadding: { right: 60, bottom: 200, left: 60, top: 80 },
                    animated: true
                  });
                }
              }}
            />
            {showDriverToPickup && animatedLoc && (
              <MapViewDirections
                origin={animatedLoc}
                destination={{ latitude: pickup.lat, longitude: pickup.lng }}
                apikey={GOOGLE_MAPS_API_KEY}
                strokeWidth={3}
                strokeColor={Colors.success}
                lineDashPattern={[5, 5]}
                onReady={(result) => {
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
              animatedLoc || { latitude: pickup.lat, longitude: pickup.lng },
              { latitude: delivery.lat, longitude: delivery.lng },
            ]}
            strokeColor={Colors.primary}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Floating View Controls (Right Side) */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          onPress={toggleViewMode}
          style={[styles.floatingButton, !isAutoRefocusEnabled && { marginBottom: 10 }]}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={viewMode === 'navigation' ? "map-outline" : "compass-outline"}
            size={24}
            color={Colors.primary}
          />
        </TouchableOpacity>

        {!isAutoRefocusEnabled && (
          <TouchableOpacity
            onPress={recenterMap}
            style={styles.floatingButton}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsContainer: {
    position: 'absolute',
    right: 14,
    top: '35%',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  }
});
