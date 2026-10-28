import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CreditCard,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  ShieldAlert,
  Server,
  Users,
  Calendar,
  Layers,
  Clock,
  History,
} from 'lucide-react';
import {
  billingService,
  type BillingHistoryResponse,
  type BillingPlanId,
  type BillingPlansResponse,
  type BillingUsage,
  type SubscriptionStatus,
} from '../../api/services/billingService';
import { handleApiError } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export const BillingView: React.FC = () => {
  const { can } = useAuth();
  const canManageBilling = can('rbac.users.manage');

  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [plans, setPlans] = useState<BillingPlansResponse | null>(null);
  const [history, setHistory] = useState<BillingHistoryResponse | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 5000);
  };

  const formatErrorMessage = (err: unknown): string => {
    const axiosErr = err as { response?: { status?: number; data?: { message?: string; code?: string } } };
    if (axiosErr?.response?.status === 403 || axiosErr?.response?.data?.code === 'CUSTOMER_ONLY') {
      return (
        axiosErr.response.data?.message ||
        'Permission denied: Only customer administrators with rbac.users.manage permission can modify subscriptions or billing plans.'
      );
    }
    return handleApiError(err);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, p, h, s] = await Promise.all([
        billingService.getUsage(),
        billingService.getPlans(),
        billingService.getHistory(),
        billingService.getSubscription(),
      ]);
      setUsage(u);
      setPlans(p);
      setHistory(h);
      setSubscription(s);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Subscribe action with Razorpay Checkout integration.
   * Plan only changes once Razorpay confirms payment via webhook,
   * so we re-fetch /AdminRoutes/billing/usage to verify instead of assuming it changed.
   */
  const onSubscribe = (targetPlan: BillingPlanId) =>
    run(async () => {
      const created = await billingService.subscribe(targetPlan);
      flash('Subscription initiated — completing payment in Razorpay Checkout...');

      try {
        await billingService.openCheckout(created.checkout);
        flash('Payment authorized! Querying plan status from /AdminRoutes/billing/usage...');

        // Refresh plan status from /AdminRoutes/billing/usage instead of assuming immediate update
        const latestUsage = await billingService.getUsage();
        setUsage(latestUsage);

        if (latestUsage.plan?.id === targetPlan) {
          flash(`Payment confirmed! Account upgraded to ${latestUsage.plan.label || targetPlan}.`);
          window.dispatchEvent(
            new CustomEvent('plan-changed', { detail: { plan: targetPlan } })
          );
          return;
        }

        // Razorpay webhooks typically arrive in 1-5 seconds.
        // Poll /AdminRoutes/billing/usage at intervals (2s, 4.5s, 7.5s, 11s) until updated.
        flash(
          'Payment authorized in Razorpay! Awaiting webhook confirmation from /AdminRoutes/billing/usage...'
        );

        let attempts = 0;
        const maxAttempts = 4;
        const delays = [2000, 2500, 3000, 3500];

        const pollVerification = () => {
          if (attempts >= maxAttempts) {
            flash(
              'Payment received. Razorpay webhook is finalizing activation. Click Refresh to update anytime.'
            );
            return;
          }
          const delay = delays[attempts] || 3000;
          attempts += 1;

          window.setTimeout(async () => {
            try {
              const refreshed = await billingService.getUsage();
              setUsage(refreshed);

              if (refreshed.plan?.id === targetPlan) {
                flash(
                  `Payment confirmed! Account successfully upgraded to ${
                    refreshed.plan.label || targetPlan
                  }.`
                );
                window.dispatchEvent(
                  new CustomEvent('plan-changed', { detail: { plan: targetPlan } })
                );
                // Also refresh subscription & history audit log
                const [h, s] = await Promise.all([
                  billingService.getHistory(),
                  billingService.getSubscription(),
                ]);
                setHistory(h);
                setSubscription(s);
              } else {
                pollVerification();
              }
            } catch {
              pollVerification();
            }
          }, delay);
        };

        pollVerification();
      } catch (err: unknown) {
        if (created.shortUrl) {
          flash(`Checkout closed. You can also complete payment via: ${created.shortUrl}`);
        } else {
          throw err;
        }
      }
    });

  const onChangePlan = (targetPlan: BillingPlanId) =>
    run(async () => {
      await billingService.changePlan(targetPlan);
      flash(`Plan change to ${targetPlan.toUpperCase()} requested.`);
      const latestUsage = await billingService.getUsage();
      setUsage(latestUsage);
    });

  const onCancel = () =>
    run(async () => {
      await billingService.cancel(true);
      flash('Subscription cancellation scheduled at the end of the current period.');
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-neutral-400 gap-3">
        <Loader2 className="animate-spin text-red-500" size={20} />
        <span className="font-mono text-xs">Loading billing & subscription status…</span>
      </div>
    );
  }

  if (usage?.platform) {
    return (
      <div className="p-8 max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <CreditCard className="text-red-500" size={24} /> Billing &amp; Subscriptions
        </h1>
        <div className="p-5 rounded-2xl bg-[#0c0d10] border border-neutral-800 text-neutral-300 text-sm leading-relaxed">
          <p className="font-medium text-white mb-2">Platform Account Active</p>
          <p className="text-neutral-400 text-xs">
            Platform accounts are not bound to individual customer tenant quotas or self-service payment plans.
            To manage customer subscriptions, sign in as a Customer Administrator or use the SuperAdmin management view.
          </p>
        </div>
      </div>
    );
  }

  const plan = usage?.plan;
  const currentId = (plans?.currentPlan || plan?.id || 'basic') as BillingPlanId;

  return (
    <div className="p-6 md:p-8 space-y-8 overflow-y-auto h-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Billing &amp; Subscriptions</h1>
              <p className="text-neutral-400 text-xs mt-0.5">
                {usage?.customer?.Name || 'Customer Account'} · Self-service Razorpay subscription gateway
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-medium border border-neutral-800 bg-[#121316] text-neutral-300 hover:border-red-500/40 hover:text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={busy ? 'animate-spin text-red-500' : ''} /> Refresh
        </button>
      </div>

      {/* Role Permission Notice for Non-Admins */}
      {!canManageBilling && (
        <div className="flex items-center gap-3 p-4 bg-amber-950/20 border border-amber-900/40 rounded-xl text-amber-300 text-xs font-mono">
          <ShieldAlert size={18} className="shrink-0 text-amber-400" />
          <div>
            <div className="font-bold text-amber-200">View Only Access</div>
            <div className="text-amber-400/80 text-[11px] mt-0.5">
              Subscribing, switching plans, and cancellations require Customer Admin permissions (<code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">rbac.users.manage</code>). Action buttons are hidden.
            </div>
          </div>
        </div>
      )}

      {/* Alert Banners */}
      {error && (
        <div className="flex items-start gap-2.5 text-rose-300 bg-rose-950/30 border border-rose-900/40 rounded-xl px-4 py-3 text-xs font-mono">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 text-emerald-300 bg-emerald-950/30 border border-emerald-900/40 rounded-xl px-4 py-3 text-xs font-mono">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Usage Warnings */}
      {(usage?.warnings?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {usage!.warnings!.map((w) => (
            <div
              key={w.code}
              className="text-amber-300 bg-amber-950/20 border border-amber-900/30 rounded-xl px-4 py-2.5 text-xs font-mono flex items-center gap-2"
            >
              <AlertCircle size={14} className="text-amber-400 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Overview Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Plan Card */}
        <div className="border border-neutral-800 rounded-2xl p-5 bg-[#0c0d10] relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Current Plan</span>
            <Layers size={15} className="text-red-500" />
          </div>
          <div className="text-xl text-white font-bold tracking-tight capitalize">
            {plan?.label || currentId}{' '}
            <span className="text-xs text-neutral-400 font-mono font-normal">({plan?.status ?? 'active'})</span>
          </div>
          <div className="text-xs text-neutral-400 mt-3 font-mono flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${plan?.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {plan?.active ? 'Access Active' : 'Access Paused'}
            {plan?.paidUntil ? ` · Until ${new Date(plan.paidUntil).toLocaleDateString()}` : ''}
          </div>
        </div>

        {/* Servers Quota */}
        <div className="border border-neutral-800 rounded-2xl p-5 bg-[#0c0d10]">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Honeypot Servers</span>
            <Server size={15} className="text-neutral-500" />
          </div>
          <div className="text-xl text-white font-bold font-mono">
            {usage?.usage?.servers?.used ?? 0} <span className="text-sm text-neutral-500">/ {usage?.usage?.servers?.limit ?? '—'}</span>
          </div>
          <div className="text-xs text-neutral-400 mt-3 font-mono">
            {usage?.usage?.servers?.percent ?? 0}% quota allocated
          </div>
        </div>

        {/* Users Quota */}
        <div className="border border-neutral-800 rounded-2xl p-5 bg-[#0c0d10]">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Team Seats</span>
            <Users size={15} className="text-neutral-500" />
          </div>
          <div className="text-xl text-white font-bold font-mono">
            {usage?.usage?.users?.used ?? 0} <span className="text-sm text-neutral-500">/ {usage?.usage?.users?.limit ?? '—'}</span>
          </div>
          <div className="text-xs text-neutral-400 mt-3 font-mono">
            {usage?.usage?.users?.percent ?? 0}% quota allocated
          </div>
        </div>
      </section>

      {/* Plans Catalog */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard size={16} className="text-red-500" /> Available Subscription Plans
          </h2>
          <p className="text-neutral-400 text-xs mt-0.5">
            Select a tier to subscribe or switch billing cycles. Charges are processed through Razorpay.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(plans?.plans || []).map((p) => {
            const isCurrent = p.current || p.id === currentId;
            return (
              <div
                key={p.id}
                className={`border rounded-2xl p-6 bg-[#0c0d10] transition-all relative ${
                  isCurrent
                    ? 'border-red-500/60 shadow-lg shadow-red-950/20'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-4 right-4 text-[10px] font-mono uppercase px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md">
                    Current Active
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white capitalize">{p.label}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">${p.priceUsdPerMonth}</span>
                    <span className="text-xs font-mono text-neutral-400">/ month</span>
                  </div>
                </div>

                <div className="space-y-2 py-4 border-t border-b border-neutral-800/80 mb-5 text-xs text-neutral-300 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span>Up to {p.maxServers} Honeypot instances</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span>Up to {p.maxUsers} {p.maxUsers === 1 ? 'analyst account' : 'analyst accounts'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span>{p.retentionDays} days forensic retention</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span>Formats: {p.exportFormats.join(', ').toUpperCase()}</span>
                  </div>
                </div>

                {/* Action Buttons (Restricted by RBAC) */}
                {canManageBilling ? (
                  <div className="flex flex-wrap gap-2.5">
                    {!subscription?.razorpaySubscriptionId ||
                    subscription.planStatus === 'cancelled' ||
                    subscription.planStatus === 'trial' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onSubscribe(p.id)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-semibold shadow-md shadow-red-950/40 transition-colors disabled:opacity-50"
                      >
                        <ArrowUpRight size={14} /> {isCurrent ? 'Subscribe with Razorpay' : `Start ${p.label}`}
                      </button>
                    ) : !isCurrent ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onChangePlan(p.id)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 font-mono text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <ArrowUpRight size={14} /> Switch to {p.label}
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-500 font-mono py-2">Currently Active Tier</span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {isCurrent ? 'Current Plan' : 'Admin privilege required to switch'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Active Subscription Details */}
      {subscription?.razorpaySubscriptionId && subscription.planStatus !== 'cancelled' && (
        <section className="border border-neutral-800 rounded-2xl p-6 bg-[#0c0d10] flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={16} className="text-red-500" /> Active Subscription Gateway
            </div>
            <div className="text-xs text-neutral-400 font-mono mt-1 space-x-2">
              <span>ID: <code className="text-neutral-200">{subscription.razorpaySubscriptionId}</code></span>
              {subscription.remote?.status && (
                <span className="capitalize text-emerald-400">· {subscription.remote.status}</span>
              )}
            </div>
          </div>

          {canManageBilling && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onCancel()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-900/60 bg-rose-950/20 text-rose-300 text-xs font-mono font-medium hover:bg-rose-900/40 transition-colors disabled:opacity-50"
            >
              <Ban size={14} /> Cancel at Period End
            </button>
          )}
        </section>
      )}

      {/* History */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <History size={16} className="text-neutral-400" /> Billing &amp; Transaction History
        </h2>

        {(history?.events?.length ?? 0) === 0 ? (
          <div className="p-6 border border-neutral-800/80 rounded-2xl bg-[#0c0d10] text-center text-xs text-neutral-500 font-mono">
            No billing events recorded for this account.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800/80 border border-neutral-800 rounded-2xl overflow-hidden bg-[#0c0d10]">
            {history!.events.map((e, i) => (
              <li key={`${e.type}-${i}`} className="px-5 py-3.5 flex justify-between items-center text-xs">
                <span className="text-neutral-200 font-mono">{e.label}</span>
                <span className="text-neutral-500 font-mono">
                  {e.at ? new Date(e.at).toLocaleString() : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
