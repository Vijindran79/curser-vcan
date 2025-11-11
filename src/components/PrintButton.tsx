import React from 'react';

type Props = {
  onClick: () => void;
  children?: React.ReactNode;
};

export const PrintButton: React.FC<Props> = ({ onClick, children }) => {
  return (
    <button className="main-submit-btn" onClick={onClick}>
      {children || 'Print'}
    </button>
  );
};

export default PrintButton;

