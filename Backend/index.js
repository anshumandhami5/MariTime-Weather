// backend/server.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

const app = express();
app.use(express.json());
dotenv.config();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
  })
);

const WEATHER_CACHE = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const MIN_DISTANCE = 1.0; // km
const WEATHER_CHANGE_THRESHOLD = {
  temp: 0.5,
  pressure: 2,
  wind: 1.0,
};

// haversine omitted for brevity...
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function hasWeatherChanged(oldData, newData) {
  if (!oldData || !newData) return true;
  if (
    Math.abs(newData.temp - oldData.temp) > WEATHER_CHANGE_THRESHOLD.temp ||
    Math.abs(newData.pressure - oldData.pressure) >
      WEATHER_CHANGE_THRESHOLD.pressure ||
    Math.abs(newData.windspeed - oldData.windspeed) >
      WEATHER_CHANGE_THRESHOLD.wind
  )
    return true;
  return false;
}

function extractFeatures(apiData, marineData) {
  return {
    temp: apiData?.temperature_2m ?? null,
    pressure: apiData?.surface_pressure ?? null,
    humidity: apiData?.relativehumidity_2m ?? null,
    wind_speed: apiData?.windspeed_10m ?? null,
    wind_direction: apiData?.winddirection_10m ?? null,
    wind_gusts: apiData?.windgusts_10m ?? null,
    showers: apiData?.showers ?? null,
    visibility: apiData?.visibility ?? null,

    // Marine features
    sea_surface_temp: marineData?.sea_surface_temperature ?? null,
    wave_height: marineData?.wave_height ?? null,
  };
}

function mlInputFilter(features) {
  return {
    wind_direction: features.wind_direction,
    pressure: features.pressure,
    wind_speed: features.wind_speed,
    wave_height: features.wave_height,
    sea_surface_temp: features.sea_surface_temp,
    visibility: features.visibility,
  };
}

app.post("/get-data", async (req, res) => {
  const { lat, lon } = req.body;
  const key = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = WEATHER_CACHE[key];
  const isCacheValid = cached && Date.now() - cached.timestamp < CACHE_DURATION;
  const movedFar = cached
    ? haversine(lat, lon, cached.lat, cached.lon) > MIN_DISTANCE
    : false;

  let features,
    recommended_speed = null;

  if (isCacheValid && !movedFar) {
    console.log("✅ Using cached weather + prediction");
    ({ features, recommended_speed } = cached);
  } else {
    console.log("🌐 Fetching fresh weather from Open-Meteo");
    try {
      const weatherParams = [
        "temperature_2m",
        "relativehumidity_2m",
        "surface_pressure",
        "windspeed_10m",
        "winddirection_10m",
        "windgusts_10m",
        "showers",
        "visibility",
      ].join(",");

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${weatherParams}&windspeed_unit=ms&timeformat=unixtime`;

      const marineParams = ["wave_height", "sea_surface_temperature"].join(",");
      const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=${marineParams}&timeformat=unixtime`;

      const [weatherRes, marineRes] = await Promise.all([
        axios.get(weatherUrl),
        axios.get(marineUrl),
      ]);

      const currentWeather =
        weatherRes.data.current_weather || weatherRes.data.current;
      const currentMarine =
        marineRes.data.current_weather || marineRes.data.current;

      features = extractFeatures(currentWeather, currentMarine);

      let needNewPrediction = true;
      if (cached && !hasWeatherChanged(cached.features, features)) {
        console.log("Reusing old ML prediction");
        recommended_speed = cached.recommended_speed;
        needNewPrediction = false;
      }

      if (needNewPrediction) {
        try {
          const mlRes = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, {
            features: mlInputFilter(features),
          });
          recommended_speed = mlRes.data.predicted_ship_speed_knots;
          console.warn("ML prediction successful");
        } catch (mlErr) {
          console.warn("⚠️ ML service not available, continuing without prediction");
          recommended_speed = null;
        }
      }

      
      WEATHER_CACHE[key] = {
        features,
        recommended_speed,
        lat,
        lon,
        timestamp: Date.now(),
      };
    } catch (err) {
      console.error("Weather API error:", err.message);
      return res.status(500).json({ error: "Open-Meteo service failure" });
    }
  }

  res.json({
    ...features,
    recommended_speed,
  });
});

app.post("/forecast", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and Longitude are required" });
    }

    // Open-Meteo 10-day forecast API
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&forecast_days=10&timezone=auto`;

    const response = await axios.get(url);

    const { daily } = response.data;

    // Convert into array of objects (easy for frontend)
    const formattedData = daily.time.map((date, index) => ({
      date,
      temp_max: daily.temperature_2m_max[index],
      temp_min: daily.temperature_2m_min[index],
      precipitation: daily.precipitation_sum[index],
      windspeed_max: daily.windspeed_10m_max[index],
    }));

    res.json({
      location: {
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        timezone: response.data.timezone,
      },
      forecast: formattedData,
    });
    
  } catch (error) {
    console.error("Error fetching forecast:", error.message);
    res.status(500).json({ error: "Failed to fetch forecast data" });
  }
});

app.get("/api/location/weather", async (req, res) => {
  let { lat, lon, time } = req.query;

  // Convert to numbers
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  // Validate
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: "Invalid lat/lon provided" });
  }

  try {
    // 1️⃣ Get Waves from Open-Meteo Marine (no wind here)
    const omUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,wave_direction,wave_period&timezone=UTC`;
    console.log("🌊 Fetching Open-Meteo:", omUrl);

    const openMeteoRes = await axios.get(omUrl);
    const omData = openMeteoRes.data;

    // Pick closest hour (or 0 if no time given)
    let idx = 0;
    if (time && omData.hourly?.time) {
      idx = omData.hourly.time.findIndex((t) => t.startsWith(time.slice(0, 13)));
      if (idx === -1) idx = 0;
    }

    // 2️⃣ Get Wind + Currents from StormGlass
    let windSpeed = null;
    let windDirection = null;
    let currentSpeed = null;
    let currentDirection = null;

    try {
      const sgUrl = `https://api.stormglass.io/v2/weather/point?lat=${latitude}&lng=${longitude}&params=windSpeed,windDirection,currentSpeed,currentDirection`;
      console.log("🌍 Fetching StormGlass:", sgUrl);

      const stormRes = await axios.get(sgUrl, {
        headers: { Authorization: process.env.STORMGLASS_API_KEY }
      });

      const sgData = stormRes.data.hours[0]; // first hour forecast

      // StormGlass returns wind in m/s → convert to knots (1 m/s = 1.94384 kn)
      windSpeed = sgData?.windSpeed?.sg ? (sgData.windSpeed.sg * 1.94384).toFixed(2) : null;
      windDirection = sgData?.windDirection?.sg ?? null;

      currentSpeed = sgData?.currentSpeed?.sg ? (sgData.currentSpeed.sg * 1.94384).toFixed(2) : null;
      currentDirection = sgData?.currentDirection?.sg ?? null;
    } catch (stormErr) {
      console.warn("⚠️ StormGlass fetch failed:", stormErr.response?.data || stormErr.message);
    }

    // 3️⃣ Build final response
    const weather = {
      time: omData.hourly.time[idx],
      wind: {
        speed_kn: windSpeed ?? null,
        dir_deg: windDirection ?? null
      },
      waves: {
        height_m: omData.hourly.wave_height[idx] ?? null,
        dir_deg: omData.hourly.wave_direction[idx] ?? null,
        period_s: omData.hourly.wave_period[idx] ?? null
      },
      current: {
        speed_kn: currentSpeed ?? null,
        dir_deg: currentDirection ?? null
      }
    };

    res.json(weather);
  } catch (err) {
    console.error("❌ Weather fetch failed completely:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});

app.listen(4000, () => console.log("Backend running on port 4000"));
