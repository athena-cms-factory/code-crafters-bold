import React from 'react';

/**
 * UI Card Component
 * Standard container with consistent styling (shadows, rounded corners, bg)
 */
export default function Card({ children, className = "", hover = true, padding = "p-8" }) {
  const baseClasses = "bg-surface rounded-3xl border border-slate-100 shadow-soft";
  const hoverClasses = hover ? "transition-all duration-500 hover:shadow-xl hover:-translate-y-1" : "";
  
  return (
    <article className={`${baseClasses} ${hoverClasses} ${padding} ${className}`}>
      {children}
    </article>
  );
}
