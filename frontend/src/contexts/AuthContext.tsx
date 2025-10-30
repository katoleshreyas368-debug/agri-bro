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
  token: string | null;
  login: (user: Omit<User, 'id'>) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('agribro_user');
    const savedToken = localStorage.getItem('agribro_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5001'; // Standardized port

  const login = async (userData: Omit<User, 'id'>) => {
    // Send to backend to create or fetch user
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!res.ok) throw new Error('Failed to login');
      const { user, token } = await res.json();
      setUser(user);
      setToken(token);
      localStorage.setItem('agribro_user', JSON.stringify(user));
      localStorage.setItem('agribro_token', token);
      return user;
    } catch (err) {
      console.error('Login error', err);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('agribro_user');
    localStorage.removeItem('agribro_token');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout,
      token,
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