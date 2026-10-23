// The first reward pilot accepts Nigerian mobile numbers only. Network is never inferred.
export function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 32 || !/^[+\d ()-]+$/.test(value)) throw new Error('Enter a Nigerian mobile number.');
  let digits = value.replace(/[ ()-]/g, '');
  if (/^0[789]\d{9}$/.test(digits)) digits = `+234${digits.slice(1)}`;
  if (!/^\+234[789]\d{9}$/.test(digits)) throw new Error('Use 08012345678 or +2348012345678.');
  return digits;
}
