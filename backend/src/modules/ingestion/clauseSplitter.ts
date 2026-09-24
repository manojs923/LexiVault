// FENCO 2.0 — Regex-Based Clause Splitter
// First-pass clause detection using regex patterns.
// If fewer than 3 clauses are found, llmClauseSplitter is used as fallback.

export interface RawClause {
  index: number;
  text: string;
  headingHint: string; // extracted heading if present
}

const SECTION_PATTERNS = [
  // Numbered sections: "1.", "1.1", "Section 1", "Article I"
  /^\s*(?:Section|Article|Clause|SECTION|ARTICLE|CLAUSE)?\s*(?:[\dIVXLCDM]+\.?\d*\.?)\s+[A-Z]/m,
  // ALL CAPS headings: "PAYMENT TERMS", "INDEMNIFICATION"
  /^\s*[A-Z][A-Z\s]{4,}$/m,
  // Title case with colon: "Payment Terms:"
  /^\s*[A-Z][a-zA-Z\s]{3,}:/m,
];

// Clause type keywords for heading classification
const CLAUSE_TYPE_KEYWORDS: Record<string, string[]> = {
  'Payment Terms': ['payment', 'compensation', 'fee', 'rent', 'invoice', 'billing', 'remuneration'],
  'Scope of Work': ['scope', 'services', 'deliverable', 'work', 'performance', 'obligations'],
  'Intellectual Property': ['intellectual property', 'copyright', 'ip', 'ownership', 'license', 'work product'],
  'Confidentiality': ['confidential', 'nda', 'non-disclosure', 'proprietary', 'secret'],
  'Indemnification': ['indemn', 'hold harmless', 'defend'],
  'Limitation of Liability': ['limit', 'liability', 'cap', 'maximum', 'damages'],
  'Termination': ['terminat', 'cancel', 'end', 'expir', 'cessation'],
  'Dispute Resolution': ['dispute', 'arbitration', 'mediation', 'litigation', 'claim'],
  'Governing Law': ['governing', 'jurisdiction', 'law', 'applicable law'],
  'Non-Compete': ['non-compete', 'non compete', 'noncompete', 'restrict', 'competitive'],
  'Insurance': ['insurance', 'coverage', 'policy', 'liability coverage'],
  'Amendments': ['amend', 'modif', 'change', 'alter'],
  'Force Majeure': ['force majeure', 'act of god', 'beyond control', 'impossibility'],
  'Warranty': ['warrant', 'guarantee', 'represent'],
  'Assignment': ['assign', 'transfer', 'delegate', 'successor'],
  'Notice': ['notice', 'notification', 'communicate'],
  'Security Deposit': ['deposit', 'security deposit'],
  'Maintenance': ['maintenance', 'repair', 'habitab'],
  'Entry': ['entry', 'access', 'inspect', 'enter'],
  'Subletting': ['sublet', 'sublease', 'subtenancy'],
  'Renewal': ['renew', 'holdover', 'extension'],
  'Utilities': ['utilit', 'electric', 'water', 'gas', 'heat'],
  'Alterations': ['alteration', 'improvement', 'modification', 'renovation'],
};

/**
 * Classify a clause's type based on its heading and text.
 */
export function classifyClauseType(heading: string, text: string): string {
  const combined = (heading + ' ' + text.slice(0, 200)).toLowerCase();
  
  for (const [clauseType, keywords] of Object.entries(CLAUSE_TYPE_KEYWORDS)) {
    if (keywords.some(kw => combined.includes(kw))) {
      return clauseType;
    }
  }
  
  return 'General';
}

/**
 * Split document text into clauses using regex patterns.
 * Returns raw clauses without LLM involvement.
 */
export function splitIntoClauses(text: string): RawClause[] {
  // Strategy 1: Split on numbered sections
  const numberedSectionRegex = /(?=^\s*(?:(?:Section|Article|Clause|SECTION|ARTICLE|CLAUSE)\s+)?[\dIVXLCDM]+[.)\s])/m;
  let sections = text.split(numberedSectionRegex).filter(s => s.trim().length > 30);
  
  if (sections.length >= 3) {
    return sections.map((text, i) => ({
      index: i,
      text: text.trim(),
      headingHint: extractHeading(text),
    }));
  }
  
  // Strategy 2: Split on ALL-CAPS headings
  const capsHeadingRegex = /(?=^[A-Z][A-Z\s]{4,}$)/m;
  sections = text.split(capsHeadingRegex).filter(s => s.trim().length > 30);
  
  if (sections.length >= 3) {
    return sections.map((text, i) => ({
      index: i,
      text: text.trim(),
      headingHint: extractHeading(text),
    }));
  }
  
  // Strategy 3: Split on double newlines (paragraph-based)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
  
  if (paragraphs.length >= 3) {
    return paragraphs.map((text, i) => ({
      index: i,
      text: text.trim(),
      headingHint: '',
    }));
  }
  
  // Fallback: return the whole document as one clause
  return [{ index: 0, text: text.trim(), headingHint: '' }];
}

function extractHeading(text: string): string {
  const firstLine = text.split('\n')[0].trim();
  return firstLine.slice(0, 100);
}
