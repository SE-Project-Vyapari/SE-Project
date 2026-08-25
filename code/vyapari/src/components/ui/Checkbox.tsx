
export const Checkbox = ({ children, ...props }: any) => {
  return (
    <div className="checkbox-base" {...props}>
      {children || 'Checkbox'}
    </div>
  );
};
