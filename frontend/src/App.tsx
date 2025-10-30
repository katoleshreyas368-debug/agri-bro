import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Marketplace from './pages/Marketplace';
import InputStore from './pages/InputStore';
import AIAdvisor from './pages/AIAdvisor';
import Logistics from './pages/Logistics';
import Community from './pages/Community';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ImageUpload from "./components/ImageUpload";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('marketplace');

  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar setSidebarOpen={setSidebarOpen} />
          
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/inputs" element={<InputStore />} />
              <Route path="/advisor" element={<AIAdvisor />} />
              <Route path="/logistics" element={<Logistics />} />
              <Route path="/community" element={<Community />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/upload" element={<ImageUpload />} />
            </Routes>
          </div>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;