import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2, Smartphone, Wifi } from 'lucide-react';
import api from '../../services/api';
import { getRoomJoinUrl } from '../../utils/url';

export default function ShareQRModal({ room, onClose }) {
  const [copied, setCopied] = useState(false);
  const [phoneUrl, setPhoneUrl] = useState('');
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    setIsLocalhost(isLocal);

    async function fetchNetworkInfo() {
      // In production (or if not running on localhost), always use the public URL
      if (!isLocal) {
        setPhoneUrl(getRoomJoinUrl(room?.id));
        return;
      }

      try {
        const info = await api.getNetworkInfo();
        if (
          !info?.isProduction &&
          info?.lanIp &&
          info.lanIp !== 'localhost' &&
          !info.lanIp.startsWith('10.') &&
          !info.lanIp.startsWith('172.')
        ) {
          setPhoneUrl(`http://${info.lanIp}:5173/join/${room?.id}`);
        } else {
          setPhoneUrl(getRoomJoinUrl(room?.id));
        }
      } catch (e) {
        setPhoneUrl(getRoomJoinUrl(room?.id));
      }
    }

    fetchNetworkInfo();
  }, [room?.id]);

  const activeUrl = phoneUrl || getRoomJoinUrl(room?.id);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      prompt('Copy invite URL:', activeUrl);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '92%', textAlign: 'center' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={18} color="var(--accent-primary)" />
            <h3 className="modal-title">Room Invitation & QR</h3>
          </div>
          <button className="btn btn-subtle btn-icon sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
            Scan with your phone camera or share this link to join <strong>{room?.name}</strong>.
          </p>

          {/* QR Code Container */}
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              display: 'inline-block',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
            }}
          >
            <QRCodeSVG
              value={activeUrl}
              size={190}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Phone Wi-Fi Notice */}
          {isLocalhost && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-secondary)',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              <Wifi size={14} color="var(--state-success)" />
              <span>Connect phone to the same Wi-Fi / Hotspot</span>
            </div>
          )}

          {/* Copy Input */}
          <div style={{ width: '100%' }}>
            <div className="form-label" style={{ textAlign: 'left', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Invite Link</span>
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}>Code: {room?.id}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                readOnly
                value={activeUrl}
                className="form-input"
                style={{ fontSize: '0.85rem' }}
                onClick={(e) => e.target.select()}
              />
              <button className="btn btn-primary btn-sm" onClick={handleCopy} style={{ flexShrink: 0 }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
            Room resources expire automatically in 7 days
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ width: '100%' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
