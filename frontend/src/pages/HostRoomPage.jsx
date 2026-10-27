import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  KeyRound,
  Plus,
  Shield,
  Globe,
  Lock,
  Clock,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  QrCode,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '../components/navigation/Navbar';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { getRoomJoinUrl } from '../utils/url';

export default function HostRoomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('mode') === 'manage' || searchParams.get('tab') === 'manage' ? 'manage' : 'create';
  const initialRoomId = searchParams.get('roomId') || searchParams.get('id') || '';

  const [activeTab, setActiveTab] = useState(initialTab); // 'create' or 'manage'
  const { displayName: storedName, setSessionData } = useAuth();

  // Create Room State
  const [createDisplayName, setCreateDisplayName] = useState(storedName || '');
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const [templateType, setTemplateType] = useState('web');
  const [maxParticipants, setMaxParticipants] = useState(25);

  // Manage Room State
  const [manageRoomId, setManageRoomId] = useState(initialRoomId);
  const [manageAuthMode, setManageAuthMode] = useState('password'); // 'password' or 'recoveryKey'
  const [managePassword, setManagePassword] = useState('');
  const [manageDisplayName, setManageDisplayName] = useState(storedName || 'Host');
  const [showManagePassword, setShowManagePassword] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Created Room Credential Modal State
  const [createdRoomInfo, setCreatedRoomInfo] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  // Extract clean room ID if user pasted full URL
  const extractRoomId = (input) => {
    const trimmed = input.trim();
    if (trimmed.includes('/join/')) return trimmed.split('/join/').pop().split('?')[0].split('#')[0];
    if (trimmed.includes('/room/')) return trimmed.split('/room/').pop().split('?')[0].split('#')[0];
    return trimmed;
  };

  // Submit: Create Room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!createDisplayName.trim()) {
      setError('Please provide your display name.');
      return;
    }
    if (!ownerPassword.trim()) {
      setError('Please set an owner password to secure your host management access.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await api.createRoom({
        name: roomName.trim() || `${createDisplayName}'s Workspace`,
        description: description.trim(),
        visibility,
        displayName: createDisplayName.trim(),
        templateType,
        ownerPassword: ownerPassword.trim(),
        maxParticipants
      });

      if (res.session) {
        setSessionData(res.session);
      }

      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      let inviteUrl = getRoomJoinUrl(res.room.id);
      if (isLocal) {
        try {
          const net = await api.getNetworkInfo();
          if (
            !net?.isProduction &&
            net?.lanIp &&
            net.lanIp !== 'localhost' &&
            !net.lanIp.startsWith('10.') &&
            !net.lanIp.startsWith('172.')
          ) {
            inviteUrl = `http://${net.lanIp}:5173/join/${res.room.id}`;
          }
        } catch (e) {}
      }

      // Show creation credential card with QR code & recovery key
      setCreatedRoomInfo({
        ...res.room,
        inviteUrl
      });
    } catch (err) {
      setError(err.message || 'Failed to create room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit: Manage Existing Room
  const handleManageRoom = async (e) => {
    e.preventDefault();
    const cleanId = extractRoomId(manageRoomId);

    if (!cleanId) {
      setError('Please enter a room ID or invitation link.');
      return;
    }
    if (!managePassword.trim()) {
      setError('Please enter your owner password or recovery key.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const trimmedCredential = managePassword.trim();
      const isRecovery = manageAuthMode === 'recoveryKey' || trimmedCredential.toUpperCase().startsWith('L2G-');

      const payload = {
        roomId: cleanId,
        displayName: manageDisplayName.trim()
      };

      if (isRecovery) {
        payload.recoveryKey = trimmedCredential.toUpperCase();
      } else {
        payload.password = trimmedCredential;
      }

      const res = await api.manageHostLogin(payload);

      if (res.session) {
        setSessionData(res.session);
      }

      // Successfully authenticated as host -> navigate into room
      navigate(`/room/${cleanId}`);
    } catch (err) {
      setError(err.message || 'Failed to authenticate host access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInvite = async () => {
    if (!createdRoomInfo) return;
    try {
      await navigator.clipboard.writeText(createdRoomInfo.inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      prompt('Copy invite URL:', createdRoomInfo.inviteUrl);
    }
  };

  const copyRecovery = async () => {
    if (!createdRoomInfo?.recoveryKey) return;
    try {
      await navigator.clipboard.writeText(createdRoomInfo.recoveryKey);
      setCopiedRecovery(true);
      setTimeout(() => setCopiedRecovery(false), 2000);
    } catch (e) {
      prompt('Copy recovery key:', createdRoomInfo.recoveryKey);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <Navbar />

      <main className="auth-page-container">
        <div className="card" style={{ maxWidth: '620px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
          {createdRoomInfo ? (
            /* Room Successfully Created Modal View */
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--state-success-bg)', color: 'var(--state-success)', marginBottom: '1.25rem' }}>
                <Check size={28} />
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Room Created Successfully!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
                Your collaborative workspace <strong>{createdRoomInfo.name}</strong> is live.
              </p>

              {/* QR Code */}
              <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '1.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                <QRCodeSVG value={createdRoomInfo.inviteUrl} size={160} level="H" />
              </div>

              {/* Invite Link */}
              <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <label className="form-label">Participant Invitation Link</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    readOnly
                    value={createdRoomInfo.inviteUrl}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    onClick={(e) => e.target.select()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={copyInvite} style={{ flexShrink: 0 }}>
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Participants joining with this link do not need your owner password.
                </div>
              </div>

              {/* Owner Recovery Key Card */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'left', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <KeyRound size={15} />
                    Owner Recovery Key
                  </div>
                  <button className="btn btn-subtle btn-sm" onClick={copyRecovery} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    {copiedRecovery ? <Check size={12} color="var(--state-success)" /> : <Copy size={12} />}
                    <span>{copiedRecovery ? 'Copied' : 'Copy Key'}</span>
                  </button>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '0.05em' }}>
                  {createdRoomInfo.recoveryKey}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Save this key or your owner password. If you close your browser or change computers, use <strong>Manage Existing Room</strong> with your password or this key to regain management access.
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={() => navigate(`/room/${createdRoomInfo.id}`)}
              >
                <span>Enter Workspace Management</span>
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            /* Host Tabs: Create vs Manage */
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div className="badge badge-primary" style={{ marginBottom: '0.65rem' }}>
                  <Shield size={13} />
                  Room Creator & Host Portal
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                  Host Room
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Create a new collaborative space or authenticate to manage an existing room.
                </p>
              </div>

              {/* Mode Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '4px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '1.75rem', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === 'create' ? 'btn-primary' : 'btn-subtle'}`}
                  onClick={() => { setActiveTab('create'); setError(null); }}
                  style={{ borderRadius: 'var(--radius-xs)' }}
                >
                  <Plus size={15} />
                  <span>Create a New Room</span>
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === 'manage' ? 'btn-primary' : 'btn-subtle'}`}
                  onClick={() => { setActiveTab('manage'); setError(null); }}
                  style={{ borderRadius: 'var(--radius-xs)' }}
                >
                  <KeyRound size={15} />
                  <span>Manage Existing Room</span>
                </button>
              </div>

              {error && (
                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Form 1: Create a New Room */}
              {activeTab === 'create' && (
                <form onSubmit={handleCreateRoom}>
                  <div className="form-group">
                    <label className="form-label">Host Display Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Alex, HostMaster"
                      value={createDisplayName}
                      onChange={(e) => setCreateDisplayName(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Room Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Project Team, Frontend Jam"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  {/* Owner Password */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Owner Password (For Managing Room)</label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Owner Only</span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Set password to authenticate as creator later..."
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        className="form-input"
                        style={{ paddingRight: '40px' }}
                        required
                      />
                      <button
                        type="button"
                        className="btn-icon sm btn-subtle"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '8px', top: '7px' }}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      <strong>Important:</strong> Stored securely as a salted hash. This password proves you are the room owner. Participants do <em>not</em> need this password to join.
                    </div>
                  </div>

                  {/* Room Visibility */}
                  <div className="form-group">
                    <label className="form-label">Room Visibility & Joining Rules</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                      <div
                        onClick={() => setVisibility('public')}
                        style={{
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: visibility === 'public' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          backgroundColor: visibility === 'public' ? 'var(--bg-active)' : 'var(--bg-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.875rem' }}>
                          <Globe size={15} color="var(--accent-primary)" />
                          Public Room
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Participants can join immediately without waiting for approval.
                        </div>
                      </div>

                      <div
                        onClick={() => setVisibility('private')}
                        style={{
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: visibility === 'private' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          backgroundColor: visibility === 'private' ? 'var(--bg-active)' : 'var(--bg-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.875rem' }}>
                          <Shield size={15} color="var(--accent-secondary)" />
                          Private Room
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Requests stay saved on the server until you approve them (even if you are offline!).
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Starter Template */}
                  <div className="form-group">
                    <label className="form-label">Starter Template</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                      {[
                        { id: 'webapp', label: '🌐 Web App' },
                        { id: 'text', label: '📝 Text File' },
                        { id: 'c', label: '⚡ C File' },
                        { id: 'py', label: '🐍 Python File' },
                        { id: 'empty', label: '📄 Empty' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`btn btn-sm ${templateType === t.id || (t.id === 'webapp' && templateType === 'web') ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setTemplateType(t.id)}
                          style={{ fontSize: '0.75rem', padding: '0.45rem' }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      💡 Live Web Preview is built-in for Web App (HTML/CSS/JS) development.
                    </div>
                  </div>

                  {/* Maximum Room Capacity */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Maximum Room Capacity (Member Limit)</span>
                      <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>{maxParticipants} max members</span>
                    </label>
                    <select
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(parseInt(e.target.value, 10))}
                      className="form-input"
                      style={{ fontSize: '0.85rem' }}
                    >
                      <option value={5}>5 members (Pair Programming / Small Team)</option>
                      <option value={10}>10 members (Project Group)</option>
                      <option value={20}>20 members (Standard Team)</option>
                      <option value={25}>25 members (Default Workshop)</option>
                      <option value={50}>50 members (Hackathon Room)</option>
                      <option value={100}>100 members (Open Seminar / Maximum)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Clock size={16} color="var(--state-warning)" style={{ flexShrink: 0 }} />
                    <span>Rooms and workspace data automatically expire 7 days after creation.</span>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    disabled={isSubmitting}
                  >
                    <Plus size={18} />
                    <span>{isSubmitting ? 'Creating Room...' : 'Create Room as Owner'}</span>
                  </button>
                </form>
              )}

              {/* Form 2: Manage Existing Room */}
              {activeTab === 'manage' && (
                <form onSubmit={handleManageRoom}>
                  <div className="form-group">
                    <label className="form-label">Room ID or Invite Link</label>
                    <input
                      type="text"
                      placeholder="e.g. room-7x9k2p or full invitation link"
                      value={manageRoomId}
                      onChange={(e) => setManageRoomId(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>Host Authentication Method</label>
                      <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-secondary)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${manageAuthMode === 'password' ? 'btn-primary' : 'btn-subtle'}`}
                          style={{ fontSize: '0.72rem', padding: '2px 8px', height: '22px' }}
                          onClick={() => setManageAuthMode('password')}
                        >
                          Password
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${manageAuthMode === 'recoveryKey' ? 'btn-primary' : 'btn-subtle'}`}
                          style={{ fontSize: '0.72rem', padding: '2px 8px', height: '22px' }}
                          onClick={() => setManageAuthMode('recoveryKey')}
                        >
                          Recovery Key
                        </button>
                      </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <input
                        type={manageAuthMode === 'recoveryKey' || showManagePassword ? 'text' : 'password'}
                        placeholder={
                          manageAuthMode === 'recoveryKey'
                            ? 'L2G-XXXX-XXXX-XXXX-XXXX'
                            : 'Enter room password or L2G- recovery key...'
                        }
                        value={managePassword}
                        onChange={(e) => setManagePassword(e.target.value)}
                        className="form-input"
                        style={{ paddingRight: '40px', fontFamily: manageAuthMode === 'recoveryKey' ? 'var(--font-mono)' : undefined }}
                        required
                      />
                      {manageAuthMode !== 'recoveryKey' && (
                        <button
                          type="button"
                          className="btn-icon sm btn-subtle"
                          onClick={() => setShowManagePassword(!showManagePassword)}
                          style={{ position: 'absolute', right: '8px', top: '7px' }}
                          tabIndex={-1}
                        >
                          {showManagePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      {manageAuthMode === 'recoveryKey'
                        ? 'Forgot your password? Use the 16-character recovery key generated when you created the room to regain owner access.'
                        : 'Enter your room owner password. If you forgot your password, switch to Recovery Key above.'}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Your Display Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Alex (Owner)"
                      value={manageDisplayName}
                      onChange={(e) => setManageDisplayName(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={isSubmitting}
                  >
                    <KeyRound size={18} />
                    <span>{isSubmitting ? 'Authenticating...' : 'Authenticate & Manage Room'}</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
