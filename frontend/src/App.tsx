
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Marketplace from './pages/Marketplace';
import InputStore from './pages/InputStore';
import AIAdvisor from './pages/AIAdvisor';
import Logistics from './pages/Logistics';
import FarmerLogistics from './pages/FarmerLogistics';
import VendorLogistics from './pages/VendorLogistics';
import RetailerLogistics from './pages/RetailerLogistics';
import TransporterDashboard from './pages/TransporterDashboard';
import Community from './pages/Community';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ImageUpload from "./components/ImageUpload";
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-gray-50">
      {!isLanding && <Navbar />}

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/inputs" element={<InputStore />} />
        <Route path="/advisor" element={<AIAdvisor />}>
          <Route path="chat" element={<AIAdvisor />} />
          <Route path="chat/:chatId" element={<AIAdvisor />} />
          <Route path="bookmarks" element={<AIAdvisor />} />
          <Route path="favorites" element={<AIAdvisor />} />
          <Route path="trash" element={<AIAdvisor />} />
          <Route path="community" element={<AIAdvisor />} />
        </Route>
        <Route path="/logistics" element={<Logistics />} />
        <Route path="/logistics/farmer" element={<FarmerLogistics />} />
        <Route path="/logistics/vendor" element={<VendorLogistics />} />
        <Route path="/logistics/buyer" element={<RetailerLogistics />} />
        <Route path="/logistics/transporter" element={<TransporterDashboard />} />
        <Route path="/community" element={<Community />} />
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute allowedRoles={['farmer']} />}>
          <Route path="/dashboard/farmer" element={<Dashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['vendor']} />}>
          <Route path="/dashboard/vendor" element={<Dashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['buyer']} />}>
          <Route path="/dashboard/buyer" element={<Dashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['transporter']} />}>
          <Route path="/dashboard/transporter" element={<Dashboard />} />
        </Route>

        {/* Fallback dashboard route, redirects based on role */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<ImageUpload />} />
        </Route>
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <AppContent />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
