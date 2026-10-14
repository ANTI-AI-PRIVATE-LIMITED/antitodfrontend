import React from 'react';
import { Server, ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'No Honeypots Connected Yet',
  description = 'Deploy your first honeypot shipper or connect a server node to begin intercepting live adversary traffic, scanning attacks, and compiling threat intelligence.',
  actionLabel = 'Connect Your First Honeypot',
  onAction,
  secondaryLabel,
  onSecondaryAction,
  compact = false,
}) => {
  return (
    <div
      className={`relative w-full rounded-2xl border border-neutral-800 bg-gradient-to-b from-[#11141c]/90 to-[#0a0c10]/95 backdrop-blur-md shadow-2xl overflow-hidden font-mono text-center flex flex-col items-center justify-center ${
        compact ? 'p-8 my-4' : 'p-12 md:p-16 my-6'
      }`}
    >
      {/* Subtle grid background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      {/* Glowing Icon Wrapper */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-950/80 to-neutral-900 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10">
          {icon || <Server className="w-8 h-8 text-red-400" />}
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-400">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg md:text-xl font-bold text-white tracking-wide mb-2 max-w-lg">
        {title}
      </h3>

      {/* Description */}
      <p className="text-xs md:text-sm text-neutral-400 max-w-xl leading-relaxed mb-8">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-600/25 hover:shadow-red-600/40 cursor-pointer"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {secondaryLabel && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="px-4 py-2.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-neutral-400" />
            <span>{secondaryLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
