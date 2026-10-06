import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Phone, MapPin, Package, Store, ShoppingBag, ClipboardList } from 'lucide-react';
import Marketplace from './Marketplace';
import { useT } from '../components/Translate';
import { useSearchParams } from 'react-router-dom';

export default function CustomerDashboard() {
  const [params] = useSearchParams();
  const [error,setError]=useState(''),[loading,setLoading]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{const refresh=()=>setRevision(n=>n+1);window.addEventListener('requests-updated',refresh);return()=>window.removeEventListener('requests-updated',refresh);},[]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'requests'>('browse');
  useEffect(() => { setActiveTab(params.get('tab') === 'requests' ? 'requests' : 'browse'); }, [params]);
  const { token } = useAuthStore();
  const t = useT();

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);setError('');try {
        const res = await fetch('/api/customer/leads', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Could not load requests');
        setLeads(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Could not load requests. Please try again.');
      }finally{setLoading(false);}
    };
    if (activeTab === 'requests') {
      fetchLeads();
    }
  }, [token, activeTab,revision]);

  return (
    <div className="space-y-6 py-8"><p className="section-kicker">{t("Customer")}</p><h1 className="page-title">{t("My Requests")}</h1>{error&&<p role="alert" className="error-banner">{t(error)}<button className="button-secondary ml-2" onClick={()=>setRevision(n=>n+1)}>{t("Try again")}</button></p>}
      <div className="bg-[#162638] p-2.5 sm:p-4 rounded-[20px] sm:rounded-[32px] shadow-sm border border-[#2B4054] mb-6 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => setActiveTab('browse')}
          className={`cursor-pointer flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl sm:rounded-2xl font-bold uppercase tracking-wider text-[10px] sm:text-xs transition ${activeTab === 'browse' ? 'bg-[#83D9BD] text-[#0D1825] shadow-md' : 'bg-[#102030] text-[#A5B7C8] hover:bg-[#1D3D3B] hover:text-[#83D9BD]'}`}
        >
          <ShoppingBag className="w-4 h-4" /> {t('Marketplace')}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`cursor-pointer flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl sm:rounded-2xl font-bold uppercase tracking-wider text-[10px] sm:text-xs transition ${activeTab === 'requests' ? 'bg-[#83D9BD] text-[#0D1825] shadow-md' : 'bg-[#102030] text-[#A5B7C8] hover:bg-[#1D3D3B] hover:text-[#83D9BD]'}`}
        >
          <ClipboardList className="w-4 h-4" /> {t('My Requests')}
        </button>
      </div>

      {activeTab === 'browse' ? (
        <div className="bg-[#162638] p-3 sm:p-6 rounded-2xl sm:rounded-[32px] border border-[#2B4054] shadow-sm">
          <Marketplace />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading&&<div className="card-skeleton"/>}
          {!loading&&leads.map((lead) => (
            <div key={lead._id} className="cursor-pointer bg-[#162638] p-5 rounded-[32px] border border-[#2B4054] shadow-sm flex flex-col hover:border-[#83D9BD] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-12 h-12 bg-[#162638] rounded-xl flex items-center justify-center text-[#83D9BD] shrink-0 overflow-hidden border border-[#2B4054]">
                    {(lead.product?.images?.[0] || lead.productDetails?.images?.[0]) ? (
                      <img src={lead.product?.images?.[0] || lead.productDetails?.images?.[0]} alt={t(lead.product?.name || lead.productDetails?.name || '')} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6" />
                    )}
                 </div>
                 <div className="flex-1">
                   <h3 className="text-sm font-black text-[#F3F6F9] leading-tight mb-1">{t(lead.product?.name || lead.productDetails?.name || '')}</h3>
                   <p className="text-[#83D9BD] font-black">₹{lead.product?.actualPrice ?? lead.product?.price ?? lead.productDetails?.actualPrice ?? lead.productDetails?.price}</p>
                 </div>
              </div>
              <span className={`inline-block self-start px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 ${
                lead.status === 'new' ? 'bg-[#E6B879] text-[#102030]' :
                lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                'bg-[#83D9BD] text-[#0D1825]'
              }`}>
                {t(lead.status) || lead.status}
              </span>

              <div className="space-y-2 text-xs font-bold text-[#BAC9D6] bg-[#102030] p-4 border border-[#2B4054] rounded-2xl flex-1">
                <p className="text-[10px] uppercase tracking-wider text-[#93A9BE] mb-2 border-b border-[#2B4054] pb-2">{t('Store Details')}</p>
                <p className="flex items-center gap-2 text-[#F3F6F9]"><Store className="w-4 h-4 text-[#93A9BE]" /> {lead.product?.storeDetails?.storeName || lead.productDetails?.storeDetails?.storeName || 'N/A'}</p>
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#93A9BE]" /> {lead.product?.storeDetails?.location || lead.productDetails?.storeDetails?.location || 'N/A'}</p>
                <p className="flex items-center gap-2 pt-1"><Phone className="w-4 h-4 text-[#E6B879]" /> {lead.product?.storeDetails?.contactNumber || lead.productDetails?.storeDetails?.contactNumber || 'N/A'}</p>
              </div>
            </div>
          ))}
          {!error && !loading && leads.length === 0 && (
            <div className="col-span-full py-12 text-center font-bold text-[#A5B7C8] bg-[#162638] rounded-[32px] border border-[#2B4054]">
              {t('No requests yet')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
