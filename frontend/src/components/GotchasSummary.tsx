import React from 'react';
import { Gotcha } from '../types';
import { AlertCircle } from 'lucide-react';

interface GotchasSummaryProps {
  gotchas: Gotcha[];
}

export function GotchasSummary({ gotchas }: GotchasSummaryProps) {
  if (!gotchas || gotchas.length === 0) return null;

  return (
    <div className="card" style={{ border: '2px solid var(--color-risk-unfavorable)', marginBottom: 'var(--spacing-6)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--color-risk-unfavorable)', marginTop: 0 }}>
        <AlertCircle /> Before You Sign
      </h3>
      <ul style={{ paddingLeft: 'var(--spacing-4)' }}>
        {gotchas.map((g, i) => (
          <li key={i} style={{ marginBottom: 'var(--spacing-2)' }}>
            <strong>{g.title}:</strong> {g.description} 
            <span style={{ marginLeft: 'var(--spacing-2)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({g.severity})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
