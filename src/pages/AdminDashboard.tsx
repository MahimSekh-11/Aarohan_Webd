import { useT } from '../components/Translate';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { CheckCircle, XCircle, Store, MapPin, Phone, User, UserX } from 'lucide-react';

export default function AdminDashboard() {
  const t = useT();
  const [error,setError]=useState('');
  const [managers, setManagers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stats, setStats] = useState({ customerCount: 0, managerCount: 0, productCount: 0 });
  const { token } = useAuthStore();

  const fetchData = async () => {
    setError('');try {
      const [mgrRes, custRes, statsRes] = await Promise.all([
        fetch('/api/admin/managers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/customers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if(!mgrRes.ok || !custRes.ok || !statsRes.ok)throw new Error();
      if (mgrRes.ok) setManagers(await mgrRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) { setError('Could not load dashboard. Please try again.'); }
  };

  useEffect(() => { fetchData(); }, [token]);

  const updateStatus = async (id: string, status: string) => {
    if(status==='rejected' && !confirm(t('Revoke access')+'?'))return;
    try {
      const response=await fetch(`/api/admin/managers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if(!response.ok)throw new Error();
      fetchData();
    } catch (e) { setError('Could not load dashboard. Please try again.'); }
  };

  const updateCustomerStatus = async (id: string, status: string) => {
    if(status==='rejected' && !confirm(t('Revoke access')+'?'))return;
    try {
      const response=await fetch(`/api/admin/customers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if(!response.ok)throw new Error();
      fetchData();
    } catch (e) { setError('Could not load dashboard. Please try again.'); }
  };

  const pending = managers.filter(m => m.status === 'pending');
  const suspended=managers.filter(m=>m.status==='rejected');
  const approved = managers.filter(m => m.status === 'approved');
  const activeCustomers = customers.filter(c => c.status !== 'rejected');
  const revokedCustomers = customers.filter(c => c.status === 'rejected');

  return (
    <div className="space-y-6 py-8"><p className="section-kicker">{t("Admin")}</p><h1 className="page-title">{t("Platform Health & Analytics")}</h1>{error&&<p role="alert" className="error-banner">{t(error)}<button className="button-secondary ml-2" onClick={()=>void fetchData()}>{t("Try again")}</button></p>}
      <div className="bg-[#2B4054] rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 flex flex-col justify-center border border-[#2B4054] shadow-sm mb-6">
        <p className="text-xs font-bold text-[#BAC9D6] uppercase mb-2">{t('Platform Health & Analytics')}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-[#F3F6F9]">{approved.length}</span>
            <span className="text-[10px] font-bold text-[#BAC9D6] mb-1 leading-tight uppercase tracking-wider">{t('Stores')}<br/>{t('Approved')}</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-[#E6B879]">{pending.length}</span>
            <span className="text-[10px] font-bold text-[#BAC9D6] mb-1 leading-tight uppercase tracking-wider">{t('Pending')}<br/>{t('Review')}</span>
          </div>
          <div className="flex items-end gap-2">
             <span className="text-4xl font-black text-[#83D9BD]">{stats.customerCount}</span>
             <span className="text-[10px] font-bold text-[#BAC9D6] mb-1 leading-tight uppercase tracking-wider">{t('Total')}<br/>{t('Customers')}</span>
          </div>
          <div className="flex items-end gap-2">
             <span className="text-4xl font-black text-sky-300">{stats.productCount}</span>
             <span className="text-[10px] font-bold text-[#BAC9D6] mb-1 leading-tight uppercase tracking-wider">{t('Listed')}<br/>{t('Products')}</span>
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="bg-[#162638] rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 shadow-sm border border-[#2B4054]">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-[#F3F6F9]">
            <span className="w-2 h-2 bg-[#E6B879] rounded-full"></span>{t("Pending Approvals")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((m) => (
              <div key={m._id} className="bg-[#102030] border border-[#2B4054] p-5 rounded-3xl flex flex-col">
                 <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E6B879] text-[#102030] flex items-center justify-center font-bold text-sm shrink-0">
                    {m.name.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#F3F6F9] leading-tight">{m.storeName}</h3>
                    <p className="text-[10px] font-bold text-[#A5B7C8] uppercase">{m.name}</p>
                  </div>
                 </div>
                <div className="space-y-1 text-xs text-[#BAC9D6] font-bold mb-4 flex-1">
                  <p className="flex items-center gap-2"><Phone className="w-3 h-3 text-[#93A9BE]" /> {m.phone}</p>
                  <p className="flex items-center gap-2"><MapPin className="w-3 h-3 text-[#93A9BE]" /> {m.location}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(m._id, 'approved')} className="flex-1 bg-[#83D9BD] hover:bg-opacity-90 text-[#102030] py-2 rounded-full font-bold flex items-center justify-center gap-1 transition text-xs">
                    <CheckCircle className="w-3 h-3"/>{t("APPROVE")}</button>
                  <button aria-label={t('Revoke access')} onClick={() => updateStatus(m._id, 'rejected')} className="bg-[#162638] border border-[#2B4054] hover:bg-[#1E344A] text-red-600 py-2 px-3 rounded-full font-bold flex items-center justify-center transition">
                    <XCircle className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <div className="bg-[#162638] rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 shadow-sm border border-[#2B4054]">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-[#F3F6F9]">
            <span className="w-2 h-2 bg-[#83D9BD] rounded-full"></span>{t("Approved Stores Directory")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approved.map((m) => (
              <div key={m._id} className="bg-[#102030] border border-[#2B4054] p-5 rounded-3xl flex items-center gap-3">
                 <div className="w-12 h-12 rounded-xl bg-[#2B4054] text-[#A5B7C8] flex items-center justify-center font-bold shrink-0">
                    <Store className="w-5 h-5"/>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-sm text-[#F3F6F9] leading-tight">{m.storeName}</h3>
                    <p className="text-[10px] font-bold text-[#A5B7C8] uppercase mb-1">{m.name}</p>
                    <div className="flex gap-3 text-[10px] text-[#BAC9D6] font-bold mb-2">
                       <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>
                    </div>
                    <button aria-label={t('Revoke access')} onClick={() => updateStatus(m._id, 'rejected')} className="bg-red-50 text-red-600 border border-red-200 py-1.5 px-3.5 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider hover:bg-red-100 transition cursor-pointer w-max">{t("Revoke access")}</button>
                  </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Access Management */}
      {suspended.length>0&&<section className="surface-panel p-6"><h2 className="text-lg mb-4">{t('Stores')} · {t('Revoked Access')}</h2><div className="grid md:grid-cols-3 gap-4">{suspended.map(m=><div className="bg-[#102030] rounded-xl p-4" key={m._id}><h3>{m.storeName}</h3><p className="page-subtitle">{m.name}</p><button className="button-primary mt-4" onClick={()=>void updateStatus(m._id,'approved')}>{t('Restore Access')}</button></div>)}</div></section>}
      <div className="bg-[#162638] rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 shadow-sm border border-[#2B4054]">
        <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-[#F3F6F9]">
          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>{t("Customer Access Management")}</h2>

        {activeCustomers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCustomers.map((c) => (
              <div key={c._id} className="bg-[#102030] border border-[#2B4054] p-5 rounded-3xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-sm text-[#F3F6F9] leading-tight">{c.name}</h3>
                  <p className="text-[10px] font-bold text-[#A5B7C8] uppercase mb-1">{t('Customer')}</p>
                  <div className="flex flex-col gap-1 text-[10px] text-[#BAC9D6] font-bold mb-2">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                    {c.address && <span className="text-[#93A9BE] line-clamp-1">{t("Loc:")}{c.address}</span>}
                  </div>
                  <button
                    onClick={() => updateCustomerStatus(c._id, 'rejected')}
                    className="bg-red-50 text-red-600 border border-red-200 py-1.5 px-3.5 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider hover:bg-red-100 transition cursor-pointer flex items-center gap-1 w-max"
                  >
                    <UserX className="w-3 h-3" />{t("Revoke access")}</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-[#93A9BE] py-4">{t('No active customers found.')}</p>
        )}
      </div>

      {revokedCustomers.length > 0 && (
        <div className="bg-red-50/50 rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 border border-red-200">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-red-800">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span>{t("Revoked / Suspended Customers")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revokedCustomers.map((c) => (
              <div key={c._id} className="bg-[#162638] border border-red-100 p-5 rounded-3xl flex items-center gap-3 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-sm text-[#F3F6F9] leading-tight">{c.name}</h3>
                  <p className="text-[10px] font-bold text-red-500 uppercase mb-1">{t('Revoked Access')}</p>
                  <div className="flex flex-col gap-1 text-[10px] text-[#BAC9D6] font-bold mb-2">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                  </div>
                  <button
                    onClick={() => updateCustomerStatus(c._id, 'approved')}
                    className="bg-[#83D9BD]/10 text-[#83D9BD] border border-[#83D9BD]/20 py-1.5 px-3.5 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider hover:bg-[#83D9BD]/20 transition cursor-pointer w-max"
                  >{t("Restore Access")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
