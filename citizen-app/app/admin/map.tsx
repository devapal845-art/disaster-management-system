import {
  View,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import API from "../../services/api";

const socket = io("http://10.188.220.170:5000");

export default function AdminMap() {
  const mapRef = useRef<MapView>(null);

  const [sosList, setSosList] = useState<any[]>([]);
  const [ngoLocations, setNgoLocations] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSOS();

    socket.on("ngoLocationBroadcast", (data) => {
      setNgoLocations((prev: any) => ({
        ...prev,
        [data.ngoId]: {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude)
        }
      }));
    });

    return () => {
      socket.off("ngoLocationBroadcast");
    };
  }, []);

  const fetchSOS = async () => {
    try {
      const res = await API.get("/sos/active");
      setSosList(res.data || []);
    } catch {
      console.log("Failed to fetch SOS");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={{
        latitude: 28.6139,
        longitude: 77.2090,
        latitudeDelta: 2,
        longitudeDelta: 2
      }}
    >
      {sosList.map((sos) => (
        <Marker
          key={sos._id}
          coordinate={{
            latitude: Number(sos.latitude),
            longitude: Number(sos.longitude)
          }}
          pinColor={sos.criticalFlag ? "red" : "orange"}
        />
      ))}

      {sosList.map((sos) => {
        const ngo = ngoLocations[sos.assignedPartner?._id];
        if (!ngo) return null;

        return (
          <Polyline
            key={sos._id}
            coordinates={[
              ngo,
              {
                latitude: Number(sos.latitude),
                longitude: Number(sos.longitude)
              }
            ]}
            strokeColor={sos.criticalFlag ? "red" : "lime"}
            strokeWidth={4}
          />
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" }
});