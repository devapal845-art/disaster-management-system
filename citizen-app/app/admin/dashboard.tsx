import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from "react-native";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";

export default function AdminDashboard() {

  const router = useRouter();
  const intervalRef = useRef<any>(null);

  const [analytics, setAnalytics] = useState<any>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

/* ================= FETCH DATA ================= */

  const fetchData = async () => {
    try {

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const [res, sos] = await Promise.all([
        API.get("/rescue-analytics"),
        API.get("/sos/active")
      ]);

      setAnalytics(res?.data || {});
      setActiveCount(Array.isArray(sos?.data) ? sos.data.length : 0);

    } catch (err: any) {

      if (err?.response?.status === 401) {
        console.log("🚨 Admin → Token expired");

        await AsyncStorage.clear();
        router.replace("/login");
        return;
      }

      console.log("Admin fetch error", err?.message);

    } finally {
      setLoading(false);
    }
  };

/* ================= EFFECT ================= */

  useEffect(() => {

    fetchData();

    intervalRef.current = setInterval(fetchData, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

  }, []);

/* ================= LOGOUT ================= */

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {

          if (intervalRef.current) clearInterval(intervalRef.current); // ✅ fix

          await AsyncStorage.clear(); // ✅ clear all

          router.replace("/login");
        }
      }
    ]);
  };

/* ================= LOADING ================= */

  if (loading || !analytics) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

/* ================= UI ================= */

  return (
    <ScrollView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🛰 Disaster Control Center</Text>
          <Text style={styles.subtitle}>
            System Operational • Active: {activeCount}
          </Text>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* KPI */}
      <View style={styles.grid}>

        <View style={[styles.card, styles.primary]}>
          <Text style={styles.cardLabel}>Total SOS</Text>
          <Text style={styles.cardValue}>
            {analytics.totalSOS || 0}
          </Text>
        </View>

        <View style={[styles.card, styles.warning]}>
          <Text style={styles.cardLabel}>Pending</Text>
          <Text style={styles.cardValue}>
            {analytics.pendingCount || 0}
          </Text>
        </View>

        <View style={[styles.card, styles.success]}>
          <Text style={styles.cardLabel}>Rescued</Text>
          <Text style={styles.cardValue}>
            {analytics.rescuedCount || 0}
          </Text>
        </View>

        <View style={[styles.card, styles.danger]}>
          <Text style={styles.cardLabel}>Avg Assign (min)</Text>
          <Text style={styles.cardValue}>
            {analytics.averageAssignmentTimeMinutes || 0}
          </Text>
        </View>

      </View>

      {/* NAVIGATION */}
      <View style={styles.menu}>

        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => router.push("/admin/sos")}
        >
          <Text style={styles.menuText}>🚨 Manage SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => router.push("/admin/map")}
        >
          <Text style={styles.menuText}>🗺 Live Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => router.push("/admin/analytics")}
        >
          <Text style={styles.menuText}>📊 Analytics</Text>
        </TouchableOpacity>

      </View>

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
    marginBottom: 25,
    flexDirection: "row",
    justifyContent: "space-between"
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
    padding: 10,
    borderRadius: 10
  },

  logoutText: {
    color: "#fff"
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },

  card: {
    width: "48%",
    padding: 18,
    borderRadius: 16,
    marginBottom: 15
  },

  cardLabel: {
    color: "#cbd5e1"
  },

  cardValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold"
  },

  primary: { backgroundColor: "#1e40af" },
  warning: { backgroundColor: "#f59e0b" },
  success: { backgroundColor: "#16a34a" },
  danger: { backgroundColor: "#dc2626" },

  menu: {
    marginTop: 10
  },

  menuBtn: {
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10
  },

  menuText: {
    color: "#fff"
  }
});