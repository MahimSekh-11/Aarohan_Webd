import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Search, Filter, MapPin, Phone, Truck, Package, Store, Star, MessageSquare, X, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../components/Translate';

import { useDialog } from '../lib/useDialog';

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
  const dialog=useRef<HTMLDivElement>(null);
  const [params]=useSearchParams();
  const [cardError,setCardError]=useState('');
  useEffect(()=>{if(params.get('product')===p._id)setShowModal(true);},[params,p._id]);
  useDialog(showModal,dialog,()=>setShowModal(false));

  const handleInterest = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if(loading)return;setCardError('');setLoading(true);
    const ok = await onInterest(p._id);
    if (ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    if(!ok)setCardError('Could not send request. Please try again.');
    setLoading(false);
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/products/${p._id}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data)?data:[]);
      }else setCardError('Could not load reviews. Please try again.');
    } catch (e) {
      setCardError('Could not load reviews. Please try again.');
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
      }else setCardError('Could not save review. Please try again.');
    } catch (err) {
      setCardError('Could not save review. Please try again.');
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
      <div data-product-id={p._id} data-product-name={p.name} data-product-price={p.actualPrice ?? p.price} role="button" tabIndex={0} aria-label={t(p.name)} onKeyDown={e=>{if(e.target===e.currentTarget && ['Enter',' '].includes(e.key)){e.preventDefault();setShowModal(true);}}}
        onClick={() => { setShowModal(true); setModalImageIdx(0); }}
        className="cyber-glow-card group relative bg-[#162638] border border-[#2B4054] rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col cursor-pointer transform-gpu will-change-transform"
      >
        {/* Visual Layer */}
        <div className="relative w-full aspect-[4/3] bg-[#102030] overflow-hidden">
          {hasImages ? (
            <img src={images[cardImageIdx]} alt={t(p.name)} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500 transform-gpu" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-[#7B95AD]" />
            </div>
          )}

          {/* Offer Badge (Electric Violet with cyber pulse animation) */}
          {p.offer > 0 && (
            <div className="absolute top-3 left-3 bg-[#E6B879] text-[#F3F6F9] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded shadow-md z-10 animate-cyber-pulse shadow-[0_0_12px_rgba(139,92,246,0.5)] border border-[#F1C998]/30">
              {p.offer}{t("% OFF")}</div>
          )}

          {/* Carousel Arrows */}
          {images.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <button
                aria-label={t('Previous image')} onClick={handlePrevCardImg}
                className="pointer-events-auto w-8 h-8 rounded-full bg-[#162638]/95 backdrop-blur-sm shadow-md flex items-center justify-center text-[#A5B7C8] hover:text-[#F3F6F9] hover:bg-[#83D9BD] hover:shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all cursor-pointer border border-[#2B4054]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                aria-label={t('Next image')} onClick={handleNextCardImg}
                className="pointer-events-auto w-8 h-8 rounded-full bg-[#162638]/95 backdrop-blur-sm shadow-md flex items-center justify-center text-[#A5B7C8] hover:text-[#F3F6F9] hover:bg-[#83D9BD] hover:shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all cursor-pointer border border-[#2B4054]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content Layer */}
        <div className="p-5 flex-1 flex flex-col relative bg-[#162638]">
          <p className="text-[10px] font-black uppercase text-[#83D9BD] tracking-widest mb-1.5 font-sans">{t(p.category || '')}</p>
          <h3 className="text-base font-bold text-[#F3F6F9] tracking-tight leading-snug break-words mb-3 line-clamp-2">{t(p.name)}</h3>

          {/* Stock Indicator */}
          {outOfStock ? (
            <div className="mb-2.5 inline-flex items-center gap-1.5 bg-red-950/40 text-red-400 font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-red-900/30 w-max font-sans">
              <AlertCircle className="w-3 h-3" /> {t('Out of Stock')}
            </div>
          ) : isLowStock ? (
            <div className="mb-2.5 inline-flex items-center gap-1.5 bg-amber-950/40 text-amber-400 font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-900/30 w-max font-sans">
              <AlertCircle className="w-3 h-3" />{t("Only")}{p.quantity}{t("left!")}</div>
          ) : null}

          {/* Meta Badge */}
          <div className="mb-auto">
            {p.deliveryAvailable ?
              <p className="text-[9px] uppercase font-bold text-[#83D9BD] flex items-center gap-1 w-max bg-[#83D9BD]/10 border border-[#83D9BD]/20 px-2.5 py-1 rounded-full font-sans"><Truck className="w-3 h-3" /> {t('Home Delivery')}</p> :
              <p className="text-[9px] uppercase font-bold text-[#A5B7C8] flex items-center gap-1 w-max bg-[#0D1825] border border-[#2B4054] px-2.5 py-1 rounded-full font-sans"><Store className="w-3 h-3" /> {t('Pickup Only')}</p>
            }
          </div>

          <div className="mt-4 pt-4 border-t border-[#2B4054]/60 flex justify-between items-center">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-[#F3F6F9]">₹{p.actualPrice || p.price}</span>
                {p.offer > 0 && <span className="text-[11px] font-bold text-[#A5B7C8] line-through">₹{p.price}</span>}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowModal(true); setModalImageIdx(0); }}
              className="bg-[#0D1825] border border-[#2B4054] text-[#F3F6F9] group-hover:bg-[#83D9BD] group-hover:text-[#0D1825] group-hover:border-[#83D9BD] rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0"
            >
              {t('View Details')}
            </button>
          </div>
        </div>
      </div>

      {/* Full-Page Detailed View Modal */}
      {cardError && <p className="error-banner" role="alert">{t(cardError)}</p>}
      {showModal && (
        <div ref={dialog} data-selected-product-id={p._id} role="dialog" aria-modal="true" aria-label={t(p.name)} className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 md:p-8 xl:p-12 overflow-hidden bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#162638] border border-[#2B4054] w-full max-w-6xl h-[92vh] md:h-[85vh] rounded-2xl md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row relative">

            {/* Close Button */}
            <button
              aria-label={t('Close')} onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 bg-[#0D1825]/80 backdrop-blur rounded-full flex items-center justify-center text-[#A5B7C8] hover:bg-[#162638] hover:text-[#F3F6F9] transition-colors cursor-pointer shadow border border-[#2B4054]"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Column: Image Viewer */}
            <div className="w-full md:w-[45%] bg-[#0D1825] flex flex-col border-b md:border-b-0 md:border-r border-[#2B4054] h-[40vh] md:h-auto shrink-0 relative overflow-hidden">
              {hasImages ? (
                <>
                  <div className="flex-1 w-full relative min-h-0 bg-[#0D1825] flex items-center justify-center p-3">
                    <img src={images[modalImageIdx]} alt={t(p.name)} className="max-w-full max-h-full object-contain" />
                    {p.offer > 0 && (
                      <div className="absolute top-6 left-6 bg-[#E6B879] text-white text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg shadow-lg z-10 animate-cyber-pulse border border-[#F1C998]/30 shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                        {p.offer}{t("% OFF")}</div>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="h-24 bg-[#162638]/40 backdrop-blur-md border-t border-[#2B4054] px-4 py-3 flex items-center gap-3 overflow-x-auto shrink-0 scrollbar-hide">
                      {images.map((img: string, idx: number) => (
                        <div
                          key={idx}
                          aria-label={`${t('Image')} ${idx+1}`} onClick={() => setModalImageIdx(idx)}
                          className={`w-16 h-16 rounded-xl overflow-hidden border-2 cursor-pointer transition-all shrink-0 ${idx === modalImageIdx ? 'border-[#83D9BD] shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'border-[#2B4054] opacity-50 hover:opacity-100'}`}
                        >
                          <img src={img} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#0D1825]">
                  <Package className="w-24 h-24 text-[#2B4054] mb-4" />
                  <p className="font-extrabold text-[#A5B7C8] uppercase tracking-widest text-sm font-sans">{t('TIORKHALI MART')}</p>
                </div>
              )}
            </div>

            {/* Right Column: Details */}
            <div className="w-full md:w-[55%] flex-1 flex flex-col bg-[#162638] overflow-y-auto">
              <div className="p-6 md:p-10 flex-1">
                <p className="text-[10px] font-black uppercase text-[#83D9BD] tracking-widest mb-2 font-sans">{t(p.category || '')}</p>
                <h2 className="text-2xl md:text-3xl font-black text-[#F3F6F9] leading-tight mb-6">{t(p.name)}</h2>

                <div className="flex items-center gap-4 mb-8 bg-[#0D1825] inline-flex px-5 py-3 rounded-2xl border border-[#2B4054] shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#A5B7C8] uppercase tracking-wider mb-0.5 font-sans">{t('Final Price')}</span>
                    <span className="text-3xl font-black text-[#83D9BD] drop-shadow-[0_0_10px_rgba(16,185,129,0.25)]">₹{p.actualPrice || p.price}</span>
                  </div>
                  {p.offer > 0 && (
                    <div className="flex flex-col ml-2 border-l pl-5 border-[#2B4054]">
                      <span className="text-[10px] font-bold text-[#A5B7C8] uppercase tracking-wider mb-0.5 font-sans">{t('Original')}</span>
                      <span className="text-xl font-bold text-[#A5B7C8] line-through">₹{p.price}</span>
                    </div>
                  )}
                </div>

                {outOfStock ? (
                  <div className="mb-6 inline-flex items-center gap-2 bg-red-950/40 text-red-400 font-bold text-xs uppercase tracking-wider px-3.5 py-2.5 rounded-xl border border-red-900/30">
                    <AlertCircle className="w-4 h-4 text-red-400" />{t("Out of stock")}</div>
                ) : isLowStock ? (
                  <div className="mb-6 inline-flex items-center gap-2 bg-amber-950/40 text-amber-400 font-bold text-xs uppercase tracking-wider px-3.5 py-2.5 rounded-xl border border-amber-900/30">
                    <AlertCircle className="w-4 h-4 text-amber-400" />{t("Hurry! Only")}{p.quantity}{t("left")}</div>
                ) : null}

                <div className="mb-8">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#A5B7C8] mb-3 border-b border-[#2B4054] pb-2 font-sans">{t('Description')}</h4>
                  <p className="text-sm font-medium text-[#F3F6F9] leading-relaxed whitespace-pre-line">{t(p.description)}</p>
                </div>

                <div className="mb-8 bg-[#0D1825] rounded-2xl border border-[#2B4054] overflow-hidden shadow-inner">
                  <div className="p-3 md:p-4 border-b border-[#2B4054] bg-[#162638]/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                       <Store className="w-5 h-5 text-[#83D9BD]" />
                       <h4 className="text-sm font-black uppercase tracking-wider text-[#F3F6F9] font-sans">{t('Store Info')}</h4>
                    </div>
                    {p.deliveryAvailable ?
                      <p className="text-[9px] uppercase font-bold text-[#83D9BD] bg-[#83D9BD]/10 border border-[#83D9BD]/20 px-2.5 py-1 rounded flex items-center gap-1 w-max font-sans"><Truck className="w-3 h-3" /> {t('Delivery Available')}</p> :
                      <p className="text-[9px] uppercase font-bold text-[#A5B7C8] bg-[#162638] border border-[#2B4054] px-2.5 py-1 rounded flex items-center gap-1 w-max font-sans"><Store className="w-3 h-3" /> {t('Pickup Only')}</p>
                    }
                  </div>
                  <div className="p-4 space-y-3.5 text-xs font-bold text-[#A5B7C8]">
                    <p className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#162638] border border-[#2B4054] text-[#83D9BD] shadow-sm"><Store className="w-4 h-4 text-[#83D9BD]" /></span> {p.storeDetails?.storeName || 'TIORKHALI MART Vendor'}</p>
                    <p className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#162638] border border-[#2B4054] text-[#83D9BD] shadow-sm"><MapPin className="w-4 h-4 text-[#83D9BD]" /></span> {p.storeDetails?.location || 'Not Specified'}</p>
                    <p className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#162638] border border-[#2B4054] text-[#83D9BD] shadow-sm"><Phone className="w-4 h-4 text-[#83D9BD]" /></span> {p.storeDetails?.contactNumber || 'Not Specified'}</p>
                  </div>
                </div>

                <div className="mt-auto">
                  <button
                    onClick={handleInterest}
                    disabled={loading || success || outOfStock || user?.role === 'admin'}
                    className={`cyber-btn-premium cursor-pointer w-full py-4.5 px-6 rounded-2xl font-black tracking-widest uppercase text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] duration-300 transform-gpu ${
                      success ? '!bg-[#83D9BD] !text-[#0D1825] shadow-[#83D9BD]/20 border-transparent font-black' :
                      outOfStock ? 'opacity-40 cursor-not-allowed' :
                      user?.role === 'admin' ? 'opacity-40 cursor-not-allowed' :
                      'text-white'
                    }`}
                  >
                    {loading ? t('Loading...') :
                     success ? <><CheckCircle className="w-5 h-5 text-[#0D1825]" /> {t('Interest Logged!')}</> :
                     outOfStock ? t('Out of Stock') :
                     t('I Want to Buy This')}
                  </button>
                </div>

                {/* Expand Reviews */}
                <div className="mt-8 pt-6 border-t border-[#2B4054]">
                  <div
                    onClick={() => setShowReviews(!showReviews)}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#F3F6F9] flex items-center gap-2 flex-1 font-sans">
                       <Star className={`w-4 h-4 ${showReviews ? 'text-[#83D9BD]' : 'text-[#7B95AD] group-hover:text-[#A5B7C8]'} transition-colors`} />{t("Customer Reviews (")}{reviews.length > 0 ? avgRating : t('New')})
                     </h4>
                     <button className="text-[10px] font-bold text-[#83D9BD] cursor-pointer bg-[#83D9BD]/15 border border-[#83D9BD]/25 px-3.5 py-1.5 rounded-full hover:bg-[#83D9BD]/25 transition-colors">
                        {showReviews ? t('Hide') : t('Show Reviews')}
                     </button>
                  </div>

                  {showReviews && (
                    <div className="bg-[#0D1825] rounded-2xl p-4 border border-[#2B4054] mt-4 shadow-inner">
                      {user?.role === 'customer' && (
                        <form onSubmit={submitReview} className="mb-6 bg-[#162638] p-4 rounded-xl border border-[#2B4054] shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-[#A5B7C8] uppercase tracking-wider font-sans">{t('Your Rating:')}</span>
                            <div className="flex bg-[#0D1825] p-1 rounded-lg border border-[#2B4054]">
                              {[1,2,3,4,5].map(n => (
                                <button
                                  type="button"
                                  key={n}
                                  aria-label={`${t('Rating')} ${n}`} onClick={() => setNewReview(prev => ({...prev, rating: n}))}
                                  className={`p-1 rounded cursor-pointer transition-colors ${newReview.rating >= n ? 'text-amber-400' : 'text-[#7B95AD] hover:text-[#A5B7C8]'}`}
                                >
                                  <Star className="w-4 h-4 fill-current" />
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea
                            required
                            placeholder={t('Write your review here... Be completely honest.')}
                            value={newReview.text}
                            onChange={e => setNewReview(prev => ({...prev, text: e.target.value}))}
                            className="w-full text-xs font-semibold p-3 border border-[#2B4054] rounded-xl outline-none focus:border-[#83D9BD] mb-3 resize-none bg-[#0D1825] text-[#F3F6F9] placeholder-[#7B95AD] transition-colors min-h-[4rem]"
                            rows={2}
                          />
                          <button type="submit" disabled={submittingReview} className="w-full bg-[#83D9BD] text-[#0D1825] text-[10px] uppercase tracking-wider font-extrabold py-3 rounded-xl hover:opacity-90 transition-colors shadow-md cursor-pointer">
                            {submittingReview ? t('Submitting...') : t('Post Review')}
                          </button>
                        </form>
                      )}

                      <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                        {reviews.length === 0 ? (
                          <p className="text-xs text-[#A5B7C8] font-bold text-center py-6 bg-[#162638]/30 rounded-xl border border-[#2B4054]/60 font-sans">{t('No reviews yet. Be the first!')}</p>
                        ) : (
                          reviews.map(r => (
                            <div key={r._id} className="bg-[#162638] border border-[#2B4054] p-4 rounded-xl shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black text-[#F3F6F9]">{r.customerName || 'Anonymous'}</span>
                                <div className="flex text-amber-400">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-current' : 'text-[#2B4054]'}`} />
                                  ))}
                                </div>
                              </div>
                              <p className="text-xs text-[#A5B7C8] font-medium leading-relaxed">{t(r.text)}</p>
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
  const [params,setParams]=useSearchParams();
  const [products,setProducts]=useState<any[]>([]),[search,setSearch]=useState(params.get('search')||''),[selectedStore,setSelectedStore]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const {user,token}=useAuthStore(),navigate=useNavigate(),t=useT();
  const category=params.get('category')||'',deliveryOnly=params.get('delivery')==='true',maxPrice=params.get('maxPrice')||'',sort=params.get('sort')||'newest';
  useEffect(()=>{setSearch(params.get('search')||'');},[params]);
  const setFilter=(key:string,value:string)=>{const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);next.delete('product');setParams(next,{replace:true});};
  useEffect(()=>{const timer=setTimeout(()=>{if(search!==(params.get('search')||''))setFilter('search',search);},250);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{const refresh=()=>setRevision(n=>n+1);window.addEventListener('products-updated',refresh);return()=>window.removeEventListener('products-updated',refresh);},[]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    const query=new URLSearchParams(params);if(deliveryOnly)query.set('deliveryAvailable','true');
    async function load(){try{const res=await fetch(`/api/products?${query}`,{signal:controller.signal});if(!res.ok)throw new Error();const data=await res.json();if(!Array.isArray(data))throw new Error();
      const id=params.get('product');if(id&&!data.some(p=>p._id===id)){const detail=await fetch(`/api/products/${id}`,{signal:controller.signal});if(detail.ok)data.unshift(await detail.json());}
      if(!controller.signal.aborted)setProducts(data);
    }catch(e){if(!controller.signal.aborted)setError('Could not load products. Please try again.');}finally{if(!controller.signal.aborted)setLoading(false);}}
    void load();return()=>controller.abort();
  },[params,revision]);
  const stores=[...new Set(products.map(p=>p.storeDetails?.storeName).filter(Boolean))] as string[];
  const filtered=products.filter(p=>!selectedStore||p.storeDetails?.storeName===selectedStore);
  return <section className="space-y-7 py-8"><div className="flex flex-wrap justify-between items-end gap-4"><div><p className="section-kicker">{t('Browse & Selection')}</p><h1 className="page-title mt-3">{t('Marketplace')}</h1></div><button className="button-secondary" onClick={()=>window.dispatchEvent(new Event('agent-open'))}>{t('Voice Assistant')}</button></div>
    <div className="surface-panel p-5 space-y-4"><div className="relative"><Search className="absolute left-4 top-3.5 text-[#A5B7C8]" size={19}/><input aria-label={t('Search products...')} placeholder={t('Search products...')} className="w-full bg-[#0D1825] border border-[#2B4054] rounded-xl pl-12 pr-4 py-3" value={search} onChange={e=>setSearch(e.target.value)} maxLength={150}/></div>
      <div className="market-filters"><select aria-label={t('Category')} value={category} onChange={e=>setFilter('category',e.target.value)}><option value="">{t('All Categories')}</option>{['Groceries','Handicrafts','Electronics','Clothing','Hardware'].map(c=><option value={c} key={c}>{t(c)}</option>)}</select><select aria-label={t('Store')} value={selectedStore} onChange={e=>setSelectedStore(e.target.value)}><option value="">{t('All Locations')}</option>{stores.map(name=><option key={name}>{name}</option>)}</select><input aria-label={t('Maximum price')} placeholder={t('Maximum price')} type="number" min="0" value={maxPrice} onChange={e=>setFilter('maxPrice',e.target.value)}/><select aria-label={t('Sort products')} value={sort} onChange={e=>setFilter('sort',e.target.value)}><option value="newest">{t('Newest first')}</option><option value="price_asc">{t('Price: low to high')}</option><option value="price_desc">{t('Price: high to low')}</option></select><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={deliveryOnly} onChange={e=>setFilter('delivery',e.target.checked?'true':'')}/>{t('Delivery Available')}</label><button className="button-secondary" onClick={()=>{setSearch('');setSelectedStore('');setParams({});}}>{t('Clear filters')}</button></div>
    </div>
    {error&&<div role="alert" className="error-banner">{t(error)}<button className="button-secondary ml-3" onClick={()=>setRevision(n=>n+1)}>{t('Try again')}</button></div>}
    {!loading&&!error&&<p className="page-subtitle" role="status">{t('Products found')}: {filtered.length}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{loading?Array.from({length:4},(_,i)=><div key={i} className="card-skeleton"/>):!error&&filtered.map(p=><ProductCard key={p._id} p={p} onInterest={async id=>{if(!user){navigate('/login');return false;}try{const res=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({productId:id})});if(res.ok)window.dispatchEvent(new Event('requests-updated'));return res.ok;}catch{return false;}}}/>)}</div>
    {!loading&&!error&&filtered.length===0&&<div className="empty-state"><Package size={35}/><p>{t('No products found.')}</p><button className="button-secondary" onClick={()=>{setSearch('');setSelectedStore('');setParams({});}}>{t('Clear filters')}</button></div>}
  </section>;
}
