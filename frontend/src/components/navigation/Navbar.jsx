import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus,
  LogIn,
  Moon,
  Sun,
  Monitor,
  Menu,
  X,
  Shield,
  Clock,
  HelpCircle,
  Sparkles,
  Mail,
  Github,
  Linkedin
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../brand/Logo';

export default function Navbar() {
  const { themeSetting, setThemeSetting } = useTheme();
  const { displayName } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreatorPopup, setShowCreatorPopup] = useState(false);
  const [isCreatorSticky, setIsCreatorSticky] = useState(false);
  const creatorTimerRef = useRef(null);
  const location = useLocation();

  const isRoomPage = location.pathname.startsWith('/room/');

  // If in room workspace, RoomHeader handles the top bar
  if (isRoomPage) return null;

  const handleCreatorMouseEnter = () => {
    if (creatorTimerRef.current) {
      clearTimeout(creatorTimerRef.current);
      creatorTimerRef.current = null;
    }
    setShowCreatorPopup(true);
  };

  const handleCreatorMouseLeave = () => {
    if (isCreatorSticky) return; // Keep window open if user clicked it open
    if (creatorTimerRef.current) clearTimeout(creatorTimerRef.current);
    // 800ms grace period so users can move their mouse comfortably
    creatorTimerRef.current = setTimeout(() => {
      setShowCreatorPopup(false);
    }, 800);
  };

  const handleCreatorClick = (e) => {
    e.stopPropagation();
    if (creatorTimerRef.current) {
      clearTimeout(creatorTimerRef.current);
      creatorTimerRef.current = null;
    }
    if (showCreatorPopup && isCreatorSticky) {
      setIsCreatorSticky(false);
      setShowCreatorPopup(false);
    } else {
      setIsCreatorSticky(true);
      setShowCreatorPopup(true);
    }
  };

  const handleCloseCreatorPopup = (e) => {
    if (e) e.stopPropagation();
    if (creatorTimerRef.current) clearTimeout(creatorTimerRef.current);
    setIsCreatorSticky(false);
    setShowCreatorPopup(false);
  };

  // Smooth scroll handler for anchor links (#features, #how-it-works)
  const handleAnchorClick = (e, sectionId) => {
    if (location.pathname === '/') {
      e.preventDefault();
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.pushState(null, '', `/#${sectionId}`);
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="app-nav">
        <div className="nav-brand">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo size="md" />
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="nav-links hide-on-mobile">
          <Link
            to="/#features"
            className="nav-link"
            onClick={(e) => handleAnchorClick(e, 'features')}
          >
            Features
          </Link>
          <Link
            to="/#how-it-works"
            className="nav-link"
            onClick={(e) => handleAnchorClick(e, 'how-it-works')}
          >
            How It Works
          </Link>
          <Link to="/privacy" className="nav-link">
            Retention &amp; Privacy
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="nav-actions hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Creator / Bug Report & Feedback (? button) - Left of Theme Selector */}
          <div
            className="nav-creator-wrap"
            onMouseEnter={handleCreatorMouseEnter}
            onMouseLeave={handleCreatorMouseLeave}
          >
            <button
              type="button"
              className={`btn btn-subtle btn-icon sm ${showCreatorPopup ? 'active' : ''}`}
              onClick={handleCreatorClick}
              title="Creator Contact & Bug Report (?)"
              aria-label="Creator Contact & Bug Report"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: showCreatorPopup ? 'var(--bg-secondary)' : 'transparent',
                color: showCreatorPopup ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}
            >
              <HelpCircle size={16} />
            </button>

            {showCreatorPopup && (
              <div
                className="activity-creator-popover nav-creator-popover"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={handleCreatorMouseEnter}
                onMouseLeave={handleCreatorMouseLeave}
              >
                <div className="activity-creator-popover-header">
                  <div className="activity-creator-avatar">
                    SB
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="activity-creator-name">Saurav B</div>
                    <div className="activity-creator-role">Platform Creator &amp; Developer</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-subtle btn-icon sm"
                    onClick={handleCloseCreatorPopup}
                    title="Close"
                    style={{ width: '22px', height: '22px', padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="activity-creator-links">
                  <a
                    href="mailto:saurav04atg@gmail.com?subject=L2gether%20Inquiry%20%2F%20Bug%20Report"
                    className="activity-creator-link"
                    title="Send Email via Gmail"
                  >
                    <span>✉️</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>saurav04atg@gmail.com</span>
                  </a>
                  <a
                    href="https://github.com/aurenox"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="activity-creator-link"
                    title="Visit GitHub Profile"
                  >
                    <span>🐙</span>
                    <span>github.com/aurenox</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/saurav-b-a864a7326/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="activity-creator-link"
                    title="Visit LinkedIn Profile"
                  >
                    <span>💼</span>
                    <span>LinkedIn: Saurav B</span>
                  </a>
                </div>

                <div className="nav-creator-bug-report">
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>🐞</span>
                    <span>Report Bugs &amp; Suggest Features</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Encountered an issue or have ideas? Contact me directly via Gmail:
                  </p>
                  <a
                    href="mailto:saurav04atg@gmail.com?subject=L2gether%20Bug%20Report%20%2F%20Feature%20Request"
                    style={{
                      color: 'var(--accent-primary)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-block',
                      marginTop: '4px'
                    }}
                  >
                    saurav04atg@gmail.com &rarr;
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Theme Selector */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '2px', border: '1px solid var(--border-color)' }}>
            <button
              className={`btn-icon sm ${themeSetting === 'light' ? 'btn-secondary' : 'btn-subtle'}`}
              onClick={() => setThemeSetting('light')}
              title="Light Theme"
            >
              <Sun size={14} />
            </button>
            <button
              className={`btn-icon sm ${themeSetting === 'dark' ? 'btn-secondary' : 'btn-subtle'}`}
              onClick={() => setThemeSetting('dark')}
              title="Dark Theme"
            >
              <Moon size={14} />
            </button>
            <button
              className={`btn-icon sm ${themeSetting === 'system' ? 'btn-secondary' : 'btn-subtle'}`}
              onClick={() => setThemeSetting('system')}
              title="System Theme"
            >
              <Monitor size={14} />
            </button>
          </div>

          <Link to="/join" className="btn btn-secondary btn-sm">
            <LogIn size={15} />
            <span>Join</span>
          </Link>
          <Link to="/host" className="btn btn-primary btn-sm">
            <Plus size={15} />
            <span>Host Room</span>
          </Link>
        </div>

        {/* Mobile Top Bar Controls */}
        <div className="show-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-subtle btn-icon"
            onClick={() => {
              setShowCreatorPopup(!showCreatorPopup);
              setIsCreatorSticky(!showCreatorPopup);
            }}
            title="Creator Contact & Bug Report (?)"
            aria-label="Platform Creator & Contact"
          >
            <HelpCircle size={19} />
          </button>
          <button
            className="btn btn-subtle btn-icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Creator Popover (if opened via mobile top bar ? button) */}
      {showCreatorPopup && (
        <div
          className="mobile-creator-backdrop show-on-mobile"
          onClick={handleCloseCreatorPopup}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '70px'
          }}
        >
          <div
            className="activity-creator-popover"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              left: 'auto',
              bottom: 'auto',
              width: '90%',
              maxWidth: '320px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div className="activity-creator-popover-header">
              <div className="activity-creator-avatar">
                SB
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="activity-creator-name">Saurav B</div>
                <div className="activity-creator-role">Platform Creator &amp; Developer</div>
              </div>
              <button
                type="button"
                className="btn btn-subtle btn-icon sm"
                onClick={handleCloseCreatorPopup}
                title="Close"
                style={{ width: '22px', height: '22px', padding: 0 }}
              >
                <X size={13} />
              </button>
            </div>

            <div className="activity-creator-links">
              <a
                href="mailto:saurav04atg@gmail.com?subject=L2gether%20Inquiry%20%2F%20Bug%20Report"
                className="activity-creator-link"
                title="Send Email via Gmail"
              >
                <span>✉️</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>saurav04atg@gmail.com</span>
              </a>
              <a
                href="https://github.com/aurenox"
                target="_blank"
                rel="noopener noreferrer"
                className="activity-creator-link"
                title="Visit GitHub Profile"
              >
                <span>🐙</span>
                <span>github.com/aurenox</span>
              </a>
              <a
                href="https://www.linkedin.com/in/saurav-b-a864a7326/"
                target="_blank"
                rel="noopener noreferrer"
                className="activity-creator-link"
                title="Visit LinkedIn Profile"
              >
                <span>💼</span>
                <span>LinkedIn: Saurav B</span>
              </a>
            </div>

            <div className="nav-creator-bug-report">
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>🐞</span>
                <span>Report Bugs &amp; Suggest Features</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Encountered an issue or have ideas? Reach out directly via Gmail:
              </p>
              <a
                href="mailto:saurav04atg@gmail.com?subject=L2gether%20Bug%20Report%20%2F%20Feature%20Request"
                style={{
                  color: 'var(--accent-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block',
                  marginTop: '4px'
                }}
              >
                saurav04atg@gmail.com &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <Logo size="sm" />
              <button
                className="btn-icon sm btn-subtle"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-drawer-body">
              <div className="mobile-cta-group">
                <Link
                  to="/host"
                  className="btn btn-primary btn-md"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Plus size={16} />
                  <span>Host Room</span>
                </Link>
                <Link
                  to="/join"
                  className="btn btn-secondary btn-md"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn size={16} />
                  <span>Join Room</span>
                </Link>
              </div>

              <div className="mobile-nav-list">
                <Link
                  to="/#features"
                  className="mobile-nav-item"
                  onClick={(e) => handleAnchorClick(e, 'features')}
                >
                  <Sparkles size={16} color="var(--accent-primary)" />
                  <span>Features</span>
                </Link>
                <Link
                  to="/#how-it-works"
                  className="mobile-nav-item"
                  onClick={(e) => handleAnchorClick(e, 'how-it-works')}
                >
                  <HelpCircle size={16} color="var(--accent-secondary)" />
                  <span>How It Works</span>
                </Link>
                <Link
                  to="/privacy"
                  className="mobile-nav-item"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Clock size={16} color="var(--state-warning)" />
                  <span>7-Day Retention &amp; Privacy</span>
                </Link>
              </div>

              {/* Mobile Creator Contact & Bug Report Section */}
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="activity-creator-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                    SB
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Saurav B</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Platform Creator &amp; Developer</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <a
                    href="mailto:saurav04atg@gmail.com?subject=L2gether%20Inquiry%20%2F%20Bug%20Report"
                    className="activity-creator-link"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    <span>✉️</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>saurav04atg@gmail.com</span>
                  </a>
                  <a
                    href="https://github.com/aurenox"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="activity-creator-link"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    <span>🐙</span>
                    <span>github.com/aurenox</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/saurav-b-a864a7326/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="activity-creator-link"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    <span>💼</span>
                    <span>LinkedIn: Saurav B</span>
                  </a>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  🐞 Report bugs or suggest features via Gmail: <a href="mailto:saurav04atg@gmail.com?subject=L2gether%20Bug%20Report%20%2F%20Feature%20Request" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>saurav04atg@gmail.com</a>
                </div>
              </div>

              <div className="mobile-theme-row">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Appearance</span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    className={`btn-icon sm ${themeSetting === 'light' ? 'btn-secondary' : 'btn-subtle'}`}
                    onClick={() => setThemeSetting('light')}
                  >
                    <Sun size={14} />
                  </button>
                  <button
                    className={`btn-icon sm ${themeSetting === 'dark' ? 'btn-secondary' : 'btn-subtle'}`}
                    onClick={() => setThemeSetting('dark')}
                  >
                    <Moon size={14} />
                  </button>
                  <button
                    className={`btn-icon sm ${themeSetting === 'system' ? 'btn-secondary' : 'btn-subtle'}`}
                    onClick={() => setThemeSetting('system')}
                  >
                    <Monitor size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
