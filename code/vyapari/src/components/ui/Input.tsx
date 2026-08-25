
export const Input = ({ children, ...props }: any) => {
  return (
    <div className="input-base" {...props}>
      {children || 'Input'}
    </div>
  );
};
