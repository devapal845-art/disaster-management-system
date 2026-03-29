import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl
} from "react-native";

import { useEffect, useState } from "react";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import API from "../../services/api";

/* ================= TYPES ================= */

type SOS = {
  _id: string;
  name: string;
  city: string;
  disasterType: string;
  latitude: number;
  longitude: number;
  status: string;
  criticalFlag: boolean;
};

export default function NGOUserDashboard() {

  const router = useRouter();

  const [sosList, setSOSList] = useState<SOS[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");

/* ================= INIT + GPS ================= */

  useEffect(() => {
    let locationSub: any;

    const init = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
          router.replace("/login");
          return;
        }

        const storedName = await AsyncStorage.getItem("name");
        setName(storedName || "");

        await fetchSOS();

        /* ===== GPS ===== */

        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          console.log("GPS permission denied");
          return;
        }

        locationSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10
          },
          (pos) => {
            setLocation({
              latitude: Number(pos.coords.latitude),
              longitude: Number(pos.coords.longitude)
            });
          }
        );

      } catch (err) {
        console.log("Init error:", err);
      }
    };

    init();

    return () => {
      if (locationSub) {
        locationSub.remove(); // ✅ cleanup fix
      }
    };

  }, []);

/* ================= FETCH SOS ================= */

  const fetchSOS = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await API.get("/sos/active");

      setSOSList(Array.isArray(res?.data) ? res.data : []);

    } catch (err: any) {

      if (err?.response?.status === 401) {
        console.log("🚨 Token expired");

        await AsyncStorage.clear();
        router.replace("/login");
        return;
      }

      console.log("SOS fetch error:", err?.message);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

/* ================= REFRESH ================= */

  const onRefresh = () => {
    setRefreshing(true);
    fetchSOS();
  };

/* ================= DISTANCE ================= */

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return (R * c).toFixed(2);
  };

/* ================= UPDATE STATUS ================= */

  const updateStatus = async (id: string, status: string) => {
    try {

      await API.patch(`/sos/${id}/status`, { status });

      // ✅ Optimistic UI update
      setSOSList(prev =>
        prev.map(s =>
          s._id === id ? { ...s, status } : s
        )
      );

    } catch (err: any) {

      if (err?.response?.status === 401) {
        await AsyncStorage.clear();
        router.replace("/login");
        return;
      }

      console.log("Status update error:", err?.message);
    }
  };

/* ================= NAVIGATION ================= */

  const openMaps = (lat: number, lng: number) => {

    if (!lat || !lng) {
      console.log("Invalid coordinates");
      return;
    }

    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    );
  };

/* ================= LOADING ================= */

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

/* ================= UI ================= */

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >

      <Text style={styles.title}>
        🏥 {name} Rescue Dashboard
      </Text>

      {sosList.length === 0 && (
        <Text style={styles.empty}>
          No SOS requests available
        </Text>
      )}

      {sosList.map((sos) => {

        let distance = null;

        if (location && sos.latitude && sos.longitude) {
          distance = calculateDistance(
            location.latitude,
            location.longitude,
            Number(sos.latitude),
            Number(sos.longitude)
          );
        }

        return (
          <View
            key={sos._id}
            style={[
              styles.card,
              sos.criticalFlag && styles.criticalCard
            ]}
          >

            <Text style={styles.cardTitle}>{sos.name}</Text>

            <Text style={styles.text}>
              Disaster: {sos.disasterType}
            </Text>

            <Text style={styles.text}>
              City: {sos.city}
            </Text>

            <Text style={styles.text}>
              Status: {sos.status}
            </Text>

            {distance && (
              <Text style={styles.text}>
                Distance: {distance} km
              </Text>
            )}

            <View style={styles.row}>

              {sos.status === "Assigned" && (
                <TouchableOpacity
                  style={styles.blueBtn}
                  onPress={() => updateStatus(sos._id, "OnTheWay")}
                >
                  <Text style={styles.btnText}>Start</Text>
                </TouchableOpacity>
              )}

              {sos.status === "OnTheWay" && (
                <TouchableOpacity
                  style={styles.greenBtn}
                  onPress={() => updateStatus(sos._id, "Rescued")}
                >
                  <Text style={styles.btnText}>Rescued</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.blueBtn}
                onPress={() => openMaps(sos.latitude, sos.longitude)}
              >
                <Text style={styles.btnText}>Navigate</Text>
              </TouchableOpacity>

            </View>

          </View>
        );
      })}

    </ScrollView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 15
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20
  },

  empty: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15
  },

  criticalCard: {
    borderColor: "red",
    borderWidth: 2
  },

  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },

  text: {
    color: "#cbd5e1",
    marginTop: 3
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10
  },

  blueBtn: {
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 8
  },

  greenBtn: {
    backgroundColor: "#16a34a",
    padding: 10,
    borderRadius: 8
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold"
  }
});