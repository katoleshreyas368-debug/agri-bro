import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Logistics: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.type === 'farmer') {
        navigate('/logistics/farmer');
      } else if (user.type === 'transporter') {
        navigate('/logistics/transporter');
      }
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-surface">
        <p className="text-xl text-gray-600">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-surface p-8 flex items-center justify-center">
      <div className="max-w-4xl w-full text-center">
        <p className="page-header__label">Logistics</p>
        <h1 className="page-header__title text-4xl mb-4">
          Agri-Logistics Hub
        </h1>
        <p className="page-header__subtitle text-xl mb-12 mx-auto">
          Please login to access the logistics network.
        </p>

        <div className="flex justify-center">
          <Link to="/login" className="flex items-center gap-2 bg-brand-green text-white px-8 py-4 rounded-full text-xl font-bold hover:bg-brand-green-dark transition">
            <Lock size={24} /> Login to Continue
          </Link>
        </div>

        <p className="mt-8 text-gray-500">
          Are you a <strong>Farmer</strong>? Login to request transport.<br />
          Are you a <strong>Transporter</strong>? Login to find jobs.
        </p>
      </div>
    </div>
  );
};

export default Logistics;
