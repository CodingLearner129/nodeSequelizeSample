import express from 'express';
import * as authRequest from "../requests/auth_request.js";
import * as authController from '../controllers/auth_controller.js';
import { authenticationCommonMiddleware } from '../middlewares/auth_common_middleware.js';

const router = express.Router();

router.post('/send_otp', [authRequest.sendOTPRequest], authController.sendOTP);
router.post('/verify_otp', [authRequest.verifyOTPRequest], authController.verifyOTP);

router.use((req, res, next) => authenticationCommonMiddleware(req, res, next));

router.post('/send_otp/delete', [], authController.sendOTPDeleteAccount);
router.post('/verify_otp/delete', [authRequest.verifyOTPDeleteAccountRequest], authController.verifyOTPDeleteAccount);
router.post('/logout',  authController.logOut);

export { router };