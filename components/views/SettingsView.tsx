import React, { useEffect, useState } from 'react';
import { CreditCard, LogOut, Mail, Palette, Shield, User, Users, Loader2, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../api/services/authService';
import {
  billingService,
  type BillingPlanCard,
  type BillingUsageResponse,
} from '../../api/services/billingService';
import { AccessControlView } from './AccessControlView';
import type { AppSettings, AppTheme } from '../../types';

type Tab = 'account' | 'team' | 'plan' | 'appearance';

const THEMES: { id: AppTheme; label: string }[] = [
  { id: 'CYBER', label: 'Cyberpunk' },
  { id: 'NORDIC', label: 'Nordic (Ice)' },
  { id: 'EMBER', label: 'Ember (Heat)' },
  { id: 'SENTINEL', label: 'Sentinel (Holo)' },
  { id: 'FORTRESS', label: 'Fortress (Void)' },
  { id: 'DARK', label: 'Midnight' },
  { id: 'LIGHT', label: 'Corporate' },
  { id: 'TERMINAL', label: 'Hacker' },
];

interface SettingsViewProps {
  settings?: AppSettings;
  onUpdateSettings?: (s: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const { admin, groups, can, canAny, removeToken } = useAuth();
  const [tab, setTab] = useState<Tab>('account');
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [usage, setUsage] = useState<BillingUsageResponse | null>(null);
  const [plans, setPlans] = useState<BillingPlanCard[]>([]);
  const [planLoading, setPlanLoading] = useState(false);

  const canTeam = canAny(['rbac.users.manage', 'rbac.users.view', 'rbac.groups.manage', 'rbac.groups.view']);
  void can;

  useEffect(() => {
    if (tab !== 'plan' || usage) return;
    let on = true;
    setPlanLoading(true);
    Promise.allSettled([billingService.getUsage(), billingService.getPlans()]).then(([u, p]) => {
      if (!on) return;
      if (u.status === 'fulfilled') setUsage(u.value);
      if (p.status === 'fulfilled') setPlans(p.value.plans || []);
      setPlanLoading(false);
    });
    return () => {
      on = false;
    };
  }, [tab, usage]);

  const sendReset = async () => {
    if (!admin?.AdminEmail) return;
    setResetState('sending');
    try {
      await authService.forgotPassword(admin.AdminEmail);
      setResetState('sent');
    } catch {
      setResetState('error');
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'account', label: 'Account', icon: <User size={14} />, show: true },
    { id: 'team', label: 'Team & Access', icon: <Users size={14} />, show: canTeam },
    { id: 'plan', label: 'Plan & Usage', icon: <CreditCard size={14} />, show: true },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={14} />, show: !!settings && !!onUpdateSettings },
  ];

  const usageRow = (label: string, r?: { used: number; limit: number }) =>
    r ? (
      <div className="flex justify-between py-2 border-b border-neutral-800 text-sm">
        <span className="text-neutral-400">{label}</span>
        <span className="text-white font-semibold">
          {r.used} / {r.limit >= 9999 ? 'Unlimited' : r.limit}
        </span>
      </div>
    ) : null;

  return (
    <div className="p-6 max-w-5xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-neutral-400 mb-6">Manage your account, team and plan.</p>

      <div className="flex gap-2 border-b border-neutral-800 mb-6 flex-wrap">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
                tab === t.id ? 'border-red-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
      </div>

      {tab === 'account' && (
        <div className="space-y-4 max-w-xl">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center gap-2 text-xs uppercase font-bold text-neutral-500 mb-3">
              <Mail size={13} /> Profile
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800 text-sm">
              <span className="text-neutral-400">Email</span>
              <span>{admin?.AdminEmail ?? '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800 text-sm">
              <span className="text-neutral-400">Account type</span>
              <span>{admin?.CustomerID ? 'Customer' : 'Platform'}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-neutral-400">Roles</span>
              <span>{groups?.length ? groups.map((g) => g.GroupName || g.Name).filter(Boolean).join(', ') : '-'}</span>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center gap-2 text-xs uppercase font-bold text-neutral-500 mb-3">
              <Shield size={13} /> Security
            </div>
            <p className="text-sm text-neutral-400 mb-3">
              Sign-in uses your password plus an emailed one-time code. To change your password, we email you a reset link.
            </p>
            <button
              type="button"
              disabled={resetState === 'sending' || resetState === 'sent'}
              onClick={sendReset}
              className="at-btn at-btn-secondary at-btn-sm"
            >
              {resetState === 'sending' ? <Loader2 size={13} className="animate-spin" /> : null}
              {resetState === 'sent' ? 'Reset link sent' : 'Email me a password reset link'}
            </button>
            {resetState === 'error' && <p className="text-xs text-red-400 mt-2">Could not send the email. Try again later.</p>}
          </div>

          <button type="button" onClick={removeToken} className="at-btn at-btn-secondary at-btn-sm">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      )}

      {tab === 'team' && canTeam && <AccessControlView />}

      {tab === 'plan' && (
        <div className="space-y-4 max-w-3xl">
          {planLoading && <Loader2 className="animate-spin" size={18} />}
          {usage?.platform && <p className="text-sm text-neutral-400">Platform accounts are not subject to a plan.</p>}
          {usage && !usage.platform && (
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="text-lg font-bold">{usage.plan?.label ?? 'Plan'}</div>
                <span className="text-xs uppercase px-2 py-1 rounded bg-neutral-800 text-neutral-300">
                  {usage.plan?.status ?? 'active'}
                </span>
              </div>
              {usageRow('Honeypots', usage.usage?.honeypots ?? usage.usage?.servers)}
              {usageRow('Users', usage.usage?.users)}
              {usage.retentionDays != null && (
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-neutral-400">Data retention</span>
                  <span className="text-white font-semibold">{usage.retentionDays} days</span>
                </div>
              )}
            </div>
          )}
          {plans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plans.map((p) => {
                const current = p.current || p.id === usage?.plan?.id;
                return (
                  <div
                    key={p.id}
                    className={`rounded-lg border p-4 ${current ? 'border-red-500' : 'border-neutral-800'} bg-neutral-900`}
                  >
                    <div className="flex justify-between items-center">
                      <strong>{p.label}</strong>
                      {current && <Check size={14} className="text-red-400" />}
                    </div>
                    <div className="text-2xl font-bold my-2">
                      ${p.priceUsdPerMonth}
                      <span className="text-xs text-neutral-500">/mo</span>
                    </div>
                    <ul className="text-xs text-neutral-400 space-y-1">
                      <li>{p.maxServers >= 9999 ? 'Unlimited' : p.maxServers} honeypots</li>
                      <li>{p.maxUsers >= 9999 ? 'Unlimited' : p.maxUsers} users</li>
                      <li>{p.retentionDays}-day retention</li>
                      <li>Exports: {p.exportFormats.join(', ')}</li>
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-neutral-500">To change your plan, contact your ANTI AI account manager.</p>
        </div>
      )}

      {tab === 'appearance' && settings && onUpdateSettings && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onUpdateSettings({ ...settings, theme: t.id })}
              className={`rounded-lg border px-4 py-3 text-sm text-left ${
                settings.theme === t.id ? 'border-white text-white' : 'border-neutral-800 text-neutral-400'
              } bg-neutral-900`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SettingsView;
