import { useT } from '../components/Translate';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function AdminLogin() {
  const t = useT();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy,setBusy]=useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(res.ok ? 'Unexpected response format.' : 'Server is currently unavailable or returned an error.');
      }

      if (!res.ok) {
        setError(data.message || 'Login failed');
        return;
      }

      if (data.user.role !== 'admin') {
        setError('Only administrators can log in here.');
        return;
      }

      setAuth(data.token, data.user);
      navigate('/admin');
    } catch (err: any) {
      setError('An error occurred during login. Please try again.');
    }finally{setBusy(false);}
  };

  return (
    <div className="auth-card max-w-md mx-auto mt-12 bg-[#162638] p-8 border border-[#2B4054] rounded-[32px] shadow-2xl">
      <div className="w-16 h-16 bg-[#E6B879] rounded-2xl flex items-center justify-center text-[#0D1825] font-black text-3xl mx-auto mb-6 shadow-[0_0_15px_rgba(139,92,246,0.35)] select-none">{t("A")}</div>
      <h2 className="text-2xl font-black text-[#F3F6F9] mb-2 text-center tracking-tight">{t('Admin Access')}</h2>
      <p className="text-center text-[#A5B7C8] font-semibold mb-6 text-xs uppercase tracking-wider font-sans">{t('Secure Portal Login')}</p>

      {error && (
        <div role="alert" className="bg-red-950/40 text-red-400 p-3.5 rounded-xl mb-4 text-xs font-bold border border-red-900/30 font-sans">
          {t(error)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="adminlogin-field-1" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-2 tracking-widest font-sans">{t('Phone Number')}</label>
          <input id="adminlogin-field-1"
            type="text"
            required
            className="w-full px-4 py-3 bg-[#0D1825] text-[#F3F6F9] border border-[#2B4054] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E6B879] font-semibold transition"
            inputMode="tel" autoComplete="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="adminlogin-field-2" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-2 tracking-widest font-sans">{t('Password')}</label>
          <input id="adminlogin-field-2"
            type="password" autoComplete="current-password"
            required
            className="w-full px-4 py-3 bg-[#0D1825] text-[#F3F6F9] border border-[#2B4054] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E6B879] font-semibold transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit" disabled={busy}
          className="cursor-pointer w-full bg-gradient-to-r from-[#E6B879] to-[#7C3AED] hover:from-[#F1C998] hover:to-[#E6B879] text-white py-3.5 px-4 rounded-xl font-black mt-6 tracking-wider uppercase shadow-lg transition-transform hover:-translate-y-0.5 duration-300 transform-gpu"
        >{t("Authenticate")}</button>
      </form>
    </div>
  );
}
