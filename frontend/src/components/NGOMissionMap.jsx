import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";

import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./NGOMap.css";
/* ===============================
   AUTO FIT MAP (ONLY FIRST TIME)
================================= */
const FitBounds = ({ coords }) => {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (coords.length > 0 && !hasFitted.current) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
      hasFitted.current = true;
    }
  }, [coords, map]);

  return null;
};

const NGOMissionMap = ({ memberLocation, sos }) => {
  const [routeCoords, setRouteCoords] = useState([]);
  const [animatedPosition, setAnimatedPosition] = useState(null);
  const lastFetchRef = useRef(null);

  /* ===============================
     ICONS
  ================================= */

  const responderIcon = L.divIcon({
    className: "responder-icon",
    html: `<div class="pulse-dot"></div>`
  });

  const sosIcon = L.divIcon({
    className: "blinking-marker",
    html: `<div></div>`
  });

  const isValidCoord = (lat, lng) =>
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng);

  /* ===============================
     SMOOTH MOVEMENT
  ================================= */
  useEffect(() => {
    if (!memberLocation) return;

    const target = [memberLocation.latitude, memberLocation.longitude];

    if (!animatedPosition) {
      setAnimatedPosition(target);
      return;
    }

    let start = animatedPosition;
    let step = 0;
    const steps = 20;

    const interval = setInterval(() => {
      step++;

      const lat = start[0] + ((target[0] - start[0]) * step) / steps;
      const lng = start[1] + ((target[1] - start[1]) * step) / steps;

      setAnimatedPosition([lat, lng]);

      if (step >= steps) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);

  }, [memberLocation]);

  /* ===============================
     ROUTE FETCH (OPTIMIZED)
  ================================= */
  useEffect(() => {
    const getRoute = async () => {
      if (!memberLocation || !sos) return;

      if (!isValidCoord(memberLocation.latitude, memberLocation.longitude)) return;
      if (!isValidCoord(sos.latitude, sos.longitude)) return;

      const movedDistance =
        Math.abs(memberLocation.latitude - (lastFetchRef.current?.lat || 0)) +
        Math.abs(memberLocation.longitude - (lastFetchRef.current?.lng || 0));

      if (movedDistance < 0.001) return;

      lastFetchRef.current = {
        lat: memberLocation.latitude,
        lng: memberLocation.longitude
      };

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${memberLocation.longitude},${memberLocation.latitude};${sos.longitude},${sos.latitude}?overview=full&geometries=geojson`
        );

        const data = await response.json();

        if (!data.routes || !data.routes[0]) {
          setRouteCoords([
            [memberLocation.latitude, memberLocation.longitude],
            [sos.latitude, sos.longitude]
          ]);
          return;
        }

        const coords = data.routes[0].geometry.coordinates.map((c) => [
          c[1],
          c[0]
        ]);

        setRouteCoords(coords);

      } catch (err) {
        console.error("Route fetch failed");

        setRouteCoords([
          [memberLocation.latitude, memberLocation.longitude],
          [sos.latitude, sos.longitude]
        ]);
      }
    };

    getRoute();
  }, [memberLocation, sos]);

  /* ===============================
     ARRIVAL DETECTION
  ================================= */
  useEffect(() => {
    if (!memberLocation || !sos) return;

    const distance = Math.sqrt(
      Math.pow(memberLocation.latitude - sos.latitude, 2) +
      Math.pow(memberLocation.longitude - sos.longitude, 2)
    );

    if (distance < 0.0005) {
      console.log("🚑 Reached SOS location");
    }
  }, [memberLocation, sos]);

  if (!memberLocation || !sos) return null;
  if (!isValidCoord(sos.latitude, sos.longitude)) return null;

  return (
    <div
      style={{
        height: "300px",
        marginTop: "20px",
        borderRadius: "20px",
        overflow: "hidden"
      }}
    >
      <MapContainer
        center={[sos.latitude, sos.longitude]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🚑 RESPONDER */}
        <Marker
          position={
            animatedPosition || [
              memberLocation.latitude,
              memberLocation.longitude
            ]
          }
          icon={responderIcon}
        >
          <Popup>🚑 Responder Location</Popup>
        </Marker>

        {/* 🚨 SOS */}
        <Marker
          position={[sos.latitude, sos.longitude]}
          icon={sosIcon}
        >
          <Popup>
            🚨 <strong>{sos.name}</strong><br />
            Disaster: {sos.disasterType}<br />
            Phone: {sos.phone}
          </Popup>
        </Marker>

        {/* ROUTE */}
        {routeCoords.length > 0 && (
          <>
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: "lime",
                weight: 6,
                opacity: 0.9
              }}
            />
            <FitBounds coords={routeCoords} />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default NGOMissionMap;