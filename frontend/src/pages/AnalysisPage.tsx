import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAnalysis } from '../hooks/useAnalysis';
import { ReducedAccuracyBanner } from '../components/ReducedAccuracyBanner';
import { GotchasSummary } from '../components/GotchasSummary';
import { ClauseCard } from '../components/ClauseCard';
import { DocumentChatPanel } from '../components/DocumentChatPanel';
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, AlertOctagon, Zap, AlertCircle, RefreshCw } from 'lucide-react';

export function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { data: result, status, error, reload } = useAnalysis(id);

  // 1. Error state: No silent demo fallback, show real error message
  if (status === 'error' || error) {
    return (
      <div style={{ maxWidth: '640px', margin: '80px auto', padding: 'var(--spacing-8)', textAlign: 'center' }} className="card">
        <AlertCircle size={48} color="var(--color-risk-unfavorable)" style={{ margin: '0 auto var(--spacing-4)' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--spacing-2)' }}>Analysis Failed</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-6)', lineHeight: 1.5 }}>
          {error}
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={reload}>
            <RefreshCw size={16} /> Try Again
          </button>
          <Link to="/" className="btn btn-primary">
            <ArrowLeft size={16} /> Back to Upload
          </Link>
        </div>
      </div>
    );
  }

  // 2. Loading / Processing state: Ingestion or Analysis in progress
  if (status === 'loading' || status === 'ingesting' || status === 'analyzing' || !result) {
    return (
      <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', maxWidth: '600px', margin: '80px auto' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-4)' }}>⏳</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {status === 'ingesting' ? 'Extracting & Ingesting Provisions...' : 'Auditing Contract Clauses...'}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
          {status === 'ingesting'
            ? 'Decomposing contract into discrete legal provisions and computing vector embeddings...'
            : 'Evaluating vector similarity against benchmark standards and running semantic risk analysis...'}
        </p>
      </div>
    );
  }

  // 3. Completed state: Real data from the API
  const standardCount = result.clauses.filter(c => c.riskLevel === 'Standard').length;
  const cautionCount = result.clauses.filter(c => c.riskLevel === 'Caution').length;
  const unfavorableCount = result.clauses.filter(c => c.riskLevel === 'Unfavorable').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--spacing-8) var(--spacing-4)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)', textDecoration: 'none', marginBottom: '6px', fontSize: '0.9rem' }}>
            <ArrowLeft size={16} /> Back to Upload
          </Link>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Audit: {result.document.filename}</h1>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <Link to={`/compare/demo-comparison`} className="btn btn-secondary">
            Compare Another Doc (§7A)
          </Link>
          <Link to={`/prep/analysis/${id}`} className="btn btn-primary">
            <FileText size={16} /> Prep for Your Lawyer (§7C)
          </Link>
        </div>
      </div>

      {result.hasReducedAccuracy && <ReducedAccuracyBanner />}

      {/* Quantitative Summary Metric Bar (§15 & §6) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
        <div className="card" style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>TOTAL CLAUSES</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px' }}>{result.clauses.length}</div>
        </div>

        <div className="card" style={{ padding: 'var(--spacing-4)', textAlign: 'center', borderLeft: '4px solid var(--color-risk-standard)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-risk-standard)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <CheckCircle2 size={16} /> STANDARD
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-risk-standard)' }}>{standardCount}</div>
        </div>

        <div className="card" style={{ padding: 'var(--spacing-4)', textAlign: 'center', borderLeft: '4px solid var(--color-risk-caution)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-risk-caution)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <AlertTriangle size={16} /> CAUTION
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-risk-caution)' }}>{cautionCount}</div>
        </div>

        <div className="card" style={{ padding: 'var(--spacing-4)', textAlign: 'center', borderLeft: '4px solid var(--color-risk-unfavorable)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-risk-unfavorable)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <AlertOctagon size={16} /> UNFAVORABLE
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-risk-unfavorable)' }}>{unfavorableCount}</div>
        </div>

        <div className="card" style={{ padding: 'var(--spacing-4)', textAlign: 'center', backgroundColor: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Zap size={16} /> STAGE 1 SAVINGS
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-accent)' }}>
            {result.clauses.length > 0 ? `${((standardCount / result.clauses.length) * 100).toFixed(0)}%` : '0%'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>skipped costly LLM calls</div>
        </div>
      </div>

      {/* Main Grid: Left = Gotchas & Clause Cards, Right = Sticky Grounded Q&A Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1.2fr)', gap: 'var(--spacing-6)', alignItems: 'start' }}>
        <div>
          <GotchasSummary gotchas={result.gotchas} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-4)' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Scored Provisions & Counter-Drafts</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Confidence score shown per provision
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            {result.clauses.map(clause => (
              <ClauseCard key={clause.id} clause={clause} />
            ))}
          </div>
        </div>

        <div style={{ position: 'sticky', top: 'var(--spacing-4)' }}>
          <DocumentChatPanel documentId={id!} />
        </div>
      </div>
    </div>
  );
}
