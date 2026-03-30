import { useEffect, useState } from "react";
import API from "../services/api";
import CitizenMap from "../components/CitizenMap";
import "./CitizenDashboard.css";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import socket from "../services/socket"; // ✅ ADDED

const CitizenDashboard = () => {
  const name = localStorage.getItem("name");
  const userId = localStorage.getItem("userId");
  const phone = localStorage.getItem("phone");
const [isUpdating, setIsUpdating] = useState(false);
  /* ================= STATE ================= */
  const [form, setForm] = useState({});
  const [mySOS, setMySOS] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [dismissedMembers, setDismissedMembers] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [showRiskAlert, setShowRiskAlert] = useState(false);
  const [autoEvacuate, setAutoEvacuate] = useState(false);
  const [intelligence, setIntelligence] = useState(null);
  const [smartKit, setSmartKit] = useState([]);

const [animatedNGO, setAnimatedNGO] = useState({});
  /* ================= FETCH ACTIVE SOS ================= */
  useEffect(() => {
    fetchMySOS();
    const interval = setInterval(fetchMySOS, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMySOS = async () => {
    try {
      const res = await API.get("/sos/active");
      setMySOS(res.data);
    } catch {
      console.error("Failed to fetch SOS");
    }
  };

 /* ================= SOS SOCKET ================= */
useEffect(() => {
  socket.on("sosUpdated", (updatedSOS) => {

    if (updatedSOS.userId?.toString() !== userId?.toString()) return;
    setMySOS((prev) => {
      const exists = prev.find((s) => s._id === updatedSOS._id);

      if (exists) {
        return prev.map((s) =>
          s._id === updatedSOS._id ? updatedSOS : s
        );
      } else {
        return [updatedSOS, ...prev];
      }
    });
  });

  return () => socket.off("sosUpdated");
}, [userId]);


/* ================= NGO SOCKET (SEPARATE) ================= */
useEffect(() => {
  const animateMovement = (id, start, end) => {
    const steps = 20;
    let current = 0;

    const latStep = (end.latitude - start.latitude) / steps;
    const lngStep = (end.longitude - start.longitude) / steps;

    const interval = setInterval(() => {
      current++;

      setAnimatedNGO((prev) => ({
        ...prev,
        [id]: {
          latitude: start.latitude + latStep * current,
          longitude: start.longitude + lngStep * current
        }
      }));

      if (current >= steps) clearInterval(interval);
    }, 80); // 🔥 smooth speed
  };

  const handler = (data) => {
    if (!data?.userId) return;

    const id = data.userId.toString();

    setAnimatedNGO((prev) => {
      const prevLoc = prev[id];

      if (!prevLoc) {
        return {
          ...prev,
          [id]: {
            latitude: data.latitude,
            longitude: data.longitude
          }
        };
      }

      animateMovement(id, prevLoc, {
        latitude: data.latitude,
        longitude: data.longitude
      });

      return prev;
    });
  };

  socket.on("ngoLocationBroadcast", handler);

  return () => socket.off("ngoLocationBroadcast", handler);
}, []);

  /* ================= FETCH GROUP MEMBERS ================= */
  useEffect(() => {
    fetchGroupMembers();
    const interval = setInterval(fetchGroupMembers, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchGroupMembers = async () => {
  try {
    const [familyRes, societyRes] = await Promise.all([
      API.get("/group/members?type=family"),
      API.get("/group/members?type=society")
    ]);

    const combinedMembers = [
      ...(familyRes.data || []),
      ...(societyRes.data || [])
    ];

    setGroupMembers(combinedMembers);

  } catch (err) {
    console.error("Failed to fetch group members", err);
  }
};

  /* ================= DETECT HIGH RISK MEMBER ================= */
useEffect(() => {
  if (criticalMember) return; // ✅ prevent repeated trigger

  const highRisk = groupMembers.find(
    (m) =>
      (m.groupAlert === true || m.lastRiskLevel === "High") &&
      !dismissedMembers.includes(m._id)
  );

  if (highRisk) {
    setCriticalMember(highRisk);
    setShowRiskAlert(true); // ✅ control alert visibility
  }
}, [groupMembers, dismissedMembers]);

  /* ================= INTELLIGENCE ================= */
 useEffect(() => {
  fetchIntelligence();

  const interval = setInterval(() => {
    // ❌ Don't override while user interacting
    if (!isUpdating) {
      fetchIntelligence();
    }
  }, 15000);

  return () => clearInterval(interval);
}, []);

  const fetchIntelligence = async () => {
    try {
      const res = await API.get("/preparedness/intelligence");
      setIntelligence(res.data);
    } catch {
      console.error("Failed to fetch intelligence");
    }
  };
useEffect(() => {
  socket.on("newSOS", () => {
    fetchGroupMembers(); // refresh group
  });

  return () => socket.off("newSOS");
}, []);
useEffect(() => {
  if (!intelligence?.smartKit) return;

  const kitItems = intelligence.smartKit;
  const userItems = intelligence.userPreparedness?.selectedItems || [];

  const merged = kitItems.map((item) => {
    const found = userItems.find((u) => u.name === item.name);

    return {
      ...item,
      completed: found ? found.completed : false
    };
  });

  setSmartKit(merged);
}, [intelligence]);
  /* ================= PANIC SOS ================= */
  const handlePanic = () => {
    if (!navigator.geolocation)
      return alert("Geolocation not supported");

    if (!userId) {
      alert("Session expired. Please login again.");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      await API.post("/sos", {
  userId,
  name,
  phone,
  disasterType: "Emergency",
  city: "Auto Location",
  message: "Panic button triggered",
  location: {
    type: "Point",
    coordinates: [
      pos.coords.longitude,
      pos.coords.latitude
    ]
  }
});

      alert("🚨 Emergency SOS Sent!");
      fetchMySOS();
    });
  };

  /* ================= MANUAL SOS ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!navigator.geolocation)
      return alert("Geolocation not supported");

    if (!userId) {
      alert("Session expired. Please login again.");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      await API.post("/sos", {
  userId,
  name,
  phone,
  disasterType: form.disasterType,
  message: form.message,
  city: "Auto Location",
  location: {
    type: "Point",
    coordinates: [
      pos.coords.longitude,
      pos.coords.latitude
    ]
  }
});

      alert("SOS Sent Successfully 🚨");
      setForm({});
      fetchMySOS();
    });
  };

  /* ================= CURRENT RISK ================= */
  const getCurrentRisk = () => {
    const active = mySOS.filter(
      (s) => s.status !== "Rescued" && s.status !== "Closed"
    ).length;

    if (active >= 2) return { level: "High", color: "red" };
    if (active === 1) return { level: "Moderate", color: "orange" };
    return { level: "Low", color: "green" };
  };

  const risk = getCurrentRisk();

  /* ================= FORECAST ================= */
  const calculateForecast = () => {
    const active = mySOS.filter(
      (s) => s.status !== "Rescued" && s.status !== "Closed"
    );

    const escalated = active.filter(
      (s) => s.escalationCount > 0
    ).length;

    if (escalated >= 1 && active.length >= 2)
      return { forecast: "High", trend: "Increasing", arrow: "↑" };

    if (active.length === 1)
      return { forecast: "Moderate", trend: "Stable", arrow: "→" };

    return { forecast: "Low", trend: "Stable", arrow: "→" };
  };

  const forecast = calculateForecast();

  /* ================= SMART KIT ================= */
const handleToggle = async (name, completed) => {

  // ✅ 1. Optimistic UI update (instant)
  setSmartKit(prev =>
    prev.map(item =>
      item.name === name
        ? { ...item, completed }
        : item
    )
  );

  try {
    // ✅ 2. Send correct data to backend
    const res = await API.patch("/preparedness/kit-item", {
      disasterType: intelligence?.primaryDisaster,
      name,
      completed
    });

    // ✅ 3. Sync with backend (single source of truth)
    if (res.data?.prep?.selectedItems) {
      setSmartKit(res.data.prep.selectedItems);
    }

  } catch (error) {
    console.error("Toggle failed:", error);

    // 🔁 OPTIONAL: rollback UI if API fails
    setSmartKit(prev =>
      prev.map(item =>
        item.name === name
          ? { ...item, completed: !completed }
          : item
      )
    );
  }
};

  const getPrepColor = (value) => {
    if (value >= 75) return "#22c55e";
    if (value >= 50) return "#3b82f6";
    if (value >= 30) return "#f59e0b";
    return "#ef4444";
  };

  const dismissAlert = () => {
    if (!criticalMember) return;

    setAlertHistory((prev) => [
      ...prev,
      { ...criticalMember, dismissedAt: new Date() }
    ]);

    setDismissedMembers((prev) => [
      ...prev,
      criticalMember._id
    ]);

    setCriticalMember(null);
  };
  const filteredNGO = {};

mySOS.forEach((sos) => {
  const id =
    typeof sos.assignedResponder === "object"
      ? sos.assignedResponder?._id?.toString()
      : sos.assignedResponder?.toString();

  if (id && animatedNGO[id]) {
    filteredNGO[id] = animatedNGO[id];
  }
});

console.log("ANIMATED NGO:", animatedNGO);
console.log("FILTERED NGO:", filteredNGO);
console.log("MY SOS:", mySOS.map(s => ({
  id: s._id,
  responder: s.assignedResponder
})));
 return (
  <div className="dashboard-container">

    {/* ================= HEADER ================= */}
    <div className="header">
      <div>
        <h4>🛡 Welcome {name}</h4>
        <div className="risk-box">
          <span
            className="risk-indicator"
            style={{ backgroundColor: risk.color }}
          ></span>
          <strong>{risk.level} Risk Area</strong>
        </div>
      </div>

      <div className="forecast-box">
        <p><strong>Forecast:</strong> {forecast.forecast}</p>
        <p><strong>Trend:</strong> {forecast.trend} {forecast.arrow}</p>
      </div>
    </div>

    {/* ================= TOP INTELLIGENCE ROW ================= */}
    {intelligence && (
      <div className="top-intelligence-row">

  {/* ERI CARD */}
  <div className="int-card eri-card">
    <div style={{ width: 170 }}>
      <CircularProgressbar
        value={intelligence.eri}
        text={`${intelligence.eri}`}
        styles={buildStyles({
          pathColor:
            intelligence.status === "Safe"
              ? "#22c55e"
              : intelligence.status === "Moderate"
              ? "#eab308"
              : "#ef4444",
          textColor: "#ffffff",
          trailColor: "#1f2937",
          pathTransitionDuration: 0.6
        })}
      />
    </div>

    <p className={`eri-status ${intelligence.status.toLowerCase()}`}>
      {intelligence.status}
    </p>
  </div>


  {/* FAMILY PREPAREDNESS */}
  <div className="int-card prep-card">
    <h6 className="prep-title">Family Preparedness</h6>

    <div style={{ width: 120 }}>
      <CircularProgressbar
        value={intelligence.familyScore}
        text={`${intelligence.familyScore}%`}
        styles={buildStyles({
          pathColor: getPrepColor(intelligence.familyScore),
          textColor: "#ffffff",
          trailColor: "#1f2937",
          pathTransitionDuration: 0.6
        })}
      />
    </div>
  </div>


  {/* PERSONAL PREPAREDNESS */}
  <div className="int-card prep-card">
    <h6 className="prep-title">Personal Preparedness</h6>

    <div style={{ width: 120 }}>
      <CircularProgressbar
        value={intelligence.personalScore}
        text={`${intelligence.personalScore}%`}
        styles={buildStyles({
          pathColor: getPrepColor(intelligence.personalScore),
          textColor: "#ffffff",
          trailColor: "#1f2937",
          pathTransitionDuration: 0.6
        })}
      />
    </div>
  </div>

</div>
    )}

    {/* ================= MAP ================= */}
   {/* ================= MAP ================= */}
<div className="map-section">
 <CitizenMap
  autoEvacuate={autoEvacuate}
  criticalMember={criticalMember}
  mySOS={mySOS}
  animatedNGO={filteredNGO}
/>
</div>

    {/* ================= BOTTOM GRID ================= */}
    <div className="bottom-grid mt-5">

      {/* ACTION PANEL */}
      <div className="card-panel">
        <h5>⚡ Emergency Actions</h5>
        <button
          className="btn btn-danger w-100 mb-3"
          onClick={handlePanic}
        >
          🚨 Panic SOS
        </button>

        <form onSubmit={handleSubmit}>
          <input
            className="form-control mb-2"
            placeholder="Disaster Type"
            value={form.disasterType || ""}
            onChange={(e) =>
              setForm({ ...form, disasterType: e.target.value })
            }
          />
          <textarea
            className="form-control mb-2"
            placeholder="Message"
            value={form.message || ""}
            onChange={(e) =>
              setForm({ ...form, message: e.target.value })
            }
          />
          <button className="btn btn-warning w-100">
            Send Manual SOS
          </button>
        </form>
      </div>

      {/* SMART KIT */}
      <div className="card-panel">
  <h5>🧰 Smart Preparedness Kit</h5>

  {smartKit.length > 0 ? (
    smartKit.map((item) => (
      <div key={item.name} className="form-check mb-2">
        <input
          type="checkbox"
          className="form-check-input"
         checked={!!item.completed}
         onChange={(e) => {
  console.log("CLICK:", item.name, e.target.checked);
  handleToggle(item.name, e.target.checked);
}}
          
        />
        <label className="form-check-label">
          {item.name}
        </label>
      </div>
    ))
  ) : (
    <p className="text-muted">No kit available</p>
  )}
</div>

      {/* RECOMMENDED KIT */}
     {intelligence && (
  <div className="card-panel">
    <h5>
      🔥 Recommended Kit ({intelligence.primaryDisaster || "None"})
    </h5>

    {intelligence.recommendedKit?.length > 0 ? (
      intelligence.recommendedKit.map((item) => (
        <div key={item._id} className="kit-item">
          <strong>{item.name}</strong>
          {item.description && (
            <p className="text-muted">{item.description}</p>
          )}
        </div>
      ))
    ) : (
      <p className="text-muted">
        No recommended kit for this disaster.
      </p>
    )}
  </div>
)}

      {/* PSYCHOLOGICAL */}
      {intelligence && (
        <div className="card-panel">
          <h5>🧠 Psychological Readiness</h5>

          {[
            "Know nearest shelter",
            "Emergency contacts memorized",
            "Family evacuation plan discussed"
          ].map((question) => (
            <div key={question} className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                onChange={async (e) => {
                  await API.patch("/preparedness/psychological", {
                    question,
                    completed: e.target.checked
                  });
                  fetchIntelligence();
                }}
              />
              <label className="form-check-label">
                {question}
              </label>
            </div>
          ))}
        </div>
      )}

    </div>

    {/* ================= GROUP ALERT ================= */}
    {criticalMember && (
      <div className="risk-alert-overlay ">
        <div className="risk-alert-box">
          <h4>⚠ FAMILY / SOCIETY ALERT</h4>
          <p>
            <strong>{criticalMember.name}</strong> is in
            <span style={{ color: "yellow" }}> HIGH RISK</span>
          </p>
          <button
            className="btn btn-outline-light mt-2"
            onClick={dismissAlert}
          >
            Dismiss
          </button>
        </div>
      </div>
    )}

    {/* ================= ALERT HISTORY ================= */}
    {alertHistory.length > 0 && (
      <div className="alert-history mt-5">
        <h6>📜 Alert History</h6>
        {alertHistory.map((a) => (
          <div key={a._id}>
            {a.name} dismissed at{" "}
            {new Date(a.dismissedAt).toLocaleTimeString()}
          </div>
        ))}
      </div>
    )}

  </div>
);
};

export default CitizenDashboard;