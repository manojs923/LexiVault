// FENCO 2.0 — Ingestion Pipeline
// Orchestrates: text extraction → clause splitting → embedding → persistence

import { query, withTransaction } from '../../db/connection';
import { extractText } from './textExtractor';
import { splitIntoClauses, classifyClauseType } from './clauseSplitter';
import { llmSplitClauses } from './llmClauseSplitter';
import { embedBatch } from '../../services/embeddingService';
import { hashText, truncateForLog } from '../../utils/index';
import type { DocumentType } from '../../types/index';

export interface IngestionResult {
  documentId: string;
  clauseCount: number;
  anyFallbackEmbedding: boolean;
}

/**
 * Run the full ingestion pipeline for a document.
 * Updates document status in DB throughout.
 */
export async function runIngestionPipeline(
  documentId: string,
  filePath: string,
  documentType: DocumentType
): Promise<IngestionResult> {
  
  // Update status: ingesting
  await query(
    'UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2',
    ['ingesting', documentId]
  );
  
  try {
    // Step 1: Extract text
    console.log(`[Ingestion] Extracting text from ${truncateForLog(filePath)}`);
    const text = await extractText(filePath);
    
    // Step 2: Split into clauses
    let rawClauses = splitIntoClauses(text);
    
    if (rawClauses.length < 3) {
      rawClauses = await llmSplitClauses(text);
    }
    
    console.log(`[Ingestion] Found ${rawClauses.length} clauses`);
    
    // Step 3: Check cache and embed only new
    const textsToEmbed = rawClauses.map(c => c.text);
    const embedResults = await embedBatch(textsToEmbed);
    
    // Step 4: Check if any fallback embeddings were used
    const anyFallbackEmbedding = embedResults.some(e => e.usedFallback);
    
    // Step 5: Persist clauses in a transaction
    await withTransaction(async (client) => {
      for (let i = 0; i < rawClauses.length; i++) {
        const clause = rawClauses[i];
        const embedResult = embedResults[i];
        const clauseType = classifyClauseType(clause.headingHint, clause.text);
        const hash = hashText(clause.text);
        
        await client.query(
          `INSERT INTO clauses 
            (document_id, clause_index, clause_type, text, text_hash, embedding,
             used_fallback_embedding, used_fallback_llm_model)
           VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8)`,
          [
            documentId,
            clause.index,
            clauseType,
            clause.text,
            hash,
            `[${embedResult.embedding.join(',')}]`,
            embedResult.usedFallback,
            embedResult.usedFallback ? embedResult.model : null,
          ]
        );
      }
      
      // Update document status
      await client.query(
        `UPDATE documents 
         SET status = $1, reduced_accuracy_mode = $2, updated_at = NOW()
         WHERE id = $3`,
        ['ingested', anyFallbackEmbedding, documentId]
      );
    });
    
    console.log(`[Ingestion] Complete. ${rawClauses.length} clauses, fallback: ${anyFallbackEmbedding}`);
    
    return { documentId, clauseCount: rawClauses.length, anyFallbackEmbedding };
    
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await query(
      `UPDATE documents SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`,
      ['error', truncateForLog(message, 500), documentId]
    );
    throw err;
  }
}
