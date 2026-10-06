import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useT } from '../components/Translate';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const t = useT();

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
        throw new Error(res.ok ? 'Login successful, but received unexpected response format.' : 'Pending Approval! Your registration request is currently under review by the system administrator. To expedite your access approval, please contact Mahim Ali Sekh at +91 98321 87950.');
      }

      if (!res.ok) throw new Error(data?.message || 'Login failed');

      setAuth(data.token, data.user);
      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'manager') navigate('/manager');
      else navigate('/customer');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-[#1E293B] p-8 border border-[#334155] rounded-[32px] shadow-2xl">
      <div className="w-16 h-16 bg-[#10B981] rounded-2xl flex items-center justify-center text-[#0B0F19] font-black text-3xl mx-auto mb-6 shadow-[0_0_15px_rgba(16,185,129,0.3)] select-none">
        T
      </div>
      <h2 className="text-2xl font-black text-[#F9FAFB] mb-6 text-center tracking-tight">{t('Welcome Back')}</h2>
      {error && (
        <div className="bg-red-950/40 text-red-400 p-3.5 rounded-xl mb-5 text-xs font-bold border border-red-900/30 font-mono">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-2 tracking-widest font-mono">{t('Phone Number')}</label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] border border-[#334155] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] font-semibold transition"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-2 tracking-widest font-mono">{t('Password')}</label>
          <input
            type="password"
            required
            className="w-full px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] border border-[#334155] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981] font-semibold transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="cyber-btn-premium cursor-pointer w-full text-white py-3.5 px-4 rounded-xl font-black mt-2 tracking-wider text-xs uppercase shadow-lg duration-300 transform-gpu"
        >
          {t('LOG IN')}
        </button>
      </form>
      <p className="mt-6 text-center text-xs font-bold text-[#9CA3AF] font-mono">
        {t('New to TIORKHALI MART?')}{' '}
        <Link to="/register" className="cursor-pointer text-[#10B981] hover:underline uppercase tracking-wide">
          {t('Sign Up')}
        </Link>
      </p>
      <div className="mt-4 pt-4 border-t border-[#334155] text-center">
        <Link
          to="/admin/login"
          className="cursor-pointer text-[10px] font-black text-[#9CA3AF] hover:text-[#10B981] uppercase tracking-widest transition-colors font-mono"
        >
          {t('Admin Portal Login')}
        </Link>
      </div>
    </div>
  );
}
