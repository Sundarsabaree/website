import { Router } from 'express';
import {
  getDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  dealSchema
} from '../controllers/deal.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getDeals);
router.post('/', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), validateBody(dealSchema), createDeal);
router.put('/:id', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), validateBody(dealSchema.partial()), updateDeal);
router.delete('/:id', authorize([Role.ADMIN, Role.MANAGER]), deleteDeal);

export default router;
