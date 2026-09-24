// FENCO 2.0 — Unit Tests: Clause Splitter & Classifier

import { splitIntoClauses, classifyClauseType } from '../../src/modules/ingestion/clauseSplitter';

describe('Clause Splitter & Classifier', () => {
  const sampleContract = `
1. PAYMENT TERMS
Client shall pay Contractor within thirty (30) days of receiving an invoice.

2. INTELLECTUAL PROPERTY
Upon receipt of full payment, Contractor transfers all copyrights to Client.

3. INDEMNIFICATION
Contractor agrees to indemnify and hold harmless Client from any and all liabilities.

4. TERMINATION
Either party may terminate this agreement with thirty (30) days advance notice.
  `.trim();

  it('splits contract into individual numbered sections accurately', () => {
    const clauses = splitIntoClauses(sampleContract);

    expect(clauses.length).toBeGreaterThanOrEqual(3);
    expect(clauses[0].text).toContain('PAYMENT TERMS');
    expect(clauses[1].text).toContain('INTELLECTUAL PROPERTY');
  });

  it('correctly classifies standard clause headings and keywords', () => {
    expect(classifyClauseType('PAYMENT TERMS', 'Payment of $100 per hour is due')).toBe('Payment Terms');
    expect(classifyClauseType('INDEMNIFICATION', 'Contractor shall hold harmless Client')).toBe('Indemnification');
    expect(classifyClauseType('LIMITATION OF LIABILITY', 'In no event shall damages exceed')).toBe('Limitation of Liability');
    expect(classifyClauseType('TERMINATION', 'Either party may terminate this lease')).toBe('Termination');
    expect(classifyClauseType('NON-COMPETE', 'Contractor shall not engage in competitive work')).toBe('Non-Compete');
    expect(classifyClauseType('CONFIDENTIALITY', 'Proprietary trade secrets shall not be disclosed')).toBe('Confidentiality');
  });

  it('falls back to General when heading and content are ambiguous', () => {
    expect(classifyClauseType('MISCELLANEOUS', 'This agreement constitutes the entire understanding between the parties.')).toBe('General');
  });
});
