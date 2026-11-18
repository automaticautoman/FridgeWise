import { postHandler } from '../_lib/http.js';
import { resetPassword } from '../_lib/otp.js';

export default postHandler(resetPassword);
