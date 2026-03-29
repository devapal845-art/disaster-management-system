import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

const HeatmapLayer = ({ alerts }) => {
  const map = useMap();

  useEffect(() => {
    if (!alerts || alerts.length === 0) return;

    const heatPoints = alerts.map(alert => [
      alert.location.coordinates[1], // lat
      alert.location.coordinates[0], // lng
      alert.riskScore ? alert.riskScore / 100 : 0.5 // normalize 0–1
    ]);

    const heat = L.heatLayer(heatPoints, {
      radius: 30,
      blur: 20,
      maxZoom: 17,
      gradient: {
        0.2: "green",
        0.5: "yellow",
        0.8: "orange",
        1.0: "red"
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [alerts, map]);

  return null;
};

export default HeatmapLayer;