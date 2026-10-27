import React, { useState, useEffect } from 'react';
import { X, Users, Crown, UserMinus, Check, AlertCircle, Shield } from 'lucide-react';
import api from '../../services/api';
import { formatLocalTime } from '../../utils/date';

export default function ParticipantListModal({
  roomId,
  isOwner,
  currentSessionId,
  pendingRequestCount = 0,
  onPendingCountChange,
  onClose
}) {
  const [participants, setParticipants] = useState([]);
  const [requests, setRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [activeTab, setActiveTab] = useState(
    isOwner && pendingRequestCount > 0 ? 'requests' : 'members'
  );

  const loadData = async () => {
    try {
      const pRes = await api.getParticipants(roomId);
      setParticipants(pRes.participants || []);

      if (isOwner) {
        const rRes = await api.getPendingRequests(roomId);
        const reqList = rRes.requests || [];
        setRequests(reqList);
        setRejectedRequests(rRes.rejected || []);
        if (onPendingCountChange) {
          onPendingCountChange(reqList.length);
        }
      }
    } catch (e) {
      console.error('Failed to load participants:', e);
    }
  };

  useEffect(() => {
    if (roomId) loadData();
  }, [roomId, isOwner]);

  const handleApprove = async (requestId) => {
    try {
      await api.approveRequest(roomId, requestId);
      await loadData();
    } catch (e) {
      alert('Failed to approve request: ' + e.message);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await api.rejectRequest(roomId, requestId);
      await loadData();
    } catch (e) {
      alert('Failed to reject request: ' + e.message);
    }
  };

  const handleRemove = async (sessionId, name) => {
    if (!confirm(`Are you sure you want to remove ${name} from this room?`)) return;
    try {
      await api.removeParticipant(roomId, sessionId);
      await loadData();
    } catch (e) {
      alert('Failed to remove participant: ' + e.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--accent-primary)" />
            <h3 className="modal-title">Room Participants</h3>
          </div>
          <button className="btn btn-subtle btn-icon sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {isOwner && (
          <div style={{ display: 'flex', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', gap: '0.5rem' }}>
            <button
              className={`btn btn-sm ${activeTab === 'members' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('members')}
            >
              Members ({participants.length})
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('requests')}
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>Pending Approval</span>
              <span
                style={{
                  backgroundColor: requests.length > 0 ? 'var(--state-error, #EF4444)' : 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
              >
                {requests.length}
              </span>
            </button>
          </div>
        )}

        <div className="modal-body" style={{ minHeight: '200px' }}>
          {activeTab === 'members' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {participants.map((p) => {
                const isHost = p.role === 'owner';
                const isSelf = p.session_id === currentSessionId;

                return (
                  <div
                    key={p.session_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isHost ? 'var(--bg-active)' : 'var(--bg-hover)',
                          color: isHost ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}
                      >
                        {p.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {p.display_name} {isSelf && <span style={{ color: 'var(--text-muted)' }}>(You)</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Joined {formatLocalTime(p.joined_at)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isHost ? (
                        <span className="badge badge-primary">
                          <Crown size={11} />
                          Host
                        </span>
                      ) : (
                        <span className="badge badge-secondary">Member</span>
                      )}

                      {isOwner && !isSelf && (
                        <button
                          className="btn btn-subtle btn-icon sm"
                          onClick={() => handleRemove(p.session_id, p.display_name)}
                          title="Remove participant"
                        >
                          <UserMinus size={14} color="var(--state-error)" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No pending access requests.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.display_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Requested at {formatLocalTime(r.created_at)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApprove(r.id)}
                        >
                          <Check size={14} />
                          <span>Approve</span>
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleReject(r.id)}
                        >
                          <X size={14} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Previously Rejected Requests with Instant Un-reject / Approve */}
              {rejectedRequests.length > 0 && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Previously Rejected ({rejectedRequests.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {rejectedRequests.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.85rem',
                          backgroundColor: 'var(--bg-main)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px dashed rgba(239, 68, 68, 0.35)'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {r.display_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--state-error)' }}>
                            Status: Rejected
                          </div>
                        </div>

                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApprove(r.id)}
                          title="Un-reject and admit user directly to workspace"
                          style={{ fontSize: '0.75rem', padding: '3px 8px', gap: '4px' }}
                        >
                          <Check size={13} />
                          <span>Approve &amp; Admit</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
