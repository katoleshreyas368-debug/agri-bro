import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Marketplace', href: '/marketplace' },
    { name: 'Input Store', href: '/inputs' },
    { name: 'AI Advisor', href: '/advisor' },
    { name: 'Logistics', href: '/logistics' },
    { name: 'Community', href: '/community' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 font-poppins">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 no-underline group">
              <span className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center text-xl shadow-lg shadow-brand-green/20 group-hover:scale-110 transition-transform">
                🌿
              </span>
              <span className="text-xl font-black text-gray-900 tracking-tight">AgriBro</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-[13px] font-bold uppercase tracking-widest transition-all duration-300 relative py-1 group ${isActive(item.href) ? 'text-brand-green' : 'text-gray-500 hover:text-brand-green'
                  }`}
              >
                {item.name}
                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-brand-green transform origin-left transition-transform duration-300 ${isActive(item.href) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest bg-gray-50 text-gray-700 hover:bg-brand-green-light hover:text-brand-green transition-all"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>{user?.name}</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-brand-green text-white px-8 py-3 rounded-full text-[12px] font-black uppercase tracking-widest hover:bg-brand-green-dark hover:scale-105 transition-all shadow-lg shadow-brand-green/20"
              >
                Get Started
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-700 hover:text-brand-green hover:bg-brand-green-light rounded-xl transition-all"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/80 backdrop-blur-xl">
          <div className="px-6 py-8 space-y-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`block text-sm font-bold uppercase tracking-widest transition-all ${isActive(item.href) ? 'text-brand-green' : 'text-gray-500 hover:text-brand-green'
                  }`}
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {isAuthenticated ? (
              <div className="pt-6 mt-6 border-t border-gray-100 space-y-4">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  <User size={18} />
                  <span>Dashboard ({user?.name})</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 w-full text-left text-sm font-bold uppercase tracking-widest text-red-500"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="pt-6 mt-6 border-t border-gray-100">
                <Link
                  to="/login"
                  className="block w-full text-center bg-brand-green text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-brand-green/20"
                  onClick={() => setIsOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;