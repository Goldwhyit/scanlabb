// GS1-128 often contains FNC1 represented as ASCII 29 (Group Separator)
// or uses parentheses notation like (01)GTIN...
const FNC1 = String.fromCharCode(29);

// Standard UPC/EAN checksum (same algorithm ZXing's UPCEANReader uses to validate
// scanned codes): weight the digits counting from the right, alternating 1x/3x.
function computeEan13CheckDigit(twelveDigits: string): number {
  let sum = 0;
  for (let i = twelveDigits.length - 1; i >= 0; i -= 2) {
    sum += Number(twelveDigits[i]);
  }
  sum *= 3;
  for (let i = twelveDigits.length - 2; i >= 0; i -= 2) {
    sum += Number(twelveDigits[i]);
  }
  return (1000 - sum) % 10;
}

// Some laser scan engines are configured with "Transmit Check Digit" disabled for
// EAN-13/UPC-A and always deliver 12 digits instead of 13. Recompute and append the
// missing check digit so lookups still work even when that scanner setting is wrong.
function repairMissingEan13CheckDigit(code: string): string {
  if (code.length !== 12 || !/^\d{12}$/.test(code)) return code;
  return code + computeEan13CheckDigit(code);
}

export function normalizeBarcode(code: string): string {
  if (!code) return code;
  // (01)123... pattern
  const mParen = code.match(/\(01\)(\d{14})/);
  if (mParen) return mParen[1].slice(-13);
  // AI without parens: look for 01+14 digits possibly preceded by FNC1
  const m01 = code.match(new RegExp(`(?:${FNC1}|^)01(\\d{14})`));
  if (m01 && m01[1]) return m01[1].slice(-13);
  // If contains group separator, strip it and return first segment's numeric part
  if (code.includes(FNC1)) {
    const parts = code.split(FNC1).filter(Boolean);
    for (const p of parts) {
      const m = p.match(/^(?:01)?(\d{13,14})/);
      if (m) return m[1].slice(-13);
    }
  }
  return repairMissingEan13CheckDigit(code);
}
