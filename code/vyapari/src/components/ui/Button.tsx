import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className = '',
  type = 'button',
  ...props
}) => {
  return (
    <button type={type} className={`button-base ${className}`.trim()} {...props}>
      {children}
    </button>
  );
};
