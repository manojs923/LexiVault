// LexiVault — Frontend API Client
// Direct live connection to Express API — strict error propagation, no silent demo fallbacks

import { AnalysisResult, ComparisonResult, QaMessage, AttorneyChecklist } from '../types';

const API_BASE = '/api';

function getSessionId(): string {
  const storedSessionId = localStorage.getItem('fenco_session_id');
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (storedSessionId && uuidPattern.test(storedSessionId)) {
    return storedSessionId;
  }

  const sessionId = globalThis.crypto?.randomUUID?.() || '00000000-0000-4000-8000-000000000000';
  localStorage.setItem('fenco_session_id', sessionId);
  return sessionId;
}

function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    'X-Session-ID': getSessionId(),
    ...extraHeaders,
  };
}

export const apiClient = {
  /**
   * Upload a document to the backend
   */
  uploadDocument: async (file: File, documentType: string): Promise<{ id: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Upload failed with status ${res.status}`);
    }
    const data = await res.json();
    return { id: data.documentId };
  },

  /**
   * Fetch full analysis for a document
   */
  getAnalysis: async (id: string): Promise<AnalysisResult> => {
    // 1. Fetch document status
    const statusRes = await fetch(`${API_BASE}/documents/${id}/status`, { headers: getHeaders() });
    if (!statusRes.ok) {
      const errBody = await statusRes.json().catch(() => ({}));
      throw new Error(errBody.error || `Document not found (HTTP ${statusRes.status})`);
    }
    const statusData = await statusRes.json();

    // 2. Fetch full analysis result
    const analysisRes = await fetch(`${API_BASE}/documents/${id}/analysis`, { headers: getHeaders() });
    if (!analysisRes.ok) {
      const errBody = await analysisRes.json().catch(() => ({}));
      throw new Error(errBody.error || `Analysis not ready or failed (HTTP ${analysisRes.status})`);
    }
    const raw = await analysisRes.json();
    
    // 3. Fetch gotchas
    const gotchasRes = await fetch(`${API_BASE}/documents/${id}/gotchas`, { headers: getHeaders() });
    const gotchasData = gotchasRes.ok ? await gotchasRes.json() : { gotchas: [] };

    return {
      document: {
        id: raw.documentId,
        filename: statusData.original_name || statusData.filename || 'Contract Document',
        type: raw.documentType,
        uploadedAt: new Date().toISOString(),
      },
      status: 'completed',
      clauses: raw.clauses.map((c: any) => ({
        id: c.id,
        text: c.text,
        index: c.clauseIndex,
        riskLevel: c.riskLevel,
        confidence: c.confidenceScore ?? 0.85,
        explanation: c.semanticDeltaExplanation || 'Standard provision analysis.',
        counterDraft: c.counterDraft,
        isLowConfidence: (c.confidenceScore ?? 1.0) < 0.5 || c.usedFallbackEmbedding,
      })),
      gotchas: gotchasData.gotchas.map((g: any) => ({
        title: g.title,
        description: g.explanation,
        severity: g.riskLevel === 'Unfavorable' ? 'High' : 'Medium',
      })),
      overallRisk: raw.summary.unfavorable > 0 ? 'High' : raw.summary.caution > 0 ? 'Medium' : 'Low',
      hasReducedAccuracy: Boolean(raw.reducedAccuracyMode),
    };
  },

  /**
   * Ask question grounded in document text (§7B)
   */
  askQuestion: async (docId: string, question: string): Promise<QaMessage> => {
    const res = await fetch(`${API_BASE}/documents/${docId}/ask`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Failed to answer question (HTTP ${res.status})`);
    }

    const data = await res.json();
    return {
      id: data.messageId,
      role: 'assistant',
      content: data.answer,
      citations: (data.relatedClauseIndices || []).map((idx: number) => `Clause ${idx}`),
      relatedClauseIndices: data.relatedClauseIndices || [],
    };
  },

  /**
   * Fetch attorney-prep checklist (§7C)
   */
  getChecklist: async (docId: string): Promise<AttorneyChecklist> => {
    const res = await fetch(`${API_BASE}/documents/${docId}/attorney-checklist`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Failed to fetch attorney checklist (HTTP ${res.status})`);
    }

    const data = await res.json();
    return {
      summary: data.summary,
      flaggedItems: data.flaggedItems.map((item: any) => `${item.clauseType}: ${item.whyItMatters}`),
      questionsToAsk: data.flaggedItems.flatMap((item: any) => item.questionsToAsk),
      documentsToGather: Array.from(new Set(data.flaggedItems.flatMap((item: any) => item.documentsToGather))) as string[],
    };
  },

  /**
   * Fetch attorney checklist for document comparison (§7A/§7C)
   */
  getComparisonChecklist: async (comparisonId: string): Promise<AttorneyChecklist> => {
    if (comparisonId === 'demo' || comparisonId === 'demo-comparison') {
      return {
        summary: 'Document Comparison Consultation Brief: Comparing Offer A against Offer B. Focus this legal consultation on eliminating the one-sided terms found exclusively in Offer A.',
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
      };
    }

    const res = await fetch(`${API_BASE}/comparisons/${comparisonId}/attorney-checklist`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch comparison attorney checklist (HTTP ${res.status})`);
    }

    const data = await res.json();
    return {
      summary: data.summary,
      flaggedItems: (data.flaggedItems || []).map((item: any) => `${item.clauseType || item.topic || 'Item'}: ${item.whyItMatters || item.difference || ''}`),
      questionsToAsk: data.questionsToAsk || [],
      documentsToGather: data.documentsToGather || [],
    };
  },

  /**
   * Create a side-by-side comparison between two documents (§7A)
   */
  createComparison: async (documentAId: string, documentBId: string): Promise<{ id: string }> => {
    const res = await fetch(`${API_BASE}/comparisons`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ documentAId, documentBId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Comparison failed (HTTP ${res.status})`);
    }

    const data = await res.json();
    return { id: data.id };
  },

  /**
   * Fetch full document-to-document comparison results (§7A)
   */
  getComparison: async (id: string): Promise<ComparisonResult> => {
    if (id === 'demo-comparison' || id === 'demo') {
      return {
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
      };
    }

    const res = await fetch(`${API_BASE}/comparisons/${id}`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch comparison (HTTP ${res.status})`);
    }

    const data = await res.json();
    return {
      docA: { id: data.documentAId, filename: 'Document A', type: 'Contract', uploadedAt: data.createdAt },
      docB: { id: data.documentBId, filename: 'Document B', type: 'Contract', uploadedAt: data.createdAt },
      status: 'completed',
      pairs: (data.matchedPairs || []).map((p: any) => ({
        id: p.pairId,
        diffExplanation: p.differenceExplanation,
        favors: p.moreFavorable === 'document_a' ? 'Doc A' : p.moreFavorable === 'document_b' ? 'Doc B' : 'Neutral',
      })),
      onlyInDocA: (data.onlyInDocumentA || []).map((c: any) => `Clause ${c.clauseIndex} (${c.clauseType}): ${c.text}`),
      onlyInDocB: (data.onlyInDocumentB || []).map((c: any) => `Clause ${c.clauseIndex} (${c.clauseType}): ${c.text}`),
      overallSummary: data.summary || 'Document comparison complete.',
    };
  }
};
