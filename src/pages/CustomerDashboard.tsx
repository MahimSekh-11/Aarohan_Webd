import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Phone, MapPin, Package, Store, ShoppingBag, ClipboardList } from 'lucide-react';
import Marketplace from './Marketplace';

export default function CustomerDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'requests'>('browse');
  const { token } = useAuthStore();

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch('/api/customer/leads', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setLeads(data);
      } catch (err) {
        console.error(err);
      }
    };
    if (activeTab === 'requests') {
      fetchLeads();
    }
  }, [token, activeTab]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-2.5 sm:p-4 rounded-[20px] sm:rounded-[32px] shadow-sm border border-[#e2e0d9] mb-6 flex flex-col sm:flex-row gap-2">
        <button 
          onClick={() => setActiveTab('browse')}
          className={`cursor-pointer flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl sm:rounded-2xl font-bold uppercase tracking-wider text-[10px] sm:text-xs transition ${activeTab === 'browse' ? 'bg-[#2d5a27] text-white shadow-md' : 'bg-[#f9f9f7] text-gray-500 hover:bg-[#e7f0e6] hover:text-[#2d5a27]'}`}
        >
          <ShoppingBag className="w-4 h-4" /> Browse Marketplace
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`cursor-pointer flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl sm:rounded-2xl font-bold uppercase tracking-wider text-[10px] sm:text-xs transition ${activeTab === 'requests' ? 'bg-[#2d5a27] text-white shadow-md' : 'bg-[#f9f9f7] text-gray-500 hover:bg-[#e7f0e6] hover:text-[#2d5a27]'}`}
        >
          <ClipboardList className="w-4 h-4" /> My Buying Requests
        </button>
      </div>

      {activeTab === 'browse' ? (
        <div className="bg-white p-3 sm:p-6 rounded-2xl sm:rounded-[32px] border border-[#e2e0d9] shadow-sm">
          <Marketplace />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead) => (
            <div key={lead._id} className="cursor-pointer bg-white p-5 rounded-[32px] border border-[#e2e0d9] shadow-sm flex flex-col hover:border-[#2d5a27] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-12 h-12 bg-[#f4f1ea] rounded-xl flex items-center justify-center text-[#2d5a27] shrink-0 overflow-hidden border border-[#e2e0d9]">
                    {(lead.product?.images?.[0] || lead.productDetails?.images?.[0]) ? (
                      <img src={lead.product?.images?.[0] || lead.productDetails?.images?.[0]} alt={lead.product?.name || lead.productDetails?.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6" />
                    )}
                 </div>
                 <div className="flex-1">
                   <h3 className="text-sm font-black text-[#1a1c19] leading-tight mb-1">{lead.product?.name || lead.productDetails?.name}</h3>
                   <p className="text-[#2d5a27] font-black">₹{lead.product?.actualPrice ?? lead.product?.price ?? lead.productDetails?.actualPrice ?? lead.productDetails?.price}</p>
                 </div>
              </div>
              <span className={`inline-block self-start px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 ${
                lead.status === 'new' ? 'bg-[#d97706] text-white' :
                lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                'bg-[#2d5a27] text-white'
              }`}>
                {lead.status}
              </span>
              
              <div className="space-y-2 text-xs font-bold text-gray-600 bg-[#f9f9f7] p-4 border border-[#eeede8] rounded-2xl flex-1">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 border-b border-[#e2e0d9] pb-2">Store Details</p>
                <p className="flex items-center gap-2 text-[#1a1c19]"><Store className="w-4 h-4 text-gray-400" /> {lead.product?.storeDetails?.storeName || lead.productDetails?.storeDetails?.storeName || 'N/A'}</p>
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> {lead.product?.storeDetails?.location || lead.productDetails?.storeDetails?.location || 'N/A'}</p>
                <p className="flex items-center gap-2 pt-1"><Phone className="w-4 h-4 text-[#d97706]" /> {lead.product?.storeDetails?.contactNumber || lead.productDetails?.storeDetails?.contactNumber || 'N/A'}</p>
              </div>
            </div>
          ))}
          {leads.length === 0 && (
            <div className="col-span-full py-12 text-center font-bold text-gray-500 bg-white rounded-[32px] border border-[#e2e0d9]">
              You haven't requested any products yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
