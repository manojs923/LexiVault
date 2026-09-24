import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, SplitSquareHorizontal, ShieldAlert, Sparkles, Scale } from 'lucide-react';
import { apiClient } from '../api/client';

export function UploadPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [contractType, setContractType] = useState<'freelance' | 'residential_lease'>('freelance');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const { id } = await apiClient.uploadDocument(file, contractType);
      navigate(`/analysis/${id}`);
    } catch (err) {
      console.error(err);
      navigate(`/analysis/demo-upload`);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSingle = async (sampleType: 'freelance' | 'lease') => {
    setLoading(true);
    try {
      const { id } = await apiClient.uploadDocument(
        new File(['demo'], `${sampleType}-risky.txt`, { type: 'text/plain' }),
        sampleType
      );
      navigate(`/analysis/${id}`);
    } catch (e) {
      console.error(e);
      navigate('/analysis/demo-analysis');
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
          <SplitSquareHorizontal size={18} /> Document-to-Document Compare
        </button>
      </div>

      <div className="card" style={{ padding: 'var(--spacing-8)', textAlign: 'center' }}>
        <div style={{ marginBottom: 'var(--spacing-6)' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-2)', color: 'var(--color-text-muted)' }}>
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
            {mode === 'single' ? 'Upload Contract (.pdf or .txt)' : 'Upload Two Agreements (.pdf or .txt)'}
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
            <Upload size={16} /> Browse File
          </button>

          {mode === 'single' ? (
            <>
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
            </>
          ) : (
            <button 
              className="btn btn-secondary"
              onClick={handleDemoCompare}
              disabled={loading}
            >
              <Scale size={16} /> Load Compare Demo (Risky vs Fair)
            </button>
          )}
        </div>
      </div>

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
