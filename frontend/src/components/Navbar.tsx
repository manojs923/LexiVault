import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export function Navbar() {
  return (
    <nav style={{ background: 'var(--color-primary-dark)', padding: 'var(--spacing-4)', color: 'white' }} className="no-print">
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'white', fontWeight: 'bold', fontSize: '1.25rem' }}>
          <Shield size={24} color="var(--color-accent-light)" />
          FENCO 2.0
        </Link>
        <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'white', opacity: 0.9, fontSize: '0.9rem', fontWeight: 500 }}>Upload & Audit</Link>
          <Link to="/compare/demo-comparison" style={{ color: 'white', opacity: 0.9, fontSize: '0.9rem', fontWeight: 500 }}>Compare Mode (§7A)</Link>
          <Link to="/analysis/demo-analysis" style={{ color: 'var(--color-accent-light)', fontSize: '0.9rem', fontWeight: 600 }}>Demo Dashboard</Link>
        </div>
      </div>
    </nav>
  );
}
