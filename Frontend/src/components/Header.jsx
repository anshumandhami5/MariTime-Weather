import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X , Waves } from "lucide-react"; 

export default function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { name: "Home", path: "/" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Forecast", path: "/forecast" },
    { name: "Map", path: "/map" },
    { name: "AI Assistant", path: "/chatbot" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-white/10 shadow-lg">
      <nav className="max-w-7xl mx-auto flex justify-between items-center px-6 sm:px-6 lg:px-8 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Waves className="w-8 h-8 text-teal-400" />
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-teal-200 via-white to-cyan-300 bg-clip-text text-transparent tracking-wide">
             Marine Weather
          </h1>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-8">
          {links.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`relative font-medium transition duration-300 ${
                location.pathname === link.path
                  ? "text-teal-300"
                  : "text-gray-300 hover:text-teal-300"
              }`}
            >
              {link.name}
              {/* underline effect */}
              <span
                className={`absolute left-0 -bottom-1.5 h-0.5 bg-teal-400 transition-all duration-300 ${
                  location.pathname === link.path ? "w-full" : "w-0 group-hover:w-full"
                }`}
              ></span>
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-300 hover:text-teal-300 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-900/95 border-t border-white/10">
          <div className="flex flex-col space-y-1 px-4 pt-2 pb-4">
            {links.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 rounded-md text-lg font-medium transition duration-300 ${
                  location.pathname === link.path
                    ? "bg-teal-500/20 text-teal-300"
                    : "text-gray-300 hover:bg-white/10 hover:text-teal-300"
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
