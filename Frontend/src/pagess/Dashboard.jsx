import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from "axios";
import {
  Thermometer,
  Gauge,
  Droplet,
  Wind,
  Compass,
  CloudRain,
  Eye,
  Waves,
  GaugeCircle 
} from 'lucide-react';



// --- Reusable Weather Card Component ---
const WeatherCard = ({ icon, title, value, unit, description }) => (
  <div className="bg-slate-600/30 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:bg-slate-600/50 hover:scale-105 ring-1 ring-white/10">
    <div>
      <div className="flex items-center gap-4">
        <div className="text-sky-400">{icon}</div>
        <h3 className="text-lg font-medium text-slate-200">{title}</h3>
      </div>
      <div className="mt-4 text-center">
        <p className="text-5xl font-bold text-white tracking-tighter">
          {value ?? "--"}
          <span className="text-2xl font-light text-slate-300 ml-2">{unit}</span>
        </p>
      </div>
    </div>
    {description && <p className="text-center text-sm text-slate-400 mt-4">{description}</p>}
  </div>
);

// --- Special Card for Recommended Speed ---
const RecommendedSpeedCard = ({ speed, reason }) => (
  <div className="bg-gradient-to-br from-sky-600/30 to-blue-700/20 backdrop-blur-lg rounded-2xl p-6 flex flex-col justify-center items-center text-center ring-1 ring-sky-400/50 transition-all duration-300 hover:ring-sky-400 hover:scale-105 col-span-1 md:col-span-2 lg:col-span-1">
    <div className="text-sky-400 mb-4">
      <GaugeCircle className="w-12 h-12" />
    </div>
    <h3 className="text-lg font-medium text-slate-200 mb-2">Recommended Speed</h3>
    <p className="text-6xl font-bold text-white tracking-tighter">
      {speed ?? "--"}
      <span className="text-2xl font-light text-slate-300 ml-2">knots</span>
    </p>
    <p className="text-sm text-slate-400 mt-4">{reason ?? "Optimal conditions for travel."}</p>
  </div>
);

// --- Main Dashboard Component ---
export default function Dashboard() {
  const [location, setLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  // --- Backend Fetch ---
  const fetchWeatherData = useCallback(async (lat, lon) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/get-data`, {
        lat,
        lon
      });

      // Map backend keys → frontend format
      const d = res.data;
      const mappedData = {
        temperature: d.temp?.toFixed ? d.temp.toFixed(1) : d.temp,
        pressure: d.pressure,
        humidity: d.humidity,
        windSpeed: d.wind_speed,
        windDirection: d.wind_direction,
        windGusts: d.wind_gusts,
        showers: d.showers,
        visibility: d.visibility ? (d.visibility / 1000).toFixed(1) : null, // convert m → km
        seaSurfaceTemp: d.sea_surface_temp,
        waveHeight: d.wave_height,
        recommendedSpeed: d.recommended_speed,
        recommendationReason: "Based on current conditions."
      };

      return { data: mappedData };
    } catch (err) {
      console.error("❌ Error fetching weather:", err);
      return { error: "Failed to fetch weather data from backend." };
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
        const { data, error } = await fetchWeatherData(latitude, longitude);
        if (data) {
          setWeatherData(data);
        } else {
          setError(error || 'An unknown error occurred.');
        }
      },
      () => {
        setError('Unable to retrieve your location. Please enable location services.');
        setIsFetching(false);
      }
    );
  }, [fetchWeatherData]);

  // --- Effect to manage the fetching interval ---
  useEffect(() => {
    if (isFetching) {
      getLocation(); // Fetch immediately
      intervalRef.current = setInterval(getLocation, 10000); // every 10s
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isFetching, getLocation]);

  const handleFetchClick = () => {
    setIsFetching(prev => !prev);
    if (!isFetching) {
      setWeatherData(null); // reset
      setLocation(null);
    }
  };

  // --- Weather Cards Config ---
  const weatherCards = [
    { id: 'temp', icon: <Thermometer className="w-8 h-8"/>, title: 'Temperature', value: weatherData?.temperature, unit: '°C' },
    { id: 'pressure', icon: <Gauge className="w-8 h-8"/>, title: 'Pressure', value: weatherData?.pressure, unit: 'hPa' },
    { id: 'humidity', icon: <Droplet className="w-8 h-8"/>, title: 'Humidity', value: weatherData?.humidity, unit: '%' },
    { id: 'windSpeed', icon: <Wind className="w-8 h-8"/>, title: 'Wind Speed', value: weatherData?.windSpeed, unit: 'm/s' },
    { id: 'windDir', icon: <Compass className="w-8 h-8"/>, title: 'Wind Direction', value: weatherData?.windDirection, unit: '°' },
    { id: 'windGusts', icon: <Wind className="w-8 h-8 stroke-red-400"/>, title: 'Wind Gusts', value: weatherData?.windGusts, unit: 'm/s' },
    { id: 'showers', icon: <CloudRain className="w-8 h-8"/>, title: 'Showers', value: weatherData?.showers, unit: 'mm' },
    { id: 'visibility', icon: <Eye className="w-8 h-8"/>, title: 'Visibility', value: weatherData?.visibility, unit: 'km' },
    { id: 'seaTemp', icon: <Thermometer className="w-8 h-8"/>, title: 'Sea Surface Temp', value: weatherData?.seaSurfaceTemp, unit: '°C' },
    { id: 'waveHeight', icon: <Waves className="w-8 h-8"/>, title: 'Wave Height', value: weatherData?.waveHeight, unit: 'm' },
  ];

  return (
    <div className="min-h-screen w-full bg-gray-900 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* --- Header Section --- */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-white">Oceanic Weather Dashboard</h1>
            <p className="text-slate-400">Real-time maritime conditions</p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button
              onClick={handleFetchClick}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 ease-in-out flex items-center justify-center gap-2 w-full sm:w-auto ${
                isFetching
                  ? 'bg-red-400 hover:bg-red-500'
                  : 'bg-sky-500 hover:bg-sky-600'
              } shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}
            >
              {isFetching ? 'Stop Fetching' : 'Fetch Location'}
            </button>
          </div>
        </header>

        {/* --- Status & Location Display --- */}
        <div className="bg-slate-900/50 rounded-lg p-4 mb-8 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isFetching ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="font-medium text-slate-300">
              Status: {isFetching ? 'Actively fetching every 10s' : 'Idle'}
            </span>
          </div>
          <div className="mt-2 sm:mt-0">
            <p className="text-slate-400">
              <span className="font-semibold text-slate-200">Location: </span>
              {location ? `Lat: ${location.lat.toFixed(4)}, Lon: ${location.lon.toFixed(4)}` : 'Awaiting location...'}
            </p>
          </div>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-4 mb-8 text-center">{error}</div>}

        {/* --- Weather Data Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {weatherCards.map(card => (
            <WeatherCard
              key={card.id}
              icon={card.icon}
              title={card.title}
              value={card.value}
              unit={card.unit}
            />
          ))}
          <RecommendedSpeedCard
            speed={weatherData?.recommendedSpeed}
            reason={weatherData?.recommendationReason}
          />
        </div>
      </div>
    </div>
  );
}
