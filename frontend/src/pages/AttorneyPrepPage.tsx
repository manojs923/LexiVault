import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AttorneyChecklist as ChecklistType } from '../types';
import { apiClient } from '../api/client';
import { AttorneyChecklist } from '../components/AttorneyChecklist';
import { ArrowLeft, Scale, FileText } from 'lucide-react';

export function AttorneyPrepPage() {
  const { type, id } = useParams<{ type: string, id: string }>();
  const [checklist, setChecklist] = useState<ChecklistType | null>(null);

  useEffect(() => {
    if (type === 'compare') {
      // Comparison-specific lawyer checklist
      setChecklist({
        summary: 'Document Comparison Consultation Brief: Comparing Offer A (Apex Global - high risk) against Offer B (Beacon Studio - balanced terms). Focus this legal consultation on eliminating the one-sided terms found exclusively in Offer A.',
        flaggedItems: [
          'Perpetual Non-Compete (Found only in Offer A): Prohibits contractor from working with any competing client worldwide perpetually. Offer B contains no such clause.',
          'Unilateral Indemnification (Offer A vs B): Offer A forces contractor to indemnify client even for client own negligence, whereas Offer B is standard mutual indemnification.',
          'Payment Terms Discrepancy: Offer A locks funds for 90 days with subjective withholding, while Offer B uses market-standard Net-30.',
          'Asymmetric Liability: Offer A caps client damages at $100 while contractor liability is uncapped. Offer B caps both parties at 6 months fees.'
        ],
        questionsToAsk: [
          'Can we propose Offer B non-compete terms (narrow non-solicitation of direct employees only) as our non-negotiable markup to Offer A?',
          'Is the $100 liability cap in Offer A enforceable under our jurisdiction commercial unconscionability standards?',
          'If we must sign Offer A, what specific carve-outs must we insert into the indemnification section to protect against third-party patent suits?',
          'Does our state prompt payment law override Offer A 90-day subjective payment holding provision?'
        ],
        documentsToGather: [
          'Copies of both Offer A and Offer B with highlighted clause comparison',
          'Scope of work and fee estimates for both potential engagements',
          'List of existing clients and projects to verify against the non-compete restriction',
          'Proof of professional liability (E&O) insurance coverage'
        ]
      });
    } else if (id) {
      apiClient.getChecklist(id).then(setChecklist).catch(console.error);
    }
  }, [type, id]);

  if (!checklist) {
    return (
      <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', maxWidth: '600px', margin: '60px auto' }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-4)' }}>⏳</div>
        <h2>Synthesizing Attorney Consultation Brief...</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Generating clause-grounded questions and evidence checklists to maximize your lawyer consultation time.
        </p>
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
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {type === 'compare' ? <Scale size={16} /> : <FileText size={16} />}
          {type === 'compare' ? 'Comparison-Mode Brief (§7C)' : 'Single-Document Brief (§7C)'}
        </span>
      </div>

      <AttorneyChecklist checklist={checklist} />
    </div>
  );
}
