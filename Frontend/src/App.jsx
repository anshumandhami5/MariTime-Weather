import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pagess/Home";
 


export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-blue-100">
        <Header />
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Home />} />
          
          </Routes>
        </main>
      </div>
    </Router>
  );
}
