import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { CheckCircle, XCircle, Store, MapPin, Phone, User, UserX } from 'lucide-react';

export default function AdminDashboard() {
  const [managers, setManagers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [stats, setStats] = useState({ customerCount: 0, managerCount: 0, productCount: 0 });
  const { token } = useAuthStore();

  const fetchData = async () => {
    try {
      const [mgrRes, custRes, statsRes] = await Promise.all([
        fetch('/api/admin/managers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/customers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (mgrRes.ok) setManagers(await mgrRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [token]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/managers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const updateCustomerStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/customers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const pending = managers.filter(m => m.status === 'pending');
  const approved = managers.filter(m => m.status === 'approved');
  const activeCustomers = customers.filter(c => c.status !== 'rejected');
  const revokedCustomers = customers.filter(c => c.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="bg-[#e2e0d9] rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 flex flex-col justify-center border border-[#d4d2cc] shadow-sm mb-6">
        <p className="text-xs font-bold text-gray-700 uppercase mb-2">Platform Health & Analytics</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-[#1a1c19]">{approved.length}</span>
            <span className="text-[10px] font-bold text-gray-600 mb-1 leading-tight uppercase tracking-wider">Stores<br/>Approved</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-[#d97706]">{pending.length}</span>
            <span className="text-[10px] font-bold text-gray-600 mb-1 leading-tight uppercase tracking-wider">Pending<br/>Review</span>
          </div>
          <div className="flex items-end gap-2">
             <span className="text-4xl font-black text-[#2d5a27]">{stats.customerCount}</span>
             <span className="text-[10px] font-bold text-gray-600 mb-1 leading-tight uppercase tracking-wider">Total<br/>Customers</span>
          </div>
          <div className="flex items-end gap-2">
             <span className="text-4xl font-black text-blue-800">{stats.productCount}</span>
             <span className="text-[10px] font-bold text-gray-600 mb-1 leading-tight uppercase tracking-wider">Listed<br/>Products</span>
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="bg-white rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 shadow-sm border border-[#e2e0d9]">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-[#1a1c19]">
            <span className="w-2 h-2 bg-[#d97706] rounded-full"></span> Pending Approvals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((m) => (
              <div key={m._id} className="bg-[#f9f9f7] border border-[#eeede8] p-5 rounded-3xl flex flex-col">
                 <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#d97706] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {m.name.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#1a1c19] leading-tight">{m.storeName}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">{m.name}</p>
                  </div>
                 </div>
                <div className="space-y-1 text-xs text-gray-700 font-bold mb-4 flex-1">
                  <p className="flex items-center gap-2"><Phone className="w-3 h-3 text-gray-400" /> {m.phone}</p>
                  <p className="flex items-center gap-2"><MapPin className="w-3 h-3 text-gray-400" /> {m.location}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(m._id, 'approved')} className="flex-1 bg-[#2d5a27] hover:bg-opacity-90 text-white py-2 rounded-full font-bold flex items-center justify-center gap-1 transition text-xs">
                    <CheckCircle className="w-3 h-3"/> APPROVE
                  </button>
                  <button onClick={() => updateStatus(m._id, 'rejected')} className="bg-white border border-[#e2e0d9] hover:bg-gray-50 text-red-600 py-2 px-3 rounded-full font-bold flex items-center justify-center transition">
                    <XCircle className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <div className="bg-white rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 shadow-sm border border-[#e2e0d9]">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-[#1a1c19]">
            <span className="w-2 h-2 bg-[#2d5a27] rounded-full"></span> Approved Stores Directory
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approved.map((m) => (
              <div key={m._id} className="bg-[#f9f9f7] border border-[#eeede8] p-5 rounded-3xl flex items-center gap-3">
                 <div className="w-12 h-12 rounded-xl bg-gray-200 text-gray-500 flex items-center justify-center font-bold shrink-0">
                    <Store className="w-5 h-5"/>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-sm text-[#1a1c19] leading-tight">{m.storeName}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{m.name}</p>
                    <div className="flex gap-3 text-[10px] text-gray-600 font-bold mb-2">
                       <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>
                    </div>
                    <button onClick={() => updateStatus(m._id, 'rejected')} className="bg-red-50 text-red-600 border border-red-200 py-1.5 px-3.5 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider hover:bg-red-100 transition cursor-pointer w-max">
                      Revoke & Delete
                    </button>
                  </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Access Management */}
      <div className="bg-white rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 shadow-sm border border-[#e2e0d9]">
        <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-[#1a1c19]">
          <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Customer Access Management
        </h2>
        
        {activeCustomers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCustomers.map((c) => (
              <div key={c._id} className="bg-[#f9f9f7] border border-[#eeede8] p-5 rounded-3xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-sm text-[#1a1c19] leading-tight">{c.name}</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Customer</p>
                  <div className="flex flex-col gap-1 text-[10px] text-gray-600 font-bold mb-2">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                    {c.address && <span className="text-gray-400 line-clamp-1">Loc: {c.address}</span>}
                  </div>
                  <button 
                    onClick={() => updateCustomerStatus(c._id, 'rejected')} 
                    className="bg-red-50 text-red-600 border border-red-200 py-1.5 px-3.5 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider hover:bg-red-100 transition cursor-pointer flex items-center gap-1 w-max"
                  >
                    <UserX className="w-3 h-3" /> Revoke & Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-gray-400 py-4">No active customers found.</p>
        )}
      </div>

      {revokedCustomers.length > 0 && (
        <div className="bg-red-50/50 rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 border border-red-200">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-red-800">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span> Revoked / Suspended Customers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revokedCustomers.map((c) => (
              <div key={c._id} className="bg-white border border-red-100 p-5 rounded-3xl flex items-center gap-3 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-sm text-[#1a1c19] leading-tight">{c.name}</h3>
                  <p className="text-[10px] font-bold text-red-500 uppercase mb-1">Revoked Access</p>
                  <div className="flex flex-col gap-1 text-[10px] text-gray-600 font-bold mb-2">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                  </div>
                  <button 
                    onClick={() => updateCustomerStatus(c._id, 'approved')} 
                    className="bg-[#2d5a27]/10 text-[#2d5a27] border border-[#2d5a27]/20 py-1.5 px-3.5 rounded-full font-bold text-[10px] sm:text-xs uppercase tracking-wider hover:bg-[#2d5a27]/20 transition cursor-pointer w-max"
                  >
                    Restore Access
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
