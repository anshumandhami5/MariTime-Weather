import React, { useState, useEffect } from 'react';

const formatNumber = (num) => {
  if (typeof num !== 'number') return num;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatDateForInput = (date) => {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = (`0${d.getUTCMonth() + 1}`).slice(-2);
    const day = (`0${d.getUTCDate()}`).slice(-2);
    return `${year}-${month}-${day}`;
};


function SimulationPanel() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [error, setError] = useState(null);

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
  const [laycan, setLaycan] = useState({
      start: '2025-09-21T00:00:00Z',
      end: '2025-09-22T23:59:59Z'
  });

  // State for simulation results
  const [normalResult, setNormalResult] = useState(null);
  const [ecoResult, setEcoResult] = useState(null);
  const [optimizedResult, setOptimizedResult] = useState(null); 
  const [comparison, setComparison] = useState(null);
  const [speedSuggestion, setSpeedSuggestion] = useState(null); 
  const [simLoading, setSimLoading] = useState(false);
  const [activeLegsView, setActiveLegsView] = useState('normal');

  useEffect(() => {
    async function fetchRoutes() {
      try {
        const response = await fetch('/routes.json');
        if (!response.ok) throw new Error("routes.json not found");
        const data = await response.json();
        setRoutes(data.routes);
      } catch (err) {
        console.error("Failed to fetch routes:", err);
        setError("Could not load route data. Make sure public/routes.json exists.");
      }
    }
    fetchRoutes();
  }, []);

  const runSingleSimulation = async (speed, speedAdjustments = null) => {
    const selectedRoute = routes[selectedRouteIndex];
    const body = {
      waypoints: selectedRoute.waypoints,
      startTime: laycan.start,
      stw: speed,
      vessel: { ...vesselParams, a_wave: 0.05, a_wind: 0.0006 },
      costs: costParams,
      laycan: laycan, 
      speedAdjustments, 
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
    setOptimizedResult(null);
    setSpeedSuggestion(null);
    setError(null);
    setActiveLegsView('normal');

    try {
      const normalData = await runSingleSimulation(stw);
      if (!normalData?.total?.costs || !normalData?.legs) {
          throw new Error("Received invalid simulation data from server for the normal run.");
        }
        setNormalResult(normalData);

        const ecoSpeed = ecoStw;
        const ecoData = await runSingleSimulation(ecoSpeed);
        if (!ecoData?.total?.costs || !ecoData?.legs) {
            throw new Error("Received invalid simulation data from server for the eco run.");
        }
        setEcoResult(ecoData);

      const fuelSaved = normalData.total.fuel_consumption_mt - ecoData.total.fuel_consumption_mt;
      const costSaved = normalData.total.costs.total_voyage_cost_usd - ecoData.total.costs.total_voyage_cost_usd;
      const delayHours = ecoData.total.voyage_hours - normalData.total.voyage_hours;
      setComparison({ fuelSaved, costSaved, delayHours, ecoSpeed });

      if (normalData.total.laycanRisk?.status === 'late') {
        let timeToSaveHrs = normalData.total.laycanRisk.diffHours;
        const adjustments = [];
        const maxSpeed = stw + 2.0;
        const legsWithScores = normalData.legs.map(leg => ({ ...leg, score: leg.distance_nm / (1 + leg.penalties.wave + leg.penalties.wind) })).sort((a, b) => b.score - a.score);
        for (const leg of legsWithScores) {
          if (timeToSaveHrs <= 0) break;
          const originalLegHours = leg.leg_hours;
          const newPenalties = leg.penalties.wave + leg.penalties.wind;
          const newStwEffective = maxSpeed - newPenalties;
          const newSog = newStwEffective + leg.c_parallel;
          const newLegHours = leg.distance_nm / newSog;
          const timeSavedOnLeg = originalLegHours - newLegHours;
          if (timeSavedOnLeg > 0) {
            adjustments.push({ legIndex: leg.index, newStw: maxSpeed });
            timeToSaveHrs -= timeSavedOnLeg;
          }
        }
        if (adjustments.length > 0) {
          setSpeedSuggestion({ adjustments });
        }
      }
    } catch (err) {
      console.error("Simulation failed", err);
      setError(err.message);
    } finally {
      setSimLoading(false);
    }
  }

  async function handleOptimizedSimulate() {
    if (!speedSuggestion) return;
    setSimLoading(true);
    setError(null);
    try {
      const optimizedData = await runSingleSimulation(stw, speedSuggestion.adjustments);
       if (!optimizedData?.total?.costs || !optimizedData?.legs) {
          throw new Error("Received invalid data from server for the optimized run.");
      }
      setOptimizedResult(optimizedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSimLoading(false);
    }
  }
  
  const handleInputChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter(prev => ({ ...prev, [name]: Number(value) }));
  };
  
  const handleDateChange = (e) => {
      const { name, value } = e.target; // value is "YYYY-MM-DD"
      // Create the date object from the input value as UTC
      const [year, month, day] = value.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      
      let isoString = utcDate.toISOString();

      // For the 'end' date, set it to the end of that day in UTC
      if (name === 'end') {
          utcDate.setUTCHours(23, 59, 59, 999);
          isoString = utcDate.toISOString();
      }

      setLaycan(prev => ({ ...prev, [name]: isoString }));
  };

  return (
    <div className="simulation-panel p-6 bg-gray-900 text-white rounded-lg shadow-2xl space-y-6">
      <h2 className="text-2xl font-bold text-center">Voyage Simulator & Cost Analysis</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-800 rounded-lg">
        {/* Route, Speeds */}
        <div><label className="block text-sm text-gray-400">Route</label><select value={selectedRouteIndex} onChange={(e) => setSelectedRouteIndex(Number(e.target.value))} disabled={simLoading || !routes.length} className="mt-1 w-full bg-gray-700 p-2 rounded">{routes.map((route, index) => <option key={index} value={index}>{`${route.name}: ${route.from} to ${route.to}`}</option>)}</select></div>
        <div><label className="block text-sm text-gray-400">Normal Speed (kn)</label><input type="number" value={stw} onChange={(e) => setStw(Number(e.target.value))} disabled={simLoading} className="mt-1 w-full bg-gray-700 p-2 rounded" /></div>
        <div><label className="block text-sm text-gray-400">Eco Speed (kn)</label><input type="number" value={ecoStw} onChange={(e) => setEcoStw(Number(e.target.value))} disabled={simLoading} className="mt-1 w-full bg-gray-700 p-2 rounded" /></div>
        
        {/* Vessel & Cost Params */}
        <div><label className="block text-sm text-gray-400">Base Fuel (MT/day)</label><input type="number" name="base_fuel_consumption_mt_day" value={vesselParams.base_fuel_consumption_mt_day} onChange={handleInputChange(setVesselParams)} disabled={simLoading} className="mt-1 w-full bg-gray-700 p-2 rounded" /></div>
        <div><label className="block text-sm text-gray-400">Bunker Price ($/MT)</label><input type="number" name="bunker_price_usd_mt" value={costParams.bunker_price_usd_mt} onChange={handleInputChange(setCostParams)} disabled={simLoading} className="mt-1 w-full bg-gray-700 p-2 rounded" /></div>

        {/* Laycan Inputs */}
        <div><label className="block text-sm text-gray-400">Laycan Start</label><input type="date" name="start" value={formatDateForInput(laycan.start)} onChange={handleDateChange} disabled={simLoading} className="mt-1 w-full bg-gray-700 p-2 rounded" /></div>
        <div><label className="block text-sm text-gray-400">Laycan End</label><input type="date" name="end" value={formatDateForInput(laycan.end)} onChange={handleDateChange} disabled={simLoading} className="mt-1 w-full bg-gray-700 p-2 rounded" /></div>
      </div>
      
      <div className="text-center"><button onClick={handleSimulate} disabled={simLoading || !routes.length} className="w-full md:w-1/2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 font-bold py-3 px-4 rounded transition-colors">{simLoading ? 'Simulating...' : 'Run Simulation & Compare'}</button></div>

      {error && <div className="text-red-400 bg-red-900 p-3 rounded mt-4 text-center">Error: {error}</div>}
      
      {/* Display Laycan Analysis and Suggestion */}
      {normalResult && <LaycanAnalysis result={normalResult} suggestion={speedSuggestion} onOptimize={handleOptimizedSimulate} loading={simLoading} />}
      
      {comparison && (<div className="p-4 bg-green-900 bg-opacity-50 rounded-lg text-center"><h3 className="text-xl font-bold text-green-300">Eco Speed Comparison</h3><p className="text-lg mt-2">Slowing to <strong>{comparison.ecoSpeed.toFixed(1)} kn</strong> saves <strong>{formatNumber(comparison.fuelSaved)} MT</strong> (${formatNumber(comparison.costSaved)}) but delays ETA by <strong>{(comparison.delayHours / 24).toFixed(1)} days</strong>.</p></div>)}

      {/* Grid now accommodates three results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {normalResult && <ResultCard title={`Normal Speed (${stw} kn)`} result={normalResult} />}
        {ecoResult && <ResultCard title={`Eco Speed (${ecoStw} kn)`} result={ecoResult} />}
        {optimizedResult && <ResultCard title="Optimized Voyage" result={optimizedResult} isOptimized={true} />}
      </div>

      {normalResult && (
        <div className="lg:col-span-3 mt-4 bg-slate-800 p-4 rounded-lg">
          {/* Tab buttons for switching views */}
          <div className="flex border-b border-gray-700 mb-2">
            <button className={`px-4 py-2 font-semibold transition-colors ${activeLegsView === 'normal' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`} onClick={() => setActiveLegsView('normal')}>
                Normal Legs
            </button>
            {ecoResult && (
                 <button className={`px-4 py-2 font-semibold transition-colors ${activeLegsView === 'eco' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`} onClick={() => setActiveLegsView('eco')}>
                    Eco Legs
                </button>
            )}
            {optimizedResult && (
                 <button className={`px-4 py-2 font-semibold transition-colors ${activeLegsView === 'optimized' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`} onClick={() => setActiveLegsView('optimized')}>
                    Optimized Legs
                </button>
            )}
          </div>
          
          {/* Conditionally render the correct table based on the active tab */}
          {activeLegsView === 'normal' && <LegsTable legs={normalResult.legs} title="Detailed Legs Data (Normal Speed)" />}
          {activeLegsView === 'eco' && ecoResult && <LegsTable legs={ecoResult.legs} title="Detailed Legs Data (Eco Speed)" />}
          {activeLegsView === 'optimized' && optimizedResult && <LegsTable legs={optimizedResult.legs} title="Detailed Legs Data (Optimized Voyage)" adjustments={speedSuggestion?.adjustments} />}
        </div>
      )}
    </div>
  );
}


const LaycanAnalysis = ({ result, suggestion, onOptimize, loading }) => {
  if (!result.total.laycanRisk) return null;
  const { status, diffHours } = result.total.laycanRisk;
  const riskStyles = { on_time: "bg-green-900 text-green-300", early: "bg-blue-900 text-blue-300", late: "bg-red-900 text-red-300" };
  const hours = Math.abs(diffHours).toFixed(1);
  let message = `Status: On Time.`;
  if (status === 'late') message = `High risk of missing laycan by ~${hours} hrs.`;
  if (status === 'early') message = `Arriving early with ~${hours} hrs to spare.`;

  return (
    <div className={`p-4 rounded-lg text-center ${riskStyles[status]}`}>
      <h3 className="text-xl font-bold">Laycan Risk Analysis</h3>
      <p className="text-lg mt-2">{message}</p>
      
      {suggestion?.adjustments?.length > 0 && status === 'late' && (
        <div className="mt-3">
          <p><b>Suggestion:</b> An optimized plan has been calculated. See the "Optimized Legs" tab for details.</p>
          <button onClick={onOptimize} disabled={loading} className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded">
            {loading ? 'Simulating...' : 'Run Optimized Simulation'}
          </button>
        </div>
      )}
    </div>
  );
};

const ResultCard = ({ title, result, isOptimized = false }) => (
  <div className={`bg-slate-800 p-4 rounded-lg ${isOptimized ? 'border-2 border-yellow-400' : ''}`}>
    <h3 className="text-lg font-semibold text-center">{title}</h3>
    <div className="mt-3 space-y-1 text-sm">
      <p><strong>ETA (UTC):</strong> {new Date(result.total.eta).toUTCString()}</p>
      <p><strong>Voyage Time:</strong> {(result.total.voyage_hours / 24).toFixed(1)} days</p>
      <p><strong>Total Fuel:</strong> {formatNumber(result.total.fuel_consumption_mt)} MT</p>
      <p><strong>Total Cost:</strong> ${formatNumber(result.total.costs.total_voyage_cost_usd)}</p>
      {result.total.laycanRisk && <p><strong>Laycan:</strong> {result.total.laycanRisk.status.replace('_', ' ')}</p>}
    </div>
  </div>
);

const LegsTable = ({ legs, title, adjustments = [] }) => {
  return (
    <div>
      <h4 className="font-semibold text-center mb-2">{title}</h4>
      <div className="overflow-auto max-h-72">
        <table className="w-full text-sm text-left">
        <thead className="sticky top-0 bg-slate-800">
          <tr>
            <th className="p-2">#</th>
              <th className="p-2">From</th>
              <th className="p-2">To</th>
              <th className="p-2">dist(nm)</th>
              <th className="p-2">STW_cmd</th>
              <th className="p-2">STW_eff</th>
              <th className="p-2">SОG</th>
              <th className="p-2">Fuel (MT)</th>
              {/* --- This header only renders if the 'adjustments' array has items. --- */}
              {adjustments.length > 0 && <th className="p-2">Priority</th>}
              <th className="p-2">ETA</th>
          </tr>
        </thead>
        <tbody>
          {legs.map((leg) => {
            const adjustment = adjustments.find(adj => adj.legIndex === leg.index);
            const priorityIndex = adjustments.findIndex(adj => adj.legIndex === leg.index);

            return (
                <tr key={leg.index} className="border-t border-gray-700 hover:bg-slate-700">
                  <td className="p-2">{leg.index + 1}</td>
                  <td className="p-2">{`${leg.from[0].toFixed(5)}, ${leg.from[1].toFixed(5)}`}</td>
                  <td className="p-2">{`${leg.to[0].toFixed(5)}, ${leg.to[1].toFixed(5)}`}</td>
                  <td className="p-2">{leg.distance_nm}</td>
                  <td className="p-2">{leg.stw_commanded}</td>
                  <td className="p-2">{leg.stw_effective}</td>
                  <td className="p-2">{leg.sog}</td>
                  <td className="p-2">{leg.fuel_consumption_mt}</td>
                  {/* --- This data cell only renders if the 'adjustments' array has items. --- */}
                  {adjustments.length > 0 && (
                    <td className="p-2">
                      {adjustment ? (
                        <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-300 rounded-full">
                          High #{priorityIndex + 1}
                        </span>
                      ) : (
                        <span className="text-gray-400">Normal</span>
                      )}
                    </td>
                  )}
                  <td className="p-2">{new Date(leg.arrivalTime).toUTCString()}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  </div>
);
};
export default SimulationPanel;

