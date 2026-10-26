import React from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Headphones,
  Volume2
} from 'lucide-react';
import { useAudioCall } from '../../contexts/AudioContext';

export default function MobileAudioCallBar({ roomId }) {
  const {
    inCall,
    isMuted,
    isSpeaking,
    isListenerOnly,
    peerCount,
    hasRemoteAudioPlaying,
    toggleMute,
    leaveAudioCall,
    startAudioCall
  } = useAudioCall();

  if (!inCall) return null;

  return (
    <div className="mobile-floating-audio-bar">
      {/* Call Status & Peers Indicator */}
      <div className="audio-bar-status">
        <div
          className={`audio-status-dot ${isSpeaking ? 'speaking-pulse' : ''} ${isListenerOnly ? 'listener-dot' : ''}`}
        />
        <div className="audio-bar-meta">
          <div className="audio-bar-label">
            {isListenerOnly ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Headphones size={11} color="var(--accent-primary)" />
                <span>Listening</span>
              </span>
            ) : isSpeaking ? (
              <span style={{ color: 'var(--state-success)', fontWeight: 600 }}>Speaking</span>
            ) : isMuted ? (
              <span style={{ color: 'var(--text-muted)' }}>Muted</span>
            ) : (
              <span style={{ color: 'var(--state-success)' }}>Voice Live</span>
            )}
          </div>
          <div className="audio-bar-peers">
            <Radio size={10} color="var(--text-muted)" />
            <span>{peerCount} in call</span>
            {hasRemoteAudioPlaying && <Volume2 size={10} color="#34d399" title="Sound is active" />}
          </div>
        </div>
      </div>

      {/* Center / Action Buttons */}
      <div className="audio-bar-actions">
        {isListenerOnly ? (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => startAudioCall(roomId)}
            title="Switch from Listener to Speaker"
            style={{ fontSize: '0.75rem', padding: '4px 8px', gap: '4px' }}
          >
            <Mic size={12} />
            <span>Enable Mic</span>
          </button>
        ) : (
          <button
            className={`btn-icon sm ${isMuted ? 'btn-danger' : 'btn-secondary'} ${isSpeaking ? 'speaking-btn' : ''}`}
            onClick={() => toggleMute(roomId)}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
        )}

        <button
          className="btn btn-danger btn-icon sm"
          onClick={() => leaveAudioCall(roomId)}
          title="End Audio Call"
        >
          <PhoneOff size={15} />
        </button>
      </div>
    </div>
  );
}
