
export const Skeleton = ({ children, ...props }: any) => {
  return (
    <div className="skeleton-base" {...props}>
      {children || 'Skeleton'}
    </div>
  );
};
