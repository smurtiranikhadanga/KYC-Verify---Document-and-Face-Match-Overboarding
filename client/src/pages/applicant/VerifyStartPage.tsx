import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const VerifyStartPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/verify/contact', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};
