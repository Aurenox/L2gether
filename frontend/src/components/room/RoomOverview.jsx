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
  ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getRoomJoinUrl } from '../../utils/url';

export default function RoomOverview({
  room,
  participantCount,
  onNavigateTab,
  onOpenQR,
  onOpenParticipants
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
    <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Hero Welcome Card */}
      <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-secondary) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>
              <Sparkles size={12} />
              L2gether Collaborative Workspace
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{room?.name}</h1>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-warning" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              <Clock size={14} />
              Expires: {expiresDate}
            </span>
            {room?.visibility === 'private' && (
              <span className="badge badge-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                <Shield size={14} />
                Private Room
              </span>
            )}
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {room?.description || 'Collaborate in real time with shared code editing, chat, file sharing, live web preview, and WebRTC audio calls.'}
        </p>

        {/* Quick invite link bar */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--bg-main)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="form-input"
            style={{ border: 'none', background: 'transparent', fontSize: '0.85rem' }}
            onClick={(e) => e.target.select()}
          />
          <button className="btn btn-primary btn-sm" onClick={handleCopy} style={{ flexShrink: 0 }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>
          <button className="btn btn-secondary btn-icon sm" onClick={onOpenQR} title="Show QR Code">
            <QrCode size={14} />
          </button>
        </div>
      </div>

      {/* Workspace Quick Actions Grid */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Workspace Hub</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <div
          className="feature-card"
          style={{ cursor: 'pointer', padding: '1.25rem' }}
          onClick={() => onNavigateTab('code')}
        >
          <div className="feature-icon-wrapper" style={{ width: '38px', height: '38px' }}>
            <Code2 size={18} />
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Code Workspace</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
            Multi-file project editor, Emmet, Shift+! templates, and real-time collaboration.
          </p>
        </div>

        <div
          className="feature-card"
          style={{ cursor: 'pointer', padding: '1.25rem' }}
          onClick={() => onNavigateTab('preview')}
        >
          <div className="feature-icon-wrapper" style={{ width: '38px', height: '38px', color: 'var(--accent-secondary)', backgroundColor: 'var(--bg-hover)' }}>
            <Globe size={18} />
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Live Web Preview</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
            Responsive sandboxed preview for HTML, CSS, JavaScript, and React.
          </p>
        </div>

        <div
          className="feature-card"
          style={{ cursor: 'pointer', padding: '1.25rem' }}
          onClick={() => onNavigateTab('chat')}
        >
          <div className="feature-icon-wrapper" style={{ width: '38px', height: '38px' }}>
            <MessageSquare size={18} />
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Team Chat</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
            Real-time messaging, code snippet sharing, and @mentions.
          </p>
        </div>

        <div
          className="feature-card"
          style={{ cursor: 'pointer', padding: '1.25rem' }}
          onClick={() => onNavigateTab('files')}
        >
          <div className="feature-icon-wrapper" style={{ width: '38px', height: '38px' }}>
            <HardDrive size={18} />
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Shared Files</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
            Upload, browse, and securely download shared project assets.
          </p>
        </div>
      </div>

      {/* Room Details & Retention Guarantee */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={16} color="var(--accent-primary)" />
            Room Metadata
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Created:</span>
              <span style={{ fontWeight: 600 }}>{createdDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Created By:</span>
              <span style={{ fontWeight: 600 }}>{room?.ownerName || 'Host'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Participants:</span>
              <span style={{ fontWeight: 600 }}>
                {participantCount || room?.participantCount || 1} / {room?.maxParticipants || 25} connected
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Max Capacity:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{room?.maxParticipants || 25} members limit</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Access Type:</span>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{room?.visibility}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={16} color="var(--state-success)" />
            7-Day Retention Policy
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
            L2gether rooms are designed for temporary, high-velocity collaboration. All messages, project files, shared documents, and audio signaling automatically expire and purge after 7 days.
          </p>
        </div>
      </div>
    </div>
  );
}
