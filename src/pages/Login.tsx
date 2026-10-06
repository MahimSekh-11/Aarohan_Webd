import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useT } from '../components/Translate';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy,setBusy]=useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const t = useT();

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
        throw new Error('Server is currently unavailable or returned an error.');
      }

      if (!res.ok) throw new Error(data?.message || 'Login failed');

      setAuth(data.token, data.user);
      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'manager') navigate('/manager');
      else navigate('/customer');
    } catch (err: any) {
      setError(err.message);
    }finally{setBusy(false);}
  };

  return (
    <div className="auth-card max-w-md mx-auto mt-12 bg-[#162638] p-8 border border-[#2B4054] rounded-[32px] shadow-2xl">
      <div className="w-16 h-16 bg-[#83D9BD] rounded-2xl flex items-center justify-center text-[#0D1825] font-black text-3xl mx-auto mb-6 shadow-[0_0_15px_rgba(16,185,129,0.3)] select-none">{t("T")}</div>
      <h2 className="text-2xl font-black text-[#F3F6F9] mb-6 text-center tracking-tight">{t('Welcome Back')}</h2>
      {error && (
        <div role="alert" className="bg-red-950/40 text-red-400 p-3.5 rounded-xl mb-5 text-xs font-bold border border-red-900/30 font-sans">
          {t(error)}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-field-1" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-2 tracking-widest font-sans">{t('Phone Number')}</label>
          <input id="login-field-1"
            type="text"
            required
            className="w-full px-4 py-3 bg-[#0D1825] text-[#F3F6F9] border border-[#2B4054] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#83D9BD] font-semibold transition"
            inputMode="tel" autoComplete="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="login-field-2" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-2 tracking-widest font-sans">{t('Password')}</label>
          <input id="login-field-2"
            type="password" autoComplete="current-password"
            required
            className="w-full px-4 py-3 bg-[#0D1825] text-[#F3F6F9] border border-[#2B4054] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#83D9BD] font-semibold transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit" disabled={busy}
          className="cyber-btn-premium cursor-pointer w-full text-white py-3.5 px-4 rounded-xl font-black mt-2 tracking-wider text-xs uppercase shadow-lg duration-300 transform-gpu"
        >
          {t('LOG IN')}
        </button>
      </form>
      <p className="mt-6 text-center text-xs font-bold text-[#A5B7C8] font-sans">
        {t('New to TIORKHALI MART?')}{' '}
        <Link to="/register" className="cursor-pointer text-[#83D9BD] hover:underline uppercase tracking-wide">
          {t('Sign Up')}
        </Link>
      </p>
      <div className="mt-4 pt-4 border-t border-[#2B4054] text-center">
        <Link
          to="/admin/login"
          className="cursor-pointer text-[10px] font-black text-[#A5B7C8] hover:text-[#83D9BD] uppercase tracking-widest transition-colors font-sans"
        >
          {t('Admin Portal Login')}
        </Link>
      </div>
    </div>
  );
}
