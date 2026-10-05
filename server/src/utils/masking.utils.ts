export function maskName(name?: string): string {
  if (!name) return '••••••';
  const parts = name.split(' ');
  return parts
    .map((p) => {
      if (p.length <= 1) return p;
      return p[0] + '*'.repeat(Math.max(1, p.length - 1));
    })
    .join(' ');
}

export function maskIdNumber(idNumber?: string): string {
  if (!idNumber) return '••••••••';
  const clean = idNumber.trim();
  if (clean.length <= 4) return '••••' + clean;
  const last4 = clean.slice(-4);
  return '••••' + last4;
}

export function maskDob(dob?: string): string {
  if (!dob) return 'XX/XX/XXXX';
  // format YYYY-MM-DD
  const parts = dob.split('-');
  if (parts.length === 3) {
    return `XX/XX/${parts[0]}`;
  }
  return 'XX/XX/XXXX';
}

export function maskAddress(address?: string): string {
  if (!address) return '••••••••••••••••';
  return '••••••••, Restricted Jurisdictional Address';
}

/**
 * Masks sensitive PII fields on a case object unless unmasked is explicitly allowed
 */
export function maskCaseData(caseDoc: any, revealPII = false): any {
  const plain = caseDoc.toObject ? caseDoc.toObject() : JSON.parse(JSON.stringify(caseDoc));

  if (!plain.document || !plain.document.ocr || !plain.document.ocr.fields) {
    return plain;
  }

  const fields = plain.document.ocr.fields;

  if (!revealPII) {
    if (fields.fullName) {
      fields.fullName.masked = maskName(fields.fullName.value);
      fields.fullName.isMasked = true;
      delete fields.fullName.value;
    }
    if (fields.idNumber) {
      fields.idNumber.masked = maskIdNumber(fields.idNumber.value);
      fields.idNumber.isMasked = true;
      delete fields.idNumber.value;
    }
    if (fields.dob) {
      fields.dob.masked = maskDob(fields.dob.value);
      fields.dob.isMasked = true;
      delete fields.dob.value;
    }
    if (fields.address) {
      fields.address.masked = maskAddress(fields.address.value);
      fields.address.isMasked = true;
      delete fields.address.value;
    }
    // Also mask rawText MRZ
    if (plain.document.ocr.rawText) {
      plain.document.ocr.rawText = '•••••• MRZ PROTECTED (REVEAL REQUIRED) ••••••';
    }
  } else {
    // Revealed
    if (fields.fullName) fields.fullName.isMasked = false;
    if (fields.idNumber) fields.idNumber.isMasked = false;
    if (fields.dob) fields.dob.isMasked = false;
    if (fields.address) fields.address.isMasked = false;
  }

  return plain;
}
