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

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: "Invalid lat/lon provided" });
  }

  try {
    // 1️⃣ Get Waves from Open-Meteo
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

    // 2️⃣ Fetch Wind + Currents from Meteomatics
    const username = process.env.METEOMATICS_USER_ONE;      // e.g. demo@meteomatics.com
    const password = process.env.METEOMATICS_PASS_ONE;      // your API password
    const isoTime = time ? time : new Date().toISOString().slice(0, 13) + ":00:00Z";
    

    const mmUrl = `https://api.meteomatics.com/${isoTime}/wind_speed_10m:ms,wind_dir_10m:d,ocean_current_speed:ms,ocean_current_direction:d/${latitude},${longitude}/json`;
    console.log("🌍 Fetching Meteomatics:", mmUrl);

    const mmRes = await axios.get(mmUrl, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64")
      }
    });

    const mmData = mmRes.data.data;
    // Extract values
    const windSpeed_ms = mmData.find(d => d.parameter === "wind_speed_10m:ms")?.coordinates[0].dates[0].value ?? null;
    const windDir = mmData.find(d => d.parameter === "wind_dir_10m:d")?.coordinates[0].dates[0].value ?? null;
    const currentSpeed_ms = mmData.find(d => d.parameter === "ocean_current_speed:ms")?.coordinates[0].dates[0].value ?? null;
    const currentDir = mmData.find(d => d.parameter === "ocean_current_direction:d")?.coordinates[0].dates[0].value ?? null;

    // Convert m/s → knots (1 m/s = 1.94384 kn)
    const windSpeed_kn = windSpeed_ms ? (windSpeed_ms * 1.94384).toFixed(2) : null;
    const currentSpeed_kn = currentSpeed_ms ? (currentSpeed_ms * 1.94384).toFixed(2) : null;

    // 3️⃣ Build final response
    const weather = {
      time: omData.hourly.time[idx],
      wind: {
        speed_kn: windSpeed_kn,
        dir_deg: windDir
      },
      waves: {
        height_m: omData.hourly.wave_height[idx] ?? null,
        dir_deg: omData.hourly.wave_direction[idx] ?? null,
        period_s: omData.hourly.wave_period[idx] ?? null
      },
      current: {
        speed_kn: currentSpeed_kn,
        dir_deg: currentDir
      }
    };

    res.json(weather);
  } catch (err) {
    console.error("❌ Weather fetch failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});


//Simulation


/**
 * Helper: distance (nm) and heading (degrees from north clockwise)
 * Haversine returns distance in nautical miles and heading from start -> end
 */
function toRadians(deg){ return (deg * Math.PI) / 180; }
function toDegrees(rad){ return (rad * 180) / Math.PI; }

function haversineNM([lat1, lon1], [lat2, lon2]){
  const R = 6371; // km
  const φ1 = toRadians(lat1), φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);
  const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const km = R * c;
  const nm = km / 1.852; // 1 nm = 1.852 km
  return nm;
}

/** heading from start to end (degrees from North, clockwise) */
function headingDeg([lat1, lon1], [lat2, lon2]){
  const φ1 = toRadians(lat1), φ2 = toRadians(lat2);
  const λ1 = toRadians(lon1), λ2 = toRadians(lon2);
  const y = Math.sin(λ2-λ1) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
  let θ = toDegrees(Math.atan2(y, x));
  // convert atan2 result to bearing from north clockwise
  // formula gives bearing from north? adjust to 0..360
  θ = (θ + 360) % 360;
  return θ;
}

/**
 * helper: fetch weather for one point+time using your existing internal API
 * It calls your /api/location/weather endpoint on same server (no network cost)
 * You can replace with direct function to Open-Meteo/StormGlass if preferred.
 */
async function fetchWeatherForPoint(lat, lon, timeISO) {
  try {
    const url = `${process.env.BACKEND_INTERNAL_URL || `http://localhost:${process.env.PORT}`}/api/location/weather?lat=${lat}&lon=${lon}${timeISO ? `&time=${encodeURIComponent(timeISO)}` : ''}`;
    const r = await axios.get(url);
    return r.data;
  } catch (err) {
    console.warn("fetchWeatherForPoint failed:", err.response?.data || err.message);
    // return null-ish safe structure
    return {
      time: timeISO || null,
      wind: { speed_kn: null, dir_deg: null },
      waves: { height_m: null, dir_deg: null, period_s: null },
      current: { speed_kn: null, dir_deg: null }
    };
  }
}

/**
 * Utility: convert degrees to radians
 */
function degToRad(deg){ return deg * Math.PI / 180; }

/**
 * Compute projection of current (speed & dir) onto ship heading (in knots)
 * current_dir is degrees (meteorological: direction from which current is flowing)
 * shipHeading is degrees (heading towards which ship moves).
 * We'll treat both as directions (0 = North, clockwise).
 * The component along heading = current_speed * cos(delta) where delta = angle between current direction and heading but careful with conventions:
 * If current direction means 'direction from which current flows', forward component = -cos(delta)*speed
 * Simpler: assume current.dir_deg is direction TO (as StormGlass returns currentDirection as direction of flow). If it's direction from—swap sign. Check API docs. We'll assume it's direction TO.
 */
function currentAlongHeading(currentSpeed, currentDirDeg, shipHeadingDeg){
  if (currentSpeed == null || currentDirDeg == null) return 0;
  // angle difference (in radians)
  const delta = degToRad(currentDirDeg - shipHeadingDeg);
  // projection:
  return currentSpeed * Math.cos(delta); // knots; positive if adds to SOG
}

/**
 * Penalty model (configurable). Returns penalty in knots to subtract from STW.
 * - wave penalty ~ a_wave * Hs * max(0, cos(encounterAngle))    (head seas penalize most)
 * - wind penalty ~ a_wind * (wind_speed_kn^2) / 100
 * encounterAngle = angle difference between heading and wave direction (deg)
 */
function computePenalties({hst_m, waveDirDeg, windSpeedKn, windDirDeg, headingDeg}, coeffs){
  const a_wave = coeffs.a_wave ?? 0.05;   // kn per meter (example)
  const a_wind = coeffs.a_wind ?? 0.0006; // coefficient for wind squared penalty

  let wavePenalty = 0;
  if (hst_m != null && waveDirDeg != null){
    const encDelta = Math.abs(((waveDirDeg - headingDeg + 540) % 360) - 180); // gives 0..180 where 0=along, 180=head
    // convert to cos where head sea (180°) -> cos(180)=-1, we want positive penalty when head seas
    // use factor = max(0, cos(encounterAngleRad) * -1) so head (180deg) -> 1, following (0deg) -> 0
    const encRad = degToRad(encDelta);
    const factor = Math.max(0, -Math.cos(encRad));
    wavePenalty = a_wave * hst_m * factor;
  }

  let windPenalty = 0;
  if (windSpeedKn != null){
    windPenalty = a_wind * (windSpeedKn * windSpeedKn);
  }

  return { wavePenalty, windPenalty, totalPenalty: wavePenalty + windPenalty };
}



// --- The complete, updated API endpoint ---
app.post("/api/route/simulate", async (req, res) => {
  try {
    // 1. DESTRUCTURE NEW INPUTS: Now includes 'costs' and expanded 'vessel' object
    const { waypoints, startTime, stw = 12, vessel = {}, costs = {}, laycan , speedAdjustments } = req.body;

    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      return res.status(400).json({ error: "waypoints must be an array with at least 2 points" });
    }

    // --- SETUP CONSTANTS AND DEFAULTS ---
    // Environmental coefficients
    const vesselCoeffs = {
      a_wave: vessel.a_wave ?? 0.05,
      a_wind: vessel.a_wind ?? 0.0006
    };

    // Vessel performance parameters with defaults
    const vesselPerf = {
      base_fuel_mt_day: vessel.base_fuel_consumption_mt_day ?? 25,
      design_speed_kn: vessel.design_speed_kn ?? 14,
    };
    
    // Market cost parameters with defaults
    const marketCosts = {
      bunker_price_usd_mt: costs.bunker_price_usd_mt ?? 650,
      co2_price_usd_mt: costs.co2_price_usd_mt ?? 90,
      canal_dues_usd: costs.canal_dues_usd ?? 0,
      other_fixed_costs_usd: costs.other_fixed_costs_usd ?? 0,
    };

    const CO2_CONVERSION_FACTOR = 3.114; // MT of CO2 per MT of VLSFO

    // --- INITIALIZE SIMULATION VARIABLES ---
    const legs = [];
    let currentTime = startTime ? new Date(startTime) : new Date();
    let totalDist = 0;
    let totalHours = 0;
    let totalFuelMt = 0; // New variable to track total fuel

    // --- SIMULATION LOOP ---
    for (let i = 0; i < waypoints.length - 1; i++) {
      let legStw = stw;
      if (speedAdjustments && Array.isArray(speedAdjustments)) {
        const adjustment = speedAdjustments.find(adj => adj.legIndex === i);
        if (adjustment) {
          legStw = adjustment.newStw;
        }
      }
      const from = waypoints[i];
      const to = waypoints[i+1];
      const distance_nm = haversineNM(from, to);
      const heading_deg = headingDeg(from, to);

      const naiveHours = distance_nm / Math.max(0.1, legStw);
      const forecastTime = new Date(currentTime.getTime() + naiveHours * 3600 * 1000).toISOString();
      
      const w = await fetchWeatherForPoint(to[0], to[1], forecastTime);
      
      const windSpeedKn = w.wind?.speed_kn != null ? Number(w.wind.speed_kn) : null;
      const windDirDeg  = w.wind?.dir_deg != null ? Number(w.wind.dir_deg) : null;
      const waveHs = w.waves?.height_m != null ? Number(w.waves.height_m) : null;
      const waveDir = w.waves?.dir_deg != null ? Number(w.waves.dir_deg) : null;
      const curSpeed = w.current?.speed_kn != null ? Number(w.current.speed_kn) : null;
      const curDir   = w.current?.dir_deg != null ? Number(w.current.dir_deg) : null;

      const penalties = computePenalties({
        hst_m: waveHs, waveDirDeg: waveDir, windSpeedKn, windDirDeg, headingDeg: heading_deg
      }, vesselCoeffs);

      const stw_effective = Math.max(0.1, legStw - penalties.totalPenalty);
      const c_parallel = currentAlongHeading(curSpeed, curDir, heading_deg);
      const sog = Math.max(0.1, stw_effective + c_parallel);
      const leg_hours = distance_nm / sog;

      // === NEW: FUEL AND COST CALCULATION (NO PLACEHOLDERS) ===
      // Use the cube law: Consumption = BaseConsumption * (ActualSpeed / DesignSpeed)^3
      const daily_consumption_mt = vesselPerf.base_fuel_mt_day * Math.pow(stw_effective / vesselPerf.design_speed_kn, 3);
      const leg_fuel_mt = (daily_consumption_mt / 24) * leg_hours;
      // =========================================================
      
      const arrivalTime = new Date(currentTime.getTime() + leg_hours * 3600 * 1000).toISOString();

      legs.push({
        index: i, from, to,
        distance_nm: Number(distance_nm.toFixed(2)),
        // OPTIMIZATION FEATURE: We store the actual speed commanded for this leg, which could be the adjusted speed.
        stw_commanded: legStw,
        stw_effective: Number(stw_effective.toFixed(2)),
        sog: Number(sog.toFixed(2)),
        leg_hours: Number(leg_hours.toFixed(2)),
        arrivalTime,
        fuel_consumption_mt: Number(leg_fuel_mt.toFixed(3)),
        penalties: {
            wave: Number(penalties.wavePenalty.toFixed(3)),
            wind: Number(penalties.windPenalty.toFixed(3))
        },
        c_parallel: Number(c_parallel.toFixed(3)),
      });

      // --- PROGRESS SIMULATION STATE ---
      currentTime = new Date(arrivalTime);
      totalDist += distance_nm;
      totalHours += leg_hours;
      totalFuelMt += leg_fuel_mt; // Accumulate fuel
    }

    // === NEW: FINAL TOTAL COST CALCULATIONS ===
    const total_fuel_cost_usd = totalFuelMt * marketCosts.bunker_price_usd_mt;
    const total_co2_mt = totalFuelMt * CO2_CONVERSION_FACTOR;
    const total_co2_cost_usd = total_co2_mt * marketCosts.co2_price_usd_mt;
    const total_voyage_cost_usd = total_fuel_cost_usd + total_co2_cost_usd + marketCosts.canal_dues_usd + marketCosts.other_fixed_costs_usd;
    // ===========================================

    const eta = new Date(new Date(startTime || Date.now()).getTime() + totalHours * 3600 * 1000).toISOString();

    let laycanRisk = null;
    if (laycan && laycan.start && laycan.end){
      const layStart = new Date(laycan.start);
      const layEnd = new Date(laycan.end);
      const etaDate = new Date(eta);
      if (etaDate < layStart) laycanRisk = { status: "early", diffHours: (layStart - etaDate)/3600000 };
      else if (etaDate <= layEnd) laycanRisk = { status: "on_time", diffHours: 0 };
      else laycanRisk = { status: "late", diffHours: (etaDate - layEnd)/3600000 };
    }

    // --- FINAL RESPONSE OBJECT ---
    res.json({
      legs,
      total: {
        distance_nm: Number(totalDist.toFixed(2)),
        voyage_hours: Number(totalHours.toFixed(2)),
        eta,
        laycanRisk,
        // ADDED: Fuel and cost summary
        fuel_consumption_mt: Number(totalFuelMt.toFixed(2)),
        costs: {
            bunker_cost_usd: Number(total_fuel_cost_usd.toFixed(0)),
            co2_cost_usd: Number(total_co2_cost_usd.toFixed(0)),
            canal_dues_usd: marketCosts.canal_dues_usd,
            other_fixed_costs_usd: marketCosts.other_fixed_costs_usd,
            total_voyage_cost_usd: Number(total_voyage_cost_usd.toFixed(0)),
        }
      }
    });

  } catch (err) {
    console.error("Route simulation failed:", err.response?.data || err.message || err);
    res.status(500).json({ error: "Route simulation failed" });
  }
});




app.listen(4000, () => console.log("Backend running on port 4000"));
