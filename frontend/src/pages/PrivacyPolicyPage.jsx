import React from 'react';
import { Shield, Clock, Lock, Server, FileText } from 'lucide-react';
import Navbar from '../components/navigation/Navbar';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '4rem 1.5rem', maxWidth: '850px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '3rem' }}>
          <div className="badge badge-primary" style={{ marginBottom: '0.75rem' }}>
            <Shield size={13} />
            Data Protection & Retention Policy
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Privacy and 7-Day Room Lifecycle
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            L2gether is built from the ground up as a temporary, ephemeral collaboration platform. Here is how we handle your data, security, and workspace lifecycle.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} color="var(--accent-primary)" />
              1. Strict Seven-Day Expiration Policy
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              Every room created on L2gether has a fixed lifetime of exactly <strong>7 days</strong> (calculated as <code>expires_at = created_at + 7 days</code> using server timestamps).
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Our automated server background reconciliation worker continuously scans for expired rooms. At expiration:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>Room access is immediately denied and marked expired.</li>
              <li>Active collaboration and WebRTC audio signaling connections are terminated.</li>
              <li>All chat messages and code snippet records are purged.</li>
              <li>Workspace multi-file trees and project files are deleted.</li>
              <li>Uploaded documents and shared binary files are unlinked from physical storage.</li>
            </ul>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={20} color="var(--state-success)" />
              2. Guest Access & Identity
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              L2gether does not require mandatory account registration or passwords. Users enter a temporary display name. High-entropy cryptographic session tokens are generated on the server and verified via secure headers and cookies. Display names are not verified identities and should not be treated as permanent credentials.
            </p>
          </div>

          <div id="security" className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Server size={20} color="var(--accent-secondary)" />
              3. Isolated Code Execution & Live Preview Safety
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              User code is never executed inside the main Express application server. Code runs in restricted, bounded runner subprocesses with execution timeouts (10 seconds), output buffer quotas (64KB), and non-elevated permissions.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Web previews are isolated inside sandboxed iframes preventing unauthorized access to host cookies, session tokens, or elevated APIs.
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--state-warning)" />
              4. WebRTC Audio Privacy
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Audio calls are conducted directly between participants using WebRTC peer-to-peer mesh. Microphone access is requested only when a user explicitly clicks "Join Audio". L2gether does not record or store audio streams.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
