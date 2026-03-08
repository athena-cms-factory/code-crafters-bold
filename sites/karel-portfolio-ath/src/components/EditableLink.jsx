import React, { useMemo } from 'react';
import { useDisplayConfig } from './DisplayConfigContext';

/**
 * EditableLink (Docked Track v8.4.1)
 * Passive wrapper that binds to the Athena Dock with individual styling support.
 */
export default function EditableLink({ 
  url, 
  label,
  children,
  className = "",
  style = {},
  cmsBind, 
  table, 
  field, 
  id, 
  as: Tag = 'a',
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

  const isObject = typeof url === 'object' && url !== null && !React.isValidElement(url);
  const actualValue = url;

  // 2. Advanced Content Extraction
  const finalLabel = useMemo(() => {
    if (label) return label;
    if (!isObject) return "";
    return actualValue.label || actualValue.text || actualValue.title || "";
  }, [label, isObject, actualValue]);

  const finalUrl = useMemo(() => {
    if (!isObject) return actualValue || "";
    return actualValue.url || "";
  }, [isObject, actualValue]);

  const actualUrl = useMemo(() => {
    if (!finalUrl) return "";
    if (finalUrl.startsWith('http') || finalUrl.startsWith('/') || finalUrl.startsWith('#')) return finalUrl;
    return `${import.meta.env.BASE_URL}${finalUrl}`.replace(/\/+/g, '/');
  }, [finalUrl]);

  const content = finalLabel || children || actualUrl;
  const safeContent = typeof content === 'object' && !React.isValidElement(content) ? (content.text || content.label || JSON.stringify(content)) : content;

  // 3. Robust Individual Styles (v8.4.1 Standard)
  const individualStyle = useMemo(() => {
    if (!isObject) return style;

    const styles = {
      color: actualValue.color,
      fontSize: actualValue.fontSize ? (typeof actualValue.fontSize === 'number' ? `${actualValue.fontSize}px` : actualValue.fontSize) : undefined,
      fontWeight: actualValue.fontWeight,
      fontStyle: actualValue.fontStyle,
      fontFamily: actualValue.fontFamily,
      textAlign: actualValue.textAlign,
      backgroundColor: actualValue.backgroundColor,
      borderRadius: actualValue.borderRadius ? (typeof actualValue.borderRadius === 'number' ? `${actualValue.borderRadius}px` : actualValue.borderRadius) : undefined,
      padding: actualValue.padding,
      ...style
    };

    return Object.fromEntries(Object.entries(styles).filter(([_, v]) => v !== undefined));
  }, [actualValue, isObject, style]);

  if (!isDev) {
    return (
      <Tag href={Tag === 'a' ? actualUrl : undefined} className={className} style={individualStyle} {...props}>
        {safeContent}
      </Tag>
    );
  }

  const dockBind = JSON.stringify({
    file: binding.file,
    index: binding.index,
    key: binding.key
  });

  const dockLabel = field ? field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : binding.key;

  return (
    <Tag
      href={Tag === 'a' ? actualUrl : undefined}
      data-dock-bind={dockBind}
      data-dock-type="link"
      data-dock-label={dockLabel}
      className={`${className} cursor-pointer hover:ring-2 hover:ring-blue-400/40 rounded-sm transition-all`}
      style={individualStyle}
      title={`Shift+Klik om "${dockLabel}" te bewerken in de Dock (Normale klik om link te volgen)`}
      {...props}
    >
      {safeContent}
    </Tag>
  );
}
