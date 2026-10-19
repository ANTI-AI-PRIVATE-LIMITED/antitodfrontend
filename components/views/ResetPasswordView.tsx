import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Lock,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { authService } from '../../api/services';
import { handleApiError } from '../../api/client';

interface ResetPasswordViewProps {
  onNavigateToLogin?: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onNavigateToLogin }) => {
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Live password validation criteria (consistent with Task 100 password policy)
  const passwordCriteria = {
    length: newPassword.length >= 12,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSymbol: /[^A-Za-z0-9]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const goToLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('No password reset token was provided in the URL. Please request a new reset link.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token. Please request a new password reset email.');
      return;
    }

    if (!isPasswordValid) {
      setError(
        'Password does not meet requirements: at least 12 characters with upper case, lower case, number and symbol.'
      );
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await authService.resetPassword(token, newPassword);
      setIsSuccess(true);
    } catch (err: any) {
      const msg = handleApiError(err);
      setError(msg || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

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
          {isSuccess ? (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 mx-auto bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white font-cyber tracking-wide">
                  Password Reset Successful
                </h2>
                <p className="text-xs text-neutral-400">
                  Your administrator password has been updated. You can now log in with your new credentials.
                </p>
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
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center text-red-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white font-cyber tracking-wide">
                  Set New Password
                </h2>
                <p className="text-xs text-neutral-400">
                  Enter your new credentials below to restore account access.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 12 characters"
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 outline-none transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 outline-none transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-[10px] text-red-400 mt-1">Passwords do not match</p>
                  )}
                </div>

                {/* Password Criteria Checklist */}
                <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg space-y-1.5 text-[11px]">
                  <div className="text-neutral-400 font-bold mb-1">Password Requirements:</div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span className={passwordCriteria.length ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                      {passwordCriteria.length ? '✓' : '○'} 12+ Characters
                    </span>
                    <span className={passwordCriteria.hasUpper ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                      {passwordCriteria.hasUpper ? '✓' : '○'} Uppercase Letter
                    </span>
                    <span className={passwordCriteria.hasLower ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                      {passwordCriteria.hasLower ? '✓' : '○'} Lowercase Letter
                    </span>
                    <span className={passwordCriteria.hasNumber ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                      {passwordCriteria.hasNumber ? '✓' : '○'} Number (0-9)
                    </span>
                    <span className={passwordCriteria.hasSymbol ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                      {passwordCriteria.hasSymbol ? '✓' : '○'} Special Symbol
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isPasswordValid || !passwordsMatch || !token}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 text-xs font-mono mt-4 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Reset Password</span>
                    </>
                  )}
                </button>
              </form>

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
