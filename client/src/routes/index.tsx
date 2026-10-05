import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import { PublicLayout } from '../layouts/PublicLayout';
import { ApplicantLayout } from '../layouts/ApplicantLayout';
import { StaffLayout } from '../layouts/StaffLayout';

// Public Pages
import { LandingPage } from '../pages/public/LandingPage';
import { HowItWorksPage } from '../pages/public/HowItWorksPage';
import { SupportedDocumentsPage } from '../pages/public/SupportedDocumentsPage';
import { PrivacyNoticePage } from '../pages/public/PrivacyNoticePage';
import { FaqPage } from '../pages/public/FaqPage';
import { ContactPage } from '../pages/public/ContactPage';

// Applicant Pages
import { VerifyStartPage } from '../pages/applicant/VerifyStartPage';
import { VerifyContactPage } from '../pages/applicant/VerifyContactPage';
import { VerifyConsentPage } from '../pages/applicant/VerifyConsentPage';
import { VerifyDocumentPage } from '../pages/applicant/VerifyDocumentPage';
import { VerifySelfiePage } from '../pages/applicant/VerifySelfiePage';
import { VerifyReviewPage } from '../pages/applicant/VerifyReviewPage';
import { VerifyStatusPage } from '../pages/applicant/VerifyStatusPage';
import { PrivacyCenterPage } from '../pages/applicant/PrivacyCenterPage';

// Staff Pages
import { StaffLoginPage } from '../pages/staff/StaffLoginPage';
import { StaffDashboardPage } from '../pages/staff/StaffDashboardPage';
import { ReviewQueuePage } from '../pages/staff/ReviewQueuePage';
import { CaseDetailPage } from '../pages/staff/CaseDetailPage';
import { CompliancePage } from '../pages/staff/CompliancePage';
import { AdminPage } from '../pages/staff/AdminPage';
import { MLOpsPage } from '../pages/staff/MLOpsPage';
import { AuditPage } from '../pages/staff/AuditPage';

import { useAuth } from '../context/AuthContext';

// Protected Route Guard for Staff
const ProtectedStaffRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, token, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/staff/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  return <>{children}</>;
};

export const router = createBrowserRouter([
  // Public Site Routes
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'how-it-works', element: <HowItWorksPage /> },
      { path: 'supported-documents', element: <SupportedDocumentsPage /> },
      { path: 'privacy', element: <PrivacyNoticePage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'privacy-center', element: <PrivacyCenterPage /> },
    ],
  },

  // Applicant Verification Flow Routes
  {
    path: '/verify',
    element: <ApplicantLayout />,
    children: [
      { index: true, element: <VerifyStartPage /> },
      { path: 'contact', element: <VerifyContactPage /> },
      { path: 'consent', element: <VerifyConsentPage /> },
      { path: 'document', element: <VerifyDocumentPage /> },
      { path: 'selfie', element: <VerifySelfiePage /> },
      { path: 'review', element: <VerifyReviewPage /> },
      { path: 'status/:caseId', element: <VerifyStatusPage /> },
    ],
  },

  // Staff Portal Routes
  {
    path: '/staff/login',
    element: <StaffLoginPage />,
  },
  {
    path: '/staff',
    element: (
      <ProtectedStaffRoute>
        <StaffLayout />
      </ProtectedStaffRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/staff/dashboard" replace /> },
      { path: 'dashboard', element: <StaffDashboardPage /> },
      {
        path: 'review-queue',
        element: (
          <ProtectedStaffRoute allowedRoles={['reviewer', 'senior_reviewer', 'compliance_officer', 'admin', 'auditor']}>
            <ReviewQueuePage />
          </ProtectedStaffRoute>
        ),
      },
      {
        path: 'cases/:caseId',
        element: (
          <ProtectedStaffRoute allowedRoles={['reviewer', 'senior_reviewer', 'compliance_officer', 'admin', 'auditor']}>
            <CaseDetailPage />
          </ProtectedStaffRoute>
        ),
      },
      {
        path: 'compliance',
        element: (
          <ProtectedStaffRoute allowedRoles={['compliance_officer', 'senior_reviewer', 'admin', 'auditor']}>
            <CompliancePage />
          </ProtectedStaffRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedStaffRoute allowedRoles={['admin', 'auditor']}>
            <AdminPage />
          </ProtectedStaffRoute>
        ),
      },
      {
        path: 'mlops',
        element: (
          <ProtectedStaffRoute allowedRoles={['ml_engineer', 'admin', 'compliance_officer', 'auditor']}>
            <MLOpsPage />
          </ProtectedStaffRoute>
        ),
      },
      {
        path: 'audit',
        element: (
          <ProtectedStaffRoute allowedRoles={['compliance_officer', 'admin', 'auditor']}>
            <AuditPage />
          </ProtectedStaffRoute>
        ),
      },
    ],
  },

  // Fallback
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
