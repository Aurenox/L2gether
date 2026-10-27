import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

export default function SectionHelpButton({
  title = 'Section Help',
  description = '',
  tips = [],
  shortcuts = [],
  align = 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const containerRef = useRef(null);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popWidth = Math.min(320, window.innerWidth - 24);
      let top = rect.bottom + 8;
      if (top + 340 > window.innerHeight) {
        top = Math.max(12, rect.top - 330);
      }

      let left = rect.right - popWidth;
      if (align === 'left') {
        left = rect.left;
      }
      if (left + popWidth > window.innerWidth - 12) {
        left = window.innerWidth - popWidth - 12;
      }
      if (left < 12) {
        left = 12;
      }

      setCoords({ top, left, width: popWidth });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen, align]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        className={`btn btn-subtle btn-icon sm ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        title={`Help & Tips: ${title} (?)`}
        aria-label={`Help & Tips for ${title}`}
        style={{
          width: '28px',
          height: '28px',
          color: isOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
          borderRadius: 'var(--radius-sm)'
        }}
      >
        <HelpCircle size={15} />
      </button>

      {isOpen && (
        <div
          className="section-help-popover"
          style={{
            position: 'fixed',
            top: coords ? `${coords.top}px` : '60px',
            left: coords ? `${coords.left}px` : 'auto',
            right: !coords ? '16px' : 'auto',
            width: coords ? `${coords.width}px` : '320px',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
            backgroundColor: '#111520',
            border: '1px solid #232A3B',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.75)',
            padding: '0.85rem',
            zIndex: 100000,
            animation: 'fadeIn 0.15s ease-out',
            color: 'var(--text-main, #FFFFFF)'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              paddingBottom: '0.45rem',
              borderBottom: '1px solid #232A3B'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HelpCircle size={15} color="var(--accent-primary, #3B82F6)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{title}</span>
            </div>
            <button
              type="button"
              className="btn btn-subtle btn-icon sm"
              onClick={() => setIsOpen(false)}
              title="Close Help"
              style={{ width: '20px', height: '20px', padding: 0 }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Description */}
          {description && (
            <p
              style={{
                fontSize: '0.78rem',
                color: '#94A3B8',
                lineHeight: 1.45,
                margin: '0 0 0.65rem 0'
              }}
            >
              {description}
            </p>
          )}

          {/* Tips List */}
          {tips.length > 0 && (
            <div style={{ marginBottom: shortcuts.length > 0 ? '0.65rem' : 0 }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--accent-primary, #3B82F6)',
                  fontWeight: 600,
                  marginBottom: '0.35rem'
                }}
              >
                Key Features &amp; Tips
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '1.1rem',
                  fontSize: '0.75rem',
                  color: '#CBD5E1',
                  lineHeight: 1.45
                }}
              >
                {tips.map((tip, idx) => (
                  <li key={idx} style={{ marginBottom: '0.25rem' }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Shortcuts List */}
          {shortcuts.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                padding: '0.45rem 0.6rem',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#94A3B8',
                  fontWeight: 600,
                  marginBottom: '0.3rem'
                }}
              >
                Shortcuts
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {shortcuts.map((sc, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.73rem'
                    }}
                  >
                    <span style={{ color: '#94A3B8' }}>{sc.label}</span>
                    <kbd
                      style={{
                        backgroundColor: '#1E293B',
                        color: '#F8FAFC',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        border: '1px solid #334155',
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono, monospace)'
                      }}
                    >
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
