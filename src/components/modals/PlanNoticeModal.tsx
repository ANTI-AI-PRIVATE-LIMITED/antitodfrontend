import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import {
  PLAN_TIERS,
  getStoredPlan,
  setStoredPlan,
  type PlanTier,
} from '../../data/planTiering';

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
  const [currentPlan, setCurrentPlan] = useState<PlanTier>(getStoredPlan);
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

    const handlePlanChanged = (e: Event) => {
      const custom = e as CustomEvent<{ plan: PlanTier }>;
      if (custom.detail?.plan) {
        setCurrentPlan(custom.detail.plan);
      }
    };

    window.addEventListener('plan-inactive', handleInactive);
    window.addEventListener('plan-limit-reached', handleLimit);
    window.addEventListener('plan-feature-unavailable', handleFeature);
    window.addEventListener('open-plan-upgrade', handleOpenModal);
    window.addEventListener('plan-changed', handlePlanChanged);

    return () => {
      window.removeEventListener('plan-inactive', handleInactive);
      window.removeEventListener('plan-limit-reached', handleLimit);
      window.removeEventListener('plan-feature-unavailable', handleFeature);
      window.removeEventListener('open-plan-upgrade', handleOpenModal);
      window.removeEventListener('plan-changed', handlePlanChanged);
    };
  }, []);

  if (!isOpen) return null;

  const plan = PLAN_TIERS[currentPlan] || PLAN_TIERS.basic;

  const handleSelectPlan = (tierKey: PlanTier) => {
    setCurrentPlan(tierKey);
    setStoredPlan(tierKey);
    window.dispatchEvent(
      new CustomEvent('plan-changed', {
        detail: { plan: tierKey, tierConfig: PLAN_TIERS[tierKey] },
      })
    );
    setIsOpen(false);
  };

  return (
    <div
      className="at-plan-modal-backdrop fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="at-plan-modal-card w-full max-w-[880px] max-h-[92vh] overflow-y-auto rounded-xl border border-white/12 bg-[#11141c] p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="at-plan-modal-header flex items-start justify-between mb-5">
          <div>
            <span className="at-plan-modal-kicker text-[10px] font-bold uppercase tracking-wider text-[#d2a06a] block">
              ANTITODE SUBSCRIPTION TIERS
            </span>
            <h2 className="at-plan-modal-title text-xl font-bold text-white mt-1">
              Choose Your Security Coverage
            </h2>
            <p className="at-plan-modal-desc text-xs text-neutral-400 mt-1">
              Scale honeypot sensor networks and unlock structured threat intelligence exports.
            </p>
          </div>
          <button
            type="button"
            className="at-plan-modal-close p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            onClick={() => setIsOpen(false)}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Optional context banner if opened via limit or inactive event */}
        {detail.message && type !== 'GENERAL' && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-[#d62828]/40 text-xs font-mono text-neutral-300 flex items-center gap-2">
            <AlertTriangle size={14} className="text-[#ef4444] shrink-0" />
            <span>{detail.message}</span>
          </div>
        )}

        <div className="at-plan-cards-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {(['basic', 'pro', 'enterprise'] as PlanTier[]).map((tierKey) => {
            const tier = PLAN_TIERS[tierKey];
            const isSelected = currentPlan === tierKey;

            return (
              <div
                key={tier.id}
                className={`at-tier-card relative flex flex-col p-4.5 rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? 'is-current border-emerald-500/40 bg-emerald-950/10'
                    : tier.popular
                    ? 'is-popular border-[#d2a06a]/45 bg-[#d2a06a]/5'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                {tier.popular && (
                  <div className="at-tier-ribbon absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full bg-[#d2a06a] text-[#0b0d13] text-[9px] font-bold uppercase tracking-wider">
                    MOST POPULAR
                  </div>
                )}

                <div className="at-tier-header mb-3">
                  <span className={`at-plan-tag at-plan-tag-${tier.id}`}>
                    {tier.name.toUpperCase()}
                  </span>
                  <div className="at-tier-price my-2 flex items-baseline gap-1">
                    {tier.priceMonthly === 0 ? (
                      <strong className="text-2xl font-bold text-white">Free</strong>
                    ) : (
                      <>
                        <strong className="text-2xl font-bold text-white">${tier.priceMonthly}</strong>
                        <span className="text-[11px] text-neutral-400">/month</span>
                      </>
                    )}
                  </div>
                  <p className="at-tier-desc text-[11px] text-neutral-400 leading-relaxed min-h-[44px]">
                    {tier.description}
                  </p>
                </div>

                <div className="at-tier-quotas py-2.5 border-t border-b border-white/[0.06] mb-3 flex flex-col gap-1.5 font-mono text-[10px]">
                  <div className="at-tier-quota-item flex items-center justify-between">
                    <span className="text-neutral-400">Honeypots:</span>
                    <strong className="text-neutral-200 font-bold">
                      {tier.maxHoneypots >= 9999 ? 'Unlimited' : tier.maxHoneypots}
                    </strong>
                  </div>
                  <div className="at-tier-quota-item flex items-center justify-between">
                    <span className="text-neutral-400">Monthly Events:</span>
                    <strong className="text-neutral-200 font-bold">
                      {tier.maxEventsPerMonth >= 1000000
                        ? 'Unlimited'
                        : tier.id === 'pro'
                        ? '1,00,000'
                        : tier.maxEventsPerMonth.toLocaleString()}
                    </strong>
                  </div>
                  <div className="at-tier-quota-item flex items-center justify-between">
                    <span className="text-neutral-400">Retention:</span>
                    <strong className="text-neutral-200 font-bold">{tier.retentionDays} Days</strong>
                  </div>
                  <div className="at-tier-quota-item flex items-center justify-between">
                    <span className="text-neutral-400">Exports:</span>
                    <strong className="text-neutral-200 font-bold">{tier.exportFormats.join(', ')}</strong>
                  </div>
                </div>

                <ul className="at-tier-features-list space-y-2 mb-4 flex-1">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[11px] text-neutral-300 leading-snug">
                      <Check size={14} className="at-check-icon text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="at-tier-footer mt-auto pt-2">
                  {isSelected ? (
                    <button
                      type="button"
                      className="at-btn at-btn-secondary at-btn-full w-full py-2.5 px-3 rounded-lg bg-neutral-800 text-neutral-400 border border-neutral-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-default opacity-90"
                      disabled
                    >
                      <Check size={13} />
                      Active Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`at-btn at-btn-full w-full py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-md ${
                        tier.popular
                          ? 'at-btn-primary bg-[#d62828] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white border border-[#d62828] shadow-[#d62828]/25 hover:shadow-[#d62828]/40'
                          : 'at-btn-secondary bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white border border-white/10'
                      }`}
                      onClick={() => handleSelectPlan(tier.id)}
                    >
                      {tier.priceMonthly > plan.priceMonthly ? 'Upgrade to ' : 'Switch to '}
                      {tier.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="at-plan-modal-footer text-center text-[11px] text-neutral-400 pt-3 border-t border-white/[0.06]">
          <small>All plans include encryption in transit and community vulnerability advisories.</small>
        </div>
      </div>
    </div>
  );
};
