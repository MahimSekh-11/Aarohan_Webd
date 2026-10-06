import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Navbar from './components/Navbar';
const Marketplace=lazy(()=>import('./pages/Marketplace'));
const Login=lazy(()=>import('./pages/Login'));
const AdminLogin=lazy(()=>import('./pages/AdminLogin'));
const Register=lazy(()=>import('./pages/Register'));
const ManagerDashboard=lazy(()=>import('./pages/ManagerDashboard'));
const AdminDashboard=lazy(()=>import('./pages/AdminDashboard'));
const CustomerDashboard=lazy(()=>import('./pages/CustomerDashboard'));
const Account=lazy(()=>import('./pages/Account'));
import { useT } from './components/Translate';
import Landing from './pages/Landing';
const VoiceAgent=lazy(()=>import('./components/VoiceAgent'));
import { useLanguageStore } from './store/useLanguageStore';

import { NotificationProvider } from './components/NotificationProvider';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'manager' | 'customer' }) {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function Footer(){const t=useT();return <footer className="site-footer w-full"><strong>TIORKHALI MART</strong><span>{t("Developed with passion by")} Mahim Ali Sekh · {t("© 2026 Tiorkhali Mart. All Rights Reserved.")}</span></footer>;}
function PageRoutes(){
  const location=useLocation(),t=useT(),language=useLanguageStore(s=>s.currentLang);
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});document.title=`TIORKHALI MART · ${t(location.pathname==='/marketplace'?'Marketplace':location.pathname==='/account'?'Account':location.pathname==='/manager'?'Dashboard':location.pathname==='/admin'?'Admin':location.pathname==='/customer'?'My Requests':location.pathname==='/register'?'Create Account':location.pathname.includes('login')?'LOG IN':'TIORKHALI MART')}`;},[location.pathname,t,language]);
  return <div className="page-content" key={location.pathname}><Suspense fallback={<div className="card-skeleton my-8"/>}><Routes>
    <Route path="/" element={<Landing/>}/><Route path="/marketplace" element={<Marketplace/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/><Route path="/admin/login" element={<AdminLogin/>}/>
    <Route path="/account" element={<ProtectedRoute><Account/></ProtectedRoute>}/><Route path="/manager" element={<ProtectedRoute role="manager"><ManagerDashboard/></ProtectedRoute>}/><Route path="/customer" element={<ProtectedRoute role="customer"><CustomerDashboard/></ProtectedRoute>}/><Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard/></ProtectedRoute>}/><Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></Suspense></div>;
}

export default function App() {
  const t=useT();
  const initialize = useAuthStore((state) => state.initialize);
  const language = useLanguageStore(state => state.currentLang);

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <NotificationProvider>
      <Router>
        <div className="app-shell min-h-screen text-[#F3F6F9] flex flex-col font-sans selection:bg-[#83D9BD]/30 selection:text-[#83D9BD]">
          <a href="#main-content" className="skip-link">{t('Skip to content')}</a>
          <Navbar />
          <Suspense fallback={null}><VoiceAgent /></Suspense>
          <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <PageRoutes/>
          </main>
          <Footer/>
        </div>
      </Router>
    </NotificationProvider>
  );
}

