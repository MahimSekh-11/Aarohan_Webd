import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Search, Filter, MapPin, Phone, Truck, Package, Store, Star, MessageSquare, X, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../components/Translate';

const ProductCard = ({ p, onInterest }: { key?: React.Key, p: any, onInterest: (id: string) => Promise<boolean> }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [cardImageIdx, setCardImageIdx] = useState(0);
  const [modalImageIdx, setModalImageIdx] = useState(0);
  const { user, token } = useAuthStore();
  const t = useT();

  const handleInterest = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLoading(true);
    const ok = await onInterest(p._id);
    if (ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/products/${p._id}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (showReviews) fetchReviews();
  }, [showReviews]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${p._id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newReview)
      });
      if (res.ok) {
        setNewReview({ rating: 5, text: '' });
        fetchReviews();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : 'New';

  const images = p.images && p.images.length > 0 ? p.images.slice(0, 4) : [];
  const hasImages = images.length > 0;
  
  const handleNextCardImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCardImageIdx((prev) => (prev + 1) % images.length);
  };
  const handlePrevCardImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCardImageIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const isLowStock = typeof p.quantity === 'number' && p.quantity > 0 && p.quantity <= 5;
  const outOfStock = typeof p.quantity === 'number' && p.quantity === 0;

  return (
    <>
      <div 
        onClick={() => { setShowModal(true); setModalImageIdx(0); }}
        className="cyber-glow-card group relative bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col cursor-pointer transform-gpu will-change-transform"
      >
        {/* Visual Layer */}
        <div className="relative w-full aspect-[4/3] bg-[#0F172A] overflow-hidden">
          {hasImages ? (
            <img src={images[cardImageIdx]} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500 transform-gpu" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-[#475569]" />
            </div>
          )}
          
          {/* Offer Badge (Electric Violet with cyber pulse animation) */}
          {p.offer > 0 && (
            <div className="absolute top-3 left-3 bg-[#8B5CF6] text-[#F9FAFB] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded shadow-md z-10 animate-cyber-pulse shadow-[0_0_12px_rgba(139,92,246,0.5)] border border-[#A78BFA]/30">
              {p.offer}% OFF
            </div>
          )}

          {/* Carousel Arrows */}
          {images.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <button 
                onClick={handlePrevCardImg} 
                className="pointer-events-auto w-8 h-8 rounded-full bg-[#1E293B]/95 backdrop-blur-sm shadow-md flex items-center justify-center text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#10B981] hover:shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all cursor-pointer border border-[#334155]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextCardImg} 
                className="pointer-events-auto w-8 h-8 rounded-full bg-[#1E293B]/95 backdrop-blur-sm shadow-md flex items-center justify-center text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#10B981] hover:shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all cursor-pointer border border-[#334155]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content Layer */}
        <div className="p-5 flex-1 flex flex-col relative bg-[#1E293B]">
          <p className="text-[10px] font-black uppercase text-[#10B981] tracking-widest mb-1.5 font-mono">{(p.category || '').toLowerCase()}</p>
          <h3 className="text-base font-bold text-[#F9FAFB] tracking-tight leading-snug break-words mb-3 line-clamp-2">{p.name}</h3>
          
          {/* Stock Indicator */}
          {outOfStock ? (
            <div className="mb-2.5 inline-flex items-center gap-1.5 bg-red-950/40 text-red-400 font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-red-900/30 w-max font-mono">
              <AlertCircle className="w-3 h-3" /> {t('Out of Stock')}
            </div>
          ) : isLowStock ? (
            <div className="mb-2.5 inline-flex items-center gap-1.5 bg-amber-950/40 text-amber-400 font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-900/30 w-max font-mono">
              <AlertCircle className="w-3 h-3" /> Only {p.quantity} left!
            </div>
          ) : null}

          {/* Meta Badge */}
          <div className="mb-auto">
            {p.deliveryAvailable ? 
              <p className="text-[9px] uppercase font-bold text-[#10B981] flex items-center gap-1 w-max bg-[#10B981]/10 border border-[#10B981]/20 px-2.5 py-1 rounded-full font-mono"><Truck className="w-3 h-3" /> Home Delivery</p> :
              <p className="text-[9px] uppercase font-bold text-[#9CA3AF] flex items-center gap-1 w-max bg-[#0B0F19] border border-[#334155] px-2.5 py-1 rounded-full font-mono"><Store className="w-3 h-3" /> Pickup Only</p>
            }
          </div>

          <div className="mt-4 pt-4 border-t border-[#334155]/60 flex justify-between items-center">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-[#F9FAFB]">₹{p.actualPrice || p.price}</span>
                {p.offer > 0 && <span className="text-[11px] font-bold text-[#9CA3AF] line-through">₹{p.price}</span>}
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowModal(true); setModalImageIdx(0); }}
              className="bg-[#0B0F19] border border-[#334155] text-[#F9FAFB] group-hover:bg-[#10B981] group-hover:text-[#0B0F19] group-hover:border-[#10B981] rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0"
            >
              {t('View Details')}
            </button>
          </div>
        </div>
      </div>

      {/* Full-Page Detailed View Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 md:p-8 xl:p-12 overflow-hidden bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#1E293B] border border-[#334155] w-full max-w-6xl h-[92vh] md:h-[85vh] rounded-2xl md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 bg-[#0B0F19]/80 backdrop-blur rounded-full flex items-center justify-center text-[#9CA3AF] hover:bg-[#1E293B] hover:text-[#F9FAFB] transition-colors cursor-pointer shadow border border-[#334155]"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Column: Image Viewer */}
            <div className="w-full md:w-[45%] bg-[#0B0F19] flex flex-col border-b md:border-b-0 md:border-r border-[#334155] h-[40vh] md:h-auto shrink-0 relative overflow-hidden">
              {hasImages ? (
                <>
                  <div className="flex-1 w-full relative min-h-0 bg-[#0B0F19] flex items-center justify-center p-3">
                    <img src={images[modalImageIdx]} alt={p.name} className="max-w-full max-h-full object-contain" />
                    {p.offer > 0 && (
                      <div className="absolute top-6 left-6 bg-[#8B5CF6] text-white text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg shadow-lg z-10 animate-cyber-pulse border border-[#A78BFA]/30 shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                        {p.offer}% OFF
                      </div>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="h-24 bg-[#1E293B]/40 backdrop-blur-md border-t border-[#334155] px-4 py-3 flex items-center gap-3 overflow-x-auto shrink-0 scrollbar-hide">
                      {images.map((img: string, idx: number) => (
                        <div 
                          key={idx} 
                          onClick={() => setModalImageIdx(idx)}
                          className={`w-16 h-16 rounded-xl overflow-hidden border-2 cursor-pointer transition-all shrink-0 ${idx === modalImageIdx ? 'border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'border-[#334155] opacity-50 hover:opacity-100'}`}
                        >
                          <img src={img} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0F19]">
                  <Package className="w-24 h-24 text-[#334155] mb-4" />
                  <p className="font-extrabold text-[#9CA3AF] uppercase tracking-widest text-sm font-mono">TIORKHALI MART</p>
                </div>
              )}
            </div>

            {/* Right Column: Details */}
            <div className="w-full md:w-[55%] flex-1 flex flex-col bg-[#1E293B] overflow-y-auto">
              <div className="p-6 md:p-10 flex-1">
                <p className="text-[10px] font-black uppercase text-[#10B981] tracking-widest mb-2 font-mono">{(p.category || '').toLowerCase()}</p>
                <h2 className="text-2xl md:text-3xl font-black text-[#F9FAFB] leading-tight mb-6">{p.name}</h2>
                
                <div className="flex items-center gap-4 mb-8 bg-[#0B0F19] inline-flex px-5 py-3 rounded-2xl border border-[#334155] shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-0.5 font-mono">Final Price</span>
                    <span className="text-3xl font-black text-[#10B981] drop-shadow-[0_0_10px_rgba(16,185,129,0.25)]">₹{p.actualPrice || p.price}</span>
                  </div>
                  {p.offer > 0 && (
                    <div className="flex flex-col ml-2 border-l pl-5 border-[#334155]">
                      <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-0.5 font-mono">Original</span>
                      <span className="text-xl font-bold text-[#9CA3AF] line-through">₹{p.price}</span>
                    </div>
                  )}
                </div>

                {outOfStock ? (
                  <div className="mb-6 inline-flex items-center gap-2 bg-red-950/40 text-red-400 font-bold text-xs uppercase tracking-wider px-3.5 py-2.5 rounded-xl border border-red-900/30">
                    <AlertCircle className="w-4 h-4 text-red-400" /> Out of stock
                  </div>
                ) : isLowStock ? (
                  <div className="mb-6 inline-flex items-center gap-2 bg-amber-950/40 text-amber-400 font-bold text-xs uppercase tracking-wider px-3.5 py-2.5 rounded-xl border border-amber-900/30">
                    <AlertCircle className="w-4 h-4 text-amber-400" /> Hurry! Only {p.quantity} left
                  </div>
                ) : null}

                <div className="mb-8">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3 border-b border-[#334155] pb-2 font-mono">Description</h4>
                  <p className="text-sm font-medium text-[#F9FAFB] leading-relaxed whitespace-pre-line">{p.description}</p>
                </div>

                <div className="mb-8 bg-[#0B0F19] rounded-2xl border border-[#334155] overflow-hidden shadow-inner">
                  <div className="p-3 md:p-4 border-b border-[#334155] bg-[#1E293B]/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                       <Store className="w-5 h-5 text-[#10B981]" />
                       <h4 className="text-sm font-black uppercase tracking-wider text-[#F9FAFB] font-mono">Store Info</h4>
                    </div>
                    {p.deliveryAvailable ? 
                      <p className="text-[9px] uppercase font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2.5 py-1 rounded flex items-center gap-1 w-max font-mono"><Truck className="w-3 h-3" /> Delivery Available</p> :
                      <p className="text-[9px] uppercase font-bold text-[#9CA3AF] bg-[#1E293B] border border-[#334155] px-2.5 py-1 rounded flex items-center gap-1 w-max font-mono"><Store className="w-3 h-3" /> Pickup Only</p>
                    }
                  </div>
                  <div className="p-4 space-y-3.5 text-xs font-bold text-[#9CA3AF]">
                    <p className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1E293B] border border-[#334155] text-[#10B981] shadow-sm"><Store className="w-4 h-4 text-[#10B981]" /></span> {p.storeDetails?.storeName || 'TIORKHALI MART Vendor'}</p>
                    <p className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1E293B] border border-[#334155] text-[#10B981] shadow-sm"><MapPin className="w-4 h-4 text-[#10B981]" /></span> {p.storeDetails?.location || 'Not Specified'}</p>
                    <p className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1E293B] border border-[#334155] text-[#10B981] shadow-sm"><Phone className="w-4 h-4 text-[#10B981]" /></span> {p.storeDetails?.contactNumber || 'Not Specified'}</p>
                  </div>
                </div>

                <div className="mt-auto">
                  <button
                    onClick={handleInterest}
                    disabled={loading || success || outOfStock || user?.role === 'admin'}
                    className={`cyber-btn-premium cursor-pointer w-full py-4.5 px-6 rounded-2xl font-black tracking-widest uppercase text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] duration-300 transform-gpu ${
                      success ? '!bg-[#10B981] !text-[#0B0F19] shadow-[#10B981]/20 border-transparent font-black' : 
                      outOfStock ? 'opacity-40 cursor-not-allowed' :
                      user?.role === 'admin' ? 'opacity-40 cursor-not-allowed' :
                      'text-white'
                    }`}
                  >
                    {loading ? t('Loading...') : 
                     success ? <><CheckCircle className="w-5 h-5 text-[#0B0F19]" /> {t('Interest Logged!')}</> : 
                     outOfStock ? t('Out of Stock') :
                     t('I Want to Buy This')}
                  </button>
                </div>
                
                {/* Expand Reviews */}
                <div className="mt-8 pt-6 border-t border-[#334155]">
                  <div 
                    onClick={() => setShowReviews(!showReviews)} 
                    className="flex items-center justify-between cursor-pointer group"
                  >
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#F9FAFB] flex items-center gap-2 flex-1 font-mono">
                       <Star className={`w-4 h-4 ${showReviews ? 'text-[#10B981]' : 'text-[#475569] group-hover:text-[#9CA3AF]'} transition-colors`} /> 
                       Customer Reviews ({reviews.length > 0 ? avgRating : 'New'})
                     </h4>
                     <button className="text-[10px] font-bold text-[#10B981] cursor-pointer bg-[#10B981]/15 border border-[#10B981]/25 px-3.5 py-1.5 rounded-full hover:bg-[#10B981]/25 transition-colors">
                        {showReviews ? 'Hide' : 'Show Reviews'}
                     </button>
                  </div>

                  {showReviews && (
                    <div className="bg-[#0B0F19] rounded-2xl p-4 border border-[#334155] mt-4 shadow-inner">
                      {user?.role === 'customer' && (
                        <form onSubmit={submitReview} className="mb-6 bg-[#1E293B] p-4 rounded-xl border border-[#334155] shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">Your Rating:</span>
                            <div className="flex bg-[#0B0F19] p-1 rounded-lg border border-[#334155]">
                              {[1,2,3,4,5].map(n => (
                                <button
                                  type="button"
                                  key={n}
                                  onClick={() => setNewReview(prev => ({...prev, rating: n}))}
                                  className={`p-1 rounded cursor-pointer transition-colors ${newReview.rating >= n ? 'text-amber-400' : 'text-[#475569] hover:text-[#9CA3AF]'}`}
                                >
                                  <Star className="w-4 h-4 fill-current" />
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea 
                            required
                            placeholder="Write your review here... Be completely honest."
                            value={newReview.text}
                            onChange={e => setNewReview(prev => ({...prev, text: e.target.value}))}
                            className="w-full text-xs font-semibold p-3 border border-[#334155] rounded-xl outline-none focus:border-[#10B981] mb-3 resize-none bg-[#0B0F19] text-[#F9FAFB] placeholder-[#475569] transition-colors min-h-[4rem]"
                            rows={2}
                          />
                          <button type="submit" disabled={submittingReview} className="w-full bg-[#10B981] text-[#0B0F19] text-[10px] uppercase tracking-wider font-extrabold py-3 rounded-xl hover:opacity-90 transition-colors shadow-md cursor-pointer">
                            {submittingReview ? 'Submitting...' : 'Post Review'}
                          </button>
                        </form>
                      )}

                      <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                        {reviews.length === 0 ? (
                          <p className="text-xs text-[#9CA3AF] font-bold text-center py-6 bg-[#1E293B]/30 rounded-xl border border-[#334155]/60 font-mono">No reviews yet. Be the first!</p>
                        ) : (
                          reviews.map(r => (
                            <div key={r._id} className="bg-[#1E293B] border border-[#334155] p-4 rounded-xl shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black text-[#F9FAFB]">{r.customerName || 'Anonymous'}</span>
                                <div className="flex text-amber-400">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-current' : 'text-[#334155]'}`} />
                                  ))}
                                </div>
                              </div>
                              <p className="text-xs text-[#9CA3AF] font-medium leading-relaxed">{r.text}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Marketplace() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const t = useT();

  const fetchProducts = async () => {
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (category) query.append('category', category);
      if (deliveryOnly) query.append('deliveryAvailable', 'true');
      const res = await fetch(`/api/products?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Date.now() > 0 && Array.isArray(data) ? data : []);
      } else {
        setProducts([]);
        console.error('Failed to fetch products');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, category, deliveryOnly]);

  const uniqueStores = Array.from(
    new Set(products.map((p) => p.storeDetails?.storeName).filter(Boolean))
  ) as string[];

  useEffect(() => {
    if (selectedStore && !uniqueStores.includes(selectedStore)) {
      setSelectedStore('');
    }
  }, [products]);

  const filteredProducts = products.filter(
    (p) => !selectedStore || p.storeDetails?.storeName === selectedStore
  );

  return (
    <div className="space-y-6">
      <div className="bg-[#1E293B] p-4 sm:p-6 rounded-2xl sm:rounded-[32px] shadow-lg border border-[#334155]">
        <h1 className="text-2xl sm:text-3xl font-black text-[#F9FAFB] mb-6 flex items-center gap-3">
          <span className="w-3 h-3 bg-[#10B981] rounded-full shadow-[0_0_8px_#10B981] animate-pulse"></span> {t('Marketplace')}
        </h1>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-5 h-5 font-black" />
            <input
              type="text"
              placeholder={t('Search products...')}
              className="w-full pl-12 pr-4 py-3 bg-[#0B0F19] text-[#F9FAFB] font-semibold placeholder-[#475569] border border-[#334155] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] font-bold border border-[#334155] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t('All Categories')}</option>
            <option value="Groceries">Groceries</option>
            <option value="Handicrafts">Handicrafts</option>
            <option value="Electronics">Electronics</option>
            <option value="Clothing">Clothing</option>
            <option value="Hardware">Hardware</option>
          </select>
          <select
            className="px-4 py-3 bg-[#0B0F19] text-[#F9FAFB] font-bold border border-[#334155] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all cursor-pointer"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            <option value="">{t('All Locations')}</option>
            {uniqueStores.map(storeName => (
              <option key={storeName} value={storeName}>{storeName}</option>
            ))}
          </select>
          <label className="flex items-center justify-center gap-3 border border-[#334155] bg-[#0B0F19] px-6 py-3 rounded-2xl cursor-pointer hover:bg-[#1E293B] transition-all duration-300 select-none">
            <input type="checkbox" className="accent-[#10B981] bg-[#0B0F19] border-[#334155] rounded focus:ring-1 focus:ring-[#10B981] w-4.5 h-4.5 cursor-pointer" 
              checked={deliveryOnly} onChange={(e) => setDeliveryOnly(e.target.checked)} />
            <span className="text-sm font-bold text-[#F9FAFB]">Delivery Available</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map((p) => (
          <ProductCard key={p._id} p={p} onInterest={async (id) => {
            if (!user) { navigate('/login'); return false; }
            try {
              const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ productId: id })
              });
              return res.ok;
            } catch { return false; }
          }} />
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-12 text-center text-[#9CA3AF] bg-[#1E293B] rounded-[32px] border border-[#334155] font-bold font-mono">
            {t('No products found.')}
          </div>
        )}
      </div>
    </div>
  );
}
