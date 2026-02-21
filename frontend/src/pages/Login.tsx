import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, MapPin, ChevronDown, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    userType: 'farmer' as 'farmer' | 'buyer' | 'vendor' | 'transporter'
  });
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const userPayload = {
      name: formData.name,
      phone: formData.phone,
      location: formData.location,
      type: formData.userType
    };
    try {
      await login(userPayload);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-poppins">
      {/* ── Left Section: Form ── */}
      <div className="w-full lg:w-[45%] flex flex-col p-8 lg:p-12 overflow-y-auto CustomScrollbar">
        {/* Header */}
        <div className="flex items-center justify-end mb-16">

          <div className="flex items-center space-x-6">
            <button className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors border border-gray-100 px-3 py-2 rounded-xl">
              <Globe size={14} />
              <span>EN</span>
              <ChevronDown size={12} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Join AGRIBro</h1>
            <p className="text-sm text-gray-400 font-medium">Let's start with some basic info about you.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-brand-green transition-colors" />
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Talha Aizan"
                    className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-green/20 focus:ring-4 focus:ring-brand-green/5 outline-none transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-brand-green transition-colors" />
                  <input
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+880 1..."
                    className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-green/20 focus:ring-4 focus:ring-brand-green/5 outline-none transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Location of Residence</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-brand-green transition-colors" />
                <input
                  name="location"
                  type="text"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Dhaka, Bangladesh"
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-green/20 focus:ring-4 focus:ring-brand-green/5 outline-none transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Sector / User Category</label>
              <div className="relative group">
                <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  className="w-full h-12 px-5 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium appearance-none focus:bg-white focus:border-brand-green/20 focus:ring-4 focus:ring-brand-green/5 outline-none transition-all cursor-pointer"
                >
                  <option value="farmer">Farmer / Producer</option>
                  <option value="buyer">Buyer / Retailer</option>
                  <option value="vendor">Input Vendor</option>
                  <option value="transporter">Logistics / Transporter</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
              </div>
            </div>

            {error && <p className="text-xs text-red-500 font-bold ml-1">{error}</p>}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-gray-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Activity className="animate-spin mx-auto h-5 w-5" />
                ) : (
                  'Sign Up'
                )}
              </button>
              <p className="text-center text-xs text-gray-400 mt-6 font-medium">
                Already have an account? <Link to="/login" className="text-gray-900 font-bold hover:underline">Login</Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-16 text-[9px] text-gray-300 font-bold uppercase tracking-widest text-center">
          © 2024 AGRIBro • Digitalizing Agriculture
        </div>
      </div>

      {/* ── Right Section: Visual ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1590682680695-43b964a3ae17?q=80&w=2070&auto=format&fit=crop"
          alt="Agriculture background"
          className="absolute inset-0 w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-10000"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/20 via-transparent to-white/10" />

        <div className="absolute top-12 right-12 flex items-center space-x-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">New here?</span>
          <Link to="/login" className="px-6 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-white hover:text-gray-900 transition-all">
            Join us
          </Link>
        </div>

        <div className="absolute bottom-16 left-16 right-16">
          <div className="max-w-md">
            <div className="bg-brand-green w-12 h-1 mb-6" />
            <h2 className="text-4xl font-black text-white leading-tight mb-4 drop-shadow-lg">
              Transforming the way <br /> you farm.
            </h2>
            <p className="text-white/70 text-sm font-medium leading-relaxed">
              Access the global marketplace, smart logistics, and AI-driven insights to boost your agricultural productivity.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .CustomScrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .CustomScrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .CustomScrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

const Activity = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

export default Login;