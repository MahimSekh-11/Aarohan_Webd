import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Store, UserCircle, LogOut, LayoutDashboard, Globe } from 'lucide-react';
import { NotificationBell } from './NotificationProvider';
import { useLanguageStore, LANGUAGE_NAMES, Language } from '../store/useLanguageStore';
import { useT } from './Translate';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { currentLang, setLanguage } = useLanguageStore();
  const t = useT();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="flex justify-between items-center mb-6 pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 shadow-sm hover:opacity-90 transition cursor-pointer max-h-12">
          <div className="w-[38px] h-[38px] sm:w-10 sm:h-10 bg-[#10B981] rounded-xl flex items-center justify-center text-[#0B0F19] font-black text-lg sm:text-xl shrink-0 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            T
          </div>
          <h1 className="text-sm sm:text-2xl font-black tracking-tight text-[#10B981] cursor-pointer leading-tight max-w-[130px] sm:max-w-none drop-shadow-[0_0_6px_rgba(16,185,129,0.15)]">
            TIORKHALI MART
          </h1>
        </Link>

        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-[#1E293B] border border-[#334155] rounded-lg px-2 py-1">
          <Globe className="w-3 h-3 text-[#10B981] shrink-0" />
          <select
            aria-label="Language"
            value={currentLang}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-transparent text-white text-xs sm:text-sm outline-none cursor-pointer"
          >
            {(Object.keys(LANGUAGE_NAMES) as Language[]).map(lang => (
              <option key={lang} value={lang} className="bg-[#1E293B]">
                {LANGUAGE_NAMES[lang]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 pl-1 sm:pl-2">
        {user ? (
          <>
            <div className="hidden md:block text-right mr-2">
              <p className="text-[10px] font-black text-[#8B5CF6] uppercase tracking-widest">{user.role}</p>
              <p className="text-sm font-bold text-[#F9FAFB]">{user.name}</p>
            </div>

            <NotificationBell />

            {user.role === 'admin' && (
              <Link to="/admin" className="text-[#F9FAFB] text-xs sm:text-sm font-bold hover:text-[#10B981] hover:border-[#10B981]/50 flex items-center gap-1 bg-[#1E293B]/80 backdrop-blur-md px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-[#334155] shadow-sm transition">
                <LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">{t('Admin')}</span>
              </Link>
            )}
            {user.role === 'manager' && (
              <Link to="/manager" className="text-[#F9FAFB] text-xs sm:text-sm font-bold hover:text-[#10B981] hover:border-[#10B981]/50 flex items-center gap-1 bg-[#1E293B]/80 backdrop-blur-md px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-[#334155] shadow-sm transition">
                <Store className="w-4 h-4" /> <span className="hidden sm:inline">{t('Dashboard')}</span>
              </Link>
            )}
            {user.role === 'customer' && (
              <Link to="/customer" className="text-[#F9FAFB] text-xs sm:text-sm font-bold hover:text-[#10B981] hover:border-[#10B981]/50 flex items-center gap-1 bg-[#1E293B]/80 backdrop-blur-md px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-[#334155] shadow-sm transition">
                <UserCircle className="w-4 h-4" /> <span className="hidden sm:inline">{t('Requests')}</span>
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-white hover:bg-red-500/20 flex items-center gap-1 bg-[#1E293B]/80 backdrop-blur-md px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-[#334155] shadow-sm transition cursor-pointer font-bold"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-[#F9FAFB] text-xs sm:text-sm font-black uppercase tracking-wider hover:text-[#10B981] transition cursor-pointer">{t('LOG IN')}</Link>
            <Link to="/register" className="cyber-btn-premium text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md">
              {t('SIGN UP')}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
