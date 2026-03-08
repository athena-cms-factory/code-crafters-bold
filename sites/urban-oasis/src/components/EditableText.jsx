import React, { useMemo } from 'react';
import { useDisplayConfig } from './DisplayConfigContext';

/**
 * EditableText (Docked Track v8.4)
 * Passive wrapper that binds to the Athena Dock with individual styling.
 */
export default function EditableText({ 
  tagName: Tag = 'span', 
  value, 
  children, 
  cmsBind, 
  table, 
  field, 
  id, 
  className = "", 
  style = {}, 
  renderValue, 
  ...props 
}) {
  const { isFieldVisible } = useDisplayConfig() || {};
  const isDev = import.meta.env.DEV;

  const binding = useMemo(() => cmsBind || { 
    file: table, 
    index: id !== undefined ? id : 0, 
    key: field 
  }, [cmsBind, table, id, field]);

  // 1. Visibility Check
  if (isFieldVisible && !isFieldVisible(binding.file, binding.key)) {
    return null;
  }

  const actualValue = value !== undefined ? value : children;
  const isObject = typeof actualValue === 'object' && actualValue !== null && !React.isValidElement(actualValue);

  // 2. Advanced Content Extraction
  const content = useMemo(() => {
    if (renderValue) return renderValue(actualValue);
    
    // Safety check: if it's already a primitive, return it as string
    if (typeof actualValue !== 'object' || actualValue === null || React.isValidElement(actualValue)) {
      return String(actualValue ?? "");
    }
    
    // It's an object, extract the best possible string
    const extracted = actualValue.text || 
                     actualValue.title || 
                     actualValue.label || 
                     actualValue.name || 
                     actualValue.value || 
                     actualValue.content;

    if (extracted !== undefined) return String(extracted);

    // Fallback: If it's a style-only object, we don't want to render [object Object]
    // Return empty string or something sensible
    return "";
  }, [actualValue, renderValue]);

  // Final render safety
  const safeContent = typeof content === 'string' ? content : String(content || '');

  // 3. Robust Individual Styles (v8.4 Standard)
  const individualStyle = useMemo(() => {
    if (!isObject) return style;

    // Construct Text Shadow string
    const shadowX = actualValue.shadowX !== undefined ? `${actualValue.shadowX}px` : '0px';
    const shadowY = actualValue.shadowY !== undefined ? `${actualValue.shadowY}px` : '0px';
    const shadowBlur = actualValue.shadowBlur !== undefined ? `${actualValue.shadowBlur}px` : '0px';
    const shadowColor = actualValue.shadowColor || 'rgba(0,0,0,0.5)';
    
    const hasShadow = actualValue.shadowX !== undefined || actualValue.shadowY !== undefined || actualValue.shadowBlur !== undefined;
    const textShadow = hasShadow ? `${shadowX} ${shadowY} ${shadowBlur} ${shadowColor}` : undefined;

    const styles = {
      color: actualValue.color,
      fontSize: actualValue.fontSize ? (typeof actualValue.fontSize === 'number' ? `${actualValue.fontSize}px` : actualValue.fontSize) : undefined,
      fontWeight: actualValue.fontWeight,
      fontStyle: actualValue.fontStyle,
      fontFamily: actualValue.fontFamily, // v8.4: Font Family Support
      textAlign: actualValue.textAlign,
      lineHeight: actualValue.lineHeight,
      letterSpacing: actualValue.letterSpacing,
      textTransform: actualValue.textTransform,
      textDecoration: actualValue.textDecoration,
      textShadow: textShadow, // v8.4: Advanced Shadow Support
      backgroundColor: actualValue.backgroundColor,
      borderRadius: actualValue.borderRadius ? (typeof actualValue.borderRadius === 'number' ? `${actualValue.borderRadius}px` : actualValue.borderRadius) : undefined,
      padding: actualValue.padding,
      opacity: actualValue.opacity,
      margin: actualValue.margin,
      display: actualValue.display,
      ...style
    };

    // Clean undefined keys
    return Object.fromEntries(Object.entries(styles).filter(([_, v]) => v !== undefined));
  }, [actualValue, isObject, style]);

  if (!isDev) {
    return <Tag className={className} style={individualStyle} {...props}>{safeContent}</Tag>;
  }

  // 4. Enhanced Metadata for Dock
  const dockBind = JSON.stringify({
    file: binding.file,
    index: binding.index,
    key: binding.key
  });

  // Dynamic type detection
  const tagStr = typeof Tag === 'string' ? Tag.toLowerCase() : '';
  const dockType = tagStr.match(/^h[1-6]$/) ? 'heading' : (tagStr === 'p' ? 'paragraph' : 'text');
  
  // Human readable label (Site Title -> site_title)
  const dockLabel = field ? field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : binding.key;

  return (
    <Tag
      data-dock-bind={dockBind}
      data-dock-type={dockType}
      data-dock-label={dockLabel}
      className={`${className} cursor-pointer hover:ring-2 hover:ring-blue-400/40 hover:bg-blue-50/5 rounded-sm transition-all duration-200`}
      style={individualStyle}
      title={`Shift+Klik om "${dockLabel}" te bewerken in de Dock`}
      {...props}
    >
      {safeContent}
    </Tag>
  );
}
