import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

export interface PlanNoticeEventDetail {
  status?: number;
  code?: string;
  message?: string;
  limit?: number;
  used?: number;
  feature?: string;
  upgradeUrl?: string;
}

export const PlanNoticeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [detail, setDetail] = useState<PlanNoticeEventDetail>({});
  const [type, setType] = useState<
    'INACTIVE' | 'LIMIT_REACHED' | 'FEATURE_UNAVAILABLE' | 'GENERAL'
  >('GENERAL');

  useEffect(() => {
    const handleInactive = (e: Event) => {
      const custom = e as CustomEvent<PlanNoticeEventDetail>;
      setDetail(custom.detail || {});
      setType('INACTIVE');
      setIsOpen(true);
    };

    const handleLimit = (e: Event) => {
      const custom = e as CustomEvent<PlanNoticeEventDetail>;
      setDetail(custom.detail || {});
      setType('LIMIT_REACHED');
      setIsOpen(true);
    };

    const handleFeature = (e: Event) => {
      const custom = e as CustomEvent<PlanNoticeEventDetail>;
      setDetail(custom.detail || {});
      setType('FEATURE_UNAVAILABLE');
      setIsOpen(true);
    };

    const handleOpenModal = (e: Event) => {
      const custom = e as CustomEvent<PlanNoticeEventDetail>;
      setDetail(custom.detail || {});
      setType('GENERAL');
      setIsOpen(true);
    };

    window.addEventListener('plan-inactive', handleInactive);
    window.addEventListener('plan-limit-reached', handleLimit);
    window.addEventListener('plan-feature-unavailable', handleFeature);
    window.addEventListener('open-plan-upgrade', handleOpenModal);

    return () => {
      window.removeEventListener('plan-inactive', handleInactive);
      window.removeEventListener('plan-limit-reached', handleLimit);
      window.removeEventListener('plan-feature-unavailable', handleFeature);
      window.removeEventListener('open-plan-upgrade', handleOpenModal);
    };
  }, []);

  if (!isOpen) return null;

  const used = detail.used ?? 0;
  const limit = detail.limit ?? 0;
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-[#0e1117] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-slide-in-up"
        style={{
          boxShadow:
            type === 'INACTIVE'
              ? '0 0 50px rgba(214, 40, 40, 0.3)'
              : '0 0 50px rgba(214, 40, 40, 0.22)',
        }}
      >
        {/* Glowing top line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#d62828] via-[#ef4444] to-[#d62828]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-xl border flex-shrink-0 ${
                type === 'INACTIVE'
                  ? 'bg-[#d62828]/15 border-[#d62828]/40 text-[#ef4444] shadow-lg shadow-[#d62828]/20'
                  : 'bg-[#d62828]/15 border-[#d62828]/40 text-[#ef4444] shadow-lg shadow-[#d62828]/20'
              }`}
            >
              {type === 'INACTIVE' ? (
                <ShieldAlert className="w-7 h-7" />
              ) : (
                <Zap className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {type === 'INACTIVE'
                    ? 'Subscription Lapsed'
                    : type === 'LIMIT_REACHED'
                    ? 'Quota Exceeded'
                    : 'Tier Gated'}
                </span>
                <span className="text-xs font-mono text-neutral-500">
                  {detail.code || 'UPGRADE REQUIRED'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {type === 'INACTIVE'
                  ? 'Plan Inactive — Renewal Required'
                  : type === 'LIMIT_REACHED'
                  ? 'Resource Quota Limit Reached'
                  : 'Pro Plan Upgrade Required'}
              </h3>
            </div>
          </div>

          {/* Description */}
          <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-xl p-4 text-sm text-neutral-300 leading-relaxed font-mono">
            {detail.message ||
              (type === 'INACTIVE'
                ? 'Your subscription is currently inactive. Renew your plan to continue accessing live sensor telemetry and threat intelligence feeds.'
                : 'You have reached the maximum allowed usage on your current subscription tier.')}
          </div>

          {/* Quota Meter if limit and used provided */}
          {limit > 0 && (
            <div className="space-y-2 bg-neutral-950/60 border border-neutral-800/60 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">Current Resource Usage</span>
                <span
                  className={`font-bold ${
                    percent >= 100 ? 'text-[#ef4444]' : 'text-sky-400'
                  }`}
                >
                  {used} / {limit} ({percent}%)
                </span>
              </div>
              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percent >= 100 ? 'bg-[#d62828]' : 'bg-sky-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-500 font-mono">
                Basic tier allows 2 honeypot servers and 3 team users.
              </p>
            </div>
          )}

          {/* Pro Benefits Card */}
          <div className="space-y-3 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ef4444]" />
                Unlock with Pro Plan:
              </span>
              <span className="text-xs font-mono text-neutral-400">$155 / month</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-neutral-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>10 Honeypot Servers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>10 User Accounts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>90-Day Retention</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>JSON & STIX 2.1 Exports</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                // Open billing or mailto
                window.location.href = 'mailto:billing@xyberah.com?subject=Subscription%20Upgrade%20Request';
              }}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl font-mono text-sm font-bold text-white bg-[#d62828] hover:bg-[#b91c1c] active:bg-[#991b1b] border border-[#d62828] shadow-lg shadow-[#d62828]/25 hover:shadow-[#d62828]/45 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{type === 'INACTIVE' ? 'Renew Subscription' : 'Upgrade to Pro'}</span>
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto py-3 px-5 rounded-xl font-mono text-sm text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
