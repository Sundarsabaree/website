import { Router } from 'express';
import {
  getCalendarEvents,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  meetingSchema
} from '../controllers/calendar.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/events', getCalendarEvents);
router.post('/meetings', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), validateBody(meetingSchema), createMeeting);
router.put('/meetings/:id', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), validateBody(meetingSchema.partial()), updateMeeting);
router.delete('/meetings/:id', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), deleteMeeting);

export default router;
