import React, { useState } from 'react';

/**
 * EditableImage (Legacy Alias for EditableMedia)
 * Maakt afbeeldingen versleepbaar en bewerkbaar.
 */
export default function EditableImage({ src, alt, className, cmsBind, ...props }) {
  const isDev = import.meta.env.DEV;
  const [isHovering, setIsHovering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e) => {
    if (!isDev) return;
    e.preventDefault();
    e.stopPropagation();
    if (!isHovering) setIsHovering(true);
  };

  const handleDragLeave = (e) => {
    if (!isDev) return;
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(false);
  };

  const handleDrop = async (e) => {
    if (!isDev) return;
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        alert("Alleen afbeeldingen zijn toegestaan.");
        return;
      }

      setIsUploading(true);

      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const uploadUrl = `${baseUrl}__athena/upload`.replace(/\/+/g, '/');
        const updateUrl = `${baseUrl}__athena/update-json`.replace(/\/+/g, '/');

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'X-Filename': file.name },
          body: file
        });

        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.error || "Upload failed");

        await fetch(updateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: cmsBind.file,
            index: cmsBind.index || 0,
            key: cmsBind.key,
            value: uploadData.filename
          })
        });

        window.location.reload();
      } catch (err) {
        console.error("❌ Upload Error:", err);
        alert("Fout bij uploaden: " + err.message);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const finalSrc = (src && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:'))
    ? `${import.meta.env.BASE_URL}${src.startsWith('images/') ? '' : 'images/'}${src}`.replace(/\/+/g, '/')
    : src;

  if (!isDev) {
    return <img src={finalSrc} alt={alt} className={className} {...props} />;
  }

  return (
    <div
      className={`relative group ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <img src={finalSrc} alt={alt} className="w-full h-full object-cover" {...props} />

      <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center transition-opacity duration-300 pointer-events-none" style={{ opacity: isHovering || isUploading ? 1 : 0 }}>
        <div className="bg-black/80 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase border border-white/20">
          {isUploading ? "Uploaden..." : "Afbeelding Hier Slepen"}
        </div>
      </div>
    </div>
  );
}
