import React from 'react';
import {
  X,
  Headphones,
  Volume2,
  Mic,
  MicOff,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Radio,
  Sliders
} from 'lucide-react';

export default function AudioEchoHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.35)',
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
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <Headphones size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.15rem', margin: 0 }}>
                Audio Quality &amp; Echo Prevention Guide
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                WebRTC Real-Time Voice Optimization
              </p>
            </div>
          </div>
          <button className="btn btn-subtle btn-icon sm" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingRight: '4px' }}>
          {/* Key Callout Banner */}
          <div
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <Headphones size={22} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                Golden Rule: Always Wear Headphones in the Same Room
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                When two or more devices are on the same table or in the same room, speakers play into each other's microphones. Wearing headphones instantly eliminates speaker-to-mic acoustic feedback loops.
              </p>
            </div>
          </div>

          {/* 1. Distance & Acoustic Feedback Matrix */}
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={15} color="var(--state-warning)" />
              1. Minimum Distance Between Devices (Without Headphones)
            </h4>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Distance</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>0 – 1 metre</td>
                    <td style={{ padding: '7px 10px', color: 'var(--state-error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} /> High risk of echo &amp; harsh feedback
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>1 – 2 metres</td>
                    <td style={{ padding: '7px 10px', color: 'var(--state-warning)' }}>
                      Echo may still occur depending on volume
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>2 – 3 metres</td>
                    <td style={{ padding: '7px 10px', color: 'var(--text-secondary)' }}>
                      Usually better, but echo is still possible
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>3+ metres</td>
                    <td style={{ padding: '7px 10px', color: 'var(--state-success)' }}>
                      Lower risk, but room acoustics vary
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--state-success)' }}>
                      🎧 Using Headphones
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--state-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> 100% Best way to prevent all acoustic echo
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              * Distances are approximate and depend on device volume, microphone gain, and room reverberation.
            </p>
          </div>

          {/* 2. Built-in WebRTC Audio Processing */}
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={15} color="var(--accent-secondary)" />
              2. Active WebRTC Audio Processing in L2gether
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: 'var(--state-success)' }}>✓</span> Echo Cancellation
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Suppresses audio captured from local speakers into the mic stream.
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: 'var(--state-success)' }}>✓</span> Noise Suppression
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Filters continuous background noise, fans, keyboard taps, and hums.
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: 'var(--state-success)' }}>✓</span> Auto Gain Control (AGC)
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Dynamically balances quiet whispers and loud voices for comfortable volume.
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: 'var(--state-success)' }}>✓</span> Instant Mute Toggle
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Mute your microphone anytime from the top bar or workspace header.
                </div>
              </div>
            </div>
          </div>

          {/* 3. Why Feedback Happens in the Same Room */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: '4px' }}>
              Why do two devices in the same room cause feedback?
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              If Device A and Device B sit at the same table without headphones, Device A's speaker output travels through the air into Device B's microphone. Device B sends it right back to Device A, creating an escalating acoustic loop. <strong>Solution:</strong> Plug in headphones or mute when you aren't talking!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-primary btn-sm" onClick={onClose} style={{ width: '100%' }}>
            Got It, Thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
