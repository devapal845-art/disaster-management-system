import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import API from "../services/api";

export default function Login() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const loginUser = async () => {

    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/login", {
        email,
        password
      });

      const { token, user } = res.data;

      /* ================= SAVE DATA ================= */
      await AsyncStorage.multiSet([
        ["token", token],
        ["role", user.role],
        ["name", user.name],
        ["userId", user.id || ""],
        ["city", user.city || ""]
      ]);

      console.log("✅ TOKEN SAVED");

      /* ================= ENSURE STORAGE SYNC ================= */
      const savedToken = await AsyncStorage.getItem("token");

      if (!savedToken) {
        Alert.alert("Error", "Token not saved properly");
        return;
      }

      /* ================= NAVIGATION ================= */

      const role = user.role?.toUpperCase();

      if (role === "CITIZEN") {
        router.replace("/(citizen-tabs)/home");
      }

      else if (role === "NGO_ADMIN") {
        router.replace("/ngo/ngo-center-dashboard");
      }

      else if (role === "NGO_USER") {
        router.replace("/ngo/ngo-user-dashboard");
      }

      else if (role === "GOV_ADMIN") {
        router.replace("/government/central-dashboard");
      }

      else if (role === "GOV_EMPLOYEE") {
        router.replace("/government/employee-dashboard");
      }

      else if (role === "ADMIN") {
        router.replace("/admin/dashboard");
      }

      else {
        Alert.alert("Error", "Invalid role");
      }

    } catch (err: any) {

      Alert.alert(
        "Login Failed",
        err?.response?.data?.message || "Server not reachable"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0f172a", "#1e3a8a"]}
      style={styles.container}
    >

      <View style={styles.card}>

        <Text style={styles.title}>🔐 Disaster Intelligence</Text>
        <Text style={styles.subtitle}>Secure Access Portal</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={loginUser}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={styles.link}>Create Account</Text>
        </TouchableOpacity>

      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20
  },

  card: {
    backgroundColor: "#1e293bcc",
    padding: 25,
    borderRadius: 20
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
    textAlign: "center"
  },

  subtitle: {
    color: "#cbd5e1",
    marginBottom: 25,
    textAlign: "center"
  },

  input: {
    backgroundColor: "#334155",
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
    color: "#fff"
  },

  button: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },

  link: {
    color: "#38bdf8",
    textAlign: "center"
  }

});