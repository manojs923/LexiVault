import React, { useState } from 'react';
import { QaMessage } from '../types';
import { Send } from 'lucide-react';
import { apiClient } from '../api/client';

interface DocumentChatPanelProps {
  documentId: string;
}

export function DocumentChatPanel({ documentId }: DocumentChatPanelProps) {
  const [messages, setMessages] = useState<QaMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: QaMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiClient.askQuestion(documentId, input);
      setMessages(prev => [...prev, response]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
      <h3 style={{ marginTop: 0, borderBottom: '1px solid #e2e8f0', paddingBottom: 'var(--spacing-2)' }}>Document Q&A</h3>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-2) 0', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-background)',
            color: msg.role === 'user' ? 'white' : 'inherit',
            padding: 'var(--spacing-2) var(--spacing-3)',
            borderRadius: 'var(--border-radius-md)',
            maxWidth: '80%'
          }}>
            <div>{msg.content}</div>
            {((msg.relatedClauseIndices && msg.relatedClauseIndices.length > 0) || (msg.citations && msg.citations.length > 0)) && (
              <div className="citation-pills" style={{ marginTop: 'var(--spacing-2)', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '6px' }}>
                <p className="citation-label" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 4px 0', fontWeight: 600 }}>
                  Grounded in clauses:
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(msg.relatedClauseIndices && msg.relatedClauseIndices.length > 0
                    ? msg.relatedClauseIndices
                    : msg.citations?.map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(n => !isNaN(n)) || []
                  ).map((clauseIndex) => (
                    <button
                      key={clauseIndex}
                      onClick={() => {
                        const card = document.getElementById(`clause-${clauseIndex}`) || document.getElementById(`clause-${clauseIndex - 1}`);
                        if (card) {
                          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          card.classList.add('highlight-pulse');
                          setTimeout(() => card.classList.remove('highlight-pulse'), 2500);
                        }
                      }}
                      className="citation-pill"
                      title={`Jump to Clause ${clauseIndex} in audit view`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'rgba(37, 99, 235, 0.12)',
                        color: 'var(--color-accent)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        border: '1px solid rgba(37, 99, 235, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      📌 Clause #{clauseIndex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && <div style={{ alignSelf: 'flex-start' }}>Typing...</div>}
      </div>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: 'var(--spacing-2)', borderRadius: 'var(--border-radius-sm)', border: '1px solid #cbd5e1' }}
          placeholder="Ask a question about the contract..."
        />
        <button className="btn btn-primary" onClick={handleSend}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
