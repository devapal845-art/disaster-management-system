import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useEffect, useState, useRef } from "react";
import { useLocalSearchParams } from "expo-router";
import API from "../../services/api";

export default function Track() {
  const { id } = useLocalSearchParams();
  const [sos, setSos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchSOS();
    const interval = setInterval(fetchSOS, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSOS = async () => {
    try {
      const res = await API.get(`/sos/${id}`);
      setSos(res.data);
    } catch (err) {
      console.log("Tracking error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= DISTANCE CALCULATION ================= */
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!sos) return null;

  const ngoLocation = sos.assignedPartner?.currentLocation;

  let distance = 0;
  let eta = 0;

  if (ngoLocation) {
    distance = calculateDistance(
      sos.latitude,
      sos.longitude,
      ngoLocation.latitude,
      ngoLocation.longitude
    );

    const avgSpeed = 40; // km/h assumed
    eta = (distance / avgSpeed) * 60; // minutes
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        region={{
          latitude: sos.latitude,
          longitude: sos.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }}
      >
        {/* Citizen Marker */}
        <Marker
          coordinate={{
            latitude: sos.latitude,
            longitude: sos.longitude
          }}
          title="You"
        />

        {/* NGO Marker */}
        {ngoLocation && (
          <>
            <Marker
              coordinate={{
                latitude: ngoLocation.latitude,
                longitude: ngoLocation.longitude
              }}
              title="NGO"
              pinColor="blue"
            />

            <Polyline
              coordinates={[
                {
                  latitude: sos.latitude,
                  longitude: sos.longitude
                },
                {
                  latitude: ngoLocation.latitude,
                  longitude: ngoLocation.longitude
                }
              ]}
              strokeWidth={4}
              strokeColor="red"
            />
          </>
        )}
      </MapView>

      {/* INFO OVERLAY */}
      {ngoLocation && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Distance: {distance.toFixed(2)} km
          </Text>
          <Text style={styles.infoText}>
            ETA: {eta.toFixed(0)} min
          </Text>
        </View>
      )}
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  infoBox: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#1e293bcc",
    padding: 15,
    borderRadius: 12
  },
  infoText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 5
  }
});