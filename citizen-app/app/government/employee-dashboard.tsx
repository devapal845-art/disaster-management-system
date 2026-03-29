import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from "react-native";

import { useEffect, useState, useRef } from "react";
import MapView, { Marker } from "react-native-maps";
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

type AlertType = {
  _id: string;
  type: string;
  riskScore: number;
};

export default function GovEmployeeDashboard() {

  const router = useRouter();
  const intervalRef = useRef<any>(null);

  const [citySOS, setCitySOS] = useState<SOS[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [city, setCity] = useState("");
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

/* ================= LOAD DATA ================= */

  const loadData = async () => {
    try {

      const token = await AsyncStorage.getItem("token");
      const storedCity = await AsyncStorage.getItem("city");
      const storedName = await AsyncStorage.getItem("name");

      if (!token || !storedCity) {
        router.replace("/login");
        return;
      }

      setCity(storedCity);
      setName(storedName || "");

      const [sosRes, alertRes] = await Promise.all([
        API.get(`/sos/city/${storedCity}`),
        API.get(`/alerts/city/${storedCity}`)
      ]);

      setCitySOS(Array.isArray(sosRes?.data) ? sosRes.data : []);
      setAlerts(Array.isArray(alertRes?.data) ? alertRes.data : []);

    } catch (error: any) {

      if (error?.response?.status === 401) {
        console.log("🚨 Token expired");

        await AsyncStorage.clear();
        router.replace("/login");
        return;
      }

      console.log("Employee dashboard error:", error?.message);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

/* ================= EFFECT ================= */

  useEffect(() => {

    loadData();

    intervalRef.current = setInterval(loadData, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

  }, []);

/* ================= REFRESH ================= */

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

/* ================= LOGOUT ================= */

  const logout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          if (intervalRef.current) clearInterval(intervalRef.current); // ✅ FIX
          await AsyncStorage.clear();
          router.replace("/login");
        }
      }
    ]);
  };

/* ================= STATS ================= */

  const totalSOS = citySOS.length;
  const criticalSOS = citySOS.filter((s) => s.criticalFlag).length;
  const activeSOS = citySOS.filter((s) => s.status === "pending").length;

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

      {/* HEADER */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>🏛 District Disaster Office</Text>
          <Text style={styles.subtitle}>{city}</Text>
          <Text style={styles.employee}>Officer: {name}</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* STATS */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalSOS}</Text>
          <Text style={styles.statLabel}>Total SOS</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{criticalSOS}</Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeSOS}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* ALERTS */}
      <Text style={styles.section}>⚠ City Alerts</Text>

      {alerts.length === 0 && (
        <Text style={styles.empty}>No alerts</Text>
      )}

      {alerts.map((alert) => (
        <View key={alert._id} style={styles.alertCard}>
          <Text style={styles.cardTitle}>{alert.type}</Text>
          <Text style={styles.cardSub}>
            Risk Score: {alert.riskScore || 0}
          </Text>
        </View>
      ))}

      {/* MAP */}
      {citySOS.length > 0 && (
        <>
          <Text style={styles.section}>📡 City Emergency Map</Text>

          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 26.8467,
              longitude: 80.9462,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5
            }}
          >
            {citySOS.map((sos) => {
              if (!sos.latitude || !sos.longitude) return null;

              return (
                <Marker
                  key={sos._id}
                  coordinate={{
                    latitude: Number(sos.latitude),
                    longitude: Number(sos.longitude)
                  }}
                  pinColor={sos.criticalFlag ? "red" : "orange"}
                />
              );
            })}
          </MapView>
        </>
      )}

      {/* SOS LIST */}
      <Text style={styles.section}>🚨 City SOS Cases</Text>

      {citySOS.length === 0 && (
        <Text style={styles.empty}>No SOS cases</Text>
      )}

      <FlatList
        data={citySOS}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              item.criticalFlag && styles.cardCritical
            ]}
          >
            <Text style={styles.cardTitle}>
              {item.name} - {item.disasterType}
            </Text>

            <Text style={styles.cardSub}>City: {item.city}</Text>
            <Text style={styles.cardSub}>Status: {item.status}</Text>
          </View>
        )}
      />

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

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold"
  },

  subtitle: {
    color: "#94a3b8"
  },

  employee: {
    color: "#cbd5f5"
  },

  logoutBtn: {
    backgroundColor: "#334155",
    padding: 8,
    borderRadius: 8
  },

  logoutText: {
    color: "#fff"
  },

  section: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },

  statCard: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    width: "30%"
  },

  statNumber: {
    color: "#38bdf8",
    fontSize: 18,
    fontWeight: "bold"
  },

  statLabel: {
    color: "#cbd5e1"
  },

  map: {
    height: 250,
    borderRadius: 12,
    marginBottom: 20
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },

  alertCard: {
    backgroundColor: "#7f1d1d",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },

  cardCritical: {
    borderColor: "red",
    borderWidth: 2
  },

  cardTitle: {
    color: "#fff",
    fontWeight: "bold"
  },

  cardSub: {
    color: "#cbd5e1"
  },

  empty: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20
  }
});