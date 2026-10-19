import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Mail,
  Loader2,
  ArrowRight,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { authService } from '../../api/services';
import { handleApiError } from '../../api/client';

interface VerifyEmailViewProps {
  onNavigateToLogin?: () => void;
}

export const VerifyEmailView: React.FC<VerifyEmailViewProps> = ({ onNavigateToLogin }) => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'no-token'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const goToLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const emailParam = params.get('email') || params.get('AdminEmail');
    if (emailParam) {
      setResendEmail(emailParam);
    }

    if (!token) {
      setStatus('no-token');
      return;
    }

    let isMounted = true;

    const performVerification = async () => {
      try {
        await authService.verifyEmail(token);
        if (isMounted) {
          setStatus('success');
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          const msg = handleApiError(err);
          setErrorMessage(msg || 'Verification token is invalid or has expired.');
        }
      }
    };

    performVerification();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resendEmail.trim() || resendCooldown > 0) return;

    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await authService.resendVerification(resendEmail.trim());
      setResendStatus(res.message || 'New verification email dispatched. Please check your inbox.');
      setResendCooldown(60);
    } catch (err: any) {
      setResendStatus(handleApiError(err));
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#0a0a0a] flex flex-col items-center py-6 sm:py-10 px-4 custom-scrollbar">
      {/* Cyber grid background */}
      <div className="cyber-grid-bg fixed inset-0 pointer-events-none"></div>

      {/* Scanlines overlay */}
      <div className="scanlines pointer-events-none fixed inset-0 z-50 opacity-5 mix-blend-overlay"></div>

      {/* Ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neutral-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-lg my-auto py-2">
        {/* Brand header */}
        <div className="text-center mb-5 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-2.5 bg-red-600 rounded-2xl shadow-lg shadow-red-500/25">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-cyber font-bold text-white tracking-wider mb-1">ANTITODE</h1>
          <p className="text-neutral-400 font-mono text-xs">
            Cyber Threat &amp; Honeypot Operations Platform
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#111]/90 backdrop-blur-md border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl animate-slide-in-up font-mono">
          {status === 'verifying' && (
            <div className="text-center space-y-6 py-6 animate-fade-in">
              <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white font-cyber tracking-wide">
                  Verifying Your Email
                </h2>
                <p className="text-xs text-neutral-400">
                  Contacting authentication gateway to activate your account...
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 mx-auto bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white font-cyber tracking-wide">
                  Email Verified Successfully!
                </h2>
                <p className="text-xs text-neutral-400">
                  Your email address has been verified and your account is now active.
                </p>
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-emerald-300 text-xs mt-3">
                  You can now log in with your credentials to access your honeypot deployments.
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={goToLogin}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 text-xs font-mono"
                >
                  <span>Go to Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {(status === 'error' || status === 'no-token') && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400">
                  {status === 'no-token' ? <Mail className="w-8 h-8 text-amber-400" /> : <XCircle className="w-8 h-8 text-red-400" />}
                </div>

                <h2 className="text-xl font-bold text-white font-cyber tracking-wide">
                  {status === 'no-token' ? 'Missing Verification Token' : 'Verification Link Expired'}
                </h2>

                <p className="text-xs text-neutral-400">
                  {errorMessage ||
                    (status === 'no-token'
                      ? 'No token was provided in the confirmation link. Please request a new verification email.'
                      : 'This confirmation link has expired or has already been used.')}
                </p>
              </div>

              {/* Resend Section */}
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Resend Verification Email</span>
                </div>

                <form onSubmit={handleResend} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="admin@company.com"
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-3.5 py-2 text-xs text-white placeholder-neutral-600 outline-none transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResending || resendCooldown > 0 || !resendEmail.trim()}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg border border-neutral-700 text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                        <span>Sending Link...</span>
                      </>
                    ) : resendCooldown > 0 ? (
                      <span>Wait {resendCooldown}s to Resend</span>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send New Verification Link</span>
                      </>
                    )}
                  </button>
                </form>

                {resendStatus && (
                  <div
                    className={`p-3 rounded-lg text-xs border ${
                      resendStatus.toLowerCase().includes('dispatched') ||
                      resendStatus.toLowerCase().includes('sent')
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/40 border-red-500/40 text-red-300'
                    }`}
                  >
                    {resendStatus}
                  </div>
                )}
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={goToLogin}
                  className="text-xs text-neutral-400 hover:text-white font-bold hover:underline"
                >
                  &larr; Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
