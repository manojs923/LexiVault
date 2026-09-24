import React from 'react';
import { ComparisonClausePair } from '../types';

interface ComparisonClauseRowProps {
  pair: ComparisonClausePair;
}

export function ComparisonClauseRow({ pair }: ComparisonClauseRowProps) {
  return (
    <div className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)' }}>
        <div style={{ backgroundColor: 'var(--color-background)', padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-sm)' }}>
          <strong>Doc A:</strong>
          <p style={{ margin: 0, marginTop: 'var(--spacing-2)' }}>{pair.docAClause || <em>Missing</em>}</p>
        </div>
        <div style={{ backgroundColor: 'var(--color-background)', padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-sm)' }}>
          <strong>Doc B:</strong>
          <p style={{ margin: 0, marginTop: 'var(--spacing-2)' }}>{pair.docBClause || <em>Missing</em>}</p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 'var(--spacing-3)' }}>
        <div style={{ flex: 1 }}>
          <strong>Explanation:</strong> {pair.diffExplanation}
        </div>
        <div style={{ marginLeft: 'var(--spacing-4)' }}>
          <span className="badge" style={{ backgroundColor: 'var(--color-primary-base)', color: 'white' }}>
            Favors: {pair.favors}
          </span>
        </div>
      </div>
    </div>
  );
}
