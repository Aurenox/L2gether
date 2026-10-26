import React from 'react';
import { Link } from 'react-router-dom';
import {
  Link2,
  Code2,
  MessageSquare,
  HardDrive,
  Globe,
  PhoneCall,
  QrCode,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  Package,
  Palette
} from 'lucide-react';
import Navbar from '../components/navigation/Navbar';
import Logo from '../components/brand/Logo';

export default function HomePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-pill">
          <Clock size={14} />
          <span>7-Day Ephemeral Workspaces • No Accounts Required</span>
        </div>

        <h1 className="hero-title">
          Everything you need to <span className="gradient-text">build together.</span>
        </h1>

        <p className="hero-subtitle">
          Create a room, invite your team, and bring chat, files, code, and audio together in one temporary workspace.
        </p>

        <div className="hero-actions">
          {/* Option A: Join */}
          <Link
            to="/join"
            className="card"
            style={{
              textDecoration: 'none',
              padding: '1.5rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '2px solid var(--border-color)',
              transition: 'all 0.2s ease',
              backgroundColor: 'var(--bg-panel)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-secondary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="badge badge-secondary" style={{ color: 'var(--accent-secondary)' }}>Option A</span>
                <ArrowRight size={18} color="var(--accent-secondary)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Join
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.4, margin: 0 }}>
                For participants who want to join an existing room using an invitation link or room ID.
              </p>
            </div>
            <div style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>
              <span>Join Room</span> &rarr;
            </div>
          </Link>

          {/* Option B: Host Room */}
          <Link
            to="/host"
            className="card"
            style={{
              textDecoration: 'none',
              padding: '1.5rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '2px solid var(--accent-primary)',
              boxShadow: '0 4px 20px var(--accent-primary-glow)',
              transition: 'all 0.2s ease',
              backgroundColor: 'var(--bg-panel)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px var(--accent-primary-glow)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px var(--accent-primary-glow)'; }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="badge badge-primary">Option B</span>
                <ArrowRight size={18} color="var(--accent-primary)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Host Room
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.4, margin: 0 }}>
                For someone who wants to create a new room or manage a room they created previously.
              </p>
            </div>
            <div style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
              <span>Create or Manage</span> &rarr;
            </div>
          </Link>
        </div>

        {/* Live Interactive Workspace Preview Mockup */}
        <div className="hero-mockup-container">
          <div className="mockup-header">
            <div className="mockup-dots">
              <div className="mockup-dot red" />
              <div className="mockup-dot yellow" />
              <div className="mockup-dot green" />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              l2gether.io/room-alpha • Expires in 6d 23h
            </div>
          </div>

          <div className="mockup-body">
            {/* Left explorer mock */}
            <div style={{ backgroundColor: 'var(--bg-panel)', borderRight: '1px solid var(--border-color)', padding: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Files
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
                <div style={{ padding: '0.3rem 0.5rem', backgroundColor: 'var(--bg-active)', borderRadius: '4px', color: 'var(--accent-primary)' }}>
                  📄 index.html
                </div>
                <div style={{ padding: '0.3rem 0.5rem', color: 'var(--text-secondary)' }}>
                  🎨 styles.css
                </div>
                <div style={{ padding: '0.3rem 0.5rem', color: 'var(--text-secondary)' }}>
                  ⚡ script.js
                </div>
              </div>
            </div>

            {/* Center code mock */}
            <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#0B0D12' }}>
              <div style={{ height: '36px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 0.75rem', gap: '0.5rem' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>HTML</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>index.html</span>
              </div>
              <div style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.825rem', color: '#F4F6FB', lineHeight: 1.6, overflowX: 'auto', maxWidth: '100%', wordBreak: 'break-word' }}>
                <div><span style={{ color: '#7C6CFF' }}>&lt;!DOCTYPE</span> <span style={{ color: '#36D6C5' }}>html</span>&gt;</div>
                <div><span style={{ color: '#7C6CFF' }}>&lt;html</span> <span style={{ color: '#FFBE5C' }}>lang</span>=<span style={{ color: '#3DDC97' }}>"en"</span>&gt;</div>
                <div style={{ paddingLeft: '1rem' }}><span style={{ color: '#7C6CFF' }}>&lt;head&gt;</span></div>
                <div style={{ paddingLeft: '2rem' }}><span style={{ color: '#7C6CFF' }}>&lt;title&gt;</span>L2gether Live Preview<span style={{ color: '#7C6CFF' }}>&lt;/title&gt;</span></div>
                <div style={{ paddingLeft: '1rem' }}><span style={{ color: '#7C6CFF' }}>&lt;/head&gt;</span></div>
                <div style={{ paddingLeft: '1rem' }}><span style={{ color: '#7C6CFF' }}>&lt;body&gt;</span></div>
                <div style={{ paddingLeft: '2rem' }}><span style={{ color: '#7C6CFF' }}>&lt;h1&gt;</span>One link. Everything together.<span style={{ color: '#7C6CFF' }}>&lt;/h1&gt;</span></div>
                <div style={{ paddingLeft: '1rem' }}><span style={{ color: '#7C6CFF' }}>&lt;/body&gt;</span></div>
                <div><span style={{ color: '#7C6CFF' }}>&lt;/html&gt;</span></div>
              </div>
            </div>

            {/* Right preview/chat mock */}
            <div style={{ backgroundColor: 'var(--bg-panel)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '36px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 0.75rem', gap: '0.5rem' }}>
                <Globe size={14} color="var(--accent-secondary)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Live Web Preview</span>
              </div>
              <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', color: '#161B26', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7C6CFF, #36D6C5)', marginBottom: '0.5rem' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#11151D' }}>Live Preview Running</h4>
                <p style={{ fontSize: '0.75rem', color: '#687086', marginTop: '0.25rem' }}>Responsive sandboxed iframe updates in real time.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Built for developer collaboration</h2>
          <p className="section-subtitle">
            All the essential tools for instant pairing, prototyping, and hackathons in one browser tab.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <MessageSquare size={22} />
            </div>
            <h3 className="feature-title">Real-Time Chat</h3>
            <p className="feature-desc">
              Communicate instantly with formatted code snippets, copy buttons, search, and @username mentions.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Code2 size={22} />
            </div>
            <h3 className="feature-title">Collaborative Code Editor</h3>
            <p className="feature-desc">
              Powered by Monaco Editor with multi-cursor awareness, syntax highlighting, and VS Code keyboard shortcuts.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <HardDrive size={22} />
            </div>
            <h3 className="feature-title">Shared File Storage</h3>
            <p className="feature-desc">
              Upload documents, images, and project assets with drag-and-drop. Secured with isolated storage keys.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Package size={22} />
            </div>
            <h3 className="feature-title">Smart Package Hub</h3>
            <p className="feature-desc">
              1-click inject 35+ CDNs, Google Fonts across 30+ languages, Font Awesome, and Bootstrap icons with live auto-refresh.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ color: 'var(--accent-secondary)' }}>
              <Globe size={22} />
            </div>
            <h3 className="feature-title">Live Web Preview</h3>
            <p className="feature-desc">
              Preview HTML, CSS, JavaScript, and React projects instantly with responsive viewport sizing and console logs.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <PhoneCall size={22} />
            </div>
            <h3 className="feature-title">WebRTC Audio Calls</h3>
            <p className="feature-desc">
              Crystal-clear group audio conversations with mute toggles and speaking wave indicators. No video required.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <QrCode size={22} />
            </div>
            <h3 className="feature-title">Instant QR Invitations</h3>
            <p className="feature-desc">
              Share one simple link or scan a generated QR code on mobile to jump directly into the room.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Palette size={22} />
            </div>
            <h3 className="feature-title">Interactive Whiteboard</h3>
            <p className="feature-desc">
              Smooth continuous ink drawing, shapes, docked slider or floating window modes, and 1-click sharing to chat.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" style={{ padding: '5rem 1.5rem', backgroundColor: 'var(--bg-panel)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="section-header">
            <h2 className="section-title">How it works</h2>
            <p className="section-subtitle">Collaborate in three effortless steps without mandatory account registration.</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Create a Room</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Choose public or private visibility, pick a starter project, and enter your display name. No password or email needed.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Share the Link</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Send your unique room link or display the QR code. For private rooms, the host approves incoming join requests.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Start Collaborating</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Code together, preview web apps live, exchange files, draw on the whiteboard, and speak on audio. Everything purges in 7 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7-Day Lifecycle & Privacy Guarantee */}
      <section style={{ padding: '5rem 1.5rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-active)', color: 'var(--accent-primary)', marginBottom: '1.25rem' }}>
          <ShieldCheck size={28} />
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
          Strict 7-Day Ephemeral Retention
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '750px', margin: '0 auto 2rem' }}>
          Rooms, chat histories, code workspaces, and shared files exist for exactly 7 days. Once expired, temporary files and sessions are completely purged by our automated background reconciliation worker.
        </p>
        <Link to="/host" className="btn btn-primary btn-lg">
          Host a Workspace Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Logo size="md" />
            <p>One link. Everything together. Temporary collaborative workspace with real-time code editor, chat, files, and audio.</p>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/host">Host Room</Link></li>
              <li><Link to="/join">Join Room</Link></li>
              <li><Link to="/#features">Features</Link></li>
              <li><Link to="/#how-it-works">How It Works</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Security &amp; Privacy</h4>
            <ul>
              <li><Link to="/privacy">Retention Policy</Link></li>
              <li><Link to="/privacy#security">Code Sandbox Isolation</Link></li>
              <li><Link to="/privacy#guest">Guest Access Info</Link></li>
            </ul>
          </div>

        </div>

        <div className="footer-bottom" style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.6 }}>
          &copy; 2026 L2gether • Created &amp; Designed by <strong style={{ color: 'var(--text-main)' }}>Saurav B</strong> •{' '}
          <a href="mailto:saurav04atg@gmail.com" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            saurav04atg@gmail.com
          </a>{' '}
          •{' '}
          <a href="https://github.com/aurenox" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}>
            GitHub: aurenox
          </a>{' '}
          •{' '}
          <a href="https://www.linkedin.com/in/saurav-b-a864a7326/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
            LinkedIn
          </a>
        </div>
      </footer>
    </div>
  );
}
