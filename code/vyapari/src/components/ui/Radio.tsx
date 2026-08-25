
export const Radio = ({ children, ...props }: any) => {
  return (
    <div className="radio-base" {...props}>
      {children || 'Radio'}
    </div>
  );
};
