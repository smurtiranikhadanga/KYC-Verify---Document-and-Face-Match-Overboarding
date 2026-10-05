import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How long does automated KYC verification take?',
      a: 'The automated AI evaluation completes in approximately 2 to 3 minutes. The pipeline runs OCR text extraction, tamper analysis, facial matching, and anti-spoof liveness asynchronously, immediately notifying you when your status changes.',
    },
    {
      q: 'Why do I need to provide separate biometric consent?',
      a: 'Global data protection regulations (such as Article 9 of the EU GDPR and Illinois BIPA) strictly require explicit, unbundled written consent for processing biometric identifiers. We ensure that you are fully aware of what biometric data is collected and how long it is stored before processing.',
    },
    {
      q: 'What should I do if my document capture is rejected for poor quality?',
      a: 'Ensure you are in a well-lit room and facing natural light (such as a window). Avoid overhead spotlights that create harsh reflections or glare over the text. Place the document flat on a dark, non-reflective background and keep your device steady.',
    },
    {
      q: 'Is my biometric selfie shared with third parties?',
      a: 'No. KYC-Flow is designed as a sovereign, self-hosted identity verification pipeline. Your selfie and document images are never sent to third-party commercial cloud vision vendors or resold.',
    },
    {
      q: 'Can I request that my biometric and personal data be deleted?',
      a: 'Yes. You can visit our self-service Data Privacy Center at any time to submit an Article 17 Right to Erasure request. Our compliance engine purges physical artifact images from disk, wipes biometric embeddings, and issues an official completion certificate.',
    },
    {
      q: 'What is a Four-Eyes decision review?',
      a: 'If our automated models flag a potential anomaly or high fraud score, a human reviewer must evaluate the evidence. If the reviewer determines that the signal was a false alarm and chooses to override an automated rejection, a second senior reviewer must independently confirm the decision.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="mt-3 text-slate-600 text-sm">
          Everything you need to know about our identity verification process, security controls, and privacy standards.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs transition-all"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between font-semibold text-slate-900 text-sm hover:text-brand-600 transition-colors"
              >
                <span>{faq.q}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-slate-100">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
