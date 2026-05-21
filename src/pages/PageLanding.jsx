import React, { useState } from "react";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function PageLanding({ login, demoVideoUrl }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResetMsg("");
    setLoading(true);

    try {
      if (isForgotPassword) {
        if (!email) throw new Error("Please enter your email address");
        await sendPasswordResetEmail(auth, email);
        setResetMsg("Password reset email sent. Check your inbox.");
      } else {
        await login(email, password);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message.includes("auth/") ? "Invalid credentials or request." : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-sans selection:bg-primary/20 min-h-screen">
      {/* Top Navigation */}
      <header className="bg-surface shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-container-padding py-4 max-w-[1200px] mx-auto">
          <div className="text-[24px] font-bold text-primary font-manrope">Intelligent Cashflow Management</div>
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200" href="#">Investors</a>
            <a className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200" href="#">About</a>
            <a className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200" href="#">Contact</a>
          </nav>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setShowLogin(true); setIsForgotPassword(false); }}
              className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200"
            >
              Login
            </button>
            <button 
              onClick={() => setShowGetStarted(true)}
              className="bg-primary text-on-primary px-6 py-2 rounded-lg font-medium active:scale-95 transition-transform"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-surface to-secondary-container/5 py-24 md:py-32">
          <div className="max-w-[1200px] mx-auto px-container-padding flex flex-col items-center text-center relative z-10">
            <div className="inline-flex items-center px-3 py-1 mb-8 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-sm font-medium gap-2">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Trusted by Global Financial Institutions
            </div>
            <h1 className="text-[40px] md:text-[56px] font-extrabold leading-tight mb-6 max-w-4xl font-manrope tracking-tight">
              Intelligent Cashflow Management for <span className="text-primary">Global Investors</span>
            </h1>
            <p className="text-[18px] md:text-[20px] text-on-surface-variant mb-10 max-w-2xl font-inter">
              Experience the future of asset management with real-time analytics, automated workflows, and institutional-grade security designed for modern finance.
            </p>
            <div className="flex flex-col md:flex-row gap-4">
              <button 
                onClick={() => setShowGetStarted(true)}
                className="bg-primary text-on-primary px-10 py-4 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all"
              >
                Get Started
              </button>
              <button 
                onClick={() => demoVideoUrl && setShowDemoVideo(true)}
                className={`bg-surface-container-lowest border border-outline-variant text-on-surface-variant px-10 py-4 rounded-lg font-bold hover:bg-surface transition-all flex items-center justify-center gap-2 ${!demoVideoUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!demoVideoUrl}
              >
                <span className="material-symbols-outlined">play_circle</span>
                Watch Demo
              </button>
            </div>
            {/* Hero Image */}
            <div className="mt-20 w-full max-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-outline-variant bg-white p-2">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuATRpLxz0n2LXk50AKXhqKUZKs-N3SAwwNksKTHyIfXG_RVM8ECoCKWNVkMjtX4S55Hr0q_oBj3qKigajkS03kP9RXZaJScHITq4lobxD2kD_956vxwXBc9avMl3lFmNn1WlxrXxVxzTw8bNPfC-aoCodbwrVTl1AavtHG894klfV9De6-l8sy2gt0C5PUOiaoTi59MPIfwMTm0oEH_mdvPLE3c3FV9uxdLNUA-7pJcAtyuLozjbk1vdy1JgSeeUhMqh-gvvViaVOk" 
                alt="Financial Dashboard Preview" 
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary opacity-5 rounded-full blur-[100px]"></div>
          <div className="absolute top-1/2 -left-24 w-64 h-64 bg-secondary-container opacity-10 rounded-full blur-[80px]"></div>
        </section>

        {/* Partners */}
        <section className="py-12 bg-surface-container-low border-y border-outline-variant/30">
          <div className="max-w-[1200px] mx-auto px-container-padding">
            <p className="text-center text-sm text-on-surface-variant uppercase tracking-[0.2em] mb-8 font-bold">Strategic Partners & Institutional Backers</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
              <span className="text-[20px] text-on-surface-variant font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">account_balance</span> FEDERAL TRUST
              </span>
              <span className="text-[20px] text-on-surface-variant font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">shield</span> SECURE CAPITAL
              </span>
              <span className="text-[20px] text-on-surface-variant font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">monitoring</span> DATA FLOW
              </span>
              <span className="text-[20px] text-on-surface-variant font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">globe</span> GLOBAL REACH
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 max-w-[1200px] mx-auto px-container-padding">
          <div className="text-center mb-16">
            <h2 className="text-[32px] font-bold mb-4 font-manrope">Sophisticated Tools for Precision Finance</h2>
            <p className="text-[16px] text-on-surface-variant max-w-xl mx-auto">Our platform integrates seamlessly with your existing infrastructure to provide a unified view of your financial health.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined">dashboard_customize</span>
                  </div>
                  <h3 className="text-[24px] font-bold mb-4 font-manrope">Real-time Cashflow Overview</h3>
                  <p className="text-[15px] text-on-surface-variant mb-6 leading-relaxed">Gain absolute clarity over your liquid assets with live tracking and predictive analytics that anticipate market shifts before they happen.</p>
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-[15px] text-on-surface font-semibold">
                      <span className="material-symbols-outlined text-primary text-[20px] fill-1">check_circle</span>
                      Instant liquidity position reporting
                    </li>
                    <li className="flex items-center gap-3 text-[15px] text-on-surface font-semibold">
                      <span className="material-symbols-outlined text-primary text-[20px] fill-1">check_circle</span>
                      AI-driven trend forecasting
                    </li>
                  </ul>
                </div>
                <div className="flex-1 bg-surface-container-high rounded-xl p-4 border border-outline-variant/50">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnV-BvDVvD0ssBcUcVlDDp9Fg3laegGKslvm89cydBB5E8A8X1aFPr4lVaC5nzP7HcJe0TClkcEQsStEHWNWvZ-yraVh0nJT9eBHl9NAlHUKHTcg1L60auaGAs7IEQUaLBwwqxcrJnItKlboP3PPNudWTqvVZDBZSs7PskqknZIql6FE7aftBLaAoTI88PTvlUFvtHsrarETfxZAvc4CpAXpUKBWUGWtWA-eBDlCHMcepMRZXGsEvVH0cIaYFnrWYlVomCrsiLqvk" alt="Analytics" className="w-full h-auto rounded-lg shadow-md" />
                </div>
              </div>
            </div>
            <div className="md:col-span-4 bg-primary-container p-8 rounded-2xl flex flex-col justify-end text-white relative overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                <span className="material-symbols-outlined text-[140px]">groups</span>
              </div>
              <div className="relative z-10">
                <h3 className="text-[24px] font-bold mb-3 font-manrope">Investor Portals</h3>
                <p className="text-on-primary-container text-sm opacity-90 leading-relaxed font-medium">Secure, white-labeled access for your clients to view performance and manage documents.</p>
                <button className="mt-6 flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors border border-white/10 uppercase tracking-wider">
                  Learn More <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
            <div className="md:col-span-4 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant group hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center text-on-secondary-container mb-6 shadow-md shadow-secondary/10">
                <span className="material-symbols-outlined">schedule_send</span>
              </div>
              <h3 className="text-[24px] font-bold mb-3 font-manrope">Automated Payments</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">Eliminate manual errors with smart payment scheduling that handles multi-currency distribution automatically.</p>
            </div>
            <div className="md:col-span-8 bg-gradient-to-r from-primary via-primary-container to-primary p-8 rounded-2xl flex flex-col md:flex-row items-center gap-8 text-white shadow-lg shadow-primary/10 transition-transform duration-300 hover:scale-[1.01]">
              <div className="flex-1">
                <span className="text-xs uppercase tracking-[0.2em] opacity-80 mb-3 block font-bold">Total Capital Managed</span>
                <div className="text-[56px] font-extrabold leading-none mb-3 font-manrope">$4.2B+</div>
                <p className="opacity-80 text-[15px] font-semibold">Across 40+ international jurisdictions and growing.</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-white/10 backdrop-blur-xl p-5 rounded-xl border border-white/20">
                  <div className="text-xs opacity-70 mb-1 font-bold uppercase">Growth</div>
                  <div className="text-[24px] font-extrabold text-secondary-fixed">+14.2%</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl p-5 rounded-xl border border-white/20">
                  <div className="text-xs opacity-70 mb-1 font-bold uppercase tracking-tight">Active Users</div>
                  <div className="text-[24px] font-extrabold text-secondary-fixed">2.5k</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="py-24 bg-inverse-surface text-inverse-on-surface overflow-hidden relative">
          <div className="max-w-[1200px] mx-auto px-container-padding flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-[40px] font-bold mb-8 font-manrope leading-tight">Uncompromising Security, <span className="text-inverse-primary">Absolute Transparency.</span></h2>
              <div className="space-y-10">
                {[
                  { icon: "lock", title: "Institutional-Grade Encryption", desc: "Your data is protected by AES-256 encryption and multi-factor biometric authentication at every touchpoint." },
                  { icon: "policy", title: "Regulatory Compliance", desc: "We maintain full compliance with SEC, GDPR, and FINRA standards to ensure your operations are globally secure." },
                  { icon: "visibility", title: "Immutable Audit Trails", desc: "Every transaction and modification is logged in a permanent, tamper-proof ledger for complete accountability." }
                ].map((f, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl border border-inverse-primary/30 flex items-center justify-center text-inverse-primary transition-colors group-hover:bg-inverse-primary group-hover:text-inverse-surface">
                      <span className="material-symbols-outlined">{f.icon}</span>
                    </div>
                    <div>
                      <h4 className="text-[20px] font-bold mb-2 font-manrope">{f.title}</h4>
                      <p className="text-surface-variant/80 text-[15px] leading-relaxed font-inter">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 border border-white/5">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNR2GFh_zbXI69LM2-tD3lyWpm_ZGwH1IVweW68GI7-FfjQp_SiOR2zHUmVflcZxoBKM8DdjDnuqmO0NvrsHK82M9XJyizEJiXk0hiWNYaXEvIRuU8MhZRkKrN0_DsQ5jcos6jtxRhzOiy8a5FbrP6DTohucGgPwNLoRsBzHvnla9IfohBkolvRRfrzv-Vvq9DPwfBvjhdlcP2_LyfF2aLvbtnbgPeT28zb2OP_Vny-mALNDnco6cqf2xfCbMYQ7zU-aeQyflEais" alt="Security" className="w-full h-auto transition-transform duration-700 hover:scale-105" />
              </div>
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary opacity-20 blur-[100px]"></div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 max-w-[1200px] mx-auto px-container-padding text-center">
          <div className="bg-surface-container-high rounded-[40px] py-20 px-8 border border-outline-variant relative overflow-hidden group">
            <div className="relative z-10">
              <h2 className="text-[40px] font-bold mb-6 font-manrope tracking-tight">Ready to transform your cashflow operations?</h2>
              <p className="text-[18px] text-on-surface-variant mb-12 max-w-2xl mx-auto font-medium">Join the leading investment firms that trust Intelligent Cashflow Management for their financial intelligence.</p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <button 
                  onClick={() => setShowGetStarted(true)}
                  className="bg-primary text-on-primary px-12 py-5 rounded-xl font-extrabold text-[16px] shadow-xl shadow-primary/20 active:scale-95 transition-all hover:bg-primary-container"
                >
                  Start Your Free Trial
                </button>
                <button className="bg-white border-2 border-primary/20 text-primary px-12 py-5 rounded-xl font-extrabold text-[16px] hover:bg-primary-fixed hover:border-primary/40 transition-all">Schedule a Consultation</button>
              </div>
            </div>
            <div className="absolute inset-0 opacity-5 pointer-events-none transition-opacity group-hover:opacity-10" style={{ backgroundImage: 'radial-gradient(#4a20dd 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-highest border-t border-outline-variant mt-20">
        <div className="w-full px-container-padding py-16 flex flex-col md:flex-row justify-between items-start max-w-[1200px] mx-auto gap-12">
          <div className="mb-8 md:mb-0 max-w-sm">
            <div className="text-[24px] font-extrabold text-on-surface mb-6 font-manrope">Intelligent Cashflow Management</div>
            <p className="text-[15px] text-on-surface-variant leading-relaxed">Empowering global investors with state-of-the-art intelligent cashflow management solutions.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-16 flex-1">
            <div className="flex flex-col gap-4">
              <span className="text-[13px] text-on-surface uppercase tracking-[0.2em] mb-4 font-extrabold">Company</span>
              <a className="text-on-surface-variant text-[15px] hover:text-primary transition-colors font-medium" href="#">About Us</a>
              <a className="text-on-surface-variant text-[15px] hover:text-primary transition-colors font-medium" href="#">Careers</a>
              <a className="text-on-surface-variant text-[15px] hover:text-primary transition-colors font-medium" href="#">Press</a>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-[13px] text-on-surface uppercase tracking-[0.2em] mb-4 font-extrabold">Support</span>
              <a className="text-on-surface-variant text-[15px] hover:text-primary transition-colors font-medium" href="#">Help Center</a>
              <a className="text-on-surface-variant text-[15px] hover:text-primary transition-colors font-medium" href="#">API Docs</a>
              <a className="text-on-surface-variant text-[15px] hover:text-primary transition-colors font-medium" href="#">Contact</a>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-[13px] text-on-surface uppercase tracking-[0.2em] mb-4 font-extrabold">Legal</span>
              <a className="text-on-surface-variant text-[15px] hover:text-primary underline font-medium" href="#">Privacy Policy</a>
              <a className="text-on-surface-variant text-[15px] hover:text-primary underline font-medium" href="#">Terms of Service</a>
            </div>
          </div>
        </div>
        <div className="w-full px-container-padding py-8 border-t border-outline-variant/30 max-w-[1200px] mx-auto text-center md:text-left">
          <p className="text-[14px] text-on-surface-variant font-medium">© 2024 Intelligent Cashflow Management. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-md transition-opacity" onClick={() => setShowLogin(false)}></div>
          <div className="relative bg-surface-container-lowest border border-outline-variant rounded-[32px] p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] w-full max-w-md animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center text-on-primary-container shadow-inner">
                <span className="material-symbols-outlined text-[36px]">{isForgotPassword ? "lock_reset" : "visibility"}</span>
              </div>
              <button onClick={() => setShowLogin(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <h2 className="text-[28px] font-bold mb-3 tracking-tight font-manrope">
              {isForgotPassword ? "Forgot password?" : "Welcome Back"}
            </h2>
            <p className="text-on-surface-variant text-[16px] mb-8 font-medium">
              {isForgotPassword ? "No worries, we'll send you reset instructions." : "Sign in to manage your cashflow."}
            </p>

            {error && <div className="bg-error-container text-on-error-container p-4 rounded-2xl mb-8 text-sm font-bold border border-error/10 animate-in slide-in-from-top-2">{error}</div>}
            {resetMsg && <div className="bg-primary-fixed text-on-primary-fixed-variant p-4 rounded-2xl mb-8 text-sm font-bold border border-primary/10 animate-in slide-in-from-top-2">{resetMsg}</div>}

            <form onSubmit={handleAuthSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs text-on-surface-variant font-extrabold uppercase tracking-[0.2em] ml-1">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-container border border-outline rounded-[18px] px-5 py-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-inter text-[15px]"
                  placeholder="name@company.com"
                  required
                />
              </div>
              
              {!isForgotPassword && (
                <div className="space-y-3">
                  <label className="text-xs text-on-surface-variant font-extrabold uppercase tracking-[0.2em] ml-1">Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-surface-container border border-outline rounded-[18px] px-5 py-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-inter text-[15px]"
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-on-primary py-5 rounded-[20px] font-extrabold text-[16px] shadow-lg shadow-primary/20 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </span>
                ) : (isForgotPassword ? "Send Reset Link" : "Sign In")}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-outline-variant text-center">
              <button 
                onClick={() => setIsForgotPassword(!isForgotPassword)}
                className="text-primary font-extrabold hover:underline text-[15px] flex items-center justify-center gap-2 mx-auto transition-all active:opacity-70"
              >
                {isForgotPassword ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Return to Login
                  </>
                ) : "Forgot your password?"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Video Modal */}
      {showDemoVideo && demoVideoUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/60 backdrop-blur-md transition-opacity" onClick={() => setShowDemoVideo(false)}></div>
          <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-outline-variant bg-black animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setShowDemoVideo(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <video
              src={demoVideoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Get Started / Contact Support Modal */}
      {showGetStarted && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-md transition-opacity" onClick={() => setShowGetStarted(false)}></div>
          <div className="relative bg-surface-container-lowest border border-outline-variant rounded-[32px] p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] w-full max-w-lg animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center text-on-primary-container shadow-inner">
                <span className="material-symbols-outlined text-[36px]">mail</span>
              </div>
              <button onClick={() => setShowGetStarted(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <h2 className="text-[28px] font-bold mb-3 tracking-tight font-manrope">
              Ready to Get Started?
            </h2>
            <p className="text-on-surface-variant text-[16px] mb-8 font-medium leading-relaxed">
              To schedule a meeting and set up your account, please send an email to our support team at <a href="mailto:support@avgcashflow.com" className="text-primary font-bold hover:underline">support@avgcashflow.com</a> with the following information:
            </p>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">check_circle</span>
                <span className="text-on-surface font-medium">1. First Name and Last Name</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">check_circle</span>
                <span className="text-on-surface font-medium">2. Company and its primary business</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">check_circle</span>
                <span className="text-on-surface font-medium">3. Address, Phone, Email, and any additional notes for contact information</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">check_circle</span>
                <span className="text-on-surface font-medium">4. Best time and best method to contact you</span>
              </li>
            </ul>

            <div className="bg-surface-container p-5 rounded-2xl border border-outline/50 mb-8">
              <p className="text-sm text-on-surface-variant font-medium">
                Our onboarding team will review your details and reach out shortly to schedule a personalized onboarding session.
              </p>
            </div>

            <button 
              onClick={() => {
                window.location.href = "mailto:support@avgcashflow.com?subject=Get Started with ICM&body=Hi Support Team,%0D%0A%0D%0A1. Name:%0D%0A2. Company & Business:%0D%0A3. Address/Phone/Notes:%0D%0A4. Best time/method to contact:%0D%0A%0D%0A";
              }}
              className="w-full bg-primary text-on-primary py-5 rounded-[20px] font-extrabold text-[16px] shadow-lg shadow-primary/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
              Email Support Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
