
export const Button = ({ children, ...props }: any) => {
  return (
    <div className="button-base" {...props}>
      {children || 'Button'}
    </div>
  );
};
