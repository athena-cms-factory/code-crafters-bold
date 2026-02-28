import React from 'react';
import { useDisplayConfig } from './DisplayConfigContext';

/**
 * EditableLink (Docked Track)
 */
export default function EditableLink({ 
  url, 
  label,
  children,
  className = "",
  cmsBind, 
  table, 
  field, 
  id, 
  as: Tag = 'a',
  ...props 
}) {
  const { isFieldVisible } = useDisplayConfig() || {};
  const isDev = import.meta.env.DEV;
  const binding = cmsBind || { file: table, index: id, key: field };

  // v7.8.7: Support object-based link data (label + url)
  const isObjectValue = typeof url === 'object' && url !== null;
  const finalLabel = isObjectValue ? (url.label || label) : label;
  const finalUrl = isObjectValue ? (url.url || url) : url;

  // Visibility Check
  if (isFieldVisible && !isFieldVisible(binding.file, binding.key)) {
    return null;
  }

  const actualUrl = (finalUrl && !finalUrl.startsWith('http') && !finalUrl.startsWith('/') && !finalUrl.startsWith('#'))
    ? `${import.meta.env.BASE_URL}${finalUrl}`.replace(/\/+/g, '/')
    : finalUrl;

  const content = finalLabel || children || actualUrl;

  if (!isDev) {
    return (
      <Tag href={Tag === 'a' ? actualUrl : undefined} className={className} {...props}>
        {content}
      </Tag>
    );
  }

  const dockBind = JSON.stringify({
    file: binding.file,
    index: binding.index || 0,
    key: binding.key
  });

  return (
    <Tag
      href={Tag === 'a' ? actualUrl : undefined}
      data-dock-bind={dockBind}
      data-dock-type="link"
      className={`${className} cursor-pointer hover:ring-2 hover:ring-blue-400/40 rounded-sm transition-all`}
      title={`Klik om "${binding.key}" te bewerken in de Dock (Shift+Klik om actie uit te voeren)`}
      {...props}
    >
      {content}
    </Tag>
  );
}
