import React, { createContext, useContext, useEffect, useState } from 'react';

const StyleContext = createContext();

export const useStyles = () => useContext(StyleContext);

/**
 * StyleProvider for docked track.
 * Reads style_config from data and applies CSS variables to :root.
 * Dock can override these variables via postMessage.
 */
export const StyleProvider = ({ children, data = {} }) => {
    const styleConfig = Array.isArray(data.style_config)
        ? (data.style_config[0] || {})
        : (data.style_config || {});

    const [styles, setStyles] = useState(styleConfig);

    // Apply CSS variables to :root whenever styles change
    useEffect(() => {
        const root = document.documentElement;
        
        const applyVariables = (targetStyles, selector = '') => {
            Object.entries(targetStyles).forEach(([key, value]) => {
                if (key.startsWith('_')) return; // Skip metadata
                if (key.startsWith('--')) {
                    if (selector === '.dark') {
                        // For dark mode, we use a CSS rule to ensure it only applies when .dark is present
                        // Note: This is a simplified approach, real implementation might use a stylesheet
                        // For now, we'll just set the variables directly if root has .dark
                        if (root.classList.contains('dark')) {
                            root.style.setProperty(key, value);
                        }
                    } else {
                        root.style.setProperty(key, value);
                    }
                }
            });
        };

        // Apply light/default variables
        applyVariables(styles);

        // Apply dark mode overrides if present and active
        if (styles._dark_mode && root.classList.contains('dark')) {
            applyVariables(styles._dark_mode);
        }

        // Add a mutation observer to re-apply if .dark class is toggled
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    applyVariables(styles);
                    if (styles._dark_mode && root.classList.contains('dark')) {
                        applyVariables(styles._dark_mode);
                    }
                }
            });
        });

        observer.observe(root, { attributes: true });

        return () => {
            observer.disconnect();
            // Cleanup: remove custom properties on unmount
            Object.keys(styles).forEach(key => {
                if (key.startsWith('--')) root.style.removeProperty(key);
            });
            if (styles._dark_mode) {
                Object.keys(styles._dark_mode).forEach(key => {
                    if (key.startsWith('--')) root.style.removeProperty(key);
                });
            }
        };
    }, [styles]);

    // Listen for Dock style updates via postMessage
    useEffect(() => {
        const handler = (event) => {
            if (event.data?.type === 'athena-style-update' && event.data.styles) {
                setStyles(prev => ({ ...prev, ...event.data.styles }));
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    return (
        <StyleContext.Provider value={{ styles, setStyles }}>
            {children}
        </StyleContext.Provider>
    );
};

export default StyleContext;
