import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function ReducedAccuracyBanner() {
  return (
    <div style={{ backgroundColor: 'var(--color-risk-caution-bg)', color: 'var(--color-risk-caution)', padding: 'var(--spacing-3)', border: '1px solid var(--color-risk-caution)', borderRadius: 'var(--border-radius-md)', marginBottom: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
        <AlertTriangle size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Reduced Accuracy Notice:</strong> Some results in this analysis used a reduced-accuracy fallback due to an AI service constraint — treat flagged risks here as a starting point, not a final read. We strongly recommend independent human verification.
        </div>
      </div>
    </div>
  );
}
