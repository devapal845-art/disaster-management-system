import { useEffect, useState } from "react";
import API from "../services/api";

import NGOMissionMap from "../components/NGOMissionMap";
import "./NGODashboard.css";
import socket from "../services/socket";


const NGOUserDashboard = () => {

  const [sosList, setSOSList] = useState([]);
  const [gpsActive, setGpsActive] = useState(true);
  const [memberLocation, setMemberLocation] = useState(null);

  const name = localStorage.getItem("name");
  const ngoId = localStorage.getItem("userId");

  /* ================= DISTANCE ================= */

  const calculateDistance = (lat1, lon1, lat2, lon2) => {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return (R * c).toFixed(2);

  };

  /* ================= FETCH SOS ================= */

  const fetchAssigned = async () => {

    try {

      const res = await API.get("/sos/active");

      // ✅ FIXED FILTER (assignedMember instead of assignedPartner)
    

       const myMissions = res.data.filter((sos) => {

  const id =
    typeof sos.assignedResponder === "object"
      ? sos.assignedResponder?._id?.toString()
      : sos.assignedResponder?.toString();

  return id === ngoId;
});

      setSOSList(myMissions);

    } catch (err) {

      console.error("Fetch SOS error:", err.message);

    }

  };

  /* ================= LIVE GPS ================= */

  useEffect(() => {

    fetchAssigned();

    const interval = setInterval(() => {

      if (!navigator.geolocation) {
        setGpsActive(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(

        async (position) => {

          const { latitude, longitude } = position.coords;

          setMemberLocation({ latitude, longitude });
          setGpsActive(true);
console.log("🚀 SENDING LOCATION:", {
  userId: ngoId,
  latitude,
  longitude
});

socket.emit("ngoLocationUpdate", {
  userId: ngoId,
  latitude,
  longitude
});
          // ✅ FIXED SOCKET PAYLOAD
          socket.emit("ngoLocationUpdate", {
            userId: ngoId,   // 🔥 IMPORTANT FIX
            latitude,
            longitude
          });

          try {

            await API.patch("/ngo/location", {
              latitude,
              longitude
            });

          } catch (err) {

            console.warn("Location save failed:", err.message);

          }

        },

        () => setGpsActive(false)

      );

    }, 5000);

    return () => clearInterval(interval);

  }, [ngoId]);

  /* ================= SOCKET ================= */

  useEffect(() => {

    socket.on("connect", () => {
      console.log("🟢 Socket connected");
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
    });

    socket.on("sosUpdated", () => {
      fetchAssigned();
    });

    return () => {

      socket.off("connect");
      socket.off("disconnect");
      socket.off("sosUpdated");

    };

  }, []);

  /* ================= STATUS UPDATE ================= */

  const updateStatus = async (id, status) => {

    try {

      await API.patch(`/sos/${id}/status`, { status });

      fetchAssigned();

    } catch (err) {

      console.error("Status update failed:", err.message);

    }

  };

  /* ================= LOGOUT ================= */

  const logout = () => {

    socket.disconnect();

    localStorage.clear();

    window.location.href = "/";

  };

  /* ================= KPI ================= */

  const assigned = sosList.length;

  const inProgress = sosList.filter(
    s => s.status === "OnTheWay"
  ).length;

  const completed = sosList.filter(
    s => s.status === "Rescued"
  ).length;

  const critical = sosList.filter(
    s => s.criticalFlag
  ).length;

  return (
    <div className="ngo-container">

  {/* HEADER */}
  <div className="ngo-header">
    <div>
      <h2>🏥 {name} Rescue Dashboard</h2>
      <span className="live-status">
        ● {gpsActive ? "GPS Active" : "GPS Offline"}
      </span>
    </div>

    <button className="logout-btn" onClick={logout}>
      Logout
    </button>
  </div>

  {/* KPI PANEL */}
  <div className="ngo-side-panel">

  <div className="ngo-kpi-card">
    <h6>Total Assigned</h6>
    <h2>{assigned}</h2>
  </div>

  <div className="ngo-kpi-card warning">
    <h6>On The Way</h6>
    <h2>{inProgress}</h2>
  </div>

  <div className="ngo-kpi-card success">
    <h6>Completed</h6>
    <h2>{completed}</h2>
  </div>

  <div className="ngo-kpi-card danger"> {/* FIX TYPO */}
    <h6>Critical</h6>
    <h2>{critical}</h2>
  </div>

</div>

  {/* MISSIONS */}
  <div className="mission-area mt-5">

    {assigned === 0 ? (

      <div className="empty-state">
        <h4>No Active Mission</h4>
        <p>Waiting for dispatch...</p>
      </div>

    ) : (

      sosList.map((sos) => {

        // ✅ FIX: Extract lat/lng correctly
        const lat = sos.location?.coordinates?.[1];
const lng = sos.location?.coordinates?.[0];

let distance = null;
let eta = null;

if (memberLocation && lat && lng) {

  distance = calculateDistance(
    memberLocation.latitude,
    memberLocation.longitude,
    lat,
    lng
  );

  eta = ((distance / 40) * 60).toFixed(0);
}

        return (

          <div
            key={sos._id}
            className={`mission-card ${sos.criticalFlag ? "critical-border" : ""}`}
          >

            {/* HEADER */}
            <div className="mission-header">
              <div>
                <h3>{sos.name}</h3>
                <p className="sub-text">Disaster: {sos.disasterType}</p>
              </div>

              <span className={`ngo-status ${sos.status.toLowerCase()}`}>
                {sos.status}
              </span>
            </div>

            {/* DISTANCE + ETA */}
            {distance && (
              <div className="mission-metrics-inline">
                <span>📍 {distance} km</span>
                <span>⏱ {eta} mins</span>
              </div>
            )}

            {/* MAP */}
            <div className="mission-map">
              <NGOMissionMap
                memberLocation={memberLocation}
                sos={{
                  ...sos,
                  latitude: lat,
                  longitude: lng
                }}
              />
            </div>

            {/* ACTIONS */}
            <div className="mission-actions column">

              {sos.status === "Assigned" && (
                <button
                  className="gov-btn blue full"
                  onClick={() => updateStatus(sos._id, "OnTheWay")}
                >
                  Mark On The Way
                </button>
              )}

              {sos.status === "OnTheWay" && (
                <button
                  className="gov-btn green full"
                  onClick={() => updateStatus(sos._id, "Rescued")}
                >
                  Mark Rescued
                </button>
              )}

              {/* ✅ NAVIGATE FIXED */}
              {lat && lng && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gov-btn blue full"
                >
                  Navigate
                </a>
              )}

              {!sos.criticalFlag && (
                <button
                  className="gov-btn danger full"
                  onClick={() => markCritical(sos._id)}
                >
                  Mark Critical
                </button>
              )}

              <button
                className="gov-btn dark full"
                onClick={() => closeCase(sos._id)}
              >
                Close Case
              </button>

            </div>

          </div>

        );

      })

    )}

  </div>

</div>
  );

};

export default NGOUserDashboard;