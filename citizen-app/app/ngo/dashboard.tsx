import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "expo-router";
import { io, Socket } from "socket.io-client";
import * as Location from "expo-location";
import API from "../../services/api";
import NGOMissionMap from "../../components/NGOMissionMap";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function NGODashboard() {
  const router = useRouter();

  const socketRef = useRef<Socket | null>(null);
  const locationSubscription = useRef<any>(null);

  const [sosList, setSOSList] = useState<any[]>([]);
  const [gpsActive, setGpsActive] = useState(true);
  const [memberLocation, setMemberLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [ngoId, setNgoId] = useState("");

  /* ================= LOAD USER ================= */
  useEffect(() => {
    const loadUser = async () => {
      const storedName = await AsyncStorage.getItem("name");
      const storedId = await AsyncStorage.getItem("userId");
      setName(storedName || "");
      setNgoId(storedId || "");
    };
    loadUser();
  }, []);

  /* ================= INIT SOCKET ================= */
  useEffect(() => {
    const origin = API.defaults.baseURL?.replace("/api", "");

    if (!origin) return;

    const socket = io(origin, {
      transports: ["websocket"],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected");
    });

    socket.on("sosUpdated", (updatedSOS) => {
      setSOSList((prev) =>
        prev.map((s) =>
          s._id === updatedSOS._id ? updatedSOS : s
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  /* ================= FETCH SOS ================= */
  const fetchAssigned = async () => {
    try {
      const res = await API.get("/sos/active");
      setSOSList(res.data || []);
    } catch (err) {
      console.log("Fetch SOS error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssigned();
  }, []);

  /* ================= GPS TRACKING ================= */
  useEffect(() => {
    if (!ngoId) return;

    const startTracking = async () => {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setGpsActive(false);
        return;
      }

      locationSubscription.current =
        await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10
          },
          async (pos) => {
            const { latitude, longitude } = pos.coords;

            setMemberLocation({ latitude, longitude });
            setGpsActive(true);

            socketRef.current?.emit("ngoLocationUpdate", {
              ngoId,
              latitude,
              longitude
            });

            await API.patch("/ngo/location", {
              latitude,
              longitude
            });
          }
        );
    };

    startTracking();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [ngoId]);

  /* ================= LOGOUT ================= */
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
              if (locationSubscription.current) {
                locationSubscription.current.remove();
              }

              socketRef.current?.disconnect();

              await AsyncStorage.multiRemove([
                "token",
                "name",
                "userId"
              ]);

              router.replace("/login");
            } catch (error) {
              console.log("Logout error:", error);
            }
          }
        }
      ]
    );
  };

  /* ================= DISTANCE CALC ================= */
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const updateStatus = async (id: string, status: string) => {
    await API.patch(`/sos/${id}/status`, { status });
    fetchAssigned();
  };

  const openMaps = (lat: number, lng: number) => {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    );
  };

  const assigned = sosList.length;
  const inProgress = sosList.filter(
    (s) => s.status === "OnTheWay"
  ).length;
  const completed = sosList.filter(
    (s) => s.status === "Rescued"
  ).length;

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            🏥 {name} Dashboard
          </Text>
          <Text style={{ color: gpsActive ? "#22c55e" : "#ef4444" }}>
            ● {gpsActive ? "Live GPS Active" : "GPS Offline"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.btnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* KPI */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiNumber}>{assigned}</Text>
          <Text style={styles.kpiLabel}>Assigned</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: "#f59e0b" }]}>
          <Text style={styles.kpiNumber}>{inProgress}</Text>
          <Text style={styles.kpiLabel}>On The Way</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: "#16a34a" }]}>
          <Text style={styles.kpiNumber}>{completed}</Text>
          <Text style={styles.kpiLabel}>Completed</Text>
        </View>
      </View>

      {/* MISSIONS */}
      {sosList.map((sos) => {
        let distance = null;
        let eta = null;

        if (memberLocation && sos.latitude && sos.longitude) {
          distance = calculateDistance(
            memberLocation.latitude,
            memberLocation.longitude,
            sos.latitude,
            sos.longitude
          );
          eta = ((Number(distance) / 40) * 60).toFixed(0);
        }

        return (
          <View key={sos._id} style={styles.card}>
            <Text style={styles.cardTitle}>{sos.name}</Text>
            <Text style={styles.status}>{sos.status}</Text>

            <Text style={styles.text}>
              Disaster: {sos.disasterType}
            </Text>
            <Text style={styles.text}>
              City: {sos.city}
            </Text>

            {distance && (
              <View style={styles.metricRow}>
                <Text style={styles.metric}>
                  📍 {distance} km
                </Text>
                <Text style={styles.metric}>
                  ⏱ {eta} mins
                </Text>
              </View>
            )}

            <NGOMissionMap
              memberLocation={memberLocation}
              sos={sos}
            />

            <View style={styles.actionRow}>
              {sos.status === "Assigned" && (
                <TouchableOpacity
                  style={styles.blueBtn}
                  onPress={() =>
                    updateStatus(sos._id, "OnTheWay")
                  }
                >
                  <Text style={styles.btnText}>
                    On The Way
                  </Text>
                </TouchableOpacity>
              )}

              {sos.status === "OnTheWay" && (
                <TouchableOpacity
                  style={styles.greenBtn}
                  onPress={() =>
                    updateStatus(sos._id, "Rescued")
                  }
                >
                  <Text style={styles.btnText}>
                    Rescued
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.blueBtn}
                onPress={() =>
                  openMaps(sos.latitude, sos.longitude)
                }
              >
                <Text style={styles.btnText}>
                  Navigate
                </Text>
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
    alignItems: "center",
    backgroundColor: "#0f172a"
  },
  header: {
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
  logoutBtn: {
    backgroundColor: "#334155",
    padding: 10,
    borderRadius: 8
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: "center"
  },
  kpiNumber: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold"
  },
  kpiLabel: {
    color: "#94a3b8"
  },
  card: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 16,
    marginBottom: 20
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  status: {
    color: "#3b82f6",
    marginBottom: 5
  },
  text: {
    color: "#cbd5e1"
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10
  },
  metric: {
    color: "#fff",
    fontWeight: "600"
  },
  actionRow: {
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