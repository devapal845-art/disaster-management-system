
import { useEffect, useState } from "react";
import API from "../services/api";
import SOSMap from "../components/SOSMap";
import "./NGODashboard.css";
import socket from "../services/socket";

const NGOCommandDashboard = () => {

  const [ngoSOS, setNgoSOS] = useState([]);
  const [members, setMembers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [memberLocations, setMemberLocations] = useState({}); // 🔥 NEW

  const ngoId = localStorage.getItem("userId");
  const name = localStorage.getItem("name");

  /* ================= FETCH DATA ================= */

  const fetchData = async () => {
    try {
      const sosRes = await API.get("/sos/ngo/missions"); // ✅ FIXED ROUTE
      const memberRes = await API.get(`/ngo/${ngoId}/members`);
      const analyticsRes = await API.get(`/ngo/${ngoId}/analytics`);

      const sortedSOS = sosRes.data.sort((a, b) => {
        if (a.criticalFlag && !b.criticalFlag) return -1;
        if (!a.criticalFlag && b.criticalFlag) return 1;
        return 0;
      });

      setNgoSOS(sortedSOS);
      setMembers(memberRes.data);
      setAnalytics(analyticsRes.data);

    } catch (err) {
      console.error("NGO Admin fetch error:", err.message);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  /* ================= SOCKET (REAL-TIME) ================= */

  useEffect(() => {

    // 🔥 SOS update
    socket.on("sosUpdated", () => {
      fetchData();
    });

    // 🔥 MEMBER LIVE LOCATION
    socket.on("ngoLocationBroadcast", (data) => {

      if (!data?.userId) return;

      setMemberLocations((prev) => ({
        ...prev,
        [data.userId.toString()]: {
          latitude: data.latitude,
          longitude: data.longitude
        }
      }));

    });

    return () => {
      socket.off("sosUpdated");
      socket.off("ngoLocationBroadcast");
    };

  }, []);

  /* ================= ASSIGN MEMBER ================= */

  const assignMember = async (sosId, memberId) => {
    try {
      await API.patch(`/sos/${sosId}/assign`, { memberId }); // ✅ FIXED

      fetchData();
    } catch (error) {
      console.error("Assignment failed:", error.message);
    }
  };

  /* ================= LOGOUT ================= */

  const logout = () => {
    socket.disconnect();
    localStorage.clear();
    window.location.href = "/";
  };
console.log("NGO SOS:", ngoSOS);
  return (
    <div className="ngo-container">

      {/* HEADER */}
      <div className="ngo-header">
        <div>
          <h2>🏢 {name} Command Center</h2>
          <p>NGO Mission Control</p>
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>

      {/* KPI */}
      {analytics && (
        <div className="ngo-kpi-row">

          <div className="ngo-kpi-card">
            <h6>Total Missions</h6>
            <h2>{analytics.totalMissions}</h2>
          </div>

          <div className="ngo-kpi-card warning">
            <h6>Active Missions</h6>
            <h2>{analytics.activeMissions}</h2>
          </div>

          <div className="ngo-kpi-card success">
            <h6>Completed</h6>
            <h2>{analytics.completed}</h2>
          </div>

          <div className="ngo-kpi-card dark">
            <h6>Team Members</h6>
            <h2>{members.length}</h2>
          </div>

        </div>
      )}

      {/* MAP */}
      <div className="ngo-map-section">
        <h4>🛰 Mission Map</h4>

        <SOSMap
  sosList={ngoSOS.map(s => ({
    ...s,
    latitude: s.location?.coordinates?.[1],
    longitude: s.location?.coordinates?.[0]
  }))}
  memberLocations={memberLocations}
/>
      </div>

      {/* SOS MISSIONS */}
      <div className="ngo-section ">

        <h4>🚨 Assigned SOS Missions</h4>

        {ngoSOS.length === 0 ? (
          <p>No missions assigned</p>
        ) : (
          <div className="ngo-mission-grid mt-3">

            {ngoSOS.map((sos) => (

              <div
                key={sos._id}
                className={`mission-card ${sos.criticalFlag ? "critical-border" : ""}`}
              >

                <div className="mission-header">
                  <h3>{sos.name || "SOS Request"}</h3>

                  <span className={`ngo-status ${sos.status?.toLowerCase()}`}>
                    {sos.status}
                  </span>
                </div>

                <p><strong>Disaster:</strong> {sos.disasterType}</p>
                <p><strong>City:</strong> {sos.city}</p>

                <p>
                  <strong>Assigned Member:</strong>{" "}
{sos.assignedResponder?.name || "Not Assigned"}
                </p>

                {sos.criticalFlag && (
                  <span className="critical-badge">CRITICAL</span>
                )}

                {/* ASSIGN */}
                <select
                  onChange={(e) =>
                    assignMember(sos._id, e.target.value)
                  }
                  defaultValue=""
                >
                  <option value="" disabled>
                    Assign Member
                  </option>

                  {members
                    .filter((m) => m.availability === "Available")
                    .map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name}
                      </option>
                    ))}
                </select>

              </div>

            ))}

          </div>
        )}

      </div>

      {/* TEAM */}
      <div className="ngo-section">

        <h4>👨‍🚒 Rescue Team</h4>

        <div className="member-grid">

          {members.map((member) => {

            const live = memberLocations[member._id];

            return (
              <div key={member._id} className="member-card">

                <h5>{member.name}</h5>

                <p>
                  Status:
                  <span
                    className={
                      member.availability === "Available"
                        ? "available"
                        : "busy"
                    }
                  >
                    {" "} {member.availability}
                  </span>
                </p>

                <p>Total Rescues: {member.totalRescues}</p>

                <p>
                  Avg Response:{" "}
                  {member.avgResponseTime
                    ? member.avgResponseTime.toFixed(1)
                    : 0} min
                </p>

                {/* 🔥 LIVE LOCATION */}
                {live && (
                  <p style={{ color: "green" }}>
                    📍 Live Tracking Active
                  </p>
                )}

              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
};

export default NGOCommandDashboard;

