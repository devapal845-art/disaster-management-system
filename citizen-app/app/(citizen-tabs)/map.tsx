import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert
} from "react-native";
import MapView, {
  Marker,
  Circle,
  Polyline
} from "react-native-maps";
import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { io } from "socket.io-client";
import API from "../../services/api";

const socket = io("http://10.188.220.170:5000");

export default function AdvancedMap() {
  const [location, setLocation] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sosList, setSosList] = useState<any[]>([]);
  const [ngoLocations, setNgoLocations] = useState<any>({});
  const [riskLevel, setRiskLevel] = useState("LOW");
  const [riskScore, setRiskScore] = useState(0);

  /* ================= START TRACKING ================= */
  useEffect(() => {
    startTracking();
    fetchSOS();

    const sosInterval = setInterval(fetchSOS, 5000);

    return () => clearInterval(sosInterval);
  }, []);

  const fetchSOS = async () => {
    try {
      const res = await API.get("/sos/active");
      setSosList(res.data || []);
    } catch {}
  };

  const startTracking = async () => {
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Location permission required");
      return;
    }

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10
      },
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setLocation({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        });

        try {
          const res = await API.get(
            `/risk?lat=${lat}&lng=${lng}`
          );

          setAlerts(res.data.alerts || []);
          setRiskLevel(res.data.riskLevel);
          setRiskScore(res.data.personalRiskScore);

          if (res.data.riskLevel === "CRITICAL") {
            Alert.alert(
              "🚨 Critical Danger Zone",
              "You are entering a high-risk area!"
            );
          }
        } catch {}
      }
    );
  };

  /* ================= SOCKET NGO TRACKING ================= */
  useEffect(() => {
    socket.on("ngoLocationBroadcast", (data: any) => {
      setNgoLocations((prev: any) => ({
        ...prev,
        [data.ngoId]: {
          latitude: data.latitude,
          longitude: data.longitude
        }
      }));
    });

    return () => {
      socket.off("ngoLocationBroadcast");
    };
  }, []);

  if (!location) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ================= RISK HEADER ================= */}
      <View style={styles.header}>
        <Text style={styles.riskText}>
          Risk: {riskLevel} ({riskScore.toFixed(2)})
        </Text>
      </View>

      <MapView style={{ flex: 1 }} region={location}>
        {/* USER */}
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude
          }}
          title="You"
          pinColor="blue"
        />

        {/* ================= RISK ZONES ================= */}
        {alerts.map((alert) => (
          <Circle
            key={alert._id}
            center={{
              latitude: alert.location.coordinates[1],
              longitude: alert.location.coordinates[0]
            }}
            radius={alert.riskScore * 100}
            strokeColor={
              alert.severity === "Severe"
                ? "red"
                : alert.severity === "High"
                ? "orange"
                : "yellow"
            }
            fillColor="rgba(255,0,0,0.3)"
          />
        ))}

        {/* ================= SOS MARKERS ================= */}
        {sosList.map((sos) => (
          <Marker
            key={sos._id}
            coordinate={{
              latitude: sos.latitude,
              longitude: sos.longitude
            }}
            title="SOS"
            description={`${sos.disasterType} - ${sos.status}`}
            pinColor={sos.criticalFlag ? "red" : "orange"}
          />
        ))}

        {/* ================= NGO + ROUTE ================= */}
        {sosList.map((sos) => {
          const partnerId =
            typeof sos.assignedPartner === "object"
              ? sos.assignedPartner?._id
              : sos.assignedPartner;

          const ngo = ngoLocations[partnerId];

          if (!ngo) return null;

          return (
            <>
              <Marker
                key={`ngo-${sos._id}`}
                coordinate={{
                  latitude: ngo.latitude,
                  longitude: ngo.longitude
                }}
                title="NGO Unit"
                pinColor="green"
              />

              <Polyline
                coordinates={[
                  {
                    latitude: ngo.latitude,
                    longitude: ngo.longitude
                  },
                  {
                    latitude: sos.latitude,
                    longitude: sos.longitude
                  }
                ]}
                strokeColor={
                  sos.criticalFlag ? "red" : "lime"
                }
                strokeWidth={4}
              />
            </>
          );
        })}
      </MapView>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a"
  },
  header: {
    padding: 12,
    backgroundColor: "#0f172a"
  },
  riskText: {
    color: "#fff",
    fontWeight: "bold"
  }
});