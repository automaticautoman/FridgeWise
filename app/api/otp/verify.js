import { postHandler } from '../_lib/http.js';
import { verifyCode } from '../_lib/otp.js';

export default postHandler(verifyCode);
