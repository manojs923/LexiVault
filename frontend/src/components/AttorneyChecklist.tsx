import React from 'react';
import { AttorneyChecklist as ChecklistType } from '../types';
import { Printer } from 'lucide-react';

interface AttorneyChecklistProps {
  checklist: ChecklistType;
}

export function AttorneyChecklist({ checklist }: AttorneyChecklistProps) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-4)' }}>
        <h2 style={{ margin: 0 }}>Attorney Consultation Prep</h2>
        <button className="btn btn-secondary no-print" onClick={() => window.print()}>
          <Printer size={16} /> Print
        </button>
      </div>
      
      <section style={{ marginBottom: 'var(--spacing-4)' }}>
        <h3>Summary</h3>
        <p>{checklist.summary}</p>
      </section>

      <section style={{ marginBottom: 'var(--spacing-4)' }}>
        <h3>Flagged Items</h3>
        <ul>
          {checklist.flaggedItems.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </section>

      <section style={{ marginBottom: 'var(--spacing-4)' }}>
        <h3>Questions to Ask</h3>
        <ul>
          {checklist.questionsToAsk.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </section>

      <section>
        <h3>Documents to Gather</h3>
        <ul>
          {checklist.documentsToGather.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </section>
    </div>
  );
}
