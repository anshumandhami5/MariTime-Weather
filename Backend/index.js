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

function extractFeatures(apiData) {
  return {
    temp: apiData?.temperature_2m ?? null,
    pressure: apiData?.surface_pressure ?? null,
    humidity: apiData?.relativehumidity_2m ?? null,
    wind_speed: apiData?.windspeed_10m ?? null,
    wind_direction: apiData?.winddirection_10m ?? null,
    wind_gusts: apiData?.windgusts_10m ?? null,
    showers: apiData?.showers ?? null,
    visibility: apiData?.visibility ?? null,
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
    prediction = null,
    weatherData;

  if (isCacheValid && !movedFar) {
    console.log("✅ Using cached weather + prediction");
    ({ features, prediction, raw: weatherData } = cached);
  } else {
    console.log("🌐 Fetching fresh weather from Open-Meteo");
    try {
      const params = [
        "temperature_2m",
        "relativehumidity_2m",
        "surface_pressure",
        "windspeed_10m",
        "winddirection_10m",
        "windgusts_10m",
        "showers",
        "visibility",
      ].join(",");

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${params}&windspeed_unit=ms&timeformat=unixtime`;

      const response = await axios.get(url);
      const current =
        response.data.current_weather || response.data.current;

      features = extractFeatures(current);

      let needNewPrediction = true;
      if (cached && !hasWeatherChanged(cached.features, features)) {
        console.log("Reusing old ML prediction");
        prediction = cached.prediction;
        needNewPrediction = false;
      }

      if (needNewPrediction) {
        try {
          const mlRes = await axios.post("http://localhost:5000/predict", {
            features,
          });
          prediction = mlRes.data.prediction;
        } catch (mlErr) {
          console.warn("⚠️ ML service not available, continuing without prediction");
          prediction = null;
        }
      }

      weatherData = current;
      WEATHER_CACHE[key] = {
        raw: weatherData,
        features,
        prediction,
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
    weather: weatherData,
    ml_features: features,
    speed_prediction: prediction, // null if ML failed
  });
});

app.listen(4000, () => console.log("Backend running on port 4000"));
