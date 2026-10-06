import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Store, ArrowRight, ShoppingBag, ShieldCheck, Heart, User, Sparkles } from 'lucide-react';

export default function Landing() {
  const { user, token } = useAuthStore();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'manager') return '/manager';
    return '/customer';
  };

  return (
    <div className="flex flex-col gap-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E293B] border border-[#334155]/80 text-[#F9FAFB] p-8 md:p-16 shadow-2xl shadow-emerald-950/10">
        {/* Glowing decorative ambient rings */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#10B981]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-96 h-96 bg-[#8B5CF6]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-3xl relative z-10 flex flex-col items-start gap-6">
          <span className="bg-[#10B981]/10 backdrop-blur-md border border-[#10B981]/35 text-[#10B981] text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-1.5 font-mono shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Empowering Local Micro-Commerce
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-[#F9FAFB] uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            TIORKHALI <span className="text-[#10B981] drop-shadow-[0_0_12px_rgba(16,185,129,0.25)]">MART</span>
          </h1>
          <p className="text-base md:text-lg font-medium leading-relaxed text-[#9CA3AF]">
            Our Motto: <span className="font-bold text-[#F9FAFB] border-b-2 border-[#10B981]/30 pb-1">"Connecting Hearts, Elevating Local Crafts."</span> We bridge the gap between skilled rural artisans, local vendors, and passionate buyers. Experience authentic craftsmanship, fresh regional produce, and personalized commerce.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full sm:w-auto">
            {token && user ? (
              <Link
                to={getDashboardPath()}
                className="cursor-pointer cyber-btn-premium text-[#0B0F19] font-black uppercase tracking-wider text-xs px-8 py-4.5 rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition transform-gpu flex items-center justify-center gap-2"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="cursor-pointer cyber-btn-premium text-white font-black uppercase tracking-wider text-xs px-8 py-4.5 rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition transform-gpu flex items-center justify-center gap-2"
                >
                  Explore Marketplace <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/register"
                  className="cursor-pointer bg-transparent border-2 border-[#334155] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#10B981] hover:bg-[#10B981]/5 font-black uppercase tracking-wider text-xs px-8 py-4 rounded-full transition duration-300 flex items-center justify-center gap-2"
                >
                  Join as Merchant
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#F9FAFB] tracking-tight">Inside Tiorkhali Mart</h2>
          <p className="text-xs text-[#10B981] font-black uppercase tracking-widest font-mono">How It Works</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Card 1 */}
          <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-lg hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-[#10B981]/50 transition-all duration-300 flex flex-col gap-4 group transform-gpu">
            <div className="w-12 h-12 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 rounded-2xl flex items-center justify-center font-mono font-black text-lg shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              1
            </div>
            <h3 className="text-xl font-extrabold text-[#F9FAFB] group-hover:text-[#10B981] transition-colors">Browse & Selection</h3>
            <p className="text-sm font-medium text-[#9CA3AF] leading-relaxed">
              Explore authentic local merchandise listed directly by regional Store Managers, ranging from handicrafts, traditional garments, to daily groceries.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-lg hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] hover:border-[#8B5CF6]/50 transition-all duration-300 flex flex-col gap-4 group transform-gpu">
            <div className="w-12 h-12 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/25 rounded-2xl flex items-center justify-center font-mono font-black text-lg shadow-[0_0_10px_rgba(139,92,246,0.2)] animate-pulse">
              2
            </div>
            <h3 className="text-xl font-extrabold text-[#F9FAFB] group-hover:text-[#8B5CF6] transition-colors">Express Interest</h3>
            <p className="text-sm font-medium text-[#9CA3AF] leading-relaxed">
              Found something you love? Tap the <span className="font-extrabold text-[#10B981]">"I Want to Buy This"</span> button. This immediately logs an inquiry directly into the Store Manager's dashboard.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-lg hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-[#10B981]/50 transition-all duration-300 flex flex-col gap-4 group transform-gpu">
            <div className="w-12 h-12 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 rounded-2xl flex items-center justify-center font-mono font-black text-lg shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              3
            </div>
            <h3 className="text-xl font-extrabold text-[#F9FAFB] group-hover:text-[#10B981] transition-colors">Coordinated Checkout</h3>
            <p className="text-sm font-medium text-[#9CA3AF] leading-relaxed">
              The Store Manager reviews your buying requests in real-time, contacts you via phone/WhatsApp, and arranges convenient delivery or pickup options.
            </p>
          </div>
        </div>
      </section>

      {/* Feature stats */}
      <section className="bg-[#1E293B] rounded-[32px] border border-[#334155] p-8 md:p-12 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <span className="text-[10px] font-black uppercase text-[#10B981] tracking-widest bg-[#10B981]/10 border border-[#10B981]/20 px-3 py-1 rounded-full font-mono">
            Our Purpose & Vision
          </span>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[#F9FAFB] leading-tight">
            Building Sustainable Community Markets
          </h2>
          <p className="text-sm font-medium text-[#9CA3AF] leading-relaxed">
            By eliminating unnecessary middle-layers, Tiorkhali Mart ensures that every rupee you spend directly rewards the hands that crafted the product. This creates a direct economic lift within rural ecosystems, nurturing micro-entrepreneurship and preserving cultural assets.
          </p>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#10B981]" />
              <span className="text-xs font-black text-[#F9FAFB] uppercase tracking-wider font-mono">Artisan Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#8B5CF6]" />
              <span className="text-xs font-black text-[#F9FAFB] uppercase tracking-wider font-mono">100% Autonomy</span>
            </div>
          </div>
        </div>
        <div className="bg-[#0B0F19] rounded-2xl p-8 border border-[#334155] space-y-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] shadow-lg">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-[#8B5CF6] tracking-widest font-mono">Chief Developer</p>
              <h3 className="text-xl font-black text-[#F9FAFB]">Mahim Ali Sekh</h3>
            </div>
          </div>
          <p className="text-xs font-medium text-[#9CA3AF] leading-relaxed italic border-l-2 border-[#10B981] pl-4">
            "We envision a platform where local micro-entrepreneurs can declare their inventories and have them beautifully discovered directly by customers in nearby regions, keeping community capitalism healthy and sustainable."
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 pt-8 border-t border-[#334155] flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 bg-[#10B981] text-[#0B0F19] flex items-center justify-center rounded-lg font-black text-sm shadow-[0_0_10px_#10B981]">T</span>
          <span className="text-[#F9FAFB] font-black">TIORKHALI MART</span>
        </div>
        <div className="text-center md:text-right space-y-1">
          <p>Developed with passion by <span className="text-[#10B981] font-black">Mahim Ali Sekh</span></p>
          <p className="text-[10px] text-[#475569]">© 2026 Tiorkhali Mart. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
