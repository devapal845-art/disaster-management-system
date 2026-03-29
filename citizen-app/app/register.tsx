import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import API from "../services/api";

export default function Register() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    location: "",
    organizationName: "",
    phone: "",
    department: "",
    city: "",
    familyGroupId: "",
    societyGroupId: ""
  });

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const selectRole = (role: string) => {
    setSelectedRole(role);
    setForm({ ...form, role });
    setStep(2);
  };

  const validateForm = () => {
    if (!form.name || !form.email || !form.password) {
      return "Please fill all required fields";
    }

    if (selectedRole === "Citizen" && !form.location) {
      return "Location is required";
    }

    if (selectedRole === "NGO" &&
        (!form.organizationName || !form.phone || !form.city)) {
      return "All NGO fields are required";
    }

    if (selectedRole === "Government" &&
        (!form.department || !form.city)) {
      return "Department and City required";
    }

    return null;
  };

  const handleRegister = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert("Error", error);
      return;
    }

    try {
      setLoading(true);
      await API.post("/auth/register", form);

      Alert.alert("Success", "Registration Successful ✅");
      router.replace("/login");

    } catch (err: any) {
      Alert.alert(
        "Registration Failed",
        err.response?.data?.message || "Server not reachable"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0f172a", "#1e3a8a"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.card}>

          {/* STEP 1 — ROLE SELECTION */}
          {step === 1 && (
            <>
              <Text style={styles.title}>Choose Your Role</Text>

              <TouchableOpacity
                style={styles.roleCard}
                onPress={() => selectRole("Citizen")}
              >
                <Text style={styles.roleTitle}>👤 Citizen</Text>
                <Text style={styles.roleDesc}>
                  Receive alerts, create SOS & track family safety
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roleCard}
                onPress={() => selectRole("NGO")}
              >
                <Text style={styles.roleTitle}>🚑 NGO</Text>
                <Text style={styles.roleDesc}>
                  Respond to rescue requests & manage operations
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roleCard}
                onPress={() => selectRole("Government")}
              >
                <Text style={styles.roleTitle}>🏛 Government</Text>
                <Text style={styles.roleDesc}>
                  Monitor analytics & coordinate disaster response
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 2 — DETAILS FORM */}
          {step === 2 && (
            <>
              <Text style={styles.title}>
                Register as {selectedRole}
              </Text>

              <TextInput
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                onChangeText={(v) => handleChange("name", v)}
              />

              <TextInput
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                onChangeText={(v) => handleChange("email", v)}
              />

              <TextInput
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                style={styles.input}
                onChangeText={(v) => handleChange("password", v)}
              />

              {/* ROLE SPECIFIC */}
              {selectedRole === "Citizen" && (
                <>
                  <TextInput
                    placeholder="Location"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    onChangeText={(v) => handleChange("location", v)}
                  />

                  <TextInput
                    placeholder="Family Group ID (Optional)"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    onChangeText={(v) =>
                      handleChange("familyGroupId", v)
                    }
                  />

                  <TextInput
                    placeholder="Society Group ID (Optional)"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    onChangeText={(v) =>
                      handleChange("societyGroupId", v)
                    }
                  />
                </>
              )}

              {selectedRole === "NGO" && (
                <>
                  <TextInput
                    placeholder="Organization Name"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    onChangeText={(v) =>
                      handleChange("organizationName", v)
                    }
                  />
                  <TextInput
                    placeholder="Phone"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    style={styles.input}
                    onChangeText={(v) =>
                      handleChange("phone", v)
                    }
                  />
                  <TextInput
                    placeholder="Operating City"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    onChangeText={(v) =>
                      handleChange("city", v)
                    }
                  />
                </>
              )}

              {selectedRole === "Government" && (
                <>
                  <TextInput
                    placeholder="Department"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    onChangeText={(v) =>
                      handleChange("department", v)
                    }
                  />
                  <TextInput
                    placeholder="City"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    onChangeText={(v) =>
                      handleChange("city", v)
                    }
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.button}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep(1)}>
                <Text style={styles.backLink}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.link}>
              Already have an account? Login
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </LinearGradient>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },

  card: {
    backgroundColor: "#1e293bcc",
    padding: 25,
    borderRadius: 20,
    marginTop: 40
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
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
    backgroundColor: "#16a34a",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },

  link: {
    color: "#38bdf8",
    textAlign: "center",
    marginTop: 15
  },

  backLink: {
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 10
  },

  roleCard: {
    backgroundColor: "#334155",
    padding: 18,
    borderRadius: 12,
    marginBottom: 15
  },

  roleTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold"
  },

  roleDesc: {
    color: "#cbd5e1",
    marginTop: 5
  }
});