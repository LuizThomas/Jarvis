import React from 'react';

interface JarvisEmblemProps {
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function JarvisEmblem({ isLoading = false, size = 'md' }: JarvisEmblemProps) {
  const dimensionClass = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-20 h-20' : 'w-16 h-16';

  return (
    <div className={`relative flex items-center justify-center ${dimensionClass} select-none`}>
      {/* Outer ambient glow */}
      <div
        className={`absolute inset-0 rounded-full bg-cyan-400/25 blur-lg transition-all duration-500 ${
          isLoading ? 'animate-pulse scale-125 bg-cyan-300/40' : 'group-hover:scale-110 group-hover:bg-cyan-400/40'
        }`}
      />

      {/* Outer rotating HUD ring (clockwise) */}
      <svg
        className="absolute inset-0 w-full h-full animate-[spin_14s_linear_infinite]"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="rgba(6, 182, 212, 0.4)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="rgba(34, 211, 238, 0.8)"
          strokeWidth="2"
          strokeDasharray="18 10 4 10"
        />
      </svg>

      {/* Counter-rotating inner ring (counter-clockwise) with reactor segments */}
      <svg
        className="absolute inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)] animate-[spin_9s_linear_infinite_reverse]"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="rgba(6, 182, 212, 0.5)"
          strokeWidth="1.5"
          strokeDasharray="12 12"
        />
        {/* Arc reactor coil markers */}
        <polygon points="50,12 55,24 45,24" fill="rgba(34, 211, 238, 0.9)" />
        <polygon points="50,88 55,76 45,76" fill="rgba(34, 211, 238, 0.9)" />
        <polygon points="12,50 24,55 24,45" fill="rgba(34, 211, 238, 0.9)" />
        <polygon points="88,50 76,55 76,45" fill="rgba(34, 211, 238, 0.9)" />
      </svg>

      {/* Static grid / optical reticle */}
      <svg className="absolute inset-3 w-[calc(100%-24px)] h-[calc(100%-24px)]" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke="rgba(6, 182, 212, 0.3)"
          strokeWidth="1"
        />
        <line x1="50" y1="20" x2="50" y2="80" stroke="rgba(6, 182, 212, 0.25)" strokeWidth="0.8" />
        <line x1="20" y1="50" x2="80" y2="50" stroke="rgba(6, 182, 212, 0.25)" strokeWidth="0.8" />
      </svg>

      {/* Central Core & Letter J */}
      <div className="relative z-10 w-7 h-7 rounded-full bg-zinc-950 border border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.9)]">
        <span className="font-mono text-xs font-black text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]">
          J
        </span>
      </div>

      {/* Active pulse beacon when thinking */}
      {isLoading && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 z-20">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border border-zinc-950" />
        </span>
      )}
    </div>
  );
}
