import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap
} from "react-leaflet";
import React from "react";
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// 🔥 ADD THIS HERE (top of file)
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
import API from "../services/api";
import "./CitizenMap.css";
const CitizenMap = ({ mySOS, animatedNGO = {}, autoEvacuate }) =>  {
  const [position, setPosition] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
const [criticalMember, setCriticalMember] = useState(null);
  const [mapType, setMapType] = useState("normal");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [earthquakes, setEarthquakes] = useState([]);
  const [fires, setFires] = useState([]);
  const [weather, setWeather] = useState([]);
  const [aqi, setAqi] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
const userId = localStorage.getItem("userId");
 const [visibleLayers, setVisibleLayers] = useState({
  earthquake: true,
  fire: true,
  weather: true,
  aqi: false,
  sos: true,
  group: false,
  impactZone: true   // ✅ add this
});
console.log("mySOS:", mySOS);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /* ================= SAFE ICONS ================= */
  const defaultIcon = new L.Icon.Default();

  const blinkingIcon = L.divIcon({
    className: "blinking-marker",
    html: `<div></div>`
  });
const ngoIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/743/743922.png",
  iconSize: [40, 40]
});
const govIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2991/2991108.png",
  iconSize: [40, 40]
});
// 🔴 Danger (blinking)
const dangerIcon = L.divIcon({
  className: "blinking-marker",
  html: `<div></div>`
});

// 🟡 Critical (optional style)
const criticalIcon = L.divIcon({
  className: "critical-marker",
  html: `<div></div>`
});

// 🔵 Normal member
const normalIcon = new L.Icon.Default();
  /* ================= SAFE COORD CHECK ================= */
  const isValidCoord = (lat, lng) =>
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng);
const calculateETA = (responder, sos) => {
  if (!responder || !sos) return null;

  const lat1 = Number(responder.latitude);
  const lng1 = Number(responder.longitude);

  const lat2 = Number(sos.location?.coordinates?.[1]); // ✅ FIX
  const lng2 = Number(sos.location?.coordinates?.[0]); // ✅ FIX

  if (
    isNaN(lat1) || isNaN(lng1) ||
    isNaN(lat2) || isNaN(lng2)
  ) {
    console.log("❌ Invalid coords:", { lat1, lng1, lat2, lng2 });
    return { distance: 0, eta: 0 };
  }

  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;

  const speed = 40; // km/h
  const eta = (distance / speed) * 60;

  return {
    distance: distance.toFixed(2),
    eta: eta.toFixed(0)
  };
};
  /* ================= GET USER LOCATION ================= */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setPosition([pos.coords.latitude, pos.coords.longitude]);
    });
  }, []);

  /* ================= AUTO REFRESH ================= */
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);


const fetchAllData = async () => {
  try {
    /* ================= DISASTER DATA ================= */
    const res = await API.get("/disasters/current");

    setEarthquakes(res.data.earthquakes || []);
    setFires(res.data.fires || []);
    setWeather(res.data.weather || []);
    setAqi(res.data.aqi || []);

    /* ================= GROUP MEMBERS (FIXED) ================= */
    const [familyRes, societyRes] = await Promise.all([
      API.get("/group/members?type=family"),
      API.get("/group/members?type=society")
    ]);

    const combinedMembers = [
      ...(familyRes.data || []),
      ...(societyRes.data || [])
    ];

    setGroupMembers(combinedMembers);

    /* ================= HIGH RISK DETECTION ================= */
    const highRiskMembers = combinedMembers.filter(
      (m) => m.lastRiskLevel === "High"
    );

    // If you want only one (current logic)
    if (highRiskMembers.length > 0) {
      setCriticalMember(highRiskMembers[0]);
    } else {
      setCriticalMember(null);
    }

    /* ================= LAST REFRESH ================= */
    setLastRefresh(new Date());

  } catch (err) {
    console.error("Data fetch failed", err);
  }
};
  mySOS.forEach((sos) => {

  const partnerId =
  typeof sos.assignedResponder === "object"
    ? sos.assignedResponder?._id?.toString()
    : sos.assignedResponder?.toString();

const responder = animatedNGO?.[String(partnerId)];

  console.log("MY SOS:", sos._id);
  console.log("RESPONDER ID:", partnerId);
  console.log("LIVE NGO DATA:", responder);

});

  /* ================= TOGGLE LAYER ================= */
  const toggleLayer = (layer) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  /* ================= SAFE ROUTE ================= */
  const findSafeRoute = async () => {
    if (!position || earthquakes.length === 0) return;

    const [lat, lng] = position;
    const target = earthquakes.find(e =>
      isValidCoord(e.lat, e.lng)
    );

    if (!target) return;

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${target.lng},${target.lat}?overview=full&geometries=geojson`
      );

      const data = await response.json();

      if (!data.routes || !data.routes[0]) return;

      const coords = data.routes[0].geometry.coordinates.map((c) => [
        c[1],
        c[0]
      ]);

      setRouteCoords(coords);
    } catch (err) {
      console.error("Route generation failed");
    }
  };

  useEffect(() => {
    if (autoEvacuate) findSafeRoute();
  }, [autoEvacuate]);

  /* ================= SEVERITY FILTER ================= */
  const filterSeverity = (severity) => {
    if (severityFilter === "All") return true;
    return severity === severityFilter;
  };
const AutoFollow = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 15, { animate: true });
    }
  }, [position]);

  return null;
};
  if (!position) return <p>Loading map...</p>;

  return (
    <div>
      {/* LIVE REFRESH */}
      <div className="live-indicator">
        🔄 Live Auto Refresh (30s) | Last update:{" "}
        {lastRefresh.toLocaleTimeString()}
      </div>

      {/* TOOLBAR */}
      <div className="layer-toolbar">
        <button
          className="layer-btn"
          onClick={() =>
            setMapType(mapType === "normal" ? "satellite" : "normal")
          }
        >
          🛰 {mapType === "normal" ? "Satellite" : "Normal"}
        </button>

        <select
          className="severity-select"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="All">All Severity</option>
          <option value="High">High</option>
          <option value="Moderate">Moderate</option>
          <option value="Low">Low</option>
        </select>

        {[
          ["earthquake", "🌍 EQ", earthquakes.length],
          ["fire", "🔥 Fire", fires.length],
          ["weather", "🌧 Weather", weather.length],
          ["aqi", "🌫 AQI", aqi.length],
          ["sos", "🚨 SOS", mySOS.length],
          ["group", "👨‍👩‍👧 Group", groupMembers.length],["impactZone", "⭕ 50km Zone", ""]
        ].map(([key, label, count]) => (
          <button
            key={key}
            className={`layer-btn ${visibleLayers[key] ? "active" : ""}`}
            onClick={() => toggleLayer(key)}
          >
            {label} <span className="badge">{count}</span>
          </button>
        ))}
      </div>

      {/* MAP */}
      <MapContainer
        center={position}
        zoom={10}
        style={{ height: "650px", width: "100%" }}
      >
        <TileLayer
          url={
            mapType === "normal"
              ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          }
        />

        {/* USER */}
        <Marker position={position}>
          <Popup>Your Location</Popup>
        </Marker>
      {visibleLayers.impactZone && (
  <Circle
    center={position}
    radius={50000}
    pathOptions={{
      color: "#ef4444",
      fillColor: "#ef4444",
      fillOpacity: 0.08,
      weight: 2
    }}
  >
    <Popup>🚨 50km Disaster Impact Zone</Popup>
  </Circle>
)}
        {/* EARTHQUAKES */}
        {visibleLayers.earthquake &&
          earthquakes
            .filter((e) =>
              filterSeverity(e.severity) &&
              isValidCoord(e.lat, e.lng)
            )
            .map((e, idx) => (
              <Marker
                key={idx}
                position={[e.lat, e.lng]}
                icon={
                  e.severity === "High"
                    ? blinkingIcon
                    : defaultIcon
                }
              >
                <Popup>
                  🌍 Magnitude: {e.magnitude} <br />
                  Severity: {e.severity}
                </Popup>
              </Marker>
            ))}

        {/* FIRE */}
        {visibleLayers.fire &&
          fires
            .filter((f) =>
              filterSeverity(f.severity) &&
              isValidCoord(f.lat, f.lng)
            )
            .map((f, idx) => (
              <Marker
                key={idx}
                position={[f.lat, f.lng]}
              >
                <Popup>🔥 Fire - {f.severity}</Popup>
              </Marker>
            ))}

        {/* WEATHER */}
        {visibleLayers.weather &&
          weather
            .filter((w) =>
              filterSeverity(w.severity) &&
              isValidCoord(w.lat, w.lng)
            )
            .map((w, idx) => (
              <Marker
                key={idx}
                position={[w.lat, w.lng]}
              >
                <Popup>🌧 {w.description}</Popup>
              </Marker>
            ))}

        {/* AQI */}
        {visibleLayers.aqi &&
          aqi
            .filter((a) =>
              filterSeverity(a.severity) &&
              isValidCoord(a.lat, a.lng)
            )
            .map((a, idx) => (
              <Marker
                key={idx}
                position={[a.lat, a.lng]}
              >
                <Popup>🌫 AQI: {a.value}</Popup>
              </Marker>
            ))}
            // ✅ only my SOS

{visibleLayers.sos &&
  mySOS
    .filter((s) =>
      s.userId?.toString() === userId?.toString() &&
      isValidCoord(
        Number(s.location?.coordinates?.[1]), // ✅ FIX
        Number(s.location?.coordinates?.[0])  // ✅ FIX
      )
    )
    .map((s) => (
      <Marker
        key={s._id}
        position={[
          Number(s.location?.coordinates?.[1]), // ✅ FIX
          Number(s.location?.coordinates?.[0])  // ✅ FIX
        ]}
        icon={blinkingIcon}
      >
        <Popup>
          🚨 <strong>{s.disasterType}</strong> <br />
          Name: {s.name} <br />
          Status: {s.status}
        </Popup>
      </Marker>
))}
        {/* GROUP */}
        {/* GROUP */}
{visibleLayers.group &&
  groupMembers
    .filter((m) =>
      isValidCoord(
        Number(m?.lastLocation?.coordinates?.[1]),
        Number(m?.lastLocation?.coordinates?.[0])
      )
    )
    .map((m) => {
      const lat = Number(m.lastLocation.coordinates[1]);
      const lng = Number(m.lastLocation.coordinates[0]);

      const isDanger =
        m.groupAlert === true ||
        m.lastRiskLevel === "High";

      return (
        <Marker
          key={m._id}
          position={[lat, lng]}
          icon={
            m.lastRiskLevel === "Critical"
              ? criticalIcon
              : isDanger
              ? dangerIcon
              : normalIcon
          }
        >
          <Popup>
            👤 {m.name} <br />
            Status: {
              m.lastRiskLevel === "Critical"
                ? "🔥 CRITICAL"
                : isDanger
                ? "🚨 GROUP DANGER"
                : "✅ Safe"
            }
          </Popup>
        </Marker>
      );
    })}
{/* 🚑 RESPONDER TRACKING */}

{visibleLayers.sos &&
  mySOS
    .filter((s) =>
      s.userId?.toString() === userId?.toString() &&
      isValidCoord(
        Number(s.location?.coordinates?.[1]),
        Number(s.location?.coordinates?.[0])
      )
    )
    .map((sos) => {
      const partnerId =
  typeof sos.assignedResponder === "object"
    ? sos.assignedResponder?._id?.toString()
    : sos.assignedResponder?.toString();

const responder = animatedNGO?.[String(partnerId)];

      cconsole.log("NGO STATE:", animatedNGO);
console.log("RESPONDER ID:", partnerId);
console.log("FOUND:", animatedNGO?.[String(partnerId)]);

      if (!responder) return null;

      // ✅ FIXED CONDITION
      if (
        !isValidCoord(
          Number(sos.location?.coordinates?.[1]),
          Number(sos.location?.coordinates?.[0])
        )
      ) return null;

      const info = calculateETA(responder, sos);

      console.log("FINAL RENDER:", responder.latitude, responder.longitude);

      return (
        <React.Fragment key={`${sos._id}-${partnerId}`}>
          <Marker
            position={[
              Number(responder.latitude),
              Number(responder.longitude)
            ]}
            icon={govIcon}
          >
            <Popup>
              🚑 Responder <br />
              📍 {info?.distance} km <br />
              ⏱ ETA: {info?.eta} mins
            </Popup>
          </Marker>

          <Polyline
            positions={[
              [Number(responder.latitude), Number(responder.longitude)],
              [
                Number(sos.location?.coordinates?.[1]),
                Number(sos.location?.coordinates?.[0])
              ]
            ]}
            pathOptions={{
              color: "#2563eb",
              weight: 5
            }}
          />
        </React.Fragment>
      );
    })}
        {/* ROUTE */}
        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "lime", weight: 6 }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default CitizenMap;