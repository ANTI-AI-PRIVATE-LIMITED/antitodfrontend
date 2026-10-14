import React, { useEffect, useRef, useState, Suspense } from 'react';
import * as d3Import from 'd3';
import * as topojson from 'topojson-client';
import { AnalyzedHost } from '../../types';
import { Map as MapIcon, Target, Maximize2, Minimize2, Play, Pause, Globe, Activity, Terminal, MousePointer2, Plus, Minus, Loader2 } from 'lucide-react';
import { ThreeGlobeArc, ThreeGlobeRing, ThreeGlobePoint, ThreeGlobeLabel, ThreeGlobeViewHandle } from './ThreeGlobeView';

const ThreeGlobeView = React.lazy(() => import('./ThreeGlobeView'));

const d3 = d3Import as any;

export interface AttackTarget {
    type: 'LOCAL' | 'GLOBAL' | 'RANSOMWARE' | 'IOC';
    lat?: number;
    lon?: number;
    country?: string;
    label: string;
    subLabel?: string;
    risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface AttackMapViewProps {
    results: AnalyzedHost[];
    globalThreats?: AttackTarget[];
    cinematic?: boolean;
    allowInteraction?: boolean;
}

interface Projectile {
    id: number;
    from: [number, number]; // lon, lat
    to: [number, number];
    progress: number;
    speed: number;
    color: string;
    risk: string;
    signature?: string;
}

interface Ripple {
    id: number;
    pos: [number, number];
    r: number;
    maxR: number;
    alpha: number;
    color: string;
}

interface OriginPulse {
    id: number;
    pos: [number, number];
    r: number;
    alpha: number;
    color: string;
    label?: string;
}

interface AttackLogItem {
    id: number;
    timestamp: string;
    srcIp: string;
    srcCountry: string;
    srcFlag?: string;
    signature: string;
    payload: string;
    risk: string;
    source: string;
}

interface AttackLabel {
    id: number;
    x: number;
    y: number;
    text: string;
    subText?: string;
    life: number;
    maxLife: number;
    color: string;
}

// Fixed HQ location (Default to US East / N. Virginia)
export const DEFAULT_HQ: [number, number] = [-77.48, 39.04]; 

// Approximate Country Centers for mapping codes to coordinates
export const COUNTRY_COORDS: Record<string, [number, number]> = {
    'CN': [104.1, 35.8], 'RU': [105.3, 61.5], 'US': [-95.7, 37.0],
    'BR': [-51.9, -14.2], 'IN': [78.9, 20.5], 'DE': [10.4, 51.1],
    'IR': [53.6, 32.4], 'KP': [127.5, 40.3], 'KR': [127.7, 35.9],
    'GB': [-3.4, 55.3], 'FR': [2.2, 46.2], 'JP': [138.2, 36.2],
    'UA': [31.1, 48.3], 'BY': [27.9, 53.7], 'VN': [108.2, 14.0],
    'TR': [35.2, 38.9], 'RO': [24.9, 45.9], 'NL': [5.2, 52.1],
    'CA': [-106.3, 56.1], 'AU': [133.7, -25.2], 'IT': [12.5, 41.8],
    'ES': [-3.7, 40.4], 'PL': [19.1, 51.9], 'ID': [113.9, -0.7],
    'MX': [-102.5, 23.6], 'SA': [45.0, 23.8], 'ZA': [22.9, -30.5]
};

export const AttackMapView: React.FC<AttackMapViewProps> = ({ results, globalThreats = [], cinematic = false, allowInteraction = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const globeHandleRef = useRef<ThreeGlobeViewHandle>(null);

    const [worldData, setWorldData] = useState<any>(null);
    const [hq] = useState<[number, number]>(DEFAULT_HQ);
    const [stats, setStats] = useState({ active: 0, total: 0, peak: 0 });
    const [isPaused, setIsPaused] = useState(false);
    const [projectionType, setProjectionType] = useState<'ORTHO' | 'MERCATOR'>('ORTHO');
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const [attackLog, setAttackLog] = useState<AttackLogItem[]>([]);
    const transformRef = useRef({ k: 1, x: 0, y: 0, rotate: [0, -30] as [number, number] });
    const isDraggingRef = useRef(false);

    // 3D Globe States
    const [globeArcs, setGlobeArcs] = useState<ThreeGlobeArc[]>([]);
    const [globeRings, setGlobeRings] = useState<ThreeGlobeRing[]>([
        { id: 'hq-base-pulse', lat: DEFAULT_HQ[1], lng: DEFAULT_HQ[0], color: '#38bdf8', maxR: 3.8, speed: 2.0, repeat: 1400 }
    ]);
    const [globePoints, setGlobePoints] = useState<ThreeGlobePoint[]>([
        { id: 'hq-point', lat: DEFAULT_HQ[1], lng: DEFAULT_HQ[0], color: '#38bdf8', radius: 0.65, altitude: 0.02, label: 'COLLECTION INFRASTRUCTURE' }
    ]);
    const [globeLabels] = useState<ThreeGlobeLabel[]>([
        { id: 'hq-label', lat: DEFAULT_HQ[1], lng: DEFAULT_HQ[0], text: 'COLLECTION HQ', color: '#38bdf8', size: 1.1 }
    ]);

    const reqRef = useRef<number>(0);
    const projectilesRef = useRef<Projectile[]>([]);
    const ripplesRef = useRef<Ripple[]>([]);
    const originPulsesRef = useRef<OriginPulse[]>([]);
    const labelsRef = useRef<AttackLabel[]>([]);
    const attackQueueRef = useRef<AttackTarget[]>([]);
    const lastLogTimeRef = useRef(0);
    const arcCounterRef = useRef(0);

    // Load local map data with no external CDN dependency
    useEffect(() => {
        fetch('/data/countries-110m.json')
            .then(res => res.json())
            .then(data => {
                const countries = topojson.feature(data, data.objects.countries);
                setWorldData(countries);
            })
            .catch(err => {
                console.error('Failed to load local map data:', err);
            });
    }, []);

    // Initialize Attack Queue (Merge Local & Global)
    useEffect(() => {
        const localTargets: AttackTarget[] = results
            .filter(h => h.enrichmentData?.latitude && h.enrichmentData?.longitude)
            .map(h => ({
                type: 'LOCAL',
                lat: h.enrichmentData!.latitude!,
                lon: h.enrichmentData!.longitude!,
                country: h.country,
                label: h.signatures[0]?.name || 'Suspicious Activity',
                subLabel: h.ip,
                risk: h.riskLevel
            }));
        
        const combined = [...localTargets, ...globalThreats];
        attackQueueRef.current = combined.sort(() => Math.random() - 0.5);
    }, [results, globalThreats]);

    // Spawning timer for 3D Globe attacks
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            if (attackQueueRef.current.length === 0) return;

            const target = attackQueueRef.current[Math.floor(Math.random() * attackQueueRef.current.length)];
            let start: [number, number] | null = null;

            if (target.lat && target.lon) {
                start = [target.lon, target.lat];
            } else if (target.country) {
                const code = target.country.toUpperCase();
                if (COUNTRY_COORDS[code]) {
                    const [lon, lat] = COUNTRY_COORDS[code];
                    start = [lon + (Math.random() - 0.5) * 4, lat + (Math.random() - 0.5) * 4];
                }
            }

            if (!start) {
                start = [(Math.random() * 340) - 170, (Math.random() * 110) - 55];
            }

            let color = '#3b82f6';
            if (target.risk === 'CRITICAL') color = '#ef4444';
            else if (target.risk === 'HIGH') color = '#f97316';
            else if (target.risk === 'MEDIUM') color = '#eab308';

            const newArc: ThreeGlobeArc = {
                id: Math.random(),
                startLat: start[1],
                startLng: start[0],
                endLat: hq[1] + (Math.random() - 0.5) * 0.5,
                endLng: hq[0] + (Math.random() - 0.5) * 0.5,
                color,
                risk: target.risk,
                signature: target.label,
                ip: target.subLabel,
                country: target.country,
                order: arcCounterRef.current++
            };

            // Keep rolling window of active arcs
            setGlobeArcs(prev => {
                const next = [...prev, newArc];
                return next.slice(-22);
            });

            // Target ring pulse in attacker's risk color
            const newTargetRing: ThreeGlobeRing = {
                id: Math.random(),
                lat: hq[1],
                lng: hq[0],
                color,
                maxR: target.risk === 'CRITICAL' ? 5.2 : 3.8,
                speed: 2.8,
                repeat: 900
            };

            setGlobeRings(prev => {
                const hqBase = prev.find(r => r.id === 'hq-base-pulse') || {
                    id: 'hq-base-pulse',
                    lat: hq[1],
                    lng: hq[0],
                    color: '#38bdf8',
                    maxR: 3.8,
                    speed: 2.0,
                    repeat: 1400
                };
                return [hqBase, newTargetRing, ...prev.filter(r => r.id !== 'hq-base-pulse').slice(0, 3)];
            });

            // Origin pin for active attack
            const newOriginPoint: ThreeGlobePoint = {
                id: Math.random(),
                lat: start[1],
                lng: start[0],
                color,
                radius: target.risk === 'CRITICAL' ? 0.6 : 0.45,
                altitude: 0.02,
                label: `${target.country || 'Host'}: ${target.label}`
            };

            setGlobePoints(prev => {
                const hqPoint = prev.find(p => p.id === 'hq-point') || {
                    id: 'hq-point',
                    lat: hq[1],
                    lng: hq[0],
                    color: '#38bdf8',
                    radius: 0.65,
                    altitude: 0.02,
                    label: 'COLLECTION INFRASTRUCTURE'
                };
                return [hqPoint, newOriginPoint, ...prev.filter(p => p.id !== 'hq-point').slice(0, 8)];
            });

            // Update stats & log
            setStats(prev => ({
                active: Math.min(prev.active + 1, 22),
                total: prev.total + 1,
                peak: Math.max(prev.peak, prev.active + 1)
            }));

            if (Date.now() - lastLogTimeRef.current > 700) {
                lastLogTimeRef.current = Date.now();
                const newLogItem: AttackLogItem = {
                    id: Math.random(),
                    timestamp: new Date().toLocaleTimeString(),
                    srcIp: target.subLabel || `${Math.floor(Math.random() * 200 + 20)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                    srcCountry: target.country || 'XX',
                    srcFlag: target.country ? `https://flagcdn.com/w20/${target.country.toLowerCase()}.png` : undefined,
                    signature: target.label,
                    payload: target.type === 'LOCAL' ? 'Raw Payload' : target.type,
                    risk: target.risk,
                    source: target.type
                };
                setAttackLog(prev => [newLogItem, ...prev].slice(0, 20));
            }
        }, cinematic ? 650 : 800);

        return () => clearInterval(interval);
    }, [isPaused, hq, cinematic]);

    // 2D Mercator D3 Canvas setup
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || projectionType !== 'MERCATOR') return;

        const selection = d3.select(canvas);
        selection.on('.zoom', null).on('.drag', null);

        if (!cinematic || allowInteraction) {
            const zoom = d3.zoom()
                .scaleExtent([1, 8])
                .on('zoom', (event: any) => {
                    transformRef.current.k = event.transform.k;
                    transformRef.current.x = event.transform.x;
                    transformRef.current.y = event.transform.y;
                });

            selection.call(zoom as any);
        }
    }, [projectionType, cinematic, allowInteraction]);

    // 2D Canvas Animation Loop (only active when projectionType is MERCATOR)
    useEffect(() => {
        if (projectionType !== 'MERCATOR' || !worldData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const render = (time: number) => {
            if (!containerRef.current) return;
            
            const width = containerRef.current.offsetWidth;
            const height = containerRef.current.offsetHeight;
            
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }

            const baseScale = width / (2 * Math.PI);
            const projection = d3.geoMercator()
                .scale(baseScale * transformRef.current.k)
                .translate([width / 2 + transformRef.current.x, height / 2 + transformRef.current.y]);

            const path = d3.geoPath(projection, ctx);

            // Background
            ctx.fillStyle = '#06080b';
            ctx.fillRect(0, 0, width, height);

            // Land
            ctx.beginPath();
            path(worldData);
            ctx.fillStyle = '#111822';
            ctx.strokeStyle = '#1e293b';
            ctx.fill();
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // HQ Marker
            const hqProj = projection(hq);
            if (hqProj) {
                ctx.beginPath();
                ctx.arc(hqProj[0], hqProj[1], 4, 0, 2 * Math.PI);
                ctx.fillStyle = '#38bdf8';
                ctx.fill();
                
                const pingSize = (Math.sin(time / 200) + 1) * 6 + 2;
                ctx.beginPath();
                ctx.arc(hqProj[0], hqProj[1], pingSize, 0, 2 * Math.PI);
                ctx.strokeStyle = `rgba(56, 189, 248, ${0.8 - (pingSize / 16)})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Spawn 2D Projectiles
            if (!isPaused && attackQueueRef.current.length > 0 && Math.random() > 0.93) {
                const target = attackQueueRef.current[Math.floor(Math.random() * attackQueueRef.current.length)];
                let start: [number, number] | null = null;

                if (target.lat && target.lon) {
                    start = [target.lon, target.lat];
                } else if (target.country && COUNTRY_COORDS[target.country.toUpperCase()]) {
                    const [lon, lat] = COUNTRY_COORDS[target.country.toUpperCase()];
                    start = [lon + (Math.random() - 0.5) * 5, lat + (Math.random() - 0.5) * 5];
                }

                if (!start) start = [(Math.random() * 360) - 180, (Math.random() * 120) - 60];

                let color = '#3b82f6';
                if (target.risk === 'CRITICAL') color = '#ef4444';
                else if (target.risk === 'HIGH') color = '#f97316';
                else if (target.risk === 'MEDIUM') color = '#eab308';

                projectilesRef.current.push({
                    id: Math.random(),
                    from: start,
                    to: [hq[0] + (Math.random() - 0.5), hq[1] + (Math.random() - 0.5)],
                    progress: 0,
                    speed: 0.003 + Math.random() * 0.003,
                    color,
                    risk: target.risk,
                    signature: target.label
                });
            }

            // Draw Projectiles
            ctx.lineCap = 'round';
            for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
                const p = projectilesRef.current[i];
                if (!isPaused) p.progress += p.speed;

                if (p.progress >= 1) {
                    ripplesRef.current.push({
                        id: Math.random(),
                        pos: p.to,
                        r: 1,
                        maxR: p.risk === 'CRITICAL' ? 28 : 16,
                        alpha: 1,
                        color: p.color
                    });
                    projectilesRef.current.splice(i, 1);
                    continue;
                }

                const interpolate = d3.geoInterpolate(p.from, p.to);
                const currentPos = interpolate(p.progress);
                const trailPos = interpolate(Math.max(0, p.progress - 0.22));

                const p1 = projection(currentPos);
                const p2 = projection(trailPos);

                if (p1 && p2) {
                    const grad = ctx.createLinearGradient(p2[0], p2[1], p1[0], p1[1]);
                    grad.addColorStop(0, 'rgba(0,0,0,0)');
                    grad.addColorStop(1, p.color);
                    
                    ctx.beginPath();
                    ctx.moveTo(p2[0], p2[1]);
                    ctx.lineTo(p1[0], p1[1]);
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = p.risk === 'CRITICAL' ? 2.5 : 1.5;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(p1[0], p1[1], p.risk === 'CRITICAL' ? 2 : 1, 0, 2 * Math.PI);
                    ctx.fillStyle = '#fff';
                    ctx.fill();
                }
            }

            // Draw Impact Ripples
            for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
                const r = ripplesRef.current[i];
                if (!isPaused) {
                    r.r += 0.5;
                    r.alpha -= 0.02;
                }

                if (r.alpha <= 0) {
                    ripplesRef.current.splice(i, 1);
                    continue;
                }

                const center = projection(r.pos);
                if (center) {
                    ctx.beginPath();
                    ctx.arc(center[0], center[1], r.r, 0, 2 * Math.PI);
                    ctx.strokeStyle = r.color;
                    ctx.globalAlpha = r.alpha;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }

            reqRef.current = requestAnimationFrame(render);
        };

        reqRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(reqRef.current);
    }, [projectionType, worldData, isPaused, hq]);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => console.log(err));
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleZoom = (delta: number) => {
        if (projectionType === 'ORTHO') {
            globeHandleRef.current?.zoom(delta);
        } else {
            transformRef.current.k = Math.max(0.5, Math.min(8, transformRef.current.k + delta));
        }
    };

    return (
        <div ref={containerRef} className="w-full h-full bg-[#06080b] relative overflow-hidden flex flex-col select-none">
            {/* Header HUD / Threat Map Card */}
            {!cinematic && (
                <div className="absolute top-4 left-4 z-20 flex flex-col gap-4 pointer-events-none">
                    <div className="bg-[#0b0f17]/85 backdrop-blur-md border border-cyan-500/30 p-4 rounded-lg pointer-events-auto shadow-[0_0_25px_rgba(56,189,248,0.1)]">
                        <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                            <Target className="text-cyan-400 animate-pulse" size={20}/>
                            <div>
                                <h2 className="text-white font-cyber font-bold text-lg leading-none tracking-wide">THREAT MAP</h2>
                                <span className="text-[10px] text-cyan-400 font-mono">GLOBAL REALTIME MONITORING</span>
                            </div>
                        </div>
                        <div className="space-y-2 font-mono text-xs">
                            <div className="flex justify-between gap-8">
                                <span className="text-[#888]">ACTIVE THREATS</span>
                                <span className="text-cyan-400 font-bold">{stats.active}</span>
                            </div>
                            <div className="flex justify-between gap-8">
                                <span className="text-[#888]">TOTAL IMPACTS</span>
                                <span className="text-white font-bold">{stats.total}</span>
                            </div>
                            <div className="flex justify-between gap-8">
                                <span className="text-[#888]">PEAK LOAD</span>
                                <span className="text-white font-bold">{stats.peak}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0b0f17]/85 backdrop-blur-md border border-white/10 p-2 rounded-lg pointer-events-auto flex flex-col gap-2">
                        <button onClick={() => setProjectionType(p => p === 'ORTHO' ? 'MERCATOR' : 'ORTHO')} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-xs font-bold text-neutral-300 transition-colors">
                            {projectionType === 'ORTHO' ? <MapIcon size={14} className="text-cyan-400"/> : <Globe size={14} className="text-cyan-400"/>} {projectionType === 'ORTHO' ? '2D MAP' : '3D GLOBE'}
                        </button>
                        <div className="h-px bg-white/10 mx-2"></div>
                        <button onClick={() => handleZoom(0.5)} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-xs font-bold text-neutral-300 transition-colors">
                            <Plus size={14}/> ZOOM IN
                        </button>
                        <button onClick={() => handleZoom(-0.5)} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-xs font-bold text-neutral-300 transition-colors">
                            <Minus size={14}/> ZOOM OUT
                        </button>
                        <div className="h-px bg-white/10 mx-2"></div>
                        <button onClick={() => setIsPaused(!isPaused)} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-xs font-bold text-neutral-300 transition-colors">
                            {isPaused ? <Play size={14} className="text-emerald-400"/> : <Pause size={14} className="text-amber-400"/>} {isPaused ? 'RESUME' : 'PAUSE'}
                        </button>
                        <button onClick={toggleFullscreen} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-xs font-bold text-neutral-300 transition-colors">
                            {isFullscreen ? <Minimize2 size={14}/> : <Maximize2 size={14}/>} FULLSCREEN
                        </button>
                    </div>
                </div>
            )}

            {/* Live Intercept Log */}
            {!cinematic && (
                <div className="absolute top-4 bottom-4 right-4 z-20 w-80 bg-[#0b0f17]/85 backdrop-blur-md border border-white/10 rounded-lg pointer-events-auto flex flex-col shadow-2xl overflow-hidden">
                    <div className="p-3 border-b border-white/10 bg-[#06080b]/90 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white font-bold text-xs font-cyber tracking-wider">
                            <Terminal size={14} className="text-cyan-400"/> INTERCEPT LOG
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></span>
                            <span className="text-[10px] text-red-400 font-mono font-bold">LIVE</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 relative">
                        {attackLog.length === 0 ? (
                            <div className="text-center text-neutral-500 text-xs font-mono mt-10 flex flex-col items-center">
                                <Activity className="animate-spin mb-2 opacity-30 text-cyan-400" size={24}/>
                                Intercepting telemetry...
                            </div>
                        ) : (
                            attackLog.map(log => (
                                <div key={log.id} className="bg-[#0b0f17] border border-white/5 hover:border-cyan-500/40 p-2.5 rounded transition-all group animate-fade-in shadow-sm">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div className="flex items-center gap-2">
                                            {log.srcFlag ? <img src={log.srcFlag} alt="flag" className="w-4 h-3 rounded-sm object-cover"/> : <Globe size={12} className="text-[#888]"/>}
                                            <span className="text-[10px] text-neutral-200 font-bold uppercase tracking-wider">{log.srcCountry}</span>
                                        </div>
                                        <span className="text-[10px] text-[#888] font-mono">{log.timestamp}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-mono text-cyan-300 truncate max-w-[140px]" title={log.srcIp}>{log.srcIp}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                            log.risk === 'CRITICAL' ? 'bg-red-950/60 text-red-400 border border-red-500/40' : 
                                            log.risk === 'HIGH' ? 'bg-orange-950/60 text-orange-400 border border-orange-500/40' : 
                                            'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                                        }`}>
                                            {log.risk}
                                        </span>
                                    </div>

                                    <div className="text-[11px] font-bold text-neutral-100 truncate mb-1.5" title={log.signature}>
                                        {log.signature}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="bg-[#06080b]/80 rounded p-1.5 border border-white/5 text-[10px] font-mono text-neutral-400 break-all line-clamp-1 w-3/4" title={log.payload}>
                                            <span className="text-cyan-500 mr-1">$</span>{log.payload}
                                        </div>
                                        <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-[#888] uppercase font-mono">{log.source}</span>
                                    </div>
                                </div>
                            ))
                        )}
                        <div className="h-4"></div>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none"></div>
                </div>
            )}

            {/* Risk Classification Legend */}
            {!cinematic && (
                <div className="absolute bottom-6 left-6 z-20 bg-[#0b0f17]/85 backdrop-blur-md border border-white/10 p-3.5 rounded-lg pointer-events-none shadow-xl">
                    <h3 className="text-[10px] text-[#888] font-bold uppercase mb-2 tracking-wider">Risk Classification</h3>
                    <div className="space-y-1.5 text-[10px] font-mono">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
                            <span className="text-red-400 font-bold">CRITICAL</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>
                            <span className="text-orange-400 font-bold">HIGH</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#facc15]"></span>
                            <span className="text-amber-300 font-bold">MEDIUM</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]"></span>
                            <span className="text-cyan-300 font-bold">LOW/COLLECTION</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/10 text-[9px] text-[#888] flex items-center gap-1.5 font-mono">
                        <MousePointer2 size={11} className="text-cyan-400"/> <span className="opacity-80">DRAG TO ORBIT / SCROLL TO ZOOM</span>
                    </div>
                </div>
            )}

            {/* Cinematic overlay controls (SOC Wall) */}
            {cinematic && allowInteraction && (
                <div className="absolute bottom-6 right-6 z-30 flex items-center gap-3 pointer-events-auto bg-[#0b0f17]/80 backdrop-blur-md border border-white/15 px-3 py-2 rounded-lg shadow-2xl">
                    <button 
                        onClick={() => setIsPaused(!isPaused)} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/15 text-neutral-200 hover:text-white rounded border border-white/10 text-xs font-mono font-bold transition-all"
                        title={isPaused ? "Resume Globe Rotation" : "Pause Globe Rotation"}
                    >
                        {isPaused ? <Play size={14} className="text-emerald-400"/> : <Pause size={14} className="text-amber-400"/>}
                        <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
                    </button>
                    <div className="w-px h-5 bg-white/15"></div>
                    <button 
                        onClick={() => setProjectionType(p => p === 'ORTHO' ? 'MERCATOR' : 'ORTHO')} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/15 text-neutral-200 hover:text-white rounded border border-white/10 text-xs font-mono font-bold transition-all"
                        title={projectionType === 'ORTHO' ? "Switch to 2D Map" : "Switch to 3D Globe"}
                    >
                        {projectionType === 'ORTHO' ? <MapIcon size={14} className="text-cyan-400"/> : <Globe size={14} className="text-cyan-400"/>}
                        <span>{projectionType === 'ORTHO' ? '2D MAP' : '3D GLOBE'}</span>
                    </button>
                </div>
            )}

            {/* 3D Earth Globe or 2D Mercator Canvas */}
            {projectionType === 'ORTHO' ? (
                <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
                    <Suspense fallback={
                        <div className="w-full h-full flex flex-col items-center justify-center text-cyan-400 gap-3">
                            <Loader2 className="animate-spin" size={36}/>
                            <span className="font-mono text-xs tracking-widest uppercase">INITIALIZING 3D EARTH TELEMETRY...</span>
                        </div>
                    }>
                        <ThreeGlobeView
                            ref={globeHandleRef}
                            arcs={globeArcs}
                            rings={globeRings}
                            points={globePoints}
                            labels={globeLabels}
                            isPaused={isPaused}
                            allowInteraction={!cinematic || allowInteraction}
                        />
                    </Suspense>
                </div>
            ) : (
                <canvas ref={canvasRef} className="w-full h-full cursor-move touch-none" />
            )}
        </div>
    );
};
