import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const outputDir = path.resolve('uploads/mock');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR PERSONA SVGs
// ─────────────────────────────────────────────────────────────────────────────
interface Persona {
  id: string;
  name: string;
  gender: 'female' | 'male';
  skin: string;
  hairColor: string;
  hairStyle: string;
  eyeColor?: string;
  hasGlasses?: boolean;
  hasBeard?: boolean;
  beardColor?: string;
  clothesColor: string;
  clothesType?: 'shirt' | 'suit' | 'blazer' | 'hoodie' | 'tshirt' | 'hijab';
  isPaperSpoof?: boolean;
  isScreenSpoof?: boolean;
  isSyntheticMask?: boolean;
  bindi?: boolean;
}

function renderFaceSvg(p: Persona, isSelfie = false, width = 300, height = 360): string {
  const bgGrad = isSelfie
    ? `<defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
       </defs>
       <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>`
    : `<defs>
        <linearGradient id="idBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e2e8f0"/>
          <stop offset="100%" stop-color="#cbd5e1"/>
        </linearGradient>
       </defs>
       <rect width="${width}" height="${height}" fill="url(#idBg)"/>`;

  // Head and body positioning
  const cx = width / 2;
  const cy = height * 0.44;
  const headW = width * 0.44;
  const headH = height * 0.42;

  // Hair shapes
  let hairBack = '';
  let hairFront = '';
  if (p.hairStyle === 'long_wavy') {
    hairBack = `<path d="M${cx - 75} ${cy} C${cx - 85} ${cy + 130}, ${cx - 70} ${cy + 160}, ${cx - 40} ${cy + 170} L${cx + 40} ${cy + 170} C${cx + 70} ${cy + 160}, ${cx + 85} ${cy + 130}, ${cx + 75} ${cy} Z" fill="${p.hairColor}"/>`;
    hairFront = `<path d="M${cx - 70} ${cy - 20} C${cx - 70} ${cy - 85}, ${cx + 70} ${cy - 85}, ${cx + 70} ${cy - 20} C${cx + 50} ${cy - 40}, ${cx + 10} ${cy - 60}, ${cx - 20} ${cy - 40} C${cx - 50} ${cy - 30}, ${cx - 65} ${cy}, ${cx - 70} ${cy + 40} Z" fill="${p.hairColor}"/>`;
  } else if (p.hairStyle === 'bob') {
    hairBack = `<path d="M${cx - 72} ${cy} C${cx - 80} ${cy + 90}, ${cx - 50} ${cy + 110}, ${cx - 30} ${cy + 115} L${cx + 30} ${cy + 115} C${cx + 50} ${cy + 110}, ${cx + 80} ${cy + 90}, ${cx + 72} ${cy} Z" fill="${p.hairColor}"/>`;
    hairFront = `<path d="M${cx - 68} ${cy - 25} C${cx - 68} ${cy - 80}, ${cx + 68} ${cy - 80}, ${cx + 68} ${cy - 25} C${cx + 40} ${cy - 45}, ${cx - 10} ${cy - 50}, ${cx - 50} ${cy - 25} Z" fill="${p.hairColor}"/>`;
  } else if (p.hairStyle === 'short_fade' || p.hairStyle === 'short_brown') {
    hairFront = `<path d="M${cx - 66} ${cy - 10} C${cx - 68} ${cy - 75}, ${cx + 68} ${cy - 75}, ${cx + 66} ${cy - 10} C${cx + 40} ${cy - 55}, ${cx - 20} ${cy - 60}, ${cx - 66} ${cy - 10} Z" fill="${p.hairColor}"/>`;
  } else if (p.hairStyle === 'curly_black') {
    hairFront = `<path d="M${cx - 70} ${cy - 5} C${cx - 75} ${cy - 85}, ${cx + 75} ${cy - 85}, ${cx + 70} ${cy - 5} C${cx + 50} ${cy - 50}, ${cx} ${cy - 65}, ${cx - 70} ${cy - 5} Z" fill="${p.hairColor}"/><circle cx="${cx - 45}" cy="${cy - 60}" r="22" fill="${p.hairColor}"/><circle cx="${cx}" cy="${cy - 70}" r="24" fill="${p.hairColor}"/><circle cx="${cx + 45}" cy="${cy - 60}" r="22" fill="${p.hairColor}"/>`;
  } else if (p.hairStyle === 'hijab') {
    hairFront = `<path d="M${cx - 80} ${cy - 40} C${cx - 80} ${cy - 90}, ${cx + 80} ${cy - 90}, ${cx + 80} ${cy - 40} C${cx + 85} ${cy + 80}, ${cx + 50} ${cy + 170}, ${cx} ${cy + 170} C${cx - 50} ${cy + 170}, ${cx - 85} ${cy + 80}, ${cx - 80} ${cy - 40} Z" fill="${p.clothesColor}"/>`;
  } else {
    // default medium
    hairFront = `<path d="M${cx - 65} ${cy - 20} C${cx - 65} ${cy - 75}, ${cx + 65} ${cy - 75}, ${cx + 65} ${cy - 20} C${cx + 35} ${cy - 45}, ${cx - 15} ${cy - 50}, ${cx - 65} ${cy - 20} Z" fill="${p.hairColor}"/>`;
  }

  // Neck and Shoulders / Clothing
  const clothes = `
    <!-- Neck -->
    <rect x="${cx - 22}" y="${cy + 40}" width="44" height="60" fill="${p.skin}" rx="8"/>
    <!-- Shoulders -->
    <path d="M${cx - 110} ${height} C${cx - 95} ${cy + 85}, ${cx - 60} ${cy + 80}, ${cx - 25} ${cy + 95} L${cx + 25} ${cy + 95} C${cx + 60} ${cy + 80}, ${cx + 95} ${cy + 85}, ${cx + 110} ${height} Z" fill="${p.clothesColor}"/>
    <!-- Collar / neckline -->
    <path d="M${cx - 25} ${cy + 95} Q${cx} ${cy + 120} ${cx + 25} ${cy + 95} Q${cx} ${cy + 105} ${cx - 25} ${cy + 95} Z" fill="#ffffff" opacity="0.6"/>
  `;

  // Head base
  const head = `
    <!-- Ears -->
    <circle cx="${cx - headW * 0.48}" cy="${cy}" r="14" fill="${p.skin}"/>
    <circle cx="${cx + headW * 0.48}" cy="${cy}" r="14" fill="${p.skin}"/>
    <!-- Head ellipse -->
    <ellipse cx="${cx}" cy="${cy}" rx="${headW * 0.46}" ry="${headH * 0.5}" fill="${p.skin}"/>
  `;

  // Facial features
  const eyesY = cy - 6;
  const eyes = `
    <!-- Eyebrows -->
    <path d="M${cx - 42} ${eyesY - 14} Q${cx - 26} ${eyesY - 20} ${cx - 12} ${eyesY - 14}" stroke="${p.hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M${cx + 12} ${eyesY - 14} Q${cx + 26} ${eyesY - 20} ${cx + 42} ${eyesY - 14}" stroke="${p.hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <!-- Eyes -->
    <ellipse cx="${cx - 26}" cy="${eyesY}" rx="9" ry="6" fill="#ffffff"/>
    <circle cx="${cx - 26}" cy="${eyesY}" r="4.5" fill="${p.eyeColor || '#292524'}"/>
    <circle cx="${cx - 24.5}" cy="${eyesY - 1.5}" r="1.5" fill="#ffffff"/>

    <ellipse cx="${cx + 26}" cy="${eyesY}" rx="9" ry="6" fill="#ffffff"/>
    <circle cx="${cx + 26}" cy="${eyesY}" r="4.5" fill="${p.eyeColor || '#292524'}"/>
    <circle cx="${cx + 27.5}" cy="${eyesY - 1.5}" r="1.5" fill="#ffffff"/>
  `;

  // Nose & Mouth
  const noseMouth = `
    <!-- Nose -->
    <path d="M${cx - 3} ${cy - 4} L${cx - 4} ${cy + 14} Q${cx} ${cy + 18} ${cx + 4} ${cy + 14}" stroke="#78350f" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.4"/>
    <!-- Mouth -->
    <path d="M${cx - 18} ${cy + 32} Q${cx} ${cy + 38} ${cx + 18} ${cy + 32}" stroke="#881337" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.75"/>
    <path d="M${cx - 12} ${cy + 32} Q${cx} ${cy + 35} ${cx + 12} ${cy + 32}" stroke="#be123c" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.5"/>
  `;

  // Glasses
  const glasses = p.hasGlasses
    ? `
    <rect x="${cx - 44}" y="${eyesY - 10}" width="34" height="22" rx="4" fill="none" stroke="#64748b" stroke-width="2.5"/>
    <rect x="${cx + 10}" y="${eyesY - 10}" width="34" height="22" rx="4" fill="none" stroke="#64748b" stroke-width="2.5"/>
    <line x1="${cx - 10}" y1="${eyesY}" x2="${cx + 10}" y2="${eyesY}" stroke="#64748b" stroke-width="2.5"/>
    <line x1="${cx - 44}" y1="${eyesY}" x2="${cx - 60}" y2="${eyesY - 4}" stroke="#64748b" stroke-width="2"/>
    <line x1="${cx + 44}" y1="${eyesY}" x2="${cx + 60}" y2="${eyesY - 4}" stroke="#64748b" stroke-width="2"/>
  `
    : '';

  // Beard
  const beard = p.hasBeard
    ? `
    <path d="M${cx - 35} ${cy + 15} C${cx - 40} ${cy + 45}, ${cx - 25} ${cy + 65}, ${cx} ${cy + 68} C${cx + 25} ${cy + 68}, ${cx + 40} ${cy + 45}, ${cx + 35} ${cy + 15} Q${cx} ${cy + 24} ${cx - 35} ${cy + 15} Z" fill="${p.beardColor || p.hairColor}" opacity="0.85"/>
    <path d="M${cx - 18} ${cy + 24} Q${cx} ${cy + 22} ${cx + 18} ${cy + 24} Q${cx} ${cy + 28} ${cx - 18} ${cy + 24} Z" fill="${p.beardColor || p.hairColor}"/>
  `
    : '';

  // Bindi
  const bindi = p.bindi ? `<circle cx="${cx}" cy="${eyesY - 14}" r="3" fill="#b91c1c"/>` : '';

  // Synthetic mask artifacts (for Lucas Silva mismatch)
  const synthetic = p.isSyntheticMask
    ? `
    <!-- Synthetic 3D Mask mesh lines -->
    <path d="M${cx - 45} ${cy - 20} L${cx} ${cy} L${cx + 45} ${cy - 20} L${cx + 30} ${cy + 40} L${cx} ${cy + 55} L${cx - 30} ${cy + 40} Z" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,3" fill="none" opacity="0.6"/>
    <rect x="${width * 0.05}" y="${height * 0.85}" width="${width * 0.9}" height="28" rx="6" fill="#0f172a" opacity="0.85"/>
    <text x="${cx}" y="${height * 0.91}" fill="#ef4444" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">SYNTHETIC MASK DETECTED</text>
  `
    : '';

  // Presentation spoof overlays (Screen or paper)
  let spoofOverlay = '';
  if (p.isScreenSpoof) {
    spoofOverlay = `
      <!-- Phone Bezel / Screen Moiré -->
      <rect x="12" y="12" width="${width - 24}" height="${height - 24}" rx="24" fill="none" stroke="#475569" stroke-width="8"/>
      <line x1="30" y1="40" x2="${width - 30}" y2="${height - 40}" stroke="#ffffff" stroke-width="3" opacity="0.2" transform="rotate(-25 ${cx} ${cy})"/>
      <rect x="${cx - 30}" y="16" width="60" height="8" rx="4" fill="#1e293b"/>
      <!-- Warning tag -->
      <rect x="${width * 0.08}" y="${height * 0.85}" width="${width * 0.84}" height="26" rx="6" fill="#78350f" opacity="0.9"/>
      <text x="${cx}" y="${height * 0.91}" fill="#fef08a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">DISPLAY REPLAY REFLECTION</text>
    `;
  } else if (p.isPaperSpoof) {
    spoofOverlay = `
      <!-- Paper Cutout / Curl lines -->
      <path d="M15 15 L${width - 15} 25 L${width - 20} ${height - 20} L10 ${height - 15} Z" fill="none" stroke="#e2e8f0" stroke-width="6"/>
      <path d="M15 15 Q${cx} 30 ${width - 15} 25" stroke="#94a3b8" stroke-width="2" fill="none"/>
      <!-- Clip on top -->
      <rect x="${cx - 15}" y="5" width="30" height="20" rx="3" fill="#64748b"/>
      <rect x="${width * 0.08}" y="${height * 0.85}" width="${width * 0.84}" height="26" rx="6" fill="#831843" opacity="0.9"/>
      <text x="${cx}" y="${height * 0.91}" fill="#fbcfe8" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">PRINTED SPOOF ATTEMPT</text>
    `;
  }

  // Camera badge for selfie
  const selfieBadge = isSelfie && !p.isScreenSpoof && !p.isPaperSpoof
    ? `<circle cx="${width - 24}" cy="24" r="8" fill="#10b981" opacity="0.8"/>
       <circle cx="${width - 24}" cy="24" r="4" fill="#ffffff"/>`
    : '';

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${bgGrad}
      ${hairBack}
      ${clothes}
      ${head}
      ${hairFront}
      ${eyes}
      ${noseMouth}
      ${beard}
      ${glasses}
      ${bindi}
      ${synthetic}
      ${selfieBadge}
      ${spoofOverlay}
    </svg>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT FRONT SVG GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
interface DocConfig {
  docType: 'passport' | 'national_id' | 'driver_license';
  country: string;
  name: string;
  dob: string;
  idNumber: string;
  expiry: string;
  persona: Persona;
  isTampered?: boolean;
  isBlur?: boolean;
  isGlare?: boolean;
  isExpired?: boolean;
}

function renderDocFrontSvg(cfg: DocConfig, width = 700, height = 440): string {
  const isPassport = cfg.docType === 'passport';
  const isDL = cfg.docType === 'driver_license';

  // Country details
  const countryMap: Record<string, { name: string; title: string; color1: string; color2: string; flag: string }> = {
    IN: { name: 'INDIA', title: isPassport ? 'REPUBLIC OF INDIA / PASSPORT' : isDL ? 'INDIAN UNION DRIVING LICENCE' : 'AADHAAR / UNIQUE IDENTITY', color1: '#064e3b', color2: '#0f766e', flag: '🇮🇳' },
    GB: { name: 'UNITED KINGDOM', title: isPassport ? 'UNITED KINGDOM OF GREAT BRITAIN / PASSPORT' : isDL ? 'GREAT BRITAIN DRIVING LICENCE' : 'UK RESIDENCE IDENTITY PERMIT', color1: '#1e3a8a', color2: '#1e293b', flag: '🇬🇧' },
    DE: { name: 'GERMANY', title: isPassport ? 'BUNDESREPUBLIK DEUTSCHLAND / REISEPASS' : isDL ? 'BUNDESREPUBLIK DEUTSCHLAND / FÜHRERSCHEIN' : 'BUNDESREPUBLIK DEUTSCHLAND / PERSONALAUSWEIS', color1: '#334155', color2: '#1e293b', flag: '🇩🇪' },
    ES: { name: 'SPAIN', title: isPassport ? 'REINO DE ESPAÑA / PASAPORTE' : 'REINO DE ESPAÑA / DOCUMENTO NACIONAL DE IDENTIDAD', color1: '#831843', color2: '#9f1239', flag: '🇪🇸' },
    AE: { name: 'UNITED ARAB EMIRATES', title: 'UNITED ARAB EMIRATES / RESIDENT IDENTITY CARD', color1: '#14532d', color2: '#065f46', flag: '🇦🇪' },
    FR: { name: 'FRANCE', title: 'RÉPUBLIQUE FRANÇAISE / PASSEPORT', color1: '#1e3a8a', color2: '#312e81', flag: '🇫🇷' },
    US: { name: 'UNITED STATES', title: isPassport ? 'UNITED STATES OF AMERICA / PASSPORT' : 'STATE DRIVER LICENSE / USA', color1: '#1e3a8a', color2: '#0284c7', flag: '🇺🇸' },
    JP: { name: 'JAPAN', title: 'JAPAN / PASSPORT', color1: '#881337', color2: '#4c0519', flag: '🇯🇵' },
    BR: { name: 'BRAZIL', title: 'REPÚBLICA FEDERATIVA DO BRASIL / PASSAPORTE', color1: '#15803d', color2: '#047857', flag: '🇧🇷' },
    KR: { name: 'REPUBLIC OF KOREA', title: 'REPUBLIC OF KOREA / PASSPORT', color1: '#1e3a8a', color2: '#172554', flag: '🇰🇷' },
    SA: { name: 'SAUDI ARABIA', title: 'KINGDOM OF SAUDI ARABIA / PASSPORT', color1: '#14532d', color2: '#064e3b', flag: '🇸🇦' },
  };

  const meta = countryMap[cfg.country] || { name: cfg.country, title: 'OFFICIAL IDENTITY DOCUMENT', color1: '#1e293b', color2: '#0f172a', flag: '🌐' };

  // Generate face portrait SVG snippet inside photo box
  const photoW = 160;
  const photoH = 200;
  const photoX = 40;
  const photoY = 110;

  // Background pattern / guilloche lines
  const guilloche = `
    <pattern id="guilloche" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 0 20 Q 10 0 20 20 T 40 20" fill="none" stroke="#ffffff" stroke-width="0.75" opacity="0.12"/>
      <path d="M 0 20 Q 10 40 20 20 T 40 20" fill="none" stroke="#ffffff" stroke-width="0.75" opacity="0.12"/>
    </pattern>
  `;

  // MRZ text lines at bottom (ICAO 9303)
  const mrzLine1 = `P<${cfg.country}${cfg.name.toUpperCase().replace(/\s+/g, '<')}<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`.slice(0, 44);
  const mrzLine2 = `${cfg.idNumber}<5${cfg.country}9001012M3010154<<<<<<<<<<<8`.slice(0, 44);

  // Tamper modifications
  let tamperOverlay = '';
  if (cfg.isTampered) {
    tamperOverlay = `
      <!-- TAMPER SPLICE ARTIFACT -->
      <rect x="225" y="175" width="220" height="35" fill="#fef08a" opacity="0.25" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,2"/>
      <text x="450" y="198" fill="#ef4444" font-family="sans-serif" font-size="11" font-weight="bold">ELA SPLICED FIELD</text>
      <rect x="${photoX - 4}" y="${photoY - 4}" width="${photoW + 8}" height="${photoH + 8}" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,3"/>
      <circle cx="${photoX + photoW - 10}" cy="${photoY + 15}" r="12" fill="#ef4444"/>
      <text x="${photoX + photoW - 10}" y="${photoY + 19}" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">!</text>
    `;
  }

  // Glare reflection
  let glareOverlay = '';
  if (cfg.isGlare) {
    glareOverlay = `
      <!-- SPECULAR FLASH GLARE OVER EXPIRY -->
      <ellipse cx="360" cy="275" rx="85" ry="55" fill="#ffffff" opacity="0.85"/>
      <ellipse cx="360" cy="275" rx="140" ry="90" fill="#ffffff" opacity="0.4"/>
      <text x="360" y="280" fill="#991b1b" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">UNREADABLE GLARE</text>
    `;
  }

  // Blur filter
  const blurFilter = cfg.isBlur
    ? `<filter id="docBlur"><feGaussianBlur stdDeviation="7"/></filter>`
    : '';
  const filterAttr = cfg.isBlur ? 'filter="url(#docBlur)"' : '';

  function escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Face SVG nested in photo box
  const faceSnippet = renderFaceSvg(cfg.persona, false, photoW, photoH);

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${guilloche}
        ${blurFilter}
        <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${meta.color1}"/>
          <stop offset="100%" stop-color="${meta.color2}"/>
        </linearGradient>
      </defs>

      <g ${filterAttr}>
        <!-- Card Body -->
        <rect width="${width}" height="${height}" rx="18" fill="url(#cardBg)"/>
        <rect width="${width}" height="${height}" rx="18" fill="url(#guilloche)"/>

        <!-- Header Banner -->
        <rect x="0" y="0" width="${width}" height="65" rx="18" fill="#0f172a" opacity="0.45"/>
        <text x="40" y="32" fill="#f8fafc" font-family="sans-serif" font-size="14" font-weight="bold" letter-spacing="1.5">
          ${escapeXml(meta.title)}
        </text>
        <text x="40" y="52" fill="#94a3b8" font-family="sans-serif" font-size="11" letter-spacing="2">
          OFFICIAL VERIFICATION CREDENTIAL • ICAO 9303 COMPLIANT
        </text>
        
        <!-- Country Emblem Badge -->
        <circle cx="${width - 50}" cy="32" r="18" fill="#ffffff" opacity="0.2"/>
        <text x="${width - 50}" y="38" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">
          ${cfg.country}
        </text>

        <!-- Golden Biometric Chip Icon -->
        <rect x="${width - 110}" y="85" width="45" height="34" rx="6" fill="#eab308" stroke="#ca8a04" stroke-width="1.5"/>
        <rect x="${width - 98}" y="93" width="20" height="18" rx="2" fill="none" stroke="#713f12" stroke-width="1.5"/>
        <line x1="${width - 110}" y1="102" x2="${width - 65}" y2="102" stroke="#713f12" stroke-width="1.5"/>

        <!-- Photo Frame -->
        <rect x="${photoX - 3}" y="${photoY - 3}" width="${photoW + 6}" height="${photoH + 6}" rx="10" fill="#ffffff" opacity="0.9"/>
        <g transform="translate(${photoX}, ${photoY})">
          <clipPath id="photoClip-${cfg.name.replace(/\s+/g, '')}">
            <rect width="${photoW}" height="${photoH}" rx="8"/>
          </clipPath>
          <g clip-path="url(#photoClip-${cfg.name.replace(/\s+/g, '')})">
            ${faceSnippet}
          </g>
        </g>

        <!-- Demographic Fields -->
        <g transform="translate(230, 95)" font-family="sans-serif">
          <!-- Full Name -->
          <text x="0" y="16" fill="#94a3b8" font-size="9" font-weight="bold" letter-spacing="1">FULL NAME / NOM</text>
          <text x="0" y="36" fill="#ffffff" font-size="18" font-weight="bold">${escapeXml(cfg.name.toUpperCase())}</text>

          <!-- ID Number -->
          <text x="0" y="66" fill="#94a3b8" font-size="9" font-weight="bold" letter-spacing="1">DOCUMENT NO. / NUMERO</text>
          <text x="0" y="86" fill="#38bdf8" font-family="monospace" font-size="16" font-weight="bold">${escapeXml(cfg.idNumber)}</text>

          <!-- DOB & Sex -->
          <text x="0" y="116" fill="#94a3b8" font-size="9" font-weight="bold" letter-spacing="1">DATE OF BIRTH / NE(E) LE</text>
          <text x="0" y="134" fill="#ffffff" font-size="13" font-weight="600">${escapeXml(cfg.dob)}</text>

          <text x="180" y="116" fill="#94a3b8" font-size="9" font-weight="bold" letter-spacing="1">NATIONALITY</text>
          <text x="180" y="134" fill="#ffffff" font-size="13" font-weight="600">${escapeXml(cfg.country)}</text>

          <!-- Expiry Date -->
          <text x="0" y="164" fill="#94a3b8" font-size="9" font-weight="bold" letter-spacing="1">EXPIRATION DATE</text>
          <text x="0" y="184" fill="${cfg.isExpired ? '#ef4444' : '#10b981'}" font-size="15" font-weight="bold">
            ${escapeXml(cfg.expiry)} ${cfg.isExpired ? '[EXPIRED]' : '[VALID]'}
          </text>

          <text x="180" y="164" fill="#94a3b8" font-size="9" font-weight="bold" letter-spacing="1">SECURITY LEVEL</text>
          <text x="180" y="184" fill="#cbd5e1" font-size="13" font-weight="600">ICAO TYPE-A</text>
        </g>

        <!-- MRZ Machine Readable Zone -->
        <rect x="0" y="${height - 85}" width="${width}" height="85" rx="18" fill="#020617" opacity="0.95"/>
        <text x="40" y="${height - 52}" fill="#38bdf8" font-family="monospace" font-size="15" font-weight="bold" letter-spacing="4">
          ${escapeXml(mrzLine1)}
        </text>
        <text x="40" y="${height - 24}" fill="#38bdf8" font-family="monospace" font-size="15" font-weight="bold" letter-spacing="4">
          ${escapeXml(mrzLine2)}
        </text>

        ${tamperOverlay}
        ${glareOverlay}
      </g>
    </svg>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT BACK SVG GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function renderDocBackSvg(width = 700, height = 440): string {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="backBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="18" fill="url(#backBg)"/>

      <!-- Magnetic Stripe -->
      <rect x="0" y="45" width="${width}" height="70" fill="#020617"/>

      <!-- Signature Strip -->
      <rect x="50" y="145" width="450" height="55" fill="#f8fafc" rx="4"/>
      <path d="M 70 175 Q 120 150 160 175 T 260 170 T 360 180" stroke="#1e293b" stroke-width="2.5" fill="none"/>
      <text x="50" y="138" fill="#94a3b8" font-family="sans-serif" font-size="10" font-weight="bold">AUTHORIZED SIGNATURE</text>

      <!-- Security Microtext & Chip -->
      <rect x="530" y="145" width="120" height="110" rx="8" fill="#334155" opacity="0.5"/>
      <text x="590" y="205" fill="#94a3b8" font-family="sans-serif" font-size="11" text-anchor="middle">OFFICIAL SEAL</text>

      <!-- PDF417 / 2D Barcode pattern -->
      <g transform="translate(50, 240)">
        <rect width="450" height="65" fill="#ffffff" rx="4"/>
        <!-- Simulated barcode stripes -->
        ${Array.from({ length: 45 })
          .map((_, i) => `<rect x="${i * 10 + 2}" y="5" width="${(i % 3) + 2}" height="55" fill="#0f172a"/>`)
          .join('')}
      </g>

      <!-- Legal Authority Disclaimers -->
      <text x="50" y="340" fill="#64748b" font-family="sans-serif" font-size="10">
        THIS DOCUMENT IS THE PROPERTY OF THE ISSUING GOVERNMENT. IF FOUND, PLEASE RETURN TO THE NEAREST EMBASSY.
      </text>
      <text x="50" y="360" fill="#64748b" font-family="sans-serif" font-size="10">
        CONTAINS EMBEDDED RFID MICROPROCESSOR CHIP • CONTACTLESS ISO/IEC 14443 COMPLIANT.
      </text>
    </svg>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GENERATOR PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('[MockImages] Generating realistic dummy identity images for seeded KYC cases...');

  // 1. Shared back document
  const backSvg = renderDocBackSvg();
  await sharp(Buffer.from(backSvg)).jpeg({ quality: 90 }).toFile(path.join(outputDir, 'doc_back.jpg'));
  console.log('✓ Created doc_back.jpg');

  // Define each case persona & parameters
  const cases: Array<{
    caseId: string;
    docType: 'passport' | 'national_id' | 'driver_license';
    country: string;
    name: string;
    dob: string;
    idNumber: string;
    expiry: string;
    isTampered?: boolean;
    isBlur?: boolean;
    isGlare?: boolean;
    isExpired?: boolean;
    facePersona: Persona;
    selfiePersona?: Persona; // Different persona if face doesn't match!
    isSelfieScreenSpoof?: boolean;
    isSelfiePaperSpoof?: boolean;
  }> = [
    // 0. CASE-100000: Asha Patel (MATCH)
    {
      caseId: 'CASE-100000',
      docType: 'passport',
      country: 'IN',
      name: 'Asha Patel',
      dob: '1996-08-14',
      idNumber: 'Z8472910',
      expiry: '2031-10-15',
      facePersona: { id: 'asha', name: 'Asha Patel', gender: 'female', skin: '#946747', hairColor: '#291810', hairStyle: 'long_wavy', eyeColor: '#291810', clothesColor: '#9f1239', bindi: true },
    },
    // 1. CASE-100001: Liam Smith (MATCH)
    {
      caseId: 'CASE-100001',
      docType: 'national_id',
      country: 'GB',
      name: 'Liam Smith',
      dob: '1992-03-22',
      idNumber: 'GB4402199',
      expiry: '2032-04-10',
      facePersona: { id: 'liam', name: 'Liam Smith', gender: 'male', skin: '#f5d0b5', hairColor: '#4a3525', hairStyle: 'short_brown', clothesColor: '#1e3a8a' },
    },
    // 2. CASE-100002: Marcus Weber (LOW FACE MATCH - DIFFERENT PERSON IN SELFIE!)
    {
      caseId: 'CASE-100002',
      docType: 'driver_license',
      country: 'DE',
      name: 'Marcus Weber',
      dob: '1989-11-05',
      idNumber: 'D90123841',
      expiry: '2030-11-05',
      facePersona: { id: 'marcus_id', name: 'Marcus Weber (ID)', gender: 'male', skin: '#fae0d0', hairColor: '#d4af37', hairStyle: 'short_fade', hasGlasses: true, clothesColor: '#475569' },
      // Selfie shows a DIFFERENT person with curly dark hair, beard, no glasses!
      selfiePersona: { id: 'marcus_mismatch', name: 'Impersonator', gender: 'male', skin: '#b8860b', hairColor: '#1a1a1a', hairStyle: 'curly_black', hasBeard: true, beardColor: '#1a1a1a', hasGlasses: false, clothesColor: '#0f172a' },
    },
    // 3. CASE-100003: Sofia Rodriguez (TAMPERED DOCUMENT)
    {
      caseId: 'CASE-100003',
      docType: 'passport',
      country: 'ES',
      name: 'Sofia Rodriguez',
      dob: '1995-07-19',
      idNumber: 'P2930419',
      expiry: '2033-01-20',
      isTampered: true,
      facePersona: { id: 'sofia', name: 'Sofia Rodriguez', gender: 'female', skin: '#e2b08a', hairColor: '#331a0e', hairStyle: 'long_wavy', clothesColor: '#ea580c' },
    },
    // 4. CASE-100004: Tariq Mansoor (LIVENESS SPOOF - SCREEN REPLAY)
    {
      caseId: 'CASE-100004',
      docType: 'national_id',
      country: 'AE',
      name: 'Tariq Mansoor',
      dob: '1987-05-12',
      idNumber: 'AE7841992',
      expiry: '2029-05-12',
      facePersona: { id: 'tariq', name: 'Tariq Mansoor', gender: 'male', skin: '#cfa276', hairColor: '#26180c', hairStyle: 'short_fade', hasBeard: true, clothesColor: '#0f766e' },
      isSelfieScreenSpoof: true,
    },
    // 5. CASE-100005: Chloe Dubois (POOR QUALITY / BLUR)
    {
      caseId: 'CASE-100005',
      docType: 'passport',
      country: 'FR',
      name: 'Chloe Dubois',
      dob: '1998-12-01',
      idNumber: 'FR901234',
      expiry: '2031-08-14',
      isBlur: true,
      facePersona: { id: 'chloe', name: 'Chloe Dubois', gender: 'female', skin: '#fce2d0', hairColor: '#ebd382', hairStyle: 'bob', clothesColor: '#1e3a8a' },
    },
    // 6. CASE-100006: Olivia Johnson (EXPIRED & FACE MISMATCH!)
    {
      caseId: 'CASE-100006',
      docType: 'driver_license',
      country: 'US',
      name: 'Olivia Johnson',
      dob: '1984-06-18',
      idNumber: 'DL4910283',
      expiry: '2022-06-18',
      isExpired: true,
      facePersona: { id: 'olivia_id', name: 'Olivia Johnson (Mature ID)', gender: 'female', skin: '#f7d8c5', hairColor: '#5c3826', hairStyle: 'bob', clothesColor: '#6b21a8' },
      // Selfie shows a young male in hoodie (blatant fraud/mismatch!)
      selfiePersona: { id: 'olivia_mismatch', name: 'Young Fraudster', gender: 'male', skin: '#7a5230', hairColor: '#0f172a', hairStyle: 'short_fade', clothesColor: '#15803d' },
    },
    // 7. CASE-100007: Kenji Sato (MATCH)
    {
      caseId: 'CASE-100007',
      docType: 'passport',
      country: 'JP',
      name: 'Kenji Sato',
      dob: '1991-09-30',
      idNumber: 'TR882910',
      expiry: '2031-09-30',
      facePersona: { id: 'kenji', name: 'Kenji Sato', gender: 'male', skin: '#edd8b7', hairColor: '#1a1a1a', hairStyle: 'short_fade', clothesColor: '#1e293b' },
    },
    // 8. CASE-100008: Lucas Silva (BIOMETRIC MISMATCH - SYNTHETIC MASK)
    {
      caseId: 'CASE-100008',
      docType: 'passport',
      country: 'BR',
      name: 'Lucas Silva',
      dob: '1993-04-14',
      idNumber: 'BR559012',
      expiry: '2033-04-14',
      facePersona: { id: 'lucas_id', name: 'Lucas Silva (ID)', gender: 'male', skin: '#c49669', hairColor: '#3d2617', hairStyle: 'curly_black', clothesColor: '#0d9488' },
      selfiePersona: { id: 'lucas_mismatch', name: 'Synthetic Face', gender: 'male', skin: '#e2e8f0', hairColor: '#64748b', hairStyle: 'short_fade', isSyntheticMask: true, clothesColor: '#0f172a' },
    },
    // 9. CASE-100009: Ananya Deshmukh (MATCH)
    {
      caseId: 'CASE-100009',
      docType: 'national_id',
      country: 'IN',
      name: 'Ananya Deshmukh',
      dob: '2000-01-25',
      idNumber: 'Z1029384',
      expiry: '2035-01-25',
      facePersona: { id: 'ananya', name: 'Ananya Deshmukh', gender: 'female', skin: '#a37452', hairColor: '#1a120b', hairStyle: 'long_wavy', clothesColor: '#059669', bindi: true },
    },
    // 10. CASE-100010: Zara Al-Hassan (QUEUED / MATCH)
    {
      caseId: 'CASE-100010',
      docType: 'passport',
      country: 'SA',
      name: 'Zara Al-Hassan',
      dob: '1997-10-10',
      idNumber: 'SA991028',
      expiry: '2032-10-10',
      facePersona: { id: 'zara', name: 'Zara Al-Hassan', gender: 'female', skin: '#cf9e76', hairColor: '#1e293b', hairStyle: 'hijab', clothesColor: '#0f172a' },
    },
    // 11. CASE-100011: David Kim (MATCH)
    {
      caseId: 'CASE-100011',
      docType: 'passport',
      country: 'KR',
      name: 'David Kim',
      dob: '1994-02-17',
      idNumber: 'M9018274',
      expiry: '2034-02-17',
      facePersona: { id: 'david', name: 'David Kim', gender: 'male', skin: '#fbe3cf', hairColor: '#111827', hairStyle: 'short_fade', clothesColor: '#1e3a8a' },
    },
    // 12. CASE-100012: Rohan Mehra (LIVENESS SPOOF - PAPER CUTOUT)
    {
      caseId: 'CASE-100012',
      docType: 'national_id',
      country: 'IN',
      name: 'Rohan Mehra',
      dob: '1993-08-11',
      idNumber: 'Z3918274',
      expiry: '2033-08-11',
      facePersona: { id: 'rohan', name: 'Rohan Mehra', gender: 'male', skin: '#966848', hairColor: '#1a1a1a', hairStyle: 'short_fade', clothesColor: '#2563eb' },
      isSelfiePaperSpoof: true,
    },
    // 13. CASE-100013: George Taylor (LOW FACE MATCH - BEARD / MISMATCH)
    {
      caseId: 'CASE-100013',
      docType: 'driver_license',
      country: 'GB',
      name: 'George Taylor',
      dob: '1986-12-04',
      idNumber: 'UK4910291',
      expiry: '2031-12-04',
      facePersona: { id: 'george_id', name: 'George Taylor (Clean ID)', gender: 'male', skin: '#f5cbb3', hairColor: '#4a3525', hairStyle: 'short_brown', clothesColor: '#1e3a8a' },
      selfiePersona: { id: 'george_mismatch', name: 'Heavy Beard Mismatch', gender: 'male', skin: '#b47e5b', hairColor: '#111827', hairStyle: 'curly_black', hasBeard: true, beardColor: '#111827', clothesColor: '#4b5563' },
    },
    // 14. CASE-100014: Hannah Schmidt (GLARE OVER EXPIRY)
    {
      caseId: 'CASE-100014',
      docType: 'passport',
      country: 'DE',
      name: 'Hannah Schmidt',
      dob: '1999-05-30',
      idNumber: 'D4491028',
      expiry: '2032-05-30',
      isGlare: true,
      facePersona: { id: 'hannah', name: 'Hannah Schmidt', gender: 'female', skin: '#fae3d5', hairColor: '#b08d57', hairStyle: 'long_wavy', clothesColor: '#d97706' },
    },
    // 15. CASE-100015: Vikram Sethi (MATCH)
    {
      caseId: 'CASE-100015',
      docType: 'passport',
      country: 'IN',
      name: 'Vikram Sethi',
      dob: '1990-11-20',
      idNumber: 'Z5819204',
      expiry: '2030-11-20',
      facePersona: { id: 'vikram', name: 'Vikram Sethi', gender: 'male', skin: '#8c5f3e', hairColor: '#1c1917', hairStyle: 'short_fade', hasGlasses: true, clothesColor: '#0284c7' },
    },
    // 16. CASE-100016: Carlos Ruiz (MATCH)
    {
      caseId: 'CASE-100016',
      docType: 'national_id',
      country: 'ES',
      name: 'Carlos Ruiz',
      dob: '1992-09-15',
      idNumber: 'E9910284',
      expiry: '2032-09-15',
      facePersona: { id: 'carlos', name: 'Carlos Ruiz', gender: 'male', skin: '#d99f70', hairColor: '#1f2937', hairStyle: 'short_fade', clothesColor: '#475569' },
    },
    // 17. CASE-100017: Robert Hayes (TAMPERED MRZ & CHECKSUM)
    {
      caseId: 'CASE-100017',
      docType: 'passport',
      country: 'US',
      name: 'Robert Hayes',
      dob: '1979-04-03',
      idNumber: 'US1029384',
      expiry: '2029-04-03',
      isTampered: true,
      facePersona: { id: 'robert_id', name: 'Robert Hayes', gender: 'male', skin: '#f3ceb5', hairColor: '#94a3b8', hairStyle: 'short_fade', clothesColor: '#1e3a8a' },
    },
    // 18. CASE-100018: Kavita Nair (MATCH)
    {
      caseId: 'CASE-100018',
      docType: 'driver_license',
      country: 'IN',
      name: 'Kavita Nair',
      dob: '1995-03-29',
      idNumber: 'Z9018274',
      expiry: '2035-03-29',
      facePersona: { id: 'kavita', name: 'Kavita Nair', gender: 'female', skin: '#87593c', hairColor: '#171717', hairStyle: 'long_wavy', clothesColor: '#eab308', bindi: true },
    },
    // 19. CASE-100019: Emma Watson-Brown (MATCH)
    {
      caseId: 'CASE-100019',
      docType: 'passport',
      country: 'GB',
      name: 'Emma Watson-Brown',
      dob: '1998-07-22',
      idNumber: 'GB9018274',
      expiry: '2033-07-22',
      facePersona: { id: 'emma', name: 'Emma Watson-Brown', gender: 'female', skin: '#fedec8', hairColor: '#873618', hairStyle: 'long_wavy', clothesColor: '#4338ca' },
    },
    // 20. CASE-100020: Julien Moreau (LIVENESS SCREEN REFLECTION)
    {
      caseId: 'CASE-100020',
      docType: 'passport',
      country: 'FR',
      name: 'Julien Moreau',
      dob: '1991-01-14',
      idNumber: 'FR881920',
      expiry: '2031-01-14',
      facePersona: { id: 'julien', name: 'Julien Moreau', gender: 'male', skin: '#e0b48b', hairColor: '#78350f', hairStyle: 'short_brown', hasBeard: true, clothesColor: '#0284c7' },
      isSelfieScreenSpoof: true,
    },
  ];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const prefix = `case_${c.caseId.toLowerCase()}`;

    // 1. Generate Front Document JPEG
    const frontSvg = renderDocFrontSvg({
      docType: c.docType,
      country: c.country,
      name: c.name,
      dob: c.dob,
      idNumber: c.idNumber,
      expiry: c.expiry,
      persona: c.facePersona,
      isTampered: c.isTampered,
      isBlur: c.isBlur,
      isGlare: c.isGlare,
      isExpired: c.isExpired,
    });
    await sharp(Buffer.from(frontSvg))
      .jpeg({ quality: 90 })
      .toFile(path.join(outputDir, `${prefix}_doc_front.jpg`));

    // Also write country/docType generic fallback
    const genericDocName = `doc_${c.docType}_${c.country}.jpg`;
    if (!fs.existsSync(path.join(outputDir, genericDocName))) {
      await sharp(Buffer.from(frontSvg)).jpeg({ quality: 90 }).toFile(path.join(outputDir, genericDocName));
    }

    // 2. Generate Cropped Face JPEG (from document)
    const cropSvg = renderFaceSvg(c.facePersona, false, 240, 280);
    await sharp(Buffer.from(cropSvg))
      .jpeg({ quality: 90 })
      .toFile(path.join(outputDir, `${prefix}_face_crop.jpg`));

    // 3. Generate Live Selfie JPEG
    // If mismatch, use the mismatch persona!
    const effectiveSelfiePersona = c.selfiePersona || {
      ...c.facePersona,
      isScreenSpoof: c.isSelfieScreenSpoof,
      isPaperSpoof: c.isSelfiePaperSpoof,
    };

    const selfieSvg = renderFaceSvg(effectiveSelfiePersona, true, 260, 320);
    await sharp(Buffer.from(selfieSvg))
      .jpeg({ quality: 90 })
      .toFile(path.join(outputDir, `${prefix}_selfie.jpg`));

    // Also populate standard selfie_X fallback
    const fallbackSelfieNum = (i % 6) + 1;
    await sharp(Buffer.from(selfieSvg))
      .jpeg({ quality: 90 })
      .toFile(path.join(outputDir, `selfie_${fallbackSelfieNum}.jpg`));

    console.log(`✓ Generated assets for ${c.caseId} (${c.name}) [${c.selfiePersona ? 'MISMATCH' : 'MATCH'}]`);
  }

  console.log('[MockImages] All realistic dummy images successfully generated in uploads/mock!');
}

main().catch((err) => {
  console.error('[MockImages] Failed to generate dummy images:', err);
  process.exit(1);
});
