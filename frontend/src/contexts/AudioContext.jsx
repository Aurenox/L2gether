import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getSocket } from '../services/socket.js';

const AudioCallContext = createContext();

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ],
  iceCandidatePoolSize: 10
};

export function AudioCallProvider({ children }) {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListenerOnly, setIsListenerOnly] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [remotePeers, setRemotePeers] = useState({}); // socketId -> { displayName, isMuted, isSpeaking }
  const [hasRemoteAudioPlaying, setHasRemoteAudioPlaying] = useState(false);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // socketId -> RTCPeerConnection
  const remoteAudioElementsRef = useRef({}); // socketId -> HTMLAudioElement
  const iceCandidateQueuesRef = useRef({}); // socketId -> Array<RTCIceCandidateInit>
  const audioOutputCtxRef = useRef(null); // Web Audio API AudioContext for direct sound playback
  const audioSourceNodesRef = useRef({}); // socketId -> MediaStreamAudioSourceNode
  const isMutedRef = useRef(false);
  const currentRoomIdRef = useRef(null);
  const analyserIntervalRef = useRef(null);
  const speakingCtxRef = useRef(null);

  // Clear permission error
  const clearPermissionError = () => setPermissionError(null);

  // Synchronously unlock Web Audio context during user click gestures
  const ensureAudioOutputUnlocked = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!audioOutputCtxRef.current && AudioContextClass) {
        audioOutputCtxRef.current = new AudioContextClass();
      }
      if (audioOutputCtxRef.current && audioOutputCtxRef.current.state === 'suspended') {
        audioOutputCtxRef.current.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('[Web Audio Output Unlock Error]', e);
    }
  };

  // Global user gesture unlocker for any deferred autoplay audio
  useEffect(() => {
    const handleGestureUnlock = () => {
      ensureAudioOutputUnlocked();
      Object.values(remoteAudioElementsRef.current).forEach((el) => {
        if (el && el.paused) {
          el.play().catch(() => {});
        }
      });
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

  // Helper to flush queued candidates after remote description is set
  const flushQueuedCandidates = async (socketId, pc) => {
    const queue = iceCandidateQueuesRef.current[socketId] || [];
    if (queue.length > 0) {
      console.log(`[WebRTC Audio] Flushing ${queue.length} queued ICE candidates for ${socketId}`);
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          // Ignore candidate errors silently (e.g. redundant candidate)
        }
      }
      iceCandidateQueuesRef.current[socketId] = [];
    }
  };

  // Initialize socket listeners for audio signaling
  const initAudioSocketListeners = (socket, roomId) => {
    currentRoomIdRef.current = roomId;

    // Clean up existing listeners to avoid duplicated event handlers
    socket.off('existing_audio_participants');
    socket.off('peer_joined_audio');
    socket.off('peer_left_audio');
    socket.off('audio_offer');
    socket.off('audio_answer');
    socket.off('audio_ice_candidate');
    socket.off('peer_mute_state');
    socket.off('peer_speaking_state');

    // Received list of peers already in audio upon joining
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
      }
    });

    socket.on('peer_joined_audio', async ({ socketId, displayName }) => {
      console.log('[WebRTC Audio] Peer joined call, initiating offer:', displayName, socketId);
      setRemotePeers((prev) => ({
        ...prev,
        [socketId]: { displayName, isMuted: false, isSpeaking: false }
      }));

      // Initiate connection as caller
      await createPeerConnection(socket, socketId, true, roomId);
    });

    socket.on('peer_left_audio', ({ socketId }) => {
      console.log('[WebRTC Audio] Peer left call:', socketId);
      closePeer(socketId);
    });

    socket.on('audio_offer', async ({ fromSocketId, offer, displayName }) => {
      console.log('[WebRTC Audio] Received offer from:', displayName, fromSocketId);
      setRemotePeers((prev) => ({
        ...prev,
        [fromSocketId]: { displayName: displayName || 'Participant', isMuted: false, isSpeaking: false }
      }));

      const pc = await createPeerConnection(socket, fromSocketId, false, roomId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushQueuedCandidates(fromSocketId, pc);

      const answer = await pc.createAnswer({
        offerToReceiveAudio: true
      });
      await pc.setLocalDescription(answer);

      socket.emit('audio_answer', { targetSocketId: fromSocketId, answer });
    });

    socket.on('audio_answer', async ({ fromSocketId, answer }) => {
      console.log('[WebRTC Audio] Received answer from:', fromSocketId);
      const pc = peerConnectionsRef.current[fromSocketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushQueuedCandidates(fromSocketId, pc);
      }
    });

    socket.on('audio_ice_candidate', async ({ fromSocketId, candidate }) => {
      if (!candidate || !candidate.candidate) return;
      const pc = peerConnectionsRef.current[fromSocketId];
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          // Ignore duplicate / non-viable candidates silently
        }
      } else {
        // Queue candidate until remote description is set
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
    // If an existing PC exists, close it cleanly
    if (peerConnectionsRef.current[remoteSocketId]) {
      try {
        peerConnectionsRef.current[remoteSocketId].close();
      } catch (e) {}
      delete peerConnectionsRef.current[remoteSocketId];
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current[remoteSocketId] = pc;

    // Add local audio tracks if we have microphone access
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    } else {
      // In listen-only mode, add receive-only transceiver
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

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC Audio] ICE state with ${remoteSocketId}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.warn(`[WebRTC Audio] ICE failed with ${remoteSocketId}, restarting ICE...`);
        if (isInitiator) {
          pc.restartIce();
          pc.createOffer({ iceRestart: true, offerToReceiveAudio: true })
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => socket.emit('audio_offer', { targetSocketId: remoteSocketId, offer: pc.localDescription }))
            .catch((e) => console.warn('[WebRTC Audio] ICE restart error:', e));
        }
      }
    };

    // When remote stream arrives, route through Web Audio destination & HTML audio element
    pc.ontrack = (event) => {
      console.log('[WebRTC Audio] Received remote audio stream from:', remoteSocketId);
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      event.track.enabled = true;
      setHasRemoteAudioPlaying(true);

      // 1. PRIMARY: Web Audio API output pipeline (immune to HTMLMediaElement autoplay policy once unlocked)
      try {
        ensureAudioOutputUnlocked();
        const audioCtx = audioOutputCtxRef.current;
        if (audioCtx) {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }
          if (audioSourceNodesRef.current[remoteSocketId]) {
            try { audioSourceNodesRef.current[remoteSocketId].disconnect(); } catch (e) {}
          }
          const source = audioCtx.createMediaStreamSource(stream);
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 1.0;
          source.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          audioSourceNodesRef.current[remoteSocketId] = source;
          console.log('[WebRTC Audio] Stream attached to Web Audio destination node for', remoteSocketId);
        }
      } catch (err) {
        console.warn('[WebRTC Audio] Web Audio output attachment error:', err);
      }

      // 2. SECONDARY: Managed <audio> element kept in layout tree (NOT display: none)
      let audioEl = remoteAudioElementsRef.current[remoteSocketId];
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `remote-audio-${remoteSocketId}`;
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioEl.muted = false;
        audioEl.volume = 1.0;
        audioEl.style.position = 'fixed';
        audioEl.style.top = '-9999px';
        audioEl.style.left = '-9999px';
        audioEl.style.width = '1px';
        audioEl.style.height = '1px';
        audioEl.style.opacity = '0.01';
        audioEl.style.pointerEvents = 'none';
        document.body.appendChild(audioEl);
        remoteAudioElementsRef.current[remoteSocketId] = audioEl;
      }
      audioEl.srcObject = stream;
      audioEl.muted = false;
      audioEl.play().catch((err) => {
        console.warn('[WebRTC Audio] Autoplay deferred pending user gesture:', err);
      });
    };

    if (isInitiator) {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true
      });
      await pc.setLocalDescription(offer);
      socket.emit('audio_offer', { targetSocketId: remoteSocketId, offer });
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
    if (audioSourceNodesRef.current[socketId]) {
      try {
        audioSourceNodesRef.current[socketId].disconnect();
      } catch (e) {}
      delete audioSourceNodesRef.current[socketId];
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
    setRemotePeers((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  };

  // Join audio call in Listen-Only mode (works even when mic is blocked by HTTP on phone)
  const joinAsListener = (roomId) => {
    // Immediately unlock audio output synchronously during user click
    ensureAudioOutputUnlocked();
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
    // 1. Immediately unlock audio output synchronously during user click
    ensureAudioOutputUnlocked();
    setPermissionError(null);

    // Check if mediaDevices API is supported in current context
    const hasMediaDevices = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttpInsecure = window.location.protocol === 'http:' && !isLocalhost;

    if (!hasMediaDevices) {
      console.warn('[WebRTC Audio] mediaDevices.getUserMedia not available in this context.');
      setPermissionError({
        type: isHttpInsecure ? 'INSECURE_HTTP_MOBILE' : 'UNSUPPORTED_BROWSER',
        title: isHttpInsecure ? 'Microphone Blocked (HTTP on Mobile)' : 'Microphone Not Supported',
        message: isHttpInsecure
          ? 'Mobile browsers (Chrome / Safari) require a secure connection (HTTPS) or localhost to access the microphone over Wi-Fi. You can join in Listener Mode right now to hear everyone.'
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
          autoGainControl: true,
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true
        },
        video: false
      });

      localStreamRef.current = stream;
      setIsListenerOnly(false);
      setInCall(true);
      setIsMuted(false);
      isMutedRef.current = false;

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

    // Close all peer connections and audio sinks
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
  };

  // Toggle Mute
  const toggleMute = (roomId) => {
    if (isListenerOnly) {
      // In listener mode, try upgrading to microphone
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

  return (
    <AudioCallContext.Provider
      value={{
        inCall,
        isMuted,
        isSpeaking,
        isListenerOnly,
        permissionError,
        remotePeers,
        peerCount: Object.keys(remotePeers).length + (inCall ? 1 : 0),
        hasRemoteAudioPlaying,
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
