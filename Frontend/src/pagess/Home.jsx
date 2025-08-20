import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200 overflow-hidden">
      
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
          alt="ocean"
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center max-w-3xl px-6 space-y-6">
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight bg-gradient-to-r from-yellow-300 via-white to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
          Marine Weather Hub
        </h1>
        <p className="text-lg md:text-xl text-blue-100 font-medium drop-shadow-md">
          Your trusted platform for real-time marine forecasts, ship routes, and AI-powered chatbot assistance.
        </p>

        {/* Call-to-Actions */}
        <div className="flex justify-center gap-6 mt-6">
          <Link
            to="/dashboard"
            className="px-6 py-3 rounded-2xl bg-yellow-400 text-blue-900 font-bold shadow-lg hover:bg-yellow-300 transform hover:scale-105 transition duration-300"
          >
            🚀 Explore Dashboard
          </Link>
          <Link
            to="/chatbot"
            className="px-6 py-3 rounded-2xl border border-yellow-300 text-yellow-300 font-semibold hover:bg-yellow-300 hover:text-blue-900 shadow-lg transform hover:scale-105 transition duration-300"
          >
            🤖 Talk to Chatbot
          </Link>
        </div>
      </div>

      {/* Decorative Waves at Bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          className="w-full h-32 fill-blue-200"
        >
          <path
            d="M0,192L60,176C120,160,240,128,360,138.7C480,149,600,203,720,224C840,245,960,235,1080,197.3C1200,160,1320,96,1380,64L1440,32V320H0Z"
          ></path>
        </svg>
      </div>
    </div>
  );
}
