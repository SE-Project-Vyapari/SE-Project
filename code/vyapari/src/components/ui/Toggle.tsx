
export const Toggle = ({ children, ...props }: any) => {
  return (
    <div className="toggle-base" {...props}>
      {children || 'Toggle'}
    </div>
  );
};
