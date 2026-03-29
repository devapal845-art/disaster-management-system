
import { useEffect, useState } from "react";
import API from "../services/api";
import SOSMap from "../components/SOSMap";
import "./GovernmentDashboard.css";
import socket from "../services/socket";

const GovCentralDashboard = () => {

  const [activeSOS, setActiveSOS] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [ngoRanking, setNgoRanking] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [searchCity, setSearchCity] = useState("");

  // 🔥 NEW STATE
  const [members, setMembers] = useState([]);

  const name = localStorage.getItem("name");

  /* ================= FETCH SOS ================= */

  const fetchSOS = async () => {
    try {

      const res = await API.get("/sos/active");

      const sorted = res.data.sort((a, b) => {
        if (a.criticalFlag && !b.criticalFlag) return -1;
        if (!a.criticalFlag && b.criticalFlag) return 1;
        return 0;
      });

      setActiveSOS(sorted);

    } catch (error) {
      console.error("Failed to fetch SOS:", error.message);
    }
  };

  /* ================= FETCH MEMBERS (NEW) ================= */

  const fetchMembers = async () => {
    try {
      const res = await API.get("/auth/responders");
      setMembers(res.data);
    } catch (error) {
      console.error("Failed to fetch members:", error.message);
    }
  };

  /* ================= FETCH ANALYTICS ================= */

  const fetchAnalytics = async () => {
    try {
      const res = await API.get("/rescue-analytics");
      setAnalytics(res.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error.message);
    }
  };

  /* ================= FETCH NGO RANKING ================= */

  const fetchNGORanking = async () => {
    try {
      const res = await API.get("/rescue-analytics/ngo-ranking");
      setNgoRanking(res.data);
    } catch (error) {
      console.error("Failed NGO ranking:", error.message);
    }
  };

  /* ================= FETCH DISASTER ALERTS ================= */

  const fetchAlerts = async () => {
    try {
      const res = await API.get("/alerts");
      setAlerts(res.data);
    } catch (error) {
      console.error("Failed to fetch alerts:", error.message);
    }
  };

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {

    fetchSOS();
    fetchAnalytics();
    fetchNGORanking();
    fetchAlerts();
    fetchMembers(); // 🔥 NEW

    const interval = setInterval(() => {
      fetchSOS();
      fetchAnalytics();
    }, 10000);

    return () => clearInterval(interval);

  }, []);

  /* ================= SOCKET LIVE UPDATE ================= */

  useEffect(() => {

    socket.on("sosUpdated", () => {
      fetchSOS();
      fetchAnalytics();
    });

    return () => {
      socket.off("sosUpdated");
    };

  }, []);

  /* ================= ASSIGN MEMBER (NEW) ================= */

  const assignMember = async (sosId, memberId) => {
    try {
      await API.patch(`/sos/${sosId}/assign`, { memberId });
      fetchSOS();
    } catch (error) {
      console.error("Assign failed:", error.message);
    }
  };

  /* ================= ACTIONS ================= */

  const markCritical = async (id) => {
    try {
      await API.patch(`/sos/${id}/critical`, { criticalFlag: true });
      fetchSOS();
    } catch (error) {
      console.error("Failed critical mark:", error.message);
    }
  };

  const closeCase = async (id) => {
    try {
      await API.patch(`/sos/${id}/status`, { status: "Closed" });
      fetchSOS();
    } catch (error) {
      console.error("Failed closing case:", error.message);
    }
  };

  const logout = () => {
    socket.disconnect();
    localStorage.clear();
    window.location.href = "/";
  };

  const highPriority = activeSOS.filter(s => s.criticalFlag).length;

  /* ================= FILTER SOS ================= */

  const filteredSOS = activeSOS.filter((sos) =>
    sos.city?.toLowerCase().includes(searchCity.toLowerCase())
  );

  return (
    <div className="gov-container">

      {/* ================= HEADER ================= */}

      <div className="gov-header">

        <div>
          <h2>🏛 National Disaster Control Room</h2>
          <p>Welcome {name}</p>
        </div>

        <button className="gov-logout" onClick={logout}>
          Logout
        </button>

      </div>

      {/* ================= KPI ================= */}

      {analytics && (
        <div className="gov-kpi-grid">

          <div className="gov-kpi">
            <h6>Total Active SOS</h6>
            <h2>{analytics.totalSOS}</h2>
          </div>

          <div className="gov-kpi warning">
            <h6>Critical Cases</h6>
            <h2>{highPriority}</h2>
          </div>

          <div className="gov-kpi success">
            <h6>Rescued</h6>
            <h2>{analytics.rescuedCount}</h2>
          </div>

          <div className="gov-kpi dark">
            <h6>Avg Response Time</h6>
            <h2>{analytics.averageAssignmentTimeMinutes} min</h2>
          </div>

        </div>
      )}

      {/* ================= ALERT PANEL ================= */}

      <div className="gov-alert-section">

        <h4>⚠ Disaster Alerts</h4>

        <div className="gov-alert-grid">

          {alerts.map(alert => (

            <div
              key={alert._id}
              className={`gov-alert-card ${alert.severity?.toLowerCase()}`}
            >

              <h5>{alert.type}</h5>
              <p>Risk Score: {alert.riskScore}</p>

            </div>

          ))}

        </div>

      </div>

      {/* ================= MAP ================= */}

      <div className="gov-map-section">

        <h4>🛰 National Emergency Map</h4>

        <SOSMap
  sosList={activeSOS.map(s => ({
    ...s,
    latitude: s.location?.coordinates?.[1],
    longitude: s.location?.coordinates?.[0]
  }))}
/>

      </div>

      {/* ================= SEARCH ================= */}

      <div className="gov-search">
        <input
          type="text"
          placeholder="Search by city..."
          value={searchCity}
          onChange={(e) => setSearchCity(e.target.value)}
        />
      </div>

      {/* ================= ACTIVE CASES ================= */}

      <div className="gov-case-section">

        <h4>🚨 Active Emergency Cases</h4>

        {filteredSOS.length === 0 ? (
          <p>No Active Emergencies</p>
        ) : (

          <div className="gov-case-grid">

            {filteredSOS.map((sos) => (

              <div
                key={sos._id}
                className={`gov-case-card ${sos.criticalFlag ? "critical-border" : ""}`}
              >

                <div className="gov-case-header">

                  <h5>{sos.name}</h5>

                  <span className={`gov-status ${sos.status?.toLowerCase()}`}>
                    {sos.status}
                  </span>

                </div>

                <p><strong>Disaster:</strong> {sos.disasterType}</p>
                <p><strong>City:</strong> {sos.city}</p>

                <p>
                  <strong>Assigned Responder:</strong>{" "}
                  {sos.assignedResponder?.name || "Not Assigned"}
                </p>

                {/* 🔥 ASSIGN DROPDOWN */}
                <select
                  className="gov-assign-dropdown"
                  onChange={(e) => assignMember(sos._id, e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Assign Responder</option>

                  {members
  .filter(m =>
    m.availability === "Available" &&
    m.role === "GOV_EMPLOYEE" &&
    m.city === sos.city &&
    m.isOnline === true &&
    m.activeSOS === null
  )
  .map(member => (
    <option key={member._id} value={member._id}>
      {member.name} ({member.role})
    </option>
  ))}
                </select>

                {sos.criticalFlag && (
                  <span className="gov-critical-badge">CRITICAL</span>
                )}

                <div className="gov-case-actions">

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

            ))}

          </div>

        )}

      </div>

      {/* ================= NGO RANKING ================= */}

      <div className="gov-ngo-section">

        <h4>🏥 NGO Performance Ranking</h4>

        <div className="gov-ngo-grid">

          {ngoRanking.map((ngo, index) => (

            <div
              key={ngo._id}
              className="gov-ngo-card"
            >

              <h5>#{index + 1} {ngo.name}</h5>

              <p>⭐ Score: {ngo.performanceScore || 0}</p>
              <p>Total Rescues: {ngo.totalRescues || 0}</p>

              <p>
                Avg Response:{" "}
                {ngo.avgResponseTime
                  ? ngo.avgResponseTime.toFixed(1)
                  : 0} min
              </p>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
};

export default GovCentralDashboard;

