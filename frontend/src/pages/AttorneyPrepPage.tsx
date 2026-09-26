import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AttorneyChecklist as ChecklistType } from '../types';
import { apiClient } from '../api/client';
import { AttorneyChecklist } from '../components/AttorneyChecklist';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';

export function AttorneyPrepPage() {
  const { type, id } = useParams<{ type: string, id: string }>();
  const [checklist, setChecklist] = useState<ChecklistType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklist = () => {
    setLoading(true);
    setError(null);

    const promise = type === 'compare'
      ? apiClient.getComparisonChecklist(id || 'demo')
      : apiClient.getChecklist(id!);

    promise
      .then(setChecklist)
      .catch((err) => {
        console.error('Checklist fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate attorney checklist.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchChecklist();
  }, [type, id]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', maxWidth: '600px', margin: '80px auto' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-4)' }}>⏳</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Synthesizing Attorney Consultation Brief...</h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
          Generating clause-grounded questions and evidence checklists to maximize your lawyer consultation time.
        </p>
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: 'var(--spacing-8)', textAlign: 'center' }} className="card">
        <AlertCircle size={48} color="var(--color-risk-unfavorable)" style={{ margin: '0 auto var(--spacing-4)' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--spacing-2)' }}>Checklist Unavailable</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-6)' }}>
          {error || 'Unable to generate checklist for this document.'}
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={fetchChecklist}>
            <RefreshCw size={16} /> Try Again
          </button>
          <Link to={type === 'analysis' ? `/analysis/${id}` : `/compare/${id}`} className="btn btn-primary">
            <ArrowLeft size={16} /> Return to Document
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: 'var(--spacing-8) var(--spacing-4)' }}>
      <div className="no-print" style={{ marginBottom: 'var(--spacing-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link 
          to={type === 'analysis' ? `/analysis/${id}` : `/compare/${id}`} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Back to {type === 'analysis' ? 'Contract Audit' : 'Comparison View'}
        </Link>
        <button 
          onClick={() => window.print()}
          className="btn btn-secondary"
          style={{ fontSize: '0.85rem' }}
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      <AttorneyChecklist checklist={checklist} />
    </div>
  );
}
