import express from 'express';
import { router as authRouter } from './auth.js';
import { router as commonRouter } from './common.js';
import { router as userRouter } from './member.js';
import { router as organizationRouter } from './organization.js';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/common', commonRouter);
router.use('/member', userRouter);
router.use('/organization', organizationRouter);

export { router };