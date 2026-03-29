import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import API from "../../services/api";

export default function ProfileScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await API.get("/auth/profile");
      setProfile(res.data);
    } catch (err) {
      console.log("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await API.patch("/auth/profile", profile);

      if (profile?.name) {
        await AsyncStorage.setItem("name", profile.name);
      }

      Alert.alert("Success", "Profile updated successfully");
      setEditing(false);
    } catch (err) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.clear();
    router.replace("/login");
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  /* ================= SAFETY CHECK ================= */
  if (!profile) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: "#fff" }}>No profile found</Text>
      </View>
    );
  }

  /* ================= INITIALS ================= */
  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <ScrollView style={styles.container}>
      {/* ================= AVATAR ================= */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.roleText}>
          {profile.role || "Citizen"}
        </Text>
      </View>

      {/* ================= INFO CARD ================= */}
      <View style={styles.card}>
        <ProfileField
          label="Full Name"
          value={profile.name}
          editable={editing}
          onChange={(text: string) =>
            setProfile({ ...profile, name: text })
          }
        />

        <ProfileField
          label="Email"
          value={profile.email}
          editable={false}
        />

        <ProfileField
          label="City"
          value={profile.city}
          editable={editing}
          onChange={(text: string) =>
            setProfile({ ...profile, city: text })
          }
        />

        <ProfileField
          label="Organization"
          value={profile.organizationName}
          editable={editing}
          onChange={(text: string) =>
            setProfile({
              ...profile,
              organizationName: text
            })
          }
        />

        <ProfileField
          label="Department"
          value={profile.department}
          editable={editing}
          onChange={(text: string) =>
            setProfile({
              ...profile,
              department: text
            })
          }
        />
      </View>

      {/* ================= BUTTONS ================= */}
      {!editing ? (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setEditing(true)}
        >
          <Text style={styles.btnText}>Edit Profile</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.btnText}>
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={logout}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= REUSABLE FIELD ================= */

function ProfileField({
  label,
  value,
  editable,
  onChange
}: {
  label: string;
  value?: string;
  editable: boolean;
  onChange?: (text: string) => void;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[
          styles.input,
          !editable && styles.inputDisabled
        ]}
        value={value || ""}
        editable={editable}
        onChangeText={onChange}
        placeholderTextColor="#64748b"
      />
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 20
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a"
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 25
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold"
  },
  roleText: {
    color: "#94a3b8",
    marginTop: 10
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20
  },
  fieldContainer: {
    marginBottom: 15
  },
  label: {
    color: "#94a3b8",
    marginBottom: 5,
    fontSize: 13
  },
  input: {
    backgroundColor: "#334155",
    padding: 12,
    borderRadius: 8,
    color: "#fff"
  },
  inputDisabled: {
    opacity: 0.6
  },
  editBtn: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15
  },
  saveBtn: {
    backgroundColor: "#22c55e",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15
  },
  logoutBtn: {
    alignItems: "center",
    padding: 10
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold"
  },
  logoutText: {
    color: "#ef4444",
    fontWeight: "bold"
  }
});