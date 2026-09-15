import { Router } from 'express';
import {
  getLeads,
  createLead,
  updateLead,
  updateLeadStage,
  deleteLead,
  leadSchema
} from '../controllers/lead.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getLeads);
router.post('/', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), validateBody(leadSchema), createLead);
router.put('/:id', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), validateBody(leadSchema.partial()), updateLead);
router.put('/:id/stage', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), updateLeadStage);
router.delete('/:id', authorize([Role.ADMIN, Role.MANAGER]), deleteLead);

export default router;
