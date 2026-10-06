import { useT } from '../components/Translate';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function AdminLogin() {
  const t = useT();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-[#1E293B] p-8 border border-[#334155] rounded-[32px] shadow-2xl">
      <div className="w-16 h-16 bg-[#8B5CF6] rounded-2xl flex items-center justify-center text-[#0B0F19] font-black text-3xl mx-auto mb-6 shadow-[0_0_15px_rgba(139,92,246,0.35)] select-none">{t("A")}</div>
      <h2 className="text-2xl font-black text-[#F9FAFB] mb-2 text-center tracking-tight">{t('Admin Access')}</h2>
      <p className="text-center text-[#9CA3AF] font-semibold mb-6 text-xs uppercase tracking-wider font-mono">{t('Secure Portal Login')}</p>
      
      {error && (
        <div className="bg-red-950/40 text-red-400 p-3.5 rounded-xl mb-4 text-xs font-bold border border-red-900/30 font-mono">
          {t(error)}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-2 tracking-widest font-mono">{t('Phone Number')}</label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] border border-[#334155] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] font-semibold transition"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-2 tracking-widest font-mono">{t('Password')}</label>
          <input
            type="password"
            required
            className="w-full px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] border border-[#334155] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] font-semibold transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="cursor-pointer w-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#A78BFA] hover:to-[#8B5CF6] text-white py-3.5 px-4 rounded-xl font-black mt-6 tracking-wider uppercase shadow-lg transition-transform hover:-translate-y-0.5 duration-300 transform-gpu"
        >{t("Authenticate")}</button>
      </form>
    </div>
  );
}
