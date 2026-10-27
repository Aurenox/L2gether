import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getSocket } from '../services/socket.js';

const AudioCallContext = createContext();

const getRtcConfig = () => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];

  // Optional custom TURN relay configuration for strict enterprise or cellular networks
  const turnUrl = import.meta.env?.VITE_TURN_SERVER_URL;
  const turnUser = import.meta.env?.VITE_TURN_USERNAME;
  const turnPass = import.meta.env?.VITE_TURN_CREDENTIAL;
  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnPass
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };
};

const RTC_CONFIG = getRtcConfig();

export function AudioCallProvider({ children }) {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListenerOnly, setIsListenerOnly] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [remotePeers, setRemotePeers] = useState({}); // socketId -> { displayName, isMuted, isSpeaking }
  const [roomCallers, setRoomCallers] = useState([]);
  const [roomCallCount, setRoomCallCount] = useState(0);
  const [hasRemoteAudioPlaying, setHasRemoteAudioPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // socketId -> RTCPeerConnection
  const remoteAudioElementsRef = useRef({}); // socketId -> HTMLAudioElement
  const iceCandidateQueuesRef = useRef({}); // socketId -> Array<RTCIceCandidateInit>
  const isMakingOfferRef = useRef({}); // socketId -> boolean
  const ignoreOfferRef = useRef({}); // socketId -> boolean
  const isMutedRef = useRef(false);
  const currentRoomIdRef = useRef(null);
  const analyserIntervalRef = useRef(null);
  const speakingCtxRef = useRef(null);
  const syncIntervalRef = useRef(null);

  // Clear permission error
  const clearPermissionError = () => setPermissionError(null);

  // Global user gesture unlocker for any deferred autoplay audio
  const unlockAllAudioElements = () => {
    Object.values(remoteAudioElementsRef.current).forEach((el) => {
      if (el) {
        el.muted = false;
        el.volume = 1.0;
        if (el.paused) {
          el.play().then(() => {
            setHasRemoteAudioPlaying(true);
            setAutoplayBlocked(false);
          }).catch(() => {});
        }
      }
    });
  };

  useEffect(() => {
    const handleGestureUnlock = () => {
      unlockAllAudioElements();
    };

    window.addEventListener('click', handleGestureUnlock);
    window.addEventListener('touchstart', handleGestureUnlock);
    window.addEventListener('keydown', handleGestureUnlock);

    return () => {
      window.removeEventListener('click', handleGestureUnlock);
      window.removeEventListener('touchstart', handleGestureUnlock);
      window.removeEventListener('keydown', handleGestureUnlock);
    };
  }, []);

  // Room-level authoritative call updates from backend (exact participant count)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRoomAudioUpdate = ({ activeCallCount, activeCallers }) => {
      if (typeof activeCallCount === 'number') {
        setRoomCallCount(activeCallCount);
      }
      if (Array.isArray(activeCallers)) {
        setRoomCallers(activeCallers);

        // Keep remotePeers metadata synced with authoritative server list
        setRemotePeers((prev) => {
          const next = { ...prev };
          activeCallers.forEach((caller) => {
            if (caller.socketId && caller.socketId !== socket.id) {
              if (!next[caller.socketId]) {
                next[caller.socketId] = {
                  displayName: caller.displayName || 'Participant',
                  isMuted: Boolean(caller.isMuted),
                  isSpeaking: false
                };
              } else {
                next[caller.socketId].displayName = caller.displayName || next[caller.socketId].displayName;
                next[caller.socketId].isMuted = Boolean(caller.isMuted);
              }
            }
          });
          return next;
        });
      }
    };

    socket.on('audio_participants_updated', handleRoomAudioUpdate);
    return () => {
      socket.off('audio_participants_updated', handleRoomAudioUpdate);
    };
  }, []);

  // Periodic heartbeat while in a call to guarantee 100% synchronization and self-healing
  useEffect(() => {
    if (inCall && currentRoomIdRef.current) {
      const socket = getSocket();
      if (socket) {
        socket.emit('audio_sync_request', { roomId: currentRoomIdRef.current });
      }

      syncIntervalRef.current = setInterval(() => {
        const s = getSocket();
        if (s && currentRoomIdRef.current) {
          s.emit('audio_sync_request', { roomId: currentRoomIdRef.current });
        }
      }, 5000);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
      };
    }
  }, [inCall]);

  // Helper to flush queued ICE candidates after remote description is set
  const flushQueuedCandidates = async (socketId, pc) => {
    const queue = iceCandidateQueuesRef.current[socketId] || [];
    iceCandidateQueuesRef.current[socketId] = [];
    if (queue.length > 0) {
      console.log(`[WebRTC Audio] Flushing ${queue.length} queued ICE candidates for ${socketId}`);
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          // Ignore duplicate / non-viable candidates silently
        }
      }
    }
  };

  // Attach local audio track to all active peer connections
  const syncLocalTracksToAllPeers = (stream) => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    Object.entries(peerConnectionsRef.current).forEach(([socketId, pc]) => {
      if (pc && pc.signalingState !== 'closed') {
        const senders = pc.getSenders ? pc.getSenders() : [];
        const existingSender = senders.find((s) => s.track && s.track.kind === 'audio');
        if (existingSender) {
          existingSender.replaceTrack(audioTrack).catch((e) => {
            console.warn(`[WebRTC Audio] replaceTrack error with ${socketId}:`, e);
          });
        } else {
          try {
            pc.addTrack(audioTrack, stream);
          } catch (e) {
            console.warn(`[WebRTC Audio] addTrack error with ${socketId}:`, e);
          }
        }
      }
    });
  };

  // Initialize socket listeners for audio signaling
  const initAudioSocketListeners = (socket, roomId) => {
    currentRoomIdRef.current = roomId;

    socket.off('existing_audio_participants');
    socket.off('peer_joined_audio');
    socket.off('peer_left_audio');
    socket.off('audio_offer');
    socket.off('audio_answer');
    socket.off('audio_ice_candidate');
    socket.off('peer_mute_state');
    socket.off('peer_speaking_state');

    // Received list of peers already in audio upon joining
    // The JOINING peer creates offers to all existing peers
    socket.on('existing_audio_participants', ({ peers }) => {
      console.log('[WebRTC Audio] Existing audio participants received:', peers);
      if (peers && peers.length > 0) {
        setRemotePeers((prev) => {
          const next = { ...prev };
          peers.forEach((p) => {
            next[p.socketId] = {
              displayName: p.displayName,
              isMuted: Boolean(p.isMuted),
              isSpeaking: false
            };
          });
          return next;
        });

        // The newly joined peer is the initiator for existing participants
        peers.forEach((p) => {
          createPeerConnection(socket, p.socketId, true, roomId).catch((e) => {
            console.warn('[WebRTC Audio] Initiator connection error:', e);
          });
        });
      }
    });

    // An existing peer receives notification that a new peer joined
    // The existing peer creates the connection in RECEIVER mode (waits for offer)
    socket.on('peer_joined_audio', async ({ socketId, displayName }) => {
      console.log('[WebRTC Audio] Peer joined call (waiting for offer):', displayName, socketId);
      setRemotePeers((prev) => ({
        ...prev,
        [socketId]: { displayName, isMuted: false, isSpeaking: false }
      }));

      // Existing peer prepares the peer connection and waits for the joiner's offer
      await createPeerConnection(socket, socketId, false, roomId);
    });

    socket.on('peer_left_audio', ({ socketId }) => {
      console.log('[WebRTC Audio] Peer left call:', socketId);
      closePeer(socketId);
    });

    // Handle incoming offer with W3C Perfect Negotiation Glare Protection
    socket.on('audio_offer', async ({ fromSocketId, offer, displayName }) => {
      console.log('[WebRTC Audio] Received offer from:', displayName, fromSocketId);
      setRemotePeers((prev) => ({
        ...prev,
        [fromSocketId]: {
          displayName: displayName || prev[fromSocketId]?.displayName || 'Participant',
          isMuted: prev[fromSocketId]?.isMuted || false,
          isSpeaking: false
        }
      }));

      let pc = peerConnectionsRef.current[fromSocketId];
      if (!pc || pc.signalingState === 'closed') {
        pc = await createPeerConnection(socket, fromSocketId, false, roomId);
      }

      // W3C Perfect Negotiation Glare Resolution:
      // The polite peer yields if there is an offer collision
      const isPolite = String(socket.id) > String(fromSocketId);
      const isOfferCollision =
        offer.type === 'offer' &&
        (pc.signalingState !== 'stable' || isMakingOfferRef.current[fromSocketId]);

      ignoreOfferRef.current[fromSocketId] = !isPolite && isOfferCollision;
      if (ignoreOfferRef.current[fromSocketId]) {
        console.log('[WebRTC Audio] Glare: Impolite peer ignoring duplicate offer from:', fromSocketId);
        return;
      }

      if (isOfferCollision) {
        console.log('[WebRTC Audio] Glare: Polite peer rolling back offer for:', fromSocketId);
        try {
          await pc.setLocalDescription({ type: 'rollback' });
        } catch (e) {
          console.warn('[WebRTC Audio] Rollback warning:', e);
        }
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushQueuedCandidates(fromSocketId, pc);

        const answer = await pc.createAnswer({
          offerToReceiveAudio: true
        });
        await pc.setLocalDescription(answer);

        socket.emit('audio_answer', { targetSocketId: fromSocketId, answer });
      } catch (err) {
        console.error('[WebRTC Audio] Failed to handle audio offer:', err);
      }
    });

    socket.on('audio_answer', async ({ fromSocketId, answer }) => {
      console.log('[WebRTC Audio] Received answer from:', fromSocketId);
      const pc = peerConnectionsRef.current[fromSocketId];
      if (pc && pc.signalingState !== 'closed') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushQueuedCandidates(fromSocketId, pc);
        } catch (err) {
          console.error('[WebRTC Audio] Failed to set remote answer:', err);
        }
      }
    });

    socket.on('audio_ice_candidate', async ({ fromSocketId, candidate }) => {
      if (!candidate || !candidate.candidate) return;
      const pc = peerConnectionsRef.current[fromSocketId];

      if (pc && pc.remoteDescription && pc.remoteDescription.type && pc.signalingState !== 'closed') {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          // Ignore redundant / stale candidates
        }
      } else {
        // Queue candidate until remote description is ready
        if (!iceCandidateQueuesRef.current[fromSocketId]) {
          iceCandidateQueuesRef.current[fromSocketId] = [];
        }
        iceCandidateQueuesRef.current[fromSocketId].push(candidate);
      }
    });

    socket.on('peer_mute_state', ({ socketId, isMuted: peerMuted }) => {
      setRemotePeers((prev) => {
        if (!prev[socketId]) return prev;
        return {
          ...prev,
          [socketId]: { ...prev[socketId], isMuted: peerMuted }
        };
      });
    });

    socket.on('peer_speaking_state', ({ socketId, isSpeaking: peerSpeaking }) => {
      setRemotePeers((prev) => {
        if (!prev[socketId]) return prev;
        return {
          ...prev,
          [socketId]: { ...prev[socketId], isSpeaking: peerSpeaking }
        };
      });
    });
  };

  const createPeerConnection = async (socket, remoteSocketId, isInitiator, roomId) => {
    // If an existing PC is in stable state with active tracks, reuse it
    let pc = peerConnectionsRef.current[remoteSocketId];
    if (pc && pc.signalingState !== 'closed') {
      if (isInitiator) {
        try {
          isMakingOfferRef.current[remoteSocketId] = true;
          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);
          socket.emit('audio_offer', { targetSocketId: remoteSocketId, offer });
        } catch (err) {
          console.warn('[WebRTC Audio] Renegotiation offer error:', err);
        } finally {
          isMakingOfferRef.current[remoteSocketId] = false;
        }
      }
      return pc;
    }

    // Close any dead connection before creating new
    if (pc) {
      try { pc.close(); } catch (e) {}
    }

    pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current[remoteSocketId] = pc;
    isMakingOfferRef.current[remoteSocketId] = false;
    ignoreOfferRef.current[remoteSocketId] = false;

    // Add local microphone tracks
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    } else {
      // In listen-only mode, register receive-only transceiver
      try {
        pc.addTransceiver('audio', { direction: 'recvonly' });
      } catch (e) {}
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('audio_ice_candidate', {
          targetSocketId: remoteSocketId,
          candidate: event.candidate
        });

        // Unmask .local mDNS host candidate for localhost/LAN testing
        if (event.candidate.candidate && event.candidate.candidate.includes('.local')) {
          const host = window.location.hostname;
          const ipsToTry = new Set();
          if (host && host !== 'localhost') ipsToTry.add(host);
          ipsToTry.add('127.0.0.1');

          for (const ip of ipsToTry) {
            const unmaskedStr = event.candidate.candidate.replace(/[a-zA-Z0-9-]+\.local/, ip);
            socket.emit('audio_ice_candidate', {
              targetSocketId: remoteSocketId,
              candidate: {
                candidate: unmaskedStr,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                usernameFragment: event.candidate.usernameFragment
              }
            });
          }
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC Audio] Peer state with ${remoteSocketId}:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.warn(`[WebRTC Audio] Connection failed with ${remoteSocketId}, triggering ICE restart...`);
        if (isInitiator) {
          pc.restartIce?.();
          pc.createOffer({ iceRestart: true, offerToReceiveAudio: true })
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => socket.emit('audio_offer', { targetSocketId: remoteSocketId, offer: pc.localDescription }))
            .catch((e) => console.warn('[WebRTC Audio] ICE restart error:', e));
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC Audio] ICE state with ${remoteSocketId}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setHasRemoteAudioPlaying(true);
      } else if (pc.iceConnectionState === 'failed') {
        if (isInitiator) {
          pc.restartIce?.();
          pc.createOffer({ iceRestart: true, offerToReceiveAudio: true })
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => socket.emit('audio_offer', { targetSocketId: remoteSocketId, offer: pc.localDescription }))
            .catch(() => {});
        }
      }
    };

    // When remote stream arrives, route through hardware-accelerated HTMLAudioElement
    pc.ontrack = (event) => {
      console.log('[WebRTC Audio] Received remote audio track from:', remoteSocketId);
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      event.track.enabled = true;

      let audioEl = remoteAudioElementsRef.current[remoteSocketId];
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `remote-audio-${remoteSocketId}`;
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioEl.muted = false;
        audioEl.volume = 1.0;
        // Non-throttled accessible positioning
        audioEl.style.position = 'fixed';
        audioEl.style.bottom = '0px';
        audioEl.style.right = '0px';
        audioEl.style.width = '1px';
        audioEl.style.height = '1px';
        audioEl.style.opacity = '0.001';
        audioEl.style.pointerEvents = 'none';
        audioEl.style.zIndex = '-1';
        document.body.appendChild(audioEl);
        remoteAudioElementsRef.current[remoteSocketId] = audioEl;
      }

      audioEl.srcObject = stream;
      audioEl.muted = false;
      audioEl.volume = 1.0;

      // Play immediately
      audioEl.play().then(() => {
        setHasRemoteAudioPlaying(true);
        setAutoplayBlocked(false);
      }).catch((err) => {
        console.warn('[WebRTC Audio] Autoplay deferred pending user interaction:', err);
        setAutoplayBlocked(true);
      });

      // Play on first incoming RTP network packet
      event.track.onunmute = () => {
        console.log('[WebRTC Audio] Track unmuted (incoming network packets verified) for', remoteSocketId);
        if (audioEl) {
          audioEl.muted = false;
          audioEl.volume = 1.0;
          audioEl.play().then(() => {
            setHasRemoteAudioPlaying(true);
            setAutoplayBlocked(false);
          }).catch(() => {
            setAutoplayBlocked(true);
          });
        }
      };
    };

    if (isInitiator) {
      try {
        isMakingOfferRef.current[remoteSocketId] = true;
        const offer = await pc.createOffer({
          offerToReceiveAudio: true
        });
        await pc.setLocalDescription(offer);
        socket.emit('audio_offer', { targetSocketId: remoteSocketId, offer });
      } catch (err) {
        console.warn('[WebRTC Audio] Failed to create initial offer:', err);
      } finally {
        isMakingOfferRef.current[remoteSocketId] = false;
      }
    }

    return pc;
  };

  const closePeer = (socketId) => {
    if (peerConnectionsRef.current[socketId]) {
      try {
        peerConnectionsRef.current[socketId].close();
      } catch (e) {}
      delete peerConnectionsRef.current[socketId];
    }
    if (remoteAudioElementsRef.current[socketId]) {
      try {
        remoteAudioElementsRef.current[socketId].srcObject = null;
        remoteAudioElementsRef.current[socketId].remove();
      } catch (e) {}
      delete remoteAudioElementsRef.current[socketId];
    }
    if (iceCandidateQueuesRef.current[socketId]) {
      delete iceCandidateQueuesRef.current[socketId];
    }
    delete isMakingOfferRef.current[socketId];
    delete ignoreOfferRef.current[socketId];

    setRemotePeers((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  };

  // Join audio call in Listen-Only mode (works even when mic is blocked by HTTP on mobile)
  const joinAsListener = (roomId) => {
    unlockAllAudioElements();
    setPermissionError(null);
    setIsListenerOnly(true);
    setInCall(true);
    setIsMuted(true);
    isMutedRef.current = true;
    setIsSpeaking(false);

    const socket = getSocket();
    initAudioSocketListeners(socket, roomId);
    socket.emit('audio_join', { roomId });
  };

  // Start Audio Call with Microphone
  const startAudioCall = async (roomId) => {
    unlockAllAudioElements();
    setPermissionError(null);

    const hasMediaDevices = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttpInsecure = window.location.protocol === 'http:' && !isLocalhost;

    if (!hasMediaDevices) {
      console.warn('[WebRTC Audio] mediaDevices.getUserMedia not available in this context.');
      setPermissionError({
        type: isHttpInsecure ? 'INSECURE_HTTP_MOBILE' : 'UNSUPPORTED_BROWSER',
        title: isHttpInsecure ? 'Microphone Blocked (HTTP on Mobile)' : 'Microphone Not Supported',
        message: isHttpInsecure
          ? 'Mobile browsers require a secure connection (HTTPS) or localhost to access the microphone. You can join in Listener Mode right now to hear everyone.'
          : 'Your current browser environment does not support audio recording.',
        isHttpInsecure,
        canListenOnly: true,
        roomId
      });
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      localStreamRef.current = stream;
      setIsListenerOnly(false);
      setInCall(true);
      setIsMuted(false);
      isMutedRef.current = false;

      // Sync local stream tracks to any already-created peer connections
      syncLocalTracksToAllPeers(stream);

      const socket = getSocket();
      initAudioSocketListeners(socket, roomId);
      socket.emit('audio_join', { roomId });

      // Setup audio speaking activity detector
      setupSpeakingDetector(stream, socket, roomId);
      return true;
    } catch (err) {
      console.error('[WebRTC Audio] Failed to access microphone:', err);
      let userMsg = 'Microphone permission was denied. You can still join as a Listener to hear others, or allow microphone access in your browser settings.';
      if (err.name === 'NotFoundError') {
        userMsg = 'No microphone device was detected on your system.';
      }

      setPermissionError({
        type: 'PERMISSION_DENIED',
        title: 'Microphone Permission Needed',
        message: userMsg,
        isHttpInsecure,
        canListenOnly: true,
        roomId
      });
      return false;
    }
  };

  // Setup RMS volume detector for speaking ring indicator
  const setupSpeakingDetector = (stream, socket, roomId) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (speakingCtxRef.current) {
        try { speakingCtxRef.current.close(); } catch (e) {}
      }
      const audioCtx = new AudioContextClass();
      speakingCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let wasSpeaking = false;

      analyserIntervalRef.current = setInterval(() => {
        if (!localStreamRef.current || isMutedRef.current) {
          if (wasSpeaking) {
            wasSpeaking = false;
            setIsSpeaking(false);
            socket.emit('audio_speaking_state', { roomId, isSpeaking: false });
          }
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const speakingNow = avg > 12;

        if (speakingNow !== wasSpeaking) {
          wasSpeaking = speakingNow;
          setIsSpeaking(speakingNow);
          socket.emit('audio_speaking_state', { roomId, isSpeaking: speakingNow });
        }
      }, 150);
    } catch (e) {
      console.warn('[AudioContext Detector]', e);
    }
  };

  // Leave Audio Call
  const leaveAudioCall = (roomId) => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    if (analyserIntervalRef.current) {
      clearInterval(analyserIntervalRef.current);
      analyserIntervalRef.current = null;
    }

    if (speakingCtxRef.current) {
      try { speakingCtxRef.current.close(); } catch (e) {}
      speakingCtxRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections and audio elements
    Object.keys(peerConnectionsRef.current).forEach((socketId) => {
      closePeer(socketId);
    });

    const socket = getSocket();
    if (socket && (roomId || currentRoomIdRef.current)) {
      socket.emit('audio_leave', { roomId: roomId || currentRoomIdRef.current });
    }

    setInCall(false);
    setIsMuted(false);
    isMutedRef.current = false;
    setIsSpeaking(false);
    setIsListenerOnly(false);
    setRemotePeers({});
    setHasRemoteAudioPlaying(false);
    setAutoplayBlocked(false);
  };

  // Toggle Mute
  const toggleMute = (roomId) => {
    if (isListenerOnly) {
      startAudioCall(roomId || currentRoomIdRef.current);
      return;
    }
    if (!localStreamRef.current) return;
    const newMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMuted;
    });
    setIsMuted(newMuted);
    isMutedRef.current = newMuted;

    const socket = getSocket();
    if (socket && (roomId || currentRoomIdRef.current)) {
      socket.emit('audio_mute_state', {
        roomId: roomId || currentRoomIdRef.current,
        isMuted: newMuted
      });
    }
  };

  useEffect(() => {
    return () => {
      leaveAudioCall();
    };
  }, []);

  // Compute uniform, authoritative participant count
  const effectivePeerCount = inCall
    ? Math.max(roomCallCount, Object.keys(remotePeers).length + 1)
    : roomCallCount;

  return (
    <AudioCallContext.Provider
      value={{
        inCall,
        isMuted,
        isSpeaking,
        isListenerOnly,
        permissionError,
        remotePeers,
        roomCallers,
        activeRoomCallCount: roomCallCount,
        peerCount: effectivePeerCount,
        hasRemoteAudioPlaying,
        autoplayBlocked,
        unlockAllAudioElements,
        startAudioCall,
        joinAsListener,
        leaveAudioCall,
        toggleMute,
        clearPermissionError
      }}
    >
      {children}
    </AudioCallContext.Provider>
  );
}

export function useAudioCall() {
  const context = useContext(AudioCallContext);
  if (!context) throw new Error('useAudioCall must be used within AudioCallProvider');
  return context;
}

export default AudioCallContext;
