// FENCO 2.0 — Unit Tests: Text Extractor & Sanitization

import { sanitizeText } from '../../src/modules/ingestion/textExtractor';

describe('Text Extractor & Sanitizer', () => {
  it('strips malicious HTML tags and scripts from text', () => {
    const malicious = `
      <script>alert("XSS")</script>
      <h1>Employment Agreement</h1>
      <p>This is a legally binding contract between Contractor and Client.</p>
      <iframe src="http://evil.com"></iframe>
    `;

    const cleaned = sanitizeText(malicious);

    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('alert');
    expect(cleaned).not.toContain('<iframe>');
    expect(cleaned).toContain('Employment Agreement');
    expect(cleaned).toContain('This is a legally binding contract');
  });

  it('removes control characters while preserving valid formatting', () => {
    const textWithControlChars = "Clause 1\x00\x08Payment Terms\x1F\n\nAmount due is $500.";
    const cleaned = sanitizeText(textWithControlChars);

    expect(cleaned).not.toContain('\x00');
    expect(cleaned).not.toContain('\x08');
    expect(cleaned).not.toContain('\x1F');
    expect(cleaned).toContain('Clause 1 Payment Terms');
    expect(cleaned).toContain('Amount due is $500.');
  });

  it('rejects text that does not meet the minimum length threshold', () => {
    const tooShort = "Hi there";
    expect(() => sanitizeText(tooShort)).toThrow(/too short/i);
  });

  it('normalizes excessive whitespace and newlines', () => {
    const excessiveSpacing = "Clause 1      Payment     Terms.\n\n\n\n\nClient agrees to pay Contractor on time.";
    const cleaned = sanitizeText(excessiveSpacing);

    expect(cleaned).not.toMatch(/[ ]{2,}/);
    expect(cleaned).not.toMatch(/\n{3,}/);
    expect(cleaned).toContain('Clause 1 Payment Terms.');
  });
});
