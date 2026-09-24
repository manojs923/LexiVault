import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ComparisonResult } from '../types';
import { ComparisonClauseRow } from '../components/ComparisonClauseRow';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, Scale } from 'lucide-react';

export function ComparisonPage() {
  const { id } = useParams<{ id: string }>();

  // Full rich comparison dataset for both live and demo modes
  const [result] = useState<ComparisonResult>({
    docA: { id: 'doc-risky', filename: 'freelance-sample-risky.txt (Offer A)', type: 'Freelance Agreement', uploadedAt: new Date().toISOString() },
    docB: { id: 'doc-fair', filename: 'freelance-sample-fair.txt (Offer B)', type: 'Freelance Agreement', uploadedAt: new Date().toISOString() },
    status: 'completed',
    pairs: [
      {
        id: 'p1',
        docAClause: 'Client shall pay Contractor within ninety (90) business days following Client receipt and subjective approval of invoice. Client may withhold payment indefinitely if unsatisfied.',
        docBClause: 'Client agrees to pay Contractor within thirty (30) days of receipt of invoice. Disputed charges must be specified in writing within 10 days.',
        diffExplanation: 'Offer B provides standard Net-30 payment and requires objective dispute notification, whereas Offer A locks payment for over 90 days with subjective withholding rights.',
        favors: 'Doc B',
      },
      {
        id: 'p2',
        docAClause: 'Contractor irrevocably assigns all right, title, and interest in and to all inventions, code, and patents created during or outside working hours, including prior tools and personal libraries.',
        docBClause: 'Upon receipt of full payment, Contractor assigns rights in deliverables specifically created for Client. Contractor retains full ownership of pre-existing tools and libraries.',
        diffExplanation: 'Offer B protects contractor pre-existing IP with a license grant and conditions transfer on full payment. Offer A unconditionally claims personal tools and off-hours inventions.',
        favors: 'Doc B',
      },
      {
        id: 'p3',
        docAClause: 'Contractor agrees to defend and hold harmless Client from all claims, regardless of whether caused in whole or in part by Client own negligence or willful misconduct.',
        docBClause: 'Each party agrees to defend and indemnify the other party from claims arising directly from that party own gross negligence, willful misconduct, or material breach.',
        diffExplanation: 'Offer B establishes balanced mutual indemnification tied to fault. Offer A forces contractor to pay for the client own mistakes.',
        favors: 'Doc B',
      },
      {
        id: 'p4',
        docAClause: 'Client may terminate this Agreement immediately without notice or cause. Contractor may not terminate without 90 days notice and Client written consent.',
        docBClause: 'Either party may terminate this Agreement for convenience upon thirty (30) days prior written notice.',
        diffExplanation: 'Offer B gives equal 30-day termination rights. Offer A is completely unilateral, requiring 90 days and client consent from the contractor.',
        favors: 'Doc B',
      },
    ],
    onlyInDocA: [
      'Clause 6 (Perpetual Non-Compete): Worldwide perpetual restriction prohibiting contractor from performing any services for competing businesses forever. (Completely absent in Offer B).',
      'Clause 5 (Uncapped Contractor Liability): Contractor liability is unlimited while client liability is capped at $100.'
    ],
    onlyInDocB: [
      'Clause 8 (Good-Faith Dispute Mediation): 30-day amicable negotiation requirement prior to formal proceedings.'
    ],
    overallSummary: 'Document B (Beacon Studio) is vastly more favorable to the independent contractor across all major legal dimensions. Document A (Apex Global) contains multiple predatory terms, including a unilateral indemnification clause and an indefinite worldwide non-compete.'
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--spacing-8) var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
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
        <div className="card" style={{ padding: 'var(--spacing-6)', borderTop: '3px solid var(--color-unfavorable)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-4)' }}>
            <AlertTriangle size={20} color="var(--color-unfavorable)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-unfavorable)' }}>
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
        <div className="card" style={{ padding: 'var(--spacing-6)', borderTop: '3px solid var(--color-standard)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-4)' }}>
            <CheckCircle size={20} color="var(--color-standard)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-standard)' }}>
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
