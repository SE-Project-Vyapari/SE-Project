import React from 'react';
import { Sparkles, HelpCircle } from 'lucide-react';

export type PredictionBadgeVariant = 'prediction' | 'recommendation' | 'advisory' | 'ai';

interface PredictionBadgeProps {
  variant?: PredictionBadgeVariant;
  label?: string;
  tooltipText?: string;
  size?: 'sm' | 'md';
}

export const PredictionBadge: React.FC<PredictionBadgeProps> = ({
  variant = 'prediction',
  label,
  tooltipText,
  size = 'md'
}) => {
  const defaultLabels: Record<PredictionBadgeVariant, string> = {
    prediction: 'Statistical Forecast',
    recommendation: 'Recommendation',
    advisory: 'Advisory Guidance',
    ai: 'AI Estimate'
  };

  const defaultTooltips: Record<PredictionBadgeVariant, string> = {
    prediction: 'Derived from historical moving-average velocity & variance. Advisory only.',
    recommendation: 'Suggested action based on inventory turnover and lead-time safety buffer.',
    advisory: 'Non-binding projection to assist operational decision-making.',
    ai: 'Calculated algorithmic score based on customer RFM purchasing patterns.'
  };

  const displayText = label || defaultLabels[variant];
  const tooltip = tooltipText || defaultTooltips[variant];

  const isSmall = size === 'sm';

  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 3 : 5,
        padding: isSmall ? '1px 6px' : '2px 8px',
        borderRadius: 12,
        fontSize: isSmall ? 10 : 11,
        fontWeight: 600,
        letterSpacing: 0.3,
        background: 'rgba(198, 93, 58, 0.09)',
        color: 'var(--color-primary)',
        border: '1px solid rgba(198, 93, 58, 0.22)',
        cursor: 'help',
        userSelect: 'none',
        whiteSpace: 'nowrap'
      }}
    >
      <Sparkles size={isSmall ? 10 : 12} />
      <span>{displayText}</span>
      <HelpCircle size={isSmall ? 9 : 11} style={{ opacity: 0.6 }} />
    </span>
  );
};
