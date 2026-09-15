import { Router } from 'express';
import {
  getEmployees,
  getEmployeePerformance,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  employeeSchema
} from '../controllers/employee.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorize([Role.ADMIN, Role.MANAGER, Role.SALES_EXECUTIVE]), getEmployees);
router.get('/performance', authorize([Role.ADMIN, Role.MANAGER]), getEmployeePerformance);
router.post('/', authorize([Role.ADMIN]), validateBody(employeeSchema), createEmployee);
router.put('/:id', authorize([Role.ADMIN]), validateBody(employeeSchema.partial()), updateEmployee);
router.delete('/:id', authorize([Role.ADMIN]), deleteEmployee);

export default router;
