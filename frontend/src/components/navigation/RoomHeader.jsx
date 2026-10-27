import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  QrCode,
  Users,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Settings,
  Moon,
  Sun,
  Clock,
  Shield,
  Radio,
  Lock,
  Unlock,
  Headphones,
  Volume2,
  Menu,
  X,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAudioCall } from '../../contexts/AudioContext';
import Logo from '../brand/Logo';
import { getRoomJoinUrl } from '../../utils/url';

export default function RoomHeader({
  room,
  participantCount,
  pendingRequestCount = 0,
  isEditingLocked,
  onToggleEditLock,
  onOpenQR,
  onOpenParticipants,
  onOpenSettings,
  autoFollowHost,
  onToggleAutoFollow,
  onOpenAudioHelp,
  onOpenGuide
}) {
  const { themeSetting, setThemeSetting } = useTheme();
  const {
    inCall,
    isMuted,
    isSpeaking,
    isListenerOnly,
    startAudioCall,
    leaveAudioCall,
    toggleMute,
    peerCount,
    activeRoomCallCount,
    hasRemoteAudioPlaying,
    autoplayBlocked,
    unlockAllAudioElements
  } = useAudioCall();

  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [showMobileMore, setShowMobileMore] = useState(false);

  const handleLeaveRoom = () => {
    if (window.confirm('Leave this workspace? You can return and rejoin at any time using your room invite link or code.')) {
      navigate('/');
    }
  };

  // 7-day countdown calculation
  useEffect(() => {
    if (!room?.expiresAt) return;

    function updateCountdown() {
      const diff = new Date(room.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeftStr('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeftStr(`${days}d ${hours}h left`);
      } else {
        setTimeLeftStr(`${hours}h ${mins}m left`);
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [room?.expiresAt]);

  const copyRoomLink = async () => {
    const url = getRoomJoinUrl(room?.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      prompt('Copy this link:', url);
    }
  };

  return (
    <header className="room-topbar">
      {/* Left: Brand Logo & Room Metadata */}
      <div className="room-topbar-left">
        <Link to="/" style={{ textDecoration: 'none' }} title="Return to Home">
          <Logo size="sm" showText={false} />
        </Link>

        <div className="room-title-badge">
          <span className="room-title-name" title={room?.name}>
            {room?.name || 'Workspace'}
          </span>
          {room?.visibility === 'private' && (
            <span className="badge badge-secondary" title="Private room - requires host approval">
              <Shield size={11} />
              <span className="hide-on-mobile">Private</span>
            </span>
          )}
        </div>

        {/* 7-Day Countdown Badge */}
        <div
          className="badge badge-warning room-countdown-badge"
          title={`Room expires at ${new Date(room?.expiresAt).toLocaleString()} (7-day retention)`}
        >
          <Clock size={11} />
          <span>{timeLeftStr || '7d left'}</span>
        </div>
      </div>

      {/* Right: Actions & Tools */}
      <div className="room-topbar-right">
        {/* Host Lock Editing Toggle (Desktop) */}
        {room?.isOwner ? (
          <button
            className={`lock-toggle-btn hide-on-mobile ${isEditingLocked ? 'locked' : 'unlocked'}`}
            onClick={onToggleEditLock}
            title={isEditingLocked ? 'Unlock code editing for everyone' : 'Lock code editing (make read-only for others)'}
          >
            {isEditingLocked ? <Lock size={13} /> : <Unlock size={13} />}
            <span>{isEditingLocked ? 'Locked' : 'Lock Edit'}</span>
          </button>
        ) : isEditingLocked ? (
          <span
            className="badge badge-warning hide-on-mobile"
            title="Editing is locked by the room host (read-only mode)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          >
            <Lock size={11} />
            <span>Read-Only</span>
          </span>
        ) : null}

        {/* Live Page Follow Host Toggle (Desktop) */}
        {!room?.isOwner && onToggleAutoFollow && (
          <button
            className={`follow-host-btn hide-on-mobile ${autoFollowHost ? 'active' : ''}`}
            onClick={onToggleAutoFollow}
            title={
              autoFollowHost
                ? '📡 Live Follow: Host (ON) - You automatically follow editor page changes'
                : '📡 Live Follow: Host (OFF) - Click to track host page changes'
            }
            style={{
              padding: '3px 8px',
              fontSize: '0.72rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Radio size={12} className={autoFollowHost ? 'live-pulse-icon' : ''} />
            <span>{autoFollowHost ? 'Follow: Host' : 'Follow: Off'}</span>
          </button>
        )}

        {/* Copy Invite Link (Desktop) */}
        <button
          className="btn btn-secondary btn-sm header-action-btn hide-on-mobile"
          onClick={copyRoomLink}
          title="Copy Room Link to Clipboard"
        >
          {copied ? <Check size={14} color="var(--state-success)" /> : <Copy size={14} />}
          <span>{copied ? 'Copied!' : 'Invite'}</span>
        </button>

        {/* QR Code (Desktop) */}
        <button
          className="btn btn-secondary btn-icon sm hide-on-mobile"
          onClick={onOpenQR}
          title="Show Room QR Code"
        >
          <QrCode size={14} />
        </button>

        {/* Participant Counter */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenParticipants}
          style={{ position: 'relative' }}
          title={
            room?.isOwner && pendingRequestCount > 0
              ? `${pendingRequestCount} pending join request(s) awaiting approval`
              : "Active Participants"
          }
        >
          <Users size={14} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{participantCount || room?.participantCount || 1}</span>
          {room?.isOwner && pendingRequestCount > 0 && (
            <span
              className="pending-requests-badge"
              title={`${pendingRequestCount} pending join request(s)`}
            >
              {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
            </span>
          )}
        </button>

        {/* WebRTC Audio Call Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {!inCall ? (
            <button
              className="btn btn-primary btn-sm audio-join-btn"
              onClick={() => startAudioCall(room?.id)}
              title={activeRoomCallCount > 0 ? `Join Live Voice Call (${activeRoomCallCount} active in call)` : "Join Live Voice Call"}
            >
              <PhoneCall size={13} />
              <span className="hide-on-mobile">{activeRoomCallCount > 0 ? `Audio (${activeRoomCallCount})` : 'Audio'}</span>
              {activeRoomCallCount > 0 && <span className="show-on-mobile-inline">({activeRoomCallCount})</span>}
            </button>
          ) : (
            /* Desktop In-Header Bar (Hidden on small mobile where floating pill takes over) */
            <div className="audio-call-bar hide-on-mobile">
              <div
                className={`badge badge-success ${isSpeaking ? 'speaking-active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 6px' }}
                title={isSpeaking ? 'Microphone active / speaking' : isListenerOnly ? 'Listening' : 'Connected to audio'}
              >
                {isListenerOnly ? <Headphones size={11} /> : <Radio size={11} />}
                <span style={{ fontSize: '0.72rem' }}>{peerCount}</span>
                {hasRemoteAudioPlaying && <Volume2 size={11} color="#34d399" title="Sound is active" />}
              </div>

              {autoplayBlocked && (
                <button
                  className="btn btn-warning btn-sm"
                  onClick={unlockAllAudioElements}
                  title="Your browser blocked audio playback. Click to hear other participants."
                  style={{ fontSize: '0.7rem', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Volume2 size={12} />
                  <span>Click to Hear Audio</span>
                </button>
              )}

              <button
                className={`btn-icon sm ${isMuted ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => toggleMute(room?.id)}
                title={isListenerOnly ? 'Click to enable microphone' : isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
              </button>

              <button
                className="btn btn-danger btn-icon sm"
                onClick={() => leaveAudioCall(room?.id)}
                title="Leave Voice Call"
              >
                <PhoneOff size={13} />
              </button>
            </div>
          )}

          {/* Audio Quality & Echo Guide Button */}
          {onOpenAudioHelp && (
            <button
              className="btn btn-subtle btn-icon sm hide-on-mobile"
              onClick={onOpenAudioHelp}
              title="Audio Quality & Echo Prevention Guide (Headphones recommended for same-room devices)"
              aria-label="Audio Quality Guide"
              style={{ color: 'var(--accent-primary)' }}
            >
              <Headphones size={14} />
            </button>
          )}
        </div>

        {/* Theme Selector (Desktop / Tablet) */}
        <div className="header-theme-toggle hide-on-mobile" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '2px', border: '1px solid var(--border-color)' }}>
          <button
            className={`btn-icon sm ${themeSetting === 'light' ? 'btn-secondary' : 'btn-subtle'}`}
            onClick={() => setThemeSetting(themeSetting === 'light' ? 'dark' : 'light')}
            title="Toggle Light / Dark"
          >
            {themeSetting === 'light' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>

        {/* Settings button (Desktop) */}
        <button
          className="btn btn-subtle btn-icon sm hide-on-mobile"
          onClick={onOpenSettings}
          title="Workspace Settings"
        >
          <Settings size={15} />
        </button>

        {/* First-Time User Guide & Workspace Help button */}
        {onOpenGuide && (
          <button
            className="btn btn-subtle btn-icon sm hide-on-mobile"
            onClick={onOpenGuide}
            title="First-Time User Guide & Workspace Help"
            aria-label="First-Time User Guide"
          >
            <HelpCircle size={15} />
          </button>
        )}

        {/* Leave Workspace Button (Desktop) */}
        <button
          className="btn btn-subtle btn-sm hide-on-mobile"
          onClick={handleLeaveRoom}
          title="Leave Workspace (You can rejoin at any time)"
          style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.25)', gap: '4px', fontSize: '0.78rem', padding: '3px 8px' }}
        >
          <LogOut size={13} />
          <span>Leave</span>
        </button>

        {/* Mobile Hamburger Menu (Three-line icon for phones to eliminate overflow) */}
        <button
          className="btn btn-subtle btn-icon sm show-on-mobile"
          onClick={() => setShowMobileMore(!showMobileMore)}
          aria-label="Room Menu Options"
          title="Room Menu Options"
          style={{ position: 'relative' }}
        >
          <Menu size={18} />
          {room?.isOwner && pendingRequestCount > 0 && (
            <span
              className="pending-requests-badge"
              style={{ top: '-4px', right: '-4px' }}
              title={`${pendingRequestCount} pending join request(s)`}
            >
              {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Drawer / Sheet for Secondary Actions */}
      {showMobileMore && (
        <div
          className="mobile-header-menu-overlay"
          onClick={() => setShowMobileMore(false)}
        >
          <div
            className="mobile-header-menu-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-header-menu-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>Room Menu</span>
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>{timeLeftStr || '7d left'}</span>
              </div>
              <button
                className="btn btn-subtle btn-icon sm"
                onClick={() => setShowMobileMore(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mobile-header-menu-items">
              <button
                className="mobile-header-menu-btn"
                onClick={() => {
                  onOpenParticipants();
                  setShowMobileMore(false);
                }}
              >
                <Users size={16} />
                <span>Participants ({participantCount || room?.participantCount || 1})</span>
                {room?.isOwner && pendingRequestCount > 0 && (
                  <span
                    className="pending-requests-badge"
                    style={{ position: 'static', marginLeft: 'auto' }}
                  >
                    {pendingRequestCount} new
                  </span>
                )}
              </button>

              {room?.isOwner && (
                <button
                  className="mobile-header-menu-btn"
                  onClick={() => {
                    onToggleEditLock();
                    setShowMobileMore(false);
                  }}
                >
                  {isEditingLocked ? <Unlock size={16} color="var(--state-success)" /> : <Lock size={16} color="var(--state-warning)" />}
                  <span>{isEditingLocked ? 'Unlock Code Editing for All' : 'Lock Code Editing (Host Only)'}</span>
                </button>
              )}

              {!room?.isOwner && onToggleAutoFollow && (
                <button
                  className="mobile-header-menu-btn"
                  onClick={() => {
                    onToggleAutoFollow();
                    setShowMobileMore(false);
                  }}
                >
                  <Radio size={16} color={autoFollowHost ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                  <span>{autoFollowHost ? 'Disable Host Auto-Follow' : 'Enable Host Auto-Follow'}</span>
                </button>
              )}

              <button
                className="mobile-header-menu-btn"
                onClick={() => {
                  copyRoomLink();
                  setShowMobileMore(false);
                }}
              >
                {copied ? <Check size={16} color="var(--state-success)" /> : <Copy size={16} />}
                <span>{copied ? 'Link Copied!' : 'Copy Room Invite Link'}</span>
              </button>

              <button
                className="mobile-header-menu-btn"
                onClick={() => {
                  onOpenQR();
                  setShowMobileMore(false);
                }}
              >
                <QrCode size={16} />
                <span>Show Room QR Code</span>
              </button>

              <button
                className="mobile-header-menu-btn"
                onClick={() => {
                  onOpenSettings();
                  setShowMobileMore(false);
                }}
              >
                <Settings size={16} />
                <span>Workspace Settings</span>
              </button>

              {onOpenAudioHelp && (
                <button
                  className="mobile-header-menu-btn"
                  onClick={() => {
                    onOpenAudioHelp();
                    setShowMobileMore(false);
                  }}
                >
                  <Headphones size={16} color="var(--accent-primary)" />
                  <span>Audio &amp; Echo Guide</span>
                </button>
              )}

              {onOpenGuide && (
                <button
                  className="mobile-header-menu-btn"
                  onClick={() => {
                    onOpenGuide();
                    setShowMobileMore(false);
                  }}
                >
                  <HelpCircle size={16} color="var(--accent-secondary)" />
                  <span>First-Time User Guide</span>
                </button>
              )}

              <button
                className="mobile-header-menu-btn"
                onClick={() => {
                  setThemeSetting(themeSetting === 'light' ? 'dark' : 'light');
                }}
              >
                {themeSetting === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                <span>Switch to {themeSetting === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
              </button>

              <button
                className="mobile-header-menu-btn"
                onClick={() => {
                  setShowMobileMore(false);
                  handleLeaveRoom();
                }}
                style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.35)', marginTop: '0.25rem' }}
              >
                <LogOut size={16} color="#EF4444" />
                <span>Leave Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
