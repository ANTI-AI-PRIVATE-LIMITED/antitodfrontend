import React, { useState, useRef } from 'react';
import { X, Monitor, Moon, Sun, Terminal, Save, Trash2, Shield, Lock, CloudSnow, Flame, Upload, FilePlus, Loader2, ScrollText, Copy } from 'lucide-react';
import { AppSettings, AppTheme, LogEntry, MalpediaActor, CveEntry, SystemLogEntry, WhitelistEntry } from '../types';
import { parseNvdCve } from '../services/cve';
import { parseMalpediaActors, parseMalpediaMisp } from '../services/malpedia';
import { parseMitreStix } from '../services/mitre';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onUpdateSettings: (newSettings: AppSettings) => void;
    onClearData: () => void;
    onDataLoaded: (data: LogEntry[]) => void;
    onMmdbLoaded: (files: File[]) => void;
    onMalpediaLoaded: (files: File[]) => void;
    onMalpediaActorsLoaded: (actors: MalpediaActor[]) => void;
    onCveLoaded: (cves: CveEntry[]) => void;
    onNotify: (msg: string, type: 'info' | 'success' | 'error') => void;
    systemLogs?: SystemLogEntry[];
    whitelist?: WhitelistEntry[];
    onUpdateWhitelist?: (entries: WhitelistEntry[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    settings, 
    onUpdateSettings, 
    onClearData,
    onDataLoaded, 
    onMmdbLoaded, 
    onMalpediaLoaded, 
    onMalpediaActorsLoaded, 
    onCveLoaded,
    onNotify,
    systemLogs = [],
    whitelist = [],
    onUpdateWhitelist
}) => {
    const [activeTab, setActiveTab] = useState<'CONFIG' | 'LOGS'>('CONFIG');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [logFilter, setLogFilter] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'SUCCESS'>('ALL');

    if (!isOpen) return null;

    const themes: { id: AppTheme, label: string, icon: any, color: string }[] = [
        { id: 'CYBER', label: 'Cyberpunk', icon: Monitor, color: 'bg-neutral-800' },
        { id: 'NORDIC', label: 'Nordic (Ice)', icon: CloudSnow, color: 'bg-sky-400' },
        { id: 'EMBER', label: 'Ember (Heat)', icon: Flame, color: 'bg-neutral-500' },
        { id: 'SENTINEL', label: 'Sentinel (Holo)', icon: Shield, color: 'bg-neutral-700' },
        { id: 'FORTRESS', label: 'Fortress (Void)', icon: Lock, color: 'bg-emerald-600' },
        { id: 'DARK', label: 'Midnight', icon: Moon, color: 'bg-neutral-600' },
        { id: 'LIGHT', label: 'Corporate', icon: Sun, color: 'bg-neutral-400' },
        { id: 'TERMINAL', label: 'Hacker', icon: Terminal, color: 'bg-neutral-600' },
    ];

    const handleCopyLogs = () => {
        const text = systemLogs.map(l => `[${l.timestamp.toISOString()}] [${l.level}] [${l.source}] ${l.message}`).join('\n');
        navigator.clipboard.writeText(text);
        onNotify('System logs copied to clipboard', 'info');
    };

    const filteredLogs = systemLogs.filter(l => logFilter === 'ALL' || l.level === logFilter);

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsProcessing(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const file of Array.from(files) as File[]) {
                try {
                    if (file.name.endsWith('.mmdb')) {
                        await onMmdbLoaded([file]);
                        successCount++;
                        continue;
                    }
                    if (file.name.endsWith('.bib')) {
                        await onMalpediaLoaded([file]);
                        successCount++;
                        continue;
                    }

                    if (file.type === 'application/json' || file.name.endsWith('.json')) {
                        const text = await file.text();
                        let json = JSON.parse(text);

                        if (Array.isArray(json)) {
                            onDataLoaded(json as LogEntry[]);
                            successCount++;
                        } else if (typeof json === 'object' && json !== null) {
                            if (json.vulnerabilities && Array.isArray(json.vulnerabilities)) {
                                const cves = await parseNvdCve(file);
                                onCveLoaded(cves);
                                successCount++;
                            } else if (json.type === 'bundle' && Array.isArray(json.objects)) {
                                const actors = await parseMitreStix(file);
                                onMalpediaActorsLoaded(actors);
                                successCount++;
                            } else {
                                onDataLoaded([json as LogEntry]);
                                successCount++;
                            }
                        }
                    }
                } catch (err) {
                    console.error(err);
                    failCount++;
                }
            }
            if (successCount > 0) onNotify(`Successfully imported ${successCount} files.`, 'success');
            if (failCount > 0) onNotify(`Failed to process ${failCount} files.`, 'error');
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-black/40 shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                         SYSTEM CONFIGURATION
                    </h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={20}/></button>
                </div>

                <div className="flex bg-neutral-900/50 border-b border-neutral-800">
                    <button onClick={() => setActiveTab('CONFIG')} className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${activeTab === 'CONFIG' ? 'text-white border-b-2 border-red-500 bg-white/5' : 'text-neutral-500 hover:text-neutral-300'}`}>General</button>
                    <button onClick={() => setActiveTab('LOGS')} className={`flex-1 py-3 text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2 ${activeTab === 'LOGS' ? 'text-white border-b-2 border-red-500 bg-white/5' : 'text-neutral-500 hover:text-neutral-300'}`}><ScrollText size={12}/> Logs</button>
                </div>
                
                {activeTab === 'CONFIG' && (
                    <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                        <div className="bg-neutral-800/30 rounded-lg border border-neutral-700/50 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <FilePlus className="text-red-500" size={18}/>
                                <label className="text-xs font-bold text-white uppercase">Knowledge Base Import</label>
                            </div>
                            <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded border border-dashed transition-all cursor-pointer ${isProcessing ? 'bg-neutral-800 border-neutral-600 opacity-50 cursor-not-allowed' : 'bg-black/40 border-neutral-600 hover:border-red-500'}`}>
                                {isProcessing ? <Loader2 className="animate-spin text-red-500" size={16}/> : <Upload className="text-neutral-400" size={16}/>}
                                <span className="text-xs font-bold text-neutral-300">{isProcessing ? 'PROCESSING...' : 'SELECT FILES'}</span>
                                <input type="file" ref={fileInputRef} className="hidden" multiple accept=".json,.mmdb,.bib" onChange={handleFileImport} disabled={isProcessing} />
                            </label>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase mb-3 block">Interface Theme</label>
                            <div className="grid grid-cols-2 gap-3">
                                {themes.map(t => (
                                    <button key={t.id} onClick={() => onUpdateSettings({ ...settings, theme: t.id })} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${settings.theme === t.id ? 'bg-white/10 border-white text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}>
                                        <div className={`p-2 rounded ${t.color} text-white`}><t.icon size={16}/></div>
                                        <span className="text-sm font-bold">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-red-500 uppercase mb-3 block">Data Management</label>
                            <button onClick={() => { onClearData(); onClose(); }} className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                                <Trash2 size={16}/> CLEAR LOCAL CACHE
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'LOGS' && (
                    <div className="flex-1 bg-black/95 p-4 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-3 pb-3 border-b border-neutral-800">
                            <div className="flex gap-2">{['ALL', 'INFO', 'WARN', 'ERROR', 'SUCCESS'].map((f) => (<button key={f} onClick={() => setLogFilter(f as any)} className={`px-2 py-1 rounded text-[10px] font-bold border ${logFilter === f ? 'bg-red-500 text-black border-red-500' : 'text-neutral-500 border-neutral-700'}`}>{f}</button>))}</div>
                            <button onClick={handleCopyLogs} className="text-[10px] text-neutral-400 flex items-center gap-1"><Copy size={12}/> Copy All</button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="flex gap-2 p-1 rounded hover:bg-white/5">
                                    <span className="text-neutral-600">{log.timestamp.toLocaleTimeString()}</span>
                                    <span className={log.level === 'ERROR' ? 'text-red-500' : 'text-red-400'}>{log.level}</span>
                                    <span className="text-neutral-300">{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="p-4 bg-black/40 border-t border-neutral-800 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-6 py-2 bg-white text-black font-bold rounded text-xs flex items-center gap-2"><Save size={16}/> DONE</button>
                </div>
            </div>
        </div>
    );
};
