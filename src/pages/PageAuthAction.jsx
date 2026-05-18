import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { verifyPasswordResetCode, confirmPasswordReset, applyActionCode } from "firebase/auth";

export default function PageAuthAction() {
  const [mode, setMode] = useState(null);
  const [oobCode, setOobCode] = useState(null);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const m = urlParams.get("mode");
    const code = urlParams.get("oobCode");
    setMode(m);
    setOobCode(code);

    if (m === "resetPassword" && code) {
      verifyPasswordResetCode(auth, code)
        .then((e) => {
          setEmail(e);
          setLoading(false);
        })
        .catch((err) => {
          setError("Invalid or expired reset link.");
          setLoading(false);
        });
    } else if (m === "verifyEmail" && code) {
      applyActionCode(auth, code)
        .then(() => {
          setSuccess(true);
          setLoading(false);
        })
        .catch((err) => {
          setError("Failed to verify email.");
          setLoading(false);
        });
    } else {
      setError("No action specified.");
      setLoading(false);
    }
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err) {
      setError("Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface font-sans min-h-screen flex flex-col">
      <header className="bg-surface shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-container-padding py-4 max-w-[1200px] mx-auto">
          <div className="text-[24px] font-bold text-primary font-manrope">Intelligent Cashflow Management</div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200">
              Support
            </a>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 py-12 md:py-24">
        <div className="w-full max-w-[480px]">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] backdrop-blur-xl">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center mb-6 text-on-primary-container shadow-inner">
                <span className="material-symbols-outlined text-[36px]">
                  {success ? "check_circle" : mode === "resetPassword" ? "lock_open" : "verified_user"}
                </span>
              </div>
              
              <h1 className="text-[28px] font-bold text-center text-on-surface font-manrope tracking-tight">
                {success ? "Success!" : mode === "resetPassword" ? "Set New Password" : "Email Verification"}
              </h1>
              <p className="text-[16px] text-on-surface-variant text-center mt-3 font-medium">
                {success 
                  ? "Your action was completed successfully. You can now log in." 
                  : mode === "resetPassword" 
                    ? `Create a new password for ${email}` 
                    : "Verifying your account details..."}
              </p>
            </div>

            {error && (
              <div className="bg-error-container text-on-error-container p-4 rounded-2xl mb-8 text-sm font-bold border border-error/10">
                {error}
              </div>
            )}

            {!success && mode === "resetPassword" && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs text-on-surface-variant font-extrabold uppercase tracking-[0.2em] ml-1">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-surface-container border border-outline rounded-[18px] px-5 py-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-inter text-[15px]"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs text-on-surface-variant font-extrabold uppercase tracking-[0.2em] ml-1">Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface-container border border-outline rounded-[18px] px-5 py-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-inter text-[15px]"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary text-on-primary py-5 rounded-[20px] font-extrabold text-[16px] shadow-lg shadow-primary/20 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
                >
                  Update Password
                </button>
              </form>
            )}

            {success && (
              <a 
                href="/" 
                className="w-full bg-primary text-on-primary py-5 rounded-[20px] font-extrabold text-[16px] shadow-lg shadow-primary/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center"
              >
                Return to Login
              </a>
            )}

            <div className="mt-10 pt-8 border-t border-outline-variant flex justify-center">
              <a href="/" className="flex items-center gap-2 text-primary font-extrabold hover:underline text-[15px] transition-all active:opacity-70">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Website
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-surface-container-highest border-t border-outline-variant py-8">
        <div className="w-full px-container-padding flex flex-col md:flex-row justify-between items-center max-w-[1200px] mx-auto gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <span className="text-[18px] font-extrabold text-on-surface font-manrope">Intelligent Cashflow Management</span>
            <span className="text-xs text-on-surface-variant font-medium">© 2024 Intelligent Cashflow Management. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a className="text-xs text-on-surface-variant hover:text-primary transition-colors font-bold uppercase tracking-wider" href="#">Privacy Policy</a>
            <a className="text-xs text-on-surface-variant hover:text-primary transition-colors font-bold uppercase tracking-wider" href="#">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
