import React, { useState } from 'react';
import {
  Clock,
  Shield,
  Copy,
  Check,
  QrCode,
  Users,
  Code2,
  MessageSquare,
  HardDrive,
  Globe,
  Sparkles,
  Headphones,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { getRoomJoinUrl } from '../../utils/url';
import SectionHelpButton from '../common/SectionHelpButton';

export default function RoomOverview({
  room,
  participantCount,
  onNavigateTab,
  onOpenQR,
  onOpenParticipants,
  onOpenAudioHelp,
  onOpenGuide
}) {
  const [copied, setCopied] = useState(false);
  const joinUrl = getRoomJoinUrl(room?.id);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      prompt('Room invitation link:', joinUrl);
    }
  };

  const createdDate = new Date(room?.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const expiresDate = new Date(room?.expiresAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className="room-overview-dashboard"
      style={{
        flex: 1,
        height: '100%',
        maxHeight: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
        padding: '0.85rem 1.25rem',
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}
    >
      {/* 1. Hero Welcome Card (Streamlined & Compact) */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.15rem',
          margin: 0,
          background: 'linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-secondary) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge-primary" style={{ padding: '0.2rem 0.55rem', fontSize: '0.74rem' }}>
              <Sparkles size={11} />
              L2gether Collaborative Workspace
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
              {room?.name}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span className="badge badge-warning" style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem' }}>
              <Clock size={12} />
              Expires: {expiresDate}
            </span>
            {room?.visibility === 'private' && (
              <span className="badge badge-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem' }}>
                <Shield size={12} />
                Private Room
              </span>
            )}
            {onOpenGuide && (
              <button
                className="btn btn-subtle btn-sm"
                onClick={onOpenGuide}
                style={{ fontSize: '0.74rem', padding: '0.25rem 0.65rem', gap: '4px' }}
                title="First time here? View Workspace Guide"
              >
                <HelpCircle size={13} color="var(--accent-primary)" />
                <span>First Time? Guide</span>
              </button>
            )}

            <SectionHelpButton
              title="Workspace Hub Help"
              description="Welcome to your collaborative workspace dashboard. Share invite links, manage room settings, and launch tools."
              tips={[
                "Invite Teammates: Copy the link or show the QR code for instant join without login.",
                "Ephemeral Storage: All room files and state are retained in-memory until the expiration countdown ends.",
                "Voice Call: Join the WebRTC audio room directly from the top navigation bar.",
                "Quick Navigation: Jump straight to Code Workspace, Live Preview, Chat, Files, or Package Hub."
              ]}
              align="right"
            />
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.4, margin: 0 }}>
          {room?.description || 'Collaborate in real time with shared code editing, chat, file sharing, live web preview, and WebRTC audio calls.'}
        </p>

        {/* Quick invite link bar */}
        <div
          style={{
            display: 'flex',
            gap: '0.45rem',
            alignItems: 'center',
            backgroundColor: 'var(--bg-main)',
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)'
          }}
        >
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="form-input"
            style={{ border: 'none', background: 'transparent', fontSize: '0.82rem', padding: '0.2rem 0.4rem' }}
            onClick={(e) => e.target.select()}
            title="Room invitation link"
          />
          <button className="btn btn-primary btn-sm" onClick={handleCopy} style={{ flexShrink: 0, padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button className="btn btn-secondary btn-icon sm" onClick={onOpenQR} title="Show Room QR Code">
            <QrCode size={13} />
          </button>
        </div>
      </div>

      {/* 2. Workspace Quick Actions Grid (Compact 4-column) */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>Workspace Hub</h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click a tile to launch</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem' }}>
          <div
            className="feature-card"
            style={{ cursor: 'pointer', padding: '0.75rem 0.85rem', margin: 0, minHeight: 'auto' }}
            onClick={() => onNavigateTab('code')}
          >
            <div className="feature-icon-wrapper" style={{ width: '30px', height: '30px', marginBottom: '0.4rem' }}>
              <Code2 size={16} />
            </div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 2px 0' }}>Code Workspace</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', margin: 0, lineHeight: 1.3 }}>
              Multi-file editor with live cursors &amp; Emmet templates.
            </p>
          </div>

          <div
            className="feature-card"
            style={{ cursor: 'pointer', padding: '0.75rem 0.85rem', margin: 0, minHeight: 'auto' }}
            onClick={() => onNavigateTab('preview')}
          >
            <div className="feature-icon-wrapper" style={{ width: '30px', height: '30px', marginBottom: '0.4rem', color: 'var(--accent-secondary)', backgroundColor: 'var(--bg-hover)' }}>
              <Globe size={16} />
            </div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 2px 0' }}>Live Web Preview</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', margin: 0, lineHeight: 1.3 }}>
              Sandboxed responsive preview for HTML, CSS, JS &amp; React.
            </p>
          </div>

          <div
            className="feature-card"
            style={{ cursor: 'pointer', padding: '0.75rem 0.85rem', margin: 0, minHeight: 'auto' }}
            onClick={() => onNavigateTab('chat')}
          >
            <div className="feature-icon-wrapper" style={{ width: '30px', height: '30px', marginBottom: '0.4rem' }}>
              <MessageSquare size={16} />
            </div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 2px 0' }}>Team Chat</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', margin: 0, lineHeight: 1.3 }}>
              Real-time messaging, code snippet sharing &amp; @mentions.
            </p>
          </div>

          <div
            className="feature-card"
            style={{ cursor: 'pointer', padding: '0.75rem 0.85rem', margin: 0, minHeight: 'auto' }}
            onClick={() => onNavigateTab('files')}
          >
            <div className="feature-icon-wrapper" style={{ width: '30px', height: '30px', marginBottom: '0.4rem' }}>
              <HardDrive size={16} />
            </div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 2px 0' }}>Shared Files</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', margin: 0, lineHeight: 1.3 }}>
              Upload, browse, and download shared assets up to 25MB.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Room Details & WebRTC Audio Echo Advice */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.65rem', flexShrink: 0 }}>
        {/* Room Metadata Card */}
        <div className="card" style={{ padding: '0.75rem 1rem', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Users size={14} color="var(--accent-primary)" />
              Room Metadata
            </h4>
            <button
              className="btn btn-subtle btn-sm"
              onClick={onOpenParticipants}
              style={{ fontSize: '0.72rem', padding: '2px 6px' }}
            >
              View All ({participantCount || room?.participantCount || 1})
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem 0.85rem', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Created:</span>
              <span style={{ fontWeight: 600 }}>{createdDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Host:</span>
              <span style={{ fontWeight: 600 }}>{room?.ownerName || 'Host'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Capacity:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{room?.maxParticipants || 25} limit</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Access:</span>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{room?.visibility}</span>
            </div>
          </div>
        </div>

        {/* 7-Day Retention & Voice Audio Tip Card */}
        <div
          className="card"
          style={{
            padding: '0.75rem 1rem',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.4rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Shield size={14} color="var(--state-success)" />
                7-Day Ephemeral Retention
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Auto-Purged</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.35, margin: 0 }}>
              All code revisions, messages, and uploaded files are automatically and permanently deleted 7 days after creation.
            </p>
          </div>

          {/* WebRTC Audio Echo Guidance Pill */}
          <div
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 'var(--radius-xs)',
              padding: '5px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Headphones size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.73rem', color: 'var(--text-main)', fontWeight: 600 }}>
                Same room? Use headphones to eliminate echo feedback
              </span>
            </div>
            {onOpenAudioHelp && (
              <button
                className="btn btn-subtle btn-sm"
                onClick={onOpenAudioHelp}
                style={{ fontSize: '0.7rem', padding: '1px 6px', height: '20px', color: 'var(--accent-primary)' }}
                title="View Distance & Audio Guide"
              >
                Guide &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
