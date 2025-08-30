import React, {useState} from 'react';
import Header from "./components/Header";
import Home from "./pagess/Home";
import Dashboard from "./pagess/Dashboard"; 
import Forecast from "./pagess/Forecast";
import Map from "./pagess/Map";
import Chatbot from "./pagess/chatbot"; 
import SimulationPanel from "./pagess/SimulationPanel";

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-blue-100 font-sans">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8 space-y-16">
        <section id="home"><Home /></section>
        <section id="dashboard"><Dashboard /></section>
        <section id="forecast"><Forecast /></section>
        <section id="map"><Map /></section>
        <section id="simulation"><SimulationPanel /></section>
        {/* <section id="chatbot"><Chatbot /></section> */}
      </main>
    </div>
  )
}

export default App
