import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 bg-gradient-to-b from-blue-900 to-gray-900 text-white">
    
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black opacity-50"></div>
  
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Cdefs%3E%3Cfilter%20id%3D%22f%22%20x%3D%22-200%25%22%20y%3D%22-200%25%22%20width%3D%22400%25%22%20height%3D%22400%25%22%3E%3CfeGaussianBlur%20stdDeviation%3D%22100%22%2F%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20fill%3D%22%230c4a6e%22%20width%3D%22100%25%22%20height%3D%22100%25%22%2F%3E%3Cg%20filter%3D%22url(%23f)%22%3E%3Cellipse%20fill%3D%22%230891b2%22%20cx%3D%22400%22%20cy%3D%22400%22%20rx%3D%22200%22%20ry%3D%22200%22%2F%3E%3Cellipse%20fill%3D%22%230369a1%22%20cx%3D%22100%22%20cy%3D%22100%22%20rx%3D%22150%22%20ry%3D%22150%22%2F%3E%3Cellipse%20fill%3D%22%23075985%22%20cx%3D%22700%22%20cy%3D%22600%22%20rx%3D%22180%22%20ry%3D%22120%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')] bg-cover bg-no-repeat opacity-20 animate-[pulse_15s_ease-in-out_infinite]"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center max-w-4xl px-6 space-y-8 animate-[fadeIn_1.5s_ease-in-out]">
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-teal-200 via-white to-cyan-300 bg-clip-text text-transparent drop-shadow-xl">
          Navigate the Elements with Confidence
        </h1>
        <p className="text-lg md:text-xl text-blue-200 font-light max-w-2xl mx-auto drop-shadow-lg">
          Precision forecasts and intelligent insights for every voyage. Your compass in the digital sea, providing real-time maritime conditions at your fingertips.
        </p>

        {/* Call-to-Actions */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-4">
          <Link
            to="/dashboard"
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-teal-500 rounded-lg shadow-lg overflow-hidden transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl w-full sm:w-auto"
          >
            <span className="absolute h-0 w-0 rounded-full bg-teal-400 transition-all duration-500 ease-out group-hover:h-56 group-hover:w-56"></span>
            <span className="relative flex items-center gap-2">
              Launch Dashboard <ArrowRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            to="/chatbot"
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-teal-300 bg-transparent border-2 border-teal-400 rounded-lg shadow-lg overflow-hidden transition-all duration-300 ease-in-out hover:bg-teal-400/20 hover:text-white w-full sm:w-auto"
          >
            <span className="relative">Ask Our AI Assistant</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
