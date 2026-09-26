import { useState, useEffect, useCallback, useRef } from 'react';
import { AnalysisResult } from '../types';
import { apiClient } from '../api/client';

export type AnalysisStatus = 'loading' | 'ingesting' | 'analyzing' | 'completed' | 'error';

export interface UseAnalysisReturn {
  data: AnalysisResult | null;
  status: AnalysisStatus;
  error: string | null;
  reload: () => void;
}

export function useAnalysis(documentId: string | undefined): UseAnalysisReturn {
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const isTriggeringAnalysis = useRef(false);

  const fetchStatusAndData = useCallback(async () => {
    if (!documentId) return;

    try {
      // 1. Fetch document status from live API
      const statusRes = await fetch(`/api/documents/${documentId}/status`, {
        headers: { 'X-Session-ID': localStorage.getItem('fenco_session_id') || 'session_default' },
      });

      if (!statusRes.ok) {
        if (statusRes.status === 404) {
          throw new Error(`Document "${documentId}" not found on server.`);
        }
        throw new Error(`Failed to check status (HTTP ${statusRes.status})`);
      }

      const statusData = await statusRes.json();
      const currentDocStatus = statusData.status;

      // Handle backend processing states
      if (currentDocStatus === 'uploaded' || currentDocStatus === 'ingesting') {
        setStatus('ingesting');
        return false; // keep polling
      }

      if (currentDocStatus === 'ingested') {
        setStatus('analyzing');
        if (!isTriggeringAnalysis.current) {
          isTriggeringAnalysis.current = true;
          // Trigger the scoring pipeline
          const analyzeRes = await fetch(`/api/documents/${documentId}/analyze`, {
            method: 'POST',
            headers: { 'X-Session-ID': localStorage.getItem('fenco_session_id') || 'session_default' },
          });
          if (!analyzeRes.ok) {
            const errJson = await analyzeRes.json().catch(() => ({}));
            throw new Error(errJson.error || `Analysis scoring failed (HTTP ${analyzeRes.status})`);
          }
        }
        return false; // keep polling
      }

      if (currentDocStatus === 'analyzing') {
        setStatus('analyzing');
        return false; // keep polling
      }

      if (currentDocStatus === 'error') {
        throw new Error(statusData.error_message || 'Contract analysis pipeline encountered an error.');
      }

      if (currentDocStatus === 'analyzed') {
        // Document is ready, fetch final scored clauses and gotchas
        const analysisData = await apiClient.getAnalysis(documentId);
        setData(analysisData);
        setStatus('completed');
        setError(null);
        return true; // stop polling
      }

      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('error');
      return true; // stop polling on fatal error
    }
  }, [documentId]);

  useEffect(() => {
    if (!documentId) return;

    setData(null);
    setStatus('loading');
    setError(null);
    isTriggeringAnalysis.current = false;

    let isSubscribed = true;
    let pollInterval: ReturnType<typeof setTimeout> | null = null;

    const runPoll = async () => {
      const isDone = await fetchStatusAndData();
      if (!isDone && isSubscribed) {
        pollInterval = setTimeout(runPoll, 1500);
      }
    };

    runPoll();

    return () => {
      isSubscribed = false;
      if (pollInterval) clearTimeout(pollInterval);
    };
  }, [documentId, fetchStatusAndData]);

  const reload = useCallback(() => {
    isTriggeringAnalysis.current = false;
    setData(null);
    setStatus('loading');
    setError(null);
    fetchStatusAndData();
  }, [fetchStatusAndData]);

  return { data, status, error, reload };
}
