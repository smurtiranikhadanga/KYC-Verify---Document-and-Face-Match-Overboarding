import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { VerificationProvider } from './context/VerificationContext';
import { router } from './routes';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <VerificationProvider>
        <RouterProvider router={router} />
      </VerificationProvider>
    </AuthProvider>
  );
};

export default App;
