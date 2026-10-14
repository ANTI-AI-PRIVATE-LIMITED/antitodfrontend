import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Cable,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  Filter,
  Key,
  Layers,
  Loader2,
  Lock,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  Sparkles,
  Terminal,
  Trash2,
  Webhook,
  X,
  Zap,
} from 'lucide-react';
import {
  AsmConnector,
  AsmConnectorFormat,
  AsmConnectorType,
  CreateConnectorInput,
  IntelFeedPreview,
  PushConnectorResult,
  SoarAlert,
  integrationsService,
} from '../../api/services/integrationsService';
import { useAuth } from '../../contexts/AuthContext';

const CONNECTOR_TYPE_LABELS: Record<AsmConnectorType, { label: string; desc: string; defaultHeader?: string }> = {
  webhook: {
    label: 'Generic Webhook',
    desc: 'HTTP POST webhook with customizable JSON, STIX or CEF payload.',
    defaultHeader: 'Authorization',
  },
  splunk_hec: {
    label: 'Splunk HEC',
    desc: 'Splunk HTTP Event Collector with Splunk-token authentication.',
    defaultHeader: 'Authorization',
  },
  elastic: {
    label: 'Elasticsearch',
    desc: 'Elasticsearch / OpenSearch bulk index or event pipeline.',
    defaultHeader: 'Authorization',
  },
  sentinel: {
    label: 'Microsoft Sentinel',
    desc: 'Azure Sentinel Log Analytics Data Collector REST endpoint.',
    defaultHeader: 'Authorization',
  },
  generic_siem: {
    label: 'Generic SIEM',
    desc: 'Standards-compliant SIEM event endpoint (CEF / JSON).',
    defaultHeader: 'Authorization',
  },
  soar: {
    label: 'SOAR Platform',
    desc: 'Demisto / Cortex / Splunk SOAR high-fidelity incident trigger.',
    defaultHeader: 'X-API-Key',
  },
  taxii: {
    label: 'TAXII 2.1 Server',
    desc: 'TAXII 2.1 STIX threat intelligence server collection feed.',
    defaultHeader: 'Authorization',
  },
};

const FORMAT_LABELS: Record<AsmConnectorFormat, string> = {
  json: 'JSON (Native)',
  stix: 'STIX 2.1 (OASIS)',
  cef: 'CEF (Common Event Format)',
  csv: 'CSV (Delimited)',
};

export const IntegrationsView: React.FC = () => {
  const { permissions, can, permissionsLoaded } = useAuth();

  // Permission gates
  const hasModuleAccess = permissions.some((p) => p.startsWith('integrations.'));
  const canViewConnectors = can('integrations.connectors.view') || can('integrations.module.access');
  const canManageConnectors = can('integrations.connectors.manage');
  const canPushConnectors = can('integrations.connectors.push');
  const canViewFeed = can('integrations.feed.view');
  const canViewSoar = can('integrations.soar.view');

  const [connectors, setConnectors] = useState<AsmConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnector, setEditingConnector] = useState<AsmConnector | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Push state
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{ id: string; result: PushConnectorResult } | null>(null);

  // Feed preview drawer state
  const [feedDrawerOpen, setFeedDrawerOpen] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedData, setFeedData] = useState<IntelFeedPreview | null>(null);
  const [feedFormat, setFeedFormat] = useState<AsmConnectorFormat>('json');
  const [soarAlerts, setSoarAlerts] = useState<SoarAlert[]>([]);
  const [activeFeedTab, setActiveFeedTab] = useState<'feed' | 'soar'>('feed');

  // Form fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AsmConnectorType>('webhook');
  const [formFormat, setFormFormat] = useState<AsmConnectorFormat>('json');
  const [formUrl, setFormUrl] = useState('');
  const [formAuthHeader, setFormAuthHeader] = useState('');
  const [formAuthToken, setFormAuthToken] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSecret, setFormSecret] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formIncludeAsm, setFormIncludeAsm] = useState(true);
  const [formIncludeHoneypot, setFormIncludeHoneypot] = useState(true);
  const [formMinRisk, setFormMinRisk] = useState('low');

  // Load Connectors
  const loadConnectors = useCallback(async () => {
    if (!canViewConnectors) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await integrationsService.listConnectors();
      setConnectors(res.data || []);
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 402 || data?.code === 'PLAN_INACTIVE') {
        setError('Subscription Inactive: Your plan does not include SIEM/SOAR connector integrations.');
      } else if (status === 403) {
        setError('Permission Denied: Missing integrations.connectors.view permission.');
      } else {
        setError(data?.message || err?.message || 'Failed to load connectors.');
      }
    } finally {
      setLoading(false);
    }
  }, [canViewConnectors]);

  useEffect(() => {
    if (permissionsLoaded) {
      void loadConnectors();
    }
  }, [permissionsLoaded, loadConnectors]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingConnector(null);
    setFormName('');
    setFormType('webhook');
    setFormFormat('json');
    setFormUrl('');
    setFormAuthHeader('Authorization');
    setFormAuthToken('');
    setFormUsername('');
    setFormPassword('');
    setFormSecret('');
    setFormEnabled(true);
    setFormIncludeAsm(true);
    setFormIncludeHoneypot(true);
    setFormMinRisk('low');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (c: AsmConnector) => {
    setEditingConnector(c);
    setFormName(c.name);
    setFormType(c.type);
    setFormFormat(c.format);
    setFormUrl(c.endpointUrl);
    setFormAuthHeader(c.authHeader || 'Authorization');
    // Write-only: secrets are kept empty so existing values are preserved unless typed
    setFormAuthToken('');
    setFormUsername(c.username || '');
    setFormPassword('');
    setFormSecret('');
    setFormEnabled(c.enabled);
    setFormIncludeAsm(c.includeAsm);
    setFormIncludeHoneypot(c.includeHoneypot);
    setFormMinRisk(c.minRiskLevel || 'low');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Save Connector (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    const trimmedUrl = formUrl.trim();

    if (!trimmedName) {
      setFormError('Connector name is required.');
      return;
    }

    if (!trimmedUrl) {
      setFormError('Endpoint URL is required.');
      return;
    }

    // Client-side HTTPS validation
    if (!trimmedUrl.toLowerCase().startsWith('https://')) {
      setFormError('Endpoint URL must be a public HTTPS URL (e.g. https://siem.corp.internal.example/api). Plain http:// is not allowed for security.');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateConnectorInput = {
        name: trimmedName,
        type: formType,
        format: formFormat,
        endpointUrl: trimmedUrl,
        authHeader: formAuthHeader.trim() || undefined,
        enabled: formEnabled,
        includeAsm: formIncludeAsm,
        includeHoneypot: formIncludeHoneypot,
        minRiskLevel: formMinRisk,
      };

      // Only pass secrets if provided (write-only model)
      if (formAuthToken.trim()) payload.authToken = formAuthToken.trim();
      if (formUsername.trim()) payload.username = formUsername.trim();
      if (formPassword.trim()) payload.password = formPassword.trim();
      if (formSecret.trim()) payload.secret = formSecret.trim();

      if (editingConnector) {
        await integrationsService.updateConnector(editingConnector.id, payload);
      } else {
        await integrationsService.createConnector(payload);
      }

      setIsModalOpen(false);
      await loadConnectors();
    } catch (err: any) {
      const data = err?.response?.data;
      const status = err?.response?.status;
      if (status === 402 || data?.code === 'PLAN_INACTIVE') {
        setFormError('Subscription Inactive: Your plan does not include SIEM/SOAR connector integrations.');
      } else if (status === 400) {
        // Show exact backend error message (e.g. SSRF refusal: endpointUrl must be a public https URL)
        setFormError(data?.message || 'Server rejected the endpoint URL. Ensure it is a valid, publicly reachable HTTPS destination.');
      } else if (status === 403) {
        setFormError('Permission denied: integrations.connectors.manage is required.');
      } else {
        setFormError(data?.message || err?.message || 'Failed to save connector.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Toggle Connector Enabled
  const handleToggleEnabled = async (c: AsmConnector) => {
    if (!canManageConnectors) return;
    try {
      await integrationsService.updateConnector(c.id, { enabled: !c.enabled });
      setConnectors((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, enabled: !item.enabled } : item))
      );
    } catch (err: any) {
      console.error('Failed to toggle connector status', err);
    }
  };

  // Delete Connector
  const handleDelete = async (c: AsmConnector) => {
    if (!canManageConnectors) return;
    if (!window.confirm(`Are you sure you want to delete connector "${c.name}"?`)) return;

    try {
      await integrationsService.deleteConnector(c.id);
      setConnectors((prev) => prev.filter((item) => item.id !== c.id));
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete connector.');
    }
  };

  // Test Push
  const handlePush = async (c: AsmConnector) => {
    if (!canPushConnectors) return;
    setPushingId(c.id);
    setPushResult(null);

    try {
      const res = await integrationsService.pushConnector(c.id);
      setPushResult({ id: c.id, result: res });
      // Update local connector last push stats
      setConnectors((prev) =>
        prev.map((item) =>
          item.id === c.id
            ? {
                ...item,
                lastPushAt: new Date().toISOString(),
                lastPushStatus: String(res.status),
                lastPushError: res.ok ? null : res.message,
              }
            : item
        )
      );
    } catch (err: any) {
      const data = err?.response?.data;
      setPushResult({
        id: c.id,
        result: {
          ok: false,
          status: err?.response?.status || 500,
          indicatorCount: 0,
          message: data?.message || err?.message || 'Push delivery failed.',
        },
      });
    } finally {
      setPushingId(null);
    }
  };

  // Load Feed Preview
  const loadFeedPreview = async () => {
    setFeedDrawerOpen(true);
    setFeedLoading(true);
    try {
      if (activeFeedTab === 'feed') {
        const feed = await integrationsService.previewFeed({ format: feedFormat });
        setFeedData(feed);
      } else {
        const alerts = await integrationsService.getSoarAlerts();
        setSoarAlerts(alerts.alerts || []);
      }
    } catch (err: any) {
      console.error('Failed to load feed preview', err);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    if (feedDrawerOpen) {
      void loadFeedPreview();
    }
  }, [activeFeedTab, feedFormat]);

  // Filtered connectors
  const filteredConnectors = useMemo(() => {
    return connectors.filter((c) => {
      const matchType = filterType === 'all' || c.type === filterType;
      const matchSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.endpointUrl.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [connectors, filterType, searchQuery]);

  // If user has no permissions at all for integrations
  if (permissionsLoaded && !hasModuleAccess) {
    return (
      <div className="min-h-[600px] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl border border-neutral-800 bg-[#0c0d10] text-center shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
            <Lock size={22} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-xs text-neutral-400 mb-6">
            You do not have the required permissions (<code className="text-neutral-300 font-mono">integrations.*</code>) to view or configure SIEM and SOAR connectors.
          </p>
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 font-mono">
            Required: integrations.module.access or integrations.connectors.view
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-neutral-200">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 text-indigo-400 shadow-sm">
              <Share2 size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                SIEM & SOAR Connectors
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                  Live Event Pipeline
                </span>
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                Stream scoped attack surface risks and honeypot attacker indicators into Splunk, Elastic, Sentinel, and SOAR pipelines.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canViewFeed && (
            <button
              type="button"
              onClick={() => {
                setFeedDrawerOpen(true);
                void loadFeedPreview();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 transition-colors flex items-center gap-2"
            >
              <FileCode size={14} className="text-indigo-400" />
              <span>Preview Intel Feed</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadConnectors}
            disabled={loading}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 transition-colors disabled:opacity-50"
            title="Refresh connectors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManageConnectors && (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              <Plus size={15} />
              <span>Add Connector</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 block mb-1">
            Total Connectors
          </span>
          <span className="text-2xl font-bold font-mono text-white">{connectors.length}</span>
        </div>
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 block mb-1">
            Active / Enabled
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {connectors.filter((c) => c.enabled).length}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 block mb-1">
            Supported Formats
          </span>
          <span className="text-xs font-mono text-neutral-300 mt-1 block">JSON · STIX · CEF · CSV</span>
        </div>
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 block mb-1">
            Security Guarantee
          </span>
          <span className="text-xs text-sky-400 font-mono mt-1 flex items-center gap-1.5">
            <Lock size={12} /> Write-only secrets
          </span>
        </div>
      </div>

      {/* Global Error Notice */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 rounded-xl border border-neutral-800 bg-neutral-900/30">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter by name or endpoint URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Destination Types</option>
            <option value="webhook">Generic Webhook</option>
            <option value="splunk_hec">Splunk HEC</option>
            <option value="elastic">Elasticsearch</option>
            <option value="sentinel">Microsoft Sentinel</option>
            <option value="generic_siem">Generic SIEM</option>
            <option value="soar">SOAR Platform</option>
            <option value="taxii">TAXII 2.1</option>
          </select>
        </div>

        <div className="text-[11px] text-neutral-400 font-mono px-2">
          Showing {filteredConnectors.length} of {connectors.length} connectors
        </div>
      </div>

      {/* Connectors Table / List */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
            <p className="text-xs">Loading SIEM/SOAR connectors...</p>
          </div>
        ) : filteredConnectors.length === 0 ? (
          <div className="py-20 text-center text-neutral-400">
            <Boxes size={36} className="mx-auto mb-3 text-neutral-600" />
            <p className="text-sm font-medium text-neutral-300">No connectors configured</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Configure a webhook, Splunk HEC, or Sentinel endpoint to automatically push threat telemetry to your SOC.
            </p>
            {canManageConnectors && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} />
                <span>Create Your First Connector</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="py-3 px-4">Connector</th>
                  <th className="py-3 px-3">Type & Format</th>
                  <th className="py-3 px-3">Endpoint URL</th>
                  <th className="py-3 px-3">Secrets Posture</th>
                  <th className="py-3 px-3">Telemetry Feed</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Last Push</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-sans">
                {filteredConnectors.map((c) => {
                  const typeMeta = CONNECTOR_TYPE_LABELS[c.type];
                  const isPushing = pushingId === c.id;
                  const currentPushResult = pushResult?.id === c.id ? pushResult.result : null;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-neutral-800/30 transition-colors group"
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4 font-medium">
                        <div className="text-white font-semibold text-xs flex items-center gap-2">
                          <span>{c.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500 block mt-0.5">
                          ID: {c.id.slice(0, 8)}...
                        </span>
                      </td>

                      {/* Type & Format */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                          {typeMeta?.label || c.type}
                        </span>
                        <span className="block text-[10px] font-mono text-neutral-400 mt-1 uppercase">
                          {c.format}
                        </span>
                      </td>

                      {/* Endpoint URL (Masked / HTTPS) */}
                      <td className="py-3.5 px-3 max-w-[220px]">
                        <div
                          className="font-mono text-xs text-neutral-300 truncate"
                          title={c.endpointUrl}
                        >
                          {c.endpointUrl}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                          <Check size={10} /> Public HTTPS
                        </span>
                      </td>

                      {/* Secrets Posture (Write-only verification: strictly "set" or "not set") */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium ${
                              c.hasAuthToken ? 'text-emerald-400' : 'text-neutral-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.hasAuthToken ? 'bg-emerald-400' : 'bg-neutral-600'
                              }`}
                            />
                            Token: {c.hasAuthToken ? 'Set' : 'Not set'}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium ${
                              c.hasPassword ? 'text-emerald-400' : 'text-neutral-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.hasPassword ? 'bg-emerald-400' : 'bg-neutral-600'
                              }`}
                            />
                            Password: {c.hasPassword ? 'Set' : 'Not set'}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium ${
                              c.hasSecret ? 'text-sky-400' : 'text-neutral-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.hasSecret ? 'bg-sky-400' : 'bg-neutral-600'
                              }`}
                            />
                            Secret: {c.hasSecret ? 'Set' : 'Not set'}
                          </span>
                        </div>
                      </td>

                      {/* Telemetry Scope */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {c.includeAsm && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300 font-mono">
                              ASM
                            </span>
                          )}
                          {c.includeHoneypot && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300 font-mono">
                              Honeypot
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-900 border border-neutral-700 text-amber-300 font-mono capitalize">
                            ≥ {c.minRiskLevel}
                          </span>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(c)}
                          disabled={!canManageConnectors}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                            c.enabled
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                          } ${!canManageConnectors ? 'cursor-default' : 'hover:opacity-80'}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.enabled ? 'bg-emerald-400' : 'bg-neutral-500'
                            }`}
                          />
                          {c.enabled ? 'Active' : 'Disabled'}
                        </button>
                      </td>

                      {/* Last Push */}
                      <td className="py-3.5 px-3">
                        {c.lastPushAt ? (
                          <div>
                            <div className="flex items-center gap-1 text-[11px] font-mono">
                              {c.lastPushStatus === '200' || Number(c.lastPushStatus) < 300 ? (
                                <span className="text-emerald-400 font-semibold">
                                  HTTP {c.lastPushStatus}
                                </span>
                              ) : (
                                <span
                                  className="text-rose-400 font-semibold"
                                  title={c.lastPushError || 'Push error'}
                                >
                                  HTTP {c.lastPushStatus}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-neutral-500 block">
                              {new Date(c.lastPushAt).toLocaleTimeString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-500 font-mono">Never</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canPushConnectors && (
                            <button
                              type="button"
                              onClick={() => handlePush(c)}
                              disabled={isPushing || !c.enabled}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                              title="Test push threat indicators to endpoint"
                            >
                              {isPushing ? (
                                <Loader2 size={12} className="animate-spin text-indigo-400" />
                              ) : (
                                <Send size={12} className="text-indigo-400" />
                              )}
                              <span>Test Push</span>
                            </button>
                          )}

                          {canManageConnectors && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(c)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                                title="Edit connector"
                              >
                                <Zap size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(c)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Delete connector"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Inline Push Result Feedback */}
                        {currentPushResult && (
                          <div
                            className={`mt-2 p-2 rounded-lg text-[10px] text-left border ${
                              currentPushResult.ok
                                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                            }`}
                          >
                            <div className="font-semibold">
                              {currentPushResult.ok ? '✓ Push Succeeded' : '✕ Push Failed'}: HTTP {currentPushResult.status}
                            </div>
                            <div>{currentPushResult.message}</div>
                            {currentPushResult.ok && (
                              <div className="text-neutral-400 mt-0.5">
                                Sent {currentPushResult.indicatorCount} threat indicators.
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Connector Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-[#0c0d10] p-6 shadow-2xl text-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                <Cable size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {editingConnector ? 'Edit SIEM Connector' : 'Configure New Connector'}
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Route telemetry to remote security pipelines using encrypted write-only credentials.
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-5 p-3.5 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="mt-0.5 text-rose-400 shrink-0" />
                <div className="flex-1">{formError}</div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Connector Name & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1.5">
                    Connector Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Primary Splunk HEC"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1.5">
                    Destination Type *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      const t = e.target.value as AsmConnectorType;
                      setFormType(t);
                      if (CONNECTOR_TYPE_LABELS[t]?.defaultHeader) {
                        setFormAuthHeader(CONNECTOR_TYPE_LABELS[t].defaultHeader!);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="webhook">Generic Webhook</option>
                    <option value="splunk_hec">Splunk HEC (HTTP Event Collector)</option>
                    <option value="elastic">Elasticsearch / OpenSearch</option>
                    <option value="sentinel">Microsoft Sentinel</option>
                    <option value="generic_siem">Generic SIEM</option>
                    <option value="soar">SOAR Platform (Demisto / Cortex)</option>
                    <option value="taxii">TAXII 2.1 Server</option>
                  </select>
                </div>
              </div>

              {/* Endpoint URL (Public HTTPS) */}
              <div>
                <label className="block text-neutral-400 font-medium mb-1.5">
                  Endpoint URL (Public HTTPS) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://hec.splunk.yourdomain.com:8088/services/collector/raw"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Security notice: Internal RFC 1918 IPs, local addresses, and plain HTTP endpoints are blocked by the outbound proxy.
                </p>
              </div>

              {/* Format & Min Risk Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1.5">
                    Payload Format
                  </label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value as AsmConnectorFormat)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="json">{FORMAT_LABELS.json}</option>
                    <option value="stix">{FORMAT_LABELS.stix}</option>
                    <option value="cef">{FORMAT_LABELS.cef}</option>
                    <option value="csv">{FORMAT_LABELS.csv}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1.5">
                    Minimum Risk Level
                  </label>
                  <select
                    value={formMinRisk}
                    onChange={(e) => setFormMinRisk(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low (Include all evaluated risks)</option>
                    <option value="medium">Medium (Threat score ≥ 40)</option>
                    <option value="high">High (Threat score ≥ 60)</option>
                    <option value="critical">Critical Only (Threat score ≥ 80)</option>
                  </select>
                </div>
              </div>

              {/* Authentication Credentials (Write-only) */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Key size={14} className="text-indigo-400" />
                    Authentication & Write-Only Secrets
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Encrypted via AES-256-GCM
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 font-medium mb-1">
                      Header Name
                    </label>
                    <input
                      type="text"
                      placeholder="Authorization"
                      value={formAuthHeader}
                      onChange={(e) => setFormAuthHeader(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 font-medium mb-1 flex items-center justify-between">
                      <span>Auth Token / API Key</span>
                      {editingConnector && (
                        <span
                          className={`text-[10px] font-mono font-medium ${
                            editingConnector.hasAuthToken ? 'text-emerald-400' : 'text-neutral-500'
                          }`}
                        >
                          {editingConnector.hasAuthToken ? '● Token: Set' : '○ Token: Not set'}
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      placeholder={
                        editingConnector?.hasAuthToken
                          ? '•••••••• (Token is set — leave blank to keep unchanged)'
                          : 'Enter token or API key (Not set)'
                      }
                      value={formAuthToken}
                      onChange={(e) => setFormAuthToken(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Basic Auth (Username / Password) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-800/60">
                  <div>
                    <label className="block text-neutral-400 font-medium mb-1">
                      Username (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Optional Basic Auth user"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 font-medium mb-1 flex items-center justify-between">
                      <span>Password (Optional)</span>
                      {editingConnector && (
                        <span
                          className={`text-[10px] font-mono font-medium ${
                            editingConnector.hasPassword ? 'text-emerald-400' : 'text-neutral-500'
                          }`}
                        >
                          {editingConnector.hasPassword ? '● Password: Set' : '○ Password: Not set'}
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      placeholder={
                        editingConnector?.hasPassword
                          ? '•••••••• (Password is set — leave blank to keep unchanged)'
                          : 'Optional Basic Auth password (Not set)'
                      }
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* HMAC Signing Secret */}
                <div className="pt-2 border-t border-neutral-800/60">
                  <label className="block text-neutral-400 font-medium mb-1 flex items-center justify-between">
                    <span>HMAC Signing Secret (X-Antitode-Signature)</span>
                    {editingConnector && (
                      <span
                        className={`text-[10px] font-mono font-medium ${
                          editingConnector.hasSecret ? 'text-sky-400' : 'text-neutral-500'
                        }`}
                      >
                        {editingConnector.hasSecret ? '● Secret: Set' : '○ Secret: Not set'}
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    placeholder={
                      editingConnector?.hasSecret
                        ? '•••••••• (Secret is set — leave blank to keep unchanged)'
                        : 'Optional SHA-256 HMAC payload verification secret (Not set)'
                    }
                    value={formSecret}
                    onChange={(e) => setFormSecret(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Feed Content Checkboxes & Enabled Switch */}
              <div className="space-y-2 pt-2">
                <span className="block text-neutral-400 font-medium">Telemetry Sources:</span>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIncludeAsm}
                      onChange={(e) => setFormIncludeAsm(e.target.checked)}
                      className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
                    />
                    <span>Include ASM Risk Findings</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIncludeHoneypot}
                      onChange={(e) => setFormIncludeHoneypot(e.target.checked)}
                      className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
                    />
                    <span>Include Honeypot Attacker IoCs</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                    className="rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0"
                  />
                  <span className="font-medium text-neutral-200">Enable this connector immediately</span>
                </label>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-colors"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    <span>{editingConnector ? 'Update Connector' : 'Create Connector'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feed & SOAR Alerts Preview Drawer / Modal */}
      {feedDrawerOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setFeedDrawerOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-[#0c0d10] p-6 shadow-2xl text-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setFeedDrawerOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                <FileCode size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Live Threat Telemetry Preview
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Inspect indicators delivered to remote connectors or pulled directly via GET /IntegrationsRoutes/feed
                </p>
              </div>
            </div>

            {/* Tabs & Format Selector */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFeedTab('feed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeFeedTab === 'feed'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  Curated Feed (/feed)
                </button>
                {canViewSoar && (
                  <button
                    type="button"
                    onClick={() => setActiveFeedTab('soar')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeFeedTab === 'soar'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    SOAR Incident Alerts (/soar/alerts)
                  </button>
                )}
              </div>

              {activeFeedTab === 'feed' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-medium">Format:</span>
                  <select
                    value={feedFormat}
                    onChange={(e) => setFeedFormat(e.target.value as AsmConnectorFormat)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white"
                  >
                    <option value="json">JSON</option>
                    <option value="stix">STIX 2.1</option>
                    <option value="cef">CEF</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
              )}
            </div>

            {feedLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-neutral-400">
                <Loader2 size={24} className="animate-spin text-indigo-400" />
                <p className="text-xs">Generating feed payload...</p>
              </div>
            ) : activeFeedTab === 'feed' ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>
                    Total Indicators: <strong className="text-white font-mono">{feedData?.indicatorCount ?? 0}</strong>
                  </span>
                  <span className="font-mono text-[11px] text-neutral-500">
                    Content-Type: {feedData?.contentType}
                  </span>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 max-h-96 overflow-y-auto font-mono text-xs text-neutral-300">
                  {feedData?.indicators && feedData.indicators.length > 0 ? (
                    <div className="space-y-2">
                      {feedData.indicators.map((ind, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg border border-neutral-800/60 bg-neutral-900/40 flex items-center justify-between gap-3 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded uppercase font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              {ind.type}
                            </span>
                            <span className="text-white font-bold">{ind.value}</span>
                            <span className="text-neutral-500 font-sans">({ind.source})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 capitalize">
                              {ind.riskLevel} · {ind.threatScore} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-neutral-500">
                      No indicators match current customer scope and filters.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>
                    High-Risk SOAR Alerts: <strong className="text-white font-mono">{soarAlerts.length}</strong>
                  </span>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 max-h-96 overflow-y-auto space-y-2">
                  {soarAlerts.length > 0 ? (
                    soarAlerts.map((a, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg border border-neutral-800/60 bg-neutral-900/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{a.title || a.indicator}</span>
                            <span className="text-[10px] font-mono text-neutral-500">
                              [{a.indicatorType}]
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">
                            Source: {a.source} · Indicator: <code className="text-neutral-200">{a.indicator}</code>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20 uppercase">
                            {a.severity} ({a.score})
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-neutral-500 text-xs">
                      No critical SOAR alerts currently active in scope.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setFeedDrawerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
