import React from 'react';
import { ScoredClause } from '../types';
import { RiskBadge } from './RiskBadge';
import { Copy } from 'lucide-react';

interface ClauseCardProps {
  clause: ScoredClause;
}

export function ClauseCard({ clause }: ClauseCardProps) {
  const handleCopy = () => {
    if (clause.counterDraft) {
      navigator.clipboard.writeText(clause.counterDraft);
    }
  };

  return (
    <div id={`clause-${clause.index}`} className="card clause-card" style={{ marginBottom: 'var(--spacing-4)', transition: 'all 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-3)' }}>
        <h4 style={{ margin: 0 }}>Clause {clause.index}</h4>
        <RiskBadge level={clause.riskLevel} confidence={clause.confidence} isLowConfidence={clause.isLowConfidence} />
      </div>
      <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-3)' }}>"{clause.text}"</p>
      <div style={{ backgroundColor: 'var(--color-background)', padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-sm)', marginBottom: 'var(--spacing-3)' }}>
        <strong>Explanation:</strong> {clause.explanation}
      </div>
      {clause.counterDraft && (
        <div style={{ border: '1px solid var(--color-accent)', padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-2)' }}>
            <strong>Suggested Counter-Draft:</strong>
            <button className="btn btn-secondary" onClick={handleCopy} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
              <Copy size={14} /> Copy
            </button>
          </div>
          <p style={{ margin: 0 }}>{clause.counterDraft}</p>
        </div>
      )}
    </div>
  );
}
