import express from 'express';
import * as memberController from '../controllers/member_controller.js';
import * as memberRequest from '../requests/member_request.js';
import { authenticationMemberMiddleware } from '../middlewares/auth_member_middleware.js';

const router = express.Router();

router.use((req, res, next) => authenticationMemberMiddleware(req, res, next));

router.post('/profile-setup', [memberRequest.profileSetup], memberController.profileSetup);
router.get('/details', memberController.memberProfileDetails);

// update phone number
router.post('/send_otp/phone', [memberRequest.sendOTPForUpdatePhoneRequest], memberController.sendOTPForUpdatePhone);
router.post('/verify_otp/phone', [memberRequest.verifyOTPForUpdatePhoneRequest], memberController.verifyOTPForUpdatePhone);

// settings
router.get('/task-lists', [], memberController.taskList);
// router.post('/settings', [memberRequest.settingsRequest], memberController.settings);

router.post('/get-event/featured', [memberRequest.getFeaturedEventsRequest], memberController.getFeaturedEvents);
router.post('/get-event/list', [memberRequest.getEventListRequest], memberController.getEventList);
router.post('/get-event/list/favorite', [memberRequest.getFavoriteEventListRequest], memberController.getFavoriteEventList);
router.post('/get-event/detail', [memberRequest.getEventDetailRequest], memberController.getEventDetail);
router.post('/get-event/list/my', [memberRequest.getMyEventListRequest], memberController.getMyEventList);

router.post('/event/interest-add', [memberRequest.addInterestToEventRequest], memberController.addInterestToEvent);
router.delete('/event/interest-cancel', [memberRequest.addInterestToEventRequest], memberController.cancelInterestToEvent);

router.post('/ban/list', [memberRequest.getBanListRequest], memberController.getBanList);

// Edit profile
router.post('/send_otp/edit', [], memberController.sendOTPEditAccount);
router.post('/verify_otp/edit', [memberRequest.verifyOTPEditAccountRequest], memberController.verifyOTPEditAccount);
router.put('/profile', [memberRequest.editProfileRequest], memberController.editProfile);

export { router };