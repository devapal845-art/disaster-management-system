import React from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

interface Props {
  memberLocation: any;
  sos: any;
}

export default function NGOMissionMap({
  memberLocation,
  sos
}: Props) {

  if (!memberLocation || !sos?.latitude || !sos?.longitude) {
    return null;
  }

  const region = {
    latitude: sos.latitude,
    longitude: sos.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region}>

        {/* NGO Marker */}
        <Marker
          coordinate={{
            latitude: memberLocation.latitude,
            longitude: memberLocation.longitude
          }}
          title="You (NGO)"
          pinColor="blue"
        />

        {/* SOS Marker */}
        <Marker
          coordinate={{
            latitude: sos.latitude,
            longitude: sos.longitude
          }}
          title="SOS Location"
          pinColor="red"
        />

        {/* Route Line */}
        <Polyline
          coordinates={[
            {
              latitude: memberLocation.latitude,
              longitude: memberLocation.longitude
            },
            {
              latitude: sos.latitude,
              longitude: sos.longitude
            }
          ]}
          strokeColor="#3b82f6"
          strokeWidth={4}
        />

      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10
  },
  map: {
    flex: 1
  }
});