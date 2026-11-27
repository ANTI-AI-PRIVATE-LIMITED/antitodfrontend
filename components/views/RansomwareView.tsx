
import React, { useState, useMemo } from 'react';
import { RansomWatchPost, RansomWatchGroup } from '../../types';
import { Skull, AlertTriangle, Globe, Lock, ExternalLink, RefreshCw, Search, Target, Users, Calendar, Activity, Zap, ImageIcon, Eye, ShieldAlert, Copy, Check, X } from 'lucide-react';
import { resolveValidFlagIsoCode } from '../../src/utils/geoCountries';
import { inspectRansomwareTargetUrl, type ExternalTargetInspection } from '../../src/utils/externalLinks';

interface RansomwareViewProps {
    posts: RansomWatchPost[];
    groups: RansomWatchGroup[];
}

export const RansomwareView: React.FC<RansomwareViewProps> = ({ posts, groups }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [victimSearch, setVictimSearch] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [failedFlags, setFailedFlags] = useState<Record<string, true>>({});
    const [pendingExternalLink, setPendingExternalLink] = useState<ExternalTargetInspection | null>(null);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const lastUpdated = useMemo(() => new Date(), [posts]);

    const handleCopyTarget = async (urlText: string) => {
        try {
            await navigator.clipboard?.writeText(urlText);
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 1800);
        } catch {
            // Clipboard blocked in headless/restricted context
        }
    };

    // Calculate Victim Counts per Group based on posts
    const groupVictimCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        posts.forEach(p => {
            const g = p.group_name;
            counts[g] = (counts[g] || 0) + 1;
        });
        return counts;
    }, [posts]);

    // Top Active Groups (for stats)
    const topGroups = useMemo(() => {
        return Object.entries(groupVictimCounts)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 5);
    }, [groupVictimCounts]);

    // Filtered Groups for List
    const filteredGroups = useMemo(() => {
        if (!searchTerm) return groups;
        const lower = searchTerm.toLowerCase();
        return groups.filter(g => g.name.toLowerCase().includes(lower) || (g.meta && g.meta.toLowerCase().includes(lower)));
    }, [groups, searchTerm]);

    // Filtered Posts for Feed (Optimized)
    const filteredPosts = useMemo(() => {
        let data = posts;
        if (victimSearch) {
            const lower = victimSearch.toLowerCase();
            data = data.filter(p => 
                p.post_title.toLowerCase().includes(lower) || 
                p.group_name.toLowerCase().includes(lower) ||
                (p.country && p.country.toLowerCase().includes(lower)) ||
                (p.activity && p.activity.toLowerCase().includes(lower))
            );
        }
        return data.slice(0, 100); // Limit rendering for performance
    }, [posts, victimSearch]);

    const recentVelocity = useMemo(() => {
        // Count posts in last 24h
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        return posts.filter(p => now - new Date(p.discovered).getTime() < oneDay).length;
    }, [posts]);

    return (
        <div className="h-[calc(100vh-70px)] bg-transparent flex flex-col overflow-hidden relative">
            {/* Screenshot Preview Overlay */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-50 bg-[#111]/80 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl w-full bg-[#111] border border-[#333] rounded-lg overflow-hidden shadow-2xl">
                        <div className="p-2 bg-[#111] flex justify-between items-center border-b border-[#222]">
                            <span className="text-xs font-mono text-[#AAA]">EVIDENCE SNAPSHOT</span>
                            <button type="button" aria-label="Close preview" onClick={() => setPreviewImage(null)} className="text-white hover:text-red-400"><X size={16}/></button>
                        </div>
                        <img src={previewImage} alt="Victim Site" className="w-full h-auto max-h-[80vh] object-contain"/>
                    </div>
                </div>
            )}

            {/* OPSEC External Link Warning Interstitial */}
            {pendingExternalLink && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="OPSEC External Link Warning"
                    onClick={() => { setPendingExternalLink(null); setCopiedUrl(false); }}
                >
                    <div
                        className="max-w-lg w-full bg-[#111] border border-red-500/40 rounded-xl p-6 shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400">
                                    <ShieldAlert size={20}/>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                        {pendingExternalLink.isOnion ? 'Dark Web (.onion) Link Blocked' : 'External Adversary Link Warning'}
                                    </h3>
                                    <p className="text-[11px] text-[#888] font-mono mt-0.5">Analyst OPSEC Protection Gate</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                aria-label="Dismiss OPSEC warning"
                                onClick={() => { setPendingExternalLink(null); setCopiedUrl(false); }}
                                className="text-[#888] hover:text-white p-1"
                            >
                                <X size={16}/>
                            </button>
                        </div>

                        <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#222] font-mono text-xs text-amber-300 break-all">
                            {pendingExternalLink.defanged}
                        </div>

                        <p className="text-xs text-[#AAA] leading-relaxed">
                            {pendingExternalLink.isOnion
                                ? 'Direct opening of .onion dark web links is disabled in standard clearnet browsers. Copy the URL to inspect it inside Tor Browser or an isolated analysis VM.'
                                : 'Navigating directly to threat-actor or compromised victim infrastructure exposes your IP address and browser fingerprint. Copy the indicator for an isolated sandbox or proceed intentionally.'}
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222]">
                            <button
                                type="button"
                                onClick={() => void handleCopyTarget(pendingExternalLink.href)}
                                className="px-3 py-1.5 rounded bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-xs font-mono text-white flex items-center gap-1.5"
                            >
                                {copiedUrl ? <Check size={13} className="text-emerald-400"/> : <Copy size={13}/>}
                                {copiedUrl ? 'Copied' : 'Copy URL'}
                            </button>
                            {!pendingExternalLink.isOnion && (
                                <a
                                    href={pendingExternalLink.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => { setPendingExternalLink(null); setCopiedUrl(false); }}
                                    className="px-3 py-1.5 rounded bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-xs font-bold text-red-300 flex items-center gap-1.5"
                                >
                                    <ExternalLink size={13}/> Open Clearnet URL
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-[#111]/40 border-b border-[#222] p-6 flex flex-col gap-4 shrink-0">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-accent/15 rounded-lg border border-accent/30 text-accent">
                            <Skull size={24}/>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cyber flex items-center gap-2">
                                RANSOMWARE <span className="text-accent">WATCH</span>
                            </h2>
                            <p className="text-sm text-[#888] font-mono mt-1">Live Double Extortion Monitoring</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-[#888]">
                        {posts.length > 0 ? (
                            <span>Last Sync: {lastUpdated.toLocaleTimeString()}</span>
                        ) : (
                            <span>Waiting for feed...</span>
                        )}
                        <span className="bg-[#151515] px-2 py-1 rounded border border-[#333]">Auto-Update Active</span>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] rounded-xl p-5 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-accent/30 transition-all duration-300 group">
                        <div>
                            <div className="text-[10px] text-[#888] uppercase font-bold">Total Victims</div>
                            <div className="text-4xl font-mono font-bold text-white group-hover:text-accent transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{posts.length}</div>
                        </div>
                        <Target size={32} className="text-neutral-600 group-hover:text-accent transition-colors opacity-50"/>
                    </div>
                    <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] rounded-xl p-5 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-accent/30 transition-all duration-300 group">
                        <div>
                            <div className="text-[10px] text-[#888] uppercase font-bold">Active Groups</div>
                            <div className="text-4xl font-mono font-bold text-white group-hover:text-accent transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{groups.length || Object.keys(groupVictimCounts).length}</div>
                        </div>
                        <Users size={32} className="text-neutral-500 group-hover:text-accent transition-colors opacity-50"/>
                    </div>
                    <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] rounded-xl p-5 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-accent/30 transition-all duration-300 group">
                        <div>
                            <div className="text-[10px] text-[#888] uppercase font-bold">24h Velocity</div>
                            <div className="text-4xl font-mono font-bold text-accent drop-shadow-[0_0_12px_var(--theme-accent-glow)] animate-pulse">{recentVelocity}</div>
                        </div>
                        <Activity size={32} className="text-accent/50 group-hover:text-accent transition-colors opacity-70"/>
                    </div>
                    <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-accent/30 transition-all duration-300 group">
                        <div className="text-[10px] text-[#888] uppercase font-bold mb-1">Top Threat</div>
                        <div className="text-sm font-bold text-white truncate">{topGroups[0]?.[0] || 'N/A'}</div>
                        <div className="text-[10px] text-neutral-600">{topGroups[0]?.[1] || 0} victims</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Column: Victim Feed */}
                <div className="w-1/3 min-w-[400px] border-r border-[#222] flex flex-col bg-[#111]/20">
                    <div className="p-3 bg-[#111] border-b border-[#222] flex items-center justify-between sticky top-0 z-10">
                        <div className="text-xs font-bold text-[#AAA] uppercase flex items-center gap-2">
                            <Zap size={14}/> Live Victim Feed
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2 top-1.5 text-neutral-600 w-3 h-3"/>
                            <input 
                                type="text" 
                                placeholder="Filter victims or country..." 
                                className="bg-[#111] border border-[#333] rounded-full pl-7 pr-3 py-1 text-xs text-neutral-300 focus:outline-none focus:border-accent w-32 transition-all focus:w-48"
                                value={victimSearch}
                                onChange={(e) => setVictimSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                        {posts.length === 0 ? (
                            <div className="p-8 text-center text-[#888] text-xs italic">No ransomware incidents recorded for this tenant.</div>
                        ) : filteredPosts.length === 0 ? (
                             <div className="p-8 text-center text-[#888] text-xs italic">No victims found matching filter.</div>
                        ) : (
                            filteredPosts.map((post, i) => (
                                <div key={i} className="p-5 border-b border-[#1a1a1a] hover:bg-gradient-to-r hover:from-accent/10 hover:to-transparent border-l-2 border-l-transparent hover:border-l-accent transition-all duration-300 group relative">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-[#888]">{new Date(post.discovered).toLocaleString()}</span>
                                            {(() => {
                                                const iso = resolveValidFlagIsoCode(post.country);
                                                if (iso && !failedFlags[iso]) {
                                                    return (
                                                        <img
                                                            src={`https://flagcdn.com/w20/${iso}.png`}
                                                            className="w-4 h-3 rounded-sm opacity-80"
                                                            alt={post.country}
                                                            title={post.country}
                                                            onError={() => setFailedFlags(prev => ({ ...prev, [iso]: true }))}
                                                        />
                                                    );
                                                }
                                                if (post.country) {
                                                    return (
                                                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#333] text-[#AAA]" title={post.country}>
                                                            {post.country}
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            {post.source === 'Ransomware.live' && <span className="text-[9px] bg-[#111] text-red-400 border border-neutral-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1"><Zap size={8} fill="currentColor"/> LIVE</span>}
                                            <span className="text-[10px] bg-red-900/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase">{post.group_name}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h4 className="text-sm font-bold text-neutral-200 group-hover:text-red-400 transition-colors mb-1">{post.post_title}</h4>
                                            {post.description && post.description !== 'N/A' && !post.description.startsWith('[AI generated]') && (
                                                <p className="text-[10px] text-[#888] line-clamp-1 mb-1 max-w-[250px]">{post.description}</p>
                                            )}
                                            {post.activity && post.activity !== 'N/A' && post.activity !== 'Not Found' && (
                                                <div className="text-[10px] text-[#888] flex items-center gap-1">
                                                    <Activity size={10}/> {post.activity}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            {(() => {
                                                const linkInfo = inspectRansomwareTargetUrl(post.website);
                                                if (!linkInfo.valid) return null;
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setCopiedUrl(false); setPendingExternalLink(linkInfo); }}
                                                        className="p-1.5 rounded bg-[#151515] text-[#AAA] hover:text-accent hover:bg-[#1C1C1C] transition-colors"
                                                        title={linkInfo.isOnion ? 'Inspect Dark Web (.onion) Link Safely' : 'Inspect External Link (OPSEC Warning)'}
                                                        aria-label={`Inspect external URL for ${post.post_title}`}
                                                    >
                                                        {linkInfo.isOnion ? <Lock size={12}/> : <Globe size={12}/>}
                                                    </button>
                                                );
                                            })()}
                                            {post.screenshot && (
                                                <button 
                                                    onClick={() => setPreviewImage(post.screenshot!)}
                                                    className="p-1.5 rounded bg-[#151515] text-[#AAA] hover:text-white hover:bg-[#1C1C1C] transition-colors relative group/img" 
                                                    title="View Proof"
                                                >
                                                    <ImageIcon size={12}/>
                                                    <span className="absolute right-0 top-0 w-2 h-2 bg-neutral-500 rounded-full animate-ping"></span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {filteredPosts.length === 100 && (
                            <div className="p-2 text-center text-[10px] text-neutral-600 border-t border-[#222] bg-[#111]/20 font-mono">
                                Showing recent 100 of {posts.length}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Gang Profiles */}
                <div className="flex-1 flex flex-col bg-[#111]/40">
                    <div className="p-3 bg-[#111] border-b border-[#222] flex items-center justify-between">
                        <div className="text-xs font-bold text-[#AAA] uppercase flex items-center gap-2">
                            <Lock size={14}/> Gang Profiles
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2 top-1.5 text-neutral-600 w-3 h-3"/>
                            <input 
                                type="text" 
                                placeholder="Search groups..." 
                                className="bg-[#111] border border-[#333] rounded-full pl-7 pr-3 py-1 text-xs text-neutral-300 focus:outline-none focus:border-accent w-48"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 grid grid-cols-1 xl:grid-cols-2 gap-4 content-start">
                        {filteredGroups.length === 0 && !searchTerm ? (
                            <div className="col-span-full text-center text-[#888] text-xs italic mt-10">No group profiles available.</div>
                        ) : (
                            filteredGroups.map((group, i) => (
                                <div key={i} className="bg-[#111]/40 backdrop-blur-md border border-[#222] rounded-xl p-5 hover:bg-[#111]/60 hover:border-accent/40 hover:shadow-[0_0_30px_var(--theme-accent-muted)] transition-all duration-500 flex flex-col h-full group/card">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-xl font-bold text-white uppercase tracking-wider group-hover/card:text-accent transition-colors flex items-center gap-2"><Globe className="text-neutral-600 group-hover/card:text-accent w-4 h-4"/> {group.name}</h3>
                                        <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/30">
                                            {groupVictimCounts[group.name] || 0} Victims
                                        </span>
                                    </div>
                                    
                                    {group.meta && (
                                        <div className="text-sm text-neutral-400 mb-5 leading-relaxed border-l-2 border-neutral-700 group-hover/card:border-accent/50 pl-3 transition-colors">
                                            {group.meta}
                                        </div>
                                    )}

                                    <div className="mt-auto space-y-2">
                                        <div className="text-[10px] font-bold text-[#888] uppercase">Darkweb Locations</div>
                                        <div className="space-y-1">
                                            {group.locations.map((loc, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-[#111] p-2 rounded-lg text-xs border border-[#222] group-hover/card:border-[#333] hover:bg-[#1a1a1a] transition-colors">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <div className={`w-2 h-2 rounded-full ${loc.available ? 'bg-neutral-500' : 'bg-red-500'}`} title={loc.available ? 'Online' : 'Offline'}></div>
                                                        <span className="font-mono text-neutral-300 truncate" title={loc.slug}>{loc.fqdn || loc.slug}</span>
                                                    </div>
                                                    <span className="text-[9px] text-neutral-600 font-mono ml-2 whitespace-nowrap">v{loc.version}</span>
                                                </div>
                                            ))}
                                            {group.locations.length === 0 && <span className="text-neutral-600 text-xs italic">No known leaksites.</span>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};



