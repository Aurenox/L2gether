import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, LogIn, Moon, Sun, Monitor, Menu, X, Shield, Clock, HelpCircle, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../brand/Logo';

export default function Navbar() {
  const { themeSetting, setThemeSetting } = useTheme();
  const { displayName } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isRoomPage = location.pathname.startsWith('/room/');

  // If in room workspace, RoomHeader handles the top bar
  if (isRoomPage) return null;

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
          <Link to="/#features" className="nav-link">Features</Link>
          <Link to="/#how-it-works" className="nav-link">How It Works</Link>
          <Link to="/privacy" className="nav-link">Retention & Privacy</Link>
        </nav>

        {/* Desktop Actions */}
        <div className="nav-actions hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="btn btn-subtle btn-icon show-on-mobile"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

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
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Sparkles size={16} color="var(--accent-primary)" />
                  <span>Features</span>
                </Link>
                <Link
                  to="/#how-it-works"
                  className="mobile-nav-item"
                  onClick={() => setMobileMenuOpen(false)}
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
                  <span>7-Day Retention & Privacy</span>
                </Link>
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
