import { useEffect, useState, useRef } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Command,
  Crown,
  HelpCircle,
  Menu,
  Search,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { findNavGroup, findNavItem } from '../../data/navigation';
import { routeForView } from '../../data/routes';
import {
  billingService,
  type BillingUsageResponse,
} from '../../../api/services/billingService';

interface HeaderProps {
  activeView: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onNavigate?: (viewId: string) => void;
  onOpenSettings?: () => void;
}

export default function Header({
  activeView,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenSearch,
  onNavigate,
  onOpenSettings,
}: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const [usage, setUsage] = useState<BillingUsageResponse | null>(null);
  const [showPlanMenu, setShowPlanMenu] = useState(false);
  const planMenuRef = useRef<HTMLDivElement>(null);
  const item = findNavItem(activeView);
  const group = findNavGroup(activeView);
  const path = routeForView(activeView);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadUsage = async () => {
      try {
        const data = await billingService.getUsage();
        if (mounted) setUsage(data);
      } catch {
        // Fallback or unauthenticated
      }
    };
    loadUsage();

    const handleAuth = () => loadUsage();
    window.addEventListener('auth-changed', handleAuth);
    return () => {
      mounted = false;
      window.removeEventListener('auth-changed', handleAuth);
    };
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (planMenuRef.current && !planMenuRef.current.contains(e.target as Node)) {
        setShowPlanMenu(false);
      }
    };
    if (showPlanMenu) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showPlanMenu]);

  return (
    <header className="at-header at-header-shell">
      <div className="at-header-left">
        <button
          type="button"
          className={`at-header-menu ${sidebarCollapsed ? "is-visible" : ""}`}
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Open sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Open navigation' : 'Collapse navigation'}
        >
          <Menu size={17} />
        </button>

        <div className="at-header-breadcrumbs" aria-label="Current module">
          <span className="at-header-breadcrumb-muted">
            {group?.title ?? 'Workspace'}
          </span>
          <ChevronRight size={13} />
          <strong>{item?.label ?? 'Dashboard'}</strong>
          <span className="at-header-route-path">{path}</span>
        </div>
      </div>

      <button
        type="button"
        className="at-global-search at-global-search-shell"
        onClick={onOpenSearch}
        aria-label="Open global search"
      >
        <Search size={15} />
        <span>Search modules, indicators, CVEs, actors…</span>
        <span className="at-command-hint">
          <Command size={10} /> K
        </span>
      </button>

      <div className="at-header-right">
        <button
          type="button"
          className="at-header-quick-action"
          title="AI Assistant"
          aria-label="Open AI Assistant"
          onClick={() => onNavigate && onNavigate('chat')}
        >
          <Sparkles size={15} />
        </button>

        <button
          type="button"
          className="at-header-quick-action"
          title="Help"
          aria-label="Open help"
          onClick={() => onNavigate && onNavigate('help')}
        >
          <HelpCircle size={15} />
        </button>

        <button
          type="button"
          className="at-header-quick-action at-header-notification"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell size={15} />
          <span />
        </button>

        {onOpenSettings && (
          <button
            type="button"
            className="at-header-quick-action"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Settings"
          >
            <Settings size={15} />
          </button>
        )}

        {/* Billing Plan & Quota Badge */}
        {usage && (
          <div className="relative" ref={planMenuRef}>
            {usage.platform ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-950/60 text-purple-300 border border-purple-500/40">
                Staff
              </span>
            ) : usage.plan ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowPlanMenu((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border transition-all ${
                    usage.plan.id === 'pro'
                      ? 'bg-blue-950/60 text-blue-400 border-blue-500/40 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20'
                      : 'bg-amber-950/60 text-amber-400 border-amber-500/40 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20'
                  }`}
                  title={`Subscription: ${usage.plan.label}. Click to view quotas.`}
                >
                  {usage.plan.id === 'pro' ? (
                    <Crown size={12} className="text-blue-400" />
                  ) : (
                    <Zap size={12} className="text-amber-400" />
                  )}
                  <span>{usage.plan.label}</span>
                  {typeof usage.usage?.servers?.used === 'number' &&
                    typeof usage.usage?.servers?.limit === 'number' && (
                      <span className="text-[10px] text-neutral-400 font-normal">
                        ({usage.usage.servers.used}/{usage.usage.servers.limit})
                      </span>
                    )}
                  <ChevronDown size={11} className="text-neutral-400" />
                </button>

                {showPlanMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[#0e1117] border border-neutral-800 rounded-xl shadow-2xl p-4 z-50 animate-slide-in-up font-mono text-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase tracking-widest block">
                          Current Subscription
                        </span>
                        <span className="text-sm font-bold text-white flex items-center gap-1.5 pt-0.5">
                          {usage.plan.label} Plan
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                              usage.plan.active
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-950 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {usage.plan.status}
                          </span>
                        </span>
                      </div>
                      {typeof usage.plan.daysLeft === 'number' && (
                        <span className="text-[11px] text-neutral-400">
                          {usage.plan.daysLeft}d left
                        </span>
                      )}
                    </div>

                    {/* Quota meters */}
                    <div className="space-y-2">
                      {usage.usage?.servers && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-400">Servers Used</span>
                            <span className="text-white font-bold">
                              {usage.usage.servers.used} / {usage.usage.servers.limit}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                usage.usage.servers.used >= usage.usage.servers.limit
                                  ? 'bg-red-500'
                                  : 'bg-orange-500'
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (usage.usage.servers.used /
                                    usage.usage.servers.limit) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {usage.usage?.users && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-400">Team Users</span>
                            <span className="text-white font-bold">
                              {usage.usage.users.used} / {usage.usage.users.limit}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (usage.usage.users.used /
                                    usage.usage.users.limit) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Upgrade action button */}
                    {usage.plan.id !== 'pro' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowPlanMenu(false);
                          window.dispatchEvent(
                            new CustomEvent('open-plan-upgrade', {
                              detail: {
                                code: 'PRO_UPGRADE',
                                message:
                                  'Upgrade to Pro for 10 honeypot servers, 10 user seats, and 90-day retention.',
                                limit: usage.usage?.servers?.limit,
                                used: usage.usage?.servers?.used,
                              },
                            }),
                          );
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-center transition-all shadow-md shadow-orange-600/20"
                      >
                        Upgrade to Pro ($155/mo)
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        <div className="at-header-divider" />

        <div className="at-header-session" aria-label="System status">
          <span className="at-header-session-dot" />
          <span className="at-header-session-copy">
            <strong>Operational</strong>
            <small>
              {time.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
              })}
            </small>
          </span>
        </div>

        <button
          type="button"
          className="at-header-user"
          aria-label="Account menu"
          title="Account"
        >
          <span className="at-header-user-avatar">A</span>
        </button>
      </div>
    </header>
  );
}
