import React from 'react';

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <select className={`select-base ${className}`.trim()} {...props}>
      {children}
    </select>
  );
};
