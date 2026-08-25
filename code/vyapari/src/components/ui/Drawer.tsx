
export const Drawer = ({ children, ...props }: any) => {
  return (
    <div className="drawer-base" {...props}>
      {children || 'Drawer'}
    </div>
  );
};
