import { View, Text, StyleSheet } from "react-native";

export default function AdminMap() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🗺 Admin Map not supported on Web</Text>
      <Text style={styles.sub}>Use Android / Expo Go</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { color: "#fff", fontSize: 18 },
  sub: { color: "#94a3b8", marginTop: 10 }
});