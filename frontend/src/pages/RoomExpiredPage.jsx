import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, Plus, Home, ShieldAlert } from 'lucide-react';
import Navbar from '../components/navigation/Navbar';

export default function RoomExpiredPage() {
  const { roomId } = useParams();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <Navbar />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '3rem 2rem', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--state-warning-bg)', color: 'var(--state-warning)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Clock size={32} />
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            This Room Has Expired
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            In accordance with L2gether's <strong>7-day data retention policy</strong>, room <code>{roomId}</code> and its temporary chat messages, uploaded files, and workspace projects have been automatically retired and cleaned up.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/create" className="btn btn-primary btn-md">
              <Plus size={16} />
              Create a New Room
            </Link>
            <Link to="/" className="btn btn-secondary btn-md">
              <Home size={16} />
              Return Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
