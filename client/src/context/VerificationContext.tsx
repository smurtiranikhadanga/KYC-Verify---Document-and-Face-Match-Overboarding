import React, { createContext, useContext, useState, useEffect } from 'react';

export interface VerificationState {
  contactType: 'email' | 'phone';
  contactValue: string;
  sessionId: string;
  applicantId: string;
  consentGranted: boolean;
  signatureName: string;
  country: string;
  documentType: 'passport' | 'national_id' | 'driver_license';
  caseId: string;
  frontFile: File | null;
  frontPreview: string;
  backFile: File | null;
  backPreview: string;
  selfieFile: File | null;
  selfiePreview: string;
  activeChallenge: 'none' | 'turn_left' | 'turn_right' | 'blink';
  qualityFeedback: {
    resolution?: string;
    brightness?: string;
    blur?: string;
    glare?: string;
    documentEdges?: string;
  };
}

interface VerificationContextType {
  state: VerificationState;
  updateState: (updates: Partial<VerificationState>) => void;
  resetFlow: () => void;
}

const initialState: VerificationState = {
  contactType: 'email',
  contactValue: '',
  sessionId: '',
  applicantId: '',
  consentGranted: false,
  signatureName: '',
  country: 'IN',
  documentType: 'passport',
  caseId: '',
  frontFile: null,
  frontPreview: '',
  backFile: null,
  backPreview: '',
  selfieFile: null,
  selfiePreview: '',
  activeChallenge: 'none',
  qualityFeedback: {},
};

const VerificationContext = createContext<VerificationContextType | undefined>(undefined);

export const VerificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<VerificationState>(() => {
    const saved = sessionStorage.getItem('kyc_flow_applicant_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...initialState, ...parsed, frontFile: null, backFile: null, selfieFile: null };
      } catch {
        return initialState;
      }
    }
    return initialState;
  });

  useEffect(() => {
    // Save lightweight serializable fields to sessionStorage
    const toSave = {
      contactType: state.contactType,
      contactValue: state.contactValue,
      sessionId: state.sessionId,
      applicantId: state.applicantId,
      consentGranted: state.consentGranted,
      signatureName: state.signatureName,
      country: state.country,
      documentType: state.documentType,
      caseId: state.caseId,
      frontPreview: state.frontPreview,
      backPreview: state.backPreview,
      selfiePreview: state.selfiePreview,
      activeChallenge: state.activeChallenge,
    };
    sessionStorage.setItem('kyc_flow_applicant_state', JSON.stringify(toSave));
  }, [state]);

  const updateState = (updates: Partial<VerificationState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const resetFlow = () => {
    sessionStorage.removeItem('kyc_flow_applicant_state');
    setState(initialState);
  };

  return (
    <VerificationContext.Provider value={{ state, updateState, resetFlow }}>
      {children}
    </VerificationContext.Provider>
  );
};

export function useVerification() {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
}
