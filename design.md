# Design (UI/UX & Design System)

## 1. Design principles
1. **Trust first:** explain *why* each permission/data item is needed, in plain language.
2. **Low friction:** passive liveness by default; active challenge only when required.
3. **Fail gracefully:** every capture failure has a clear fix and a fallback (upload photo instead of live video).
4. **Privacy by default:** minimal data, masked views, no dark patterns in consent.
5. **Accessible & inclusive:** WCAG 2.2 AA; works for varied skin tones, lighting, devices, and disabilities (also fairness requirement).

## 2. Information architecture
```
Public site: Home · How it works · Supported documents · Privacy & Biometric notice · FAQ · Contact/DSAR
Onboarding portal: Start → Consent → Document → Selfie/Liveness → Review & submit → Status
Dashboards (staff, SSO): Review queue · Case detail · Compliance · Admin · MLOps
```

## 3. Applicant screens
| # | Screen | Key elements |
|---|---|---|
| 1 | Landing | Value prop ("Verify in minutes"), CTA, trust badges (encryption, region, no resale) |
| 2 | Verify contact | Email/phone OTP |
| 3 | **Biometric consent** | Separate from T&Cs; plain-language purpose, retention period, who sees data; unchecked checkbox + typed name/signature; link to full notice; "Decline → manual alternative" |
| 4 | Document choice | Country auto-suggest, doc type cards with sample images |
| 5 | Document capture | Camera overlay frame, auto-detect edges, live hints (blur/glare/crop), flip-to-back prompt, upload fallback |
| 6 | Selfie + liveness | Oval guide, lighting hint, countdown, optional challenge (turn head left/right, blink) with large visual cues + audio/text alternative |
| 7 | Review & submit | Thumbnails, retake option |
| 8 | Status | Stepper (Received → Checking → Result), ETA, reason codes, resubmit CTA |
| 9 | Privacy center | Withdraw consent, request data/deletion, download receipt |

### Error/empty states (examples)
Camera denied (how to enable per browser), no camera (use phone via QR handoff), poor light, glare, expired document, network loss (auto-resume), TURN failure (switch to photo upload).

## 4. Visual design system
| Token | Spec |
|---|---|
| Color | Neutral base, one primary (trust blue), semantic: success green, warning amber, danger red, info; all ≥ 4.5:1 contrast; dark mode supported |
| Typography | System/Inter stack; 16px base; scale 12/14/16/20/24/32; line-height 1.5 |
| Spacing | 4-pt grid |
| Radius/Elevation | 8px cards; 2 elevation levels |
| Icons | Lucide |
| Motion | Subtle; honor `prefers-reduced-motion` |
| Components | Button, Input, Stepper, Camera overlay, Consent card, Status badge, Data table, Diff/compare viewer, Toast, Modal, Banner, Skeleton |
Implementation: Tailwind + headless primitives (Radix) with design tokens as CSS variables.

## 5. Responsive behaviour
Mobile-first (most captures happen on phones). Breakpoints 360/768/1024/1440. On desktop, offer QR code to continue on phone for better camera.

## 6. Accessibility checklist
Keyboard operable; focus visible; ARIA live regions for status changes; captions/text for audio cues; alternatives to active-liveness gestures (e.g. alternative verification path for motor/visual impairments); error messages tied to fields; tested with screen readers (NVDA/VoiceOver).

## 7. Content & microcopy rules
Plain language (grade ≤ 8); say what will happen next; never blame the user ("Photo is too dark, try facing a window"); rejection reasons are specific but do not reveal fraud-detection internals.

## 8. Reviewer UI design (summary; full in `Dashboard.md`)
Dense, keyboard-driven, split-pane evidence viewer; PII masked by default; color-coded risk flags; SLA timers.

## 9. Usability testing plan
Per spiral: 5-8 participants across devices/lighting/ages; measure completion rate, time per step, error rate; A/B test hint copy and consent layout (without making consent harder to decline).
