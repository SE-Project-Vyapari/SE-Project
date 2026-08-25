
export const EmptyState = ({ children, ...props }: any) => {
  return (
    <div className="emptystate-base" {...props}>
      {children || 'EmptyState'}
    </div>
  );
};
