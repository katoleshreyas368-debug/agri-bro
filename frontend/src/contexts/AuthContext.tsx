import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  type: 'farmer' | 'buyer' | 'vendor';
  phone: string;
  location: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('agribro_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const login = async (userData: User) => {
    // Send to backend to create or fetch user
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!res.ok) throw new Error('Failed to login');
      const { user } = await res.json();
      setUser(user);
      localStorage.setItem('agribro_user', JSON.stringify(user));
      return user;
    } catch (err) {
      console.error('Login error', err);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('agribro_user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};