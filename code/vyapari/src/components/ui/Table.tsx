
export const Table = ({ children, ...props }: any) => {
  return (
    <div className="table-base" {...props}>
      {children || 'Table'}
    </div>
  );
};
