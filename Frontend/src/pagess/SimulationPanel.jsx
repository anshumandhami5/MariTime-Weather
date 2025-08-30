import React, { useState, useEffect } from 'react';

// --- Helper function to format numbers with commas ---
const formatNumber = (num) => {
  if (typeof num !== 'number') return num;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

function SimulationPanel() {
  // State for route data
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [error, setError] = useState(null);

  // State for user-configurable inputs
  const [stw, setStw] = useState(14);
  const [ecoStw, setEcoStw] = useState(12.5);
  const [vesselParams, setVesselParams] = useState({
    base_fuel_consumption_mt_day: 25,
    design_speed_kn: 14,
  });
  const [costParams, setCostParams] = useState({
    bunker_price_usd_mt: 650,
    co2_price_usd_mt: 90,
  });

  // State for simulation results
  const [normalResult, setNormalResult] = useState(null);
  const [ecoResult, setEcoResult] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // --- Effect to load routes from JSON on component mount ---
  useEffect(() => {
    async function fetchRoutes() {
      try {
        const response = await fetch('/routes.json'); // Corrected to routes.json
        if (!response.ok) throw new Error("routes.json not found");
        const data = await response.json();
        setRoutes(data.routes);
      } catch (err) {
        console.error("Failed to fetch routes:", err);
        setError("Could not load route data. Make sure public/route.json exists.");
      }
    }
    fetchRoutes();
  }, []);

  // --- Core function to run a single simulation ---
  const runSingleSimulation = async (speed) => {
    const selectedRoute = routes[selectedRouteIndex];
    const body = {
      waypoints: selectedRoute.waypoints,
      startTime: new Date().toISOString(),
      stw: speed,
      vessel: { ...vesselParams, a_wave: 0.05, a_wind: 0.0006 },
      costs: costParams,
    };
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/route/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `API returned an error: ${res.statusText}`);
    }
    return res.json();
  };

  // --- Main handler to run the comparison ---
  async function handleSimulate() {
    if (!routes.length) return;
    if (ecoStw >= stw) {
      setError("Eco speed must be lower than normal speed.");
      return;
    }
    setSimLoading(true);
    setNormalResult(null);
    setEcoResult(null);
    setComparison(null);
    setError(null);
    try {
      const normalData = await runSingleSimulation(stw);
      setNormalResult(normalData);
      const ecoSpeed = ecoStw; 
      const ecoData = await runSingleSimulation(ecoSpeed);
      setEcoResult(ecoData);
      const fuelSaved = normalData.total.fuel_consumption_mt - ecoData.total.fuel_consumption_mt;
      const costSaved = normalData.total.costs.total_voyage_cost_usd - ecoData.total.costs.total_voyage_cost_usd;
      const delayHours = ecoData.total.voyage_hours - normalData.total.voyage_hours;
      setComparison({ fuelSaved, costSaved, delayHours, ecoSpeed });
    } catch (err) {
      console.error("Simulation failed", err);
      setError(err.message);
    } finally {
      setSimLoading(false);
    }
  }
  
  const handleInputChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter(prev => ({ ...prev, [name]: Number(value) }));
  };

  return (
    <div className="simulation-panel p-6 bg-gray-900 text-white rounded-lg shadow-2xl space-y-6">
      <h2 className="text-2xl font-bold text-center">Voyage Simulator & Cost Analysis</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-800 rounded-lg">
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-gray-400">Route</label>
          <select value={selectedRouteIndex} onChange={(e) => setSelectedRouteIndex(Number(e.target.value))} disabled={simLoading || !routes.length} className="mt-1 w-full bg-gray-700 p-2 rounded">
            {routes.map((route, index) => <option key={index} value={index}>{`${route.name}: ${route.from} to ${route.to}`}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Normal Speed (kn)</label>
          <input type="number" value={stw} onChange={(e) => setStw(Number(e.target.value))} disabled={simLoading} className="mt-1 w-full bg-gray-700 p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Eco Speed (kn)</label>
          <input type="number" value={ecoStw} onChange={(e) => setEcoStw(Number(e.target.value))} disabled={simLoading} className="mt-1 w-full bg-gray-700 p-2 rounded" />
        </div>
        <div>
           <label className="block text-sm font-medium text-gray-400">Base Fuel (MT/day)</label>
           <input type="number" name="base_fuel_consumption_mt_day" value={vesselParams.base_fuel_consumption_mt_day} onChange={handleInputChange(setVesselParams)} disabled={simLoading} className="mt-1 w-full bg-gray-700 p-2 rounded" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-400">Bunker Price ($/MT)</label>
            <input type="number" name="bunker_price_usd_mt" value={costParams.bunker_price_usd_mt} onChange={handleInputChange(setCostParams)} disabled={simLoading} className="mt-1 w-full bg-gray-700 p-2 rounded" />
        </div>
      </div>
      
      <div className="text-center">
        <button onClick={handleSimulate} disabled={simLoading || !routes.length} className="w-full md:w-1/2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 font-bold py-3 px-4 rounded transition-colors">
          {simLoading ? 'Simulating...' : 'Run Simulation & Compare'}
        </button>
      </div>

      {error && <div className="text-red-400 bg-red-900 p-3 rounded mt-4 text-center">Error: {error}</div>}
      
      {comparison && (
        <div className="p-4 bg-green-900 bg-opacity-50 rounded-lg text-center">
          <h3 className="text-xl font-bold text-green-300">Comparison Summary</h3>
          <p className="text-lg mt-2">
            Slowing down to <strong>{comparison.ecoSpeed.toFixed(1)} kn</strong> saves <strong>{formatNumber(comparison.fuelSaved)} MT</strong> of fuel (${formatNumber(comparison.costSaved)})
            but delays ETA by <strong>{(comparison.delayHours / 24).toFixed(1)} days</strong>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {normalResult && <ResultCard title={`Normal Speed (${stw} kn)`} result={normalResult} />}
        {ecoResult && <ResultCard title={`Eco Speed (${ecoStw} kn)`} result={ecoResult} />}
      </div>

      {normalResult && <LegsTable legs={normalResult.legs} />}
    </div>
  );
}

const ResultCard = ({ title, result }) => (
  <div className="bg-slate-800 p-4 rounded-lg">
    <h3 className="text-lg font-semibold text-center">{title}</h3>
    <div className="mt-3 space-y-1 text-sm">
        <p><strong>ETA:</strong> {new Date(result.total.eta).toLocaleString()}</p>
        <p><strong>Voyage Time:</strong> {(result.total.voyage_hours / 24).toFixed(1)} days</p>
        <p><strong>Total Fuel:</strong> {formatNumber(result.total.fuel_consumption_mt)} MT</p>
        <p><strong>Total Cost:</strong> ${formatNumber(result.total.costs.total_voyage_cost_usd)}</p>
    </div>
  </div>
);

// --- Component with the fix ---
const LegsTable = ({ legs }) => (
  <div className="lg:col-span-2 mt-4 bg-slate-800 p-4 rounded-lg">
    <h4 className="font-semibold text-center mb-2">Detailed Legs Data (Normal Speed)</h4>
    <div className="overflow-auto max-h-72">
      <table className="w-full text-sm text-left">
        <thead className="sticky top-0 bg-slate-800">
          <tr>
            {/* ADDED HEADERS */}
            <th className="p-2">#</th>
            <th className="p-2">From</th>
            <th className="p-2">To</th>
            <th className="p-2">dist(nm)</th>
            <th className="p-2">STW_eff</th>
            <th className="p-2">SOG</th>
            <th className="p-2">Fuel (MT)</th>
            <th className="p-2">ETA</th>
          </tr>
        </thead>
        <tbody>
          {legs.map((leg) => (
            <tr key={leg.index} className="border-t border-gray-700 hover:bg-slate-700">
              {/* ADDED DATA CELLS */}
              <td className="p-2">{leg.index + 1}</td>
              <td className="p-2">{`${leg.from[0].toFixed(2)}, ${leg.from[1].toFixed(2)}`}</td>
              <td className="p-2">{`${leg.to[0].toFixed(2)}, ${leg.to[1].toFixed(2)}`}</td>
              <td className="p-2">{leg.distance_nm}</td>
              <td className="p-2">{leg.stw_effective}</td>
              <td className="p-2">{leg.sog}</td>
              <td className="p-2">{leg.fuel_consumption_mt}</td>
              <td className="p-2">{new Date(leg.arrivalTime).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default SimulationPanel;

