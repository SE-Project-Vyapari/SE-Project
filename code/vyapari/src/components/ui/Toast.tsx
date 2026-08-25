
export const Toast = ({ children, ...props }: any) => {
  return (
    <div className="toast-base" {...props}>
      {children || 'Toast'}
    </div>
  );
};
