import { useEffect, useState } from "react";
import API from "../services/api";
import SOSMap from "../components/SOSMap";
import AnalyticsCharts from "../components/AnalyticsCharts";
import CityBarChart from "../components/CityBarChart";
import NGORankingChart from "../components/NGORankingChart";
import MonthlyTrendChart from "../components/MonthlyTrendChart";
import "./AdminDashboard.css";

import socket from "../services/socket";

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [activeSOS, setActiveSOS] = useState([]);
  const [cityData, setCityData] = useState([]);
  const [ngoData, setNgoData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [ngoLocations, setNgoLocations] = useState({});
  const [ngoSpeeds, setNgoSpeeds] = useState({});

  /* ================= INITIAL FETCH ================= */
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ================= SOCKET ================= */
  useEffect(() => {

    socket.on("sosUpdated", (updatedSOS) => {
      setActiveSOS(prev =>
        prev.map(s =>
          s._id === updatedSOS._id ? updatedSOS : s
        )
      );
      fetchAnalytics();
    });

    socket.on("ngoLocationBroadcast", (data) => {
      if (!data?.ngoId) return;

      setNgoLocations(prev => ({
        ...prev,
        [data.ngoId]: {
          latitude: data.latitude,
          longitude: data.longitude
        }
      }));

      if (data.speed !== undefined) {
        setNgoSpeeds(prev => ({
          ...prev,
          [data.ngoId]: data.speed
        }));
      }
    });

    return () => {
      socket.off("sosUpdated");
      socket.off("ngoLocationBroadcast");
    };

  }, []);

  /* ================= FETCH ================= */

  const fetchAll = () => {
    fetchAnalytics();
    fetchActiveSOS();
    fetchCityAnalytics();
    fetchNGOData();
    fetchTrendData();
  };

  const fetchAnalytics = async () => {
    try {
      const res = await API.get("/rescue-analytics");
      setAnalytics(res.data);
    } catch (err) {
      console.error("Analytics error:", err);
    }
  };

  const fetchActiveSOS = async () => {
    try {
      const res = await API.get("/sos/active");
      setActiveSOS(res.data);
    } catch (err) {
      console.error("SOS error:", err);
    }
  };

  const fetchCityAnalytics = async () => {
    try {
      const res = await API.get("/rescue-analytics/city");
      setCityData(res.data);
    } catch (err) {
      console.error("City error:", err);
    }
  };

  const fetchNGOData = async () => {
    try {
      const res = await API.get("/rescue-analytics/ngo-ranking");
      setNgoData(res.data);
    } catch (err) {
      console.error("NGO error:", err);
    }
  };

  const fetchTrendData = async () => {
    try {
      const res = await API.get("/rescue-analytics/monthly-trend");
      setTrendData(res.data);
    } catch (err) {
      console.error("Trend error:", err);
    }
  };

  /* ================= ACTIONS ================= */

  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/sos/${id}/status`, { status });

      // ✅ No full reload (fast UI)
      setActiveSOS(prev =>
        prev.map(s =>
          s._id === id ? { ...s, status } : s
        )
      );

    } catch (err) {
      console.error("Update status error:", err);
    }
  };

  const overrideAssign = async (sosId) => {
    const partnerId = prompt("Enter NGO Partner ID:");
    if (!partnerId) return;

    try {
      await API.post(`/sos/${sosId}/override`, { partnerId });
      fetchActiveSOS();
    } catch (err) {
      console.error("Override error:", err);
    }
  };

  /* ================= LOADING ================= */

  if (!analytics) {
    return (
      <div className="admin-container">
        <h3>Loading dashboard...</h3>
      </div>
    );
  }

  /* ================= SORT ================= */

  const sortedSOS = [...activeSOS].sort((a, b) => {
    if (a.criticalFlag && !b.criticalFlag) return -1;
    if (!a.criticalFlag && b.criticalFlag) return 1;

    const priority = {
      Pending: 1,
      Assigned: 2,
      OnTheWay: 3,
      Rescued: 4
    };

    return priority[a.status] - priority[b.status];
  });

  /* ================= UI ================= */

  return (
    <div className="admin-container">

      {/* HEADER */}
      <div className="admin-header">
        <div>
          <h3>🛰 Disaster Control Center</h3>
          <span className="system-status">● System Operational</span>
        </div>

        <div className="admin-meta">
          <span>Live Monitoring</span>
          <span>Total Active: {activeSOS.length}</span>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        <div className="kpi-card primary">
          <h6>Total SOS</h6>
          <h2>{analytics.totalSOS}</h2>
        </div>

        <div className="kpi-card warning">
          <h6>Pending</h6>
          <h2>{analytics.pendingCount}</h2>
        </div>

        <div className="kpi-card success">
          <h6>Rescued</h6>
          <h2>{analytics.rescuedCount}</h2>
        </div>

        <div className="kpi-card danger">
          <h6>Avg Assignment Time</h6>
          <h2>{analytics.averageAssignmentTimeMinutes}</h2>
        </div>
      </div>

      {/* CHARTS */}
      <div className="admin-charts-grid">
        <AnalyticsCharts analytics={analytics} />
        <CityBarChart cityData={cityData} />
        <NGORankingChart ngoData={ngoData} />
        <MonthlyTrendChart trendData={trendData} />
      </div>

      {/* MAP */}
      <div className="map-card">
        <h5>📡 Live Incident Map</h5>
       <SOSMap
  sosList={activeSOS.map(s => ({
    ...s,
    latitude: s.location?.coordinates?.[1],
    longitude: s.location?.coordinates?.[0]
  }))}
  ngoLocations={ngoLocations}
  ngoSpeeds={ngoSpeeds}
/>
      </div>

      {/* TABLE */}
      <div className="sos-section">
        <h5>🚨 Active SOS Requests</h5>

        {sortedSOS.length === 0 ? (
          <p>No Active SOS</p>
        ) : (
          <table className="sos-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Disaster</th>
                <th>City</th>
                <th>Status</th>
                <th>Assigned NGO</th>
                <th>Escalations</th>
                <th>Action</th>
                <th>Override</th>
              </tr>
            </thead>

            <tbody>
              {sortedSOS.map((sos) => (
                <tr
                  key={`${sos._id}-${sos.updatedAt}`}
                  className={sos.criticalFlag ? "critical-row" : ""}
                >
                  <td>{sos.name}</td>
                  <td>{sos.disasterType}</td>
                  <td>{sos.city}</td>

                  <td>
                    <span className={`status-badge ${sos.status.toLowerCase()}`}>
                      {sos.status}
                    </span>
                  </td>

                  <td>{sos.assignedPartner?.name || "—"}</td>

                  <td>
                    {sos.escalationCount > 0 ? (
                      <span className="escalation-badge">
                        ⚠ {sos.escalationCount}
                      </span>
                    ) : "0"}
                  </td>

                  <td>
                    {sos.status !== "Rescued" && (
                      <button
                        className="admin-action-btn"
                        onClick={() => updateStatus(sos._id, "Rescued")}
                      >
                        Mark Rescued
                      </button>
                    )}
                  </td>

                  <td>
                    <button
                      className="admin-override-btn"
                      onClick={() => overrideAssign(sos._id)}
                    >
                      Reassign
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;