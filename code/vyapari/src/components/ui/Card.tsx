import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card-base ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
