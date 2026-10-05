import { OCRResult } from './ai.interface.js';

export class OcrService {
  /**
   * Simulates PaddleOCR / PP-Structure field extraction
   */
  async extractFields(
    _frontBuffer: Buffer,
    _backBuffer?: Buffer,
    country = 'IN',
    docType = 'passport',
    caseId = 'demo-case'
  ): Promise<OCRResult> {
    const start = Date.now();

    // Deterministic generation based on caseId characters
    const hash = caseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const names = [
      'Johnathan Miller',
      'Priya Sharma',
      'Alejandro Gomez',
      'Sarah Chen',
      'David K. O\'Connor',
      'Fatima Al-Mansoor',
      'Elena Rostova',
      'Marcus Aurelius Vance'
    ];
    const nameIndex = hash % names.length;
    const fullName = names[nameIndex];

    const birthYears = [1988, 1992, 1995, 1985, 2000, 1997, 1991];
    const year = birthYears[hash % birthYears.length];
    const month = String((hash % 12) + 1).padStart(2, '0');
    const day = String((hash % 28) + 1).padStart(2, '0');
    const dob = `${year}-${month}-${day}`;

    const idPrefix = country.toUpperCase() === 'IN' ? 'Z' : country.toUpperCase() === 'US' ? 'P' : 'D';
    const idDigits = (10000000 + (hash * 97) % 89999999).toString();
    const idNumber = `${idPrefix}${idDigits}`;

    const expiryYear = 2029 + (hash % 6);
    const expiry = `${expiryYear}-${month}-${day}`;

    // Confidences
    const baseConf = 0.94 + ((hash % 6) * 0.01);

    const latency = 450 + (hash % 200);

    return {
      engine: 'PaddleOCR / PP-StructureV3',
      version: '3.1.0',
      fields: {
        fullName: {
          value: fullName,
          confidence: Math.min(0.99, Number(baseConf.toFixed(2))),
          box: [45, 120, 320, 155],
        },
        dob: {
          value: dob,
          confidence: Math.min(0.98, Number((baseConf - 0.02).toFixed(2))),
          box: [45, 170, 200, 200],
        },
        idNumber: {
          value: idNumber,
          confidence: Math.min(0.99, Number((baseConf - 0.01).toFixed(2))),
          box: [45, 215, 260, 245],
        },
        expiry: {
          value: expiry,
          confidence: Math.min(0.99, Number(baseConf.toFixed(2))),
          box: [45, 260, 190, 290],
        },
        address: {
          value: '42 Skyline Boulevard, Suite 300',
          confidence: Math.min(0.95, Number((baseConf - 0.04).toFixed(2))),
          box: [45, 305, 410, 340],
        }
      },
      mrzValid: true,
      rawText: `P<${country.toUpperCase()}${fullName.replace(' ', '<<')}<<<<<<<<<<<<<<<<<<<\n${idNumber}<5${country.toUpperCase()}${year % 100}${month}${day}2M${expiryYear % 100}${month}${day}4<<<<<<<<<<<8`,
      latencyMs: latency,
    };
  }
}
