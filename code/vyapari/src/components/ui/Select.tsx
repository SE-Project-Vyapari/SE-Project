
export const Select = ({ children, ...props }: any) => {
  return (
    <div className="select-base" {...props}>
      {children || 'Select'}
    </div>
  );
};
