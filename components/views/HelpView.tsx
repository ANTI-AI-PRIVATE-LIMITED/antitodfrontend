import React from 'react';
import {
    BookOpen,
    Server,
    FileJson,
    Shield,
    Network,
    Terminal,
    Activity,
    FileText,
    Zap,
    HelpCircle,
    Command,
    Search,
    Layers,
    Database,
    Share2,
    Cpu,
    AlertTriangle,
} from 'lucide-react';

const Rocket = ({ size, className }: { size: number; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
);

const HelpSection = ({ title, icon: Icon, children }: { title: string; icon: any; children?: React.ReactNode }) => (
    <div className="bg-[#111] border border-[#222] rounded-lg p-6 hover:border-[#333] transition-colors">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3 border-b border-[#222] pb-3">
            <Icon className="text-red-500" size={24}/> {title}
        </h3>
        <div className="text-[#AAA] text-sm leading-relaxed space-y-4">
            {children}
        </div>
    </div>
);

const KeyShortcut = ({ keys, desc }: { keys: string[]; desc: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-[#222] last:border-0">
        <span className="text-[#AAA]">{desc}</span>
        <div className="flex gap-1">
            {keys.map((k, i) => (
                <span key={i} className="px-2 py-1 bg-[#151515] rounded border border-[#333] font-mono text-xs text-white min-w-[24px] text-center">
                    {k}
                </span>
            ))}
        </div>
    </div>
);

export const HelpView: React.FC = () => {
    return (
        <div className="h-[calc(100vh-70px)] bg-cyber-grid flex flex-col">
            <div className="bg-[#111]/40 border-b border-[#222] p-6 flex items-center gap-4 shrink-0">
                <div className="p-3 bg-[#111] rounded-lg border border-neutral-500/30 text-red-400">
                    <HelpCircle size={28}/>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white font-cyber flex items-center gap-2">
                        SYSTEM <span className="text-red-500">GUIDE</span>
                    </h2>
                    <p className="text-sm text-[#888] font-mono mt-1">ANTITODE Platform Operations Manual & Architecture Reference</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Introduction & Architecture */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <HelpSection title="Getting Started with ANTITODE" icon={Rocket}>
                            <p>
                                <strong>ANTITODE</strong> is a cloud-connected deception operations and threat intelligence platform built around distributed honeypot sensors, real-time log ingestion pipelines, and server-brokered threat enrichment.
                            </p>
                            <div className="bg-[#111] border border-neutral-500/20 p-4 rounded text-white text-xs font-mono mt-2 space-y-1">
                                <div><strong className="text-red-400">QUICK START:</strong></div>
                                <div>1. Register a host server and provision an authenticated Log Shipper in <strong>Infrastructure</strong>.</div>
                                <div>2. Deploy honeypot sensors to stream attacker sessions, commands, and IOCs to your tenant.</div>
                                <div>3. Monitor live activity across <strong>Dashboard</strong>, <strong>Honeypot Logs</strong>, <strong>Threat Map</strong>, and <strong>SOC Wall</strong>.</div>
                            </div>
                        </HelpSection>

                        <HelpSection title="Tenant Security & Backend Proxy" icon={Shield}>
                            <p>
                                All customer telemetry, infrastructure actions, and external intelligence lookups operate under strict tenant scoping, RBAC permissions, and SSRF-hardened backend proxy controls.
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-xs text-[#AAA]">
                                <li><strong>Tenant Isolation:</strong> Each customer organization views only its registered servers, shippers, honeypot events, and SIEM connectors.</li>
                                <li><strong>Server-Side Enrichment:</strong> Third-party provider keys (IPData, threat feeds) remain exclusively on the backend; arbitrary public web/ping probes validate public IPs via SSRF guards.</li>
                                <li><strong>Write-Only Credentials:</strong> Integration webhooks, API keys, and TAXII passwords are stored write-only and never returned in plaintext.</li>
                            </ul>
                        </HelpSection>
                    </div>

                    <div className="h-px bg-[#151515] w-full"></div>

                    {/* Platform Workflows */}
                    <h3 className="text-xl font-bold text-white mb-4 pl-2 border-l-4 border-red-500">Core Platform Modules</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <HelpSection title="Infrastructure & Sensors" icon={Server}>
                            <p>
                                Provision and monitor remote sensor hosts, containerized honeypots, and authenticated ingestion agents from a single control plane.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• Server Registration (IPv4/IPv6)</li>
                                <li>• Log Shipper Token & AllowedIp Provisioning</li>
                                <li>• Container Lifecycle & Template Deployments</li>
                            </ul>
                        </HelpSection>

                        <HelpSection title="Operations & SOC Wall" icon={Activity}>
                            <p>
                                Track attacker telemetry across live dashboards, full-screen <strong>SOC Wall</strong> operational views, <strong>Threat Map</strong> projections, and <strong>Honeypot Logs</strong>.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• Normalized Attacker Profiles & Risk Scores</li>
                                <li>• Captured SSH/HTTP Command Timelines</li>
                                <li>• Multi-Tab SOC Wall (OPS / LIVE / VULN / IOC / INTEL)</li>
                            </ul>
                        </HelpSection>

                        <HelpSection title="Log Analysis" icon={FileText}>
                            <p>
                                Import standalone <strong>JSON</strong> or <strong>CSV</strong> security event batches into local browser workspaces for offline scoring and CSV/JSON reporting.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• JSON Event Arrays & CSV Normalization</li>
                                <li>• Local IndexedDB Cache Persistence</li>
                                <li>• Threat Scoring & Export</li>
                            </ul>
                        </HelpSection>

                        <HelpSection title="Threat Intelligence & IOCs" icon={Search}>
                            <p>
                                Search curated vulnerability catalogs and active indicator feeds enriched through the backend allowlisted feed proxy.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• Vulnerabilities (NVD CVEs & CISA KEV)</li>
                                <li>• Exploit DB, Intel Feed & Ransomware Monitor</li>
                                <li>• IOC Manager (CSV / STIX / PDF Export)</li>
                            </ul>
                        </HelpSection>

                        <HelpSection title="Network Tools & Web Check" icon={Network}>
                            <p>
                                Investigate external domains and public IPs using DoH DNS resolvers, RDAP/Whois lookups, Shodan InternetDB, SSRF-safe server ping probes, and HTTP header inspection.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• Super Scan (Composite Risk & Posture)</li>
                                <li>• Web Check Security Headers & Tech Stack</li>
                                <li>• DNS Firewall, SPF/DMARC & TCP Ping Probe</li>
                            </ul>
                        </HelpSection>

                        <HelpSection title="SIEM Connectors & Governance" icon={Layers}>
                            <p>
                                Automate downstream alerting and govern team privileges across multi-user tenant workspaces.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• SIEM Connectors (HTTPS Webhooks & TAXII 2.1)</li>
                                <li>• Access Control (RBAC Roles & Audit Trail)</li>
                                <li>• Billing Quotas & Plan Management</li>
                            </ul>
                        </HelpSection>
                    </div>

                    <div className="h-px bg-[#151515] w-full"></div>

                    {/* Shortcuts & Troubleshooting */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <HelpSection title="Keyboard Shortcuts" icon={Command}>
                            <div className="flex flex-col gap-2">
                                <KeyShortcut keys={['Ctrl', 'K']} desc="Open Command Palette (Cmd+K on macOS)" />
                                <KeyShortcut keys={['/']} desc="Focus Sidebar Filter / Open Command Palette" />
                                <KeyShortcut keys={['Ctrl', 'B']} desc="Toggle Sidebar Collapse (Cmd+B on macOS)" />
                                <KeyShortcut keys={['Esc']} desc="Close Modals / Dismiss Command Palette" />
                            </div>
                        </HelpSection>

                        <HelpSection title="Custom JSON Ingestion Schema" icon={FileJson}>
                            <p className="mb-2">For batch uploads in <strong>Log Analysis</strong>, structure JSON event arrays using standard honeypot fields:</p>
                            <pre className="bg-[#111] border border-[#333] p-3 rounded text-xs font-mono text-white overflow-x-auto">
{`[
  {
    "timestamp": "2026-11-25T10:00:00Z",
    "ip": "203.0.113.57",
    "country": "US",
    "commands": [
      "uname -a",
      "cat /etc/passwd"
    ]
  }
]`}
                            </pre>
                        </HelpSection>

                        <HelpSection title="Data Retention & Local Caching" icon={Cpu}>
                            <p>
                                Browser preferences, session filters, and offline Log Analysis datasets are stored locally in <code>localStorage</code> and <code>IndexedDB</code> scoped per signed-in administrator ID and cleared automatically on sign-out or session expiry.
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-[#888] text-xs mt-2">
                                <li>Public Demo Mode provides read-only sample views across supported dashboards.</li>
                                <li>Server-side probes (<strong>Web Check</strong> HTTP inspection &amp; <strong>Network Tools</strong> Ping) require an authenticated session.</li>
                            </ul>
                        </HelpSection>

                        <HelpSection title="Troubleshooting" icon={AlertTriangle}>
                            <p>If telemetry or diagnostic views fail to populate:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
                                <li>Confirm active sensor shippers show a recent heartbeat in <strong>Infrastructure</strong> and match the registered source IP.</li>
                                <li>Check <strong>Access Control</strong> permissions or <strong>Billing</strong> capacity limits if plan/RBAC notices (`402` / `403` / `429`) appear.</li>
                                <li>Use <strong>Settings &gt; Sign out</strong> to clear tenant-scoped browser caches and reset your active session cleanly.</li>
                            </ul>
                        </HelpSection>
                    </div>

                </div>
            </div>
        </div>
    );
};
