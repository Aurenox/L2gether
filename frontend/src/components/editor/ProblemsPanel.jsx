import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export default function ProblemsPanel({ problems = [], onNavigateToProblem }) {
  if (!problems || problems.length === 0) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <CheckCircle2 size={24} color="var(--state-success)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
        No problems detected in the current workspace.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', padding: '0.25rem 0' }}>
      <table className="problems-table">
        <thead>
          <tr>
            <th style={{ width: '90px' }}>Severity</th>
            <th>Message</th>
            <th style={{ width: '140px' }}>File</th>
            <th style={{ width: '80px' }}>Line:Col</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((p, idx) => {
            const isError = p.severity === 'error';
            return (
              <tr
                key={idx}
                className="clickable"
                onClick={() => onNavigateToProblem && onNavigateToProblem(p.file, p.line, p.column)}
                title="Click to jump to line in editor"
              >
                <td>
                  <span
                    className={`badge ${isError ? 'badge-danger' : 'badge-warning'}`}
                    style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}
                  >
                    {isError ? <AlertCircle size={10} /> : <AlertTriangle size={10} />}
                    {p.severity}
                  </span>
                </td>
                <td style={{ color: isError ? 'var(--state-error)' : 'var(--text-main)' }}>
                  {p.message}
                </td>
                <td style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                  {p.file || 'active file'}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {p.line ? `${p.line}:${p.column || 1}` : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
