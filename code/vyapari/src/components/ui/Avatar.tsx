
export const Avatar = ({ children, ...props }: any) => {
  return (
    <div className="avatar-base" {...props}>
      {children || 'Avatar'}
    </div>
  );
};
