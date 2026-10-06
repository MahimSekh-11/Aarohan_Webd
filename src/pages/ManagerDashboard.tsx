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
  const [products, setProducts] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const { token, user } = useAuthStore();
  const [view, setView] = useState<'products' | 'leads' | 'add' | 'edit'>('products');
  const [savingProduct, setSavingProduct] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '', description: '', price: '', offer: '', actualPrice: '', quantity: '1', category: '', otherCategory: '', deliveryAvailable: false, images: [] as string[]
  });
  const [categories, setCategories] = useState(['Groceries', 'Handicrafts', 'Electronics', 'Clothing', 'Hardware']);

  const fetchData = async () => {
    try {
      const [pRes, lRes] = await Promise.all([
        fetch('/api/manager/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/manager/leads', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (pRes.ok) {
         const pData = await pRes.json();
         setProducts(Array.isArray(pData) ? pData : []);
      } else setProducts([]);
      
      if (lRes.ok) {
         const lData = await lRes.json();
         setLeads(Array.isArray(lData) ? lData : []);
      } else setLeads([]);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData() }, [token]);

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
          quantity: Number(newProduct.quantity) || 1,
          category: finalCategory,
          deliveryAvailable: newProduct.deliveryAvailable,
          images: newProduct.images
        })
      });
      if (res.ok) {
        setNewProduct({ name: '', description: '', price: '', offer: '', actualPrice: '', quantity: '1', category: '', otherCategory: '', deliveryAvailable: false, images: [] });
        setView('products');
        fetchData();
      }
    } catch (e) {
      console.error(e);
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
          quantity: Number(newProduct.quantity) || 1,
          category: finalCategory,
          deliveryAvailable: newProduct.deliveryAvailable,
          images: newProduct.images
        })
      });
      if (res.ok) {
        setNewProduct({ name: '', description: '', price: '', offer: '', actualPrice: '', quantity: '1', category: '', otherCategory: '', deliveryAvailable: false, images: [] });
        setEditingId(null);
        setView('products');
        fetchData();
      }
    } catch (e) {
      console.error(e);
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
      alert('Maximum 4 images allowed');
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
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/leads/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (e) { console.error(e); }
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
    <div className="space-y-6">
      {/* Premium Bento Header */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch mb-4">
        <div className="relative overflow-hidden flex-1 bg-[#1E293B] border border-[#334155] rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 text-white shadow-lg flex flex-col justify-between group">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#10B981]/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[#8B5CF6]/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="relative z-10 w-full">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2.5 py-1 rounded-full font-mono mb-2 inline-block">Active Merchant</span>
            <h3 className="text-xs font-bold uppercase opacity-70">Store Outlet</h3>
            <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-[#F9FAFB]">{user?.storeName || 'Store Dashboard'}</h2>
          </div>
          <div className="mt-6 relative z-10 flex justify-between items-end w-full">
            <div>
              <p className="text-[9px] uppercase font-black text-[#9CA3AF] tracking-widest font-mono">Monthly Revenue (Resolved)</p>
              <p className="text-2xl sm:text-3xl font-black text-[#10B981] drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">₹{monthlySales.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#10B981]/10 border border-[#10B981]/20 px-3 py-1.5 rounded-xl font-mono text-xs text-[#10B981] font-bold">
              <TrendingUp className="w-4 h-4 animate-pulse" /> Live
            </div>
          </div>
        </div>
        
        <div className="flex flex-row md:flex-col gap-2 justify-center bg-[#1E293B] border border-[#334155] p-3 rounded-[24px] sm:rounded-[32px] shadow-md shrink-0">
          <button 
            onClick={() => setView('products')} 
            className={`flex-1 md:flex-none px-5 sm:px-6 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${view === 'products' ? 'bg-[#10B981] text-[#0B0F19] shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-[#0B0F19] text-[#9CA3AF] border border-[#334155] hover:text-[#F9FAFB] hover:border-[#10B981]/40'}`}
          >
            My Inventory
          </button>
          <button 
            onClick={() => setView('leads')} 
            className={`flex-1 md:flex-none px-5 sm:px-6 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer ${view === 'leads' ? 'bg-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]' : 'bg-[#0B0F19] text-[#9CA3AF] border border-[#334155] hover:text-[#F9FAFB] hover:border-[#8B5CF6]/40'}`}
          >
            Inquiries ({leads.length})
          </button>
        </div>

        <button 
          onClick={() => {
            setNewProduct({ name: '', description: '', price: '', offer: '', actualPrice: '', quantity: '1', category: '', otherCategory: '', deliveryAvailable: false, images: [] });
            setEditingId(null);
            setView('add');
          }} 
          className="bg-[#8B5CF6] border border-[#A78BFA]/30 rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 text-white shadow-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#7C3AED] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300 md:w-44 shrink-0 transform-gpu"
        >
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_10px_rgba(255,255,255,0.1)]">
            <PlusCircle className="w-5 h-5 text-white" />
          </div>
          <p className="font-black text-xs leading-tight uppercase tracking-wider">List New<br/>Product</p>
        </button>
      </div>

      {(view === 'add' || view === 'edit') && (
        <form onSubmit={view === 'edit' ? handleEditProduct : handleAddProduct} className="max-w-2xl bg-[#1E293B] p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] shadow-xl border border-[#334155] space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-[#334155]/60">
            <h2 className="text-xl font-black flex items-center gap-2.5 text-[#F9FAFB]">
              <span className="w-2.5 h-2.5 bg-[#8B5CF6] rounded-full shadow-[0_0_8px_#8B5CF6] animate-pulse"></span> {view === 'edit' ? 'Edit Product Listing' : 'List a New Product'}
            </h2>
            <button 
              type="button" 
              onClick={() => {
                setNewProduct({ name: '', description: '', price: '', offer: '', actualPrice: '', quantity: '1', category: '', otherCategory: '', deliveryAvailable: false, images: [] });
                setEditingId(null);
                setView('products');
              }} 
              className="text-xs font-black uppercase text-[#9CA3AF] hover:text-[#F9FAFB] font-mono cursor-pointer bg-[#0B0F19] border border-[#334155] px-3.5 py-1.5 rounded-lg"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">Product Name</label>
              <input required type="text" className="w-full bg-[#0B0F19] border border-[#334155] rounded-xl p-3.5 focus:ring-2 focus:ring-[#10B981] outline-none text-sm text-[#F9FAFB] font-semibold transition-colors" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. Pure Honey Comb" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">Base Price (₹)</label>
              <input required type="number" min="0" className="w-full bg-[#0B0F19] border border-[#334155] rounded-xl p-3.5 focus:ring-2 focus:ring-[#10B981] outline-none text-sm text-[#F9FAFB] font-semibold transition-colors font-mono" value={newProduct.price} onChange={e => handlePriceChange(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">Offer / Discount (%)</label>
              <input type="number" min="0" max="100" className="w-full bg-[#0B0F19] border border-[#334155] rounded-xl p-3.5 focus:ring-2 focus:ring-[#10B981] outline-none text-sm text-[#F9FAFB] font-semibold transition-colors font-mono" value={newProduct.offer} onChange={e => handleOfferChange(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono font-bold text-[#8B5CF6]">Actual Selling Price (₹) - Auto</label>
              <input required type="number" readOnly className="w-full bg-[#0B0F19]/65 border border-[#334155] rounded-xl p-3.5 outline-none text-sm font-black text-[#10B981] font-mono shadow-inner" value={newProduct.actualPrice} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">Quantity / Stock</label>
              <input required type="number" min="1" className="w-full bg-[#0B0F19] border border-[#334155] rounded-xl p-3.5 focus:ring-2 focus:ring-[#10B981] outline-none text-sm text-[#F9FAFB] font-semibold transition-colors font-mono" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">Category</label>
              <select required className="w-full bg-[#0B0F19] border border-[#334155] rounded-xl p-3.5 focus:ring-2 focus:ring-[#10B981] outline-none text-sm text-[#F9FAFB] font-bold transition-colors cursor-pointer" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="Other">Other...</option>
              </select>
            </div>
            {newProduct.category === 'Other' && (
               <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">New Category Name</label>
                  <input required type="text" className="w-full bg-[#0B0F19] border border-[#334155] rounded-xl p-3.5 focus:ring-2 focus:ring-[#10B981] outline-none text-sm text-[#F9FAFB] font-semibold transition-colors" value={newProduct.otherCategory} onChange={e => setNewProduct({...newProduct, otherCategory: e.target.value})} placeholder="e.g. Clay Art" />
               </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-1.5 tracking-widest font-mono">Product Description</label>
              <textarea required className="w-full bg-[#0B0F19] border border-[#334155] rounded-xl p-3.5 focus:ring-2 focus:ring-[#10B981] outline-none text-sm text-[#F9FAFB] font-semibold transition-colors resize-none min-h-[5.5rem]" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Describe craftsmanship, origin details or fresh state of items..." />
            </div>
            
            <div className="sm:col-span-2">
              <div 
                className="flex items-center gap-3 p-4 bg-[#0B0F19] rounded-xl border border-[#334155] cursor-pointer select-none group/del" 
                onClick={() => setNewProduct({...newProduct, deliveryAvailable: !newProduct.deliveryAvailable})}
              >
                <input type="checkbox" className="rounded text-[#10B981] bg-[#0B0F19] border-[#334155] focus:ring-[#10B981] w-4.5 h-4.5 pointer-events-none cursor-pointer" checked={newProduct.deliveryAvailable} readOnly />
                <label className="text-xs font-black uppercase tracking-wider text-[#9CA3AF] group-hover/del:text-[#F9FAFB] pointer-events-none cursor-pointer transition-colors font-mono">I can deliver this item within the village community</label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black uppercase text-[#9CA3AF] mb-2 tracking-widest font-mono">Upload Images (Max 4)</label>
              <div className="relative">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" 
                  onChange={handleImageUpload} 
                  disabled={newProduct.images.length >= 4 || compressing} 
                />
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${compressing ? 'border-[#8B5CF6] bg-[#8B5CF6]/5' : 'border-[#334155] bg-[#0B0F19] hover:border-[#10B981]/50'}`}>
                  <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${compressing ? 'text-[#8B5CF6] animate-pulse' : 'text-[#9CA3AF]'}`} />
                  <p className="text-xs font-black uppercase tracking-wider text-[#F9FAFB]">
                    {compressing ? 'Activating Client-Side Compressor...' : 'Select Images / Click to Upload'}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF] font-bold mt-1 uppercase tracking-widest font-mono">
                    {compressing ? 'Processing & minimizing layout sizes...' : 'Compresses automatically to load near-instantly'}
                  </p>
                </div>
              </div>

              {newProduct.images.length > 0 && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                   {newProduct.images.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl border border-[#334155] overflow-hidden group/thumb shrink-0">
                         <img src={img} className="w-full h-full object-cover" alt="preview" />
                         <button 
                            type="button" 
                            onClick={() => setNewProduct(prev => ({...prev, images: prev.images.filter((_, i) => i !== idx)}))} 
                            className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white w-6 h-6 text-xs flex items-center justify-center rounded-lg cursor-pointer transition-colors border border-red-400/25"
                         >
                           &times;
                         </button>
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
                {view === 'edit' ? 'Saving Changes...' : 'Uploading & Creating Listing...'}
              </>
            ) : compressing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                Compressing Selection...
              </>
            ) : (
              view === 'edit' ? 'Save Product Changes' : 'Save Product Listing'
            )}
          </button>
        </form>
      )}

      {view === 'products' && (
        <div className="bg-[#1E293B] rounded-[24px] sm:rounded-[32px] shadow-lg border border-[#334155] p-4 sm:p-6 text-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-[#334155]/60 pb-4">
            <h2 className="text-xl font-black flex items-center gap-2.5 text-[#F9FAFB]">
              <span className="w-2.5 h-2.5 bg-[#10B981] rounded-full shadow-[0_0_8px_#10B981]"></span> My Active Listings
            </h2>
            <span className="text-[10px] uppercase font-black text-[#9CA3AF] tracking-widest font-mono bg-[#0B0F19] border border-[#334155] px-3.5 py-1.5 rounded-lg">
              Total items: {products.length}
            </span>
          </div>
          
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#334155]/80 text-[10px] uppercase font-black text-[#9CA3AF] tracking-wider font-mono">
                  <th className="pb-3.5 px-4 w-12">Visual</th>
                  <th className="pb-3.5 px-4">Item details</th>
                  <th className="pb-3.5 px-4">Category</th>
                  <th className="pb-3.5 px-4">Stock</th>
                  <th className="pb-3.5 px-4">Price</th>
                  <th className="pb-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/45">
                {products.map(p => (
                  <tr key={p._id} className="hover:bg-[#0B0F19]/25 transition-colors duration-200">
                    <td className="py-3 px-4">
                      <div className="w-12 h-12 rounded-xl bg-[#0B0F19] border border-[#334155] overflow-hidden flex items-center justify-center text-[#10B981] shrink-0 shadow-inner">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 opacity-55" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#F9FAFB] line-clamp-1 text-sm">{p.name}</p>
                      <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest font-mono mt-0.5 max-w-xs truncate">{p.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block text-[10px] font-black text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-mono font-black text-xs ${p.quantity <= 5 ? 'text-amber-400' : 'text-[#F9FAFB]'}`}>
                        {p.quantity} units
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-black text-[#10B981] text-sm">₹{p.price}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => startEditing(p)} 
                          className="text-amber-400 hover:text-white hover:bg-amber-500/20 p-2.5 rounded-xl transition-all cursor-pointer border border-[#334155]/20 hover:border-amber-500/30"
                          title="Edit Product"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p._id)} 
                          className="text-red-400 hover:text-white hover:bg-red-500/20 p-2.5 rounded-xl transition-all cursor-pointer border border-[#334155]/20 hover:border-red-500/30"
                          title="Delete Product"
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
            <div className="p-12 text-center text-[#9CA3AF] font-bold font-mono uppercase tracking-wider border border-dashed border-[#334155] rounded-xl bg-[#0B0F19]/45 mt-4">
              Your inventory is empty. Click "List New Product" to start.
            </div>
          )}
        </div>
      )}

      {view === 'leads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-full border-b border-[#334155]/60 pb-3">
           <h2 className="text-xl font-black flex items-center gap-2.5 text-[#F9FAFB]">
              <span className="w-2.5 h-2.5 bg-[#8B5CF6] rounded-full shadow-[0_0_8px_#8B5CF6]"></span> Customer Inquiries
           </h2>
          </div>
          {leads.map((lead) => (
            <div key={lead._id} className="bg-[#1E293B] rounded-3xl border border-[#334155] p-6 shadow-xl flex flex-col justify-between text-[#F9FAFB] hover:border-[#8B5CF6]/50 transition-all duration-300">
               <div>
                 <div className="flex justify-between items-start gap-3 mb-4">
                   <div className="flex-1 pr-2">
                     <div className="flex items-center gap-3.5">
                       <div className="w-14 h-14 bg-[#0B0F19] rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border border-[#334155] shadow-inner">
                          {(lead.product?.images?.[0] || lead.productDetails?.images?.[0]) ? (
                            <img src={lead.product?.images?.[0] || lead.productDetails?.images?.[0]} alt={lead.product?.name || lead.productDetails?.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-[#10B981]" />
                          )}
                       </div>
                       <div>
                         <span className="text-[9px] uppercase font-black text-[#10B981] font-mono tracking-widest">{lead.product?.category || lead.productDetails?.category || 'micro-item'}</span>
                         <h3 className="text-base font-black text-[#F9FAFB] leading-tight mt-0.5 line-clamp-1">{lead.product?.name || lead.productDetails?.name}</h3>
                         <div className="flex gap-2 text-[11px] font-bold text-[#9CA3AF] mt-0.5 font-mono">
                           <span>Qty: {lead.product?.quantity ?? lead.productDetails?.quantity ?? 0}</span>
                           <span>|</span>
                           <span className="text-[#10B981]">₹{lead.product?.price ?? lead.productDetails?.price}</span>
                         </div>
                       </div>
                     </div>
                   </div>
                   <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider font-mono shadow-sm ${
                    lead.status === 'new' ? 'bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30 animate-pulse' :
                    lead.status === 'contacted' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                    'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                  }`}>
                    {lead.status}
                  </span>
                 </div>

                 <div className="bg-[#0B0F19] p-4 rounded-2xl border border-[#334155] mb-5 shadow-inner">
                    <div className="flex items-start gap-3">
                       <div className="w-10 h-10 rounded-full bg-[#1E293B] border border-[#334155] text-[#10B981] flex items-center justify-center font-black text-xs shrink-0 select-none font-mono">
                         {lead.customerDetails?.name?.substring(0,2).toUpperCase()}
                       </div>
                       <div className="flex-1 text-xs space-y-1 font-semibold text-[#9CA3AF]">
                         <p className="font-extrabold text-sm text-[#F9FAFB]">{lead.customerDetails?.name}</p>
                         <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#10B981]" /> <span className="font-mono text-[#F9FAFB]">{lead.customerDetails?.phone}</span></p>
                         <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#8B5CF6]" /> <span className="leading-snug">{lead.customerDetails?.address}</span></p>
                       </div>
                    </div>
                 </div>
               </div>

               <div className="flex gap-2.5 mt-auto pt-3 border-t border-[#334155]/40">
                 {lead.status === 'new' && (
                   <button 
                     onClick={() => updateLeadStatus(lead._id, 'contacted')} 
                     className="flex-1 cursor-pointer bg-[#0B0F19] hover:bg-[#1E293B] text-[#F9FAFB] text-[10px] font-black uppercase tracking-wider py-3 rounded-xl transition border border-[#334155]"
                   >
                     Mark Contacted
                   </button>
                 )}
                 {lead.status !== 'resolved' && (
                   <button 
                     onClick={() => updateLeadStatus(lead._id, 'resolved')} 
                     className="flex-1 cursor-pointer bg-[#10B981] text-[#0B0F19] text-[10px] font-black uppercase tracking-wider py-3 rounded-xl hover:opacity-90 transition font-black shadow-md hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                   >
                     Mark Resolved
                   </button>
                 )}
               </div>
            </div>
          ))}
          {leads.length === 0 && (
            <div className="col-span-full py-12 text-center text-[#9CA3AF] font-bold bg-[#1E293B] rounded-[32px] border border-[#334155] font-mono uppercase tracking-wider bg-[#0B0F19]/45">
              No customer inquiries listed.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
