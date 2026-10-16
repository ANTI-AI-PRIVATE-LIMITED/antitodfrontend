
import { OtxSandboxReport } from '../types';

// Security Fix: Hardcoded OTX API key removed from frontend bundle.
// Sandbox file analysis screens are disabled for v1.0. Backend proxy integration coming in v1.1.

export const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const submitFileToSandbox = async (_file: File): Promise<{ sha256: string, result: string }> => {
    // Disabled in client bundle to protect API keys. Egress transition coming in v1.1.
    throw new Error('OTX Sandbox submission is disabled for v1. Backend proxy integration coming in v1.1.');
};

export const getSandboxAnalysis = async (_hash: string): Promise<OtxSandboxReport | null> => {
    // Disabled in client bundle to protect API keys.
    return null;
};

