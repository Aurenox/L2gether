import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Shield, Globe, Sparkles, Layers, ArrowRight } from 'lucide-react';
import Navbar from '../components/navigation/Navbar';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const { displayName: storedName, setSessionData } = useAuth();

  const [displayName, setDisplayName] = useState(storedName || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [templateType, setTemplateType] = useState('web');
  const [maxParticipants, setMaxParticipants] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please provide a display name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await api.createRoom({
        name: name.trim() || `${displayName}'s Workspace`,
        description: description.trim(),
        visibility,
        displayName: displayName.trim(),
        templateType,
        maxParticipants
      });

      // Save guest session
      if (res.session) {
        setSessionData(res.session);
      }

      // Navigate straight into the room workspace!
      navigate(`/room/${res.room.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <Navbar />

      <main className="auth-page-container">
        <div className="card" style={{ maxWidth: '580px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="badge badge-primary" style={{ marginBottom: '0.75rem' }}>
              <Sparkles size={13} />
              Instant Workspace
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Create a New Room</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Start an ephemeral collaborative workspace. No account registration required.
            </p>
          </div>

          {error && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Display Name */}
            <div className="form-group">
              <label className="form-label">Your Display Name</label>
              <input
                type="text"
                placeholder="e.g. Alex, CodeMaster, DevHero"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Room Name */}
            <div className="form-group">
              <label className="form-label">Room Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Frontend Hackathon, Algorithm Jam"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Starter Template */}
            <div className="form-group">
              <label className="form-label">Starter Project Template</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
                <div
                  onClick={() => setTemplateType('webapp')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: (templateType === 'webapp' || templateType === 'web') ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    backgroundColor: (templateType === 'webapp' || templateType === 'web') ? 'var(--bg-active)' : 'var(--bg-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>🌐 Web App</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HTML, CSS, JS with Live Preview</div>
                </div>

                <div
                  onClick={() => setTemplateType('text')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: templateType === 'text' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    backgroundColor: templateType === 'text' ? 'var(--bg-active)' : 'var(--bg-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>📝 Text File</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>notes.txt scratchpad</div>
                </div>

                <div
                  onClick={() => setTemplateType('c')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: templateType === 'c' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    backgroundColor: templateType === 'c' ? 'var(--bg-active)' : 'var(--bg-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>⚡ C File</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>main.c source</div>
                </div>

                <div
                  onClick={() => setTemplateType('py')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: (templateType === 'py' || templateType === 'python') ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    backgroundColor: (templateType === 'py' || templateType === 'python') ? 'var(--bg-active)' : 'var(--bg-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>🐍 Python File</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>main.py script</div>
                </div>

                <div
                  onClick={() => setTemplateType('empty')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: templateType === 'empty' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    backgroundColor: templateType === 'empty' ? 'var(--bg-active)' : 'var(--bg-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>📄 Empty</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Empty workspace</div>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                💡 <em>Live Web Preview tab is built-in for Web App (HTML/CSS/JS) development.</em>
              </div>
            </div>

            {/* Visibility */}
            <div className="form-group">
              <label className="form-label">Room Visibility</label>
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
                    Public
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Anyone with the link or QR can join immediately.
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
                    Private
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Incoming participants require host approval.
                  </div>
                </div>
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

            {/* 7-day retention notice */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <Clock size={16} color="var(--state-warning)" style={{ flexShrink: 0 }} />
              <span>
                <strong>7-Day Retention:</strong> Workspace files, chat, and resources will automatically expire and be deleted 7 days after creation.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={isSubmitting}
            >
              <Plus size={18} />
              <span>{isSubmitting ? 'Creating Workspace...' : 'Create Room & Start Coding'}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
