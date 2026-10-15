import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';

export interface ThreeGlobeArc {
    id: string | number;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    color: string;
    risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    signature?: string;
    ip?: string;
    country?: string;
    order: number;
}

export interface ThreeGlobeRing {
    id: string | number;
    lat: number;
    lng: number;
    color: string;
    maxR?: number;
    speed?: number;
    repeat?: number;
}

export interface ThreeGlobePoint {
    id: string | number;
    lat: number;
    lng: number;
    color: string;
    radius: number;
    altitude?: number;
    label?: string;
}

export interface ThreeGlobeLabel {
    id: string | number;
    lat: number;
    lng: number;
    text: string;
    color: string;
    size: number;
}

export interface ThreeGlobeViewHandle {
    zoom: (delta: number) => void;
    getGlobe: () => GlobeMethods | null;
}

interface ThreeGlobeViewProps {
    arcs: ThreeGlobeArc[];
    rings: ThreeGlobeRing[];
    points: ThreeGlobePoint[];
    labels: ThreeGlobeLabel[];
    isPaused: boolean;
    onGlobeReady?: () => void;
    allowInteraction?: boolean;
    initialAltitude?: number;
    initialLat?: number;
    initialLng?: number;
}

function getRgba(color: string, alpha: number): string {
    if (!color) return `rgba(239, 68, 68, ${alpha.toFixed(3)})`;
    if (color.startsWith('#')) {
        let hex = color.slice(1);
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
    }
    if (color.startsWith('rgb(')) {
        return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha.toFixed(3)})`);
    }
    if (color.startsWith('rgba(')) {
        return color.replace(/[\d\.]+\)$/, `${alpha.toFixed(3)})`);
    }
    return `rgba(239, 68, 68, ${alpha.toFixed(3)})`;
}

export const ThreeGlobeView = forwardRef<ThreeGlobeViewHandle, ThreeGlobeViewProps>(({
    arcs,
    rings,
    points,
    labels,
    isPaused,
    onGlobeReady,
    allowInteraction = true,
    initialAltitude = 2.5,
    initialLat = 12,
    initialLng = -35
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const globeEl = useRef<GlobeMethods | undefined>(undefined);
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    useImperativeHandle(ref, () => ({
        zoom: (delta: number) => {
            if (!globeEl.current) return;
            const pov = globeEl.current.pointOfView();
            if (pov) {
                const nextAlt = Math.max(1.1, Math.min(4.8, pov.altitude - delta * 0.4));
                globeEl.current.pointOfView({ altitude: nextAlt }, 300);
            }
        },
        getGlobe: () => globeEl.current || null
    }));

    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        window.addEventListener('resize', updateSize);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    const handleGlobeReady = useCallback(() => {
        if (!globeEl.current) return;
        const globe = globeEl.current;

        // Center with optimal framing and altitude
        globe.pointOfView({ lat: initialLat, lng: initialLng, altitude: initialAltitude }, 0);

        const controls = globe.controls();
        if (controls) {
            controls.autoRotate = !isPaused;
            controls.autoRotateSpeed = 0.45; // Slow, majestic rotation
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.enableZoom = allowInteraction;
            controls.enableRotate = allowInteraction;
            controls.enablePan = false;
        }

        // Add custom scene lighting to illuminate the Earth and make water bodies lighter & realistic
        const scene = globe.scene();
        if (scene) {
            // Natural sky/ocean hemisphere light to brighten oceanic water bodies
            const hemiLight = new THREE.HemisphereLight(0x9bd4ff, 0x18345c, 1.25);
            scene.add(hemiLight);

            // Crisp key sunlight on daytime hemisphere
            const keySunLight = new THREE.DirectionalLight(0xffffff, 1.9);
            keySunLight.position.set(-2, 1.5, 2.5);
            scene.add(keySunLight);

            // Fill light bringing turquoise/azure brilliance to oceans
            const fillLight = new THREE.DirectionalLight(0x7ec8ff, 1.1);
            fillLight.position.set(2, -1, -2);
            scene.add(fillLight);

            // Ambient light ensuring oceans have depth without turning pitch-black
            const ambientLight = new THREE.AmbientLight(0x386088, 0.95);
            scene.add(ambientLight);
        }

        if (onGlobeReady) onGlobeReady();
    }, [isPaused, onGlobeReady, allowInteraction, initialAltitude]);

    // Update autoRotate when isPaused or allowInteraction changes
    useEffect(() => {
        if (!globeEl.current) return;
        const controls = globeEl.current.controls();
        if (controls) {
            controls.autoRotate = !isPaused;
            controls.enableZoom = allowInteraction;
            controls.enableRotate = allowInteraction;
        }
    }, [isPaused, allowInteraction]);

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-transparent select-none">
            {dimensions.width > 0 && dimensions.height > 0 && (
                <Globe
                    ref={globeEl}
                    width={dimensions.width}
                    height={dimensions.height}
                    backgroundColor="rgba(0,0,0,0)"
                    globeImageUrl="/textures/earth-blue-marble.jpg"
                    bumpImageUrl="/textures/earth-topology.png"
                    showAtmosphere={true}
                    atmosphereColor="#38bdf8"
                    atmosphereAltitude={0.20}
                    arcsData={arcs}
                    arcStartLat={(d: any) => (d as ThreeGlobeArc).startLat}
                    arcStartLng={(d: any) => (d as ThreeGlobeArc).startLng}
                    arcEndLat={(d: any) => (d as ThreeGlobeArc).endLat}
                    arcEndLng={(d: any) => (d as ThreeGlobeArc).endLng}
                    arcColor={(d: any) => [(d as ThreeGlobeArc).color, (d as ThreeGlobeArc).color]}
                    arcAltitude={0.20}
                    arcStroke={(d: any) => (d as ThreeGlobeArc).risk === 'CRITICAL' ? 1.8 : 1.2}
                    arcDashLength={0.4}
                    arcDashGap={0.2}
                    arcDashInitialGap={(d: any) => ((d as ThreeGlobeArc).order % 10) * 0.1}
                    arcDashAnimateTime={2200}
                    arcLabel={(d: any) => {
                        const arc = d as ThreeGlobeArc;
                        return `
                            <div style="background: rgba(10,12,16,0.92); border: 1px solid ${arc.color}; padding: 6px 10px; border-radius: 6px; font-family: monospace; font-size: 11px; color: #fff; box-shadow: 0 0 15px rgba(0,0,0,0.8); pointer-events: none;">
                                <div style="font-weight: bold; color: ${arc.color}; margin-bottom: 2px;">${arc.risk} THREAT</div>
                                <div><strong>Target:</strong> Collection HQ</div>
                                <div><strong>Origin:</strong> ${arc.country || 'Unknown'} (${arc.ip || 'N/A'})</div>
                                <div style="color: #bbb; margin-top: 2px;">${arc.signature || 'Suspicious Traffic'}</div>
                            </div>
                        `;
                    }}
                    ringsData={rings}
                    ringLat={(d: any) => (d as ThreeGlobeRing).lat}
                    ringLng={(d: any) => (d as ThreeGlobeRing).lng}
                    ringColor={(d: any) => {
                        const ring = d as ThreeGlobeRing;
                        return (t: number) => {
                            const alpha = Math.max(0, 1 - t) * 0.85;
                            return getRgba(ring.color, alpha);
                        };
                    }}
                    ringMaxRadius={(d: any) => (d as ThreeGlobeRing).maxR ?? 4.5}
                    ringPropagationSpeed={(d: any) => (d as ThreeGlobeRing).speed ?? 2.5}
                    ringRepeatPeriod={(d: any) => (d as ThreeGlobeRing).repeat ?? 1200}
                    pointsData={points}
                    pointLat={(d: any) => (d as ThreeGlobePoint).lat}
                    pointLng={(d: any) => (d as ThreeGlobePoint).lng}
                    pointColor={(d: any) => (d as ThreeGlobePoint).color}
                    pointRadius={(d: any) => (d as ThreeGlobePoint).radius}
                    pointAltitude={(d: any) => (d as ThreeGlobePoint).altitude ?? 0.015}
                    pointLabel={(d: any) => {
                        const pt = d as ThreeGlobePoint;
                        if (!pt.label) return '';
                        return `
                            <div style="background: rgba(10,12,16,0.92); border: 1px solid ${pt.color}; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 10px; color: #fff; pointer-events: none;">
                                ${pt.label}
                            </div>
                        `;
                    }}
                    labelsData={labels}
                    labelLat={(d: any) => (d as ThreeGlobeLabel).lat}
                    labelLng={(d: any) => (d as ThreeGlobeLabel).lng}
                    labelText={(d: any) => (d as ThreeGlobeLabel).text}
                    labelColor={(d: any) => (d as ThreeGlobeLabel).color}
                    labelSize={(d: any) => (d as ThreeGlobeLabel).size}
                    labelDotRadius={0.35}
                    labelAltitude={0.03}
                    enablePointerInteraction={allowInteraction}
                    onGlobeReady={handleGlobeReady}
                />
            )}
        </div>
    );
});

ThreeGlobeView.displayName = 'ThreeGlobeView';
export default ThreeGlobeView;
