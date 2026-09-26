import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, SplitSquareHorizontal, ShieldAlert, Sparkles, Scale, AlertCircle, ArrowRight } from 'lucide-react';
import { apiClient } from '../api/client';

export function UploadPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [contractType, setContractType] = useState<'freelance' | 'residential_lease'>('freelance');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Single mode ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compare mode states
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const fileARef = useRef<HTMLInputElement>(null);
  const fileBRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const { id } = await apiClient.uploadDocument(file, contractType);
      navigate(`/analysis/${id}`);
    } catch (err) {
      console.error('File upload failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'File upload failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSingle = async (sampleType: 'freelance' | 'lease') => {
    setLoading(true);
    setErrorMessage(null);

    const isLease = sampleType === 'lease';
    const fileName = isLease ? 'lease-risky.txt' : 'freelance-risky.txt';
    const docType = isLease ? 'residential_lease' : 'freelance';

    try {
      const res = await fetch(`/demo-contracts/${fileName}`);
      if (!res.ok) {
        throw new Error(`Failed to load /demo-contracts/${fileName} (HTTP ${res.status})`);
      }
      const text = await res.text();
      const file = new File([text], fileName, { type: 'text/plain' });

      const { id } = await apiClient.uploadDocument(file, docType);
      navigate(`/analysis/${id}`);
    } catch (err) {
      console.error('Demo upload failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Demo upload failed. Please ensure the backend is running on port 3001.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunComparison = async () => {
    if (!fileA || !fileB) {
      setErrorMessage('Please select both Document A and Document B to run comparison.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Upload Document A
      const docARes = await apiClient.uploadDocument(fileA, contractType);
      // 2. Upload Document B
      const docBRes = await apiClient.uploadDocument(fileB, contractType);

      // 3. Create comparison
      const compRes = await apiClient.createComparison(docARes.id, docBRes.id);
      navigate(`/compare/${compRes.id}`);
    } catch (err) {
      console.error('Comparison upload failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Comparison failed. Falling back to demo comparison view.');
      navigate('/compare/demo-comparison');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoCompare = () => {
    navigate('/compare/demo-comparison');
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: 'var(--spacing-8) var(--spacing-4)' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-8)' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: 'var(--spacing-2)' }}>
          AI Contract Risk Auditing & Counter-Drafting
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', maxWidth: '640px', margin: '0 auto' }}>
          Deconstruct predatory legalese, compare competing agreements, and generate ready-to-negotiate counter-drafts.
        </p>
      </div>

      {errorMessage && (
        <div 
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-risk-unfavorable)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-4)',
            marginBottom: 'var(--spacing-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-3)',
            color: 'var(--color-risk-unfavorable)'
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{errorMessage}</span>
        </div>
      )}

      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)', justifyContent: 'center' }}>
        <button 
          className={`btn ${mode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('single')}
        >
          <FileText size={18} /> Single Contract Audit
        </button>
        <button 
          className={`btn ${mode === 'compare' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMode('compare')}
        >
          <SplitSquareHorizontal size={18} /> Document-to-Document Compare (§7A)
        </button>
      </div>

      {/* Category Selection */}
      <div style={{ marginBottom: 'var(--spacing-6)', textAlign: 'center' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-2)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          SELECT CONTRACT CATEGORY
        </label>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'center' }}>
          <button
            className={`btn ${contractType === 'freelance' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.9rem', padding: '6px 14px' }}
            onClick={() => setContractType('freelance')}
          >
            Freelance / Consulting
          </button>
          <button
            className={`btn ${contractType === 'residential_lease' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.9rem', padding: '6px 14px' }}
            onClick={() => setContractType('residential_lease')}
          >
            Residential Lease
          </button>
        </div>
      </div>

      {/* Single Mode Card */}
      {mode === 'single' && (
        <div className="card" style={{ padding: 'var(--spacing-8)', textAlign: 'center' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.txt"
            style={{ display: 'none' }}
          />

          <div 
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-8)',
              marginBottom: 'var(--spacing-6)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={44} color="var(--color-accent)" style={{ margin: '0 auto', marginBottom: 'var(--spacing-3)' }} />
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--spacing-1)' }}>
              Upload Contract (.pdf or .txt)
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Drag and drop your file here, or click to browse
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload size={16} /> {loading ? 'Uploading...' : 'Browse File'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => handleDemoSingle('freelance')}
              disabled={loading}
            >
              <Sparkles size={16} /> Load Risky Freelance Demo
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => handleDemoSingle('lease')}
              disabled={loading}
            >
              <ShieldAlert size={16} /> Load Risky Lease Demo
            </button>
          </div>
        </div>
      )}

      {/* Compare Mode Card (§7A Dual Upload UX) */}
      {mode === 'compare' && (
        <div className="card" style={{ padding: 'var(--spacing-8)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Compare Two Agreements Side-by-Side</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Select two contracts (e.g. Current vs. Renewal, or Vendor Offer A vs. Offer B) to detect one-sided clauses.
            </p>
          </div>

          <input
            type="file"
            ref={fileARef}
            onChange={(e) => setFileA(e.target.files?.[0] || null)}
            accept=".pdf,.txt"
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={fileBRef}
            onChange={(e) => setFileB(e.target.files?.[0] || null)}
            accept=".pdf,.txt"
            style={{ display: 'none' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-6)' }}>
            {/* Document A */}
            <div 
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-6)',
                textAlign: 'center',
                backgroundColor: fileA ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                cursor: 'pointer'
              }}
              onClick={() => fileARef.current?.click()}
            >
              <FileText size={32} color="var(--color-accent)" style={{ margin: '0 auto var(--spacing-2)' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>Document A (e.g., Offer A)</div>
              <p style={{ fontSize: '0.85rem', color: fileA ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                {fileA ? fileA.name : 'Click to select File A (.pdf, .txt)'}
              </p>
            </div>

            {/* Document B */}
            <div 
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-6)',
                textAlign: 'center',
                backgroundColor: fileB ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                cursor: 'pointer'
              }}
              onClick={() => fileBRef.current?.click()}
            >
              <FileText size={32} color="var(--color-accent)" style={{ margin: '0 auto var(--spacing-2)' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>Document B (e.g., Offer B)</div>
              <p style={{ fontSize: '0.85rem', color: fileB ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                {fileB ? fileB.name : 'Click to select File B (.pdf, .txt)'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary"
              onClick={handleRunComparison}
              disabled={loading || !fileA || !fileB}
            >
              <ArrowRight size={16} /> {loading ? 'Comparing Documents...' : 'Run Side-by-Side Comparison'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleDemoCompare}
              disabled={loading}
            >
              <Scale size={16} /> Load Compare Demo (Risky vs Fair)
            </button>
          </div>
        </div>
      )}

      {/* Feature Value Props */}
      <div style={{ marginTop: 'var(--spacing-8)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-4)', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--spacing-4)' }}>
          <div style={{ fontWeight: 700, color: 'var(--color-accent)', marginBottom: '4px' }}>Two-Stage Scoring</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Vector similarity first; LLM tokens spent only on actual anomalies.</p>
        </div>
        <div className="card" style={{ padding: 'var(--spacing-4)' }}>
          <div style={{ fontWeight: 700, color: 'var(--color-accent)', marginBottom: '4px' }}>Grounded Q&A (§7B)</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Ask questions answered strictly by your document with clickable citations.</p>
        </div>
        <div className="card" style={{ padding: 'var(--spacing-4)' }}>
          <div style={{ fontWeight: 700, color: 'var(--color-accent)', marginBottom: '4px' }}>Attorney Checklist (§7C)</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Generate a structured brief with specific questions to ask your lawyer.</p>
        </div>
      </div>
    </div>
  );
}
