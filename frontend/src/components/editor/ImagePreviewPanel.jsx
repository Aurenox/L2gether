import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Copy,
  Check,
  Download,
  Code2,
  Eye,
  Image as ImageIcon,
  FileText
} from 'lucide-react';

export default function ImagePreviewPanel({
  filePath = '',
  content = '',
  onSwitchToSource = null,
  readOnly = false
}) {
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedData, setCopiedData] = useState(false);
  const imgRef = useRef(null);

  const ext = filePath.split('.').pop().toLowerCase();
  const fileName = filePath.split('/').pop();
  const isSvg = ext === 'svg';

  // Determine src for image element
  const imageSrc = (() => {
    if (!content) return '';
    if (content.startsWith('data:')) return content;
    if (isSvg) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(content)}`;
    }
    return content;
  })();

  // Calculate approximate file size in KB/MB
  const fileSizeText = (() => {
    if (!content) return '0 B';
    // If base64 data url, calculate decoded byte size
    if (content.startsWith('data:')) {
      const base64Part = content.split(',')[1] || '';
      const bytes = Math.round((base64Part.length * 3) / 4);
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  })();

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setDimensions({ width: naturalWidth, height: naturalHeight });
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleResetZoom = () => setZoom(1);

  const handleCopyHtml = () => {
    const htmlTag = `<img src="${filePath}" alt="${fileName}" />`;
    navigator.clipboard.writeText(htmlTag);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleCopyDataUri = () => {
    navigator.clipboard.writeText(imageSrc);
    setCopiedData(true);
    setTimeout(() => setCopiedData(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Top Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.45rem 1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '0.8rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        {/* Left: Image Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--accent-primary, #6366F1)',
              fontWeight: 600
            }}
          >
            <ImageIcon size={15} />
            <span style={{ color: '#F1F5F9' }}>{fileName}</span>
          </div>

          <span
            className="badge badge-subtle"
            style={{
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              backgroundColor: '#1C2333',
              padding: '2px 7px',
              borderRadius: '4px',
              color: '#94A3B8'
            }}
          >
            {ext}
          </span>

          {dimensions.width > 0 && (
            <span style={{ color: '#64748B', fontSize: '0.75rem' }}>
              {dimensions.width} × {dimensions.height} px • {fileSizeText}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {isSvg && onSwitchToSource && (
            <button
              className="btn btn-subtle btn-sm"
              onClick={onSwitchToSource}
              title="Edit SVG source code in Monaco Editor"
              style={{ fontSize: '0.73rem', padding: '3px 8px' }}
            >
              <Code2 size={13} />
              <span>Edit SVG Code</span>
            </button>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#181E2B',
              borderRadius: '5px',
              padding: '2px 4px',
              gap: '2px',
              border: '1px solid #2A3447'
            }}
          >
            <button
              className="btn-icon sm btn-subtle"
              onClick={handleZoomOut}
              title="Zoom Out"
              style={{ padding: '3px' }}
            >
              <ZoomOut size={13} />
            </button>
            <span
              onClick={handleResetZoom}
              title="Click to reset zoom to 100%"
              style={{
                fontSize: '0.72rem',
                minWidth: '42px',
                textAlign: 'center',
                cursor: 'pointer',
                color: '#CBD5E1',
                padding: '0 4px'
              }}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="btn-icon sm btn-subtle"
              onClick={handleZoomIn}
              title="Zoom In"
              style={{ padding: '3px' }}
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            className="btn btn-subtle btn-sm"
            onClick={handleCopyHtml}
            title="Copy HTML <img> tag with this file path"
            style={{ fontSize: '0.73rem', padding: '3px 8px' }}
          >
            {copiedHtml ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
            <span>{copiedHtml ? 'Copied HTML!' : 'Copy <img />'}</span>
          </button>

          <button
            className="btn btn-subtle btn-sm"
            onClick={handleCopyDataUri}
            title="Copy base64 data URI to clipboard"
            style={{ fontSize: '0.73rem', padding: '3px 8px' }}
          >
            {copiedData ? <Check size={12} color="#10B981" /> : <FileText size={12} />}
            <span>{copiedData ? 'Copied URI!' : 'Data URI'}</span>
          </button>

          <button
            className="btn btn-subtle btn-sm"
            onClick={handleDownload}
            title="Download image to your computer"
            style={{ fontSize: '0.73rem', padding: '3px 8px' }}
          >
            <Download size={12} />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Main Preview Viewport with Checkerboard Background */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          position: 'relative',
          padding: '2rem',
          backgroundImage: `
            linear-gradient(45deg, #121620 25%, transparent 25%), 
            linear-gradient(-45deg, #121620 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #121620 75%), 
            linear-gradient(-45deg, transparent 75%, #121620 75%)
          `,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
          backgroundColor: '#090C12'
        }}
      >
        {imageSrc ? (
          <img
            ref={imgRef}
            src={imageSrc}
            alt={fileName}
            onLoad={handleImageLoad}
            style={{
              maxWidth: zoom <= 1 ? '100%' : 'none',
              maxHeight: zoom <= 1 ? '100%' : 'none',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          />
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No image data available.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.35rem 1rem',
          backgroundColor: '#0E1119',
          borderTop: '1px solid #1D2331',
          fontSize: '0.73rem',
          color: '#64748B'
        }}
      >
        <span>Path: <strong style={{ color: '#94A3B8' }}>{filePath}</strong></span>
        <span>Drag & drop images anywhere into code workspace or folders</span>
      </div>
    </div>
  );
}
