import React from 'react';

export type ButtonVariant =
  | 'primary' | 'secondary' | 'soft' | 'ghost'
  | 'danger' | 'danger-ghost' | 'danger-outline' | 'success';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

// Visual properties owned by the design system. When callers pass these inline
// (legacy usage), they are only used to infer the intended variant/size and are
// then dropped, so every button gets consistent hover, focus and disabled states.
const VISUAL_KEYS = [
  'background', 'backgroundColor', 'color', 'border', 'borderColor',
  'padding', 'borderRadius', 'fontSize', 'cursor', 'fontWeight',
] as const;

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

const inferVariant = (style: React.CSSProperties): ButtonVariant => {
  const bg = str(style.backgroundColor ?? style.background).toLowerCase();
  const color = str(style.color).toLowerCase();
  if (bg.includes('--color-primary')) return 'primary';
  if (bg.includes('--color-danger')) return 'danger';
  if (bg.includes('--color-success')) return 'success';
  if (bg.includes('--color-secondary')) return 'soft';
  if (bg === 'none' || bg === 'transparent') {
    const border = str(style.border).toLowerCase();
    if (border && border !== 'none' && !border.startsWith('0')) return 'secondary';
    return color.includes('--color-danger') ? 'danger-ghost' : 'ghost';
  }
  if (color.includes('--color-danger')) return 'danger-outline';
  return 'secondary';
};

const inferSize = (style: React.CSSProperties): ButtonSize => {
  const fs = parseFloat(str(style.fontSize));
  if (!Number.isNaN(fs) && fs <= 12) return 'sm';
  const pad = str(style.padding).trim();
  if (pad === '4px 8px' || pad === '4') return 'sm';
  return 'md';
};

const isIconOnly = (children: React.ReactNode) => {
  let hasText = false;
  let count = 0;
  React.Children.forEach(children, child => {
    count += 1;
    if ((typeof child === 'string' || typeof child === 'number') && String(child).trim()) hasText = true;
  });
  return count > 0 && !hasText;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  type = 'button',
  variant,
  size,
  block,
  style,
  ...props
}) => {
  const legacyStyle: React.CSSProperties = { ...(style || {}) };
  const resolvedVariant = variant ?? inferVariant(legacyStyle);
  const resolvedSize = size ?? inferSize(legacyStyle);
  for (const key of VISUAL_KEYS) delete (legacyStyle as any)[key];

  const classes = [
    'button-base',
    `btn-${resolvedVariant}`,
    `btn-${resolvedSize}`,
    isIconOnly(children) && 'btn-icon',
    block && 'btn-block',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} style={legacyStyle} {...props}>
      {children}
    </button>
  );
};
