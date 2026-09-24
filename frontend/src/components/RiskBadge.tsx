import React from 'react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
  confidence?: number;
  isLowConfidence?: boolean;
}

export function RiskBadge({ level, confidence, isLowConfidence }: RiskBadgeProps) {
  let bgColor = 'var(--color-risk-standard-bg)';
  let color = 'var(--color-risk-standard)';
  
  if (level === 'Caution') {
    bgColor = 'var(--color-risk-caution-bg)';
    color = 'var(--color-risk-caution)';
  } else if (level === 'Unfavorable') {
    bgColor = 'var(--color-risk-unfavorable-bg)';
    color = 'var(--color-risk-unfavorable)';
  }
  
  return (
    <span 
      className={`badge ${isLowConfidence ? 'low-confidence' : ''}`}
      style={{ backgroundColor: bgColor, color: color, border: `1px solid ${color}` }}
    >
      {level} {confidence ? `(${(confidence * 100).toFixed(0)}%)` : ''}
    </span>
  );
}
