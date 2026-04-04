import React, { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

interface PricingProps {
  onPurchaseRequest: (credits: number, priceId: string, packageName: string) => void;
  onSignUpRequest: () => void;
  userId?: string;
}

let stripePromise: Promise<any> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn('VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe checkout will not be available.');
      return null;
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

const Pricing: React.FC<PricingProps> = ({ onPurchaseRequest, onSignUpRequest, userId }) => {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [selectedPack, setSelectedPack] = useState<any>(null);

  const handlePurchase = async (credits: number, priceId: string, packageName: string) => {
    if (!userId) {
      onSignUpRequest();
      return;
    }

    const stripe = getStripe();
    if (!stripe) {
      alert('Stripe is not configured. Please contact support or use the UPI QR payment option.');
      return;
    }

    setLoadingPriceId(priceId);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId,
          credits,
          packageName
        }),
      });

      const session = await response.json();
      const stripeInstance = await stripe;
      
      if (stripeInstance && session.id) {
        const { error } = await (stripeInstance as any).redirectToCheckout({
          sessionId: session.id,
        });
        if (error) console.error('Stripe Error:', error);
      }
    } catch (err) {
      console.error('Purchase Error:', err);
    } finally {
      setLoadingPriceId(null);
    }
  };

  const modulePacks = [
    {
      name: 'Audio Interview Solo',
      interviews: 1,
      price: 49,
      priceId: 'price_solo_1', // These should be real Stripe Price IDs
      credits: 10,
      description: 'One-time AI-powered audio interview for a specific candidate.',
      features: ['1 Full AI Audio Interview', 'Real-time Transcription', 'Technical Depth Analysis', 'PDF Evaluation Report', 'Shareable Link'],
      icon: <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
    },
    {
      name: 'Audio Interview Pack',
      interviews: 10,
      price: 399,
      priceId: 'price_pack_10',
      credits: 100,
      description: 'Perfect for screening a shortlist of candidates.',
      features: ['10 Full AI Audio Interviews', 'Bulk Scheduling', 'Comparative Analytics', 'Webhook Integration', 'Priority AI Processing'],
      icon: <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    }
  ];
  
  const comboPacks = [
    {
      name: 'Recruiter Essentials',
      price: 999,
      priceId: 'price_essentials',
      credits: 150,
      description: 'The perfect mix for small teams starting their AI recruitment journey.',
      features: [
        '100 AI CV Analyses',
        '5 AI Audio Interviews',
        'Advanced AI Model Access',
        'Priority Technical Support',
        'Custom Interview Templates'
      ],
      savings: 'Save 25%',
      primary: true
    },
    {
      name: 'Talent Acquisition Pro',
      price: 2499,
      priceId: 'price_pro',
      credits: 500,
      description: 'Comprehensive solution for high-growth companies.',
      features: [
        '300 AI CV Analyses',
        '20 AI Audio Interviews',
        'Bulk Candidate Sourcing',
        'Team Collaboration Tools',
        'Dedicated Account Manager'
      ],
      savings: 'Save 35%',
      primary: false
    }
  ];

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 animate-fadeIn space-y-24">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black tracking-tight text-white sm:text-6xl uppercase italic">
          Pricing <span className="text-indigo-500">Plans</span>
        </h2>
        <p className="max-w-2xl mx-auto text-lg text-slate-400">
          Flexible AI recruitment packages designed to scale with your hiring needs. Choose between comprehensive combos or specialized interview modules.
        </p>
      </div>

      {/* Combo Packages - High Value Section */}
      <div className="space-y-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            Best Value Bundles
          </div>
          <h3 className="text-3xl font-black text-white uppercase tracking-tight">Combo Packages</h3>
          <p className="mt-2 text-slate-400">The complete AI recruitment suite at a discounted rate.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {comboPacks.map((pack) => (
            <div 
              key={pack.name} 
              className={`relative group rounded-[2.5rem] p-1 transition-all duration-500 ${pack.primary ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-2xl shadow-indigo-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}
            >
              <div className="bg-slate-950 rounded-[2.3rem] p-8 sm:p-10 h-full flex flex-col relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors"></div>
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div>
                    <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{pack.name}</h4>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                      {pack.savings}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-white tracking-tighter">₹{pack.price.toLocaleString('en-IN')}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">One-time bundle</div>
                  </div>
                </div>

                <p className="text-slate-400 text-sm mb-10 leading-relaxed relative z-10">{pack.description}</p>

                <ul className="space-y-4 mb-12 flex-1 relative z-10">
                  {pack.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-3 h-3 text-indigo-500" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handlePurchase(pack.credits, pack.priceId, pack.name)} 
                  disabled={loadingPriceId === pack.priceId}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all relative z-10 flex items-center justify-center gap-2 ${pack.primary ? 'bg-white text-black hover:bg-slate-200 shadow-xl' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'} disabled:opacity-50`}
                >
                  {loadingPriceId === pack.priceId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Combo Pack'}
                </button>
                <button 
                  onClick={() => {
                    setSelectedPack(pack);
                    setShowUpiQr(true);
                  }}
                  className="mt-3 w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl font-bold uppercase tracking-widest text-[9px] transition-all border border-slate-800 flex items-center justify-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                  Pay via UPI QR
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audio Interview Module Section */}
      <div className="space-y-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
            Specialized Modules
          </div>
          <h3 className="text-3xl font-black text-white uppercase tracking-tight">Audio Interview Module</h3>
          <p className="mt-2 text-slate-400">Pay only for the interviews you conduct. No monthly subscriptions.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {modulePacks.map((pack) => (
            <div key={pack.name} className="glass-panel p-10 rounded-[2.5rem] border-slate-800 hover:border-indigo-500/30 transition-all group flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
                  {pack.icon}
                </div>
                <div className="text-right">
                  <span className="block text-4xl font-black text-white tracking-tighter">₹{pack.price}</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">One-time payment</span>
                </div>
              </div>
              
              <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-3 relative z-10">{pack.name}</h4>
              <p className="text-sm text-slate-400 mb-10 leading-relaxed relative z-10 italic">{pack.description}</p>
              
              <ul className="space-y-4 mb-12 flex-1 relative z-10">
                {pack.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={() => handlePurchase(pack.credits, pack.priceId, pack.name)} 
                disabled={loadingPriceId === pack.priceId}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 uppercase tracking-[0.2em] text-[10px] relative z-10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingPriceId === pack.priceId ? <Loader2 className="w-4 h-4 animate-spin" /> : `Get ${pack.interviews} ${pack.interviews === 1 ? 'Interview' : 'Interviews'}`}
              </button>
              <button 
                onClick={() => {
                  setSelectedPack(pack);
                  setShowUpiQr(true);
                }}
                className="mt-3 w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl font-bold uppercase tracking-widest text-[9px] transition-all border border-slate-800 flex items-center justify-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                Pay via UPI QR
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modes Section */}
      <div className="max-w-4xl mx-auto py-12 px-8 rounded-[3rem] bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm text-center space-y-8">
        <div className="space-y-2">
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Secure Payment Modes</h3>
          <p className="text-sm text-slate-500">We support all major payment methods for your convenience.</p>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
          {/* UPI */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
              <span className="text-[10px] font-black text-white italic">UPI</span>
            </div>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">UPI / QR</span>
          </div>
          {/* Cards */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Cards</span>
          </div>
          {/* Net Banking */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Net Banking</span>
          </div>
          {/* Wallets */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Wallets</span>
          </div>
        </div>

        <div className="pt-4">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">Instant Activation After Payment</p>
        </div>
      </div>

      {/* Footer Contact */}
      <div className="text-center py-12 border-t border-slate-800/50">
          <p className="text-sm text-slate-500">For enterprise needs or custom packages, please <a href="mailto:sales@smartscout.online" className="font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest text-xs ml-2">contact sales</a>.</p>
      </div>

      {/* UPI QR Modal */}
      {showUpiQr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fadeIn" onClick={() => setShowUpiQr(false)}>
          <div 
            className="w-full max-w-md bg-slate-950 rounded-[2.5rem] p-8 sm:p-12 border border-indigo-500/30 shadow-2xl shadow-indigo-500/20 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Scan to Pay via UPI</h3>
                <p className="text-slate-400 text-sm">Scan the QR code below using any UPI app (GPay, PhonePe, Paytm) to pay for <span className="text-indigo-400 font-bold">{selectedPack?.name}</span>.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl inline-block shadow-inner">
                {/* Placeholder for QR Code - User will share their Tide UPI code */}
                <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300 relative group">
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center px-4">
                    [ Tide UPI QR Code Placeholder ]
                    <br/>
                    <span className="text-[8px] mt-2 block opacity-60 italic">Waiting for merchant QR code...</span>
                  </div>
                  <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Tide UPI Integration</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-slate-500">Amount to Pay</span>
                  <span className="text-white">₹{selectedPack?.price.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-slate-500">Credits to be Added</span>
                  <span className="text-indigo-400">{selectedPack?.credits} Credits</span>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <p className="text-[10px] text-slate-500 font-medium italic">
                  After payment, please share the screenshot of the transaction with <a href="mailto:support@smartscout.online" className="text-indigo-400 font-bold">support@smartscout.online</a> for instant credit activation.
                </p>
                <button 
                  onClick={() => setShowUpiQr(false)}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs border border-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;