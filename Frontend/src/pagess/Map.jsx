import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin } from "lucide-react";
import routesData from "/routes.json";  // ✅ import routes JSON

// Tiny waypoint marker
const smallIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [12, 20],   // smaller than default [25, 41]
  iconAnchor: [6, 20],  // anchor point (bottom center)
  popupAnchor: [0, -20] // popup offset
});

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

// --- Default marker icons ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

export default function MapPage() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  // New state for weather
  const [selectedWeather, setSelectedWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch weather from backend
  async function fetchWeather(lat, lon) {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/location/weather?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setSelectedWeather({ lat, lon, ...data });
    } catch (err) {
      console.error("Failed to fetch weather", err);
    } finally {
      setLoading(false);
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
        setError("Location access denied. Please enable it in your browser settings.");
        setIsFetching(false);
      }
    );
  };

  return (
    <div className="h-screen w-full bg-gray-900 text-white flex flex-col">
      {/* --- Header --- */}
      <div className="flex-shrink-0">
        <header className="p-4 text-center">
          <h1 className="text-3xl font-bold">Global Marine Map</h1>
          <p className="text-slate-400">Visualize your position & marine routes</p>
        </header>

        <div className="px-4 pb-4 flex justify-center">
          <button
            onClick={fetchLocation}
            disabled={isFetching}
            className="px-6 py-3 rounded-lg font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-lg"
          >
            <MapPin className="w-5 h-5" />
            {isFetching ? "Fetching..." : "Get Current Location"}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-4 text-center">
            {error}
          </div>
        )}
      </div>

      {/* --- Map Container --- */}
      <div className="flex-grow w-full p-4 pt-0">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          className="h-full w-full rounded-lg border border-sky-500/20 shadow-2xl"
          scrollWheelZoom={true}
        >
          <ChangeView
            center={currentLocation ? [currentLocation.lat, currentLocation.lng] : null}
            zoom={currentLocation ? 6 : 2}
          />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Current Location */}
          {currentLocation && (
            <Marker position={[currentLocation.lat, currentLocation.lng]}>
              <Popup>
                You are here. <br />
                Lat: {currentLocation.lat.toFixed(5)}, Lng: {currentLocation.lng.toFixed(5)}
              </Popup>
            </Marker>
          )}

          {/* Routes from JSON */}
          {routesData.routes.map((route, idx) => (
            <React.Fragment key={idx}>
              <Polyline
                positions={route.waypoints}
                pathOptions={{ color: idx === 0 ? "cyan" : "lime", weight: 3 }}
              />
              {route.waypoints.map((wp, i) => (
                <Marker
                  key={i}
                  position={wp}
                  icon={smallIcon}
                  eventHandlers={{
                    click: () => fetchWeather(wp[0], wp[1])
                  }}
                >
                  <Popup>
                    <strong>{route.name}</strong> <br />
                    Waypoint {i + 1}: {wp[0]}, {wp[1]} <br /><br />

                    {loading && selectedWeather?.lat === wp[0] && selectedWeather?.lon === wp[1] ? (
                    <span>Loading weather...</span>
                      ) : selectedWeather?.lat === wp[0] && selectedWeather?.lon === wp[1] ? (
                    <div>
                    {/* Wind */}
                      {selectedWeather?.wind?.speed_kn
                      ? <>🌡 Wind: {selectedWeather.wind.speed_kn} kn ({selectedWeather.wind.dir_deg ?? "N/A"}°)<br /></>
                      : <>🌡 Wind: Not available<br /></>}

                        {/* Waves */}
                      {selectedWeather?.waves?.height_m
                      ? <>🌊 Waves: {selectedWeather.waves.height_m} m ({selectedWeather.waves.dir_deg ?? "N/A"}°)<br /></>
                      : <>🌊 Waves: Not available<br /></>}

                      {/* Currents */}
                      {selectedWeather?.current?.speed_kn
                      ? <>🌊 Current: {selectedWeather.current.speed_kn} kn ({selectedWeather.current.dir_deg ?? "N/A"}°)<br /></>
                      : <>🌊 Current: Not available<br /></>}

                      ⏰ Forecast time: {selectedWeather?.time || "N/A"}
                    </div>
                    ) : (
                    <span>Click marker to load weather</span>
                    )}
                </Popup>

                </Marker>
              ))}
            </React.Fragment>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
