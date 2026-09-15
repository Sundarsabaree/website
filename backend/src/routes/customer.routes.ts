import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  importCustomersCsv,
  customerSchema
} from '../controllers/customer.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), validateBody(customerSchema), createCustomer);
router.put('/:id', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), validateBody(customerSchema.partial()), updateCustomer);
router.delete('/:id', authorize([Role.ADMIN, Role.MANAGER]), deleteCustomer);
router.post('/import-csv', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), importCustomersCsv);

export default router;
