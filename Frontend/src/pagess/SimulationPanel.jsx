import React, { useState, useEffect } from 'react';

// --- Helper Components for Icons (add these at the top or in a separate file) ---
const IconRoute = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconSpeed = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IconFuel = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A8 8 0 0117.657 18.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.932 18.932l.707-.707m5.657-5.657l.707-.707M5.828 8.828l.707-.707m11.314 0l.707.707" /></svg>;
const IconPrice = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 13v-1m-4-1c-1.11 0-2.08-.402-2.599-1M16 16c1.11 0 2.08-.402 2.599-1M12 4V3m4 1h.01M8 4h.01M4 8v.01M4 16v.01M20 8v.01M20 16v.01M16 20h.01M8 20h.01" /></svg>;
const IconCalendar = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const IconSpinner = () => <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

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
  
  // Custom Input component for consistent styling
  const InputField = ({ icon, label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">{icon}</span>
            <input 
                {...props}
                className="pl-10 w-full bg-gray-900/50 border border-gray-700 rounded-md p-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
        </div>
    </div>
);

  return (
    <div className="simulation-panel p-4 sm:p-6 bg-gray-900 text-gray-200 rounded-lg shadow-2xl space-y-6 min-h-screen">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
            Voyage Simulator & Cost Analysis
        </h2>
        <p className="text-gray-400 mt-1">Enter parameters to forecast and optimize your voyage.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
         <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Route</label>
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3"><IconRoute /></span>
                <select value={selectedRouteIndex} onChange={(e) => setSelectedRouteIndex(Number(e.target.value))} disabled={simLoading || !routes.length} className="pl-10 w-full bg-gray-900/50 border border-gray-700 rounded-md p-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none">
                    {routes.map((route, index) => <option key={index} value={index}>{`${route.name}: ${route.from} to ${route.to}`}</option>)}
                </select>
            </div>
        </div>
        <InputField label="Normal Speed (kn)" type="number" icon={<IconSpeed />} value={stw} onChange={(e) => setStw(Number(e.target.value))} disabled={simLoading} />
        <InputField label="Eco Speed (kn)" type="number" icon={<IconSpeed />} value={ecoStw} onChange={(e) => setEcoStw(Number(e.target.value))} disabled={simLoading} />
        <InputField label="Base Fuel (MT/day)" type="number" icon={<IconFuel />} name="base_fuel_consumption_mt_day" value={vesselParams.base_fuel_consumption_mt_day} onChange={handleInputChange(setVesselParams)} disabled={simLoading} />
        <InputField label="Bunker Price ($/MT)" type="number" icon={<IconPrice />} name="bunker_price_usd_mt" value={costParams.bunker_price_usd_mt} onChange={handleInputChange(setCostParams)} disabled={simLoading} />
        <InputField label="Laycan Start" type="date" icon={<IconCalendar />} name="start" value={formatDateForInput(laycan.start)} onChange={handleDateChange} disabled={simLoading} />
        <InputField label="Laycan End" type="date" icon={<IconCalendar />} name="end" value={formatDateForInput(laycan.end)} onChange={handleDateChange} disabled={simLoading} />
      </div>
      
      <div className="text-center">
        <button 
            onClick={handleSimulate} 
            disabled={simLoading || !routes.length} 
            className="inline-flex items-center justify-center w-full md:w-1/2 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed font-bold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-blue-500/30 text-white"
        >
            {simLoading && <IconSpinner />}
            {simLoading ? 'Simulating...' : 'Run Simulation & Compare'}
        </button>
      </div>

      {error && <div className="flex items-center justify-center text-red-300 bg-red-900/50 border border-red-700 p-3 rounded-lg mt-4 text-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Error: {error}</div>}
      
      {normalResult && <LaycanAnalysis result={normalResult} suggestion={speedSuggestion} onOptimize={handleOptimizedSimulate} loading={simLoading} />}
      
      {comparison && (
        <div className="p-4 bg-teal-900/50 border border-teal-700 rounded-lg text-center">
          <h3 className="text-xl font-bold text-teal-300">Eco Speed Comparison</h3>
          <p className="text-lg mt-2 text-gray-300">Slowing to <strong className="text-white">{comparison.ecoSpeed.toFixed(1)} kn</strong> saves <strong className="text-white">{formatNumber(comparison.fuelSaved)} MT</strong> (<strong className="text-white">${formatNumber(comparison.costSaved)}</strong>) but delays ETA by <strong className="text-white">{(comparison.delayHours / 24).toFixed(1)} days</strong>.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {normalResult && <ResultCard title={`Normal Speed (${stw} kn)`} result={normalResult} />}
        {ecoResult && <ResultCard title={`Eco Speed (${ecoStw} kn)`} result={ecoResult} />}
        {optimizedResult && <ResultCard title="Optimized Voyage" result={optimizedResult} isOptimized={true} />}
      </div>

      {normalResult && (
        <div className="w-full mt-4 bg-gray-800/50 border border-gray-700 p-4 rounded-lg">
          <div className="flex border-b border-gray-700 mb-2">
            <button className={`px-4 py-2 font-semibold transition-colors ${activeLegsView === 'normal' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`} onClick={() => setActiveLegsView('normal')}>Normal Legs</button>
            {ecoResult && <button className={`px-4 py-2 font-semibold transition-colors ${activeLegsView === 'eco' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`} onClick={() => setActiveLegsView('eco')}>Eco Legs</button>}
            {optimizedResult && <button className={`px-4 py-2 font-semibold transition-colors ${activeLegsView === 'optimized' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`} onClick={() => setActiveLegsView('optimized')}>Optimized Legs</button>}
          </div>
          
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
  
  const riskConfig = {
      on_time: { styles: "bg-green-900/50 border border-green-700 text-green-300", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, message: `Status: On Time.`},
      early: { styles: "bg-blue-900/50 border border-blue-700 text-blue-300", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, message: `Arriving early with ~${Math.abs(diffHours).toFixed(1)} hrs to spare.`},
      late: { styles: "bg-red-900/50 border border-red-700 text-red-300", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>, message: `High risk of missing laycan by ~${Math.abs(diffHours).toFixed(1)} hrs.`},
  };
  
  const currentRisk = riskConfig[status];

  return (
    <div className={`p-4 rounded-lg text-center ${currentRisk.styles}`}>
        <h3 className="text-xl font-bold flex items-center justify-center">{currentRisk.icon} Laycan Risk Analysis</h3>
        <p className="text-lg mt-2">{currentRisk.message}</p>
        
        {suggestion?.adjustments?.length > 0 && status === 'late' && (
          <div className="mt-4 border-t border-red-700 pt-3">
            <p className="font-semibold text-yellow-300">Suggestion: An optimized plan has been calculated to meet the laycan.</p>
            <p className="text-sm text-yellow-400">This involves increasing speed on legs with the best weather conditions.</p>
            <button 
                onClick={onOptimize} 
                disabled={loading} 
                className="inline-flex items-center mt-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500"
            >
              {loading && <IconSpinner />}
              {loading ? 'Simulating...' : 'Run Optimized Simulation'}
            </button>
          </div>
        )}
    </div>
  );
};

const ResultCard = ({ title, result, isOptimized = false }) => (
  <div className={`bg-gray-800/50 border border-gray-700 p-4 rounded-lg transition-all ${isOptimized ? 'shadow-lg shadow-yellow-500/20 border-yellow-500' : ''}`}>
    <h3 className={`text-lg font-semibold text-center ${isOptimized ? 'text-yellow-400' : 'text-gray-200'}`}>{title}</h3>
    <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between items-center"><span className="text-gray-400">ETA (UTC)</span> <span className="font-mono">{new Date(result.total.eta).toUTCString()}</span></div>
        <div className="flex justify-between items-center"><span className="text-gray-400">Voyage Time</span> <span className="font-bold">{(result.total.voyage_hours / 24).toFixed(1)} days</span></div>
        <div className="flex justify-between items-center"><span className="text-gray-400">Total Fuel</span> <span className="font-bold">{formatNumber(result.total.fuel_consumption_mt)} MT</span></div>
        <div className="flex justify-between items-center"><span className="text-gray-400">Total Cost</span> <span className="font-bold text-green-400">${formatNumber(result.total.costs.total_voyage_cost_usd)}</span></div>
        {result.total.laycanRisk && <div className="flex justify-between items-center"><span className="text-gray-400">Laycan</span> <span className="font-bold capitalize">{result.total.laycanRisk.status.replace('_', ' ')}</span></div>}
    </div>
  </div>
);

const LegsTable = ({ legs, title, adjustments = [] }) => {
  return (
    <div>
      <h4 className="font-semibold text-center mb-2">{title}</h4>
      <div className="overflow-auto max-h-96 rounded-lg border border-gray-700">
        <table className="w-full text-sm text-left">
        <thead className="sticky top-0 bg-gray-800 text-xs text-gray-400 uppercase">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3">From</th>
            <th className="p-3">To</th>
            <th className="p-3">Dist(nm)</th>
            <th className="p-3">STW Cmd</th>
            <th className="p-3">STW Eff</th>
            <th className="p-3">SОG</th>
            <th className="p-3">Fuel (MT)</th>
            {adjustments.length > 0 && <th className="p-3">Priority</th>}
            <th className="p-3">ETA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {legs.map((leg) => {
            const adjustment = adjustments.find(adj => adj.legIndex === leg.index);
            const priorityIndex = adjustments.findIndex(adj => adj.legIndex === leg.index);

            return (
                <tr key={leg.index} className="hover:bg-gray-700/50 transition-colors odd:bg-gray-900/20">
                    <td className="p-3 font-medium">{leg.index + 1}</td>
                    <td className="p-3 font-mono text-xs">{`${leg.from[0].toFixed(4)}, ${leg.from[1].toFixed(4)}`}</td>
                    <td className="p-3 font-mono text-xs">{`${leg.to[0].toFixed(4)}, ${leg.to[1].toFixed(4)}`}</td>
                    <td className="p-3">{leg.distance_nm}</td>
                    <td className="p-3">{leg.stw_commanded}</td>
                    <td className="p-3">{leg.stw_effective}</td>
                    <td className="p-3">{leg.sog}</td>
                    <td className="p-3">{leg.fuel_consumption_mt}</td>
                    {adjustments.length > 0 && (
                      <td className="p-3">
                        {adjustment ? (
                          <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-300 rounded-full">
                            High #{priorityIndex + 1}
                          </span>
                        ) : (
                          <span className="text-gray-500">Normal</span>
                        )}
                      </td>
                    )}
                    <td className="p-3 font-mono text-xs">{new Date(leg.arrivalTime).toUTCString()}</td>
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