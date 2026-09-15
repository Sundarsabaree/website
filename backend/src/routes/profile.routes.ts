import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  updateProfileSchema,
  changePasswordSchema
} from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', getProfile);
router.put('/', validateBody(updateProfileSchema), updateProfile);
router.put('/password', validateBody(changePasswordSchema), changePassword);

export default router;
