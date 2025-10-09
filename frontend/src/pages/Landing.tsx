import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Farming images
const images = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1500&q=80", // Beautiful green farm landscape with rolling hills
  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1500&q=80", // Modern farming with technology
  "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=1500&q=80", // Fresh vegetables and produce
  "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1500&q=80", // Farm field with crops
  "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1500&q=80", // Green farm landscape
  "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=1500&q=80", // Colorful vegetable garden
  "https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?auto=format&fit=crop&w=1500&q=80", // Bell peppers growing
  ];

const Landing: React.FC = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen relative overflow-hidden bg-transparent">
      {/* Sliding Background Images */}
      {images.map((img, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 z-0 transition-opacity duration-1000`}
          style={{
            backgroundImage: `url('${img}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: current === idx ? 1 : 0,
          }}
        />
      ))}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black" style={{ opacity: 0.3, zIndex: 10 }}></div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6 text-white">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-green-600">AgriBro</span>
          <span className="text-green-200 text-sm font-semibold ml-2">
            Seeds to Market
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-20 flex flex-col items-center justify-center text-center pt-32 pb-16">
        <p className="text-green-200 text-lg mb-4">
          Get personalized crop recommendations, real-time weather insights, market analysis, and a dedicated marketplace tailored to your farm's unique conditions.
        </p>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 max-w-3xl">
          Smart Decisions for Better Harvests
        </h1>
        <div className="flex gap-4 mt-4">
          <a
            href="#"
            className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-green-600 transition"
          >
            Read the article
          </a>
          <a
            href="#"
            className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-green-600 transition"
          >
            Sign up now
          </a>
        </div>
      </section>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 w-full flex justify-center gap-2 pb-4 z-20">
        <button className="bg-black bg-opacity-60 text-white px-4 py-2 rounded-l-lg">
          What we are upto?
        </button>
        <button className="bg-black bg-opacity-60 text-white px-4 py-2">
          Our Stand Socially
        </button>
        <button className="bg-yellow-500 text-black px-4 py-2 font-semibold">
          About Us
        </button>
        <button className="bg-black bg-opacity-60 text-white px-4 py-2 rounded-r-lg">
          What's in news?
        </button>
      </div>
    </div>
  );
};

export default Landing;
