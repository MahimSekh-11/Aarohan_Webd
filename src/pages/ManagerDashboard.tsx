import { useT, useProductName } from '../components/Translate';
import { useSearchParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Phone, MapPin, Package, PlusCircle, Trash2, TrendingUp, Loader2, Image as ImageIcon, Pencil } from 'lucide-react';

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height); // Avoid transparent background default blacks
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality jpeg is incredibly fast and micro size
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
    };
    reader.onerror = () => {
      resolve('');
    };
  });
};

export default function ManagerDashboard() {
  const [params] = useSearchParams();
  const t = useT(),pn=useProductName();
  const [error,setError]=useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const { token, user } = useAuthStore();
  const [view, setView] = useState<'products' | 'leads' | 'add' | 'edit'>('products');
  useEffect(() => { setView(params.get('view')==='leads'?'leads':params.get('view')==='add'?'add':'products'); }, [params]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '', description: '', price: '', offer: '', actualPrice: '', quantity: '1', category: '', otherCategory: '', deliveryAvailable: false, images: [] as string[]
  });
  const [categories, setCategories] = useState(['Groceries', 'Handicrafts', 'Electronics', 'Clothing', 'Hardware']);

  const fetchData = async () => {
    setError('');try {
      const [pRes, lRes] = await Promise.all([
        fetch('/api/manager/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/manager/leads', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if(!pRes.ok || !lRes.ok)throw new Error();
      if (pRes.ok) {
         const pData = await pRes.json();
         setProducts(Array.isArray(pData) ? pData : []);
      } else setProducts([]);

      if (lRes.ok) {
         const lData = await lRes.json();
         setLeads(Array.isArray(lData) ? lData : []);
      } else setLeads([]);
    } catch (e) { setError('Could not load dashboard. Please try again.'); }
  };

  useEffect(() => { fetchData() }, [token]);
  useEffect(() => {
    const refresh = () => { void fetchData(); };
    window.addEventListener('products-updated', refresh);window.addEventListener('requests-updated',refresh);
    return () => {window.removeEventListener('products-updated', refresh);window.removeEventListener('requests-updated',refresh);};
  }, [token]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProduct) return;
    setSavingProduct(true);
    try {
      let finalCategory = newProduct.category;
      if (finalCategory === 'Other' && newProduct.otherCategory) {
        finalCategory = newProduct.otherCategory.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
        if (!categories.includes(finalCategory)) {
          setCategories([...categories, finalCategory]);
        }
      }
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description,
          price: Number(newProduct.price),
          offer: Number(newProduct.offer) || 0,
          actualPrice: Number(newProduct.actualPrice) || Number(newProduct.price),
          quantity: Number(newProduct.quantity),
          category: finalCategory,
          deliveryAvailable: newProduct.deliveryAvailable,
          images: newProduct.images
        })
      });
      if(!res.ok){const data=await res.json().catch(()=>({}));setError(data.message || 'Could not save changes. Please try again.');return;}
      if (res.ok) {
        setNewProduct({ name: '', description: '', price: '', offer: '', actualPrice: '', quantity: '1', category: '', otherCategory: '', deliveryAvailable: false, images: [] });
        setView('products');
        fetchData();
      }
    } catch (e) {
      setError('Could not load dashboard. Please try again.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProduct || !editingId) return;
    setSavingProduct(true);
    try {
      let finalCategory = newProduct.category;
      if (finalCategory === 'Other' && newProduct.otherCategory) {
        finalCategory = newProduct.otherCategory.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
        if (!categories.includes(finalCategory)) {
          setCategories([...categories, finalCategory]);
        }
      }
      const res = await fetch(`/api/products/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description,
          price: Number(newProduct.price),
          offer: Number(newProduct.offer) || 0,
          actualPrice: Number(newProduct.actualPrice) || Number(newProduct.price),
          quantity: Number(newProduct.quantity),
          category: finalCategory,
          deliveryAvailable: newProduct.deliveryAvailable,
          images: newProduct.images
        })
      });
      if(!res.ok){const data=await res.json().catch(()=>({}));setError(data.message || 'Could not save changes. Please try again.');return;}
      if (res.ok) {
        setNewProduct({ name: '', description: '', price: '', offer: '', actualPrice: '', quantity: '1', category: '', otherCategory: '', deliveryAvailable: false, images: [] });
        setEditingId(null);
        setView('products');
        fetchData();
      }
    } catch (e) {
      setError('Could not load dashboard. Please try again.');
    } finally {
      setSavingProduct(false);
    }
  };

  const startEditing = (p: any) => {
    setNewProduct({
      name: p.name || '',
      description: p.description || '',
      price: String(p.price || ''),
      offer: String(p.offer || '0'),
      actualPrice: String(p.actualPrice || p.price || '0'),
      quantity: String(p.quantity ?? '1'),
      category: categories.includes(p.category) ? p.category : (p.category ? 'Other' : ''),
      otherCategory: categories.includes(p.category) ? '' : (p.category || ''),
      deliveryAvailable: !!p.deliveryAvailable,
      images: p.images || []
    });
    setEditingId(p._id);
    setView('edit');
  };

  const calculateActualPrice = (priceStr: string, offerStr: string) => {
    const p = parseFloat(priceStr) || 0;
    const o = parseFloat(offerStr) || 0;
    return Math.max(0, p - (p * o / 100)).toFixed(2);
  };

  const handlePriceChange = (val: string) => {
    setNewProduct(prev => ({ ...prev, price: val, actualPrice: calculateActualPrice(val, prev.offer) }));
  };

  const handleOfferChange = (val: string) => {
    setNewProduct(prev => ({ ...prev, offer: val, actualPrice: calculateActualPrice(prev.price, val) }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length + newProduct.images.length > 4) {
      setError('Maximum 4 images allowed');
      return;
    }
    setCompressing(true);
    try {
      // Compress each chosen image concurrently
      const compressedUrls = await Promise.all(
        files.map(async (file) => {
          return await compressImage(file);
        })
      );

      setNewProduct(prev => ({
        ...prev,
        images: [...prev.images, ...compressedUrls.filter(Boolean)]
      }));
    } catch (err) {
      console.error('Failed to compress images:', err);
    } finally {
      setCompressing(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm(t('Are you sure you want to delete this product?'))) return;
    try {
      const response=await fetch(`/api/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if(!response.ok)throw new Error();
      fetchData();
    } catch (e) { setError('Could not load dashboard. Please try again.'); }
  };

  const updateLeadStatus = async (id: string, status: string) => {
    if(status==='resolved' && !confirm(t('Complete this request and reduce stock by one?')))return;
    try {
      const response=await fetch(`/api/leads/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if(!response.ok)throw new Error();
      fetchData();
    } catch (e) { setError('Could not load dashboard. Please try again.'); }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlySales = leads
    .filter(l => l.status === 'resolved' && new Date(l.updatedAt || l.createdAt).getMonth() === currentMonth && new Date(l.updatedAt || l.createdAt).getFullYear() === currentYear)
    .reduce((acc, l) => {
      const p = Number(l.productDetails?.actualPrice ?? l.productDetails?.price ?? l.product?.actualPrice ?? l.product?.price ?? 0);
      return acc + (isNaN(p) ? 0 : p);
    }, 0);

  return (
    <div className="space-y-6 py-8">{error&&<p role="alert" className="error-banner">{t(error)}<button className="button-secondary ml-2" onClick={()=>void fetchData()}>{t("Try again")}</button></p>}
      {/* Premium Bento Header */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch mb-4">
        <div className="relative overflow-hidden flex-1 bg-[#162638] border border-[#2B4054] rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 text-white shadow-lg flex flex-col justify-between group">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#83D9BD]/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[#E6B879]/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 w-full">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#83D9BD] bg-[#83D9BD]/10 border border-[#83D9BD]/20 px-2.5 py-1 rounded-full font-sans mb-2 inline-block">{t('Active Merchant')}</span>
            <h3 className="text-xs font-bold uppercase opacity-70">{t('Store Outlet')}</h3>
            <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-[#F3F6F9]">{user?.storeName || t('Dashboard')}</h2>
          </div>
          <div className="mt-6 relative z-10 flex justify-between items-end w-full">
            <div>
              <p className="text-[9px] uppercase font-black text-[#A5B7C8] tracking-widest font-sans">{t('Monthly Revenue (Resolved)')}</p>
              <p className="text-2xl sm:text-3xl font-black text-[#83D9BD] drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">₹{monthlySales.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#83D9BD]/10 border border-[#83D9BD]/20 px-3 py-1.5 rounded-xl font-sans text-xs text-[#83D9BD] font-bold">
              <TrendingUp className="w-4 h-4 animate-pulse" />{t("Live")}</div>
          </div>
        </div>

        <div className="flex flex-row md:flex-col gap-2 justify-center bg-[#162638] border border-[#2B4054] p-3 rounded-[24px] sm:rounded-[32px] shadow-md shrink-0">
          <button
            onClick={() => setView('products')}
            className={`flex-1 md:flex-none px-5 sm:px-6 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${view === 'products' ? 'bg-[#83D9BD] text-[#0D1825] shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-[#0D1825] text-[#A5B7C8] border border-[#2B4054] hover:text-[#F3F6F9] hover:border-[#83D9BD]/40'}`}
          >{t("My Inventory")}</button>
          <button
            onClick={() => setView('leads')}
            className={`flex-1 md:flex-none px-5 sm:px-6 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${view === 'leads' ? 'bg-[#E6B879] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]' : 'bg-[#0D1825] text-[#A5B7C8] border border-[#2B4054] hover:text-[#F3F6F9] hover:border-[#E6B879]/40'}`}
          >{t("Inquiries (")}{leads.length})
          </button>
        </div>

        <button
          onClick={() => {
            setNewProduct({ name: '', description: '', price: '', offer: '', actualPrice: '', quantity: '1', category: '', otherCategory: '', deliveryAvailable: false, images: [] });
            setEditingId(null);
            setView('add');
          }}
          className="bg-[#E6B879] border border-[#F1C998]/30 rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 text-white shadow-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#7C3AED] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300 md:w-44 shrink-0 transform-gpu"
        >
          <div className="w-10 h-10 bg-[#162638]/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_10px_rgba(255,255,255,0.1)]">
            <PlusCircle className="w-5 h-5 text-white" />
          </div>
          <p className="font-black text-xs leading-tight uppercase tracking-wider">{t('List New')}<br/>{t('Product')}</p>
        </button>
      </div>

      {(view === 'add' || view === 'edit') && (
        <form onSubmit={view === 'edit' ? handleEditProduct : handleAddProduct} className="max-w-2xl bg-[#162638] p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] shadow-xl border border-[#2B4054] space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-[#2B4054]/60">
            <h2 className="text-xl font-black flex items-center gap-2.5 text-[#F3F6F9]">
              <span className="w-2.5 h-2.5 bg-[#E6B879] rounded-full shadow-[0_0_8px_#E6B879] animate-pulse"></span> {view === 'edit' ? t('Edit Product Listing') : t('List a New Product')}
            </h2>
            <button
              type="button"
              onClick={() => {
                setNewProduct({ name: '', description: '', price: '', offer: '', actualPrice: '', quantity: '1', category: '', otherCategory: '', deliveryAvailable: false, images: [] });
                setEditingId(null);
                setView('products');
              }}
              className="text-xs font-black uppercase text-[#A5B7C8] hover:text-[#F3F6F9] font-sans cursor-pointer bg-[#0D1825] border border-[#2B4054] px-3.5 py-1.5 rounded-lg"
            >{t("Cancel")}</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label htmlFor="product-field-1" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Product Name')}</label>
              <input id="product-field-1" required type="text" className="w-full bg-[#0D1825] border border-[#2B4054] rounded-xl p-3.5 focus:ring-2 focus:ring-[#83D9BD] outline-none text-sm text-[#F3F6F9] font-semibold transition-colors" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder={t('e.g. Pure Honey Comb')} />
            </div>
            <div>
              <label htmlFor="product-field-2" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Base Price (₹)')}</label>
              <input id="product-field-2" required type="number" min="0.01" step="0.01" className="w-full bg-[#0D1825] border border-[#2B4054] rounded-xl p-3.5 focus:ring-2 focus:ring-[#83D9BD] outline-none text-sm text-[#F3F6F9] font-semibold transition-colors font-sans" value={newProduct.price} onChange={e => handlePriceChange(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="product-field-3" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Offer / Discount (%)')}</label>
              <input id="product-field-3" type="number" min="0" max="100" className="w-full bg-[#0D1825] border border-[#2B4054] rounded-xl p-3.5 focus:ring-2 focus:ring-[#83D9BD] outline-none text-sm text-[#F3F6F9] font-semibold transition-colors font-sans" value={newProduct.offer} onChange={e => handleOfferChange(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label htmlFor="product-field-4" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans font-bold text-[#E6B879]">{t('Actual Selling Price (₹) - Auto')}</label>
              <input id="product-field-4" required type="number" readOnly className="w-full bg-[#0D1825]/65 border border-[#2B4054] rounded-xl p-3.5 outline-none text-sm font-black text-[#83D9BD] font-sans shadow-inner" value={newProduct.actualPrice} />
            </div>
            <div>
              <label htmlFor="product-field-5" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Quantity / Stock')}</label>
              <input id="product-field-5" required type="number" min="0" className="w-full bg-[#0D1825] border border-[#2B4054] rounded-xl p-3.5 focus:ring-2 focus:ring-[#83D9BD] outline-none text-sm text-[#F3F6F9] font-semibold transition-colors font-sans" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="product-field-6" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Category')}</label>
              <select id="product-field-6" required className="w-full bg-[#0D1825] border border-[#2B4054] rounded-xl p-3.5 focus:ring-2 focus:ring-[#83D9BD] outline-none text-sm text-[#F3F6F9] font-bold transition-colors cursor-pointer" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                <option value="">{t('Select Category...')}</option>
                {categories.map(c => <option key={c} value={c}>{t(c)}</option>)}
                <option value="Other">{t('Other...')}</option>
              </select>
            </div>
            {newProduct.category === 'Other' && (
               <div className="sm:col-span-2">
                  <label htmlFor="product-field-7" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('New Category Name')}</label>
                  <input id="product-field-7" required type="text" className="w-full bg-[#0D1825] border border-[#2B4054] rounded-xl p-3.5 focus:ring-2 focus:ring-[#83D9BD] outline-none text-sm text-[#F3F6F9] font-semibold transition-colors" value={newProduct.otherCategory} onChange={e => setNewProduct({...newProduct, otherCategory: e.target.value})} placeholder={t('e.g. Clay Art')} />
               </div>
            )}
            <div className="sm:col-span-2">
              <label htmlFor="product-field-8" className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-1.5 tracking-widest font-sans">{t('Product Description')}</label>
              <textarea id="product-field-8" required className="w-full bg-[#0D1825] border border-[#2B4054] rounded-xl p-3.5 focus:ring-2 focus:ring-[#83D9BD] outline-none text-sm text-[#F3F6F9] font-semibold transition-colors resize-none min-h-[5.5rem]" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder={t('Describe craftsmanship, origin details or fresh state of items...')} />
            </div>

            <div className="sm:col-span-2">
              <div
                className="flex items-center gap-3 p-4 bg-[#0D1825] rounded-xl border border-[#2B4054] cursor-pointer select-none group/del"
                onClick={() => setNewProduct({...newProduct, deliveryAvailable: !newProduct.deliveryAvailable})}
              >
                <input type="checkbox" className="rounded text-[#83D9BD] bg-[#0D1825] border-[#2B4054] focus:ring-[#83D9BD] w-4.5 h-4.5 pointer-events-none cursor-pointer" checked={newProduct.deliveryAvailable} readOnly />
                <label className="text-xs font-black uppercase tracking-wider text-[#A5B7C8] group-hover/del:text-[#F3F6F9] pointer-events-none cursor-pointer transition-colors font-sans">{t('I can deliver this item within the village community')}</label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black uppercase text-[#A5B7C8] mb-2 tracking-widest font-sans">{t('Upload Images (Max 4)')}</label>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                  onChange={handleImageUpload}
                  disabled={newProduct.images.length >= 4 || compressing}
                />
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${compressing ? 'border-[#E6B879] bg-[#E6B879]/5' : 'border-[#2B4054] bg-[#0D1825] hover:border-[#83D9BD]/50'}`}>
                  <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${compressing ? 'text-[#E6B879] animate-pulse' : 'text-[#A5B7C8]'}`} />
                  <p className="text-xs font-black uppercase tracking-wider text-[#F3F6F9]">
                    {compressing ? t('Activating Client-Side Compressor...') : t('Select Images / Click to Upload')}
                  </p>
                  <p className="text-[10px] text-[#A5B7C8] font-bold mt-1 uppercase tracking-widest font-sans">
                    {compressing ? t('Processing & minimizing layout sizes...') : t('Compresses automatically to load near-instantly')}
                  </p>
                </div>
              </div>

              {newProduct.images.length > 0 && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                   {newProduct.images.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl border border-[#2B4054] overflow-hidden group/thumb shrink-0">
                         <img src={img} className="w-full h-full object-cover" alt="preview" />
                         <button
                            type="button"
                            onClick={() => setNewProduct(prev => ({...prev, images: prev.images.filter((_, i) => i !== idx)}))}
                            className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white w-6 h-6 text-xs flex items-center justify-center rounded-lg cursor-pointer transition-colors border border-red-400/25"
                         >×</button>
                      </div>
                   ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProduct || compressing}
            className={`cyber-btn-premium cursor-pointer w-full text-white py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg duration-300 transform-gpu flex items-center justify-center gap-2 ${
              savingProduct || compressing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {savingProduct ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                {view === 'edit' ? t('Saving Changes...') : t('Uploading & Creating Listing...')}
              </>
            ) : compressing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#E6B879]" />{t("Compressing Selection...")}</>
            ) : (
              view === 'edit' ? t('Save Product Changes') : t('Save Product Listing')
            )}
          </button>
        </form>
      )}

      {view === 'products' && (
        <div className="bg-[#162638] rounded-[24px] sm:rounded-[32px] shadow-lg border border-[#2B4054] p-4 sm:p-6 text-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-[#2B4054]/60 pb-4">
            <h2 className="text-xl font-black flex items-center gap-2.5 text-[#F3F6F9]">
              <span className="w-2.5 h-2.5 bg-[#83D9BD] rounded-full shadow-[0_0_8px_#83D9BD]"></span>{t("My Active Listings")}</h2>
            <span className="text-[10px] uppercase font-black text-[#A5B7C8] tracking-widest font-sans bg-[#0D1825] border border-[#2B4054] px-3.5 py-1.5 rounded-lg">{t("Total items:")}{products.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2B4054]/80 text-[10px] uppercase font-black text-[#A5B7C8] tracking-wider font-sans">
                  <th className="pb-3.5 px-4 w-12">{t('Visual')}</th>
                  <th className="pb-3.5 px-4">{t('Item details')}</th>
                  <th className="pb-3.5 px-4">{t('Category')}</th>
                  <th className="pb-3.5 px-4">{t('Stock')}</th>
                  <th className="pb-3.5 px-4">{t('Price')}</th>
                  <th className="pb-3.5 px-4 text-right">{t('Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B4054]/45">
                {products.map(p => (
                  <tr key={p._id} className="hover:bg-[#0D1825]/25 transition-colors duration-200">
                    <td className="py-3 px-4">
                      <div className="w-12 h-12 rounded-xl bg-[#0D1825] border border-[#2B4054] overflow-hidden flex items-center justify-center text-[#83D9BD] shrink-0 shadow-inner">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={pn(p.name)} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 opacity-55" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#F3F6F9] line-clamp-1 text-sm">{pn(p.name)}</p>
                      <p className="text-[10px] text-[#A5B7C8] font-bold uppercase tracking-widest font-sans mt-0.5 max-w-xs truncate">{t(p.description)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block text-[10px] font-black text-[#83D9BD] bg-[#83D9BD]/10 border border-[#83D9BD]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-sans">
                        {t(p.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-sans font-black text-xs ${p.quantity <= 5 ? 'text-amber-400' : 'text-[#F3F6F9]'}`}>
                        {p.quantity}{t("units")}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-black text-[#83D9BD] text-sm">₹{p.price}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEditing(p)}
                          className="text-amber-400 hover:text-white hover:bg-amber-500/20 p-2.5 rounded-xl transition-all cursor-pointer border border-[#2B4054]/20 hover:border-amber-500/30"
                          title={t('Edit Product')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p._id)}
                          className="text-red-400 hover:text-white hover:bg-red-500/20 p-2.5 rounded-xl transition-all cursor-pointer border border-[#2B4054]/20 hover:border-red-500/30"
                          title={t('Delete Product')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {products.length === 0 && (
            <div className="p-12 text-center text-[#A5B7C8] font-bold font-sans uppercase tracking-wider border border-dashed border-[#2B4054] rounded-xl bg-[#0D1825]/45 mt-4">{t("Your inventory is empty. Click \"List New Product\" to start.")}</div>
          )}
        </div>
      )}

      {view === 'leads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-full border-b border-[#2B4054]/60 pb-3">
           <h2 className="text-xl font-black flex items-center gap-2.5 text-[#F3F6F9]">
              <span className="w-2.5 h-2.5 bg-[#E6B879] rounded-full shadow-[0_0_8px_#E6B879]"></span>{t("Customer Inquiries")}</h2>
          </div>
          {leads.map((lead) => (
            <div key={lead._id} className="bg-[#162638] rounded-3xl border border-[#2B4054] p-6 shadow-xl flex flex-col justify-between text-[#F3F6F9] hover:border-[#E6B879]/50 transition-all duration-300">
               <div>
                 <div className="flex justify-between items-start gap-3 mb-4">
                   <div className="flex-1 pr-2">
                     <div className="flex items-center gap-3.5">
                       <div className="w-14 h-14 bg-[#0D1825] rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border border-[#2B4054] shadow-inner">
                          {(lead.product?.images?.[0] || lead.productDetails?.images?.[0]) ? (
                            <img src={lead.product?.images?.[0] || lead.productDetails?.images?.[0]} alt={pn(lead.product?.name || lead.productDetails?.name || '')} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-[#83D9BD]" />
                          )}
                       </div>
                       <div>
                         <span className="text-[9px] uppercase font-black text-[#83D9BD] font-sans tracking-widest">{lead.product?.category || lead.productDetails?.category || 'micro-item'}</span>
                         <h3 className="text-base font-black text-[#F3F6F9] leading-tight mt-0.5 line-clamp-1">{pn(lead.product?.name || lead.productDetails?.name || '')}</h3>
                         <div className="flex gap-2 text-[11px] font-bold text-[#A5B7C8] mt-0.5 font-sans">
                           <span>{t("Qty:")}{lead.product?.quantity ?? lead.productDetails?.quantity ?? 0}</span>
                           <span>|</span>
                           <span className="text-[#83D9BD]">₹{lead.product?.price ?? lead.productDetails?.price}</span>
                         </div>
                       </div>
                     </div>
                   </div>
                   <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider font-sans shadow-sm ${
                    lead.status === 'new' ? 'bg-[#E6B879]/20 text-[#F1C998] border border-[#E6B879]/30 animate-pulse' :
                    lead.status === 'contacted' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                    'bg-[#83D9BD]/20 text-[#83D9BD] border border-[#83D9BD]/30'
                  }`}>
                    {t(lead.status)}
                  </span>
                 </div>

                 <div className="bg-[#0D1825] p-4 rounded-2xl border border-[#2B4054] mb-5 shadow-inner">
                    <div className="flex items-start gap-3">
                       <div className="w-10 h-10 rounded-full bg-[#162638] border border-[#2B4054] text-[#83D9BD] flex items-center justify-center font-black text-xs shrink-0 select-none font-sans">
                         {lead.customerDetails?.name?.substring(0,2).toUpperCase()}
                       </div>
                       <div className="flex-1 text-xs space-y-1 font-semibold text-[#A5B7C8]">
                         <p className="font-extrabold text-sm text-[#F3F6F9]">{lead.customerDetails?.name}</p>
                         <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#83D9BD]" /> <span className="font-sans text-[#F3F6F9]">{lead.customerDetails?.phone}</span></p>
                         <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#E6B879]" /> <span className="leading-snug">{lead.customerDetails?.address}</span></p>
                       </div>
                    </div>
                 </div>
               </div>

               <div className="flex gap-2.5 mt-auto pt-3 border-t border-[#2B4054]/40">
                 {lead.status === 'new' && (
                   <button
                     onClick={() => updateLeadStatus(lead._id, 'contacted')}
                     className="flex-1 cursor-pointer bg-[#0D1825] hover:bg-[#162638] text-[#F3F6F9] text-[10px] font-black uppercase tracking-wider py-3 rounded-xl transition border border-[#2B4054]"
                   >{t("Mark Contacted")}</button>
                 )}
                 {lead.status !== 'resolved' && (
                   <button
                     onClick={() => updateLeadStatus(lead._id, 'resolved')}
                     className="flex-1 cursor-pointer bg-[#83D9BD] text-[#0D1825] text-[10px] font-black uppercase tracking-wider py-3 rounded-xl hover:opacity-90 transition font-black shadow-md hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                   >{t("Mark Resolved")}</button>
                 )}
               </div>
            </div>
          ))}
          {leads.length === 0 && (
            <div className="col-span-full py-12 text-center text-[#A5B7C8] font-bold bg-[#162638] rounded-[32px] border border-[#2B4054] font-sans uppercase tracking-wider bg-[#0D1825]/45">{t("No customer inquiries listed.")}</div>
          )}
        </div>
      )}
    </div>
  );
}
