
export const Card = ({ children, ...props }: any) => {
  return (
    <div className="card-base" {...props}>
      {children || 'Card'}
    </div>
  );
};
