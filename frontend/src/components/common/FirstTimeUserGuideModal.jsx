import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Code2,
  Globe,
  Headphones,
  MessageSquare,
  HardDrive,
  Clock,
  Shield,
  HelpCircle,
  PenTool,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function FirstTimeUserGuideModal({ isOpen, onClose, onOpenAudioHelp }) {
  const [activeTopic, setActiveTopic] = useState('welcome');

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '92%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 24px 50px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <HelpCircle size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.15rem', margin: 0 }}>
                First-Time User Guide &amp; Workspace Help
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Learn everything you need to collaborate seamlessly on L2gether
              </p>
            </div>
          </div>
          <button className="btn btn-subtle btn-icon sm" onClick={onClose} aria-label="Close guide">
            <X size={18} />
          </button>
        </div>

        {/* Topic Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '12px' }}>
          {[
            { id: 'welcome', label: 'Overview', icon: Sparkles },
            { id: 'editor', label: 'Code Workspace', icon: Code2 },
            { id: 'preview', label: 'Live Preview', icon: Globe },
            { id: 'audio', label: 'Voice & Echo Guide', icon: Headphones },
            { id: 'chat_files', label: 'Chat & Files', icon: MessageSquare },
            { id: 'whiteboard', label: 'Whiteboard', icon: PenTool },
            { id: 'lifecycle', label: '7-Day Policy', icon: Clock }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTopic === t.id;
            return (
              <button
                key={t.id}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-subtle'}`}
                onClick={() => setActiveTopic(t.id)}
                style={{
                  fontSize: '0.76rem',
                  padding: '4px 10px',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Icon size={13} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Topic Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          {activeTopic === 'welcome' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  Welcome to L2gether!
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5 }}>
                  L2gether is an ephemeral collaborative workspace built for hackathons, pair programming, debugging, and project reviews. No mandatory account creation, zero email logins, and zero clutter.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px', backgroundColor: 'var(--bg-panel)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Code2 size={16} color="var(--accent-primary)" /> Instant Pairing
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem' }}>
                    Share your room link or QR code. Teammates join in seconds and see live edits, cursors, and files.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px', backgroundColor: 'var(--bg-panel)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Headphones size={16} color="var(--accent-secondary)" /> Peer-to-Peer Voice
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem' }}>
                    High-definition group audio call powered by WebRTC mesh with active noise suppression and auto gain.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'editor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                Collaborative Code Editor
              </h4>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                <li><strong>Multi-File Project Explorer:</strong> Create, rename, delete files, and organize subfolders. Swipe right from the left edge on mobile to reveal.</li>
                <li><strong>Multi-Cursor Awareness:</strong> Real-time remote cursors, selections, and typing badges show exactly where peers are working.</li>
                <li><strong>Emmet &amp; Templates:</strong> Type <code>!</code> or <code>html:5</code> in an HTML file or click the Wand icon in the toolbar to pick rich project templates.</li>
                <li><strong>Locking System:</strong> The room host can lock editing or lock individual files to present or maintain code integrity.</li>
              </ul>
            </div>
          )}

          {activeTopic === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                Live Sandboxed Web Preview
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                Preview HTML, CSS, JavaScript, and React components inside an isolated, sandboxed iframe. Changes update in real time as you edit.
              </p>
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                <strong>Key Features:</strong>
                <ul style={{ paddingLeft: '1.2rem', margin: '6px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Responsive viewport toggle: Desktop, Tablet, and Mobile views.</li>
                  <li>In-browser Console Logs tab captures <code>console.log</code>, warnings, and errors.</li>
                  <li>1-click Package Manager: inject 35+ CDNs (Bootstrap, Tailwind, Lucide, FontAwesome).</li>
                </ul>
              </div>
            </div>
          )}

          {activeTopic === 'audio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Headphones size={16} color="var(--accent-primary)" />
                  WebRTC Voice Quality &amp; Echo Prevention
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  L2gether enables <strong>Echo Cancellation</strong>, <strong>Noise Suppression</strong>, and <strong>Auto Gain Control</strong> by default.
                </p>
              </div>

              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                <strong style={{ color: 'var(--text-main)' }}>🎧 Important for Same-Room Collaborators:</strong>
                <p style={{ margin: '4px 0 8px 0', fontSize: '0.78rem' }}>
                  If two or more devices are on the same table or within 0–2 metres, speaker audio can enter the other microphone and create an echo loop.
                  <strong> Solution:</strong> Always wear headphones when in the same physical space, or mute when not speaking!
                </p>
                {onOpenAudioHelp && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      onClose();
                      onOpenAudioHelp();
                    }}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    View Detailed Distance &amp; Echo Matrix &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTopic === 'chat_files' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                Team Chat &amp; Shared File Storage
              </h4>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                <li><strong>Formatted Code Snippets:</strong> Share syntax-highlighted snippets in chat with a 1-click copy button.</li>
                <li><strong>@Username Mentions:</strong> Type <code>@</code> in chat to mention and alert specific room participants.</li>
                <li><strong>File Uploads:</strong> Drag-and-drop assets, PDFs, and ZIP files up to 25MB. Files are secured with room-isolated keys.</li>
              </ul>
            </div>
          )}

          {activeTopic === 'whiteboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                Interactive Whiteboard
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                Sketch architectural diagrams, flowcharts, or wireframes with freehand ink, lines, rectangles, circles, and text.
              </p>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                <li><strong>Docked or Floating Mode:</strong> Slide the whiteboard in as a side drawer or pop it out into a movable window.</li>
                <li><strong>Share to Chat:</strong> 1-click snapshot sends the current drawing directly into the room's chat feed.</li>
              </ul>
            </div>
          )}

          {activeTopic === 'lifecycle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} color="var(--state-warning)" />
                  Automated 7-Day Room Expiration Guarantee
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.5 }}>
                  Every room is ephemeral and automatically purges 7 days from creation. When a room expires, all files, chat logs, code revisions, and audio connections are permanently deleted from server memory and disk.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Need help? Click <strong>?</strong> anytime in the navigation bar.
          </span>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
