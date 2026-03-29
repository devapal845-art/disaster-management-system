import { MapContainer, TileLayer, Circle, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import API from "../services/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const AdvancedRiskMap = () => {
  const [position, setPosition] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [riskLevel, setRiskLevel] = useState("LOW");
  const [riskScore, setRiskScore] = useState(0);

  useEffect(() => {
    navigator.geolocation.watchPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setPosition([lat, lng]);

      const res = await API.get(
        `/risk?lat=${lat}&lng=${lng}`
      );

      setAlerts(res.data.alerts);
      setRiskLevel(res.data.riskLevel);
      setRiskScore(res.data.personalRiskScore);

      if (res.data.riskLevel === "CRITICAL") {
        alert("🚨 You are entering a critical danger zone!");
      }
    });
  }, []);

  if (!position) return <p>Loading map...</p>;

  return (
    <div>
      <h5>
        Personal Risk Level:
        <span className="text-danger ms-2">
          {riskLevel} ({riskScore.toFixed(2)})
        </span>
      </h5>

      <MapContainer
        center={position}
        zoom={10}
        style={{ height: "500px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={position}>
          <Popup>Your Location</Popup>
        </Marker>

        {alerts.map((alert) => (
          <Circle
            key={alert._id}
            center={[
              alert.location.coordinates[1],
              alert.location.coordinates[0]
            ]}
            radius={alert.riskScore * 100}
            pathOptions={{
              color:
                alert.severity === "Severe"
                  ? "red"
                  : alert.severity === "High"
                  ? "orange"
                  : "yellow",
              fillOpacity: 0.4
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default AdvancedRiskMap;