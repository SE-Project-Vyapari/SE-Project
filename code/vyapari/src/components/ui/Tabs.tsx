
export const Tabs = ({ children, ...props }: any) => {
  return (
    <div className="tabs-base" {...props}>
      {children || 'Tabs'}
    </div>
  );
};
