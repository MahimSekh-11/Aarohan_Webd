import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Navbar from './components/Navbar';
import Marketplace from './pages/Marketplace';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import Landing from './pages/Landing';
import VoiceAgent from './components/VoiceAgent';
import { useLanguageStore } from './store/useLanguageStore';

import { NotificationProvider } from './components/NotificationProvider';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'manager' | 'customer' }) {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

const RootRedirect = () => {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'manager') return <Navigate to="/manager" replace />;
  return <Navigate to="/customer" replace />;
};

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const language = useLanguageStore(state => state.currentLang);

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <NotificationProvider>
      <Router>
        <div className="min-h-screen bg-[#0B0F19] text-[#F9FAFB] flex flex-col font-sans selection:bg-[#10B981]/30 selection:text-[#10B981]">
          <Navbar />
          <VoiceAgent />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={
                <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/manager" element={
                <ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>
              } />
              <Route path="/customer" element={
                <ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </NotificationProvider>
  );
}

