import React, { useLayoutEffect } from 'react';

/**
 * StyleInjector
 * Synchronizes Athena JSON settings with CSS Custom Properties (Variables).
 * This ensures the site looks correct both in standalone mode and in the Dock.
 */
const StyleInjector = ({ siteSettings }) => {
  const settings = Array.isArray(siteSettings) ? (siteSettings[0] || {}) : (siteSettings || {});

  useLayoutEffect(() => {
    const root = document.documentElement;
    const isDark = settings.theme === 'dark';

    // 1. Theme Toggle
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // 2. Map Settings to CSS Variables
    const prefix = isDark ? 'dark_' : 'light_';
    
    // Core Colors Mapping
    const mappings = {
      'primary_color': ['--color-primary', '--primary-color'],
      'title_color': ['--color-title'],
      'heading_color': ['--color-heading'],
      'accent_color': ['--color-accent'],
      'button_color': ['--color-button'],
      'card_color': ['--color-card', '--bg-surface'],
      'header_color': ['--color-header', '--bg-header'],
      'bg_color': ['--color-background', '--bg-site'],
      'text_color': ['--color-text']
    };

    Object.entries(mappings).forEach(([key, vars]) => {
      const val = settings[`${prefix}${key}`];
      if (val) {
        vars.forEach(v => root.style.setProperty(v, val));
      }
    });

    // 3. Global Variables
    if (settings.global_radius) root.style.setProperty('--radius-custom', settings.global_radius);

    // Hero overlay: convert opacity to rgba values used by Section.jsx gradient
    if (settings.hero_overlay_opacity !== undefined) {
      let opacity = parseFloat(settings.hero_overlay_opacity);
      if (isNaN(opacity)) opacity = 0.8;
      root.style.setProperty('--hero-overlay-start', `rgba(0, 0, 0, ${opacity})`);
      root.style.setProperty('--hero-overlay-end', `rgba(0, 0, 0, ${opacity * 0.4})`);
    }

    if (settings.content_top_offset !== undefined) root.style.setProperty('--content-top-offset', `${settings.content_top_offset}px`);
    if (settings.header_height !== undefined) root.style.setProperty('--header-height', `${settings.header_height}px`);

    // Header transparency
    if (settings.header_transparent === true) {
      root.style.setProperty('--header-bg', 'transparent');
      root.style.setProperty('--header-blur', 'none');
      root.style.setProperty('--header-border', 'none');
    } else if (settings.header_transparent === false) {
      root.style.removeProperty('--header-bg');
      root.style.removeProperty('--header-blur');
      root.style.removeProperty('--header-border');
    }

  }, [settings]);

  return null; // This component doesn't render anything
};

export default StyleInjector;
