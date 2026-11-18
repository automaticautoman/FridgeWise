// Password rules from the Epic 1 design: 8+ characters, a letter and a number.
export const MIN_LENGTH = 8;

export function checkPassword(pw = '') {
  return [
    { id: 'length', label: MIN_LENGTH + '+ characters', ok: pw.length >= MIN_LENGTH, progress: pw.length < MIN_LENGTH && pw.length > 0 ? ' (' + pw.length + ' so far)' : '' },
    { id: 'letter', label: 'A letter', ok: /[A-Za-z]/.test(pw), progress: '' },
    { id: 'number', label: 'A number', ok: /\d/.test(pw), progress: '' }
  ];
}

export function isStrongEnough(pw) {
  return checkPassword(pw).every((r) => r.ok);
}

export function isEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
