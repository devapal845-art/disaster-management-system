import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";

export default function KitScreen() {
  const [intelligence, setIntelligence] = useState<any>(null);
  const [smartKit, setSmartKit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ================= FETCH INTELLIGENCE ================= */
  const fetchIntelligence = useCallback(async () => {
    try {
      setLoading(true);

      let res = await API.get("/preparedness/intelligence");

      // 🔥 AUTO CREATE KIT IF NOT EXISTS
      if (!res.data.smartKit || res.data.smartKit.length === 0) {
        console.log("No smart kit found → Creating kit");

        await API.post("/preparedness/kit");

        // Fetch again after creation
        res = await API.get("/preparedness/intelligence");
      }

      setIntelligence(res.data);
      setSmartKit(res.data.smartKit || []);
    } catch (err: any) {
      console.log("Intelligence error:", err.response?.data || err.message);
      Alert.alert("Error", "Unable to load preparedness kit");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntelligence();
  }, []);

  /* ================= TOGGLE SMART KIT ================= */
  const handleToggle = async (name: string, completed: boolean) => {
    const updated = smartKit.map((item) =>
      item.name === name ? { ...item, completed } : item
    );

    setSmartKit(updated);

    try {
      await API.patch("/preparedness/kit-item", {
        disasterType: intelligence?.primaryDisaster,
        name,
        completed
      });

      fetchIntelligence();
    } catch (err) {
      console.log("Toggle error");
      Alert.alert("Error", "Failed to update item");
    }
  };

  /* ================= PSYCHOLOGICAL ================= */
  const handlePsychological = async (
    question: string,
    completed: boolean
  ) => {
    try {
      await API.patch("/preparedness/psychological", {
        question,
        completed
      });

      fetchIntelligence();
    } catch {
      Alert.alert("Error", "Failed to update psychological readiness");
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* ================= SMART KIT ================= */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          🧰 Smart Preparedness Kit
        </Text>

        {smartKit.length > 0 ? (
          smartKit.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.row}
              onPress={() =>
                handleToggle(item.name, !item.completed)
              }
            >
              <View
                style={[
                  styles.checkbox,
                  item.completed && styles.checkboxActive
                ]}
              />
              <Text style={styles.itemText}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>
            No kit available
          </Text>
        )}
      </View>

      {/* ================= RECOMMENDED KIT ================= */}
      {intelligence?.recommendedKit && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            🔥 Recommended Kit ({intelligence.primaryDisaster || "None"})
          </Text>

          {intelligence.recommendedKit.length > 0 ? (
            intelligence.recommendedKit.map((item: any) => (
              <View key={item._id} style={styles.recommendedItem}>
                <Text style={styles.recommendedTitle}>
                  {item.name}
                </Text>
                {item.description && (
                  <Text style={styles.recommendedDesc}>
                    {item.description}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No recommended kit
            </Text>
          )}
        </View>
      )}

      {/* ================= PSYCHOLOGICAL ================= */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          🧠 Psychological Readiness
        </Text>

        {[
          "Know nearest shelter",
          "Emergency contacts memorized",
          "Family evacuation plan discussed"
        ].map((question) => (
          <TouchableOpacity
            key={question}
            style={styles.row}
            onPress={() =>
              handlePsychological(question, true)
            }
          >
            <View style={styles.checkbox} />
            <Text style={styles.itemText}>
              {question}
            </Text>
          </TouchableOpacity>
        ))}
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
    alignItems: "center",
    backgroundColor: "#0f172a"
  },
  card: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#64748b",
    marginRight: 10
  },
  checkboxActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e"
  },
  itemText: {
    color: "#fff"
  },
  emptyText: {
    color: "#94a3b8"
  },
  recommendedItem: {
    marginBottom: 10
  },
  recommendedTitle: {
    color: "#fff",
    fontWeight: "600"
  },
  recommendedDesc: {
    color: "#94a3b8",
    fontSize: 13
  }
});