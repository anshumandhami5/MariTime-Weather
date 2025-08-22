import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from "axios";
import {
  Thermometer,
  Wind,
  CloudRain,
  ArrowDown,
  ArrowUp,
  MapPin,
  Clock
} from 'lucide-react';

// --- Reusable Forecast Card Component ---
const ForecastCard = ({ date, tempMin, tempMax, precipitation, windSpeed }) => {
  const day = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
  const formattedDate = new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 flex flex-col transition-all duration-300 hover:bg-white/20 hover:scale-105 text-gray-300">
      <div className="text-center mb-4">
        <p className="text-lg font-bold text-white">{day}</p>
        <p className="text-sm text-gray-400">{formattedDate}</p>
      </div>
      <div className="flex-grow space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2"><Thermometer className="w-4 h-4 text-teal-400" /> Temp</span>
          <div className="font-semibold text-white flex items-center gap-2">
            <span className="flex items-center text-blue-300"><ArrowDown className="w-3 h-3"/>{tempMin ?? '--'}°</span>
            <span className="flex items-center text-red-300"><ArrowUp className="w-3 h-3"/>{tempMax ?? '--'}°</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2"><CloudRain className="w-4 h-4 text-teal-400" /> Precip.</span>
          <span className="font-semibold text-white">{precipitation ?? '--'} mm</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2"><Wind className="w-4 h-4 text-teal-400" /> Wind</span>
          <span className="font-semibold text-white">{windSpeed ?? '--'} m/s</span>
        </div>
      </div>
    </div>
  );
};

// --- Main Forecast Component ---
export default function Forecast() {
  const [location, setLocation] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  // --- Fetch from Backend Forecast API ---
  const fetchForecastData = useCallback(async (lat, lon) => {
    try {
      console.log(`🌐 Fetching forecast from backend for Lat: ${lat}, Lon: ${lon}`);
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/forecast`, {
        latitude: lat,
        longitude: lon
      });
      return { data: res.data };
    } catch (err) {
      console.error("❌ Forecast fetch error:", err.message);
      return { error: "Failed to fetch forecast data." };
    }
  }, []);

  // --- Geolocation Fetching Logic ---
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsFetching(false);
      return;
    }

    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        const { data, error } = await fetchForecastData(latitude, longitude);
        if (data) {
          setForecastData(data);
        } else {
          setError(error || 'An unknown error occurred.');
        }
      },
      () => {
        setError('Unable to retrieve your location. Please enable location services.');
        setIsFetching(false);
      }
    );
  }, [fetchForecastData]);

  // --- Effect to manage fetching interval ---
  useEffect(() => {
    if (isFetching) {
      getLocation();
      intervalRef.current = setInterval(getLocation, 10800000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isFetching, getLocation]);

  const handleFetchClick = () => {
    setIsFetching(prev => !prev);
    if (!isFetching) {
      setForecastData(null);
      setLocation(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 bg-gradient-to-b from-blue-900 to-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* --- Header Section --- */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-white">10-Day Marine Forecast</h1>
            <p className="text-gray-400">Extended maritime conditions</p>
          </div>
          <button
            onClick={handleFetchClick}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 ease-in-out flex items-center justify-center gap-2 w-full sm:w-auto ${
              isFetching ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-500 hover:bg-teal-600'
            } shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}
          >
            {isFetching ? 'Stop Fetching' : 'Fetch Location'}
          </button>
        </header>

        {/* --- Location & Timezone Display --- */}
        <div className="bg-black/20 rounded-lg p-4 mb-8 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isFetching ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="font-medium text-gray-300">
              Status: {isFetching ? 'Actively fetching every 3 hour' : 'Idle'}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-gray-400">
              <span className="flex items-center justify-center gap-2"><MapPin className="w-4 h-4 text-teal-400"/> {location ? `Lat: ${location.lat.toFixed(2)}, Lon: ${location.lon.toFixed(2)}` : 'No location'}</span>
              <span className="flex items-center justify-center gap-2"><Clock className="w-4 h-4 text-teal-400"/> Timezone: {forecastData?.location?.timezone ?? '--'}</span>
          </div>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-4 mb-8 text-center">{error}</div>}

        {/* --- Forecast Grid --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(forecastData?.forecast ?? Array(10).fill(null)).map((day, index) => (
            <ForecastCard
              key={day?.date || index}
              date={day?.date}
              tempMin={day?.temp_min}
              tempMax={day?.temp_max}
              precipitation={day?.precipitation}
              windSpeed={day?.windspeed_max}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
