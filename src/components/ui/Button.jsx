import React from 'react';

/**
 * UI Button Component
 * Supports links (href) and actions (onClick)
 */
export default function Button({ children, href, onClick, variant = 'primary', className = "" }) {
  const base = "inline-flex items-center justify-center px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-accent hover:shadow-lg shadow-primary/20",
    secondary: "bg-white text-primary border border-slate-200 hover:border-accent hover:text-accent",
    ghost: "bg-transparent text-primary hover:text-accent"
  };

  const combinedClasses = `${base} ${variants[variant] || variants.primary} ${className}`;

  if (href) {
    return <a href={href} className={combinedClasses}>{children}</a>;
  }

  return (
    <button onClick={onClick} className={combinedClasses}>
      {children}
    </button>
  );
}
