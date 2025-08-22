import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// This component is a helper to change the map's view when the location is fetched.
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export default function MapPage() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  // Fetch user's current geolocation
  const fetchLocation = () => {
    setIsFetching(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsFetching(false);
      },
      (err) => {
        setError("Location access denied. Please enable it in your browser settings.");
        setIsFetching(false);
      }
    );
  };

  return (
    <div className="h-screen w-full bg-gray-900 bg-gradient-to-b from-blue-900 to-gray-900 text-white font-sans flex flex-col">
      {/* --- Header & Controls Section --- */}
      <div className="flex-shrink-0">
        <header className="p-4 text-center">
          <h1 className="text-3xl font-bold text-white">Global Marine Map</h1>
          <p className="text-gray-400">Visualize your position on the world's oceans</p>
        </header>
        
        <div className="px-4 pb-4 space-y-4 max-w-7xl mx-auto w-full">
          <div className="flex justify-center">
              <button
                onClick={fetchLocation}
                disabled={isFetching}
                className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 ease-in-out flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <MapPin className="w-5 h-5" />
                {isFetching ? 'Fetching...' : 'Get Current Location'}
              </button>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-lg p-4 text-center text-sm">
            <strong>Note:</strong> The feature to set and display actual marine routes is suspended for now, as free and reliable APIs are not available for this purpose.
          </div>
          
          {error && <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-4 text-center">{error}</div>}
        </div>
      </div>

      {/* --- Map Container --- */}
      <div className="flex-grow w-full p-4 pt-0">
        <MapContainer 
            center={[20, 0]} 
            zoom={2} 
            className="h-full w-full rounded-lg border border-teal-500/20 shadow-2xl"
            scrollWheelZoom={true}
        >
          <ChangeView center={currentLocation ? [currentLocation.lat, currentLocation.lng] : null} zoom={13} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {currentLocation && (
            <Marker position={[currentLocation.lat, currentLocation.lng]}>
              <Popup>
                You are here. <br /> Lat: {currentLocation.lat.toFixed(7)}, Lng: {currentLocation.lng.toFixed(7)}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
