import {
MapContainer,
TileLayer,
Marker,
Popup,
Polyline
} from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import React from "react";
import socket from "../services/socket";
import "leaflet/dist/leaflet.css";


/* ================= ICONS ================= */
const sosIcon = L.icon({
iconUrl: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
iconSize: [35, 35]
});

const criticalIcon = L.icon({
iconUrl: "https://cdn-icons-png.flaticon.com/512/1828/1828843.png",
iconSize: [40, 40]
});

const ngoIcon = L.icon({
iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
iconSize: [32, 32]
});

const SOSMap = ({ sosList }) => {
const [ngoLocations, setNgoLocations] = useState({});
const [animatedResponders, setAnimatedResponders] = useState({});

/* ================= VALIDATION ================= */
const isValidCoord = (lat, lng) =>
typeof lat === "number" &&
typeof lng === "number" &&
!isNaN(lat) &&
!isNaN(lng);

/* ================= ETA CALC ================= */
const calculateETA = (responder, sos) => {
  if (
    !responder ||
    !sos ||
    !responder.latitude ||
    !responder.longitude ||
    !sos.latitude ||
    !sos.longitude
  ) return null;

  const R = 6371; // Earth radius in km

  const dLat = (sos.latitude - responder.latitude) * Math.PI / 180;
  const dLng = (sos.longitude - responder.longitude) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(responder.latitude * Math.PI / 180) *
    Math.cos(sos.latitude * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;

  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // 🚗 Assume avg speed = 40 km/h
  const eta = (distance / 40) * 60;

  return {
    distance: distance.toFixed(2),
    eta: Math.max(1, eta.toFixed(1)) // never show 0 min
  };
};

/* ================= SOCKET ================= */
useEffect(() => {
  socket.on("responderLocationBroadcast", (data) => {
    if (!data?.userId) return;
    if (!isValidCoord(data.latitude, data.longitude)) return;

    const id = data.userId.toString();

    setAnimatedResponders((prev) => {
      const prevLoc = prev[id];

      return {
        ...prev,
        [id]: prevLoc
          ? {
              latitude:
                prevLoc.latitude +
                (data.latitude - prevLoc.latitude) * 0.2,
              longitude:
                prevLoc.longitude +
                (data.longitude - prevLoc.longitude) * 0.2
            }
          : {
              latitude: data.latitude,
              longitude: data.longitude
            }
      };
    });

    // ✅ ADD HERE (CORRECT PLACE)
    setNgoLocations((prev) => ({
      ...prev,
      [id]: {
        latitude: data.latitude,
        longitude: data.longitude
      }
    }));
  });

  return () => {
    socket.off("responderLocationBroadcast");
  };
}, []);

/* ================= EMPTY ================= */
if (!sosList || sosList.length === 0) {
return <div style={{ height: "500px" }}>No Active SOS</div>;
}

/* ================= CENTER ================= */
const firstValidSOS = sosList.find((s) =>
isValidCoord(s.latitude, s.longitude)
);

const center = firstValidSOS
? [firstValidSOS.latitude, firstValidSOS.longitude]
: [28.6139, 77.2090];

return (
<MapContainer
center={center}
zoom={10}
style={{ height: "500px", width: "100%" }}
> <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />


  {/* ================= SOS ================= */}
  {sosList.map((sos) => {
    if (!isValidCoord(sos.latitude, sos.longitude)) return null;

    return (
      <Marker
        key={sos._id}
        position={[sos.latitude, sos.longitude]}
        icon={sos.criticalFlag ? criticalIcon : sosIcon}
      >
        <Popup>
          🚨 <strong>SOS REQUEST</strong> <br />
          Name: {sos.name} <br />
          Disaster: {sos.disasterType} <br />
          Status: {sos.status} <br />
          City: {sos.city}
        </Popup>
      </Marker>
    );
  })}

  {/* ================= NGO + ROUTE ================= */}
  { sosList.map((sos) => {
  const partnerId =
    typeof sos.assignedResponder === "object"
      ? sos.assignedResponder?._id?.toString()
      : sos.assignedResponder?.toString();

  if (!partnerId) return null;

  const responder =
    animatedResponders[partnerId] ||
    ngoLocations[partnerId];

  if (
    !responder ||
    !isValidCoord(responder.latitude, responder.longitude) ||
    !isValidCoord(sos.latitude, sos.longitude)
  )
    return null;

  const info = calculateETA(responder, sos);

  return (
    <React.Fragment key={`route-${sos._id}`}>
      <Marker
        position={[responder.latitude, responder.longitude]}
        icon={ngoIcon}
      >
        <Popup>
          🚑 <strong>Responder</strong> <br />
          Assigned To: {sos.name} <br />
          Distance: {info?.distance} km <br />
          ETA: {info?.eta} mins
        </Popup>
      </Marker>

      <Polyline
        positions={[
          [responder.latitude, responder.longitude],
          [sos.latitude, sos.longitude]
        ]}
        pathOptions={{
          color: sos.criticalFlag ? "red" : "lime",
          weight: 5,
          dashArray: "8,8"
        }}
      />
    </React.Fragment>
  );
})}
</MapContainer>


);
};

export default SOSMap;
