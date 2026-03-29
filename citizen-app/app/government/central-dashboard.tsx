import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
  criticalFlag: boolean;
};

type AlertType = {
  _id: string;
  type: string;
  riskScore: number;
};

type NGO = {
  _id: string;
  name: string;
  performanceScore: number;
  totalRescues: number;
};

export default function GovCentralDashboard() {

  const router = useRouter();
  const intervalRef = useRef<any>(null);

  const [activeSOS, setActiveSOS] = useState<SOS[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [ngoRanking, setNgoRanking] = useState<NGO[]>([]);
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

/* ================= LOAD DATA ================= */

  const loadData = async () => {
    try {

      const token = await AsyncStorage.getItem("token");
      const storedName = await AsyncStorage.getItem("name");

      if (!token) {
        router.replace("/login");
        return;
      }

      setName(storedName || "");

      const [sosRes, alertRes, ngoRes] = await Promise.all([
        API.get("/sos/active"),
        API.get("/alerts"),
        API.get("/rescue-analytics/ngo-ranking")
      ]);

      setActiveSOS(Array.isArray(sosRes?.data) ? sosRes.data : []);
      setAlerts(Array.isArray(alertRes?.data) ? alertRes.data : []);
      setNgoRanking(Array.isArray(ngoRes?.data) ? ngoRes.data : []);

    } catch (err: any) {

      if (err?.response?.status === 401) {
        console.log("🚨 Token expired → logout");

        await AsyncStorage.clear();
        router.replace("/login");
        return;
      }

      console.log("Central dashboard error:", err?.message);

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
    Alert.alert("Logout", "Confirm logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {

          if (intervalRef.current) clearInterval(intervalRef.current); // ✅ fix

          await AsyncStorage.clear();

          console.log("LOGOUT DONE");

          router.replace("/login");
        }
      }
    ]);
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

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🏛 National Disaster Control</Text>
          <Text style={styles.subtitle}>Welcome {name}</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ALERTS */}
      <Text style={styles.section}>⚠ Disaster Alerts</Text>

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
      {activeSOS.length > 0 && (
        <>
          <Text style={styles.section}>🛰 National Emergency Map</Text>

          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 22.9734,
              longitude: 78.6569,
              latitudeDelta: 8,
              longitudeDelta: 8
            }}
          >
            {activeSOS.map((sos) => {
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

      {/* SOS */}
      <Text style={styles.section}>🚨 National SOS</Text>

      {activeSOS.length === 0 && (
        <Text style={styles.empty}>No SOS cases</Text>
      )}

      <FlatList
        data={activeSOS}
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
            <Text style={styles.cardSub}>
              City: {item.city}
            </Text>
          </View>
        )}
      />

      {/* NGO */}
      <Text style={styles.section}>🏥 NGO Ranking</Text>

      {ngoRanking.length === 0 && (
        <Text style={styles.empty}>No NGO data</Text>
      )}

      {ngoRanking.map((ngo, index) => (
        <View key={ngo._id} style={styles.card}>
          <Text style={styles.cardTitle}>
            #{index + 1} {ngo.name}
          </Text>
          <Text style={styles.cardSub}>
            Score: {ngo.performanceScore || 0}
          </Text>
          <Text style={styles.cardSub}>
            Rescues: {ngo.totalRescues || 0}
          </Text>
        </View>
      ))}

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

  header: {
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