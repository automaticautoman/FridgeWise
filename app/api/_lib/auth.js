// Checks the Firebase ID token the browser sends as "Authorization: Bearer <token>".
import { adminAuth } from './admin.js';

export class ApiError extends Error {
  constructor(httpStatus, code) {
    super(code);
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

export async function requireUser(headers = {}) {
  const header = headers.authorization || headers.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new ApiError(401, 'auth/not-signed-in');
  try {
    // checkRevoked: a password reset signs other devices out (F03), so their
    // old tokens must stop working here too.
    return await adminAuth().verifyIdToken(match[1], true);
  } catch {
    throw new ApiError(401, 'auth/not-signed-in');
  }
}
