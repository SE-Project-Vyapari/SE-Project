
export const Tooltip = ({ children, ...props }: any) => {
  return (
    <div className="tooltip-base" {...props}>
      {children || 'Tooltip'}
    </div>
  );
};
