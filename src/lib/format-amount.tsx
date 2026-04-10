import React, { useState, useRef, useCallback } from 'react';

/**
 * Abbreviate large numbers: 1K, 1L (lakh), 1Cr, 1M, 1B
 * Uses Indian system if currency is ₹, otherwise western.
 */
export function abbreviateNumber(n: number, currency: string = '₹'): { short: string; full: string; isAbbreviated: boolean } {
  const abs = Math.abs(n);
  const locale = currency === '₹' ? 'en-IN' : 'en-US';
  const full = currency + abs.toLocaleString(locale);

  // Only abbreviate for 6+ digit numbers (≥100000)
  if (currency === '₹') {
    if (abs >= 10000000) return { short: `${currency}${(abs / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`, full, isAbbreviated: true };
    if (abs >= 100000) return { short: `${currency}${(abs / 100000).toFixed(1).replace(/\.0$/, '')}L`, full, isAbbreviated: true };
  } else {
    if (abs >= 1000000000) return { short: `${currency}${(abs / 1000000000).toFixed(1).replace(/\.0$/, '')}B`, full, isAbbreviated: true };
    if (abs >= 1000000) return { short: `${currency}${(abs / 1000000).toFixed(1).replace(/\.0$/, '')}M`, full, isAbbreviated: true };
    if (abs >= 100000) return { short: `${currency}${(abs / 100000).toFixed(0)}K`, full, isAbbreviated: true };
  }

  return { short: full, full, isAbbreviated: false };
}

/**
 * Component that shows abbreviated amount with long-press tooltip for full number.
 */
export function SmartAmount({ amount, currency = '₹', prefix = '', className = '', sign }: {
  amount: number;
  currency?: string;
  prefix?: string;
  className?: string;
  sign?: '+' | '-' | '';
}) {
  const { short, full, isAbbreviated } = abbreviateNumber(amount, currency);
  const [showFull, setShowFull] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDown = useCallback(() => {
    if (!isAbbreviated) return;
    timer.current = setTimeout(() => setShowFull(true), 400);
  }, [isAbbreviated]);

  const handleUp = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (showFull) setTimeout(() => setShowFull(false), 1500);
  }, [showFull]);

  const signStr = sign ?? '';

  return (
    <span className={`relative inline-flex items-center ${className}`} 
      onPointerDown={handleDown} onPointerUp={handleUp} onPointerLeave={handleUp}>
      {prefix}{signStr}{short}
      {showFull && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-lg bg-popover border border-border px-2.5 py-1 text-xs font-semibold text-popover-foreground shadow-lg">
          {signStr}{full}
        </span>
      )}
    </span>
  );
}
