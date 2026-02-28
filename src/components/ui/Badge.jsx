import React from 'react';

/**
 * UI Badge Component
 * For tags, categories, and status indicators
 */
export default function Badge({ children, variant = 'accent', className = "" }) {
  const base = "inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest";
  
  const variants = {
    accent: "bg-accent/10 text-accent",
    primary: "bg-primary text-white",
    outline: "border border-slate-200 text-slate-500"
  };

  return (
    <span className={`${base} ${variants[variant] || variants.accent} ${className}`}>
      {children}
    </span>
  );
}
