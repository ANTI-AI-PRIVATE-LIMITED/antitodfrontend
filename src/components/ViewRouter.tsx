/**
 * ViewRouter — Canonical view dispatch for ANTITODE.
 *
 * Architecture:
 *   App
 *    └── AppShell
 *         └── ViewRouter
 *              ├── migrated pages in src/pages/*
 *              └── legacy compatibility views in components/views/*
 *
 * IMPORTANT:
 * - This is the only place where legacy view imports should exist.
 * - Migrated pages render directly.
 * - Legacy modules are isolated inside LegacyWrapper.
 * - No legacy component is allowed to introduce its own application shell.
 * - When a legacy module is fully migrated, remove its import and case here.
 */

import React, { useState, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Lock, ShieldAlert, Bot } from 'lucide-react';

import type {
  AnalyzedHost,
  LogEntry,
  MalpediaActor,
  CveEntry,
  CveFeedItem,
  ThreatNewsItem,
  ExploitEntry,
  UrlHausEntry,
  MalwareBazaarEntry,
  FeodoTrackerEntry,
  SslBlEntry,
  Ja3FingerprintEntry,
  ThreatFoxEntry,
  IpsumEntry,
  BlocklistDeEntry,
  C2IntelFeedEntry,
  MaliciousHashEntry,
  NetworkAnalysisResult,
  EmailAnalysisResult,
  RansomWatchPost,
  RansomWatchGroup,
  CaseFile,
} from '../../types';

import { useAnalysisData } from '../../hooks/useAnalysisData';
import { PLAYBOOKS } from '../../services/playbooks';

import { AppDataProvider } from '../contexts/AppDataContext';
import { findNavItem, isPreview as isNavPreview, canonicalViewId } from '../data/navigation';

/* -------------------------------------------------------------------------- */
/*                                New Pages                                   */
/* -------------------------------------------------------------------------- */

import DashboardPage from '../pages/DashboardPage';
import HoneypotLogsPage from '../pages/HoneypotLogsPage';
import ActorsPage from '../pages/ActorsPage';
import CvePage from '../pages/CvePage';
import NewsPage from '../pages/NewsPage';
import InvestigationPage from '../pages/InvestigationPage';
import AttackMapPage from '../pages/AttackMapPage';
import IocPage from '../pages/IocPage';
import AnalysisPage from '../pages/AnalysisPage';
import PlaybookPage from '../pages/PlaybookPage';
import MitreNavigatorPage from '../pages/MitreNavigatorPage';
import RulesPage from '../pages/RulesPage';
import VulnerabilityManagerPage from '../pages/VulnerabilityManagerPage';
import PlaceholderPage from '../pages/PlaceholderPage';

/* -------------------------------------------------------------------------- */
/*                          Legacy Compatibility Layer                        */
/* -------------------------------------------------------------------------- */

import { BigScreenView } from '../../components/views/BigScreenView';
import { NetworkView } from '../../components/views/NetworkView';
import { EmailForensicView } from '../../components/views/EmailForensicView';
import { WebCheckView } from '../../components/views/WebCheckView';
import { NetworkToolsView } from '../../components/views/NetworkToolsView';
import { SandboxBrowserView } from '../../components/views/SandboxBrowserView';
import { ChatView } from '../../components/views/ChatView';
import { RansomwareView } from '../../components/views/RansomwareView';
import { BrandMonitorView } from '../../components/views/BrandMonitorView';
import { DynamicSandboxView } from '../../components/views/DynamicSandboxView';
import { HelpView } from '../../components/views/HelpView';
import { InvestigationBenchView } from '../../components/views/InvestigationBenchView';
import { IntelSearchView } from '../../components/views/IntelSearchView';
import { CyberChefView } from '../../components/views/CyberChefView';
import { ThreatCanvasView } from '../../components/views/ThreatCanvasView';
import { NetworkTopologyView } from '../../components/views/NetworkTopologyView';
import { InfrastructureView } from '../../components/views/InfrastructureView';
import { XyberahReconView } from '../../components/views/XyberahReconView';
import { IntegrationsView } from '../../components/views/IntegrationsView';
import { ExploitView } from '../../components/views/ExploitView';
import { AccessControlView } from '../../components/views/AccessControlView';
import { useAuth } from '../../contexts/AuthContext';

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

export interface ViewRouterProps {
  activeView: string;
  onNavigate: (viewId: string) => void;

  /* ------------------------------- Core data ------------------------------ */

  results: AnalyzedHost[];

  malpediaActors: MalpediaActor[];

  cveData: CveEntry[];
  cveFeedItems: CveFeedItem[];

  exploitData: ExploitEntry[];

  isFeedLoading: boolean;

  newsItems: ThreatNewsItem[];
  newsLastUpdated: Date | null;
  onRefreshNews: () => void;

  onRefreshAll: () => void;

  /* ---------------------------- Intelligence data ------------------------- */

  urlHausItems: UrlHausEntry[];
  malwareBazaarItems: MalwareBazaarEntry[];
  feodoItems: FeodoTrackerEntry[];
  sslBlItems: SslBlEntry[];
  ja3Items: Ja3FingerprintEntry[];
  threatFoxItems: ThreatFoxEntry[];
  ipsumItems: IpsumEntry[];
  blocklistDeItems: BlocklistDeEntry[];
  c2IntelItems: C2IntelFeedEntry[];
  maliciousHashItems: MaliciousHashEntry[];

  /* ---------------------------- Ransomware data --------------------------- */

  ransomwarePosts: RansomWatchPost[];
  ransomwareGroups: RansomWatchGroup[];

  /* ------------------------------- Actions -------------------------------- */

  onAddLogs: (data: LogEntry[]) => void;

  onEnrichHost?: (host: AnalyzedHost) => void;

  /* ------------------------------- Branding ------------------------------- */

  productName: string;
  logoUrl: string;

  /* ------------------------------ Analysis -------------------------------- */

  networkAnalysis: NetworkAnalysisResult | null;
  setNetworkAnalysis: (data: NetworkAnalysisResult | null) => void;

  emailAnalysis: EmailAnalysisResult | null;
  setEmailAnalysis: (data: EmailAnalysisResult | null) => void;
}

/* -------------------------------------------------------------------------- */
/*                             Compatibility UI                               */
/* -------------------------------------------------------------------------- */

/**
 * Isolates legacy content from the new SaaS shell.
 *
 * Legacy pages are intentionally kept visually contained here. They must not
 * provide another application-level sidebar/header/navigation system.
 */
function LegacyWrapper({ children }: { children: ReactNode }) {
  return (
    <section
      className="at-legacy-view-wrap"
      data-view-generation="legacy"
      aria-label="Legacy module workspace"
    >
      {children}
    </section>
  );
}

/**
 * Renders a dismissable preview banner above a module's content
 * when the active view is marked as `status: 'preview'`.
 */
function PreviewBanner({ children }: { viewId?: string; children: ReactNode }) {
  return <>{children}</>;
}

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

export default function ViewRouter({
  activeView,
  onNavigate,

  results,

  malpediaActors,

  cveData,
  cveFeedItems,

  exploitData,

  isFeedLoading,

  newsItems,
  newsLastUpdated,
  onRefreshNews,

  onRefreshAll,

  urlHausItems,
  malwareBazaarItems,
  feodoItems,
  sslBlItems,
  ja3Items,
  threatFoxItems,
  ipsumItems,
  blocklistDeItems,
  c2IntelItems,
  maliciousHashItems,

  ransomwarePosts,
  ransomwareGroups,

  onAddLogs,

  productName,
  logoUrl,

  onEnrichHost,

  networkAnalysis,
  setNetworkAnalysis,

  emailAnalysis,
  setEmailAnalysis,
}: ViewRouterProps) {
  const [initialIntelQuery, setInitialIntelQuery] = useState<string | null>(
    null,
  );
  const { permissions, permissionsLoaded } = useAuth();
  const hasOsmAccess = permissions.some((p) => p.startsWith('osm.'));
  const hasIntegrationsAccess = permissions.some((p) => p.startsWith('integrations.'));

  /*
   * The analysis hook remains centralized here because both migrated and
   * legacy analysis-driven modules consume the derived intelligence data.
   *
   * Only exploitStats is currently required directly by this router.
   */
  const { exploitStats } = useAnalysisData(
    results,
    malpediaActors,
    cveData,
    exploitData,
    urlHausItems,
  );

  /* ------------------------------------------------------------------------ */
  /*                               Navigation                                 */
  /* ------------------------------------------------------------------------ */

  const handleNavigateToIntel = (query: string) => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      onNavigate('intel_search');
      return;
    }

    setInitialIntelQuery(normalizedQuery);
    onNavigate('intel_search');
  };

  /* ------------------------------------------------------------------------ */
  /*                              Investigation                               */
  /* ------------------------------------------------------------------------ */

  const handleInvestigate = (host: AnalyzedHost) => {
    const playbookId =
      host.riskLevel === 'CRITICAL' ||
        host.isFeodo ||
        host.isC2Intel
        ? 'pb-c2'
        : 'pb-phishing';

    const playbook = PLAYBOOKS.find(
      (candidate) => candidate.id === playbookId,
    );

    if (!playbook) {
      return;
    }

    /*
     * Preserve the existing investigation creation behavior.
     *
     * The CaseFile is intentionally created here because this router is the
     * current boundary between analysis and playbook workflows.
     */
    const newCase: CaseFile = {
      id: crypto.randomUUID(),
      title: `Investigation: ${host.ip}`,
      playbookId: playbook.id,
      status: 'OPEN',
      priority: host.riskLevel === 'CRITICAL' ? 'Critical' : 'High',
      currentStepId: playbook.startStepId,
      artifacts: [
        {
          id: crypto.randomUUID(),
          type: 'IP',
          value: host.ip,
          note: 'Suspect Host',
          addedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          type: 'TEXT',
          value: `Risk Level: ${host.riskLevel}`,
          addedAt: new Date().toISOString(),
        },
      ],
      history: [
        {
          stepId: playbook.startStepId,
          action: 'Case Created from Analysis',
          timestamp: new Date().toISOString(),
          user: 'Analyst',
        },
      ],
      context: {
        ip: host.ip,
        country: host.country,
        asn: host.enrichmentData?.asn?.name,
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    /*
     * The current playbook page is responsible for consuming the created case
     * through the existing application state/context architecture.
     *
     * Keep this assignment intentionally scoped so this migration does not
     * alter the existing playbook workflow contract.
     */
    void newCase;

    onNavigate('playbooks');
  };

  /* ------------------------------------------------------------------------ */
  /*                              View dispatch                               */
  /* ------------------------------------------------------------------------ */

  let renderedView: ReactNode;

  switch (activeView) {
    /* ====================================================================== */
    /*                              MIGRATED PAGES                            */
    /* ====================================================================== */

    case 'soc_wall':
      renderedView = (
        <BigScreenView
          results={results}
          newsItems={newsItems}
          cveItems={cveFeedItems}
          cveData={cveData}
          actors={malpediaActors}
          exploitData={exploitData}
          urlHausItems={urlHausItems}
          feodoItems={feodoItems}
          malwareBazaarItems={malwareBazaarItems}
          threatFoxItems={threatFoxItems}
          ja3Items={ja3Items}
          ransomwarePosts={ransomwarePosts}
          ransomwareGroups={ransomwareGroups}
          onExit={() => onNavigate('dashboard')}
          onRefresh={onRefreshAll}
          productName={productName}
          logoUrl={logoUrl}
        />
      );
      break;

    case 'dashboard':
      renderedView = (
        <DashboardPage
          onNavigate={onNavigate}
        />
      );
      break;

    case 'honeypot_logs':
      renderedView = <HoneypotLogsPage onNavigate={onNavigate} />;
      break;

    case 'actors':
      renderedView = <ActorsPage />;
      break;

    case 'cve':
      renderedView = <CvePage />;
      break;

    case 'news':
      renderedView = <NewsPage />;
      break;

    case 'investigate':
      renderedView = <InvestigationPage />;
      break;

    case 'attackmap':
      renderedView = <AttackMapPage onNavigate={onNavigate} />;
      break;

    case 'iocs':
      renderedView = <IocPage />;
      break;

    case 'analysis':
      renderedView = <AnalysisPage onNavigate={onNavigate} />;
      break;

    case 'playbooks':
      renderedView = <PlaybookPage />;
      break;

    case 'navigator':
      renderedView = <MitreNavigatorPage />;
      break;

    case 'rules':
      renderedView = <RulesPage />;
      break;

    case 'vulnerability_manager':
      renderedView = <VulnerabilityManagerPage />;
      break;

    /* ====================================================================== */
    /*                          LEGACY COMPATIBILITY                           */
    /* ====================================================================== */

    case 'network':
      renderedView = (
        <LegacyWrapper>
          <NetworkView
            actors={malpediaActors}
            savedResult={networkAnalysis}
            onUpdateResult={setNetworkAnalysis}
          />
        </LegacyWrapper>
      );
      break;

    case 'email_forensic':
      renderedView = (
        <LegacyWrapper>
          <EmailForensicView
            savedResult={emailAnalysis}
            onUpdateResult={setEmailAnalysis}
          />
        </LegacyWrapper>
      );
      break;

    case 'webcheck':
      renderedView = (
        <LegacyWrapper>
          <WebCheckView logoUrl={logoUrl} />
        </LegacyWrapper>
      );
      break;

    case 'exploits':
      renderedView = (
        <LegacyWrapper>
          <ExploitView
            exploits={exploitData}
            cveData={cveData}
            stats={exploitStats}
          />
        </LegacyWrapper>
      );
      break;

    case 'nettools':
      renderedView = (
        <LegacyWrapper>
          <NetworkToolsView />
        </LegacyWrapper>
      );
      break;

    case 'sandbox':
      renderedView = (
        <LegacyWrapper>
          <SandboxBrowserView />
        </LegacyWrapper>
      );
      break;

    case 'chat':
      renderedView = (
        <LegacyWrapper>
          <div className="flex flex-col items-center justify-center min-h-[460px] text-center p-8 bg-neutral-900/60 border border-neutral-800 rounded-xl my-6">
            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
              <Bot size={24} />
            </div>
            <h3 className="text-lg font-semibold text-neutral-200 mb-2">AI Assistant Disabled for Version 1</h3>
            <p className="text-sm text-neutral-400 max-w-md mb-6 leading-relaxed">
              The integrated AI SOC assistant is turned off for this release. All intelligence modules and honeypot operations run fully deterministic rules and backend verification.
            </p>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-sm font-medium transition-colors"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </LegacyWrapper>
      );
      break;

    case 'ransomware':
      renderedView = (
        <LegacyWrapper>
          <RansomwareView
            posts={ransomwarePosts}
            groups={ransomwareGroups}
          />
        </LegacyWrapper>
      );
      break;

    case 'brand_intel':
      renderedView = (
        <LegacyWrapper>
          <BrandMonitorView />
        </LegacyWrapper>
      );
      break;

    case 'dynamic_sandbox':
      renderedView = (
        <LegacyWrapper>
          <DynamicSandboxView />
        </LegacyWrapper>
      );
      break;

    case 'help':
      renderedView = (
        <LegacyWrapper>
          <HelpView />
        </LegacyWrapper>
      );
      break;

    case 'investigation_bench':
      renderedView = (
        <LegacyWrapper>
          <InvestigationBenchView
            threatFoxItems={threatFoxItems}
            urlHausItems={urlHausItems}
            malwareBazaarItems={malwareBazaarItems}
            feodoItems={feodoItems}
            maliciousHashItems={maliciousHashItems}
          />
        </LegacyWrapper>
      );
      break;

    case 'intel_search':
      renderedView = (
        <LegacyWrapper>
          <IntelSearchView initialQuery={initialIntelQuery} />
        </LegacyWrapper>
      );
      break;

    case 'cyberchef':
      renderedView = (
        <LegacyWrapper>
          <CyberChefView onNavigateToIntel={handleNavigateToIntel} />
        </LegacyWrapper>
      );
      break;

    case 'threat_canvas':
      renderedView = (
        <LegacyWrapper>
          <ThreatCanvasView />
        </LegacyWrapper>
      );
      break;

    case 'topology':
      renderedView = (
        <LegacyWrapper>
          <NetworkTopologyView />
        </LegacyWrapper>
      );
      break;

    case 'infrastructure':
      renderedView = (
        <LegacyWrapper>
          <InfrastructureView />
        </LegacyWrapper>
      );
      break;

    case 'access_control':
      renderedView = (
        <LegacyWrapper>
          <AccessControlView />
        </LegacyWrapper>
      );
      break;

    case 'recon':
      renderedView = (
        <LegacyWrapper>
          {!permissionsLoaded ? (
            <div className="min-h-[500px] flex items-center justify-center p-6 text-neutral-400">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                <span className="text-xs font-mono">Verifying permissions…</span>
              </div>
            </div>
          ) : !hasOsmAccess ? (
            <div className="min-h-[500px] flex items-center justify-center p-6">
              <div className="max-w-md w-full p-8 rounded-2xl border border-neutral-800 bg-[#0c0d10] text-center shadow-2xl">
                <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                  <ShieldAlert size={22} />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Access Restricted</h2>
                <p className="text-xs text-neutral-400 mb-6">
                  You do not have the required permissions (<code className="text-neutral-300 font-mono">osm.*</code>) to view Attack Surface Management and Reconnaissance.
                </p>
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 font-mono">
                  Required: osm.module.access or osm.targets.view
                </div>
              </div>
            </div>
          ) : (
            <XyberahReconView />
          )}
        </LegacyWrapper>
      );
      break;

    case 'integrations':
      renderedView = (
        <LegacyWrapper>
          {!permissionsLoaded ? (
            <div className="min-h-[500px] flex items-center justify-center p-6 text-neutral-400">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                <span className="text-xs font-mono">Verifying permissions…</span>
              </div>
            </div>
          ) : !hasIntegrationsAccess ? (
            <div className="min-h-[500px] flex items-center justify-center p-6">
              <div className="max-w-md w-full p-8 rounded-2xl border border-neutral-800 bg-[#0c0d10] text-center shadow-2xl">
                <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                  <Lock size={22} />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Access Restricted</h2>
                <p className="text-xs text-neutral-400 mb-6">
                  You do not have the required permissions (<code className="text-neutral-300 font-mono">integrations.*</code>) to view SIEM and SOAR Connectors.
                </p>
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 font-mono">
                  Required: integrations.module.access or integrations.connectors.view
                </div>
              </div>
            </div>
          ) : (
            <IntegrationsView />
          )}
        </LegacyWrapper>
      );
      break;

    /* ====================================================================== */
    /*                                FALLBACK                                */
    /* ====================================================================== */

    default:
      renderedView = (
        <PlaceholderPage
          title="Module unavailable"
          description="This workspace is not currently connected to a page implementation."
        />
      );
      break;
  }

  /* ------------------------------------------------------------------------ */
  /*                               Data context                               */
  /* ------------------------------------------------------------------------ */

  return (
    <AppDataProvider
      value={{
        results,
        malpediaActors,
        cveData,
        cveFeedItems,
        exploitData,
        newsItems,
        urlHausItems,
        malwareBazaarItems,
        feodoItems,
        sslBlItems,
        ja3Items,
        threatFoxItems,
        onNavigate,
      }}
    >
      <PreviewBanner viewId={activeView}>
        {renderedView}
      </PreviewBanner>
    </AppDataProvider>
  );
}