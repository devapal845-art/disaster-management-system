import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView
} from "react-native";
import { useEffect, useState } from "react";
import API from "../../services/api";

export default function AlertsScreen() {
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [criticalMember, setCriticalMember] = useState<any>(null);
  const [dismissedMembers, setDismissedMembers] = useState<string[]>([]);
  const [alertHistory, setAlertHistory] = useState<any[]>([]);

  /* ================= FETCH GROUP MEMBERS ================= */
  useEffect(() => {
    fetchGroupMembers();

    const interval = setInterval(fetchGroupMembers, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchGroupMembers = async () => {
    try {
      const res = await API.get("/group/members");
      setGroupMembers(res.data);
    } catch (err) {
      console.log("Failed to fetch group members");
    }
  };

  /* ================= DETECT HIGH RISK ================= */
  useEffect(() => {
    const highRisk = groupMembers.find(
      (m) =>
        m.lastRiskLevel === "High" &&
        !dismissedMembers.includes(m._id)
    );

    if (highRisk) {
      setCriticalMember(highRisk);
    }
  }, [groupMembers, dismissedMembers]);

  /* ================= DISMISS ALERT ================= */
  const dismissAlert = () => {
    if (!criticalMember) return;

    setAlertHistory((prev) => [
      ...prev,
      { ...criticalMember, dismissedAt: new Date() }
    ]);

    setDismissedMembers((prev) => [
      ...prev,
      criticalMember._id
    ]);

    setCriticalMember(null);
  };

  /* ================= RENDER MEMBER ================= */
  const renderMember = ({ item }: any) => {
    const riskColor =
      item.lastRiskLevel === "High"
        ? "#ef4444"
        : item.lastRiskLevel === "Moderate"
        ? "#f59e0b"
        : "#22c55e";

    return (
      <View style={styles.memberCard}>
        <View
          style={[
            styles.riskDot,
            { backgroundColor: riskColor }
          ]}
        />
        <View>
          <Text style={styles.memberName}>
            {item.name}
          </Text>
          <Text style={styles.memberRisk}>
            Risk: {item.lastRiskLevel}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        👨‍👩‍👧‍👦 Group Risk Monitor
      </Text>

      <FlatList
        data={groupMembers}
        keyExtractor={(item) => item._id}
        renderItem={renderMember}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No group members found
          </Text>
        }
      />

      {/* ================= ALERT MODAL ================= */}
      <Modal
        visible={!!criticalMember}
        transparent
        animationType="fade"
      >
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>
              ⚠ FAMILY / SOCIETY ALERT
            </Text>

            <Text style={styles.alertText}>
              <Text style={{ fontWeight: "bold" }}>
                {criticalMember?.name}
              </Text>{" "}
              is in{" "}
              <Text style={{ color: "#ef4444" }}>
                HIGH RISK
              </Text>
            </Text>

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={dismissAlert}
            >
              <Text style={styles.dismissText}>
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= ALERT HISTORY ================= */}
      {alertHistory.length > 0 && (
        <ScrollView style={styles.historyBox}>
          <Text style={styles.historyTitle}>
            📜 Alert History
          </Text>

          {alertHistory.map((a) => (
            <Text key={a._id} style={styles.historyItem}>
              {a.name} dismissed at{" "}
              {new Date(a.dismissedAt).toLocaleTimeString()}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 15
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15
  },
  memberCard: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center"
  },
  riskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10
  },
  memberName: {
    color: "#fff",
    fontWeight: "bold"
  },
  memberRisk: {
    color: "#94a3b8",
    fontSize: 13
  },
  emptyText: {
    color: "#94a3b8"
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center"
  },
  alertBox: {
    backgroundColor: "#7f1d1d",
    padding: 25,
    borderRadius: 15,
    width: "85%",
    alignItems: "center"
  },
  alertTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 10
  },
  alertText: {
    color: "#fff",
    textAlign: "center"
  },
  dismissBtn: {
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  dismissText: {
    color: "#fff",
    fontWeight: "bold"
  },
  historyBox: {
    marginTop: 20,
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 12
  },
  historyTitle: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 10
  },
  historyItem: {
    color: "#94a3b8",
    marginBottom: 5
  }
});