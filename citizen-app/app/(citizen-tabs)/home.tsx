import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";

export default function HomeScreen() {
  const router = useRouter();

  const [intelligence, setIntelligence] = useState<any>(null);
  const [mySOS, setMySOS] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [intelRes, sosRes] = await Promise.all([
        API.get("/preparedness/intelligence"),
        API.get("/sos/active")
      ]);

      setIntelligence(intelRes.data);
      setMySOS(sosRes.data || []);
    } catch (err) {
      console.log("Home fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     PANIC BUTTON
  ========================== */
  const handlePanic = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      await API.post("/sos", {
        disasterType: "Emergency",
        city: "Auto Location",
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        message: "Panic button triggered"
      });

      Alert.alert("SOS Sent", "Emergency request created successfully.");
      fetchAll();
    } catch (error) {
      console.log("Panic error:", error);
      Alert.alert("Error", "Failed to create SOS.");
    }
  };

  /* =========================
     LOGOUT FUNCTION
  ========================== */
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("token");
              router.replace("/login"); // change if your login route is different
            } catch (error) {
              console.log("Logout error:", error);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = () => {
    if (!intelligence) return "#22c55e";
    if (intelligence.status === "Safe") return "#22c55e";
    if (intelligence.status === "Moderate") return "#f59e0b";
    return "#ef4444";
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <LinearGradient colors={["#0f172a", "#1e3a8a"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* ===== TOP BAR ===== */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* ===== INTELLIGENCE SUMMARY ===== */}
        {intelligence && (
          <View style={styles.bigCard}>
            <AnimatedCircularProgress
              size={150}
              width={12}
              fill={intelligence.eri}
              tintColor={getStatusColor()}
              backgroundColor="#1f2937"
            >
              {() => (
                <Text style={styles.eriText}>
                  {intelligence.eri}
                </Text>
              )}
            </AnimatedCircularProgress>

            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {intelligence.status}
            </Text>
          </View>
        )}

        {/* ===== QUICK ACTIONS ===== */}
        <TouchableOpacity style={styles.panicBtn} onPress={handlePanic}>
          <Text style={styles.btnText}>🚨 Panic SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push("/citizen/sos")}
        >
          <Text style={styles.btnText}>➕ Create SOS</Text>
        </TouchableOpacity>

        {/* ===== MY SOS LIST ===== */}
        <Text style={styles.sectionTitle}>My Active SOS</Text>

        <FlatList
          data={mySOS}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.sosCard}
              onPress={() =>
                router.push(`/citizen/track?id=${item._id}`)
              }
            >
              <Text style={styles.sosTitle}>
                {item.disasterType}
              </Text>
              <Text style={styles.sosStatus}>
                Status: {item.status}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No Active SOS
            </Text>
          }
          scrollEnabled={false}
        />
      </ScrollView>
    </LinearGradient>
  );
}

/* =========================
   STYLES
========================== */

const styles = StyleSheet.create({
  container: {
    padding: 20
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a"
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 15
  },
  logoutBtn: {
    backgroundColor: "#334155",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600"
  },
  bigCard: {
    backgroundColor: "#1e293b",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 25
  },
  eriText: {
    fontSize: 35,
    color: "#fff",
    fontWeight: "bold"
  },
  statusText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600"
  },
  panicBtn: {
    backgroundColor: "#ef4444",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10
  },
  createBtn: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold"
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10
  },
  sosCard: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },
  sosTitle: {
    color: "#fff",
    fontWeight: "bold"
  },
  sosStatus: {
    color: "#cbd5e1"
  },
  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20
  }
});