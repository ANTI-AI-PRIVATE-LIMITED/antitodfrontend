
import React from 'react';
import { BookOpen, Server, FileJson, Shield, Network, Terminal, Activity, FileText, Zap, HelpCircle, Command, MessageSquare, Search, Layers, Database, Share2, FileCode, Cpu, AlertTriangle } from 'lucide-react';

// Simple Rocket icon wrapper since it wasn't imported in main list
const Rocket = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
);

const HelpSection = ({ title, icon: Icon, children }: { title: string, icon: any, children?: React.ReactNode }) => (
    <div className="bg-[#111] border border-[#222] rounded-lg p-6 hover:border-[#333] transition-colors">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3 border-b border-[#222] pb-3">
            <Icon className="text-red-500" size={24}/> {title}
        </h3>
        <div className="text-[#AAA] text-sm leading-relaxed space-y-4">
            {children}
        </div>
    </div>
);

const KeyShortcut = ({ keys, desc }: { keys: string[], desc: string }) => (
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
                    <p className="text-sm text-[#888] font-mono mt-1">Technical Documentation & Usage Manual</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    
                    {/* Introduction */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <HelpSection title="Getting Started" icon={Rocket}>
                            <p>
                                <strong>Xyberah Threat Processor</strong> is a cloud threat intelligence platform. Your honeypots send attack telemetry to the Xyberah backend, which scores each attacking host and shows the results here.
                            </p>
                            <div className="bg-[#111] border border-neutral-500/20 p-4 rounded text-white text-xs font-mono mt-2">
                                <strong className="text-red-400">QUICK START:</strong> Open Infrastructure to register a server and deploy a honeypot. Events appear in Honeypot Logs within minutes, and hosts are scored in Log Analysis.
                            </div>
                        </HelpSection>

                        <HelpSection title="Where Data Comes From" icon={Database}>
                            <p>Every page reads from one of these sources:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2">
                                <li><strong>Your honeypots:</strong> events, hosts, scores and detections.</li>
                                <li><strong>Threat feeds:</strong> Spamhaus, AbuseIPDB, URLhaus, MalwareBazaar and AlienVault OTX fill the IOC Manager.</li>
                                <li><strong>Public sources:</strong> CISA KEV, NVD, Exploit DB, security news and ransomware.live.</li>
                                <li><strong>Your own verdicts:</strong> hosts scored high or critical are added to the IOC list as ANTITODE Honeypot.</li>
                            </ul>
                        </HelpSection>
                    </div>

                    <div className="h-px bg-[#151515] w-full"></div>

                    <h3 className="text-xl font-bold text-white mb-4 pl-2 border-l-4 border-red-500">How Scoring Works</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <HelpSection title="Host Threat Score" icon={Shield}>
                            <p>
                                Each attacking IP gets a score from 0 to 100, built from signals such as brute force, port scanning, malware downloads and matches in outside threat feeds. A score of 80 or more is Critical, 60 or more is High.
                            </p>
                            <div className="bg-neutral-900/10 border border-neutral-500/20 p-3 rounded text-white text-xs font-mono mt-2">
                                Our own verdicts never count as outside confirmation, so a host cannot raise its own score.
                            </div>
                        </HelpSection>

                        <HelpSection title="Data Retention" icon={Cpu}>
                            <p>
                                Retention and limits depend on your plan. See Settings, Plan and Usage for honeypot slots, users and retention days.
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-[#888] text-xs mt-2">
                                <li>Exports: CSV on every plan, JSON on Pro</li>
                                <li>Live pages refresh when you open them or press Refresh</li>
                            </ul>
                        </HelpSection>
                    </div>

                    <div className="h-px bg-[#151515] w-full"></div>

                    {/* Module Breakdown */}
                    <h3 className="text-xl font-bold text-white mb-4 pl-2 border-l-4 border-neutral-500">System Modules</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <HelpSection title="Dashboard and SOC Wall" icon={Activity}>
                            <p>
                                The Dashboard summarises hosts, telemetry and plan usage. The SOC Wall is a full screen view for a large display.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• Risk distribution</li>
                                <li>• Live telemetry</li>
                                <li>• Vulnerability and IOC tabs</li>
                            </ul>
                        </HelpSection>

                        <HelpSection title="Honeypot Logs and Log Analysis" icon={Network}>
                            <p>
                                Honeypot Logs lists raw events with filters. Log Analysis groups them by attacking host with score, location, signatures and timeline.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• Filter by risk level</li>
                                <li>• Jump to events for a host</li>
                                <li>• Open a host in Log Analysis</li>
                            </ul>
                        </HelpSection>

                        <HelpSection title="Threat Map and Ransomware" icon={Share2}>
                            <p>
                                The Threat Map plots attack sources on a globe. Ransomware Monitor tracks leak site victims and groups from ransomware.live.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• Country level activity</li>
                                <li>• Recent victims</li>
                                <li>• Evidence snapshots</li>
                            </ul>
                        </HelpSection>

                        <HelpSection title="Vulnerabilities and Exploit DB" icon={FileCode}>
                            <p>
                                CVEs from CISA KEV and recent NVD entries, with public proof of concept exploits. CVSS scores appear when NVD has published them.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• Search and advanced filters</li>
                                <li>• Known exploited flag</li>
                                <li>• CSV and JSON export</li>
                            </ul>
                        </HelpSection>

                        <HelpSection title="Intel Feed and IOC Manager" icon={Shield}>
                            <p>
                                Intel Feed collects security news. IOC Manager holds indicators from feeds and your honeypots.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• STIX 2.1 export</li>
                                <li>• Source labels per indicator</li>
                            </ul>
                        </HelpSection>

                        <HelpSection title="Tools, Infrastructure and Integrations" icon={MessageSquare}>
                            <p>
                                Network Tools and Web Check run passive lookups. Infrastructure manages servers and shippers. SIEM Connectors push telemetry to Splunk, Elastic, Sentinel, SOAR or TAXII.
                            </p>
                            <ul className="mt-2 text-xs space-y-1 text-[#888] font-mono">
                                <li>• Access Control for users</li>
                                <li>• Settings for plan and account</li>
                                <li>• Write only connector secrets</li>
                            </ul>
                        </HelpSection>
                    </div>

                    <div className="h-px bg-[#151515] w-full"></div>

                    {/* Shortcuts & Reference */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <HelpSection title="Keyboard Shortcuts" icon={Command}>
                            <div className="flex flex-col gap-2">
                                <KeyShortcut keys={['/']} desc="Focus Global Search" />
                                <KeyShortcut keys={['Esc']} desc="Close Modals / Clear Selection" />
                                <KeyShortcut keys={['Ctrl', 'Enter']} desc="Submit Rule / Send Message" />
                            </div>
                        </HelpSection>

                                                
                        <HelpSection title="Troubleshooting" icon={AlertTriangle}>
                            <p>If you encounter issues:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
                                <li>Press <strong>Refresh</strong> on a page if data looks out of date. The Vulnerabilities page can take up to 30 seconds to load the first time, then loads quickly.</li>
                                <li>If an external lookup fails, try again in a minute. Some public services limit requests.</li>
                                <li>Contact your ANTI AI account manager for plan, user or honeypot issues.</li>
                            </ul>
                        </HelpSection>
                    </div>

                </div>
            </div>
        </div>
    );
};

