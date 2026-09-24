import React from 'react';
import { AlertCircle } from 'lucide-react';

export function DisclaimerBanner() {
  return (
    <div style={{ backgroundColor: 'var(--color-primary-base)', color: 'white', padding: 'var(--spacing-2)', fontSize: '0.875rem', textAlign: 'center' }} className="no-print">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-2)', maxWidth: '1200px', margin: '0 auto', lineHeight: 1.4 }}>
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        <span>
          <strong>Informational Only — Not Legal Advice:</strong> FENCO helps you spot risks and prepare for negotiations, but cannot replace a licensed attorney. Consult legal counsel for binding decisions and state-specific legal nuances.
        </span>
      </div>
    </div>
  );
}
