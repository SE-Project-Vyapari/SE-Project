
export const ProgressBar = ({ children, ...props }: any) => {
  return (
    <div className="progressbar-base" {...props}>
      {children || 'ProgressBar'}
    </div>
  );
};
