import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import API from "../../services/api";

export default function CreateSOS() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [disasterType, setDisasterType] = useState("Flood");
  const [critical, setCritical] = useState(false);
  const [loading, setLoading] = useState(false);

  const submitSOS = async () => {
    if (!message) {
      Alert.alert("Please enter a message");
      return;
    }

    try {
      setLoading(true);

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Location permission denied");
        return;
      }

      const location =
        await Location.getCurrentPositionAsync({});

      await API.post("/sos", {
        message,
        disasterType,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        criticalFlag: critical
      });

      Alert.alert("SOS Sent Successfully 🚨");
      router.replace("./(citizen-tabs)/home");

    } catch (err) {
      Alert.alert("Error sending SOS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0f172a", "#1e3a8a"]}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>

        <Text style={styles.title}>🚨 Create SOS</Text>

        {/* DISASTER TYPE DROPDOWN */}
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={disasterType}
            onValueChange={(itemValue) =>
              setDisasterType(itemValue)
            }
            dropdownIconColor="#fff"
            style={{ color: "#fff" }}
          >
            <Picker.Item label="Flood" value="Flood" />
            <Picker.Item label="Earthquake" value="Earthquake" />
            <Picker.Item label="Fire" value="Fire" />
            <Picker.Item label="Cyclone" value="Cyclone" />
            <Picker.Item label="Medical Emergency" value="Medical" />
          </Picker>
        </View>

        {/* MESSAGE */}
        <TextInput
          placeholder="Describe your situation..."
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          multiline
        />

        {/* CRITICAL SWITCH */}
        <View style={styles.switchRow}>
          <Text style={{ color: "#fff", fontSize: 16 }}>
            Mark as Critical
          </Text>
          <Switch
            value={critical}
            onValueChange={setCritical}
            trackColor={{ false: "#64748b", true: "#ef4444" }}
          />
        </View>

        {/* BUTTON */}
        <TouchableOpacity
          style={styles.button}
          onPress={submitSOS}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              Send SOS
            </Text>
          )}
        </TouchableOpacity>

      </View>
    </LinearGradient>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20
  },

  pickerContainer: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    marginBottom: 15
  },

  input: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    color: "#fff",
    minHeight: 80,
    textAlignVertical: "top"
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },

  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center"
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  }
});