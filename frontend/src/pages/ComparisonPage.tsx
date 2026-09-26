import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ComparisonResult } from '../types';
import { apiClient } from '../api/client';
import { ComparisonClauseRow } from '../components/ComparisonClauseRow';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, Scale, RefreshCw } from 'lucide-react';

export function ComparisonPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getComparison(id || 'demo-comparison');
        setResult(data);
      } catch (err) {
        console.error('Failed to load comparison:', err);
        setError(err instanceof Error ? err.message : 'Failed to load comparison data');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', maxWidth: '600px', margin: '80px auto' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-4)' }}>⚖️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Aligning Agreements & Computing Differences...</h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
          Performing cross-document clause alignment, detecting one-sided provisions, and evaluating risk differentials.
        </p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: 'var(--spacing-8)', textAlign: 'center' }} className="card">
        <AlertTriangle size={48} color="var(--color-risk-unfavorable)" style={{ margin: '0 auto var(--spacing-4)' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--spacing-2)' }}>Comparison Unavailable</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-6)' }}>
          {error || 'Unable to load comparison'}
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Retry
          </button>
          <Link to="/" className="btn btn-primary">
            <ArrowLeft size={16} /> Back to Upload
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--spacing-8) var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)', textDecoration: 'none', marginBottom: '8px', fontSize: '0.9rem' }}>
            <ArrowLeft size={16} /> Back to Upload
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Document-to-Document Comparison (§7A)</h1>
        </div>
        <Link to={`/prep/compare/${id || 'demo'}`} className="btn btn-primary">
          <FileText size={16} /> Prep for Your Lawyer
        </Link>
      </div>

      {/* Overall Summary Card */}
      <div className="card" style={{ padding: 'var(--spacing-6)', marginBottom: 'var(--spacing-8)', borderLeft: '4px solid var(--color-accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Scale size={20} color="var(--color-accent)" />
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Executive Comparison Summary</h3>
        </div>
        <p style={{ color: 'var(--color-text)', lineHeight: 1.6, fontSize: '0.95rem' }}>
          {result.overallSummary}
        </p>
      </div>

      {/* Matched Clauses Breakdown */}
      <h2 style={{ fontSize: '1.3rem', marginBottom: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={20} /> Matched Clause Differences ({result.pairs.length} pairs)
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-8)' }}>
        {result.pairs.map(pair => (
          <ComparisonClauseRow key={pair.id} pair={pair} />
        ))}
      </div>

      {/* One-Sided Clauses Section (§7A key requirement) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--spacing-6)' }}>
        {/* Only in Doc A */}
        <div className="card" style={{ padding: 'var(--spacing-6)', borderTop: '3px solid var(--color-risk-unfavorable)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-4)' }}>
            <AlertTriangle size={20} color="var(--color-risk-unfavorable)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-risk-unfavorable)' }}>
              Only Present in Document A ({result.onlyInDocA.length})
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-3)' }}>
            Provisions that appear in Document A but were omitted entirely from Document B:
          </p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {result.onlyInDocA.map((item, i) => (
              <li key={i} style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Only in Doc B */}
        <div className="card" style={{ padding: 'var(--spacing-6)', borderTop: '3px solid var(--color-risk-standard)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-4)' }}>
            <CheckCircle size={20} color="var(--color-risk-standard)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-risk-standard)' }}>
              Only Present in Document B ({result.onlyInDocB.length})
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-3)' }}>
            Protections or clauses present in Document B that Document A lacks:
          </p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {result.onlyInDocB.map((item, i) => (
              <li key={i} style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
