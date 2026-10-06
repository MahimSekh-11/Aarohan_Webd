import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useT } from '../components/Translate';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    role: new URLSearchParams(window.location.search).get('role')==='manager' ? 'manager' : 'customer',
    address: '',
    storeName: '',
    location: ''
  });
  const [error, setError] = useState('');
  const [busy,setBusy]=useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const t = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();if(busy)return;setBusy(true);setError('');
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
    }finally{setBusy(false);}
  };

  if (success) {
    return (
      <div className="auth-card max-w-md mx-auto mt-12 bg-gradient-to-br from-[#162638] to-[#0D1825] p-8 rounded-[32px] border border-[#2B4054] shadow-2xl text-center text-[#F3F6F9]">
        <h2 className="text-2xl font-black mb-2 text-[#83D9BD]">{t('Registration Successful')}</h2>
        <p className="opacity-90 font-medium text-sm text-[#A5B7C8]">
          {formData.role === 'manager'
            ? t("Your store manager account is pending admin approval.")
            : t("You can now log in.")}
        </p>
        <p className="text-xs mt-6 opacity-80 font-black uppercase tracking-widest font-sans animate-pulse">{t('Redirecting to login...')}</p>
      </div>
    );
  }

  return (
    <div className="auth-card max-w-md mx-auto mt-8 bg-[#162638] p-8 border border-[#2B4054] rounded-[32px] shadow-2xl">
      <h2 className="text-2xl font-black text-[#F3F6F9] mb-6 text-center tracking-tight">{t('Create Account')}</h2>
      {error && (
        <div role="alert" className="bg-red-950/40 text-red-400 p-3.5 rounded-xl mb-4 text-xs font-bold border border-red-900/30 font-sans">
          {t(error)}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="register-field-1" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Full Name')}</label>
          <input id="register-field-1"
            type="text" required
            className="w-full px-4 py-3 bg-[#0D1825] text-[#F3F6F9] border border-[#2B4054] rounded-xl focus:ring-2 focus:ring-[#83D9BD] outline-none font-semibold transition"
            value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div>
          <label htmlFor="register-field-2" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Phone Number')}</label>
          <input id="register-field-2"
            type="text" required
            className="w-full px-4 py-3 bg-[#0D1825] text-[#F3F6F9] border border-[#2B4054] rounded-xl focus:ring-2 focus:ring-[#83D9BD] outline-none font-semibold transition"
            inputMode="tel" autoComplete="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
        <div>
          <label htmlFor="register-field-3" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Password')}</label>
          <input id="register-field-3"
            type="password" minLength={8} autoComplete="new-password" required
            className="w-full px-4 py-3 bg-[#0D1825] text-[#F3F6F9] border border-[#2B4054] rounded-xl focus:ring-2 focus:ring-[#83D9BD] outline-none font-semibold transition"
            value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>

        <div className="bg-[#0D1825] p-4 rounded-2xl border border-[#2B4054]">
          <label className="block text-[10px] font-black text-[#A5B7C8] uppercase tracking-widest mb-3 font-sans">{t('Registering as a:')}</label>
          <div className="flex gap-6">
            <label className="flex items-center cursor-pointer select-none">
              <input type="radio" value="customer" checked={formData.role === 'customer'}
                onChange={(e) => setFormData({...formData, role: e.target.value})} className="accent-[#83D9BD] w-4.5 h-4.5 cursor-pointer" />
              <span className="ml-2 font-bold text-sm text-[#F3F6F9]">{t('Customer')}</span>
            </label>
            <label className="flex items-center cursor-pointer select-none">
              <input type="radio" value="manager" checked={formData.role === 'manager'}
                onChange={(e) => setFormData({...formData, role: e.target.value})} className="accent-[#83D9BD] w-4.5 h-4.5 cursor-pointer" />
              <span className="ml-2 font-bold text-sm text-[#F3F6F9]">{t('Store Manager')}</span>
            </label>
          </div>
        </div>

        {formData.role === 'customer' && (
          <div>
            <label htmlFor="register-field-4" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Delivery Address')}</label>
            <textarea id="register-field-4" required
              className="w-full px-4 py-3 bg-[#0D1825] text-[#F3F6F9] border border-[#2B4054] rounded-xl focus:ring-2 focus:ring-[#83D9BD] outline-none font-semibold transition resize-none min-h-[4rem]"
              value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>
        )}

        {formData.role === 'manager' && (
          <>
            <div>
              <label htmlFor="register-field-5" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Store Name')}</label>
              <input id="register-field-5" type="text" required
                className="w-full px-4 py-3 bg-[#0D1825] text-[#F3F6F9] border border-[#2B4054] rounded-xl focus:ring-2 focus:ring-[#83D9BD] outline-none font-semibold transition"
                value={formData.storeName} onChange={(e) => setFormData({...formData, storeName: e.target.value})}
              />
            </div>
            <div>
              <label htmlFor="register-field-6" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Store Location (Village area)')}</label>
              <input id="register-field-6" type="text" required
                className="w-full px-4 py-3 bg-[#0D1825] text-[#F3F6F9] border border-[#2B4054] rounded-xl focus:ring-2 focus:ring-[#83D9BD] outline-none font-semibold transition"
                value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </>
        )}

        <button type="submit" disabled={busy} className="cyber-btn-premium w-full text-white py-3.5 px-4 rounded-xl font-black mt-6 tracking-wider text-xs uppercase shadow-lg duration-300 transform-gpu">
          {t('Submit')}
        </button>
      </form>
      <p className="mt-6 text-center text-xs font-bold text-[#A5B7C8] font-sans">
        {t('Already have an account?')} <Link to="/login" className="cursor-pointer text-[#83D9BD] hover:underline uppercase tracking-wide">{t('Log In')}</Link>
      </p>
    </div>
  );
}
