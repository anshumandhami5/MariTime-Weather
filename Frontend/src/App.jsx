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
    <div className="w-screen h-screen overflow-x-hidden bg-gradient-to-b from-[#0d1b2a] to-[#1b263b] font-sans text-white flex flex-col">
      <Header />
      <main className="flex-1 p-4 md:p-8 space-y-16">
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
