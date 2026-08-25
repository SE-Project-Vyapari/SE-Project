
export const Badge = ({ children, ...props }: any) => {
  return (
    <div className="badge-base" {...props}>
      {children || 'Badge'}
    </div>
  );
};
