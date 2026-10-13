import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  Info,
  Loader2,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';
import type { AsmRiskAssessment, AsmRiskLevel, Target } from '../../api/services/openasmClient';
import { openasm } from '../../api/services/openasmClient';

interface TargetRiskModalProps {
  open: boolean;
  target: Target | null;
  assessment: AsmRiskAssessment | null;
  loading: boolean;
  onClose: () => void;
  onTargetUpdated?: (updatedTarget: Target) => void;
  onPlanUpgradeRequired?: () => void;
  canManageTargets?: boolean;
}

function riskColor(level?: AsmRiskLevel | string | null): {
  badge: string;
  gauge: string;
  glow: string;
  text: string;
} {
  switch (level?.toLowerCase()) {
    case 'critical':
      return {
        badge: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
        gauge: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.35)',
        text: 'text-rose-400',
      };
    case 'high':
      return {
        badge: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
        gauge: '#f97316',
        glow: 'rgba(249, 115, 22, 0.35)',
        text: 'text-orange-400',
      };
    case 'medium':
      return {
        badge: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
        gauge: '#eab308',
        glow: 'rgba(234, 179, 8, 0.35)',
        text: 'text-amber-400',
      };
    case 'low':
    default:
      return {
        badge: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
        gauge: '#10b981',
        glow: 'rgba(16, 185, 129, 0.35)',
        text: 'text-emerald-400',
      };
  }
}

export const TargetRiskModal: React.FC<TargetRiskModalProps> = ({
  open,
  target,
  assessment,
  loading,
  onClose,
  onTargetUpdated,
  onPlanUpgradeRequired,
  canManageTargets = true,
}) => {
  const [rescanning, setRescanning] = useState(false);
  const [rescanNotice, setRescanNotice] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  if (!open || !target) return null;

  const score = assessment?.threatScore ?? target.riskScore ?? 0;
  const level: AsmRiskLevel = assessment?.riskLevel ?? target.riskLevel ?? (score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low');
  const colors = riskColor(level);

  const handleRescan = async () => {
    if (!target.id || rescanning) return;
    setRescanning(true);
    setRescanNotice(null);

    try {
      await openasm.rescanTarget(target.id, target.workspaceId);
      setRescanNotice({
        type: 'success',
        message: 'Rescan queued successfully. Background scanner will assess risk shortly.',
      });
      if (onTargetUpdated) {
        onTargetUpdated({ ...target, status: 'pending' });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 402 || data?.code === 'PLAN_INACTIVE') {
        setRescanNotice({
          type: 'warning',
          message: 'Your plan is inactive. Please renew or upgrade your subscription to run scans.',
        });
        if (onPlanUpgradeRequired) onPlanUpgradeRequired();
      } else if (status === 429 || data?.code === 'RESCAN_TOO_SOON') {
        setRescanNotice({
          type: 'warning',
          message: data?.message || 'This target was scanned recently. Scans are limited to once per 10 minutes. Please wait before rescanning.',
        });
      } else if (status === 403) {
        setRescanNotice({
          type: 'error',
          message: 'Permission denied: osm.targets.manage is required to trigger rescans.',
        });
      } else {
        setRescanNotice({
          type: 'error',
          message: data?.message || err?.message || 'Failed to queue rescan.',
        });
      }
    } finally {
      setRescanning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-[#0c0d10] p-6 shadow-2xl text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-10 mb-6">
          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sky-400">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Risk Assessment: <span className="font-mono text-neutral-100">{target.value}</span>
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono tracking-wider font-medium bg-neutral-800 text-neutral-300 border border-neutral-700 uppercase">
                {target.type}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Customer scoped attack surface assessment via Shodan, Censys, and OSINT telemetry.
            </p>
          </div>
        </div>

        {/* Rescan Notice Banner */}
        {rescanNotice && (
          <div
            className={`mb-5 p-3.5 rounded-xl border flex items-start gap-3 text-sm ${
              rescanNotice.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                : rescanNotice.type === 'warning'
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
            }`}
          >
            {rescanNotice.type === 'success' ? (
              <CheckCircle2 size={18} className="mt-0.5 text-emerald-400 shrink-0" />
            ) : rescanNotice.type === 'warning' ? (
              <AlertTriangle size={18} className="mt-0.5 text-amber-400 shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 text-rose-400 shrink-0" />
            )}
            <div className="flex-1 text-xs sm:text-sm">{rescanNotice.message}</div>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400">
            <Loader2 size={32} className="animate-spin text-sky-400" />
            <p className="text-sm">Evaluating threat signals and risk posture...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Score & Status Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Threat Score Dial */}
              <div className="relative p-5 rounded-xl border border-neutral-800/80 bg-neutral-900/50 flex flex-col items-center justify-center text-center overflow-hidden">
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none blur-2xl"
                  style={{ background: colors.glow }}
                />
                <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  Threat Score
                </span>
                <div className="relative my-2 flex items-baseline justify-center">
                  <span
                    className="text-5xl font-black tracking-tight"
                    style={{ color: colors.gauge }}
                  >
                    {score}
                  </span>
                  <span className="text-sm text-neutral-500 font-mono ml-1">/100</span>
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${colors.badge}`}>
                  {level} Risk
                </div>
              </div>

              {/* Status & Last Scan */}
              <div className="p-4 rounded-xl border border-neutral-800/80 bg-neutral-900/50 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                    Scan Posture
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    {target.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={12} /> Assessed
                      </span>
                    ) : target.status === 'scanning' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <Loader2 size={12} className="animate-spin" /> Scanning
                      </span>
                    ) : target.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock size={12} /> Pending Queue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertCircle size={12} /> Failed
                      </span>
                    )}
                    {assessment?.reputation && (
                      <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-medium capitalize">
                        Reputation: {assessment.reputation}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/60 text-xs text-neutral-400">
                  <div className="flex items-center justify-between">
                    <span>Last Scanned:</span>
                    <span className="font-mono text-neutral-300">
                      {target.lastScanAt ? new Date(target.lastScanAt).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attack Surface Summary */}
              <div className="p-4 rounded-xl border border-neutral-800/80 bg-neutral-900/50 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                    Attack Surface
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2 rounded bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[10px] text-neutral-400 block">Exposed Services</span>
                      <span className="text-lg font-bold text-neutral-100 font-mono">
                        {assessment?.attackSurface?.exposedServices ?? assessment?.openPorts?.length ?? 0}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[10px] text-neutral-400 block">Known CVEs</span>
                      <span className={`text-lg font-bold font-mono ${
                        (assessment?.attackSurface?.vulnCount ?? 0) > 0 ? 'text-rose-400' : 'text-neutral-300'
                      }`}>
                        {assessment?.attackSurface?.vulnCount ?? assessment?.cves?.length ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-neutral-400">
                  Critical CVEs: <span className="font-semibold text-rose-400 font-mono">{assessment?.attackSurface?.criticalVulns ?? 0}</span> · High: <span className="font-semibold text-orange-400 font-mono">{assessment?.attackSurface?.highVulns ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Contributing Risk Factors */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <Flame size={15} className="text-orange-400" />
                  Contributing Risk Factors
                </h3>
                <span className="text-xs text-neutral-400 font-mono">
                  {assessment?.factors?.length ?? 0} factors detected
                </span>
              </div>

              {assessment?.factors && assessment.factors.length > 0 ? (
                <div className="divide-y divide-neutral-800/80 rounded-xl border border-neutral-800 bg-neutral-900/30 overflow-hidden">
                  {assessment.factors.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 flex items-center justify-between gap-4 hover:bg-neutral-800/20 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 p-1 rounded bg-neutral-800 text-amber-400">
                          <AlertTriangle size={14} />
                        </span>
                        <div>
                          <span className="text-sm font-medium text-neutral-200 block">
                            {f.label}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                              code: {f.code}
                            </span>
                            {f.detail && (
                              <span className="text-[11px] text-neutral-400 bg-neutral-800/60 px-1.5 py-0.2 rounded font-mono">
                                {f.detail}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          +{f.weight} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-neutral-800 text-center text-neutral-400 text-sm">
                  <ShieldCheck size={28} className="mx-auto mb-2 text-emerald-400" />
                  <p>No active risk factors identified for this target.</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Services and DNS records show clean reputation posture across threat databases.
                  </p>
                </div>
              )}
            </div>

            {/* Exposed Ports / Services Preview */}
            {assessment?.openPorts && assessment.openPorts.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Server size={14} className="text-sky-400" />
                  Observed Open Ports
                </h3>
                <div className="flex flex-wrap gap-2">
                  {assessment.openPorts.map((port) => (
                    <span
                      key={port}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-neutral-900 border border-neutral-700 text-neutral-200"
                    >
                      Port {port}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* DNS Hygiene Notes */}
            {assessment?.attackSurface?.dnsHygieneNotes && assessment.attackSurface.dnsHygieneNotes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Globe size={14} className="text-indigo-400" />
                  DNS Hygiene & OSINT Telemetry
                </h3>
                <ul className="space-y-1.5 text-xs text-neutral-300">
                  {assessment.attackSurface.dnsHygieneNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-neutral-500">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-8 pt-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            {target.lastScanAt ? (
              <span>Last scan: {new Date(target.lastScanAt).toLocaleTimeString()}</span>
            ) : (
              <span>No scan completed yet</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Close
            </button>
            {canManageTargets && (
              <button
                type="button"
                onClick={handleRescan}
                disabled={rescanning || target.status === 'scanning'}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-lg shadow-sky-600/20"
                title="Rescan target (cooldown: 1 scan per 10 minutes)"
              >
                {rescanning ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Queueing Rescan...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    <span>Queue Rescan</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
