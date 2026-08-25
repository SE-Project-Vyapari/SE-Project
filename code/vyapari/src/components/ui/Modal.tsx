
export const Modal = ({ children, ...props }: any) => {
  return (
    <div className="modal-base" {...props}>
      {children || 'Modal'}
    </div>
  );
};
