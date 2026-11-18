// POST /api/kitchens  { action, ... }  with "Authorization: Bearer <Firebase ID token>"
// One function for every Epic 2 action, because Vercel's free plan allows
// only 12 functions per project. See api/_lib/kitchens.js for the actions.
import { postHandler } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { handleKitchen } from './_lib/kitchens.js';

export default postHandler(async (body, { headers }) => {
  const token = await requireUser(headers);
  return handleKitchen(body, token, { headers });
});
