import React, { useState } from 'react';
import { X, Settings, Shield, AlertTriangle, Save, Power, Key, Lock } from 'lucide-react';
import api from '../../services/api';

export default function RoomSettingsModal({
  room,
  isOwner,
  onUpdateRoom,
  onClose
}) {
  const [name, setName] = useState(room?.name || '');
  const [description, setDescription] = useState(room?.description || '');
  const [visibility, setVisibility] = useState(room?.visibility || 'public');
  const [isSaving, setIsSaving] = useState(false);

  // Host authentication for returning creators
  const [hostPassword, setHostPassword] = useState('');
  const [isAuthenticatingHost, setIsAuthenticatingHost] = useState(false);
  const [hostAuthError, setHostAuthError] = useState(null);

  const handleHostLogin = async (e) => {
    e.preventDefault();
    if (!hostPassword.trim()) return;

    try {
      setIsAuthenticatingHost(true);
      setHostAuthError(null);
      const res = await api.manageHostLogin({
        roomId: room.id,
        password: hostPassword.trim()
      });
      onUpdateRoom(res.room);
      alert('Host access verified! You now have full room management permissions.');
      onClose();
    } catch (err) {
      setHostAuthError(err.message || 'Authentication failed. Please check password or recovery key.');
    } finally {
      setIsAuthenticatingHost(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isOwner) return;

    try {
      setIsSaving(true);
      const updated = await api.updateSettings(room.id, {
        name,
        description,
        visibility
      });
      onUpdateRoom(updated);
      onClose();
    } catch (e) {
      alert('Failed to update room settings: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseRoom = async () => {
    if (!confirm('Are you sure you want to permanently close this room? Connected participants will be disconnected.')) return;
    try {
      await api.closeRoom(room.id);
      window.location.href = '/';
    } catch (e) {
      alert('Failed to close room: ' + e.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} color="var(--accent-primary)" />
            <h3 className="modal-title">Workspace Settings</h3>
          </div>
          <button className="btn btn-subtle btn-icon sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!isOwner && (
          <div style={{
            margin: '1rem 1.25rem 0 1.25rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
              <Shield size={16} />
              <span>Claim Host Controls</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              Are you the room creator returning on a new session or device? Enter your room password or 16-character recovery key to regain owner privileges.
            </p>
            {hostAuthError && (
              <div style={{ fontSize: '0.78rem', color: 'var(--state-error)', marginBottom: '0.5rem' }}>
                {hostAuthError}
              </div>
            )}
            <form onSubmit={handleHostLogin} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="password"
                placeholder="Owner password or recovery key"
                value={hostPassword}
                onChange={(e) => setHostPassword(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
                required
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isAuthenticatingHost || !hostPassword.trim()}
                style={{ whiteSpace: 'nowrap' }}
              >
                <Key size={13} />
                <span>{isAuthenticatingHost ? 'Verifying...' : 'Verify Host'}</span>
              </button>
            </form>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Room Name</label>
              <input
                type="text"
                disabled={!isOwner}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                rows={3}
                disabled={!isOwner}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Room Access Visibility</label>
              <select
                disabled={!isOwner}
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="form-select"
              >
                <option value="public">Public (Anyone with link or QR code can join immediately)</option>
                <option value="private">Private (Join requests require approval from room owner)</option>
              </select>
            </div>

            {isOwner && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--state-error)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={14} /> Danger Zone
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--state-error-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,101,122,0.2)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--state-error)' }}>Close Room</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Immediately end this workspace for all members</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleCloseRoom}
                  >
                    <Power size={13} />
                    <span>Close</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            {isOwner && (
              <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
