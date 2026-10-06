import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useT } from '../components/Translate';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'customer',
    address: '',
    storeName: '',
    location: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const t = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
         throw new Error(res.ok ? 'Unexpected response format.' : 'Server is currently unavailable or returned an error.');
      }

      if (!res.ok) throw new Error(data?.message || 'Registration failed');

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-gradient-to-br from-[#1E293B] to-[#0B0F19] p-8 rounded-[32px] border border-[#334155] shadow-2xl text-center text-[#F9FAFB]">
        <h2 className="text-2xl font-black mb-2 text-[#10B981]">{t('Registration Successful')}</h2>
        <p className="opacity-90 font-medium text-sm text-[#9CA3AF]">
          {formData.role === 'manager'
            ? "Your store manager account is pending admin approval."
            : "You can now log in."}
        </p>
        <p className="text-xs mt-6 opacity-80 font-black uppercase tracking-widest font-mono animate-pulse">{t('Redirecting to login...')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 bg-[#1E293B] p-8 border border-[#334155] rounded-[32px] shadow-2xl">
      <h2 className="text-2xl font-black text-[#F9FAFB] mb-6 text-center tracking-tight">{t('Create Account')}</h2>
      {error && (
        <div className="bg-red-950/40 text-red-400 p-3.5 rounded-xl mb-4 text-xs font-bold border border-red-900/30 font-mono">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">{t('Full Name')}</label>
          <input
            type="text" required
            className="w-full px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] border border-[#334155] rounded-xl focus:ring-2 focus:ring-[#10B981] outline-none font-semibold transition"
            value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">{t('Phone Number')}</label>
          <input
            type="text" required
            className="w-full px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] border border-[#334155] rounded-xl focus:ring-2 focus:ring-[#10B981] outline-none font-semibold transition"
            value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">{t('Password')}</label>
          <input
            type="password" required
            className="w-full px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] border border-[#334155] rounded-xl focus:ring-2 focus:ring-[#10B981] outline-none font-semibold transition"
            value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>

        <div className="bg-[#0B0F19] p-4 rounded-2xl border border-[#334155]">
          <label className="block text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-3 font-mono">{t('Registering as a:')}</label>
          <div className="flex gap-6">
            <label className="flex items-center cursor-pointer select-none">
              <input type="radio" value="customer" checked={formData.role === 'customer'}
                onChange={(e) => setFormData({...formData, role: e.target.value})} className="accent-[#10B981] w-4.5 h-4.5 cursor-pointer" />
              <span className="ml-2 font-bold text-sm text-[#F9FAFB]">{t('Customer')}</span>
            </label>
            <label className="flex items-center cursor-pointer select-none">
              <input type="radio" value="manager" checked={formData.role === 'manager'}
                onChange={(e) => setFormData({...formData, role: e.target.value})} className="accent-[#10B981] w-4.5 h-4.5 cursor-pointer" />
              <span className="ml-2 font-bold text-sm text-[#F9FAFB]">{t('Store Manager')}</span>
            </label>
          </div>
        </div>

        {formData.role === 'customer' && (
          <div>
            <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">{t('Delivery Address')}</label>
            <textarea required
              className="w-full px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] border border-[#334155] rounded-xl focus:ring-2 focus:ring-[#10B981] outline-none font-semibold transition resize-none min-h-[4rem]"
              value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>
        )}

        {formData.role === 'manager' && (
          <>
            <div>
              <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">{t('Store Name')}</label>
              <input type="text" required
                className="w-full px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] border border-[#334155] rounded-xl focus:ring-2 focus:ring-[#10B981] outline-none font-semibold transition"
                value={formData.storeName} onChange={(e) => setFormData({...formData, storeName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">{t('Store Location (Village area)')}</label>
              <input type="text" required
                className="w-full px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] border border-[#334155] rounded-xl focus:ring-2 focus:ring-[#10B981] outline-none font-semibold transition"
                value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </>
        )}

        <button type="submit" className="cyber-btn-premium w-full text-white py-3.5 px-4 rounded-xl font-black mt-6 tracking-wider text-xs uppercase shadow-lg duration-300 transform-gpu">
          {t('Submit')}
        </button>
      </form>
      <p className="mt-6 text-center text-xs font-bold text-[#9CA3AF] font-mono">
        {t('Already have an account?')} <Link to="/login" className="cursor-pointer text-[#10B981] hover:underline uppercase tracking-wide">{t('Log In')}</Link>
      </p>
    </div>
  );
}
