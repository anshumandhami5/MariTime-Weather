import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react"; 

export default function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { name: "Home", path: "/" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Forecast", path: "/forecast" },
    { name: "Map", path: "/map" },
    { name: "Chatbot", path: "/chatbot" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-blue-600/80 backdrop-blur-md shadow-lg">
      <nav className="container mx-auto flex justify-between items-center px-6 py-4">
        {/* Brand */}
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 via-white to-yellow-500 bg-clip-text text-transparent tracking-wide">
          🌊 Marine Weather
        </h1>

        {/* Desktop Links */}
        <div className="hidden md:flex space-x-8">
          {links.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`relative font-medium transition duration-300 hover:text-yellow-300 ${
                location.pathname === link.path
                  ? "text-yellow-400 font-semibold"
                  : "text-white"
              }`}
            >
              {link.name}
              {/* underline effect */}
              <span
                className={`absolute left-0 -bottom-1 h-[2px] w-0 bg-yellow-400 transition-all duration-300 ${
                  location.pathname === link.path ? "w-full" : "hover:w-full"
                }`}
              ></span>
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-blue-700/90 backdrop-blur-md shadow-lg">
          <div className="flex flex-col space-y-4 px-6 py-4">
            {links.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`text-lg font-medium transition duration-300 ${
                  location.pathname === link.path
                    ? "text-yellow-400 font-semibold"
                    : "text-white hover:text-yellow-300"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
