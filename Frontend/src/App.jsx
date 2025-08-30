import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pagess/Home";
import Dashboard from "./pagess/Dashboard"; 
import Forecast from "./pagess/Forecast";
import Map from "./pagess/Map";
import Chatbot from "./pagess/chatbot"; 

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-blue-100">
        <Header />
        <main >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />
            } />
            <Route path="/forecast" element={<Forecast />
            } />
            <Route path="/map" element={<Map />
            } />
            <Route path="/chatbot" element={<Chatbot />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
