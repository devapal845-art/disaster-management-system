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
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker } from "react-native-maps";
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

type Member = {
  _id: string;
  name: string;
  availability: string;
  totalRescues: number;
};

type Analytics = {
  totalMissions: number;
  activeMissions: number;
  completed: number;
};

export default function NGOCenterDashboard() {

  const router = useRouter();
  const intervalRef = useRef<any>(null);

  const [sosList, setSOSList] = useState<SOS[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

/* ================= LOAD DATA ================= */

  const loadData = async () => {
    try {

      const token = await AsyncStorage.getItem("token");
      const ngoId = await AsyncStorage.getItem("userId");
      const storedName = await AsyncStorage.getItem("name");

      if (!token || !ngoId) {
        router.replace("/login");
        return;
      }

      setName(storedName || "");

      const [sosRes, memberRes, analyticsRes] = await Promise.all([
        API.get(`/sos/ngo/${ngoId}`),
        API.get(`/ngo/${ngoId}/members`),
        API.get(`/ngo/${ngoId}/analytics`)
      ]);

      setSOSList(Array.isArray(sosRes?.data) ? sosRes.data : []);
      setMembers(Array.isArray(memberRes?.data) ? memberRes.data : []);
      setAnalytics(analyticsRes?.data || null);

    } catch (err: any) {

      if (err?.response?.status === 401) {
        console.log("🚨 NGO → Token expired");

        await AsyncStorage.clear();
        router.replace("/login");
        return;
      }

      console.log("NGO Dashboard Error:", err?.message);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

/* ================= EFFECT ================= */

  useEffect(() => {

    loadData();

    intervalRef.current = setInterval(loadData, 15000);

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
          if (intervalRef.current) clearInterval(intervalRef.current); // ✅ FIX
          await AsyncStorage.clear();
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
          <Text style={styles.title}>🏢 NGO Command Center</Text>
          <Text style={styles.subtitle}>{name}</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* KPI */}
      {analytics && (
        <View style={styles.kpiRow}>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>
              {analytics.totalMissions || 0}
            </Text>
            <Text style={styles.kpiLabel}>Total Missions</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>
              {analytics.activeMissions || 0}
            </Text>
            <Text style={styles.kpiLabel}>Active</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiNumber}>
              {analytics.completed || 0}
            </Text>
            <Text style={styles.kpiLabel}>Completed</Text>
          </View>

        </View>
      )}

      {/* MAP */}
      {sosList.length > 0 && (
        <>
          <Text style={styles.section}>🛰 Mission Map</Text>

          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 22.9734,
              longitude: 78.6569,
              latitudeDelta: 6,
              longitudeDelta: 6
            }}
          >
            {sosList.map((sos) => {
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
      <Text style={styles.section}>🚨 SOS Missions</Text>

      {sosList.length === 0 && (
        <Text style={styles.empty}>No SOS missions</Text>
      )}

      <FlatList
        data={sosList}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              item.criticalFlag && styles.cardCritical
            ]}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>City: {item.city}</Text>
            <Text style={styles.cardSub}>Disaster: {item.disasterType}</Text>
            <Text style={styles.cardSub}>Status: {item.status}</Text>
          </View>
        )}
      />

      {/* TEAM */}
      <Text style={styles.section}>👨‍🚒 Rescue Team</Text>

      {members.length === 0 && (
        <Text style={styles.empty}>No members found</Text>
      )}

      {members.map((member) => (
        <View key={member._id} style={styles.card}>
          <Text style={styles.cardTitle}>{member.name}</Text>
          <Text style={styles.cardSub}>
            Status: {member.availability}
          </Text>
          <Text style={styles.cardSub}>
            Total Rescues: {member.totalRescues || 0}
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

  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },

  kpiCard: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    width: "30%"
  },

  kpiNumber: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold"
  },

  kpiLabel: {
    color: "#cbd5e1"
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

  empty: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20
  }
});