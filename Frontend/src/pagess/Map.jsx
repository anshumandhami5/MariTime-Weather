import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
  LayerGroup,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import routesData from "/routes.json";

// --- Helper to change map view ---
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapPage() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  // Weather state
  const [selectedWeather, setSelectedWeather] = useState(null);
  const [overlayData, setOverlayData] = useState({});
  const [overlayFetching, setOverlayFetching] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // Only Route 2
  const route2 = routesData.routes[1];

  // Fetch weather from backend
  async function fetchWeather(lat, lon, forOverlay = false) {
    try {
      if (forOverlay) setOverlayFetching(true);
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/location/weather?lat=${lat}&lon=${lon}`
      );
      const data = await res.json();

      const normalized = {
        lat,
        lon,
        wind: data.wind || {},
        waves: data.waves || {},
        current: data.current || {},
        time: data.time || null,
      };

      if (forOverlay) {
        setOverlayData((prev) => ({
          ...prev,
          [`${lat}_${lon}`]: normalized,   // FIXED: no rounding
        }));
      } else {
        setSelectedWeather(normalized);
      }
    } catch (err) {
      console.error("Failed to fetch weather", err);
    } finally {
      if (forOverlay) setOverlayFetching(false);
    }
  }

  // Fetch user's current geolocation
  const fetchLocation = () => {
    setIsFetching(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsFetching(false);
      },
      () => {
        setError(
          "Location access denied. Please enable it in your browser settings."
        );
        setIsFetching(false);
      }
    );
  };

  // Overlay loader logic
  const handleToggleOverlay = async () => {
    if (!showOverlay) {
      setOverlayFetching(true);
      const promises = route2.waypoints.map(([lat, lon]) =>
        fetchWeather(lat, lon, true)
      );
      await Promise.all(promises);
      setOverlayFetching(false);
    }
    setShowOverlay((prev) => !prev);
  };

  // --- Helpers for overlay arrows ---
  const makeArrow = (lat, lon, dirDeg, color, length) => {
    if ((!dirDeg && dirDeg !== 0) || isNaN(dirDeg)) return null;
    const rad = (dirDeg * Math.PI) / 180;
    const dLat = (length / 111) * Math.cos(rad);
    const dLon =
      (length / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(rad);
    return (
      <Polyline
        key={`arrow-${lat}-${lon}-${dirDeg}-${color}`}
        positions={[
          [lat, lon],
          [lat + dLat, lon + dLon],
        ]}
        pathOptions={{ color, weight: 2 }}
      />
    );
  };

  return (
    <div className="h-screen w-full bg-gray-900 text-white flex flex-col">
      {/* --- Header --- */}
      <div className="flex-shrink-0">
        <header className="p-4 text-center">
          <h1 className="text-3xl font-bold">Global Marine Map</h1>
          <p className="text-slate-400">
            Visualize your position & marine routes
          </p>
          <p>Red: Current , Cyan: wind, Black: Wave </p>
        </header>
        <div className="px-4 pb-4 flex justify-center gap-4">
          <button
            onClick={fetchLocation}
            disabled={isFetching}
            className="px-6 py-3 rounded-lg font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-lg flex gap-2 items-center"
          >
            <MapPin className="w-5 h-5" />
            {isFetching ? "Fetching..." : "Get Current Location"}
          </button>
          <button
            onClick={handleToggleOverlay}
            className="px-6 py-3 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg"
            disabled={overlayFetching}
          >
            {overlayFetching
              ? "Fetching..."
              : showOverlay
              ? "Hide Weather Overlay"
              : "Show Weather Overlay"}
          </button>
        </div>
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-4 text-center">
            {error}
          </div>
        )}
      </div>
      {/* --- Map Container --- */}
      <div className="flex-grow w-full p-4 pt-0 relative">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          className="h-full w-full rounded-lg border border-sky-500/20 shadow-2xl"
          scrollWheelZoom={true}
          style={{ height: "100%", minHeight: "500px" }}
        >
          <ChangeView
            center={
              currentLocation ? [currentLocation.lat, currentLocation.lng] : null
            }
            zoom={currentLocation ? 6 : 2}
          />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {/* Current Location */}
          {currentLocation && (
            <CircleMarker
              center={[currentLocation.lat, currentLocation.lng]}
              radius={8}
              pathOptions={{ color: "red", fillColor: "red", fillOpacity: 0.8 }}
            >
              <Popup>
                You are here. <br />
                Lat: {currentLocation.lat.toFixed(5)}, Lng:{" "}
                {currentLocation.lng.toFixed(5)}
              </Popup>
            </CircleMarker>
          )}
          {/* Route 2 */}
          <Polyline
            positions={route2.waypoints}
            pathOptions={{ color: "lime", weight: 3 }}
          />
          {route2.waypoints.map((wp, i) => (
            <CircleMarker
              key={i}
              center={wp}
              radius={4}
              pathOptions={{
                color: "white",
                fillColor: "white",
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () => fetchWeather(wp[0], wp[1]),
              }}
            >
              <Popup>
                <strong>{route2.name}</strong> <br />
                Waypoint {i + 1}: {wp[0]}, {wp[1]} <br />
                <br />
                {selectedWeather?.lat === wp[0] &&
                selectedWeather?.lon === wp[1] ? (
                  <div>
                    🌬 Wind:{" "}
                    {selectedWeather?.wind?.speed_kn
                      ? `${selectedWeather.wind.speed_kn} kn (${selectedWeather.wind.dir_deg ?? "N/A"}°)`
                      : "Not available"}
                    <br />
                    🌊 Waves:{" "}
                    {selectedWeather?.waves?.height_m
                      ? `${selectedWeather.waves.height_m} m (${selectedWeather.waves.dir_deg ?? "N/A"}°)`
                      : "Not available"}
                    <br />
                    🌊 Current:{" "}
                    {selectedWeather?.current?.speed_kn
                      ? `${selectedWeather.current.speed_kn} kn (${selectedWeather.current.dir_deg ?? "N/A"}°)`
                      : "Not available"}
                    <br />
                    ⏰ Forecast time: {selectedWeather?.time || "N/A"}
                  </div>
                ) : (
                  <span>Click marker to load weather</span>
                )}
              </Popup>
            </CircleMarker>
          ))}
          {/* Overlay arrows */}
          {showOverlay && (
            <LayerGroup>
              {route2.waypoints.map(([lat, lon]) => {
                const key = `${lat}_${lon}`;   // FIXED: matches stored key
                const w = overlayData[key];
                if (!w) return null;
                return (
                  <React.Fragment key={key}>
                    {makeArrow(lat, lon, w.wind?.dir_deg, "cyan", 100.0)}
                    {makeArrow(lat, lon, w.current?.dir_deg, "red", 100.0)}
                    {makeArrow(lat, lon, w.waves?.dir_deg, "black", 100.0)}
                    {w.waves?.height_m && (
                      <Tooltip
                        direction="top"
                        offset={[0, -10]}
                        opacity={1.5}
                        permanent
                        position={[lat, lon]}
                      >
                        🌊 {w.waves.height_m} m
                      </Tooltip>
                    )}
                  </React.Fragment>
                );
              })}
            </LayerGroup>
          )}
        </MapContainer>

        {/* Legend box */}
        {showOverlay && (
          <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg text-sm shadow-lg">
            <strong>Overlay Legend</strong>
            <ul className="mt-2 space-y-1">
              <li>
                <span className="inline-block w-3 h-1 bg-cyan-400 mr-2"></span>
                🌬 Wind Direction
              </li>
              <li>
                <span className="inline-block w-3 h-1 bg-red-400 mr-2"></span>
                🌊 Current Direction
              </li>
              <li>
                <span className="inline-block w-3 h-1 bg-black mr-2"></span>
                🌊 Wave Direction
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
