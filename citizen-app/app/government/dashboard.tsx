import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert
} from "react-native";
import { useEffect, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import API from "../../services/api";

export default function GovernmentDashboard() {
  const router = useRouter();

  const [activeSOS, setActiveSOS] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // auto refresh
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const storedName = await AsyncStorage.getItem("name");
      setName(storedName || "");

      const res = await API.get("/sos/active");
      setActiveSOS(res.data || []);
    } catch (error) {
      console.log("Gov Dashboard error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  /* ================= LOGOUT ================= */
  const logout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove([
              "token",
              "name",
              "userId"
            ]);
            router.replace("/login");
          }
        }
      ]
    );
  };

  const criticalCount = activeSOS.filter(
    (s) => s.criticalFlag
  ).length;

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>
            🏛 Government Control Panel
          </Text>
          <Text style={styles.subtitle}>
            Welcome {name}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtnSmall}
          onPress={logout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* KPI */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Active</Text>
          <Text style={styles.kpiValue}>
            {activeSOS.length}
          </Text>
        </View>

        <View style={[styles.kpiCard, styles.criticalCard]}>
          <Text style={styles.kpiLabel}>Critical Cases</Text>
          <Text style={styles.kpiValue}>
            {criticalCount}
          </Text>
        </View>
      </View>

      {/* MAP */}
      <Text style={styles.sectionTitle}>
        📡 Live Emergency Map
      </Text>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 26.8467,
          longitude: 80.9462,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5
        }}
      >
        {activeSOS.map((sos) => (
          <Marker
            key={sos._id}
            coordinate={{
              latitude: sos.latitude,
              longitude: sos.longitude
            }}
            title={sos.disasterType}
            description={`${sos.name} - ${sos.city}`}
            pinColor={sos.criticalFlag ? "red" : "orange"}
          />
        ))}
      </MapView>

      {/* ACTIVE LIST */}
      <Text style={styles.sectionTitle}>
        🚨 Active Incidents
      </Text>

      {activeSOS.length === 0 ? (
        <Text style={styles.emptyText}>
          No Active Emergencies
        </Text>
      ) : (
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
              <Text style={styles.cardSub}>
                Status: {item.status}
              </Text>
            </View>
          )}
        />
      )}
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
    alignItems: "center",
    backgroundColor: "#0f172a"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  logoutBtnSmall: {
    backgroundColor: "#334155",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600"
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },
  kpiCard: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 5
  },
  criticalCard: {
    backgroundColor: "#7f1d1d"
  },
  kpiLabel: {
    color: "#cbd5e1"
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
    color: "#fff"
  },
  sectionTitle: {
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
  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 10
  }
});