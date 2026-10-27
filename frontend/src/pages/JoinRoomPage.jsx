import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { LogIn, ArrowRight, Shield, Clock, AlertTriangle, CheckCircle2, QrCode } from 'lucide-react';
import Navbar from '../components/navigation/Navbar';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function JoinRoomPage() {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const { displayName: storedName, setSessionData } = useAuth();

  const [roomInput, setRoomInput] = useState(urlRoomId || '');
  const [displayName, setDisplayName] = useState(storedName || '');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [activePollRoomId, setActivePollRoomId] = useState(null);
  const [isCheckingMembership, setIsCheckingMembership] = useState(Boolean(urlRoomId));

  // Extract room ID from full URL if user pasted a link
  const extractRoomId = (input) => {
    if (!input) return '';
    const trimmed = input.trim();
    if (trimmed.includes('/join/')) {
      return trimmed.split('/join/').pop().split('?')[0].split('#')[0];
    }
    if (trimmed.includes('/room/')) {
      return trimmed.split('/room/').pop().split('?')[0].split('#')[0];
    }
    return trimmed;
  };

  // Auto-verify if the user is already a member / already logged in for this room
  useEffect(() => {
    const targetRoomId = extractRoomId(urlRoomId || roomInput);
    if (!targetRoomId) {
      setIsCheckingMembership(false);
      return;
    }

    let isMounted = true;
    async function checkExistingAccess() {
      try {
        setIsCheckingMembership(true);
        const roomData = await api.getRoom(targetRoomId);
        if (!isMounted) return;

        // If the user is already a recognized member or room owner, enter immediately without re-entering!
        if (roomData && (roomData.isMember || roomData.isOwner)) {
          navigate(`/room/${targetRoomId}`, { replace: true });
          return;
        }

        // If the user already has a pending join request awaiting approval (e.g. refreshed the client)
        if (roomData && roomData.pendingApproval) {
          setIsPendingApproval(true);
          setActivePollRoomId(targetRoomId);
          return;
        }

        // If user's join request was rejected
        if (roomData && roomData.isRejected) {
          setError('Your request to join this private room was rejected by the owner.');
        }
      } catch (e) {
        // Not a joined member yet, proceed with standard join flow
      } finally {
        if (isMounted) setIsCheckingMembership(false);
      }
    }

    checkExistingAccess();
    return () => {
      isMounted = false;
    };
  }, [urlRoomId]);

  const handleJoin = async (e) => {
    e.preventDefault();
    const cleanRoomId = extractRoomId(roomInput);

    if (!cleanRoomId) {
      setError('Please enter a valid room ID or invitation link.');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter a display name to join.');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      // Check if already an authorized member first
      try {
        const existingRoom = await api.getRoom(cleanRoomId);
        if (existingRoom && (existingRoom.isMember || existingRoom.isOwner)) {
          navigate(`/room/${cleanRoomId}`);
          return;
        }
      } catch (checkErr) {}

      const res = await api.joinRoom(cleanRoomId, displayName.trim());

      if (res.session) {
        setSessionData(res.session);
      }

      if (res.status === 'joined') {
        navigate(`/room/${cleanRoomId}`);
      } else if (res.status === 'pending') {
        window.history.replaceState(null, '', `/join/${cleanRoomId}`);
        setIsPendingApproval(true);
        setActivePollRoomId(cleanRoomId);
      }
    } catch (err) {
      if (err.status === 410 || err.code === 'ROOM_EXPIRED') {
        navigate(`/room/${cleanRoomId}/expired`);
        return;
      }
      setError(err.message || 'Failed to join room.');
    } finally {
      setIsJoining(false);
    }
  };


  // Poll for owner approval if in pending state
  useEffect(() => {
    if (!isPendingApproval || !activePollRoomId) return;

    const interval = setInterval(async () => {
      try {
        const room = await api.getRoom(activePollRoomId);
        if (room && (room.isMember || room.isOwner)) {
          clearInterval(interval);
          navigate(`/room/${activePollRoomId}`);
        } else if (room && !room.pendingApproval && !room.isMember) {
          // No longer pending and not admitted -> rejected or removed
          clearInterval(interval);
          setIsPendingApproval(false);
          setError('Your request to join this private room was rejected by the owner.');
        }
      } catch (e) {
        if (e.status === 403 || e.message?.toLowerCase().includes('reject')) {
          clearInterval(interval);
          setIsPendingApproval(false);
          setError('Your request to join this private room was rejected by the owner.');
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isPendingApproval, activePollRoomId, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <Navbar />

      <main className="auth-page-container">
        <div className="card" style={{ maxWidth: '480px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
          {isCheckingMembership ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--bg-active)', color: 'var(--accent-primary)', marginBottom: '1.25rem' }}>
                <Clock size={30} className="live-pulse" />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Verifying Room Access...
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Reconnecting you directly to the workspace without entering again.
              </p>
            </div>
          ) : isPendingApproval ? (
            /* Pending Approval Waiting State */
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--bg-active)', color: 'var(--accent-primary)', marginBottom: '1.5rem' }}>
                <Shield size={32} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                Waiting for Host Approval
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '2rem' }}>
                This is a private room. Your request has been sent to the room owner. You will be automatically redirected as soon as you are approved.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                <span className="live-pulse" />
                Listening for approval...
              </div>
            </div>
          ) : (
            /* Standard Join Form */
            <>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Join a Workspace</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Paste a room invitation link or enter the room code.
                </p>
              </div>

              {error && (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--state-error)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1.5rem',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleJoin}>
                <div className="form-group">
                  <label className="form-label">Room Code or Invite Link</label>
                  <input
                    type="text"
                    placeholder="e.g. room-7x9k2p or full link"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Your Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex, Guest234"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  disabled={isJoining}
                >
                  <LogIn size={18} />
                  <span>{isJoining ? 'Connecting...' : 'Join Workspace'}</span>
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Are you the room host? </span>
                <Link
                  to={roomInput ? `/host?tab=manage&roomId=${encodeURIComponent(extractRoomId(roomInput))}` : '/host?tab=manage'}
                  style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Manage with Password or Recovery Key
                </Link>
                <div style={{ marginTop: '0.45rem', fontSize: '0.78rem' }}>
                  <span>Want to create a new room? </span>
                  <Link to="/host" style={{ color: 'var(--accent-secondary)', fontWeight: 600, textDecoration: 'none' }}>
                    Create Room
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
