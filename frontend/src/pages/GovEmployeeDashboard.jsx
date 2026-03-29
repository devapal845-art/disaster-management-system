
import { useEffect, useState } from "react";
import API from "../services/api";
import socket from "../services/socket";
import SOSMap from "../components/SOSMap";
import "./GovernmentDashboard.css";

const GovEmployeeDashboard = () => {

  const [citySOS, setCitySOS] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [memberLocation, setMemberLocation] = useState(null);
  const [gpsActive, setGpsActive] = useState(true);

  const name = localStorage.getItem("name");
  const city = localStorage.getItem("city");
  const userId = localStorage.getItem("userId");

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

  /* ================= FETCH ONLY ASSIGNED ================= */

  const fetchAssignedSOS = async () => {
    try {
      const res = await API.get(`/sos/city/${city}`);

      const filtered = res.data.filter(
  (s) => s.assignedResponder?.toString() === userId?.toString()
);

      setCitySOS(filtered);

    } catch (error) {
      console.error("Fetch error:", error.message);
    }
  };

  /* ================= ANALYTICS ================= */

  const fetchCityAnalytics = async () => {
    try {
      const res = await API.get(`/rescue-analytics/city/${city}`);
      setAnalytics(res.data);
    } catch (error) {
      console.error(error.message);
    }
  };

  /* ================= ALERTS ================= */

  const fetchAlerts = async () => {
    try {
      const res = await API.get(`/alerts/city/${city}`);
      setAlerts(res.data);
    } catch (error) {
      console.error(error.message);
    }
  };

  /* ================= GPS TRACKING ================= */

  useEffect(() => {

    fetchAssignedSOS();
    fetchCityAnalytics();
    fetchAlerts();

    const interval = setInterval(() => {

      if (!navigator.geolocation) {
        setGpsActive(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(

        async (pos) => {

          const { latitude, longitude } = pos.coords;

          setMemberLocation({ latitude, longitude });
          setGpsActive(true);

          // 🔥 SOCKET EMIT
          socket.emit("responderLocationUpdate", {
  userId: userId.toString(),
  latitude,
  longitude
});
          // 🔥 SAVE BACKEND
          await API.patch("/auth/location", {
  latitude,
  longitude
});

        },

        () => setGpsActive(false)

      );

    }, 4000);

    return () => clearInterval(interval);

  }, [userId]);

  /* ================= SOCKET ================= */

  useEffect(() => {
    socket.on("sosUpdated", fetchAssignedSOS);
    return () => socket.off("sosUpdated");
  }, []);

  /* ================= STATUS UPDATE ================= */

  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/sos/${id}/status`, { status });

      socket.emit("sosStatusChanged", { id, status });

      fetchAssignedSOS();
    } catch (err) {
      console.error(err.message);
    }
  };

  /* ================= ACTIONS ================= */

  const markCritical = async (id) => {
    await API.patch(`/sos/${id}/critical`, { criticalFlag: true });
    fetchAssignedSOS();
  };

  const closeCase = async (id) => {
    await API.patch(`/sos/${id}/status`, { status: "Closed" });
    fetchAssignedSOS();
  };

  const logout = () => {
    socket.disconnect();
    localStorage.clear();
    window.location.href = "/";
  };

  const criticalCases = citySOS.filter(s => s.criticalFlag).length;

  return (
    <div className="gov-container">

      {/* HEADER */}
      <div className="gov-header">
        <div>
          <h2>🚑 Government Responder Panel</h2>
          <p>{name} ({city})</p>
          <span>● {gpsActive ? "GPS Active" : "GPS Offline"}</span>
        </div>

        <button className="gov-logout" onClick={logout}>
          Logout
        </button>
      </div>

      {/* KPI */}
      {analytics && (
        <div className="gov-kpi-grid">
          <div className="gov-kpi">
            <h6>Assigned SOS</h6>
            <h2>{citySOS.length}</h2>
          </div>

          <div className="gov-kpi warning">
            <h6>Critical</h6>
            <h2>{criticalCases}</h2>
          </div>
        </div>
      )}

      {/* MISSIONS */}
      {citySOS.length === 0 ? (
        <div className="empty-state">
          <h4>No Assigned Missions</h4>
        </div>
      ) : (

        <div className="gov-case-grid">

         {citySOS.map((sos) => {

  let distance = null;
  let eta = null;

  // ✅ DEFINE ONCE (TOP)
  const lat = sos.location?.coordinates?.[1];
  const lng = sos.location?.coordinates?.[0];

  // ✅ SAFE CHECK (VERY IMPORTANT)
  if (lat && lng && memberLocation) {
    distance = calculateDistance(
      memberLocation.latitude,
      memberLocation.longitude,
      lat,
      lng
    );

    eta = ((distance / 40) * 60).toFixed(0);
  }

  return (
    <div key={sos._id} className="mission-card">

  <h3>{sos.name}</h3>

  <p><strong>Disaster:</strong> {sos.disasterType}</p>
  <p>Status: {sos.status}</p>

  {distance && (
    <p>📍 {distance} km | ⏱ {eta} mins</p>
  )}

  {/* ✅ MAP FOR THIS SOS */}
  <SOSMap
    sosList={[
      {
        ...sos,
        latitude: lat,
        longitude: lng
      }
    ]}
  />

  <div className="mission-actions">

    {sos.status === "Assigned" && (
      <button
        className="gov-btn blue"
        onClick={() => updateStatus(sos._id, "OnTheWay")}
      >
        Start Mission
      </button>
    )}

    {sos.status === "OnTheWay" && (
      <button
        className="gov-btn green"
        onClick={() => updateStatus(sos._id, "Rescued")}
      >
        Mark Rescued
      </button>
    )}

    {lat && lng && (
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="gov-btn blue"
      >
        Navigate
      </a>
    )}

    {!sos.criticalFlag && (
      <button
        className="gov-btn danger"
        onClick={() => markCritical(sos._id)}
      >
        Mark Critical
      </button>
    )}

    <button
      className="gov-btn dark"
      onClick={() => closeCase(sos._id)}
    >
      Close Case
    </button>

  </div>

</div>
  );
})}

        </div>

      )}

    </div>
  );
};

export default GovEmployeeDashboard;

