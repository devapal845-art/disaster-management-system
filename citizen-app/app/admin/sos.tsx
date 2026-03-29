import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from "react-native";
import { useEffect, useState } from "react";
import API from "../../services/api";

export default function AdminSOS() {
  const [sosList, setSosList] = useState<any[]>([]);

  useEffect(() => {
    fetchSOS();
    const interval = setInterval(fetchSOS, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchSOS = async () => {
    const res = await API.get("/sos/active");
    setSosList(res.data);
  };

  const markRescued = async (id: string) => {
    await API.patch(`/sos/${id}/status`, { status: "Rescued" });
    fetchSOS();
  };

  return (
    <ScrollView style={styles.container}>
      {sosList.map((sos) => (
        <View
          key={sos._id}
          style={[
            styles.card,
            { backgroundColor: sos.criticalFlag ? "#7f1d1d" : "#1e293b" }
          ]}
        >
          <Text style={styles.name}>{sos.name}</Text>

          <Text style={styles.detail}>
            {sos.disasterType} • {sos.city}
          </Text>

          <Text style={styles.detail}>
            NGO: {sos.assignedPartner?.name || "Not Assigned"}
          </Text>

          <Text style={styles.status}>Status: {sos.status}</Text>

          {sos.status !== "Rescued" && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => markRescued(sos._id)}
            >
              <Text style={styles.buttonText}>Mark Rescued</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 15 },
  card: { padding: 15, borderRadius: 12, marginBottom: 15 },
  name: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  detail: { color: "#94a3b8", marginTop: 4 },
  status: { color: "#facc15", marginTop: 6 },
  button: {
    marginTop: 10,
    backgroundColor: "#16a34a",
    padding: 8,
    borderRadius: 8
  },
  buttonText: { color: "#fff", textAlign: "center" }
});