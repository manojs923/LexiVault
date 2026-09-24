export interface Document {
  id: string;
  filename: string;
  type: string;
  uploadedAt: string;
}

export type RiskLevel = 'Standard' | 'Caution' | 'Unfavorable';

export interface Clause {
  id: string;
  text: string;
  index: number;
}

export interface ScoredClause extends Clause {
  riskLevel: RiskLevel;
  confidence: number;
  explanation: string;
  counterDraft?: string;
  isLowConfidence?: boolean;
}

export interface Gotcha {
  title: string;
  description: string;
  severity: 'Medium' | 'High';
}

export interface AnalysisResult {
  document: Document;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  clauses: ScoredClause[];
  gotchas: Gotcha[];
  overallRisk: string;
  hasReducedAccuracy: boolean;
}

export interface ComparisonClausePair {
  id: string;
  docAClause?: string;
  docBClause?: string;
  diffExplanation: string;
  favors: 'Doc A' | 'Doc B' | 'Neutral';
}

export interface ComparisonResult {
  docA: Document;
  docB: Document;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  pairs: ComparisonClausePair[];
  onlyInDocA: string[];
  onlyInDocB: string[];
  overallSummary: string;
}

export interface AttorneyChecklist {
  summary: string;
  flaggedItems: string[];
  questionsToAsk: string[];
  documentsToGather: string[];
}

export interface QaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  relatedClauseIndices?: number[];
}
